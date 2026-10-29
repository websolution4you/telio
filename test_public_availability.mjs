import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 1. Skutočný import produkčného modulu (žiadna kópia logiky!)
import {
    validatePublicAvailabilityRange,
    mapPublicAvailabilityRows,
    toPublicCalendarItem,
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

test("BEHAVIORAL: 9. toPublicCalendarItem mapper: formát kľúča a ochrana pred únikom citlivých dát", () => {
    const slot = {
        courtId: "court-clay-1",
        start: "2026-11-01T09:00:00.000Z",
        end: "2026-11-01T10:00:00.000Z",
        status: "occupied",
    };

    const item = toPublicCalendarItem(slot);
    assert.equal(item.kind, "public-occupied");
    assert.equal(item.key, "public:court-clay-1:2026-11-01T09:00:00.000Z:2026-11-01T10:00:00.000Z");
    assert.equal(item.courtId, "court-clay-1");
    assert.equal(item.start, slot.start);
    assert.equal(item.end, slot.end);
    assert.equal(item.status, "occupied");

    const itemKeys = Object.keys(item).sort();
    assert.deepEqual(itemKeys, ["courtId", "end", "key", "kind", "start", "status"]);

    // Overenie, že položka neobsahuje žiadne interné booking identifikátory ani osobné údaje
    assert.equal(item.id, undefined);
    assert.equal(item.userId, undefined);
    assert.equal(item.customerName, undefined);
    assert.equal(item.priceEur, undefined);
    assert.equal(item.booking, undefined);
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

// 3. SOURCE-CONTRACT TEST: overenie ochrany fetchBookingsAction (session guard pred DB)
test("SOURCE-CONTRACT: fetchBookingsAction session guard order before DB call within isolated function body", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const bookingsActionPath = path.join(__dirname, "app", "actions", "bookings.ts");
    const sourceContent = fs.readFileSync(bookingsActionPath, "utf-8");

    const actionIndex = sourceContent.indexOf("export async function fetchBookingsAction");
    assert.ok(actionIndex > -1, "fetchBookingsAction must exist in app/actions/bookings.ts");

    // Jednoznačné ohraničenie konca funkcie podľa začiatku nasledujúcej exportovanej server action
    const nextActionIndex = sourceContent.indexOf("export async function fetchPublicAvailabilityAction", actionIndex);
    assert.ok(nextActionIndex > actionIndex, "fetchPublicAvailabilityAction must follow fetchBookingsAction");

    const isolatedBody = sourceContent.slice(actionIndex, nextActionIndex);

    assert.ok(isolatedBody.includes("await getSession()"), "isolatedBody must contain await getSession()");
    assert.ok(isolatedBody.includes("!session || !session.userId"), "isolatedBody must verify !session || !session.userId");
    assert.ok(isolatedBody.includes('code: "UNAUTHORIZED"'), "isolatedBody must return UNAUTHORIZED");

    const sessionCheckPos = isolatedBody.indexOf("await getSession()");
    const unauthorizedPos = isolatedBody.indexOf('code: "UNAUTHORIZED"');
    const getCoreServiceDbPos = isolatedBody.indexOf("getCoreServiceDb()");
    const fromBookingsPos = isolatedBody.indexOf('.from("bookings")');

    assert.ok(unauthorizedPos > sessionCheckPos, "UNAUTHORIZED check must follow getSession()");
    assert.ok(getCoreServiceDbPos > unauthorizedPos, "getCoreServiceDb() must be strictly after UNAUTHORIZED return");
    assert.ok(fromBookingsPos > unauthorizedPos, ".from(\"bookings\") must be strictly after UNAUTHORIZED return");
});

// 4. SOURCE-CONTRACT TEST: Rekurzívny scan repozitára pre volania fetchBookingsAction
test("SOURCE-CONTRACT: Recursive repository scan for fetchBookingsAction call sites", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const directoriesToScan = [
        path.join(__dirname, "app"),
        path.join(__dirname, "components"),
        path.join(__dirname, "lib"),
    ];

    function getAllFiles(dirPath, arrayOfFiles = []) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            if (fs.statSync(fullPath).isDirectory()) {
                getAllFiles(fullPath, arrayOfFiles);
            } else if (file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".js") || file.endsWith(".mjs")) {
                arrayOfFiles.push(fullPath);
            }
        }
        return arrayOfFiles;
    }

    const allSourceFiles = directoriesToScan.flatMap((dir) => getAllFiles(dir));
    const foundCallSites = [];

    for (const filePath of allSourceFiles) {
        const relPath = path.relative(__dirname, filePath).replace(/\\/g, "/");
        const content = fs.readFileSync(filePath, "utf-8");

        const lines = content.split("\n");
        lines.forEach((line, index) => {
            if (line.includes("fetchBookingsAction(") && !line.includes("export async function fetchBookingsAction") && !line.trim().startsWith("//")) {
                foundCallSites.push({ file: relPath, line: index + 1, content: line.trim() });
            }
        });
    }

    // Očakávané presné produkčné call sites:
    const expectedFiles = [
        "app/newbookings/page.tsx",
        "app/bookings/page.tsx",
        "components/newbookings/NewBookingsCalendar.tsx",
        "components/bookings/BookingCalendar.tsx",
    ];

    const actualFilesWithCalls = Array.from(new Set(foundCallSites.map((c) => c.file))).sort();
    assert.deepEqual(actualFilesWithCalls, expectedFiles.sort(), "All call sites of fetchBookingsAction must match expected inventory");
    assert.equal(foundCallSites.length, 5, "Expected exactly 5 call sites across official application");
});

// 5. SOURCE-CONTRACT TEST: Podrobné kontroly jednotlivých call sites a komponentov (a až h)
test("SOURCE-CONTRACT: Call site isolation and branch contracts (a-h)", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // a) app/newbookings/page.tsx
    const newBookingsPage = fs.readFileSync(path.join(__dirname, "app/newbookings/page.tsx"), "utf-8");
    assert.ok(newBookingsPage.includes("session?.userId"), "app/newbookings/page.tsx must branch on session?.userId");
    assert.ok(newBookingsPage.includes("fetchPublicAvailabilityAction"), "app/newbookings/page.tsx must call fetchPublicAvailabilityAction");
    assert.equal(newBookingsPage.includes("bookingsOrAvailRes as"), false, "Must not contain bookingsOrAvailRes as");
    assert.equal(newBookingsPage.includes("as { success: boolean; bookings"), false, "Must not contain unsafe assertion for bookings");
    assert.equal(newBookingsPage.includes("as { success: boolean; slots"), false, "Must not contain unsafe assertion for slots");

    // b) app/bookings/page.tsx
    const bookingsPage = fs.readFileSync(path.join(__dirname, "app/bookings/page.tsx"), "utf-8");
    assert.ok(bookingsPage.includes("session?.userId"), "app/bookings/page.tsx must branch on session?.userId");
    assert.ok(bookingsPage.includes("fetchPublicAvailabilityAction"), "app/bookings/page.tsx must call fetchPublicAvailabilityAction");
    assert.ok(bookingsPage.includes("fetchBookingsAction"), "app/bookings/page.tsx must call fetchBookingsAction");

    // c) NewBookingsCalendar authenticated load
    const newCal = fs.readFileSync(path.join(__dirname, "components/newbookings/NewBookingsCalendar.tsx"), "utf-8");
    const loadIndex = newCal.indexOf("async function load()");
    assert.ok(loadIndex > -1);
    const loadSlice = newCal.slice(loadIndex, loadIndex + 2500);
    assert.ok(loadSlice.includes("fetchPublicAvailabilityAction"), "load() must call fetchPublicAvailabilityAction in anonymous branch");
    assert.ok(loadSlice.includes("fetchBookingsAction"), "load() must call fetchBookingsAction in authenticated branch");
    assert.ok(loadSlice.includes('if (item.kind === "booking")'), "load() must filter only item.kind === booking during authenticated merge");
    assert.equal(loadSlice.includes('item.kind === "public-occupied" ? item.key : item.booking.id'), false, "load() must not keep public-occupied items in authenticated merge");

    // d) NewBookingsCalendar anonymous polling
    const anonPollIndex = newCal.indexOf("Safe background polling for anonymous visitors");
    assert.ok(anonPollIndex > -1);
    const anonPollSlice = newCal.slice(anonPollIndex, anonPollIndex + 1200);
    assert.ok(anonPollSlice.includes("if (currentUser) return;"), "Anonymous polling must guard with if (currentUser) return;");
    assert.ok(anonPollSlice.includes("fetchPublicAvailabilityAction"), "Anonymous polling must call fetchPublicAvailabilityAction");
    assert.equal(anonPollSlice.includes("fetchBookingsAction"), false, "Anonymous polling must NEVER call fetchBookingsAction");
    assert.ok(anonPollSlice.includes("30_000"), "Anonymous polling interval must be 30 seconds");
    assert.ok(anonPollSlice.includes("isFetching"), "Anonymous polling must guard against request overlap");
    assert.ok(anonPollSlice.includes("clearInterval"), "Anonymous polling must clear interval on unmount");

    // e) NewBookingsCalendar Realtime & authenticated polling lifecycle contract (source-contract, nie behaviorálny concurrency test)
    const realtimeMarker = "1. Supabase Realtime WebSocket listener";
    const realtimeMarkerIdx = newCal.indexOf(realtimeMarker);
    assert.ok(realtimeMarkerIdx > -1, "Realtime listener marker must exist");
    const effectStartIdx = newCal.lastIndexOf("useEffect(() => {", realtimeMarkerIdx);
    const anonPollStartIdx = newCal.indexOf("Safe background polling for anonymous visitors", realtimeMarkerIdx);
    assert.ok(effectStartIdx > -1 && anonPollStartIdx > effectStartIdx, "Must isolate authenticated Realtime/polling useEffect");

    const isolatedAuthRealtimeEffect = newCal.slice(effectStartIdx, anonPollStartIdx);

    const guardMatch = isolatedAuthRealtimeEffect.match(/if\s*\(!currentUser\)\s*\{\s*return;\s*\}/);
    assert.ok(guardMatch, "Authenticated Realtime/polling effect must guard with if (!currentUser) { return; }");
    const guardEndPos = guardMatch.index + guardMatch[0].length;

    const firstChannelPos = isolatedAuthRealtimeEffect.indexOf('supabase.channel("newbookings-realtime")');
    const walletChannelPos = isolatedAuthRealtimeEffect.indexOf('supabase.channel("wallets-realtime")');
    const pollIntervalPos = isolatedAuthRealtimeEffect.indexOf("const pollInterval = window.setInterval");
    const cleanupReturnPos = isolatedAuthRealtimeEffect.indexOf("return () => {");

    assert.ok(firstChannelPos > guardEndPos, "if (!currentUser) return must be before channels");

    const activeDeclPos = isolatedAuthRealtimeEffect.indexOf("let active = true;");
    assert.ok(activeDeclPos > guardEndPos && activeDeclPos < firstChannelPos, "let active = true; must exist right after !currentUser guard and before channels");

    // Cleanup ordering
    assert.ok(cleanupReturnPos > pollIntervalPos, "Cleanup return must exist at the end of effect");
    const cleanupSlice = isolatedAuthRealtimeEffect.slice(cleanupReturnPos);
    const activeFalsePos = cleanupSlice.indexOf("active = false;");
    const removeChannel1Pos = cleanupSlice.indexOf("supabase.removeChannel(channel)");
    const removeChannel2Pos = cleanupSlice.indexOf("supabase.removeChannel(walletChannel)");
    const clearIntervalPos = cleanupSlice.indexOf("window.clearInterval(pollInterval)");
    const clearTimersPos = cleanupSlice.indexOf("timers.forEach");

    assert.ok(activeFalsePos > -1, "Cleanup must set active = false;");
    assert.ok(activeFalsePos < removeChannel1Pos, "active = false must be before removeChannel(channel)");
    assert.ok(activeFalsePos < removeChannel2Pos, "active = false must be before removeChannel(walletChannel)");
    assert.ok(activeFalsePos < clearIntervalPos, "active = false must be before clearInterval(pollInterval)");
    assert.ok(activeFalsePos < clearTimersPos, "active = false must be before timer cleanup");

    // Bookings Realtime callback check
    const bookingsCallbackSlice = isolatedAuthRealtimeEffect.slice(firstChannelPos, walletChannelPos);
    const bookingsPayloadIdx = bookingsCallbackSlice.indexOf("(payload) => {");
    assert.ok(bookingsPayloadIdx > -1, "Bookings realtime callback must exist");
    const afterBookingsPayload = bookingsCallbackSlice.slice(bookingsPayloadIdx, bookingsPayloadIdx + 120);
    assert.match(afterBookingsPayload, /\(payload\)\s*=>\s*\{\s*if\s*\(!active\)\s*return;/, "Bookings Realtime callback must start with if (!active) return;");

    // Wallets Realtime callback check
    const walletsCallbackSlice = isolatedAuthRealtimeEffect.slice(walletChannelPos, pollIntervalPos);
    const walletsPayloadIdx = walletsCallbackSlice.indexOf("(payload) => {");
    assert.ok(walletsPayloadIdx > -1, "Wallets realtime callback must exist");
    const afterWalletsPayload = walletsCallbackSlice.slice(walletsPayloadIdx, walletsPayloadIdx + 120);
    assert.match(afterWalletsPayload, /\(payload\)\s*=>\s*\{\s*if\s*\(!active\)\s*return;/, "Wallets Realtime callback must start with if (!active) return;");

    // Authenticated 3.5s polling check
    const pollSlice = isolatedAuthRealtimeEffect.slice(pollIntervalPos, cleanupReturnPos);
    assert.match(pollSlice, /setInterval\(async\s*\(\)\s*=>\s*\{\s*if\s*\(!active\)\s*return;/, "Polling callback must check if (!active) return; before starting request");

    const awaitFetchIdx = pollSlice.indexOf("await fetchBookingsAction(");
    assert.ok(awaitFetchIdx > -1, "Polling must await fetchBookingsAction");
    const afterAwaitFetch = pollSlice.slice(awaitFetchIdx, awaitFetchIdx + 180);
    assert.match(afterAwaitFetch, /await fetchBookingsAction\([\s\S]+?\);\s*if\s*\(!active\)\s*return;/, "Polling must check if (!active) return; immediately after await fetchBookingsAction");

    const afterAwaitActiveGuardPos = pollSlice.indexOf("if (!active) return;", awaitFetchIdx);
    const pollSetItemsPos = pollSlice.indexOf("setItems(", awaitFetchIdx);
    const pollKnownIdsPos = pollSlice.indexOf("knownBookingIds.current.add", awaitFetchIdx);
    const pollPlaySoundPos = pollSlice.indexOf("playTennisHitSound()", awaitFetchIdx);
    const pollHighlightPos = pollSlice.indexOf("setHighlightedVoiceBookings(", awaitFetchIdx);

    assert.ok(afterAwaitActiveGuardPos < pollSetItemsPos, "Delayed polling result must be blocked by if (!active) return before setItems");
    assert.ok(afterAwaitActiveGuardPos < pollKnownIdsPos, "Delayed polling result must be blocked before knownBookingIds update");
    assert.ok(afterAwaitActiveGuardPos < pollPlaySoundPos, "Delayed polling result must be blocked before playTennisHitSound");
    assert.ok(afterAwaitActiveGuardPos < pollHighlightPos, "Delayed polling result must be blocked before setHighlightedVoiceBookings");

    // Wallet async callbacks check inside authenticated effect
    const walletThenMatches = [...isolatedAuthRealtimeEffect.matchAll(/getWalletAction\(\)\.then\(\([a-zA-Z0-9_]+\)\s*=>\s*\{\s*if\s*\(!active\)\s*return;/g)];
    const totalWalletThens = [...isolatedAuthRealtimeEffect.matchAll(/getWalletAction\(\)\.then\(/g)];
    assert.equal(totalWalletThens.length, 2, "Expected 2 getWalletAction().then(...) calls in authenticated effect");
    assert.equal(walletThenMatches.length, 2, "All getWalletAction().then(...) callbacks in authenticated effect must guard with if (!active) return; before state updates");

    // f & g) BookingCalendar load and anonymous polling
    const bookCal = fs.readFileSync(path.join(__dirname, "components/bookings/BookingCalendar.tsx"), "utf-8");
    const bookLoadIndex = bookCal.indexOf("async function loadLiveData()");
    assert.ok(bookLoadIndex > -1);
    const bookLoadSlice = bookCal.slice(bookLoadIndex, bookLoadIndex + 1000);
    assert.ok(bookLoadSlice.includes("fetchPublicAvailabilityAction"), "BookingCalendar loadLiveData must call fetchPublicAvailabilityAction for anonymous");
    assert.ok(bookLoadSlice.includes("fetchBookingsAction"), "BookingCalendar loadLiveData must call fetchBookingsAction for authenticated");

    const bookAnonPollIndex = bookCal.indexOf("Bezpečný polling pre anonymného návštevníka každých 30 sekúnd");
    assert.ok(bookAnonPollIndex > -1);
    const bookAnonPollSlice = bookCal.slice(bookAnonPollIndex, bookAnonPollIndex + 1200);
    assert.ok(bookAnonPollSlice.includes("if (currentUser) return;"), "BookingCalendar polling must return if currentUser");
    assert.ok(bookAnonPollSlice.includes("fetchPublicAvailabilityAction"), "BookingCalendar polling must call fetchPublicAvailabilityAction");
    assert.equal(bookAnonPollSlice.includes("fetchBookingsAction"), false, "BookingCalendar polling must not call fetchBookingsAction");
    assert.ok(bookAnonPollSlice.includes("30_000"), "BookingCalendar polling must be 30 seconds");
    assert.ok(bookAnonPollSlice.includes("isFetching"), "BookingCalendar polling must guard against request overlap");
    assert.ok(bookAnonPollSlice.includes("clearInterval"), "BookingCalendar polling must clear interval on unmount");

    // h) BookingCalendar Realtime guard
    const bookRealtimeIndex = bookCal.indexOf('channel("bookings-realtime")');
    assert.ok(bookRealtimeIndex > -1);
    const beforeBookRealtime = bookCal.slice(bookRealtimeIndex - 200, bookRealtimeIndex);
    assert.match(beforeBookRealtime, /if\s*\(!currentUser\)\s*\{\s*return;\s*\}/, "BookingCalendar Realtime must return if !currentUser before channel");
});

// 6. SOURCE-CONTRACT TEST: Ochrana public slotov pred management akciami
test("SOURCE-CONTRACT: Protection of public slots against management actions in calendar rendering", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const newCal = fs.readFileSync(path.join(__dirname, "components/newbookings/NewBookingsCalendar.tsx"), "utf-8");
    const bookCal = fs.readFileSync(path.join(__dirname, "components/bookings/BookingCalendar.tsx"), "utf-8");

    // V NewBookingsCalendar: nájdi render vetvu v JSX pre item.kind === "public-occupied"
    const newCalRenderMarker = 'dayBookings.filter((item) => (item.kind === "public-occupied"';
    const markerIdx = newCal.indexOf(newCalRenderMarker);
    assert.ok(markerIdx > -1, "Marker for calendar items rendering must exist in NewBookingsCalendar");
    const newCalPublicRenderIdx = newCal.indexOf('if (item.kind === "public-occupied")', markerIdx);
    assert.ok(newCalPublicRenderIdx > -1, "NewBookingsCalendar must have explicit item.kind === 'public-occupied' check in render");
    const newCalPrivateRenderIdx = newCal.indexOf('const booking = item.booking;', newCalPublicRenderIdx);
    assert.ok(newCalPrivateRenderIdx > newCalPublicRenderIdx, "Private booking render must follow public render");

    const newCalPublicBranch = newCal.slice(newCalPublicRenderIdx, newCalPrivateRenderIdx);
    assert.equal(newCalPublicBranch.includes("deleteBookingAction"), false);
    assert.equal(newCalPublicBranch.includes("rescheduleBookingAction"), false);
    assert.equal(newCalPublicBranch.includes("setDetail("), false);
    assert.equal(newCalPublicBranch.includes("setDeleting("), false);
    assert.equal(newCalPublicBranch.includes("booking.id"), false);

    // V BookingCalendar: nájdi render vetvu pre item.kind === "public-occupied"
    const bookCalPublicRenderIdx = bookCal.indexOf('if (item.kind === "public-occupied")');
    assert.ok(bookCalPublicRenderIdx > -1, "BookingCalendar must have explicit item.kind === 'public-occupied' check");
    const bookCalPrivateRenderIdx = bookCal.indexOf('const booking = item.booking;', bookCalPublicRenderIdx);
    assert.ok(bookCalPrivateRenderIdx > bookCalPublicRenderIdx, "Private booking render must follow public render");

    const bookCalPublicBranch = bookCal.slice(bookCalPublicRenderIdx, bookCalPrivateRenderIdx);
    assert.equal(bookCalPublicBranch.includes("deleteBookingAction"), false);
    assert.equal(bookCalPublicBranch.includes("setInfoModalBooking("), false);
    assert.equal(bookCalPublicBranch.includes("setConfirmModal("), false);
    assert.equal(bookCalPublicBranch.includes("booking.id"), false);
});
