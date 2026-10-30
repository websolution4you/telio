import type { Booking, BookingStatus, BookingSubSlot } from "./mockBookings";

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

export type OwnBookingDto = {
    id: string;
    courtId: string;
    start: string;
    end: string;
    status: BookingStatus;
    title: string;
    customerName: string;
    phone?: string;
    priceEur?: number;
    multisportCardsCount?: number;
    isRescheduled?: boolean;
    recurringGroupId?: string;
    clientPlayerName?: string;
};

export type StaffBookingDto = Booking;

export type OwnBookingCalendarItem = {
    kind: "own-booking";
    booking: OwnBookingDto;
};

export type StaffBookingCalendarItem = {
    kind: "staff-booking";
    booking: StaffBookingDto;
};

export type AuthenticatedCalendarItem =
    | PublicCalendarItem
    | OwnBookingCalendarItem
    | StaffBookingCalendarItem;

export type CalendarItem = AuthenticatedCalendarItem;

export type CalendarAccessMode = "restricted" | "staff";

export type AuthorizedCalendarItemsResult =
    | {
        success: true;
        accessMode: CalendarAccessMode;
        items: CalendarItem[];
    }
    | {
        success: false;
        code: "UNAUTHORIZED" | "FORBIDDEN" | "INVALID_RANGE" | "RANGE_TOO_LARGE" | "DB_ERROR";
        error: string;
    };

export type SeriesBookingsResult =
    | {
        success: true;
        accessMode: CalendarAccessMode;
        items: Array<OwnBookingCalendarItem | StaffBookingCalendarItem>;
    }
    | {
        success: false;
        code?: "UNAUTHORIZED" | "FORBIDDEN" | "INVALID_INPUT" | "DB_ERROR";
        error: string;
    };

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

export type CreatedBookingOwnInput = {
    id: string;
    courtId: string;
    start: string;
    end: string;
    status: BookingStatus;
    title: string;
    customerName: string;
    phone?: string;
    priceEur?: number;
    multisportCardsCount?: number;
    isRescheduled?: boolean;
    recurringGroupId?: string;
    clientPlayerName?: string;
};

/**
 * Čistý helper pre mapovanie návratového objektu z createBookingAction / createRecurringBookingAction
 * na OwnBookingDto. Explicitne prenesie iba povolené own polia a nikdy neprenesie
 * user_id, userRole, userCardNumber, adminBlockType, subSlots ani source.
 */
export function mapCreatedBookingToOwnBookingDto(b: CreatedBookingOwnInput): OwnBookingDto {
    const dto: OwnBookingDto = {
        id: b.id,
        courtId: b.courtId,
        start: b.start,
        end: b.end,
        status: b.status,
        title: b.title,
        customerName: b.customerName,
    };

    if (typeof b.phone === "string" && b.phone.trim()) {
        dto.phone = b.phone.trim();
    }
    if (typeof b.priceEur === "number" && Number.isFinite(b.priceEur)) {
        dto.priceEur = b.priceEur;
    }
    if (typeof b.multisportCardsCount === "number" && Number.isFinite(b.multisportCardsCount) && b.multisportCardsCount > 0) {
        dto.multisportCardsCount = b.multisportCardsCount;
    }
    if (typeof b.isRescheduled === "boolean" && b.isRescheduled) {
        dto.isRescheduled = true;
    }
    if (typeof b.recurringGroupId === "string" && isValidRecurringGroupId(b.recurringGroupId)) {
        dto.recurringGroupId = b.recurringGroupId;
    }
    if (typeof b.clientPlayerName === "string" && b.clientPlayerName.trim()) {
        dto.clientPlayerName = b.clientPlayerName.trim();
    }

    return dto;
}

export function toOwnBookingCalendarItem(booking: OwnBookingDto): OwnBookingCalendarItem {
    return {
        kind: "own-booking",
        booking,
    };
}

export function toStaffBookingCalendarItem(booking: StaffBookingDto): StaffBookingCalendarItem {
    return {
        kind: "staff-booking",
        booking,
    };
}

const MAX_PUBLIC_AVAILABILITY_RANGE_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_RESTRICTED_CALENDAR_RANGE_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_STAFF_CALENDAR_RANGE_MS = 45 * 24 * 60 * 60 * 1000;

const ALLOWED_PUBLIC_STATUSES = new Set(["confirmed", "pending", "blocked"]);
const ALLOWED_OWN_STATUSES = new Set<BookingStatus>(["confirmed", "pending", "blocked", "cancelled"]);
const ALLOWED_COURT_IDS = new Set<string>([
    "badminton-1", "badminton-2", "badminton-3", "badminton-4", "badminton-5",
    "badminton-6", "badminton-7", "badminton-8", "badminton-9", "badminton-10",
    "squash-1", "squash-2", "squash-3", "squash-4",
    "tennis-1", "tennis-2", "tennis-3", "tennis-4", "tennis-5", "tennis-6",
    "tennis-clay-1", "tennis-clay-2", "tennis-clay-10", "tennis-clay-11",
]);

export function isPrivilegedReadRole(role: unknown): role is "admin" | "ntc_team" {
    return role === "admin" || role === "ntc_team";
}

export function isRestrictedReadRole(role: unknown): role is "user" | "trainer" {
    return role === "user" || role === "trainer";
}

export function resolveServerAccessMode(role: unknown): CalendarAccessMode | null {
    if (isPrivilegedReadRole(role)) return "staff";
    if (isRestrictedReadRole(role)) return "restricted";
    return null;
}

export function validatePublicAvailabilityRange(
    startDateIso: unknown,
    endDateIso: unknown
): { valid: true; start: string; end: string } | { valid: false; code: "INVALID_RANGE" | "RANGE_TOO_LARGE"; error: string } {
    return validateCalendarRangeByAccessMode(startDateIso, endDateIso, "restricted");
}

export function validateCalendarRangeByAccessMode(
    startDateIso: unknown,
    endDateIso: unknown,
    accessMode: CalendarAccessMode
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

    const maxRangeMs = accessMode === "staff" ? MAX_STAFF_CALENDAR_RANGE_MS : MAX_RESTRICTED_CALENDAR_RANGE_MS;
    const maxDays = accessMode === "staff" ? 45 : 14;

    if (endMs - startMs > maxRangeMs) {
        return {
            valid: false,
            code: "RANGE_TOO_LARGE",
            error: `Maximálny povolený rozsah dostupnosti je ${maxDays} dní.`,
        };
    }

    return {
        valid: true,
        start: new Date(startMs).toISOString(),
        end: new Date(endMs).toISOString(),
    };
}

/**
 * Bezpečne extrahuje aplikačný courtId zo stĺpca court_id alebo (pre historické/produkčné záznamy s court_id = null)
 * výhradne z poľa notes.courtId na serveri. Výsledný courtId musí byť v allowliste známych kurtov.
 * Nikdy nevracia fallback "badminton-1" ani žiadne iné pole z notes.
 */
export function extractPublicCourtId(
    rawCourtId: unknown,
    rawNotes?: unknown
): string | null {
    const directCourtId = typeof rawCourtId === "string" ? rawCourtId.trim() : "";
    if (directCourtId && ALLOWED_COURT_IDS.has(directCourtId)) {
        return directCourtId;
    }

    if (rawNotes !== undefined && rawNotes !== null) {
        try {
            const parsed =
                typeof rawNotes === "string"
                    ? JSON.parse(rawNotes)
                    : typeof rawNotes === "object"
                        ? rawNotes
                        : null;
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                const notesCourtId =
                    typeof (parsed as Record<string, unknown>).courtId === "string"
                        ? ((parsed as Record<string, unknown>).courtId as string).trim()
                        : "";
                if (notesCourtId && ALLOWED_COURT_IDS.has(notesCourtId)) {
                    return notesCourtId;
                }
            }
        } catch {
            return null;
        }
    }

    return null;
}

export function mapPublicAvailabilityRows(
    rows: Array<{ court_id?: string | null; start_at?: string | null; end_at?: string | null; status?: string | null; notes?: unknown }> | null | undefined
): { slots: PublicAvailabilitySlot[]; skippedCount: number } {
    const slots: PublicAvailabilitySlot[] = [];
    let skippedCount = 0;

    for (const row of rows || []) {
        const resolvedCourtId = extractPublicCourtId(row.court_id, row.notes);
        const rawStart = typeof row.start_at === "string" ? row.start_at.trim() : "";
        const rawEnd = typeof row.end_at === "string" ? row.end_at.trim() : "";
        const rawStatus = typeof row.status === "string" ? row.status.trim() : "";

        // Fail-closed checks:
        // 1. court_id must be a non-empty string
        if (!resolvedCourtId) {
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
            courtId: resolvedCourtId,
            start: new Date(startMs).toISOString(),
            end: new Date(endMs).toISOString(),
            status: "occupied",
        });
    }

    return { slots, skippedCount };
}

/**
 * Prísny mapper pre restricted occupancy query: vyžaduje platný courtId v allowliste (extractPublicCourtId),
 * nikdy nerobí fallback na neznámy kurt a vracia výhradne PublicCalendarItem[].
 */
export function mapRestrictedOccupancyRowsToPublicItems(
    rows: Array<{ court_id?: string | null; start_at?: string | null; end_at?: string | null; status?: string | null; notes?: unknown }> | null | undefined
): { items: PublicCalendarItem[]; skippedCount: number } {
    const items: PublicCalendarItem[] = [];
    let skippedCount = 0;

    for (const row of rows || []) {
        const courtId = extractPublicCourtId(row.court_id, row.notes);
        if (!courtId) {
            skippedCount++;
            continue;
        }

        const rawStatus = typeof row.status === "string" ? row.status.trim() : "";
        if (!ALLOWED_PUBLIC_STATUSES.has(rawStatus)) {
            skippedCount++;
            continue;
        }

        const rawStart = typeof row.start_at === "string" ? row.start_at.trim() : "";
        const rawEnd = typeof row.end_at === "string" ? row.end_at.trim() : "";
        const startMs = Date.parse(rawStart);
        const endMs = Date.parse(rawEnd);
        if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs >= endMs) {
            skippedCount++;
            continue;
        }

        const startIso = new Date(startMs).toISOString();
        const endIso = new Date(endMs).toISOString();

        items.push(
            toPublicCalendarItem({
                courtId,
                start: startIso,
                end: endIso,
                status: "occupied",
            })
        );
    }

    return { items, skippedCount };
}

/**
 * Validuje formát recurringGroupId generovaného produkčným kódom (`rec_${crypto.randomUUID()}`).
 * Odmieta prázdne reťazce, nadmernú dĺžku, riadiace znaky a SQL/PostgREST wildcardy `%` a `_` mimo presného prefixu `rec_`.
 */
const RECURRING_GROUP_ID_REGEX = /^rec_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidRecurringGroupId(value: unknown): value is string {
    if (typeof value !== "string") return false;
    if (value.length < 10 || value.length > 64) return false;
    if (value.includes("%") || /[\x00-\x1f\x7f]/.test(value)) return false;
    return RECURRING_GROUP_ID_REGEX.test(value);
}

export function extractValidRecurringGroupIdFromNotes(rawNotes: unknown): string | undefined {
    if (rawNotes === undefined || rawNotes === null) return undefined;
    try {
        const parsed =
            typeof rawNotes === "string"
                ? JSON.parse(rawNotes)
                : typeof rawNotes === "object"
                    ? rawNotes
                    : null;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
        const candidate = (parsed as Record<string, unknown>).recurringGroupId;
        return isValidRecurringGroupId(candidate) ? candidate : undefined;
    } catch {
        return undefined;
    }
}

export type OwnBookingRowInput = {
    id?: string | null;
    court_id?: string | null;
    start_at?: string | null;
    end_at?: string | null;
    status?: string | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    price_eur?: number | string | null;
    notes?: unknown;
};

/**
 * Bezpečne mapuje riadok vlastnej rezervácie (ktorý už prešiel DB filtrom `.eq("user_id", session.userId)`)
 * na `OwnBookingCalendarItem` (`kind: "own-booking"`).
 * Neobsahuje `user_id`, `userRole`, `userCardNumber`, `adminBlockType`, `subSlots`, `source` ani surový `notes` JSON.
 */
export function mapOwnBookingRowToCalendarItem(
    row: OwnBookingRowInput | null | undefined,
    fallbackOwnerName?: string,
    includeCancelled = false
): OwnBookingCalendarItem | null {
    if (!row || typeof row.id !== "string" || !row.id.trim()) {
        return null;
    }

    const rawStatus = typeof row.status === "string" ? row.status.trim() : "";
    if (!ALLOWED_OWN_STATUSES.has(rawStatus as BookingStatus)) {
        return null;
    }
    if (!includeCancelled && rawStatus === "cancelled") {
        return null;
    }

    const rawStart = typeof row.start_at === "string" ? row.start_at.trim() : "";
    const rawEnd = typeof row.end_at === "string" ? row.end_at.trim() : "";
    const startMs = Date.parse(rawStart);
    const endMs = Date.parse(rawEnd);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs >= endMs) {
        return null;
    }

    const courtId = extractPublicCourtId(row.court_id, row.notes);
    if (!courtId) {
        return null;
    }

    let noteText = "";
    let multisportCardsCount = 0;
    let isRescheduled = false;
    let recurringGroupId: string | undefined;
    let clientPlayerName: string | undefined;

    if (row.notes !== undefined && row.notes !== null) {
        try {
            const parsed =
                typeof row.notes === "string"
                    ? JSON.parse(row.notes)
                    : typeof row.notes === "object"
                        ? row.notes
                        : null;
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                const obj = parsed as Record<string, unknown>;
                if (typeof obj.notes === "string" && obj.notes.trim()) {
                    noteText = obj.notes.trim();
                }
                if (typeof obj.multisportCardsCount === "number" && Number.isFinite(obj.multisportCardsCount)) {
                    multisportCardsCount = Math.min(2, Math.max(0, Math.floor(obj.multisportCardsCount)));
                } else if (typeof obj.multisportCardsCount === "string" && obj.multisportCardsCount.trim() !== "") {
                    const num = Number(obj.multisportCardsCount);
                    if (Number.isFinite(num)) {
                        multisportCardsCount = Math.min(2, Math.max(0, Math.floor(num)));
                    }
                }
                if (Boolean(obj.rescheduled) || Boolean(obj.isRescheduled)) {
                    isRescheduled = true;
                }
                if (isValidRecurringGroupId(obj.recurringGroupId)) {
                    recurringGroupId = obj.recurringGroupId;
                }
                if (typeof obj.clientPlayerName === "string" && obj.clientPlayerName.trim()) {
                    clientPlayerName = obj.clientPlayerName.trim();
                }
            }
        } catch {
            // Fail-closed pre poškodený notes JSON: nepoužijeme žiadne voliteľné polia z notes
        }
    }

    const rowCustomerName = typeof row.customer_name === "string" ? row.customer_name.trim() : "";
    const customerName = clientPlayerName || rowCustomerName || (fallbackOwnerName ? fallbackOwnerName.trim() : "") || "Rezervácia";
    const title = noteText || rowCustomerName || "Rezervácia";
    const phone = typeof row.customer_phone === "string" && row.customer_phone.trim() ? row.customer_phone.trim() : undefined;

    let priceEur: number | undefined;
    if (row.price_eur !== null && row.price_eur !== undefined && row.price_eur !== "") {
        const parsedPrice = Number(row.price_eur);
        if (Number.isFinite(parsedPrice)) {
            priceEur = parsedPrice;
        }
    }

    const dto: OwnBookingDto = {
        id: row.id.trim(),
        courtId,
        start: new Date(startMs).toISOString(),
        end: new Date(endMs).toISOString(),
        status: rawStatus as BookingStatus,
        title,
        customerName,
    };

    if (phone !== undefined) dto.phone = phone;
    if (priceEur !== undefined) dto.priceEur = priceEur;
    if (multisportCardsCount > 0) dto.multisportCardsCount = multisportCardsCount;
    if (isRescheduled) dto.isRescheduled = true;
    if (recurringGroupId !== undefined) dto.recurringGroupId = recurringGroupId;
    if (clientPlayerName !== undefined) dto.clientPlayerName = clientPlayerName;

    return toOwnBookingCalendarItem(dto);
}

export type StaffBookingRowInput = {
    id?: string | null;
    court_id?: string | null;
    start_at?: string | null;
    end_at?: string | null;
    status?: string | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    user_id?: string | null;
    price_eur?: number | string | null;
    notes?: unknown;
};

export type StaffUserMeta = {
    role: string;
    cardNumber?: string;
    name?: string;
};

/**
 * Mapuje riadok rezervácie pre privilegované roly (`admin`, `ntc_team`) na `StaffBookingCalendarItem` (`kind: "staff-booking"`).
 */
export function mapStaffBookingRowToCalendarItem(
    row: StaffBookingRowInput | null | undefined,
    userMap?: ReadonlyMap<string, StaffUserMeta>,
    includeCancelled = false
): StaffBookingCalendarItem | null {
    if (!row || typeof row.id !== "string" || !row.id.trim()) {
        return null;
    }

    const rawStatus = typeof row.status === "string" ? row.status.trim() : "";
    if (!ALLOWED_OWN_STATUSES.has(rawStatus as BookingStatus)) {
        return null;
    }
    if (!includeCancelled && rawStatus === "cancelled") {
        return null;
    }

    const rawStart = typeof row.start_at === "string" ? row.start_at.trim() : "";
    const rawEnd = typeof row.end_at === "string" ? row.end_at.trim() : "";
    const startMs = Date.parse(rawStart);
    const endMs = Date.parse(rawEnd);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs >= endMs) {
        return null;
    }

    const courtId = extractPublicCourtId(row.court_id, row.notes);
    if (!courtId) {
        return null;
    }

    let notesObj: {
        source?: string;
        notes?: string;
        multisportCardsCount?: number;
        rescheduled?: boolean;
        isRescheduled?: boolean;
        recurringGroupId?: string;
        clientPlayerName?: string;
        adminBlockType?: string;
        subSlots?: BookingSubSlot[];
    } = {
        source: "web",
        notes: "",
        multisportCardsCount: 0,
        rescheduled: false,
    };

    if (row.notes !== undefined && row.notes !== null) {
        try {
            const parsed =
                typeof row.notes === "string"
                    ? JSON.parse(row.notes)
                    : typeof row.notes === "object"
                        ? row.notes
                        : null;
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                notesObj = { ...notesObj, ...(parsed as Record<string, unknown>) };
            }
        } catch {
            // keep defaults
        }
    }

    const userId = typeof row.user_id === "string" && row.user_id.trim() ? row.user_id.trim() : undefined;
    const userMeta = userId && userMap ? userMap.get(userId) : undefined;
    const rowCustomerName = typeof row.customer_name === "string" ? row.customer_name.trim() : "";

    const isRowAdminOrBlock =
        notesObj.source === "admin" ||
        userMeta?.role === "admin" ||
        rawStatus === "blocked" ||
        Boolean(rowCustomerName && rowCustomerName.toLowerCase().includes("údržba"));

    const clientPlayerName =
        typeof notesObj.clientPlayerName === "string" && notesObj.clientPlayerName.trim()
            ? notesObj.clientPlayerName.trim()
            : undefined;

    let finalCustomerName = clientPlayerName || rowCustomerName || userMeta?.name || "";
    if (isRowAdminOrBlock && !clientPlayerName) {
        if (!finalCustomerName || finalCustomerName === "Admin User") {
            finalCustomerName = "Údržba kurtov";
        }
    }
    if (!finalCustomerName) {
        finalCustomerName = "Rezervácia";
    }

    const noteTitle = typeof notesObj.notes === "string" ? notesObj.notes.trim() : "";
    const title =
        isRowAdminOrBlock && (!noteTitle || noteTitle === "Údržba / Blokovanie" || noteTitle === "Údržba")
            ? (finalCustomerName || "Údržba kurtov")
            : (noteTitle || rowCustomerName || "Rezervácia");

    const allowedSources = new Set(["voice-assistant", "web", "admin", "google-calendar"]);
    const rawSource = typeof notesObj.source === "string" && allowedSources.has(notesObj.source)
        ? (notesObj.source as StaffBookingDto["source"])
        : "web";

    const recurringGroupId = isValidRecurringGroupId(notesObj.recurringGroupId)
        ? notesObj.recurringGroupId
        : undefined;

    const cleanSubSlots: BookingSubSlot[] | undefined = Array.isArray(notesObj.subSlots)
        ? notesObj.subSlots
            .filter(
                (s): s is BookingSubSlot =>
                    Boolean(s) &&
                    typeof s.from === "string" &&
                    typeof s.to === "string" &&
                    typeof s.player === "string"
            )
            .map((s) => ({ from: s.from, to: s.to, player: s.player }))
        : undefined;

    const dto: StaffBookingDto = {
        id: row.id.trim(),
        courtId,
        title,
        customerName: finalCustomerName,
        phone: typeof row.customer_phone === "string" && row.customer_phone.trim() ? row.customer_phone.trim() : undefined,
        start: new Date(startMs).toISOString(),
        end: new Date(endMs).toISOString(),
        status: rawStatus as BookingStatus,
        source: rawSource,
        user_id: userId,
        userRole: isRowAdminOrBlock ? "admin" : (userMeta?.role || "user"),
        userCardNumber: userMeta?.cardNumber,
        multisportCardsCount: Number(notesObj.multisportCardsCount || 0),
        priceEur: row.price_eur !== null && row.price_eur !== undefined && row.price_eur !== "" ? Number(row.price_eur) : undefined,
        isRescheduled: Boolean(notesObj.rescheduled || notesObj.isRescheduled),
        recurringGroupId,
        clientPlayerName,
        adminBlockType: typeof notesObj.adminBlockType === "string" && notesObj.adminBlockType.trim() ? notesObj.adminBlockType.trim() : undefined,
        subSlots: cleanSubSlots,
    };

    return toStaffBookingCalendarItem(dto);
}

/**
 * Spojí anonymnú obsadenosť (`PublicCalendarItem[]`) a vlastné rezervácie (`OwnBookingCalendarItem[]`)
 * pre restricted roly (`user`, `trainer`).
 * Deduplikácia používa výhradne normalizovaný časovo-kurtový kľúč `${courtId}:${startIso}:${endIso}`,
 * takže vlastná rezervácia sa nikdy nevráti súčasne ako `public-occupied` slot a nepoužije sa žiadne cudzie booking ID.
 */
export function mergeRestrictedCalendarItems(
    publicItems: PublicCalendarItem[],
    ownItems: OwnBookingCalendarItem[]
): Array<PublicCalendarItem | OwnBookingCalendarItem> {
    const ownSlotKeys = new Set<string>();
    for (const ownItem of ownItems) {
        const key = `${ownItem.booking.courtId}:${new Date(ownItem.booking.start).toISOString()}:${new Date(ownItem.booking.end).toISOString()}`;
        ownSlotKeys.add(key);
    }

    const seenPublicKeys = new Set<string>();
    const filteredPublic: PublicCalendarItem[] = [];

    for (const pub of publicItems) {
        const slotKey = `${pub.courtId}:${new Date(pub.start).toISOString()}:${new Date(pub.end).toISOString()}`;
        if (ownSlotKeys.has(slotKey)) {
            continue;
        }
        if (seenPublicKeys.has(slotKey)) {
            continue;
        }
        seenPublicKeys.add(slotKey);
        filteredPublic.push(pub);
    }

    return [...filteredPublic, ...ownItems];
}
