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
import { getBratislavaDateKey, getCourtOperatingLimitMinutes, isAllowedBookingDuration } from "@/lib/bookings/rolePolicy";



const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "595cbb6c-1019-41ae-b1c2-a60c13c8dcdf";

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

export async function fetchBookingsAction(startDateIso: string, endDateIso: string) {
    try {
        const db = getCoreServiceDb();
        
        console.log(`Fetching bookings from Supabase for NTC Tenant: ${TENANT_ID} from ${startDateIso} to ${endDateIso}`);
        
        const { data, error } = await db
            .from("bookings")
            .select("*")
            .eq("tenant_id", TENANT_ID)
            .gte("end_at", startDateIso)
            .lte("start_at", endDateIso);

        if (error) {
            throw new Error(`Database error: ${error.message}`);
        }

        // Fetch user metadata for bookings that have a user_id
        const userIds = Array.from(new Set((data || []).map((r) => r.user_id).filter(Boolean)));
        const userMap = new Map<string, { role: string; cardNumber?: string; name?: string }>();
        if (userIds.length > 0) {
            const { data: usersData } = await db
                .from("booking_users")
                .select("id, role, card_number, name")
                .in("id", userIds);
            if (usersData) {
                for (const u of usersData) {
                    userMap.set(u.id, { role: u.role, cardNumber: u.card_number || undefined, name: u.name });
                }
            }
        }

        // Map database events to booking objects
        const bookings = (data || []).map(row => {
            let notesObj: {
                courtId?: string;
                source?: string;
                notes?: string;
                multisportCardsCount?: number;
                rescheduled?: boolean;
                recurringGroupId?: string;
                clientPlayerName?: string;
            } = {
                courtId: "",
                source: "web",
                notes: "",
                multisportCardsCount: 0,
                rescheduled: false,
            };
            try {
                notesObj = { ...notesObj, ...JSON.parse(row.notes || "{}") };
            } catch (e) {
                console.error("Failed to parse notes JSON:", e);
            }
            const userMeta = row.user_id ? userMap.get(row.user_id) : undefined;
            const isRowAdminOrBlock =
                notesObj.source === "admin" ||
                userMeta?.role === "admin" ||
                row.status === "blocked" ||
                Boolean(row.customer_name && row.customer_name.toLowerCase().includes("údržba"));

            let finalCustomerName = notesObj.clientPlayerName || row.customer_name || userMeta?.name;
            if (isRowAdminOrBlock && !notesObj.clientPlayerName) {
                if (!finalCustomerName || finalCustomerName === "Admin User") {
                    finalCustomerName = "Údržba kurtov";
                }
            }

            return {
                id: row.id,
                courtId: notesObj.courtId || "badminton-1",
                title: isRowAdminOrBlock && (!notesObj.notes || notesObj.notes === "Údržba / Blokovanie" || notesObj.notes === "Údržba")
                    ? (finalCustomerName || "Údržba kurtov")
                    : (notesObj.notes || row.customer_name || "Rezervácia"),
                customerName: finalCustomerName,
                phone: row.customer_phone || undefined,
                start: row.start_at,
                end: row.end_at,
                status: row.status as "confirmed" | "blocked" | "cancelled",
                source: (notesObj.source || "web") as any,
                user_id: row.user_id || undefined,
                userRole: isRowAdminOrBlock ? "admin" : (userMeta?.role || "user"),
                userCardNumber: userMeta?.cardNumber,
                multisportCardsCount: Number(notesObj.multisportCardsCount || 0),
                priceEur: row.price_eur != null ? Number(row.price_eur) : undefined,
                isRescheduled: Boolean(notesObj.rescheduled),
                recurringGroupId: notesObj.recurringGroupId || undefined,
                clientPlayerName: notesObj.clientPlayerName || undefined,
            };
        });

        return { success: true, bookings };
    } catch (error: any) {
        console.error("fetchBookingsAction failed:", error);
        return { success: false, error: error.message || "Failed to load bookings" };
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
}) {
    try {
        const session = await getSession();
        if (!session) {
            return { success: false, error: "Pre vytvorenie rezervácie sa musíte prihlásiť." };
                }

        const db = getCoreDb();
        const serviceDb = getCoreServiceDb();
        const { data: bookingUser, error: userError } = await serviceDb
            .from("booking_users")
            .select("role, card_number")
            .eq("id", session.userId)
            .maybeSingle();
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

        const pricingResult = calculateNtcBookingPrice(
            payload.courtId,
            payload.start,
            durationMin,
            isRegistered,
            roleDiscountEurPerHour,
            multisportCount
        );
        const calculatedPrice = session.role === "admin" ? 0.00 : pricingResult.totalPriceEur;

        const notesObj = {
            courtId: payload.courtId,
            source: payload.source,
            notes: payload.title,
            multisportCardsCount: multisportCount,
            priceEur: calculatedPrice
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

        if (repeatFrequency === "daily") {
            let current = new Date(firstStart);
            while (current <= endDate && candidateSlots.length < 1500) {
                const slotEnd = new Date(current.getTime() + durationMs);
                const dateStr = new Intl.DateTimeFormat("sk-SK", {
                    day: "numeric", month: "numeric", year: "numeric"
                }).format(current);
                candidateSlots.push({ start: new Date(current), end: slotEnd, dateStr });
                current.setDate(current.getDate() + 1);
            }
        } else if (repeatFrequency === "monthly") {
            let current = new Date(firstStart);
            const originalDay = firstStart.getDate();
            while (current <= endDate && candidateSlots.length < 1500) {
                const slotEnd = new Date(current.getTime() + durationMs);
                const dateStr = new Intl.DateTimeFormat("sk-SK", {
                    day: "numeric", month: "numeric", year: "numeric"
                }).format(current);
                candidateSlots.push({ start: new Date(current), end: slotEnd, dateStr });

                current = new Date(current.getFullYear(), current.getMonth() + 1, originalDay, firstStart.getHours(), firstStart.getMinutes(), 0, 0);
            }
        } else if (repeatFrequency === "yearly") {
            let current = new Date(firstStart);
            while (current <= endDate && candidateSlots.length < 1500) {
                const slotEnd = new Date(current.getTime() + durationMs);
                const dateStr = new Intl.DateTimeFormat("sk-SK", {
                    day: "numeric", month: "numeric", year: "numeric"
                }).format(current);
                candidateSlots.push({ start: new Date(current), end: slotEnd, dateStr });

                current = new Date(current.getFullYear() + 1, current.getMonth(), current.getDate(), firstStart.getHours(), firstStart.getMinutes(), 0, 0);
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
                    const slotDate = new Date(currentWeekBase);
                    slotDate.setDate(slotDate.getDate() + dayOffset);
                    slotDate.setHours(firstStart.getHours(), firstStart.getMinutes(), 0, 0);

                    const slotEnd = new Date(slotDate.getTime() + durationMs);

                    if (slotDate.getTime() >= firstStart.getTime() && slotDate.getTime() <= endDate.getTime()) {
                        const dateStr = new Intl.DateTimeFormat("sk-SK", {
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

export async function fetchSeriesBookingsAction(recurringGroupId: string) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Neprihlásený používateľ." };

        const db = getCoreDb();
        const { data, error } = await db
            .from("bookings")
            .select("id, start_at, end_at, status, notes, customer_name, court_id")
            .eq("tenant_id", TENANT_ID)
            .order("start_at", { ascending: true });

        if (error) throw error;

        const matching = (data || []).filter(row => {
            try {
                const notes = typeof row.notes === "string" ? JSON.parse(row.notes) : (row.notes || {});
                return notes.recurringGroupId === recurringGroupId;
            } catch (e) {
                return false;
            }
        }).map(row => {
            let parsedNotes: any = {};
            try { parsedNotes = typeof row.notes === "string" ? JSON.parse(row.notes) : (row.notes || {}); } catch (e) {}
            return {
                id: row.id,
                courtId: row.court_id || parsedNotes.courtId,
                start: row.start_at,
                end: row.end_at,
                status: row.status,
                customerName: parsedNotes.clientPlayerName || row.customer_name,
                title: parsedNotes.notes || "Rezervácia",
                recurringGroupId,
                phone: parsedNotes.phone || undefined,
                user_id: parsedNotes.user_id || undefined,
                userRole: parsedNotes.userRole || undefined,
                source: parsedNotes.source || undefined,
                multisportCardsCount: parsedNotes.multisportCardsCount || 0,
                isRescheduled: parsedNotes.isRescheduled || false,
            };
        });

        return { success: true, bookings: matching };
    } catch (error: any) {
        console.error("fetchSeriesBookingsAction failed:", error);
        return { success: false, error: error.message || "Nepodarilo sa načítať termíny série." };
    }
}

export async function deleteBookingAction(id: string, deleteEntireSeries = false) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Nedostatočné oprávnenia." };

        const db = getCoreDb();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let query = db.from("bookings").select("id, user_id, start_at, tenant_id, notes");
        query = isUuid ? query.eq("id", id) : query.eq("calendar_event_id", id);
        const { data: booking, error: selectError } = await query.maybeSingle();

        if (selectError) throw new Error(`Database lookup error: ${selectError.message}`);
        if (!booking || booking.tenant_id !== TENANT_ID) {
            return { success: false, error: "Rezervácia sa nenašla." };
        }
        if (session.role !== "admin" && booking.user_id !== session.userId) {
            return { success: false, error: "Nemáte oprávnenie zrušiť túto rezerváciu." };
        }

        let notesObj: any = {};
        try {
            notesObj = typeof booking.notes === "string" ? JSON.parse(booking.notes) : (booking.notes || {});
        } catch (e) {
            notesObj = {};
        }

        if (deleteEntireSeries && notesObj.recurringGroupId) {
            const recurringGroupId = notesObj.recurringGroupId;
            const { data: seriesRows, error: seriesError } = await db
                .from("bookings")
                .select("id, notes, start_at")
                .eq("tenant_id", TENANT_ID)
                .neq("status", "cancelled")
                .gte("start_at", booking.start_at);

            if (seriesError) throw new Error(`Chyba pri hľadaní série: ${seriesError.message}`);

            const matchingIds = (seriesRows || []).filter(row => {
                try {
                    const rowNotes = typeof row.notes === "string" ? JSON.parse(row.notes) : (row.notes || {});
                    return rowNotes.recurringGroupId === recurringGroupId;
                } catch (e) {
                    return false;
                }
            }).map(row => row.id);

            if (matchingIds.length > 0) {
                const { error: cancelSeriesError } = await db
                    .from("bookings")
                    .update({ status: "cancelled" })
                    .in("id", matchingIds);

                if (cancelSeriesError) throw new Error(`Chyba pri rušení série: ${cancelSeriesError.message}`);
            }

            revalidatePath("/bookings");
            revalidatePath("/newbookings");
            revalidatePath("/dashboard/newbookings");
            return { success: true, deletedCount: matchingIds.length, cancelledSeries: true };
        }

        if (session.role !== "admin") {
            if (notesObj.rescheduled) {
                return { success: false, error: "Presunutú rezerváciu už nie je možné zrušiť. Máte však možnosť ju opätovne presunúť na iný termín." };
            }

            const policyDb = getCoreServiceDb();
            const { data: userPolicy, error: policyError } = await policyDb
                .from("booking_users")
                .select("role, role_booking_policies(cancellation_deadline_hours)")
                .eq("id", session.userId)
                .maybeSingle();
            if (policyError || !userPolicy) return { success: false, error: "Storno pravidlá sa nepodarilo overiť." };
            const joinedPolicy = Array.isArray(userPolicy.role_booking_policies) ? userPolicy.role_booking_policies[0] : userPolicy.role_booking_policies;
            const deadlineHours = Number(joinedPolicy?.cancellation_deadline_hours ?? 24);
            const cancellationDeadline = new Date(booking.start_at).getTime() - deadlineHours * 60 * 60 * 1000;
            if (Date.now() >= cancellationDeadline) {
                return { success: false, error: `Rezerváciu je možné zrušiť iba viac ako ${deadlineHours} hodín pred jej začiatkom.` };
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
            const { data: policyData } = await policyDb
                .from("booking_users")
                .select("role, card_number, role_booking_policies(booking_horizon_days, discount_eur_per_hour)")
                .eq("id", session.userId)
                .maybeSingle();

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

            const originalPrice = booking.price_eur != null
                ? Number(booking.price_eur)
                : calculateNtcBookingPrice(
                    booking.court_id || notesObj.courtId,
                    booking.start_at,
                    oldDurationMin,
                    isRegistered,
                    roleDiscount,
                    multisportCount
                ).totalPriceEur;

            const newPriceResult = calculateNtcBookingPrice(
                payload.newCourtId,
                payload.newStart,
                newDurationMin,
                isRegistered,
                roleDiscount,
                multisportCount
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

        revalidatePath("/bookings");
        return { success: true };
    } catch (error: any) {
        console.error("restoreBookingAction failed:", error);
        return { success: false, error: error.message || "Failed to restore booking" };
    }
}
