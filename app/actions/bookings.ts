"use server";

import { getCoreDb, getCoreServiceDb } from "@/lib/server/supabase";
import { 
    createCalendarEvent, 
    deleteCalendarEvent, 
    listCalendarEvents 
} from "@/lib/server/calendarAdapter";
import { revalidatePath } from "next/cache";
import { getSession, type BookingRole } from "@/lib/auth/bookingAuth";
import { walletEnabledForUser } from "@/lib/server/wallet";
import { calculateNtcBookingPrice } from "@/lib/bookings/pricing";
import { getActivePricelist } from "@/app/actions/pricelists";
import { createBratislavaIso, getBratislavaDateKey, getBratislavaDateParts, getCourtOperatingLimitMinutes, isAllowedBookingDuration } from "@/lib/bookings/rolePolicy";
import { courts as ntcCourts, type SportType, type BookingSubSlot } from "@/lib/bookings/mockBookings";
import { logActivity } from "@/lib/server/auditLog";
import {
    type PublicAvailabilityResult,
    type AuthorizedCalendarItemsResult,
    type SeriesBookingsResult,
    type CalendarAccessMode,
    type StaffUserMeta,
    type OwnBookingCalendarItem,
    type StaffBookingCalendarItem,
    validatePublicAvailabilityRange,
    validateCalendarRangeByAccessMode,
    resolveServerAccessMode,
    mapPublicAvailabilityRows,
    mapRestrictedOccupancyRowsToPublicItems,
    mapOwnBookingRowToCalendarItem,
    mapStaffBookingRowToCalendarItem,
    mergeRestrictedCalendarItems,
    isValidRecurringGroupId,
    extractValidRecurringGroupIdFromNotes,
} from "@/lib/bookings/publicAvailability";



const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "595cbb6c-1019-41ae-b1c2-a60c13c8dcdf";

type VerifiedBookingCaller = {
    userId: string;
    role: BookingRole;
    accessMode: CalendarAccessMode;
    name: string;
};

/**
 * Server-only helper: načíta session a čerstvý riadok z `booking_users` podľa `session.userId`.
 * Nepoužíva `session.role` na autorizačné rozhodnutie. Neznáme roly alebo neexistujúci DB riadok odmietne fail-closed.
 */
async function getVerifiedBookingCaller(): Promise<
    | { ok: true; caller: VerifiedBookingCaller }
    | { ok: false; code: "UNAUTHORIZED" | "FORBIDDEN"; error: string }
> {
    const session = await getSession();
    if (!session || !session.userId) {
        return {
            ok: false,
            code: "UNAUTHORIZED",
            error: "Pre načítanie detailov rezervácií sa musíte prihlásiť.",
        };
    }

    const serviceDb = getCoreServiceDb();
    const { data: userRow, error: userError } = await serviceDb
        .from("booking_users")
        .select("id, role, name")
        .eq("id", session.userId)
        .maybeSingle();

    if (userError || !userRow || !userRow.id) {
        return {
            ok: false,
            code: "UNAUTHORIZED",
            error: "Používateľský účet sa nepodarilo overiť.",
        };
    }

    const accessMode = resolveServerAccessMode(userRow.role);
    if (!accessMode) {
        return {
            ok: false,
            code: "FORBIDDEN",
            error: "Vaša rola nemá povolený prístup ku kalendáru.",
        };
    }

    return {
        ok: true,
        caller: {
            userId: userRow.id,
            role: userRow.role as BookingRole,
            accessMode,
            name: typeof userRow.name === "string" ? userRow.name : "",
        },
    };
}

// Helper to parse court ID and metadata from Google Calendar event description/summary
function parseGCalEvent(event: any) {
    const summary = event.summary || "";
    const description = event.description || "";
    
    // Default values
    let courtId = "";
    let customerName = "";
    let phone = "";
    let source: "web" | "admin" | "voice-assistant" | "google-calendar" = "google-calendar";
    let notes = "";
    let userId = "";

    // Parse structured description lines if they exist
    const cleanDesc = description.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
    const lines = cleanDesc.split(/\r?\n/);
    let hasStructuredLines = false;

    for (const line of lines) {
        const parts = line.split(":");
        if (parts.length >= 2) {
            const key = parts[0].trim().toLowerCase();
            const val = parts.slice(1).join(":").trim();
            
            if (key === "kurt id" || key === "court id" || key === "courtid" || key === "court") {
                courtId = val;
                hasStructuredLines = true;
            } else if (key === "zákazník" || key === "zakaznik" || key === "customer") {
                customerName = val;
                hasStructuredLines = true;
            } else if (key === "telefón" || key === "telefon" || key === "phone") {
                phone = val;
                hasStructuredLines = true;
            } else if (key === "kanál" || key === "kanal" || key === "source") {
                hasStructuredLines = true;
                if (val.includes("Web")) source = "web";
                else if (val.includes("Recepcia") || val.includes("admin")) source = "admin";
                else if (val.includes("Hlas") || val.includes("assistant") || val.includes("voice")) source = "voice-assistant";
            } else if (key === "poznámka" || key === "poznamka" || key === "notes") {
                notes = val;
                hasStructuredLines = true;
            } else if (key === "vlastník id" || key === "vlastnik id" || key === "user id" || key === "userid") {
                userId = val;
                hasStructuredLines = true;
            }
        }
    }

    // Fallbacks if not structured
    if (!courtId) {
        // Find court ID from description or summary using regex
        const courtPattern = /(badminton|squash|tennis|tennis-clay)-\d+/i;
        const descMatch = description.match(courtPattern);
        if (descMatch) {
            courtId = descMatch[0].toLowerCase();
        } else {
            const summaryMatch = summary.match(courtPattern);
            if (summaryMatch) {
                courtId = summaryMatch[0].toLowerCase();
            }
        }
    }

    if (!customerName) {
        // Fallback customer name from summary (e.g. "Rezervácia: Martin Novák" -> "Martin Novák")
        customerName = summary.replace(/^(Rezervácia|Booking|Taxi):\s*/i, "").trim() || "Zákazník";
    }

    // Determine status (blocked if it represents maintenance/admin blocks)
    let status: "confirmed" | "blocked" = "confirmed";
    if (summary.toLowerCase().includes("údržba") || summary.toLowerCase().includes("maintenance") || summary.toLowerCase().includes("blokovanie")) {
        status = "blocked";
    }

    return {
        id: event.id,
        courtId: courtId || "badminton-1", // Fallback court if not resolved
        title: notes || summary || "Rezervácia",
        customerName,
        phone: phone || undefined,
        start: event.start?.dateTime || event.start?.date || "",
        end: event.end?.dateTime || event.end?.date || "",
        status,
        source,
        user_id: userId || undefined
    };
}

async function loadStaffBookingItemsInRange(
    startIso: string,
    endIso: string
): Promise<StaffBookingCalendarItem[]> {
    const db = getCoreServiceDb();

    const { data, error } = await db
        .from("bookings")
        .select("id, court_id, start_at, end_at, status, customer_name, customer_phone, user_id, price_eur, notes")
        .eq("tenant_id", TENANT_ID)
        .neq("status", "cancelled")
        .gt("end_at", startIso)
        .lt("start_at", endIso)
        .order("start_at", { ascending: true });

    if (error) {
        throw new Error(`Database error: ${error.message}`);
    }

    const userIds = Array.from(new Set((data || []).map((r) => r.user_id).filter(Boolean))) as string[];
    const userMap = new Map<string, StaffUserMeta>();
    if (userIds.length > 0) {
        const { data: usersData } = await db
            .from("booking_users")
            .select("id, role, card_number, name")
            .in("id", userIds);
        if (usersData) {
            for (const u of usersData) {
                userMap.set(u.id, {
                    role: u.role,
                    cardNumber: u.card_number || undefined,
                    name: u.name,
                });
            }
        }
    }

    const staffItems: StaffBookingCalendarItem[] = [];
    for (const row of data || []) {
        const mapped = mapStaffBookingRowToCalendarItem(row, userMap, false);
        if (mapped) {
            staffItems.push(mapped);
        }
    }

    return staffItems;
}

export async function fetchAuthorizedCalendarItemsAction(
    startDateIso: string,
    endDateIso: string
): Promise<AuthorizedCalendarItemsResult> {
    try {
        const authResult = await getVerifiedBookingCaller();
        if (!authResult.ok) {
            return {
                success: false,
                code: authResult.code,
                error: authResult.error,
            };
        }

        const { caller } = authResult;
        const validation = validateCalendarRangeByAccessMode(startDateIso, endDateIso, caller.accessMode);
        if (!validation.valid) {
            return {
                success: false,
                code: validation.code,
                error: validation.error,
            };
        }

        if (caller.accessMode === "staff") {
            const staffItems = await loadStaffBookingItemsInRange(validation.start, validation.end);
            return {
                success: true,
                accessMode: "staff",
                items: staffItems,
            };
        }

        // Restricted vetva (`user`, `trainer`):
        // 1. Bezpečná obsadenosť všetkých aktívnych rezervácií v intervale (s Q.1 výnimkou pre serverovú extrakciu courtId z notes)
        const db = getCoreServiceDb();
        const [occupancyRes, ownRes] = await Promise.all([
            db
                .from("bookings")
                .select("court_id,start_at,end_at,status,notes")
                .eq("tenant_id", TENANT_ID)
                .in("status", ["confirmed", "pending", "blocked"])
                .gt("end_at", validation.start)
                .lt("start_at", validation.end),
            db
                .from("bookings")
                .select("id,court_id,start_at,end_at,status,customer_name,customer_phone,price_eur,notes")
                .eq("tenant_id", TENANT_ID)
                .eq("user_id", caller.userId)
                .neq("status", "cancelled")
                .gt("end_at", validation.start)
                .lt("start_at", validation.end)
                .order("start_at", { ascending: true }),
        ]);

        if (occupancyRes.error || ownRes.error) {
            console.error("[fetchAuthorizedCalendarItemsAction] Restricted DB query failed");
            return {
                success: false,
                code: "DB_ERROR",
                error: "Kalendár sa nepodarilo načítať. Skúste to prosím neskôr.",
            };
        }

        const { items: publicItems } = mapRestrictedOccupancyRowsToPublicItems(occupancyRes.data);
        const ownItems: OwnBookingCalendarItem[] = [];
        for (const row of ownRes.data || []) {
            const mappedOwn = mapOwnBookingRowToCalendarItem(row, caller.name, false);
            if (mappedOwn) {
                ownItems.push(mappedOwn);
            }
        }

        const mergedItems = mergeRestrictedCalendarItems(publicItems, ownItems);
        return {
            success: true,
            accessMode: "restricted",
            items: mergedItems,
        };
    } catch (error) {
        console.error("[fetchAuthorizedCalendarItemsAction] Unexpected error:", error);
        return {
            success: false,
            code: "DB_ERROR",
            error: "Kalendár sa nepodarilo načítať. Skúste to prosím neskôr.",
        };
    }
}

export async function fetchBookingsAction(startDateIso: string, endDateIso: string) {
    try {
        const authResult = await getVerifiedBookingCaller();
        if (!authResult.ok) {
            return {
                success: false,
                code: authResult.code,
                error: authResult.error,
            };
        }

        if (authResult.caller.accessMode !== "staff") {
            return {
                success: false,
                code: "FORBIDDEN",
                error: "Nemáte oprávnenie na načítanie detailných rezervácií.",
            };
        }

        const validation = validateCalendarRangeByAccessMode(startDateIso, endDateIso, "staff");
        if (!validation.valid) {
            return {
                success: false,
                code: validation.code,
                error: validation.error,
            };
        }

        const staffItems = await loadStaffBookingItemsInRange(validation.start, validation.end);
        return {
            success: true,
            bookings: staffItems.map((item) => item.booking),
        };
    } catch (error: any) {
        console.error("fetchBookingsAction failed:", error);
        return { success: false, error: error.message || "Failed to load bookings" };
    }
}

export async function fetchPublicAvailabilityAction(
    startDateIso: string,
    endDateIso: string
): Promise<PublicAvailabilityResult> {
    const validation = validatePublicAvailabilityRange(startDateIso, endDateIso);
    if (!validation.valid) {
        return {
            success: false,
            code: validation.code,
            error: validation.error,
        };
    }

    try {
        const db = getCoreServiceDb();
        const { data, error } = await db
            .from("bookings")
            .select("court_id,start_at,end_at,status,notes")
            .eq("tenant_id", TENANT_ID)
            .in("status", ["confirmed", "pending", "blocked"])
            .gt("end_at", validation.start)
            .lt("start_at", validation.end);

        if (error) {
            console.error("[fetchPublicAvailabilityAction] DB query failed");
            return {
                success: false,
                code: "DB_ERROR",
                error: "Dostupnosť sa nepodarilo načítať. Skúste to prosím neskôr.",
            };
        }

        const { slots, skippedCount } = mapPublicAvailabilityRows(data);
        if (skippedCount > 0) {
            console.warn(`[fetchPublicAvailabilityAction] Ignored ${skippedCount} rows with missing or invalid court_id/timestamps`);
        }

        return {
            success: true,
            slots,
        };
    } catch {
        console.error("[fetchPublicAvailabilityAction] Unexpected error");
        return {
            success: false,
            code: "DB_ERROR",
            error: "Dostupnosť sa nepodarilo načítať. Skúste to prosím neskôr.",
        };
    }
}

export async function createBookingAction(payload: {
    courtId: string;
    title: string;
    customerName: string;
    phone?: string;
    start: string;
    end: string;
    status: "confirmed" | "blocked";
    source: "web" | "admin" | "voice-assistant" | "google-calendar";
    operationId?: string;
    multisportCardsCount?: number;
    adminBlockType?: string;
    clientPlayerName?: string;
}) {
    try {
        const session = await getSession();
        if (!session) {
            return { success: false, error: "Pre vytvorenie rezervácie sa musíte prihlásiť." };
                }

        const db = getCoreDb();
        const serviceDb = getCoreServiceDb();
        let { data: bookingUser, error: userError } = await serviceDb
            .from("booking_users")
            .select("role, card_number, discount_tier_id")
            .eq("id", session.userId)
            .maybeSingle();
        if (userError && (userError.message?.includes("discount_tier_id") || (userError as any).code === "PGRST204")) {
            const fallback = await serviceDb
                .from("booking_users")
                .select("role, card_number")
                .eq("id", session.userId)
                .maybeSingle();
            bookingUser = fallback.data ? { ...fallback.data, discount_tier_id: "tier-base" } : null;
            userError = fallback.error;
        }
        if (userError || !bookingUser) return { success: false, error: "Používateľský účet sa nepodarilo overiť." };
        if (payload.source === "admin" && bookingUser.role !== "admin") {
            return { success: false, error: "Nemáte oprávnenie blokovať kurt." };
        }

        const bookingStart = new Date(payload.start);
        const bookingEnd = new Date(payload.end);
        const bookingStartMs = bookingStart.getTime();
        const bookingEndMs = bookingEnd.getTime();
        if (!Number.isFinite(bookingStartMs) || !Number.isFinite(bookingEndMs) || bookingEndMs <= bookingStartMs) {
            return { success: false, error: "Neplatný termín rezervácie." };
        }

        let roleDiscountEurPerHour = 0;
        if (payload.source !== "admin") {
            const { data: policy, error: policyError } = await serviceDb
                .from("role_booking_policies")
                .select("max_booking_duration_minutes, booking_horizon_days, discount_eur_per_hour, is_active")
                .eq("role", bookingUser.role)
                .maybeSingle();
            if (policyError || !policy) return { success: false, error: "Pravidlá vašej roly sa nepodarilo načítať." };
            if (!policy.is_active) return { success: false, error: "Rezervácie sú pre vašu rolu momentálne deaktivované." };

            const durationMinutes = Math.round((bookingEndMs - bookingStartMs) / 60000);
            if (!isAllowedBookingDuration(durationMinutes, Number(policy.max_booking_duration_minutes))) {
                return { success: false, error: "Vybraná dĺžka rezervácie nie je pre vašu rolu povolená." };
            }
            if (durationMinutes > getCourtOperatingLimitMinutes(payload.courtId, bookingStart)) {
                return { success: false, error: "Rezervácia presahuje údržbu alebo otváracie hodiny kurtu." };
                        }

            const now = new Date();
            const todayKey = getBratislavaDateKey(now);
            const maxDate = new Date(`${todayKey}T12:00:00`);
            maxDate.setDate(maxDate.getDate() + Number(policy.booking_horizon_days));
            if (bookingStart < now) return { success: false, error: "Rezerváciu v minulosti nie je možné vytvoriť." };
            if (getBratislavaDateKey(bookingStart) > getBratislavaDateKey(maxDate)) {
                return { success: false, error: `Rezerváciu je možné vytvoriť maximálne ${policy.booking_horizon_days} dní vopred.` };
            }
            roleDiscountEurPerHour = Number(policy.discount_eur_per_hour);
        }

        console.log(`Creating booking in Supabase for NTC Tenant: ${TENANT_ID}`);
        
        // 1. Check for overlapping bookings in Supabase for the same court

        const searchRangeStart = new Date(bookingStartMs - 24 * 60 * 60 * 1000).toISOString();
        const searchRangeEnd = new Date(bookingEndMs + 24 * 60 * 60 * 1000).toISOString();

        const { data: existingBookings, error: checkError } = await db
            .from("bookings")
            .select("id, notes, start_at, end_at")
            .eq("tenant_id", TENANT_ID)
            .neq("status", "cancelled")
            .gte("end_at", searchRangeStart)
            .lte("start_at", searchRangeEnd);

        if (checkError) {
            console.error("Failed to check existing bookings:", checkError.message);
            throw new Error(`Database check error: ${checkError.message}`);
        }

        const hasConflict = (existingBookings || []).some(row => {
            let courtId = "";
            try {
                const parsed = typeof row.notes === "string" ? JSON.parse(row.notes) : (row.notes || {});
                courtId = parsed.courtId || "";
            } catch (e) {
                console.error("Failed to parse notes JSON:", e);
            }
            if (courtId !== payload.courtId) return false;

            const existingStartMs = new Date(row.start_at).getTime();
            const existingEndMs = new Date(row.end_at).getTime();

            return (existingStartMs < bookingEndMs && existingEndMs > bookingStartMs);
        });

        if (hasConflict) {
            return { success: false, error: "Vybraný kurt je v tomto čase už zarezervovaný." };
        }

        const durationMin = Math.round((bookingEndMs - bookingStartMs) / 60000);
        const isRegistered = Boolean(bookingUser);
        const multisportCount = Math.min(2, Math.max(0, Math.floor(payload.multisportCardsCount || 0)));

        const activePricelist = await getActivePricelist(payload.start);
        const pricingResult = calculateNtcBookingPrice(
            payload.courtId,
            payload.start,
            durationMin,
            isRegistered,
            roleDiscountEurPerHour,
            multisportCount,
            activePricelist,
            (bookingUser as any)?.discount_tier_id
        );
        const calculatedPrice = session.role === "admin" ? 0.00 : pricingResult.totalPriceEur;

        const notesObj = {
            courtId: payload.courtId,
            source: payload.source,
            notes: payload.title,
            multisportCardsCount: multisportCount,
            priceEur: calculatedPrice,
            adminBlockType: payload.adminBlockType,
            clientPlayerName: payload.clientPlayerName
        };
        const useWallet = session.role !== "admin" && payload.source !== "admin" && walletEnabledForUser(session.userId);

        let bookingId: string;
        let wallet: { chargedEur: number; balanceEur: number; created: boolean } | undefined;

        if (useWallet) {
            if (!payload.operationId) {
                return { success: false, error: "Chýba identifikátor rezervácie. Skúste to znova." };
            }
            const walletDb = getCoreServiceDb();

            if (multisportCount === 2 || calculatedPrice === 0.00) {
                // 100% zľava (2 MultiSport karty = bezplatná rezervácia): nestrháva žiadny kredit
                const { data: dbBooking, error: dbError } = await walletDb
                    .from("bookings")
                    .insert({
                        tenant_id: TENANT_ID,
                        court_id: payload.courtId,
                        sport: payload.courtId.replace(/-\d+$/, ""),
                        customer_name: payload.customerName,
                        customer_phone: payload.phone || null,
                        start_at: payload.start,
                        end_at: payload.end,
                        status: payload.status,
                        notes: JSON.stringify(notesObj),
                        user_id: session.userId,
                        price_eur: 0.00
                    })
                    .select()
                    .single();

                if (dbError) throw new Error(`Database error: ${dbError.message}`);
                bookingId = dbBooking.id;

                const { data: userWallet } = await walletDb
                    .from("wallets")
                    .select("id, balance_eur")
                    .eq("user_id", session.userId)
                    .maybeSingle();

                if (userWallet) {
                    await walletDb.from("wallet_transactions").insert({
                        wallet_id: userWallet.id,
                        tenant_id: TENANT_ID,
                        user_id: session.userId,
                        booking_id: bookingId,
                        type: "booking_charge",
                        amount_eur: 0.00,
                        idempotency_key: payload.operationId,
                        metadata: {
                            court_id: payload.courtId,
                            multisport_cards_count: 2,
                            discount: "100%",
                            price_eur: 0.00
                        }
                    });
                }

                wallet = {
                    chargedEur: 0.00,
                    balanceEur: Number(userWallet?.balance_eur ?? 0),
                    created: true
                };
            } else {
                // Platená rezervácia (0 kariet alebo 1 MultiSport karta): overenie a odčítanie z peňaženky
                let { data: userWallet } = await walletDb
                    .from("wallets")
                    .select("id, balance_eur")
                    .eq("user_id", session.userId)
                    .maybeSingle();

                let currentBalCents = Math.round(Number(userWallet?.balance_eur ?? 0) * 100);
                const requiredPriceCents = Math.round(calculatedPrice * 100);

                if (currentBalCents < requiredPriceCents) {
                    try {
                        const { reconcileWalletCardPayAction } = await import("./wallet");
                        const recRes = await reconcileWalletCardPayAction();
                        if (recRes.success && recRes.successful > 0) {
                            const { data: freshWallet } = await walletDb
                                .from("wallets")
                                .select("id, balance_eur")
                                .eq("user_id", session.userId)
                                .maybeSingle();
                            if (freshWallet) {
                                userWallet = freshWallet;
                                currentBalCents = Math.round(Number(freshWallet.balance_eur) * 100);
                            }
                        }

                        if (currentBalCents < requiredPriceCents) {
                            // Check for pending CardPay payment and credit it optimistically so client can book
                            const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
                            const { data: pendingPay } = await walletDb
                                .from("payments")
                                .select("id, provider_payment_id, amount_eur")
                                .eq("tenant_id", TENANT_ID)
                                .eq("user_id", session.userId)
                                .eq("provider", "tatrabanka")
                                .in("status", ["processing", "pending"])
                                .gte("created_at", fifteenMinAgo)
                                .order("created_at", { ascending: false })
                                .limit(1)
                                .maybeSingle();

                            if (pendingPay) {
                                await walletDb.rpc("wallet_process_successful_payment", {
                                    p_payment_id: pendingPay.id,
                                    p_provider_payment_id: pendingPay.provider_payment_id || `cardpay-${pendingPay.id}`,
                                    p_provider_metadata: {
                                        provider: "tatrabanka",
                                        payment_method: "CARD_PAY",
                                        source: "optimistic_booking_credit",
                                        verified_by_bank: false,
                                        pending_bank_confirmation: true,
                                    },
                                });
                                const { data: freshWallet } = await walletDb
                                    .from("wallets")
                                    .select("id, balance_eur")
                                    .eq("user_id", session.userId)
                                    .maybeSingle();
                                if (freshWallet) {
                                    userWallet = freshWallet;
                                    currentBalCents = Math.round(Number(freshWallet.balance_eur) * 100);
                                }
                            }
                        }
                    } catch (cardPayErr) {
                        console.error("CardPay optimistic booking credit failed:", cardPayErr);
                    }

                    if (currentBalCents < requiredPriceCents) {
                        const discountLabel = multisportCount === 1 ? " po zľave 50 %" : "";
                        return {
                            success: false,
                            error: `Nedostatočný zostatok v peňaženke. Potrebná suma${discountLabel}: ${calculatedPrice.toFixed(2)} €, aktuálny zostatok: ${(currentBalCents / 100).toFixed(2)} €.`,
                        };
                    }
                }

                const newBal = Math.round(currentBalCents - requiredPriceCents) / 100;
                if (userWallet) {
                    await walletDb
                        .from("wallets")
                        .update({ balance_eur: newBal, updated_at: new Date().toISOString() })
                        .eq("id", userWallet.id);
                }

                const { data: dbBooking, error: dbError } = await walletDb
                    .from("bookings")
                    .insert({
                        tenant_id: TENANT_ID,
                        court_id: payload.courtId,
                        sport: payload.courtId.replace(/-\d+$/, ""),
                        customer_name: payload.customerName,
                        customer_phone: payload.phone || null,
                        start_at: payload.start,
                        end_at: payload.end,
                        status: payload.status,
                        notes: JSON.stringify(notesObj),
                        user_id: session.userId,
                        price_eur: calculatedPrice
                    })
                    .select()
                    .single();

                if (dbError) throw new Error(`Database error: ${dbError.message}`);
                bookingId = dbBooking.id;

                if (userWallet) {
                    await walletDb.from("wallet_transactions").insert({
                        wallet_id: userWallet.id,
                        tenant_id: TENANT_ID,
                        user_id: session.userId,
                        booking_id: bookingId,
                        type: "booking_charge",
                        amount_eur: -calculatedPrice,
                        idempotency_key: payload.operationId,
                        metadata: {
                            court_id: payload.courtId,
                            multisport_cards_count: multisportCount,
                            discount: multisportCount === 1 ? "50%" : "0%",
                            price_eur: calculatedPrice
                        }
                    });
                }

                wallet = {
                    chargedEur: calculatedPrice,
                    balanceEur: newBal,
                    created: true
                };
            }
        } else {
            const adminCustomerName = (payload.customerName && payload.customerName !== "Admin User")
                ? payload.customerName
                : "Údržba kurtov";
            const effectiveCustomerName = (session.role === "admin" || payload.source === "admin")
                ? adminCustomerName
                : payload.customerName;

            const { data: dbBooking, error: dbError } = await db
                .from("bookings")
                .insert({
                    tenant_id: TENANT_ID,
                    court_id: payload.courtId,
                    sport: payload.courtId.replace(/-\d+$/, ""),
                    customer_name: effectiveCustomerName,
                    customer_phone: payload.phone || null,
                    start_at: payload.start,
                    end_at: payload.end,
                    status: payload.status,
                    notes: JSON.stringify(notesObj),
                    user_id: session.userId,
                    price_eur: calculatedPrice
                })
                .select()
                .single();

            if (dbError) throw new Error(`Database error: ${dbError.message}`);
            bookingId = dbBooking.id;
        }

        await logActivity({
            action: "booking.create",
            category: "bookings",
            entityType: "booking",
            entityId: bookingId,
            entityName: `${payload.courtId} (${payload.start.slice(0, 16).replace("T", " ")}) - ${payload.customerName}`,
            description: `Vytvorená nová rezervácia pre ${payload.customerName} na ${payload.courtId} (${calculatedPrice.toFixed(2)} €)`,
            changes: {
                before: null,
                after: {
                    courtId: payload.courtId,
                    start: payload.start,
                    end: payload.end,
                    customerName: payload.customerName,
                    priceEur: calculatedPrice,
                    source: payload.source,
                }
            },
            metadata: {
                courtId: payload.courtId,
                source: payload.source,
                multisportCardsCount: payload.multisportCardsCount || 0,
                chargedEur: wallet?.chargedEur ?? 0,
            }
        });

        revalidatePath("/bookings");
        revalidatePath("/newbookings");
        return {
            success: true,
            booking: {
                id: bookingId,
                user_id: session.userId,
                ...payload
            },
            wallet,
        };
    } catch (error: any) {
        console.error("createBookingAction failed:", error);
        return { success: false, error: error.message || "Failed to create booking" };
    }
}

export type CreateRecurringBookingPayload = {
    courtId: string;
    title?: string;
    customerName?: string;
    phone?: string;
    start: string;
    end: string;
    repeatFrequency?: "daily" | "weekly" | "monthly" | "yearly";
    frequencyWeeks?: number; // 1 = každý týždeň, 2 = každý 2. týždeň
    daysOfWeek?: number[];   // [1, 2, 3, 4, 5, 6, 0] (1=Po .. 0=Ne)
    untilDate?: string;      // "YYYY-MM-DD"
    repeatWeeks?: number;
    adminBlockType?: string;
    clientPlayerName?: string;
};

export async function createRecurringBookingAction(payload: CreateRecurringBookingPayload) {
    try {
        const session = await getSession();
        if (!session) {
            return { success: false, error: "Pre vytvorenie rezervácie sa musíte prihlásiť." };
        }

        const serviceDb = getCoreServiceDb();
        const { data: bookingUser, error: userError } = await serviceDb
            .from("booking_users")
            .select("role, card_number")
            .eq("id", session.userId)
            .maybeSingle();

        if (userError || !bookingUser) {
            return { success: false, error: "Používateľský účet sa nepodarilo overiť." };
        }

        const userRole = bookingUser.role as BookingRole;
        let canMakeRecurring = userRole === "admin" || userRole === "ntc_team";
        if (!canMakeRecurring) {
            const { data: policy } = await serviceDb
                .from("role_booking_policies")
                .select("can_make_recurring")
                .eq("role", userRole)
                .maybeSingle();
            if (policy && (policy as any).can_make_recurring) {
                canMakeRecurring = true;
            }
        }

        if (!canMakeRecurring) {
            return { success: false, error: "Vaša rola nemá oprávnenie na vytváranie opakovaných rezervácií." };
        }

        const firstStart = new Date(payload.start);
        const firstEnd = new Date(payload.end);
        const durationMs = firstEnd.getTime() - firstStart.getTime();

        if (isNaN(firstStart.getTime()) || isNaN(firstEnd.getTime()) || durationMs <= 0) {
            return { success: false, error: "Neplatný čas rezervácie." };
        }

        const repeatFrequency = payload.repeatFrequency || "weekly";

        let endDate: Date;
        if (payload.untilDate) {
            endDate = new Date(payload.untilDate + "T23:59:59");
        } else if (payload.repeatWeeks) {
            endDate = new Date(firstStart.getTime() + (payload.repeatWeeks - 1) * 7 * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000);
        } else {
            endDate = new Date(firstStart);
            endDate.setMonth(endDate.getMonth() + 3);
        }

        // No 12-month cap for recurring bookings
        const safetyCap = new Date(firstStart);
        safetyCap.setFullYear(safetyCap.getFullYear() + 10);
        if (endDate > safetyCap) {
            endDate = safetyCap;
        }

        type SlotOccur = { start: Date; end: Date; dateStr: string };
        const candidateSlots: SlotOccur[] = [];

        const firstBratislava = getBratislavaDateParts(firstStart);
        const bHour = firstBratislava.hour;
        const bMinute = firstBratislava.minute;

        if (repeatFrequency === "daily") {
            let current = new Date(firstStart);
            while (current <= endDate && candidateSlots.length < 1500) {
                const slotIso = createBratislavaIso(current, bHour, bMinute);
                const slotStart = new Date(slotIso);
                const slotEnd = new Date(slotStart.getTime() + durationMs);
                const dateStr = new Intl.DateTimeFormat("sk-SK", {
                    timeZone: "Europe/Bratislava",
                    day: "numeric", month: "numeric", year: "numeric"
                }).format(slotStart);
                candidateSlots.push({ start: slotStart, end: slotEnd, dateStr });
                current.setDate(current.getDate() + 1);
            }
        } else if (repeatFrequency === "monthly") {
            let current = new Date(firstStart);
            const originalDay = firstStart.getDate();
            while (current <= endDate && candidateSlots.length < 1500) {
                const slotIso = createBratislavaIso(current, bHour, bMinute);
                const slotStart = new Date(slotIso);
                const slotEnd = new Date(slotStart.getTime() + durationMs);
                const dateStr = new Intl.DateTimeFormat("sk-SK", {
                    timeZone: "Europe/Bratislava",
                    day: "numeric", month: "numeric", year: "numeric"
                }).format(slotStart);
                candidateSlots.push({ start: slotStart, end: slotEnd, dateStr });

                current = new Date(current.getFullYear(), current.getMonth() + 1, originalDay, 12, 0, 0, 0);
            }
        } else if (repeatFrequency === "yearly") {
            let current = new Date(firstStart);
            while (current <= endDate && candidateSlots.length < 1500) {
                const slotIso = createBratislavaIso(current, bHour, bMinute);
                const slotStart = new Date(slotIso);
                const slotEnd = new Date(slotStart.getTime() + durationMs);
                const dateStr = new Intl.DateTimeFormat("sk-SK", {
                    timeZone: "Europe/Bratislava",
                    day: "numeric", month: "numeric", year: "numeric"
                }).format(slotStart);
                candidateSlots.push({ start: slotStart, end: slotEnd, dateStr });

                current = new Date(current.getFullYear() + 1, current.getMonth(), current.getDate(), 12, 0, 0, 0);
            }
        } else {
            // "weekly"
            const frequencyWeeks = payload.frequencyWeeks === 2 ? 2 : 1;
            const selectedDays = (payload.daysOfWeek && payload.daysOfWeek.length > 0)
                ? payload.daysOfWeek
                : [firstStart.getDay()];

            // Loop week by week starting from Monday of firstStart's week
            let currentWeekBase = new Date(firstStart);
            const dayOfWeekIndex = (currentWeekBase.getDay() + 6) % 7; // 0 for Mon, 6 for Sun
            currentWeekBase.setDate(currentWeekBase.getDate() - dayOfWeekIndex);
            currentWeekBase.setHours(0, 0, 0, 0);

            while (currentWeekBase <= endDate && candidateSlots.length < 1500) {
                for (const dow of selectedDays) {
                    const dayOffset = (dow === 0 ? 7 : dow) - 1; // 0 for Mon, 6 for Sun
                    const dayCandidate = new Date(currentWeekBase);
                    dayCandidate.setDate(dayCandidate.getDate() + dayOffset);

                    const slotIso = createBratislavaIso(dayCandidate, bHour, bMinute);
                    const slotDate = new Date(slotIso);
                    const slotEnd = new Date(slotDate.getTime() + durationMs);

                    if (slotDate.getTime() >= firstStart.getTime() && slotDate.getTime() <= endDate.getTime()) {
                        const dateStr = new Intl.DateTimeFormat("sk-SK", {
                            timeZone: "Europe/Bratislava",
                            day: "numeric",
                            month: "numeric",
                            year: "numeric"
                        }).format(slotDate);
                        candidateSlots.push({ start: slotDate, end: slotEnd, dateStr });
                    }
                }

                currentWeekBase.setDate(currentWeekBase.getDate() + 7 * frequencyWeeks);
            }
        }

        candidateSlots.sort((a, b) => a.start.getTime() - b.start.getTime());

        if (candidateSlots.length === 0) {
            return {
                success: false,
                error: "Podľa zvolených kritérií a dátumu ukončenia nevznikli žiadne termíny."
            };
        }

        const rangeStartIso = new Date(candidateSlots[0].start.getTime() - 24 * 60 * 60 * 1000).toISOString();
        const rangeEndIso = new Date(candidateSlots[candidateSlots.length - 1].end.getTime() + 24 * 60 * 60 * 1000).toISOString();

        const db = getCoreDb();
        const { data: existingBookings, error: checkError } = await db
            .from("bookings")
            .select("id, notes, start_at, end_at")
            .eq("tenant_id", TENANT_ID)
            .neq("status", "cancelled")
            .gte("end_at", rangeStartIso)
            .lte("start_at", rangeEndIso);

        if (checkError) {
            console.error("Failed to check existing bookings for recurrence:", checkError.message);
            throw new Error(`Database check error: ${checkError.message}`);
        }

        const validSlots: SlotOccur[] = [];
        const skippedDates: string[] = [];

        for (const slot of candidateSlots) {
            const slotStartMs = slot.start.getTime();
            const slotEndMs = slot.end.getTime();

            const isConflict = (existingBookings || []).some(row => {
                let rowCourtId = "";
                try {
                    const parsed = typeof row.notes === "string" ? JSON.parse(row.notes) : (row.notes || {});
                    rowCourtId = parsed.courtId || "";
                } catch (e) {
                    // ignore
                }
                if (rowCourtId !== payload.courtId) return false;

                const exStart = new Date(row.start_at).getTime();
                const exEnd = new Date(row.end_at).getTime();
                return (exStart < slotEndMs && exEnd > slotStartMs);
            });

            if (isConflict) {
                skippedDates.push(slot.dateStr);
            } else {
                validSlots.push(slot);
            }
        }

        if (validSlots.length === 0) {
            return {
                success: false,
                error: "Všetky vybrané termíny sú už obsadené inými rezerváciami.",
                skippedDates
            };
        }

        const recurringGroupId = `rec_${crypto.randomUUID()}`;
        const effectiveBlockType = payload.adminBlockType || "Údržba kurtov";
        const finalCustomerName = payload.clientPlayerName
            ? payload.clientPlayerName
            : (session.role === "admin" ? effectiveBlockType : (payload.customerName || session.name));

        const baseTitle = payload.title?.trim() || (session.role === "admin" ? effectiveBlockType : "Rezervácia");

        const rowsToInsert = validSlots.map(slot => ({
            tenant_id: TENANT_ID,
            court_id: payload.courtId,
            sport: payload.courtId.replace(/-\d+$/, ""),
            customer_name: finalCustomerName,
            customer_phone: payload.phone || null,
            start_at: slot.start.toISOString(),
            end_at: slot.end.toISOString(),
            status: session.role === "admin" ? "blocked" : "confirmed",
            notes: JSON.stringify({
                courtId: payload.courtId,
                source: session.role === "admin" ? "admin" : "web",
                notes: baseTitle,
                recurringGroupId,
                clientPlayerName: payload.clientPlayerName || undefined,
                adminBlockType: payload.adminBlockType || undefined,
                repeatWeeks: candidateSlots.length,
            }),
            user_id: session.userId,
            price_eur: 0.00
        }));

        const { data: inserted, error: insertError } = await db
            .from("bookings")
            .insert(rowsToInsert)
            .select();

        if (insertError) {
            console.error("createRecurringBookingAction insert failed:", insertError);
            throw new Error(`Chyba databázy: ${insertError.message}`);
        }

        await logActivity({
            action: "booking.create_recurring",
            category: "bookings",
            entityType: "booking_series",
            entityId: recurringGroupId,
            entityName: `${payload.courtId} - séria (${validSlots.length} termínov) - ${finalCustomerName}`,
            description: `Vytvorená séria ${validSlots.length} opakovaných rezervácií pre ${finalCustomerName} na ${payload.courtId}`,
            changes: {
                before: null,
                after: {
                    courtId: payload.courtId,
                    recurringGroupId,
                    createdCount: validSlots.length,
                    totalRequested: candidateSlots.length,
                    customerName: finalCustomerName,
                }
            },
            metadata: {
                courtId: payload.courtId,
                recurringGroupId,
                createdCount: validSlots.length,
                totalRequested: candidateSlots.length,
                skippedDates,
            }
        });

        revalidatePath("/bookings");
        revalidatePath("/newbookings");
        revalidatePath("/dashboard/newbookings");

        return {
            success: true,
            recurringGroupId,
            createdCount: validSlots.length,
            totalRequested: candidateSlots.length,
            skippedDates,
            bookings: (inserted || []).map(b => ({
                id: b.id,
                courtId: payload.courtId,
                title: baseTitle,
                customerName: finalCustomerName,
                phone: payload.phone || undefined,
                start: b.start_at,
                end: b.end_at,
                status: b.status,
                source: session.role === "admin" ? "admin" : "web",
                user_id: session.userId,
                recurringGroupId,
                clientPlayerName: payload.clientPlayerName || undefined,
            }))
        };
    } catch (error: any) {
        console.error("createRecurringBookingAction failed:", error);
        return { success: false, error: error.message || "Nepodarilo sa vytvoriť opakovanú rezerváciu." };
    }
}

export async function fetchSeriesBookingsAction(recurringGroupId: string): Promise<SeriesBookingsResult> {
    try {
        if (!isValidRecurringGroupId(recurringGroupId)) {
            return {
                success: false,
                code: "INVALID_INPUT",
                error: "Neplatný identifikátor opakovanej série.",
            };
        }

        const authResult = await getVerifiedBookingCaller();
        if (!authResult.ok) {
            return {
                success: false,
                code: authResult.code,
                error: authResult.error,
            };
        }

        const { caller } = authResult;
        const db = getCoreServiceDb();

        if (caller.accessMode === "restricted") {
            const { data, error } = await db
                .from("bookings")
                .select("id, court_id, start_at, end_at, status, customer_name, customer_phone, price_eur, notes")
                .eq("tenant_id", TENANT_ID)
                .eq("user_id", caller.userId)
                .order("start_at", { ascending: true });

            if (error) throw error;

            const ownItems: OwnBookingCalendarItem[] = [];
            for (const row of data || []) {
                const rowGroupId = extractValidRecurringGroupIdFromNotes(row.notes);
                if (rowGroupId !== recurringGroupId) continue;
                const mapped = mapOwnBookingRowToCalendarItem(row, caller.name, true);
                if (mapped) {
                    ownItems.push(mapped);
                }
            }

            return {
                success: true,
                accessMode: "restricted",
                items: ownItems,
            };
        }

        // Privileged read vetva (`admin`, `ntc_team`):
        const { data, error } = await db
            .from("bookings")
            .select("id, court_id, start_at, end_at, status, customer_name, customer_phone, user_id, price_eur, notes")
            .eq("tenant_id", TENANT_ID)
            .order("start_at", { ascending: true });

        if (error) throw error;

        const matchingRows = (data || []).filter((row) => {
            const rowGroupId = extractValidRecurringGroupIdFromNotes(row.notes);
            return rowGroupId === recurringGroupId;
        });

        const userIds = Array.from(new Set(matchingRows.map((r) => r.user_id).filter(Boolean))) as string[];
        const userMap = new Map<string, StaffUserMeta>();
        if (userIds.length > 0) {
            const { data: usersData } = await db
                .from("booking_users")
                .select("id, role, card_number, name")
                .in("id", userIds);
            if (usersData) {
                for (const u of usersData) {
                    userMap.set(u.id, {
                        role: u.role,
                        cardNumber: u.card_number || undefined,
                        name: u.name,
                    });
                }
            }
        }

        const staffItems: StaffBookingCalendarItem[] = [];
        for (const row of matchingRows) {
            const mapped = mapStaffBookingRowToCalendarItem(row, userMap, true);
            if (mapped) {
                staffItems.push(mapped);
            }
        }

        return {
            success: true,
            accessMode: "staff",
            items: staffItems,
        };
    } catch (error: any) {
        console.error("fetchSeriesBookingsAction failed:", error);
        return {
            success: false,
            code: "DB_ERROR",
            error: error.message || "Nepodarilo sa načítať termíny série.",
        };
    }
}

export async function deleteBookingAction(id: string, deleteEntireSeries = false) {
    try {
        const authResult = await getVerifiedBookingCaller();
        if (!authResult.ok) {
            return { success: false, error: "Nedostatočné oprávnenia." };
        }

        const { caller } = authResult;
        const isCallerAdmin = caller.role === "admin";

        const db = getCoreDb();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let query = db
            .from("bookings")
            .select("id, user_id, start_at, end_at, tenant_id, notes, customer_name, court_id, price_eur, status")
            .eq("tenant_id", TENANT_ID);
        query = isUuid ? query.eq("id", id) : query.eq("calendar_event_id", id);
        const { data: booking, error: selectError } = await query.maybeSingle();

        if (selectError) throw new Error(`Database lookup error: ${selectError.message}`);
        if (!booking || booking.tenant_id !== TENANT_ID) {
            return { success: false, error: "Rezervácia sa nenašla." };
        }

        // Vlastníctvo určuje výhradne `booking.user_id === caller.userId`; cudziu rezerváciu smie zrušiť iba čerstvo overený admin.
        // Rola `ntc_team` týmto nezískava právo rušiť cudzie rezervácie ani cudzie série.
        const isOwner = booking.user_id === caller.userId;
        if (!isCallerAdmin && !isOwner) {
            return { success: false, error: "Nemáte oprávnenie zrušiť túto rezerváciu." };
        }

        let notesObj: Record<string, unknown> = {};
        try {
            const parsed = typeof booking.notes === "string" ? JSON.parse(booking.notes) : (booking.notes || {});
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                notesObj = parsed as Record<string, unknown>;
            }
        } catch {
            notesObj = {};
        }

        let deadlineHours = 24;
        if (!isCallerAdmin) {
            const policyDb = getCoreServiceDb();
            const { data: userPolicy, error: policyError } = await policyDb
                .from("booking_users")
                .select("role, role_booking_policies(cancellation_deadline_hours)")
                .eq("id", caller.userId)
                .maybeSingle();
            if (policyError || !userPolicy) {
                return { success: false, error: "Storno pravidlá sa nepodarilo overiť." };
            }
            const joinedPolicy = Array.isArray(userPolicy.role_booking_policies)
                ? userPolicy.role_booking_policies[0]
                : userPolicy.role_booking_policies;
            deadlineHours = Number(joinedPolicy?.cancellation_deadline_hours ?? 24);
        }

        const checkNonAdminCancellationAllowed = (targetStartAt: string, targetNotesObj: Record<string, unknown>): string | null => {
            if (Boolean(targetNotesObj.rescheduled) || Boolean(targetNotesObj.isRescheduled)) {
                return "Presunutú rezerváciu už nie je možné zrušiť. Máte však možnosť ju opätovne presunúť na iný termín.";
            }
            const startMs = Date.parse(targetStartAt);
            if (!Number.isFinite(startMs)) {
                return "Neplatný termín rezervácie.";
            }
            const cancellationDeadline = startMs - deadlineHours * 60 * 60 * 1000;
            if (Date.now() >= cancellationDeadline) {
                return `Rezerváciu je možné zrušiť iba viac ako ${deadlineHours} hodín pred jej začiatkom.`;
            }
            return null;
        };

        if (deleteEntireSeries) {
            const targetRecurringGroupId = extractValidRecurringGroupIdFromNotes(booking.notes);
            if (!targetRecurringGroupId) {
                return { success: false, error: "Rezervácia nie je súčasťou platnej opakovanej série." };
            }

            if (!isCallerAdmin) {
                const targetRuleError = checkNonAdminCancellationAllowed(booking.start_at, notesObj);
                if (targetRuleError) {
                    return { success: false, error: targetRuleError };
                }
            }

            let seriesQuery = db
                .from("bookings")
                .select("id, user_id, notes, start_at, status")
                .eq("tenant_id", TENANT_ID)
                .neq("status", "cancelled")
                .gte("start_at", booking.start_at);

            if (!isCallerAdmin) {
                seriesQuery = seriesQuery.eq("user_id", caller.userId);
            }

            const { data: seriesRows, error: seriesError } = await seriesQuery;
            if (seriesError) throw new Error(`Chyba pri hľadaní série: ${seriesError.message}`);

            const matchingRows: Array<{ id: string; user_id: string | null; start_at: string; parsedNotes: Record<string, unknown> }> = [];
            for (const row of seriesRows || []) {
                const rowGroupId = extractValidRecurringGroupIdFromNotes(row.notes);
                if (rowGroupId !== targetRecurringGroupId) continue;

                let rowNotesObj: Record<string, unknown> = {};
                try {
                    const parsed = typeof row.notes === "string" ? JSON.parse(row.notes) : (row.notes || {});
                    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                        rowNotesObj = parsed as Record<string, unknown>;
                    }
                } catch {
                    continue;
                }

                matchingRows.push({
                    id: row.id,
                    user_id: row.user_id,
                    start_at: row.start_at,
                    parsedNotes: rowNotesObj,
                });
            }

            if (matchingRows.length === 0) {
                return { success: false, error: "V tejto sérii sa nenašli žiadne aktívne termíny na zrušenie." };
            }

            // Pre ne-admina overíme vlastníctvo, deadline a rescheduled pravidlo na VŠETKÝCH položkách, ktoré sa majú zrušiť.
            // Ak ktorákoľvek položka neprejde, nevykoná sa žiadna čiastočná DB modifikácia.
            if (!isCallerAdmin) {
                for (const item of matchingRows) {
                    if (item.user_id !== caller.userId) {
                        return { success: false, error: "Nemáte oprávnenie zrušiť cudziu sériu." };
                    }
                    const ruleErr = checkNonAdminCancellationAllowed(item.start_at, item.parsedNotes);
                    if (ruleErr) {
                        return { success: false, error: ruleErr };
                    }
                }
            }

            const matchingIds = matchingRows.map((row) => row.id);
            let updateSeriesQuery = db
                .from("bookings")
                .update({ status: "cancelled" })
                .eq("tenant_id", TENANT_ID)
                .in("id", matchingIds);

            if (!isCallerAdmin) {
                updateSeriesQuery = updateSeriesQuery.eq("user_id", caller.userId);
            }

            const { error: cancelSeriesError } = await updateSeriesQuery;
            if (cancelSeriesError) throw new Error(`Chyba pri rušení série: ${cancelSeriesError.message}`);

            await logActivity({
                action: "booking.delete_series",
                category: "bookings",
                entityType: "booking_series",
                entityId: targetRecurringGroupId,
                entityName: `Séria (${matchingIds.length} termínov)`,
                description: `Zrušená séria ${matchingIds.length} rezervácií od termínu ${booking.start_at?.slice(0, 10)}`,
                changes: {
                    before: { activeCount: matchingIds.length, status: "confirmed" },
                    after: { status: "cancelled" }
                },
                metadata: {
                    recurringGroupId: targetRecurringGroupId,
                    deletedCount: matchingIds.length,
                },
                level: "warning",
            });

            revalidatePath("/bookings");
            revalidatePath("/newbookings");
            revalidatePath("/dashboard/newbookings");
            return { success: true, deletedCount: matchingIds.length, cancelledSeries: true };
        }

        if (!isCallerAdmin) {
            const singleRuleError = checkNonAdminCancellationAllowed(booking.start_at, notesObj);
            if (singleRuleError) {
                return { success: false, error: singleRuleError };
            }
        }

        let wallet: { refundedEur: number; balanceEur: number; refunded: boolean; refundedUserId?: string } | undefined;
        const walletDb = getCoreServiceDb();

        const { data: refundData, error: refundError } = await walletDb.rpc("wallet_refund_ntc_booking", {
            p_booking_id: booking.id,
        });

        if (refundError) {
            console.error("wallet_refund_ntc_booking failed:", refundError);
        }

        if (!refundError && refundData?.[0] && refundData[0].refunded) {
            wallet = {
                refundedEur: Number(refundData[0].refunded_eur),
                balanceEur: Number(refundData[0].balance_eur),
                refunded: Boolean(refundData[0].refunded),
                refundedUserId: booking.user_id,
            };
        } else {
            const { error: cancelError } = await db
                .from("bookings")
                .update({ status: "cancelled" })
                .eq("id", booking.id);
            if (cancelError) throw new Error(`Database update error: ${cancelError.message}`);
        }

        await logActivity({
            action: "booking.delete",
            category: "bookings",
            entityType: "booking",
            entityId: booking.id,
            entityName: `${booking.court_id || "kurt"} (${booking.start_at?.slice(0, 16).replace("T", " ")}) - ${booking.customer_name || "Zákazník"}`,
            description: `Zrušená rezervácia pre ${booking.customer_name || "zákazníka"}${wallet?.refunded ? ` (vrátených ${wallet.refundedEur.toFixed(2)} € do peňaženky)` : ""}`,
            changes: {
                before: { status: "confirmed", start_at: booking.start_at, end_at: booking.end_at, court_id: booking.court_id },
                after: { status: "cancelled" }
            },
            metadata: {
                courtId: booking.court_id,
                refunded: wallet?.refunded ?? false,
                refundedEur: wallet?.refundedEur ?? 0,
            },
            level: "warning",
        });

        revalidatePath("/bookings");
        revalidatePath("/newbookings");
        revalidatePath("/dashboard/newbookings");
        return { success: true, wallet };
    } catch (error: any) {
        console.error("deleteBookingAction failed:", error);
        return { success: false, error: error.message || "Failed to delete booking" };
    }
}

export async function rescheduleBookingAction(payload: {
    bookingId: string;
    newCourtId: string;
    newStart: string;
    newEnd: string;
}) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Nedostatočné oprávnenia. Prihláste sa prosím." };

        const db = getCoreDb();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.bookingId);
        let query = db.from("bookings").select("*");
        query = isUuid ? query.eq("id", payload.bookingId) : query.eq("calendar_event_id", payload.bookingId);
        const { data: booking, error: selectError } = await query.maybeSingle();

        if (selectError) throw new Error(`Database lookup error: ${selectError.message}`);
        if (!booking || booking.tenant_id !== TENANT_ID) {
            return { success: false, error: "Rezervácia sa nenašla." };
        }

        const isAdmin = session.role === "admin";
        if (!isAdmin && booking.user_id !== session.userId) {
            return { success: false, error: "Nemáte oprávnenie presunúť túto rezerváciu." };
        }

        const now = new Date();
        const newStartMs = new Date(payload.newStart).getTime();
        const newEndMs = new Date(payload.newEnd).getTime();

        if (newStartMs <= now.getTime()) {
            return { success: false, error: "Rezerváciu nie je možné presunúť do minulosti." };
        }

        const oldStartMs = new Date(booking.start_at).getTime();
        const oldEndMs = new Date(booking.end_at).getTime();
        const oldDurationMin = Math.round((oldEndMs - oldStartMs) / 60000);
        const newDurationMin = Math.round((newEndMs - newStartMs) / 60000);

        if (newDurationMin !== oldDurationMin) {
            return { success: false, error: `Dĺžka nového termínu (${newDurationMin} min.) sa musí zhodovať s pôvodnou dĺžkou (${oldDurationMin} min.).` };
        }

        let notesObj: any = {};
        try {
            notesObj = typeof booking.notes === "string" ? JSON.parse(booking.notes) : (booking.notes || {});
        } catch (e) {
            notesObj = {};
        }

        const oldCourtId = booking.court_id || notesObj.courtId || "";
        const oldSport = oldCourtId.replace(/-\d+$/, "");
        const newSport = payload.newCourtId.replace(/-\d+$/, "");

        if (!isAdmin && oldSport && newSport && oldSport !== newSport) {
            return { success: false, error: "Rezerváciu je možné presunúť iba na rovnaký šport." };
        }

        if (!isAdmin) {
            const policyDb = getCoreServiceDb();
            let { data: policyData, error: policyDataError } = await policyDb
                .from("booking_users")
                .select("role, card_number, discount_tier_id, role_booking_policies(booking_horizon_days, discount_eur_per_hour)")
                .eq("id", session.userId)
                .maybeSingle();

            if (policyDataError && (policyDataError.message?.includes("discount_tier_id") || (policyDataError as any).code === "PGRST204")) {
                const fallback = await policyDb
                    .from("booking_users")
                    .select("role, card_number, role_booking_policies(booking_horizon_days, discount_eur_per_hour)")
                    .eq("id", session.userId)
                    .maybeSingle();
                policyData = fallback.data ? { ...fallback.data, discount_tier_id: "tier-base" } as any : null;
            }

            const joinedPolicy = Array.isArray(policyData?.role_booking_policies)
                ? policyData.role_booking_policies[0]
                : policyData?.role_booking_policies;
            const horizonDays = Number(joinedPolicy?.booking_horizon_days ?? 14);

            const todayKey = getBratislavaDateKey(now);
            const maxDate = new Date(`${todayKey}T12:00:00`);
            maxDate.setDate(maxDate.getDate() + horizonDays);

            if (getBratislavaDateKey(new Date(newStartMs)) > getBratislavaDateKey(maxDate)) {
                return { success: false, error: `Rezerváciu je možné presunúť maximálne ${horizonDays} dní vopred.` };
            }

            const isRegistered = Boolean(policyData);
            const roleDiscount = Number(joinedPolicy?.discount_eur_per_hour ?? 0);
            const multisportCount = Number(notesObj.multisportCardsCount || 0);
            const userDiscountTierId = (policyData as any)?.discount_tier_id;

            const originalPricelist = await getActivePricelist(booking.start_at);

            const originalPrice = booking.price_eur != null
                ? Number(booking.price_eur)
                : calculateNtcBookingPrice(
                    booking.court_id || notesObj.courtId,
                    booking.start_at,
                    oldDurationMin,
                    isRegistered,
                    roleDiscount,
                    multisportCount,
                    originalPricelist,
                    userDiscountTierId
                ).totalPriceEur;

            const newPricelist = await getActivePricelist(payload.newStart);
            const newPriceResult = calculateNtcBookingPrice(
                payload.newCourtId,
                payload.newStart,
                newDurationMin,
                isRegistered,
                roleDiscount,
                multisportCount,
                newPricelist,
                userDiscountTierId
            );

            if (Math.abs(newPriceResult.totalPriceEur - originalPrice) > 0.05) {
                return {
                    success: false,
                    error: `Termín je možné presunúť iba na čas s rovnakou cenou (${originalPrice.toFixed(2)} €). Nový termín má cenu ${newPriceResult.totalPriceEur.toFixed(2)} €.`
                };
            }
        }

        // Conflict checking on target court
        const searchRangeStart = new Date(newStartMs - 24 * 60 * 60 * 1000).toISOString();
        const searchRangeEnd = new Date(newEndMs + 24 * 60 * 60 * 1000).toISOString();

        const { data: existingBookings, error: checkError } = await db
            .from("bookings")
            .select("id, notes, start_at, end_at, status")
            .eq("tenant_id", TENANT_ID)
            .neq("id", booking.id)
            .neq("status", "cancelled")
            .gte("end_at", searchRangeStart)
            .lte("start_at", searchRangeEnd);

        if (checkError) {
            throw new Error(`Database check error: ${checkError.message}`);
        }

        const hasConflict = (existingBookings || []).some(row => {
            let rowCourtId = "";
            try {
                const parsed = typeof row.notes === "string" ? JSON.parse(row.notes) : (row.notes || {});
                rowCourtId = parsed.courtId || "";
            } catch (e) {}
            if (rowCourtId !== payload.newCourtId) return false;

            const exStartMs = new Date(row.start_at).getTime();
            const exEndMs = new Date(row.end_at).getTime();
            return (exStartMs < newEndMs && exEndMs > newStartMs);
        });

        if (hasConflict) {
            return { success: false, error: "Vybraný kurt je v tomto novom termíne už obsadený." };
        }

        const updatedNotes = {
            ...notesObj,
            courtId: payload.newCourtId,
            rescheduled: true,
            rescheduledAt: now.toISOString(),
            rescheduledBy: isAdmin ? "admin" : "user",
            originalStartAt: notesObj.originalStartAt || booking.start_at,
            originalEndAt: notesObj.originalEndAt || booking.end_at,
            originalCourtId: notesObj.originalCourtId || booking.court_id,
        };

        const targetSport = payload.newCourtId.replace(/-\d+$/, "");

        const { data: updatedBooking, error: updateError } = await db
            .from("bookings")
            .update({
                court_id: payload.newCourtId,
                sport: targetSport,
                start_at: payload.newStart,
                end_at: payload.newEnd,
                notes: JSON.stringify(updatedNotes),
            })
            .eq("id", booking.id)
            .select()
            .single();

        if (updateError) {
            throw new Error(`Database update error: ${updateError.message}`);
        }

        await logActivity({
            action: "booking.reschedule",
            category: "bookings",
            entityType: "booking",
            entityId: booking.id,
            entityName: `${payload.newCourtId} (${payload.newStart.slice(0, 16).replace("T", " ")}) - ${updatedBooking.customer_name}`,
            description: `Presunutá rezervácia z ${booking.court_id} (${booking.start_at?.slice(0, 16).replace("T", " ")}) na ${payload.newCourtId} (${payload.newStart.slice(0, 16).replace("T", " ")})`,
            changes: {
                before: { courtId: booking.court_id, start_at: booking.start_at, end_at: booking.end_at },
                after: { courtId: payload.newCourtId, start_at: payload.newStart, end_at: payload.newEnd }
            },
            metadata: {
                previousCourtId: booking.court_id,
                newCourtId: payload.newCourtId,
            }
        });

        revalidatePath("/bookings");
        revalidatePath("/newbookings");
        revalidatePath("/dashboard/newbookings");

        return {
            success: true,
            booking: {
                id: updatedBooking.id,
                courtId: payload.newCourtId,
                title: updatedNotes.notes || updatedBooking.customer_name || "Rezervácia",
                customerName: updatedBooking.customer_name,
                phone: updatedBooking.customer_phone || undefined,
                start: updatedBooking.start_at,
                end: updatedBooking.end_at,
                status: updatedBooking.status,
                source: updatedNotes.source || "web",
                user_id: updatedBooking.user_id,
                priceEur: updatedBooking.price_eur != null ? Number(updatedBooking.price_eur) : undefined,
                multisportCardsCount: updatedNotes.multisportCardsCount || 0,
                isRescheduled: true,
            }
        };
    } catch (error: any) {
        console.error("rescheduleBookingAction failed:", error);
        return { success: false, error: error.message || "Nepodarilo sa presunúť rezerváciu." };
    }
}



export async function fetchUserDashboardDataAction() {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Not logged in" };

        const db = getCoreDb();
        const { data: dbBookings, error } = await db
            .from("bookings")
            .select("*")
            .eq("tenant_id", TENANT_ID)
            .eq("user_id", session.userId)
            .order("start_at", { ascending: false });

        if (error) throw new Error(error.message);

        const bookings = (dbBookings || []).map(row => {
            let notesObj: any = {};
            try { notesObj = typeof row.notes === "string" ? JSON.parse(row.notes) : (row.notes || {}); } catch (e) {}
            return {
                id: row.id,
                courtId: notesObj.courtId || "unknown",
                title: notesObj.notes || (row.status === "blocked" ? "Údržba" : "Rezervácia"),
                customerName: row.customer_name || "Neznámy zákazník",
                phone: row.customer_phone || undefined,
                start: row.start_at,
                end: row.end_at,
                status: row.status as "confirmed" | "blocked" | "cancelled",
                source: (notesObj.source || "web") as any,
                user_id: row.user_id,
                isRescheduled: Boolean(notesObj.rescheduled)
            };
        });

        const now = new Date();
        const nowIso = now.toISOString();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const currentMonthBookings = bookings.filter(b => b.start >= firstDayOfMonth && b.status === "confirmed");
        
        let pastHoursThisMonth = 0;
        let futureHoursThisMonth = 0;
        
        currentMonthBookings.forEach(b => {
            const start = new Date(b.start).getTime();
            const end = new Date(b.end).getTime();
            const duration = (end - start) / (1000 * 60 * 60);
            
            if (b.start < nowIso) {
                pastHoursThisMonth += duration;
            } else {
                futureHoursThisMonth += duration;
            }
        });

        return { 
            success: true, 
            bookings, 
            stats: { 
                pastHoursThisMonth,
                futureHoursThisMonth, 
                totalBookings: currentMonthBookings.length 
            } 
        };
    } catch (e: any) {
        console.error("fetchUserDashboardDataAction failed:", e);
        return { success: false, error: e.message };
    }
}

function calculateBookingPrice(courtId: string, startIso: string, endIso: string, hasCard: boolean): number {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (durationHours <= 0) return 0;

    const day = start.getDay(); // 0 = Sun, 6 = Sat
    const hour = start.getHours();
    const isWeekend = day === 0 || day === 6;
    
    let hourlyRate = 0;
    const court = courtId.toLowerCase();

    if (court.includes("badminton") || court.includes("bedminton")) {
        if (isWeekend) hourlyRate = 14;
        else hourlyRate = (hour >= 16 && hour < 22) ? 19 : 13;
    } else if (court.includes("tennis") || court.includes("tenis")) {
        if (isWeekend) hourlyRate = 28;
        else hourlyRate = (hour >= 16 && hour < 22) ? 39 : 29;
    } else if (court.includes("squash")) {
        if (isWeekend) hourlyRate = 11;
        else hourlyRate = (hour >= 16 && hour < 21) ? 15 : 11;
    }

    if (hourlyRate === 0) return 0; // Unknown or blocked

    if (!hasCard) hourlyRate += 2;

    return hourlyRate * durationHours;
}

export async function fetchAdminDashboardDataAction() {
    try {
        const session = await getSession();
        if (!session || session.role !== "admin") return { success: false, error: "Not authorized" };

        const db = getCoreDb();
        const { data: dbBookings, error } = await db
            .from("bookings")
            .select("*, booking_users(card_number)")
            .eq("tenant_id", TENANT_ID)
            .order("start_at", { ascending: false });

        if (error) throw new Error(error.message);

        const bookings = (dbBookings || []).map(row => {
            let notesObj: any = {};
            try { notesObj = typeof row.notes === "string" ? JSON.parse(row.notes) : (row.notes || {}); } catch (e) {}
            
            let hasCard = false;
            if (row.booking_users?.card_number) {
                hasCard = true;
            } else {
                const notesStr = (typeof row.notes === "string" ? row.notes : JSON.stringify(row.notes || {})).toLowerCase();
                if (notesStr.includes("clenska karta") || notesStr.includes("membership card") || notesStr.includes("členská karta")) {
                    hasCard = true;
                }
            }
            
                        const storedPrice = row.price_eur === null || row.price_eur === undefined ? null : Number(row.price_eur);
            const price = storedPrice !== null && Number.isFinite(storedPrice)
                ? storedPrice
                : calculateBookingPrice(notesObj.courtId || "unknown", row.start_at, row.end_at, hasCard);
            return {
                id: row.id,
                courtId: notesObj.courtId || "unknown",
                title: notesObj.notes || (row.status === "blocked" ? "Údržba" : "Rezervácia"),
                customerName: row.customer_name || "Neznámy zákazník",
                phone: row.customer_phone || undefined,
                start: row.start_at,
                end: row.end_at,
                status: row.status as "confirmed" | "blocked" | "cancelled",
                source: (notesObj.source || "web") as any,
                user_id: row.user_id,
                price,
                hasCard
            };
        });

        const now = new Date();
        const nowIso = now.toISOString();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const currentMonthBookings = bookings.filter(b => b.start >= firstDayOfMonth && b.status === "confirmed");
        
        let pastHoursThisMonth = 0;
        let futureHoursThisMonth = 0;
        let pastRevenueThisMonth = 0;
        let futureRevenueThisMonth = 0;
        const customerHours: Record<string, {name: string, hours: number, count: number, revenue: number}> = {};
        const heatmap = Array(7).fill(0).map(() => Array(24).fill(0));
        
        currentMonthBookings.forEach(b => {
            // Hours calculation
            const start = new Date(b.start).getTime();
            const end = new Date(b.end).getTime();
            const duration = (end - start) / (1000 * 60 * 60);
            
            if (b.start < nowIso) {
                pastHoursThisMonth += duration;
                pastRevenueThisMonth += b.price;
            } else {
                futureHoursThisMonth += duration;
                futureRevenueThisMonth += b.price;
            }
            
            // Customer grouping
            const rawName = b.customerName || "Neznámy zákazník";
            const key = rawName.trim().toLowerCase();
            if (!customerHours[key]) {
                customerHours[key] = { name: rawName.trim(), hours: 0, count: 0, revenue: 0 };
            }
            customerHours[key].hours += duration;
            customerHours[key].count += 1;
            customerHours[key].revenue += b.price;
            
            // Heatmap calculation (0 = Mon, 6 = Sun)
            const date = new Date(b.start);
            let day = date.getDay() - 1; 
            if (day === -1) day = 6;
            const hour = date.getHours();
            heatmap[day][hour] += 1;
        });
        
        const topCustomers = Object.values(customerHours)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
            
        const activeCustomers = Object.keys(customerHours).length;

        return { 
            success: true, 
            bookings, 
            stats: { 
                pastHoursThisMonth,
                futureHoursThisMonth,
                pastRevenueThisMonth,
                futureRevenueThisMonth,
                totalBookings: currentMonthBookings.length, 
                activeCustomers,
                topCustomers,
                heatmap
            } 
        };
    } catch (e: any) {
        console.error("fetchAdminDashboardDataAction failed:", e);
        return { success: false, error: e.message };
    }
}

export async function restoreBookingAction(id: string) {
    try {
        const session = await getSession();
        if (!session) {
            return { success: false, error: "Nedostatočné oprávnenia." };
        }

        const db = getCoreDb();

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        
        let query = db.from("bookings").select("id, user_id, tenant_id, start_at, end_at, status");
        if (isUuid) {
            query = query.eq("id", id);
        } else {
            query = query.eq("calendar_event_id", id);
        }

        const { data: dbBooking, error: selectErr } = await query.maybeSingle();

        if (!dbBooking) {
            return { success: false, error: "Rezervácia sa nenašla." };
        }

        if (session.role !== 'admin' && dbBooking.user_id !== session.userId) {
            return { success: false, error: "Nemáte oprávnenie obnoviť túto rezerváciu." };
        }

        // We need the courtId from notes
        let courtId = "badminton-1";
        try {
            // Need to fetch notes to get courtId since it's JSON encoded in notes
            const { data: noteData } = await db.from("bookings").select("notes").eq("id", dbBooking.id).single();
            if (noteData?.notes) {
                const parsed = JSON.parse(noteData.notes);
                if (parsed.courtId) courtId = parsed.courtId;
            }
        } catch (e) {}

        // Check if the slot is still available. Since court_id is in notes, we can't do a simple SQL overlap query on court_id for JSON natively without complex queries in this simple setup. 
        // Wait, the easiest way is to fetchBookingsAction for that day and use checkConflict logic locally.
        const startDay = new Date(dbBooking.start_at);
        startDay.setHours(0, 0, 0, 0);
        const endDay = new Date(startDay);
        endDay.setDate(endDay.getDate() + 1);

        const { data: dayBookings } = await db
            .from("bookings")
            .select("id, start_at, end_at, status, notes")
            .eq("tenant_id", dbBooking.tenant_id)
            .neq("id", dbBooking.id)
            .neq("status", "cancelled")
            .gte("end_at", startDay.toISOString())
            .lte("start_at", endDay.toISOString());

        if (dayBookings) {
            const targetStart = new Date(dbBooking.start_at).getTime();
            const targetEnd = new Date(dbBooking.end_at).getTime();

            for (const b of dayBookings) {
                let bCourt = "badminton-1";
                try {
                    const parsed = JSON.parse(b.notes || "{}");
                    if (parsed.courtId) bCourt = parsed.courtId;
                } catch (e) {}

                if (bCourt === courtId) {
                    const bStart = new Date(b.start_at).getTime();
                    const bEnd = new Date(b.end_at).getTime();
                    if (targetStart < bEnd && targetEnd > bStart) {
                        return { success: false, error: "Tento termín už medzičasom niekto obsadil." };
                    }
                }
            }
        }

                const targetDbId = dbBooking.id;

        const walletDb = getCoreServiceDb();
        const { data: refund, error: refundLookupError } = await walletDb
            .from("wallet_transactions")
            .select("id")
            .eq("booking_id", targetDbId)
            .eq("type", "refund")
            .maybeSingle();
        if (refundLookupError) {
            throw new Error(`Wallet lookup error: ${refundLookupError.message}`);
        }
        if (refund) {
            return {
                success: false,
                error: "Refundovanú rezerváciu nie je možné obnoviť. Vytvorte si novú rezerváciu.",
            };
        }

        const { error: updateErr } = await db
            .from("bookings")
            .update({ status: "confirmed" })
            .eq("id", targetDbId);
        
        if (updateErr) {
            throw new Error(`Database update error: ${updateErr.message}`);
        }

        await logActivity({
            action: "booking.restore",
            category: "bookings",
            entityType: "booking",
            entityId: targetDbId,
            entityName: `${courtId} (${dbBooking.start_at?.slice(0, 16).replace("T", " ")})`,
            description: `Obnovená zrušená rezervácia na ${courtId} (${dbBooking.start_at?.slice(0, 16).replace("T", " ")})`,
            changes: {
                before: { status: "cancelled" },
                after: { status: "confirmed" }
            },
            metadata: {
                courtId,
            }
        });

        revalidatePath("/bookings");
        return { success: true };
    } catch (error: any) {
        console.error("restoreBookingAction failed:", error);
        return { success: false, error: error.message || "Failed to restore booking" };
    }
}

export type CourtHeatmapParams = {
    sport?: "all" | SportType;
    period?: "this_week" | "last_week" | "this_month" | "last_month";
    courtId?: string;
};

export type HeatmapCell = {
    dayIndex: number; // 0 = Pondelok, 6 = Nedeľa
    dayName: string;  // "Po", "Ut", "St", "Št", "Pi", "So", "Ne"
    hour: number;     // 7 .. 22
    occupiedCount: number; // Priemer alebo počet obsadených kurtov
    occupiedSlots: number; // Skutočný súčet obsadení v danú hodinu cez všetky týždne
    occurrences: number;   // Koľko krát sa daný deň vyskytuje v období (1x pre týždeň, 4-5x pre mesiac)
    totalCourts: number;   // Celková kapacita kurtov
    percentage: number;    // 0 .. 100 %
    isSingleCourt: boolean;// Či ide o filter 1 konkrétneho kurtu
};

export type CourtStatSummary = {
    courtId: string;
    courtName: string;
    sport: SportType;
    surface: string;
    occupiedHours: number;
    totalPossibleHours: number;
    utilizationPercent: number;
    bookingsCount: number;
};

function getBratislavaUtcDate(year: number, month: number, day: number, hour: number, minute = 0, second = 0, millisecond = 0): Date {
    const candidate = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
    const parts = getBratislavaDateParts(candidate);
    let diff = (parts.hour - candidate.getUTCHours() + 24) % 24;
    if (diff > 12) diff -= 24;
    return new Date(Date.UTC(year, month - 1, day, hour - diff, minute, second, millisecond));
}

function resolveCourtId(row: any): string {
    let fromNotes = "";
    try {
        const obj = typeof row.notes === "string" ? JSON.parse(row.notes) : (row.notes || {});
        fromNotes = obj.courtId || obj.court_id || "";
    } catch {}
    return fromNotes || row.court_id || row.courtId || "badminton-1";
}

export async function fetchCourtHeatmapAction(params?: CourtHeatmapParams) {
    try {
        const session = await getSession();
        if (!session || session.role !== "admin") {
            return { success: false, error: "Prístup zamietnutý. Iba administrátor môže zobraziť štatistiky." };
        }

        const now = new Date();
        const nowParts = getBratislavaDateParts(now);
        const period = params?.period || "this_week";

        // Vypočítame presný zoznam dní pre zvolené obdobie
        const dates: { dateKey: string; dayIndex: number; year: number; month: number; day: number }[] = [];

        if (period === "this_week" || period === "last_week") {
            const offsetFromMonday = nowParts.dayOfWeek; // 0 = Mon, 6 = Sun
            const weekShift = period === "last_week" ? 7 : 0;
            const monUtc = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day - offsetFromMonday - weekShift, 12, 0, 0));
            for (let i = 0; i < 7; i++) {
                const d = new Date(Date.UTC(monUtc.getUTCFullYear(), monUtc.getUTCMonth(), monUtc.getUTCDate() + i, 12, 0, 0));
                const y = d.getUTCFullYear();
                const m = d.getUTCMonth() + 1;
                const dayNum = d.getUTCDate();
                const dateKey = `${y}-${String(m).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                dates.push({ dateKey, dayIndex: i, year: y, month: m, day: dayNum });
            }
        } else {
            // "this_month" | "last_month"
            let targetYear = nowParts.year;
            let targetMonth = nowParts.month;
            if (period === "last_month") {
                targetMonth -= 1;
                if (targetMonth === 0) {
                    targetMonth = 12;
                    targetYear -= 1;
                }
            }
            const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
            for (let d = 1; d <= daysInTargetMonth; d++) {
                const dObj = new Date(Date.UTC(targetYear, targetMonth - 1, d, 12, 0, 0));
                const rawDay = dObj.getUTCDay();
                const dayIndex = (rawDay + 6) % 7; // 0 = Mon, 6 = Sun
                const dateKey = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                dates.push({ dateKey, dayIndex, year: targetYear, month: targetMonth, day: d });
            }
        }

        const firstDate = dates[0];
        const lastDate = dates[dates.length - 1];
        const startIso = getBratislavaUtcDate(firstDate.year, firstDate.month, firstDate.day, 0, 0, 0).toISOString();
        const endIso = getBratislavaUtcDate(lastDate.year, lastDate.month, lastDate.day, 23, 59, 59, 999).toISOString();

        // Výpočet koľkokrát sa ktorý deň v týždni vyskytuje v období
        const dayOccurrences = [0, 0, 0, 0, 0, 0, 0];
        const dateKeysByDayIndex: Record<number, string[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
        for (const d of dates) {
            dayOccurrences[d.dayIndex]++;
            dateKeysByDayIndex[d.dayIndex].push(d.dateKey);
        }

        // Určenie cieľových kurtov podľa filtra
        let targetCourts = ntcCourts;
        if (params?.courtId) {
            targetCourts = ntcCourts.filter((c) => c.id === params.courtId);
        } else if (params?.sport && params.sport !== "all") {
            targetCourts = ntcCourts.filter((c) => c.sport === params.sport);
        }
        if (!targetCourts.length) targetCourts = ntcCourts;
        const targetCourtIds = new Set(targetCourts.map((c) => c.id));

        // Získame rezervácie zo Supabase výhradne pre ohraničené obdobie
        const db = getCoreServiceDb();
        const { data: dbBookings, error: dbError } = await db
            .from("bookings")
            .select("id, court_id, notes, start_at, end_at, status")
            .eq("tenant_id", TENANT_ID)
            .neq("status", "cancelled")
            .gte("end_at", startIso)
            .lte("start_at", endIso);

        if (dbError) {
            throw new Error(`Database error: ${dbError.message}`);
        }

        // Inicializácia mapy obsadených kurtov pre každý deň a každú hodinu
        const occupiedMap: Record<string, Record<number, Set<string>>> = {};
        for (const d of dates) {
            occupiedMap[d.dateKey] = {};
            for (let h = 7; h <= 22; h++) {
                occupiedMap[d.dateKey][h] = new Set<string>();
            }
        }

        const courtHoursMap: Record<string, number> = {};
        const courtBookingsCountMap: Record<string, number> = {};

        const periodStartMs = new Date(startIso).getTime();
        const periodEndMs = new Date(endIso).getTime();

        for (const b of dbBookings || []) {
            const cId = resolveCourtId(b);
            if (!targetCourtIds.has(cId)) continue;

            const bStart = new Date(b.start_at);
            const bEnd = new Date(b.end_at);
            const bStartMs = bStart.getTime();
            const bEndMs = bEnd.getTime();
            if (bEndMs <= bStartMs) continue;

            // Spočítame skutočné odohrané hodiny na danom kurte v rámci zvoleného obdobia
            const effectiveStartMs = Math.max(bStartMs, periodStartMs);
            const effectiveEndMs = Math.min(bEndMs, periodEndMs);
            if (effectiveEndMs > effectiveStartMs) {
                const durHours = (effectiveEndMs - effectiveStartMs) / (1000 * 60 * 60);
                courtHoursMap[cId] = (courtHoursMap[cId] || 0) + durHours;
                courtBookingsCountMap[cId] = (courtBookingsCountMap[cId] || 0) + 1;
            }

            // Označíme každú obsadenú hodinu na kurte v príslušnom dátume
            for (const d of dates) {
                for (let h = 7; h <= 22; h++) {
                    const slotStart = getBratislavaUtcDate(d.year, d.month, d.day, h, 0, 0).getTime();
                    const slotEnd = getBratislavaUtcDate(d.year, d.month, d.day, h + 1, 0, 0).getTime();
                    if (bStartMs < slotEnd && bEndMs > slotStart) {
                        occupiedMap[d.dateKey][h].add(cId);
                    }
                }
            }
        }

        // Zostavenie 7 × 16 matice heatmapy
        const dayNames = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];
        const heatmap: HeatmapCell[] = [];

        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            const occurrences = dayOccurrences[dayIndex] || 1;
            const matchingDates = dateKeysByDayIndex[dayIndex] || [];

            for (let hour = 7; hour <= 22; hour++) {
                let sumOccupiedAcrossDates = 0;
                for (const dKey of matchingDates) {
                    sumOccupiedAcrossDates += occupiedMap[dKey]?.[hour]?.size || 0;
                }

                const averageOccupied = occurrences > 0 ? Math.round((sumOccupiedAcrossDates / occurrences) * 10) / 10 : 0;
                const totalCapacity = targetCourts.length;
                const maxPossibleSlots = totalCapacity * occurrences;
                const percentage = maxPossibleSlots > 0 ? Math.min(100, Math.round((sumOccupiedAcrossDates / maxPossibleSlots) * 100)) : 0;

                const isSingleCourt = Boolean(params?.courtId || targetCourts.length === 1);
                heatmap.push({
                    dayIndex,
                    dayName: dayNames[dayIndex],
                    hour,
                    occupiedCount: averageOccupied,
                    occupiedSlots: sumOccupiedAcrossDates,
                    occurrences,
                    totalCourts: totalCapacity,
                    percentage,
                    isSingleCourt,
                });
            }
        }

        // Zostavenie sumáru pre jednotlivé kurty
        const totalDaysInPeriod = dates.length;
        const totalPossibleCourtHours = totalDaysInPeriod * 16; // 16 hodín denne (7:00 - 23:00)

        const courtStats: CourtStatSummary[] = targetCourts.map((c) => {
            const occ = Math.round((courtHoursMap[c.id] || 0) * 10) / 10;
            const pct = totalPossibleCourtHours > 0 ? Math.min(100, Math.round((occ / totalPossibleCourtHours) * 100)) : 0;
            return {
                courtId: c.id,
                courtName: c.name,
                sport: c.sport,
                surface: c.surface,
                occupiedHours: occ,
                totalPossibleHours: totalPossibleCourtHours,
                utilizationPercent: pct,
                bookingsCount: courtBookingsCountMap[c.id] || 0,
            };
        }).sort((a, b) => b.occupiedHours - a.occupiedHours);

        return {
            success: true,
            period,
            sport: params?.sport || "all",
            courtId: params?.courtId || null,
            totalBookings: dbBookings?.length || 0,
            startDate: firstDate.dateKey,
            endDate: lastDate.dateKey,
            heatmap,
            courtStats,
        };
    } catch (e: any) {
        console.error("fetchCourtHeatmapAction failed:", e);
        return { success: false, error: e.message || "Nepodarilo sa načítať dáta vyťaženosti." };
    }
}

export async function updateBookingSubSlotsAction(
    bookingId: string,
    subSlots: BookingSubSlot[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getSession();
        if (!session) {
            return { success: false, error: "Neprihlásený používateľ." };
        }

        const allowedRoles = ["admin", "superadmin", "ntc_team", "reception"];
        if (!allowedRoles.includes(session.role || "")) {
            return { success: false, error: "Nemáte oprávnenie upravovať rozpis hráčov tejto rezervácie." };
        }

        const db = getCoreDb();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId);
        let query = db.from("bookings").select("id, court_id, notes, tenant_id, customer_name, start_at, end_at");
        query = isUuid ? query.eq("id", bookingId) : query.eq("calendar_event_id", bookingId);
        const { data: booking, error: findError } = await query.single();

        if (findError || !booking) {
            return { success: false, error: "Rezervácia nebola nájdená." };
        }

        let parsedNotes: Record<string, any> = {};
        try {
            parsedNotes = typeof booking.notes === "string" ? JSON.parse(booking.notes) : (booking.notes || {});
        } catch {
            parsedNotes = { notes: booking.notes || "" };
        }

        const parseTimeToMin = (tStr: string) => {
            const [h, m] = tStr.split(":").map(Number);
            return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
        };

        // Validate and sanitize sub-slots
        const sanitizedSubSlots: BookingSubSlot[] = [];
        for (const s of subSlots) {
            if (!s || typeof s.player !== "string" || !s.player.trim() || !s.from || !s.to) continue;
            const fromMin = parseTimeToMin(s.from);
            const toMin = parseTimeToMin(s.to);
            if (toMin <= fromMin) {
                return { success: false, error: `Čas ukončenia (${s.to}) musí byť neskorší ako začiatok (${s.from}) pre hráča "${s.player}".` };
            }
            sanitizedSubSlots.push({
                from: s.from.trim(),
                to: s.to.trim(),
                player: s.player.trim()
            });
        }

        parsedNotes.subSlots = sanitizedSubSlots;

        const { error: updateError } = await db
            .from("bookings")
            .update({ notes: JSON.stringify(parsedNotes) })
            .eq("id", booking.id);

        if (updateError) {
            console.error("updateBookingSubSlotsAction update error:", updateError);
            return { success: false, error: "Nepodarilo sa uložiť rozpis hráčov do databázy." };
        }

        try {
            await logActivity({
                action: "booking.sub_slots_update",
                category: "bookings",
                entityType: "booking",
                entityId: booking.id,
                entityName: `${booking.court_id || "kurt"} - ${booking.customer_name || "rezervácia"}`,
                description: `Aktualizovaný rozpis hráčov pre rezerváciu (${sanitizedSubSlots.length} položiek)`,
                changes: {
                    before: null,
                    after: {
                        subSlots: sanitizedSubSlots,
                    },
                },
                metadata: {
                    updated_by: session.email || session.userId || "",
                    sub_slots_count: sanitizedSubSlots.length,
                    customer_name: booking.customer_name,
                },
                tenantId: booking.tenant_id,
            });
        } catch (e) {
            console.warn("Failed to log activity for sub_slots_updated:", e);
        }

        revalidatePath("/newbookings");
        return { success: true };
    } catch (e: any) {
        console.error("updateBookingSubSlotsAction exception:", e);
        return { success: false, error: e.message || "Chyba pri ukladaní rozpisu." };
    }
}
