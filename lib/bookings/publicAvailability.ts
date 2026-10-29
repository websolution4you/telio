export type PublicAvailabilitySlot = {
    courtId: string;
    start: string;
    end: string;
    status: "occupied";
};

export type PublicAvailabilityResult =
    | {
        success: true;
        slots: PublicAvailabilitySlot[];
    }
    | {
        success: false;
        code: "INVALID_RANGE" | "RANGE_TOO_LARGE" | "DB_ERROR";
        error: string;
    };

export type PublicCalendarItem = {
    kind: "public-occupied";
    key: string;
    courtId: string;
    start: string;
    end: string;
    status: "occupied";
};

import type { Booking } from "./mockBookings";

export type PrivateBookingItem = {
    kind: "booking";
    booking: Booking;
};

export type CalendarItem = PublicCalendarItem | PrivateBookingItem;

export function toPublicCalendarItem(slot: PublicAvailabilitySlot): PublicCalendarItem {
    return {
        kind: "public-occupied",
        key: `public:${slot.courtId}:${slot.start}:${slot.end}`,
        courtId: slot.courtId,
        start: slot.start,
        end: slot.end,
        status: "occupied",
    };
}

const MAX_PUBLIC_AVAILABILITY_RANGE_MS = 14 * 24 * 60 * 60 * 1000;
const ALLOWED_PUBLIC_STATUSES = new Set(["confirmed", "pending", "blocked"]);

export function validatePublicAvailabilityRange(
    startDateIso: unknown,
    endDateIso: unknown
): { valid: true; start: string; end: string } | { valid: false; code: "INVALID_RANGE" | "RANGE_TOO_LARGE"; error: string } {
    if (typeof startDateIso !== "string" || typeof endDateIso !== "string") {
        return { valid: false, code: "INVALID_RANGE", error: "Neplatný formát dátumu." };
    }

    if (startDateIso.length > 100 || endDateIso.length > 100) {
        return { valid: false, code: "INVALID_RANGE", error: "Dátumový reťazec prekročil povolenú dĺžku." };
    }

    const startMs = Date.parse(startDateIso);
    const endMs = Date.parse(endDateIso);

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
        return { valid: false, code: "INVALID_RANGE", error: "Neplatný formát dátumu." };
    }

    if (startMs >= endMs) {
        return { valid: false, code: "INVALID_RANGE", error: "Začiatok intervalu musí byť pred koncom." };
    }

    if (endMs - startMs > MAX_PUBLIC_AVAILABILITY_RANGE_MS) {
        return { valid: false, code: "RANGE_TOO_LARGE", error: "Maximálny povolený rozsah dostupnosti je 14 dní." };
    }

    return {
        valid: true,
        start: new Date(startMs).toISOString(),
        end: new Date(endMs).toISOString(),
    };
}

export function mapPublicAvailabilityRows(
    rows: Array<{ court_id?: string | null; start_at?: string | null; end_at?: string | null; status?: string | null }> | null | undefined
): { slots: PublicAvailabilitySlot[]; skippedCount: number } {
    const slots: PublicAvailabilitySlot[] = [];
    let skippedCount = 0;

    for (const row of rows || []) {
        const rawCourtId = typeof row.court_id === "string" ? row.court_id.trim() : "";
        const rawStart = typeof row.start_at === "string" ? row.start_at.trim() : "";
        const rawEnd = typeof row.end_at === "string" ? row.end_at.trim() : "";
        const rawStatus = typeof row.status === "string" ? row.status.trim() : "";

        // Fail-closed checks:
        // 1. court_id must be a non-empty string
        if (!rawCourtId) {
            skippedCount++;
            continue;
        }

        // 2. status must be one of the explicitly allowed public statuses
        if (!ALLOWED_PUBLIC_STATUSES.has(rawStatus)) {
            skippedCount++;
            continue;
        }

        // 3. start_at and end_at must be valid parsable timestamps
        const startMs = Date.parse(rawStart);
        const endMs = Date.parse(rawEnd);
        if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
            skippedCount++;
            continue;
        }

        // 4. start_at must be strictly before end_at
        if (startMs >= endMs) {
            skippedCount++;
            continue;
        }

        slots.push({
            courtId: rawCourtId,
            start: new Date(startMs).toISOString(),
            end: new Date(endMs).toISOString(),
            status: "occupied",
        });
    }

    return { slots, skippedCount };
}
