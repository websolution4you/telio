"use server";

import { getCoreDb, getCoreServiceDb } from "@/lib/server/supabase";
import { 
    createCalendarEvent, 
    deleteCalendarEvent, 
    listCalendarEvents 
} from "@/lib/server/calendarAdapter";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/bookingAuth";
import { walletEnabledForUser } from "@/lib/server/wallet";


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
        const db = getCoreDb();
        
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

        // Map database events to booking objects
        const bookings = (data || []).map(row => {
            let notesObj = { courtId: "", source: "web", notes: "" };
            try {
                notesObj = JSON.parse(row.notes || "{}");
            } catch (e) {
                console.error("Failed to parse notes JSON:", e);
            }
            return {
                id: row.id,
                courtId: notesObj.courtId || "badminton-1",
                title: notesObj.notes || row.customer_name || "Rezervácia",
                customerName: row.customer_name,
                phone: row.customer_phone || undefined,
                start: row.start_at,
                end: row.end_at,
                status: row.status as "confirmed" | "blocked" | "cancelled",
                source: (notesObj.source || "web") as any,
                user_id: row.user_id || undefined
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
}) {
    try {
        const session = await getSession();
        if (!session) {
            return { success: false, error: "Pre vytvorenie rezervácie sa musíte prihlásiť." };
        }

        if (payload.source !== "admin") {
            const now = new Date();
            const maxAllowedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14, 23, 59, 59, 999);
            const bookingStart = new Date(payload.start);

            if (bookingStart > maxAllowedDate) {
                return { success: false, error: "Rezerváciu je možné vytvoriť maximálne 14 dní vopred." };
            }
        }

        const db = getCoreDb();
        console.log(`Creating booking in Supabase for NTC Tenant: ${TENANT_ID}`);
        
        // 1. Check for overlapping bookings in Supabase for the same court
        const bookingStartMs = new Date(payload.start).getTime();
        const bookingEndMs = new Date(payload.end).getTime();

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

                const notesObj = {
            courtId: payload.courtId,
            source: payload.source,
            notes: payload.title
        };
        const useWallet = payload.source !== "admin" && walletEnabledForUser(session.userId);

        let bookingId: string;
        let wallet: { chargedEur: number; balanceEur: number; created: boolean } | undefined;
        if (useWallet) {
            if (!payload.operationId) {
                return { success: false, error: "Chýba identifikátor rezervácie. Skúste to znova." };
            }
            const sport = payload.courtId.replace(/-\d+$/, "");
            const walletDb = getCoreServiceDb();
            const { data, error } = await walletDb.rpc("wallet_create_ntc_booking", {
                p_user_id: session.userId,
                p_court_id: payload.courtId,
                p_sport: sport,
                p_customer_name: payload.customerName,
                p_customer_phone: payload.phone || "",
                p_start_at: payload.start,
                p_end_at: payload.end,
                p_notes: JSON.stringify(notesObj),
                p_idempotency_key: payload.operationId,
            });
            if (error) {
                const message = error.message.toLowerCase();
                if (message.includes("insufficient wallet balance")) {
                    return { success: false, error: "Nedostatočný zostatok v peňaženke." };
                }
                if (message.includes("no longer available")) {
                    return { success: false, error: "Vybraný kurt je už obsadený." };
                }
                throw new Error(`Wallet booking error: ${error.message}`);
            }
            const result = data?.[0];
            if (!result) throw new Error("Wallet booking did not return a result");
            bookingId = result.booking_id;
            wallet = {
                chargedEur: Number(result.charged_eur),
                balanceEur: Number(result.balance_eur),
                created: Boolean(result.created),
            };
        } else {
            const { data: dbBooking, error: dbError } = await db
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
                    user_id: session.userId
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

export async function deleteBookingAction(id: string) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Nedostatočné oprávnenia." };

        const db = getCoreDb();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let query = db.from("bookings").select("id, user_id, start_at, tenant_id");
        query = isUuid ? query.eq("id", id) : query.eq("calendar_event_id", id);
        const { data: booking, error: selectError } = await query.maybeSingle();

        if (selectError) throw new Error(`Database lookup error: ${selectError.message}`);
        if (!booking || booking.tenant_id !== TENANT_ID) {
            return { success: false, error: "Rezervácia sa nenašla." };
        }
        if (session.role !== "admin" && booking.user_id !== session.userId) {
            return { success: false, error: "Nemáte oprávnenie zrušiť túto rezerváciu." };
        }
        if (session.role !== "admin") {
            const cancellationDeadline = new Date(booking.start_at).getTime() - 24 * 60 * 60 * 1000;
            if (Date.now() >= cancellationDeadline) {
                return { success: false, error: "Rezerváciu je možné zrušiť iba viac ako 24 hodín pred jej začiatkom." };
            }
        }

        let wallet: { refundedEur: number; balanceEur: number; refunded: boolean } | undefined;
                const walletDb = getCoreServiceDb();
        const { data: charge, error: chargeError } = await walletDb
            .from("wallet_transactions")
            .select("id")
            .eq("booking_id", booking.id)
            .eq("type", "booking_charge")
            .maybeSingle();
        if (chargeError) throw new Error(`Wallet lookup error: ${chargeError.message}`);

        if (charge) {
            const { data, error } = await walletDb.rpc("wallet_refund_ntc_booking", {
                p_booking_id: booking.id,
            });
            if (error) throw new Error(`Wallet refund error: ${error.message}`);
            const result = data?.[0];
            if (!result) throw new Error("Wallet refund did not return a result");
            wallet = {
                refundedEur: Number(result.refunded_eur),
                balanceEur: Number(result.balance_eur),
                refunded: Boolean(result.refunded),
            };
        } else {
            const { error } = await db
                .from("bookings")
                .update({ status: "cancelled" })
                .eq("id", booking.id);
            if (error) throw new Error(`Database update error: ${error.message}`);
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
                user_id: row.user_id
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
            
            const price = calculateBookingPrice(notesObj.courtId || "unknown", row.start_at, row.end_at, hasCard);
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
