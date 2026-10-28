import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 1. Skutočný import produkčného modulu (žiadna kópia logiky!)
import {
    validatePublicAvailabilityRange,
    mapPublicAvailabilityRows,
} from "./lib/bookings/publicAvailability.ts";

test("BEHAVIORAL: 1. Neplatný dátum je odmietnutý validáciou", () => {
    const res1 = validatePublicAvailabilityRange("not-a-date", "2026-11-01T10:00:00Z");
    assert.equal(res1.valid, false);
    assert.equal(res1.code, "INVALID_RANGE");

    const res2 = validatePublicAvailabilityRange(12345, "2026-11-01T10:00:00Z");
    assert.equal(res2.valid, false);
    assert.equal(res2.code, "INVALID_RANGE");

    const res3 = validatePublicAvailabilityRange("2026-11-01T10:00:00Z", "invalid");
    assert.equal(res3.valid, false);
    assert.equal(res3.code, "INVALID_RANGE");
});

test("BEHAVIORAL: 2. end <= start je odmietnuté", () => {
    // end < start
    const res1 = validatePublicAvailabilityRange("2026-11-05T10:00:00Z", "2026-11-04T10:00:00Z");
    assert.equal(res1.valid, false);
    assert.equal(res1.code, "INVALID_RANGE");
    assert.match(res1.error, /Začiatok intervalu musí byť pred koncom/);

    // end === start
    const res2 = validatePublicAvailabilityRange("2026-11-05T10:00:00Z", "2026-11-05T10:00:00Z");
    assert.equal(res2.valid, false);
    assert.equal(res2.code, "INVALID_RANGE");
});

test("BEHAVIORAL: 3. Interval dlhší než 14 dní je odmietnutý", () => {
    const start = new Date("2026-11-01T00:00:00.000Z");
    const endTooLong = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000 + 1000);

    const res = validatePublicAvailabilityRange(start.toISOString(), endTooLong.toISOString());
    assert.equal(res.valid, false);
    assert.equal(res.code, "RANGE_TOO_LARGE");
    assert.match(res.error, /14 dní/);
});

test("BEHAVIORAL: 4. Presne 14-dňový interval je povolený", () => {
    const start = new Date("2026-11-01T00:00:00.000Z");
    const endExact14 = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);

    const res = validatePublicAvailabilityRange(start.toISOString(), endExact14.toISOString());
    assert.equal(res.valid, true);
    assert.equal(res.start, start.toISOString());
    assert.equal(res.end, endExact14.toISOString());
});

test("BEHAVIORAL: 5. Reťazec dlhší ako 100 znakov je odmietnutý", () => {
    const hugeStr = "2026-11-01T00:00:00.000Z" + "a".repeat(120);
    const res = validatePublicAvailabilityRange(hugeStr, "2026-11-02T00:00:00.000Z");
    assert.equal(res.valid, false);
    assert.equal(res.code, "INVALID_RANGE");
});

test("BEHAVIORAL: 6. Mapper: confirmed, pending aj blocked sa mapujú na 'occupied'", () => {
    const mockDbRows = [
        { court_id: "badminton-1", start_at: "2026-11-01T09:00:00Z", end_at: "2026-11-01T10:00:00Z", status: "confirmed" },
        { court_id: "badminton-2", start_at: "2026-11-01T10:00:00Z", end_at: "2026-11-01T11:00:00Z", status: "pending" },
        { court_id: "tennis-1", start_at: "2026-11-01T11:00:00Z", end_at: "2026-11-01T12:00:00Z", status: "blocked" },
    ];

    const { slots, skippedCount } = mapPublicAvailabilityRows(mockDbRows);
    assert.equal(skippedCount, 0);
    assert.equal(slots.length, 3);

    for (const slot of slots) {
        assert.equal(slot.status, "occupied");
    }
});

test("BEHAVIORAL: 7. Bezpečnosť a Zero-Leakage: citlivé polia sa neprenesú do DTO", () => {
    const poisonedRow = {
        id: "d3b07384-d113-4c56-b09e-000000000000",
        court_id: "badminton-1",
        start_at: "2026-11-01T09:00:00Z",
        end_at: "2026-11-01T10:00:00Z",
        status: "confirmed",
        customer_name: "Jozef Mrkvicka",
        customerName: "Jozef Mrkvicka",
        customer_phone: "+421900111222",
        phone: "+421900111222",
        user_id: "user-123",
        userId: "user-123",
        userCardNumber: "CARD-999",
        card_number: "CARD-999",
        price_eur: 19,
        priceEur: 19,
        notes: JSON.stringify({ secret: "data" }),
        calendar_event_id: "gcal-123",
        created_at: "2026-10-01T12:00:00Z"
    };

    const { slots } = mapPublicAvailabilityRows([poisonedRow]);
    assert.equal(slots.length, 1);
    const slot = slots[0];

    const keys = Object.keys(slot).sort();
    assert.deepEqual(keys, ["courtId", "end", "start", "status"]);

    assert.equal(slot.id, undefined);
    assert.equal(slot.notes, undefined);
    assert.equal(slot.customerName, undefined);
    assert.equal(slot.customer_name, undefined);
    assert.equal(slot.phone, undefined);
    assert.equal(slot.customer_phone, undefined);
    assert.equal(slot.userId, undefined);
    assert.equal(slot.user_id, undefined);
    assert.equal(slot.priceEur, undefined);
    assert.equal(slot.price_eur, undefined);
    assert.equal(slot.userCardNumber, undefined);
    assert.equal(slot.calendar_event_id, undefined);
});

test("BEHAVIORAL: 8. Sprísnený fail-closed mapper: neplatné timestampy, end_at <= start_at a neznámy status", () => {
    const invalidRows = [
        // Chýbajúci alebo neplatný court_id
        { court_id: null, start_at: "2026-11-01T09:00:00Z", end_at: "2026-11-01T10:00:00Z", status: "confirmed" },
        { court_id: "   ", start_at: "2026-11-01T09:00:00Z", end_at: "2026-11-01T10:00:00Z", status: "confirmed" },
        // Neplatný start_at
        { court_id: "badminton-1", start_at: "invalid-date", end_at: "2026-11-01T10:00:00Z", status: "confirmed" },
        // Neplatný end_at
        { court_id: "badminton-1", start_at: "2026-11-01T09:00:00Z", end_at: "invalid-date", status: "confirmed" },
        // end_at <= start_at
        { court_id: "badminton-1", start_at: "2026-11-01T10:00:00Z", end_at: "2026-11-01T09:00:00Z", status: "confirmed" },
        { court_id: "badminton-1", start_at: "2026-11-01T10:00:00Z", end_at: "2026-11-01T10:00:00Z", status: "confirmed" },
        // Neočakávaný status (napr. cancelled, unknown)
        { court_id: "badminton-1", start_at: "2026-11-01T09:00:00Z", end_at: "2026-11-01T10:00:00Z", status: "cancelled" },
        { court_id: "badminton-1", start_at: "2026-11-01T09:00:00Z", end_at: "2026-11-01T10:00:00Z", status: "other" },
        // Platný riadok
        { court_id: "badminton-valid", start_at: "2026-11-01T09:00:00Z", end_at: "2026-11-01T10:00:00Z", status: "confirmed" },
    ];

    const { slots, skippedCount } = mapPublicAvailabilityRows(invalidRows);
    assert.equal(skippedCount, 8);
    assert.equal(slots.length, 1);
    assert.equal(slots[0].courtId, "badminton-valid");
    assert.equal(slots[0].start, new Date("2026-11-01T09:00:00Z").toISOString());
    assert.equal(slots[0].end, new Date("2026-11-01T10:00:00Z").toISOString());
});

// 2. SOURCE-CONTRACT TEST: statická overovacia kontrola zdrojového kódu app/actions/bookings.ts
test("SOURCE-CONTRACT: fetchPublicAvailabilityAction query contract & zero-leakage check", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const bookingsActionPath = path.join(__dirname, "app", "actions", "bookings.ts");
    const sourceContent = fs.readFileSync(bookingsActionPath, "utf-8");

    // Extrahujeme IBA telo funkcie fetchPublicAvailabilityAction
    const actionIndex = sourceContent.indexOf("async function fetchPublicAvailabilityAction");
    assert.ok(actionIndex > -1, "fetchPublicAvailabilityAction must exist in app/actions/bookings.ts");

    // Telo funkcie ohraničené začiatkom ďalšej funkcie createBookingAction
    const nextFunctionIndex = sourceContent.indexOf("export async function createBookingAction", actionIndex);
    assert.ok(nextFunctionIndex > actionIndex, "createBookingAction must follow fetchPublicAvailabilityAction");

    const actionBody = sourceContent.slice(actionIndex, nextFunctionIndex);

    // Kontrola povoleného a očakávaného Supabase query kontraktu:
    assert.ok(
        actionBody.includes('.select("court_id,start_at,end_at,status")'),
        "Action must use explicit .select(\"court_id,start_at,end_at,status\")"
    );
    assert.ok(
        actionBody.includes('.eq("tenant_id", TENANT_ID)'),
        "Action must filter by .eq(\"tenant_id\", TENANT_ID)"
    );
    assert.ok(
        actionBody.includes('.in("status", ["confirmed", "pending", "blocked"])'),
        "Action must filter by .in(\"status\", [\"confirmed\", \"pending\", \"blocked\"])"
    );
    assert.ok(
        actionBody.includes('.gt("end_at", validation.start)'),
        "Action must filter by .gt(\"end_at\", validation.start)"
    );
    assert.ok(
        actionBody.includes('.lt("start_at", validation.end)'),
        "Action must filter by .lt(\"start_at\", validation.end)"
    );

    // Striktný zákaz zakázaných reťazcov v tele funkcie:
    const forbiddenPatterns = [
        '.select("*")',
        "notes",
        "customer_name",
        "customer_phone",
        "user_id",
        "price_eur",
        "calendar_event_id",
    ];

    for (const forbidden of forbiddenPatterns) {
        assert.equal(
            actionBody.includes(forbidden),
            false,
            `Forbidden pattern '${forbidden}' was detected in fetchPublicAvailabilityAction body!`
        );
    }
});
