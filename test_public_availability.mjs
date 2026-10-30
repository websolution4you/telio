import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Skutočný import produkčného modulu (žiadna kópia logiky!)
import {
    validatePublicAvailabilityRange,
    validateCalendarRangeByAccessMode,
    isPrivilegedReadRole,
    isRestrictedReadRole,
    resolveServerAccessMode,
    extractPublicCourtId,
    mapPublicAvailabilityRows,
    mapRestrictedOccupancyRowsToPublicItems,
    mapCreatedBookingToOwnBookingDto,
    toPublicCalendarItem,
    toOwnBookingCalendarItem,
    toStaffBookingCalendarItem,
    mapOwnBookingRowToCalendarItem,
    mapStaffBookingRowToCalendarItem,
    mergeRestrictedCalendarItems,
    isValidRecurringGroupId,
    extractValidRecurringGroupIdFromNotes,
} from "./lib/bookings/publicAvailability.ts";

// ============================================================================
// R.1: BEHAVIORAL – Public / Restricted Occupancy Mapper (vrátane court_id: null + notes.courtId)
// ============================================================================
test("R.1 BEHAVIORAL: Public a restricted occupancy mapper (confirmed, pending, blocked -> occupied, court_id: null + notes.courtId, zero-leakage)", () => {
    const poisonedRows = [
        {
            id: "d3b07384-d113-4c56-b09e-000000000000",
            court_id: null, // Reálny produkčný riadok z webu s court_id: null a kurtom v notes.courtId
            start_at: "2026-11-01T09:00:00Z",
            end_at: "2026-11-01T10:00:00Z",
            status: "confirmed",
            customer_name: "Jozef Mrkvicka",
            customerName: "Jozef Mrkvicka",
            customer_phone: "+421900111222",
            phone: "+421900111222",
            user_id: "user-123",
            userId: "user-123",
            userRole: "trainer",
            userCardNumber: "CARD-999",
            card_number: "CARD-999",
            price_eur: 19,
            priceEur: 19,
            adminBlockType: "Turnaj",
            subSlots: [{ from: "09:00", to: "10:00", player: "Tajný Hráč" }],
            source: "admin",
            notes: JSON.stringify({
                courtId: "badminton-1",
                notes: "Tajná poznámka",
                customerName: "Otrávené Meno v Notes",
                phone: "+421999888777",
                userRole: "admin",
                priceEur: 99,
                adminBlockType: "Turnaj",
                subSlots: [{ from: "09:00", to: "10:00", player: "Tajný Hráč" }],
                recurringGroupId: "rec_12345678-1234-1234-1234-123456789abc",
                clientPlayerName: "Tajný Zverenec",
                multisportCardsCount: 2,
                rescheduled: true,
            }),
            calendar_event_id: "gcal-123",
            created_at: "2026-10-01T12:00:00Z",
        },
        {
            court_id: null,
            start_at: "2026-11-01T10:00:00Z",
            end_at: "2026-11-01T11:00:00Z",
            status: "pending",
            notes: JSON.stringify({ courtId: "squash-2", secret: "nikdy-neunikne" }),
        },
        {
            court_id: "tennis-1",
            start_at: "2026-11-01T11:00:00Z",
            end_at: "2026-11-01T12:00:00Z",
            status: "blocked",
        },
    ];

    const { slots, skippedCount } = mapPublicAvailabilityRows(poisonedRows);
    assert.equal(skippedCount, 0);
    assert.equal(slots.length, 3);
    assert.equal(slots[0].courtId, "badminton-1");
    assert.equal(slots[1].courtId, "squash-2");
    assert.equal(slots[2].courtId, "tennis-1");

    for (const slot of slots) {
        assert.equal(slot.status, "occupied");
        assert.deepEqual(Object.keys(slot).sort(), ["courtId", "end", "start", "status"]);
        assert.equal(slot.id, undefined);
        assert.equal(slot.notes, undefined);
        assert.equal(slot.customerName, undefined);
        assert.equal(slot.customer_name, undefined);
        assert.equal(slot.phone, undefined);
        assert.equal(slot.customer_phone, undefined);
        assert.equal(slot.userId, undefined);
        assert.equal(slot.user_id, undefined);
        assert.equal(slot.userRole, undefined);
        assert.equal(slot.userCardNumber, undefined);
        assert.equal(slot.priceEur, undefined);
        assert.equal(slot.price_eur, undefined);
        assert.equal(slot.adminBlockType, undefined);
        assert.equal(slot.subSlots, undefined);
        assert.equal(slot.source, undefined);
        assert.equal(slot.calendar_event_id, undefined);

        const serializedSlot = JSON.stringify(slot);
        assert.equal(serializedSlot.includes("Tajná poznámka"), false);
        assert.equal(serializedSlot.includes("Otrávené Meno"), false);
        assert.equal(serializedSlot.includes("Tajný Hráč"), false);
        assert.equal(serializedSlot.includes("nikdy-neunikne"), false);

        const publicCalItem = toPublicCalendarItem(slot);
        assert.deepEqual(Object.keys(publicCalItem).sort(), ["courtId", "end", "key", "kind", "start", "status"]);
        assert.equal(publicCalItem.kind, "public-occupied");
        assert.equal(publicCalItem.status, "occupied");
    }

    const { items: publicItems, skippedCount: itemSkip } = mapRestrictedOccupancyRowsToPublicItems(poisonedRows);
    assert.equal(itemSkip, 0);
    assert.equal(publicItems.length, 3);
    assert.equal(publicItems[0].courtId, "badminton-1");
    assert.equal(publicItems[1].courtId, "squash-2");
    assert.equal(publicItems[2].courtId, "tennis-1");

    for (const item of publicItems) {
        assert.equal(item.kind, "public-occupied");
        assert.equal(item.status, "occupied");
        assert.deepEqual(Object.keys(item).sort(), ["courtId", "end", "key", "kind", "start", "status"]);
        assert.equal(item.id, undefined);
        assert.equal(item.booking, undefined);
        assert.equal(item.notes, undefined);
    }
});

// ============================================================================
// R.2: BEHAVIORAL – OwnBookingDto Mapper & mapCreatedBookingToOwnBookingDto
// ============================================================================
test("R.2 BEHAVIORAL: OwnBookingDto mapper a mapCreatedBookingToOwnBookingDto obsahujú iba povolené polia vlastnej rezervácie a striktne odstraňujú cudzie/staff polia", () => {
    const rawOwnRow = {
        id: "11111111-2222-3333-4444-555555555555",
        court_id: null,
        start_at: "2026-11-02T14:00:00Z",
        end_at: "2026-11-02T15:30:00Z",
        status: "confirmed",
        customer_name: "Ján Vlastník",
        customer_phone: "+421911222333",
        user_id: "secret-user-uuid",
        userRole: "trainer",
        userCardNumber: "NTC-777",
        price_eur: 24.5,
        calendar_event_id: "gcal-secret-id",
        notes: JSON.stringify({
            courtId: "tennis-3",
            notes: "Tréning dvojhra",
            multisportCardsCount: 2,
            rescheduled: true,
            recurringGroupId: "rec_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            clientPlayerName: "Klient Trénera",
            adminBlockType: "Interná blokácia",
            subSlots: [{ from: "14:00", to: "15:00", player: "Hráč X" }],
            source: "admin",
            unknownSecretKey: "NESMIE_PREJST",
        }),
    };

    const item = mapOwnBookingRowToCalendarItem(rawOwnRow, "Ján Vlastník", false);
    assert.ok(item, "Valid own booking row must map to OwnBookingCalendarItem");
    assert.equal(item.kind, "own-booking");

    const b = item.booking;
    assert.equal(b.id, "11111111-2222-3333-4444-555555555555");
    assert.equal(b.courtId, "tennis-3");
    assert.equal(b.start, new Date("2026-11-02T14:00:00Z").toISOString());
    assert.equal(b.end, new Date("2026-11-02T15:30:00Z").toISOString());
    assert.equal(b.status, "confirmed");
    assert.equal(b.title, "Tréning dvojhra");
    assert.equal(b.customerName, "Klient Trénera");
    assert.equal(b.phone, "+421911222333");
    assert.equal(b.priceEur, 24.5);
    assert.equal(b.multisportCardsCount, 2);
    assert.equal(b.isRescheduled, true);
    assert.equal(b.recurringGroupId, "rec_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    assert.equal(b.clientPlayerName, "Klient Trénera");

    // Zakázané polia v OwnBookingDto:
    assert.equal(b.user_id, undefined);
    assert.equal(b.userRole, undefined);
    assert.equal(b.userCardNumber, undefined);
    assert.equal(b.adminBlockType, undefined);
    assert.equal(b.subSlots, undefined);
    assert.equal(b.source, undefined);
    assert.equal(b.notes, undefined);
    assert.equal(b.calendar_event_id, undefined);
    assert.equal(b.unknownSecretKey, undefined);

    const serialized = JSON.stringify(item);
    assert.equal(serialized.includes("secret-user-uuid"), false);
    assert.equal(serialized.includes("NTC-777"), false);
    assert.equal(serialized.includes("Interná blokácia"), false);
    assert.equal(serialized.includes("Hráč X"), false);
    assert.equal(serialized.includes("NESMIE_PREJST"), false);

    // Test spoločného helpera mapCreatedBookingToOwnBookingDto (Review bod 7 & 8.E):
    const createdBookingWithStaffFields = {
        id: "created-1",
        courtId: "badminton-3",
        start: "2026-11-03T10:00:00.000Z",
        end: "2026-11-03T11:00:00.000Z",
        status: "confirmed",
        title: "Bedminton",
        customerName: "Peter Hráč",
        phone: "+421901234567",
        priceEur: 14,
        multisportCardsCount: 1,
        isRescheduled: true,
        recurringGroupId: "rec_12345678-1234-1234-1234-123456789abc",
        clientPlayerName: "Mladý Hráč",
        // Staff-only polia, ktoré nesmú prejsť:
        user_id: "user-secret-99",
        userRole: "trainer",
        userCardNumber: "CARD-007",
        adminBlockType: "Údržba kurtov",
        subSlots: [{ from: "10:00", to: "11:00", player: "Nikto" }],
        source: "web",
    };

    const mappedCreatedOwn = mapCreatedBookingToOwnBookingDto(createdBookingWithStaffFields);
    assert.equal(mappedCreatedOwn.id, "created-1");
    assert.equal(mappedCreatedOwn.courtId, "badminton-3");
    assert.equal(mappedCreatedOwn.start, "2026-11-03T10:00:00.000Z");
    assert.equal(mappedCreatedOwn.end, "2026-11-03T11:00:00.000Z");
    assert.equal(mappedCreatedOwn.status, "confirmed");
    assert.equal(mappedCreatedOwn.title, "Bedminton");
    assert.equal(mappedCreatedOwn.customerName, "Peter Hráč");
    assert.equal(mappedCreatedOwn.phone, "+421901234567");
    assert.equal(mappedCreatedOwn.priceEur, 14);
    assert.equal(mappedCreatedOwn.multisportCardsCount, 1);
    assert.equal(mappedCreatedOwn.isRescheduled, true);
    assert.equal(mappedCreatedOwn.recurringGroupId, "rec_12345678-1234-1234-1234-123456789abc");
    assert.equal(mappedCreatedOwn.clientPlayerName, "Mladý Hráč");

    assert.equal(mappedCreatedOwn.user_id, undefined);
    assert.equal(mappedCreatedOwn.userRole, undefined);
    assert.equal(mappedCreatedOwn.userCardNumber, undefined);
    assert.equal(mappedCreatedOwn.adminBlockType, undefined);
    assert.equal(mappedCreatedOwn.subSlots, undefined);
    assert.equal(mappedCreatedOwn.source, undefined);
});

// ============================================================================
// R.3: BEHAVIORAL – StaffBookingDto Mapper
// ============================================================================
test("R.3 BEHAVIORAL: StaffBookingDto mapper zachováva polia potrebné pre admin a ntc_team", () => {
    const rawStaffRow = {
        id: "99999999-8888-7777-6666-555555555555",
        court_id: null,
        start_at: "2026-11-03T09:00:00Z",
        end_at: "2026-11-03T11:00:00Z",
        status: "blocked",
        customer_name: "NTC Tréningové centrum",
        customer_phone: "+421905999888",
        user_id: "staff-owner-1",
        price_eur: 0,
        notes: JSON.stringify({
            courtId: "tennis-1",
            source: "admin",
            notes: "NTC blokácia",
            adminBlockType: "NTC Tréningové centrum",
            subSlots: [{ from: "09:00", to: "11:00", player: "Alex Molčan" }],
            recurringGroupId: "rec_11111111-2222-3333-4444-555555555555",
            clientPlayerName: "Alex Molčan",
        }),
    };

    const userMap = new Map([
        ["staff-owner-1", { role: "ntc_team", cardNumber: "NTC-001", name: "NTC Staff" }],
    ]);

    const item = mapStaffBookingRowToCalendarItem(rawStaffRow, userMap, false);
    assert.ok(item, "Valid staff row must map to StaffBookingCalendarItem");
    assert.equal(item.kind, "staff-booking");

    const b = item.booking;
    assert.equal(b.id, "99999999-8888-7777-6666-555555555555");
    assert.equal(b.courtId, "tennis-1");
    assert.equal(b.user_id, "staff-owner-1");
    assert.equal(b.userRole, "admin");
    assert.equal(b.userCardNumber, "NTC-001");
    assert.equal(b.adminBlockType, "NTC Tréningové centrum");
    assert.equal(b.source, "admin");
    assert.equal(b.recurringGroupId, "rec_11111111-2222-3333-4444-555555555555");
    assert.deepEqual(b.subSlots, [{ from: "09:00", to: "11:00", player: "Alex Molčan" }]);
});

// ============================================================================
// R.4: BEHAVIORAL – Fail-closed správanie (courtId allowlist, notes fallback, timestampy, status, recurringGroupId)
// ============================================================================
test("R.4 BEHAVIORAL: Fail-closed správanie mapperov a validátorov (žiadny fallback na badminton-1)", () => {
    // 1. court_id === null + platný notes.courtId -> úspešne extrahuje povolený courtId
    assert.equal(
        extractPublicCourtId(null, JSON.stringify({ courtId: "badminton-4" })),
        "badminton-4"
    );

    // 2. court_id === null + neplatný notes JSON alebo neznámy courtId -> vráti null (žiadny badminton-1 fallback!)
    assert.equal(extractPublicCourtId(null, "{malformed-json"), null);
    assert.equal(extractPublicCourtId(null, JSON.stringify({ courtId: "unknown-court-999" })), null);
    assert.equal(extractPublicCourtId("unknown-court-999", null), null);
    assert.equal(extractPublicCourtId(null, null), null);

    // 3. Riadky s neplatnými timestampmi, end <= start, neznámym statusom alebo neznámym courtId sa preskočia
    const invalidRows = [
        { court_id: null, notes: "{bad", start_at: "2026-11-01T09:00:00Z", end_at: "2026-11-01T10:00:00Z", status: "confirmed" },
        { court_id: "hacked-court-1", start_at: "2026-11-01T09:00:00Z", end_at: "2026-11-01T10:00:00Z", status: "confirmed" },
        { court_id: "badminton-1", start_at: "invalid-date", end_at: "2026-11-01T10:00:00Z", status: "confirmed" },
        { court_id: "badminton-1", start_at: "2026-11-01T09:00:00Z", end_at: "invalid-date", status: "confirmed" },
        { court_id: "badminton-1", start_at: "2026-11-01T10:00:00Z", end_at: "2026-11-01T09:00:00Z", status: "confirmed" },
        { court_id: "badminton-1", start_at: "2026-11-01T10:00:00Z", end_at: "2026-11-01T10:00:00Z", status: "confirmed" },
        { court_id: "badminton-1", start_at: "2026-11-01T09:00:00Z", end_at: "2026-11-01T10:00:00Z", status: "cancelled" },
        { court_id: "badminton-1", start_at: "2026-11-01T09:00:00Z", end_at: "2026-11-01T10:00:00Z", status: "other" },
        { court_id: null, notes: JSON.stringify({ courtId: "tennis-clay-10" }), start_at: "2026-11-01T09:00:00Z", end_at: "2026-11-01T10:00:00Z", status: "confirmed" },
    ];

    const { slots, skippedCount } = mapPublicAvailabilityRows(invalidRows);
    assert.equal(skippedCount, 8);
    assert.equal(slots.length, 1);
    assert.equal(slots[0].courtId, "tennis-clay-10");

    // Own mapper tiež nikdy nepoužije fallback na badminton-1:
    const badOwn = mapOwnBookingRowToCalendarItem(
        { id: "1", court_id: null, notes: "{bad", start_at: "2026-11-01T09:00:00Z", end_at: "2026-11-01T10:00:00Z", status: "confirmed" },
        "Test"
    );
    assert.equal(badOwn, null);

    // 4. Validácia recurringGroupId
    assert.equal(isValidRecurringGroupId("rec_a1b2c3d4-e5f6-7890-abcd-ef1234567890"), true);
    assert.equal(isValidRecurringGroupId(""), false);
    assert.equal(isValidRecurringGroupId("rec_%"), false);
    assert.equal(isValidRecurringGroupId("rec_123_wildcard"), false);
    assert.equal(isValidRecurringGroupId("%"), false);
    assert.equal(isValidRecurringGroupId("rec_a1b2c3d4-e5f6-7890-abcd-ef1234567890\n"), false);
    assert.equal(extractValidRecurringGroupIdFromNotes(JSON.stringify({ recurringGroupId: "rec_%" })), undefined);
});

// ============================================================================
// R.5, R.6 & R.7: BEHAVIORAL – Restricted vs. Staff response contract & Deduplikácia
// ============================================================================
test("R.5, R.6, R.7 BEHAVIORAL: Roly, response kontrakt a deduplikácia vlastnej rezervácie voči public-occupied", () => {
    assert.equal(isRestrictedReadRole("user"), true);
    assert.equal(isRestrictedReadRole("trainer"), true);
    assert.equal(isRestrictedReadRole("admin"), false);
    assert.equal(isRestrictedReadRole("superadmin"), false);

    assert.equal(isPrivilegedReadRole("admin"), true);
    assert.equal(isPrivilegedReadRole("ntc_team"), true);
    assert.equal(isPrivilegedReadRole("trainer"), false);
    assert.equal(isPrivilegedReadRole("reception"), false);

    assert.equal(resolveServerAccessMode("user"), "restricted");
    assert.equal(resolveServerAccessMode("trainer"), "restricted");
    assert.equal(resolveServerAccessMode("admin"), "staff");
    assert.equal(resolveServerAccessMode("ntc_team"), "staff");
    assert.equal(resolveServerAccessMode("superadmin"), null);
    assert.equal(resolveServerAccessMode("receptionist"), null);
    assert.equal(resolveServerAccessMode(null), null);
    assert.equal(resolveServerAccessMode(undefined), null);

    const occupancyRows = [
        { court_id: "badminton-1", start_at: "2026-11-01T09:00:00.000Z", end_at: "2026-11-01T10:00:00.000Z", status: "confirmed" },
        { court_id: "badminton-2", start_at: "2026-11-01T10:00:00.000Z", end_at: "2026-11-01T11:00:00.000Z", status: "confirmed" },
    ];
    const { items: publicItems } = mapRestrictedOccupancyRowsToPublicItems(occupancyRows);
    assert.equal(publicItems.length, 2);

    const ownItem = mapOwnBookingRowToCalendarItem(
        {
            id: "own-booking-uuid-1",
            court_id: "badminton-2",
            start_at: "2026-11-01T10:00:00.000Z",
            end_at: "2026-11-01T11:00:00.000Z",
            status: "confirmed",
            customer_name: "Môj Účet",
            customer_phone: "+421900000000",
            price_eur: 12,
            notes: JSON.stringify({ courtId: "badminton-2", notes: "Môj kurt" }),
        },
        "Môj Účet"
    );
    assert.ok(ownItem);

    const merged = mergeRestrictedCalendarItems(publicItems, [ownItem]);
    assert.equal(merged.length, 2);
    assert.equal(merged.some((i) => i.kind === "staff-booking"), false, "Restricted response must never contain staff-booking");

    const publicInMerged = merged.filter((i) => i.kind === "public-occupied");
    const ownInMerged = merged.filter((i) => i.kind === "own-booking");
    assert.equal(publicInMerged.length, 1);
    assert.equal(publicInMerged[0].courtId, "badminton-1");
    assert.equal(ownInMerged.length, 1);
    assert.equal(ownInMerged[0].booking.id, "own-booking-uuid-1");
    assert.equal(ownInMerged[0].booking.courtId, "badminton-2");
});

// ============================================================================
// R.16, R.17, R.18: BEHAVIORAL & SOURCE-CONTRACT – Interval validation (14d restricted, 45d staff, call-site windows)
// ============================================================================
test("R.16, R.17, R.18: Intervalová validácia (14 dní pre restricted/public, 45 dní pre staff) a kontrola call-site intervalov", () => {
    assert.equal(validateCalendarRangeByAccessMode("not-a-date", "2026-11-01T10:00:00Z", "restricted").valid, false);
    assert.equal(validateCalendarRangeByAccessMode("2026-11-01T10:00:00Z" + "x".repeat(100), "2026-11-02T10:00:00Z", "restricted").valid, false);
    assert.equal(validateCalendarRangeByAccessMode("2026-11-05T10:00:00Z", "2026-11-05T10:00:00Z", "restricted").valid, false);
    assert.equal(validateCalendarRangeByAccessMode("2026-11-05T10:00:00Z", "2026-11-04T10:00:00Z", "staff").valid, false);

    const start = new Date("2026-10-20T00:00:00.000Z");
    const exact14d = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
    const over14d = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000 + 1);
    const exact45d = new Date(start.getTime() + 45 * 24 * 60 * 60 * 1000);
    const over45d = new Date(start.getTime() + 45 * 24 * 60 * 60 * 1000 + 1);

    assert.equal(validateCalendarRangeByAccessMode(start.toISOString(), exact14d.toISOString(), "restricted").valid, true);
    const resRestrictedOver = validateCalendarRangeByAccessMode(start.toISOString(), over14d.toISOString(), "restricted");
    assert.equal(resRestrictedOver.valid, false);
    assert.equal(resRestrictedOver.code, "RANGE_TOO_LARGE");

    assert.equal(validateCalendarRangeByAccessMode(start.toISOString(), over14d.toISOString(), "staff").valid, true);
    assert.equal(validateCalendarRangeByAccessMode(start.toISOString(), exact45d.toISOString(), "staff").valid, true);
    const resStaffOver = validateCalendarRangeByAccessMode(start.toISOString(), over45d.toISOString(), "staff");
    assert.equal(resStaffOver.valid, false);
    assert.equal(resStaffOver.code, "RANGE_TOO_LARGE");
});

// ============================================================================
// R.8 & R.9: SOURCE-CONTRACT – Server role verification & Query zero-leakage (vrátane Q.1 pre fetchPublicAvailabilityAction)
// ============================================================================
test("R.8 & R.9 SOURCE-CONTRACT: Server role verification z booking_users a query zero-leakage kontrakty", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const bookingsActionPath = path.join(__dirname, "app", "actions", "bookings.ts");
    const sourceContent = fs.readFileSync(bookingsActionPath, "utf-8");

    // 1. getVerifiedBookingCaller číta čerstvú rolu z booking_users podľa session.userId
    const callerHelperStart = sourceContent.indexOf("async function getVerifiedBookingCaller()");
    const callerHelperEnd = sourceContent.indexOf("function parseGCalEvent", callerHelperStart);
    assert.ok(callerHelperStart > -1 && callerHelperEnd > callerHelperStart, "getVerifiedBookingCaller must exist");
    const callerHelperBody = sourceContent.slice(callerHelperStart, callerHelperEnd);

    assert.ok(callerHelperBody.includes("await getSession()"));
    assert.ok(callerHelperBody.includes('.from("booking_users")'));
    assert.ok(callerHelperBody.includes('.select("id, role, name")'));
    assert.ok(callerHelperBody.includes('.eq("id", session.userId)'));
    assert.ok(callerHelperBody.includes("resolveServerAccessMode(userRow.role)"));
    assert.equal(callerHelperBody.includes("session.role"), false, "getVerifiedBookingCaller must NOT trust session.role");

    // 2. fetchAuthorizedCalendarItemsAction prijíma iba (startDateIso, endDateIso) a neberie rolu ani userId z klienta
    const authActionStart = sourceContent.indexOf("export async function fetchAuthorizedCalendarItemsAction");
    const fetchBookingsStart = sourceContent.indexOf("export async function fetchBookingsAction", authActionStart);
    assert.ok(authActionStart > -1 && fetchBookingsStart > authActionStart);
    const authActionBody = sourceContent.slice(authActionStart, fetchBookingsStart);

    assert.match(
        authActionBody,
        /export async function fetchAuthorizedCalendarItemsAction\(\s*startDateIso:\s*string,\s*endDateIso:\s*string\s*\)/,
        "fetchAuthorizedCalendarItemsAction must accept only (startDateIso: string, endDateIso: string)"
    );
    assert.ok(authActionBody.includes("await getVerifiedBookingCaller()"));
    assert.equal(authActionBody.includes('.select("*")'), false, "fetchAuthorizedCalendarItemsAction must NOT use .select(\"*\")");

    // Restricted occupancy query s Q.1 výnimkou pre notes (iba na serverovú extrakciu courtId)
    assert.ok(authActionBody.includes('.select("court_id,start_at,end_at,status,notes")'));
    assert.ok(authActionBody.includes('.in("status", ["confirmed", "pending", "blocked"])'));
    assert.ok(authActionBody.includes('.gt("end_at", validation.start)'));
    assert.ok(authActionBody.includes('.lt("start_at", validation.end)'));
    assert.ok(authActionBody.includes("mapRestrictedOccupancyRowsToPublicItems(occupancyRes.data)"));

    // Restricted own query musí filtrovať podľa .eq("user_id", caller.userId) a nevyberať calendar_event_id
    assert.ok(authActionBody.includes('.select("id,court_id,start_at,end_at,status,customer_name,customer_phone,price_eur,notes")'));
    assert.ok(authActionBody.includes('.eq("user_id", caller.userId)'));
    assert.equal(authActionBody.includes("calendar_event_id"), false);

    // 3. loadStaffBookingItemsInRange nepoužíva .select("*") ani calendar_event_id
    const staffLoaderStart = sourceContent.indexOf("async function loadStaffBookingItemsInRange");
    assert.ok(staffLoaderStart > -1 && staffLoaderStart < authActionStart);
    const staffLoaderBody = sourceContent.slice(staffLoaderStart, authActionStart);
    assert.equal(staffLoaderBody.includes('.select("*")'), false);
    assert.equal(staffLoaderBody.includes("calendar_event_id"), false);
    assert.ok(staffLoaderBody.includes('.select("id, court_id, start_at, end_at, status, customer_name, customer_phone, user_id, price_eur, notes")'));

    // 4. fetchBookingsAction je uzamknutá iba pre staff (admin, ntc_team) pred DB query
    const publicActionStart = sourceContent.indexOf("export async function fetchPublicAvailabilityAction", fetchBookingsStart);
    const fetchBookingsBody = sourceContent.slice(fetchBookingsStart, publicActionStart);
    assert.ok(fetchBookingsBody.includes("await getVerifiedBookingCaller()"));
    assert.ok(fetchBookingsBody.includes('authResult.caller.accessMode !== "staff"'));
    assert.ok(fetchBookingsBody.includes('code: "FORBIDDEN"'));

    // 5. fetchPublicAvailabilityAction (Review bod 1 & 2 & 8.A):
    // Musí používať presne .select("court_id,start_at,end_at,status,notes") a odovzdať dáta iba mapPublicAvailabilityRows
    const createBookingStart = sourceContent.indexOf("export async function createBookingAction", publicActionStart);
    const publicActionBody = sourceContent.slice(publicActionStart, createBookingStart);
    assert.ok(
        publicActionBody.includes('.select("court_id,start_at,end_at,status,notes")'),
        "fetchPublicAvailabilityAction must use explicit .select(\"court_id,start_at,end_at,status,notes\")"
    );
    assert.ok(publicActionBody.includes("mapPublicAvailabilityRows(data)"));
    for (const forbidden of ['.select("*")', "customer_name", "customer_phone", "user_id", "price_eur", "calendar_event_id"]) {
        assert.equal(publicActionBody.includes(forbidden), false, `fetchPublicAvailabilityAction must not contain ${forbidden}`);
    }
    const selectMatch = publicActionBody.match(/\.select\("([^"]+)"\)/);
    assert.ok(selectMatch);
    const selectedCols = selectMatch[1].split(",").map((s) => s.trim());
    assert.equal(selectedCols.includes("id"), false, "fetchPublicAvailabilityAction select must not include 'id'");
});

// ============================================================================
// R.10: SOURCE-CONTRACT – Rekurzívny scan call sites
// ============================================================================
test("R.10 SOURCE-CONTRACT: Všetkých 5 produkčných call sites používa fetchAuthorizedCalendarItemsAction a žiadny nepoužíva fetchBookingsAction", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const directoriesToScan = [
        path.join(__dirname, "app"),
        path.join(__dirname, "components"),
        path.join(__dirname, "lib"),
    ];

    function getAllFiles(dirPath, arrayOfFiles = []) {
        for (const file of fs.readdirSync(dirPath)) {
            const fullPath = path.join(dirPath, file);
            if (fs.statSync(fullPath).isDirectory()) {
                getAllFiles(fullPath, arrayOfFiles);
            } else if (/\.(ts|tsx|js|mjs)$/.test(file)) {
                arrayOfFiles.push(fullPath);
            }
        }
        return arrayOfFiles;
    }

    const allSourceFiles = directoriesToScan.flatMap((dir) => getAllFiles(dir));
    const oldActionCalls = [];
    const newActionCalls = [];

    for (const filePath of allSourceFiles) {
        const relPath = path.relative(__dirname, filePath).replace(/\\/g, "/");
        const lines = fs.readFileSync(filePath, "utf-8").split("\n");
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (trimmed.startsWith("//")) return;
            if (line.includes("fetchBookingsAction(") && !line.includes("export async function fetchBookingsAction")) {
                oldActionCalls.push({ file: relPath, line: index + 1 });
            }
            if (line.includes("fetchAuthorizedCalendarItemsAction(") && !line.includes("export async function fetchAuthorizedCalendarItemsAction")) {
                newActionCalls.push({ file: relPath, line: index + 1 });
            }
        });
    }

    assert.equal(oldActionCalls.length, 0, `Expected 0 production calls to fetchBookingsAction, found: ${JSON.stringify(oldActionCalls)}`);
    assert.equal(newActionCalls.length, 5, `Expected 5 production calls to fetchAuthorizedCalendarItemsAction, found: ${JSON.stringify(newActionCalls)}`);

    const expectedFiles = [
        "app/bookings/page.tsx",
        "app/newbookings/page.tsx",
        "components/bookings/BookingCalendar.tsx",
        "components/newbookings/NewBookingsCalendar.tsx",
    ];
    const actualFiles = Array.from(new Set(newActionCalls.map((c) => c.file))).sort();
    assert.deepEqual(actualFiles, expectedFiles);
});

// ============================================================================
// R.11: SOURCE-CONTRACT – Realtime guardy, initialAccessMode tok a zákaz dead code
// ============================================================================
test("R.11 SOURCE-CONTRACT: Realtime kanály sú povolené iba pre staff (admin/ntc_team), initialAccessMode sa prenáša cez page -> wrapper -> calendar a žiadny dead code", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const bookingsPage = fs.readFileSync(path.join(__dirname, "app/bookings/page.tsx"), "utf-8");
    const authWrapper = fs.readFileSync(path.join(__dirname, "components/bookings/BookingAuthWrapper.tsx"), "utf-8");
    const newCal = fs.readFileSync(path.join(__dirname, "components/newbookings/NewBookingsCalendar.tsx"), "utf-8");
    const bookCal = fs.readFileSync(path.join(__dirname, "components/bookings/BookingCalendar.tsx"), "utf-8");

    // Review bod 4 & 8.B: initialAccessMode tok cez app/bookings/page.tsx -> BookingAuthWrapper -> BookingCalendar
    assert.ok(
        bookingsPage.includes("let initialAccessMode: CalendarAccessMode | null = null;"),
        "app/bookings/page.tsx must initialize initialAccessMode = null"
    );
    assert.ok(
        bookingsPage.includes("initialAccessMode = res.accessMode;"),
        "app/bookings/page.tsx must capture res.accessMode"
    );
    assert.ok(
        bookingsPage.includes("initialAccessMode={initialAccessMode}"),
        "app/bookings/page.tsx must pass initialAccessMode to BookingAuthWrapper"
    );
    assert.ok(
        authWrapper.includes("initialAccessMode: CalendarAccessMode | null;"),
        "BookingAuthWrapperProps must accept initialAccessMode: CalendarAccessMode | null"
    );
    assert.ok(
        authWrapper.includes("initialAccessMode={initialAccessMode}"),
        "BookingAuthWrapper must pass initialAccessMode to BookingCalendar"
    );
    assert.ok(
        bookCal.includes("const [accessMode, setAccessMode] = useState<CalendarAccessMode | null>(() => initialAccessMode ?? null);"),
        "BookingCalendar must initialize accessMode strictly from initialAccessMode ?? null"
    );
    assert.ok(
        newCal.includes("const [accessMode, setAccessMode] = useState<CalendarAccessMode | null>(() => initialAccessMode ?? null);"),
        "NewBookingsCalendar must initialize accessMode strictly from initialAccessMode ?? null"
    );
    assert.equal(
        bookCal.includes('isPrivilegedReadRole(currentUser.role) ? "staff"'),
        false,
        "BookingCalendar must NOT initialize staff accessMode from client currentUser.role"
    );
    assert.equal(
        newCal.includes("isPrivilegedReadRole(initialCurrentUser.role)"),
        false,
        "NewBookingsCalendar must NOT initialize staff accessMode from initialCurrentUser.role"
    );
    assert.equal(
        newCal.includes('isPrivilegedReadRole(currentUser.role) ? "staff"'),
        false,
        "NewBookingsCalendar must NOT initialize staff accessMode from currentUser.role"
    );
    assert.equal(
        /setAccessMode\(\s*["']staff["']\s*\)/.test(newCal),
        false,
        "NewBookingsCalendar must never hardcode setAccessMode('staff') from client role"
    );
    assert.equal(
        /setAccessMode\(\s*["']staff["']\s*\)/.test(bookCal),
        false,
        "BookingCalendar must never hardcode setAccessMode('staff') from client role"
    );

    // Review bod 5 & 8.D: zákaz mŕtveho polling kódu (if (false, noop) v kalendároch
    for (const calSource of [newCal, bookCal]) {
        assert.equal(calSource.includes("if (false"), false, "Calendars must not contain dead 'if (false' branches");
        assert.equal(/\bnoop\b/.test(calSource), false, "Calendars must not contain dead 'noop' variables or comments");
    }

    // Review bod 7 & 8.E: oba kalendáre používajú spoločný helper mapCreatedBookingToOwnBookingDto
    assert.ok(
        newCal.includes("toOwnBookingCalendarItem(mapCreatedBookingToOwnBookingDto(b))"),
        "NewBookingsCalendar must use mapCreatedBookingToOwnBookingDto(b)"
    );
    assert.ok(
        bookCal.includes("toOwnBookingCalendarItem(mapCreatedBookingToOwnBookingDto(b))"),
        "BookingCalendar must use mapCreatedBookingToOwnBookingDto(b)"
    );

    // Žiadny nefiltrovaný wallets-realtime kanál nesmie existovať
    assert.equal(newCal.includes("wallets-realtime"), false, "Unfiltered wallets-realtime channel must be removed");
    assert.equal(bookCal.includes("wallets-realtime"), false);

    // Izolácia authenticated Realtime/polling useEffect v NewBookingsCalendar
    const realtimeMarkerIdx = newCal.indexOf("1. Supabase Realtime WebSocket listener");
    assert.ok(realtimeMarkerIdx > -1);
    const effectStartIdx = newCal.lastIndexOf("useEffect(() => {", realtimeMarkerIdx);
    const anonPollStartIdx = newCal.indexOf("Safe background polling for anonymous visitors", realtimeMarkerIdx);
    assert.ok(effectStartIdx > -1 && anonPollStartIdx > effectStartIdx);

    const isolatedAuthEffect = newCal.slice(effectStartIdx, anonPollStartIdx);

    const guardMatch = isolatedAuthEffect.match(/if\s*\(!currentUser\)\s*\{\s*return;\s*\}/);
    assert.ok(guardMatch, "Must guard with if (!currentUser) { return; }");
    const guardEndPos = guardMatch.index + guardMatch[0].length;

    const activeDeclPos = isolatedAuthEffect.indexOf("let active = true;");
    const isStaffUserPos = isolatedAuthEffect.indexOf("const isStaffUser =");
    const channelPos = isolatedAuthEffect.indexOf('supabase.channel("newbookings-realtime")');
    const pollIntervalPos = isolatedAuthEffect.indexOf("const pollInterval = window.setInterval");
    const cleanupReturnPos = isolatedAuthEffect.indexOf("return () => {");

    assert.ok(activeDeclPos > guardEndPos && activeDeclPos < channelPos, "let active = true; must be before channel creation");
    assert.ok(isStaffUserPos > activeDeclPos && isStaffUserPos < channelPos);
    assert.ok(
        isolatedAuthEffect.includes('accessMode === "staff"') &&
        isolatedAuthEffect.includes('currentUser.role === "admin" || currentUser.role === "ntc_team"'),
        "Realtime must require both accessMode === 'staff' and admin/ntc_team role"
    );
    assert.ok(isolatedAuthEffect.indexOf("const channel = isStaffUser") < channelPos, "isStaffUser guard must precede supabase.channel");

    // Kontrola if (!active) return v Realtime callbacku aj v 3.5s pollingu po await fetchAuthorizedCalendarItemsAction
    const channelCallbackSlice = isolatedAuthEffect.slice(channelPos, pollIntervalPos);
    assert.match(channelCallbackSlice, /\(payload\)\s*=>\s*\{\s*if\s*\(!active\)\s*return;/);

    const pollSlice = isolatedAuthEffect.slice(pollIntervalPos, cleanupReturnPos);
    assert.match(pollSlice, /setInterval\(async\s*\(\)\s*=>\s*\{\s*if\s*\(!active\)\s*return;/);
    assert.match(pollSlice, /await fetchAuthorizedCalendarItemsAction\([\s\S]+?\);\s*if\s*\(!active\)\s*return;/);

    // Cleanup kontrola
    const cleanupSlice = isolatedAuthEffect.slice(cleanupReturnPos);
    const activeFalsePos = cleanupSlice.indexOf("active = false;");
    const removeChannelPos = cleanupSlice.indexOf("supabase.removeChannel(channel)");
    const clearIntervalPos = cleanupSlice.indexOf("window.clearInterval(pollInterval)");
    assert.ok(activeFalsePos > -1 && activeFalsePos < removeChannelPos && activeFalsePos < clearIntervalPos);

    // BookingCalendar Realtime guard pre staff
    const bookChannelPos = bookCal.indexOf('channel("bookings-realtime")');
    assert.ok(bookChannelPos > -1);
    const beforeBookChannel = bookCal.slice(bookChannelPos - 350, bookChannelPos);
    assert.ok(
        beforeBookChannel.includes('!currentUser || accessMode !== "staff" || (currentUser.role !== "admin" && currentUser.role !== "ntc_team")'),
        "BookingCalendar must block Realtime channel for restricted and anonymous users"
    );
});

// ============================================================================
// R.12 & R.13: SOURCE-CONTRACT – Ochrana public slotov, Own vs. Staff UI kontrakt a explicitný target pri rušení série
// ============================================================================
test("R.12 & R.13 SOURCE-CONTRACT: Public sloty nemajú management akcie, own-booking nepoužíva booking.user_id ani subSlots editor a rušenie série má explicitný target", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const newCal = fs.readFileSync(path.join(__dirname, "components/newbookings/NewBookingsCalendar.tsx"), "utf-8");
    const bookCal = fs.readFileSync(path.join(__dirname, "components/bookings/BookingCalendar.tsx"), "utf-8");
    const dialogs = fs.readFileSync(path.join(__dirname, "components/newbookings/NewBookingDialogs.tsx"), "utf-8");

    // 1. Ochrana public slotov v NewBookingsCalendar
    const newCalRenderMarker = 'dayBookings.filter((item) => (item.kind === "public-occupied"';
    const markerIdx = newCal.indexOf(newCalRenderMarker);
    assert.ok(markerIdx > -1);
    const newCalPublicRenderIdx = newCal.indexOf('if (item.kind === "public-occupied")', markerIdx);
    const newCalOwnRenderIdx = newCal.indexOf('if (item.kind === "own-booking")', newCalPublicRenderIdx);
    assert.ok(newCalPublicRenderIdx > -1 && newCalOwnRenderIdx > newCalPublicRenderIdx);

    const newCalPublicBranch = newCal.slice(newCalPublicRenderIdx, newCalOwnRenderIdx);
    for (const forbidden of ["deleteBookingAction", "rescheduleBookingAction", "setDetail(", "setDeleting(", "booking.id"]) {
        assert.equal(newCalPublicBranch.includes(forbidden), false, `NewBookingsCalendar public branch must not contain ${forbidden}`);
    }

    // 2. Ochrana public slotov v BookingCalendar
    const bookCalPublicRenderIdx = bookCal.indexOf('if (item.kind === "public-occupied")');
    const bookCalPrivateRenderIdx = bookCal.indexOf("const booking = item.booking;", bookCalPublicRenderIdx);
    assert.ok(bookCalPublicRenderIdx > -1 && bookCalPrivateRenderIdx > bookCalPublicRenderIdx);

    const bookCalPublicBranch = bookCal.slice(bookCalPublicRenderIdx, bookCalPrivateRenderIdx);
    for (const forbidden of ["deleteBookingAction", "setInfoModalItem(", "setConfirmModal(", "booking.id"]) {
        assert.equal(bookCalPublicBranch.includes(forbidden), false, `BookingCalendar public branch must not contain ${forbidden}`);
    }

    // 3. Own vs. Staff UI kontrakt v NewBookingDialogs.tsx a NewBookingsCalendar.tsx
    assert.match(
        dialogs,
        /const canEditSubSlots\s*=\s*isStaffDetail\s*&&\s*accessMode === "staff"\s*&&\s*\(currentRole === "admin" \|\| currentRole === "ntc_team"\);/,
        "NewBookingDialogs must restrict subSlots editing to staff detail and admin/ntc_team role"
    );
    assert.ok(
        newCal.includes('if (item.kind === "own-booking")'),
        "NewBookingsCalendar must render own bookings via item.kind === 'own-booking' without requiring booking.user_id"
    );

    // 4. Review bod 3 & 8.C: Rušenie série odovzdáva explicitný targetItem a nespolieha sa na asynchrónne setDeleting(targetItem) pred remove(true)
    assert.ok(
        newCal.includes("const remove = async (deleteEntireSeries = false, explicitTargetItem?: DetailCalendarItem | null) =>"),
        "remove handler must accept explicitTargetItem parameter"
    );
    assert.ok(
        newCal.includes("onConfirm={(deleteSeries) => remove(deleteSeries, deleting)}"),
        "DeleteDialog must pass captured deleting state explicitly to remove"
    );
    const seriesCancelIdx = newCal.indexOf("onCancelEntireSeries={async");
    assert.ok(seriesCancelIdx > -1);
    const seriesCancelSlice = newCal.slice(seriesCancelIdx, seriesCancelIdx + 600);
    assert.equal(
        seriesCancelSlice.includes("setDeleting(targetItem)"),
        false,
        "onCancelEntireSeries must NOT rely on setDeleting(targetItem) state update before calling remove"
    );
    assert.ok(
        seriesCancelSlice.includes("await remove(true, targetItem)"),
        "onCancelEntireSeries must call remove(true, targetItem) directly with explicit targetItem"
    );
});

// ============================================================================
// R.14 & R.15: SOURCE-CONTRACT – Autorizácia fetchSeriesBookingsAction a deleteEntireSeries
// ============================================================================
test("R.14 & R.15 SOURCE-CONTRACT: Autorizácia a validácia fetchSeriesBookingsAction a deleteEntireSeries v deleteBookingAction", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sourceContent = fs.readFileSync(path.join(__dirname, "app", "actions", "bookings.ts"), "utf-8");

    // R.14: fetchSeriesBookingsAction
    const seriesStart = sourceContent.indexOf("export async function fetchSeriesBookingsAction");
    const deleteStart = sourceContent.indexOf("export async function deleteBookingAction", seriesStart);
    assert.ok(seriesStart > -1 && deleteStart > seriesStart);
    const seriesBody = sourceContent.slice(seriesStart, deleteStart);

    assert.ok(seriesBody.includes("if (!isValidRecurringGroupId(recurringGroupId))"), "Must validate recurringGroupId format first");
    assert.ok(seriesBody.includes("await getVerifiedBookingCaller()"), "Must verify caller via getVerifiedBookingCaller()");
    assert.equal(seriesBody.includes(".like("), false, "Must NOT use unsafe .like() with recurringGroupId");
    assert.equal(seriesBody.includes('.select("*")'), false, "Must NOT use .select(\"*\")");
    assert.ok(seriesBody.includes('.eq("tenant_id", TENANT_ID)'));
    assert.ok(seriesBody.includes('.eq("user_id", caller.userId)'), "Restricted branch must filter by .eq(\"user_id\", caller.userId)");
    assert.ok(seriesBody.includes("rowGroupId !== recurringGroupId") || seriesBody.includes("rowGroupId === recurringGroupId"), "Must verify exact parsed JSON equality");

    // R.15: deleteBookingAction (deleteEntireSeries)
    const rescheduleStart = sourceContent.indexOf("export async function rescheduleBookingAction", deleteStart);
    assert.ok(rescheduleStart > deleteStart);
    const deleteBody = sourceContent.slice(deleteStart, rescheduleStart);

    assert.ok(deleteBody.includes("await getVerifiedBookingCaller()"), "deleteBookingAction must verify caller via DB");
    assert.ok(deleteBody.includes('const isCallerAdmin = caller.role === "admin";'), "Only admin has privileged foreign delete");
    assert.ok(deleteBody.includes("const isOwner = booking.user_id === caller.userId;"), "Ownership must strictly compare booking.user_id === caller.userId");
    assert.ok(deleteBody.includes("if (!isCallerAdmin && !isOwner)"), "Non-admin non-owner must be rejected before any series query or modification");
    assert.ok(deleteBody.includes("const targetRecurringGroupId = extractValidRecurringGroupIdFromNotes(booking.notes);"), "recurringGroupId must come from server-loaded target booking");
    assert.equal(deleteBody.includes(".like("), false, "deleteEntireSeries must NOT use unsafe .like()");
    assert.ok(deleteBody.includes('.gte("start_at", booking.start_at)'), "Must preserve cancel from current booking forward semantics");
    assert.ok(deleteBody.includes('seriesQuery = seriesQuery.eq("user_id", caller.userId);'), "Non-admin series selection must filter by caller.userId");
    assert.ok(deleteBody.includes("const ruleErr = checkNonAdminCancellationAllowed(item.start_at, item.parsedNotes);"), "Deadline and rescheduled rules must be checked on all matching series items before DB update");

    const validationLoopPos = deleteBody.indexOf("checkNonAdminCancellationAllowed(item.start_at, item.parsedNotes)");
    const updateSeriesPos = deleteBody.indexOf('.update({ status: "cancelled" })');
    assert.ok(validationLoopPos > -1 && updateSeriesPos > validationLoopPos, "Validation of all series items must happen strictly BEFORE any .update({ status: 'cancelled' })");
});
