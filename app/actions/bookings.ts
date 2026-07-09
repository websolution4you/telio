"use server";

import { getCoreDb } from "@/lib/server/supabase";
import { 
    createCalendarEvent, 
    deleteCalendarEvent, 
    listCalendarEvents 
} from "@/lib/server/calendarAdapter";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/bookingAuth";

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
                status: row.status as "confirmed" | "blocked",
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
}) {
    try {
        const session = await getSession();
        if (!session) {
            return { success: false, error: "Pre vytvorenie rezervácie sa musíte prihlásiť." };
        }

        const db = getCoreDb();
        console.log(`Creating booking in Supabase for NTC Tenant: ${TENANT_ID}`);
        
        // Insert booking into Supabase
        const notesObj = {
            courtId: payload.courtId,
            source: payload.source,
            notes: payload.title
        };

        const { data: dbBooking, error: dbError } = await db
            .from("bookings")
            .insert({
                tenant_id: TENANT_ID,
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

        if (dbError) {
            throw new Error(`Database error: ${dbError.message}`);
        }

        revalidatePath("/bookings");
        return { 
            success: true, 
            booking: {
                id: dbBooking.id,
                user_id: session.userId,
                ...payload
            } 
        };
    } catch (error: any) {
        console.error("createBookingAction failed:", error);
        return { success: false, error: error.message || "Failed to create booking" };
    }
}

export async function deleteBookingAction(id: string) {
    try {
        const session = await getSession();
        if (!session) {
            return { success: false, error: "Nedostatočné oprávnenia." };
        }

        const db = getCoreDb();
        console.log(`Deleting booking ${id} for NTC Tenant: ${TENANT_ID}`);

        // Find booking in Supabase database to check permissions
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        
        let query = db.from("bookings").select("id, user_id");
        if (isUuid) {
            query = query.eq("id", id);
        } else {
            // If they pass some other ID type, fallback search
            query = query.eq("calendar_event_id", id);
        }

        const { data: dbBooking, error: selectErr } = await query.maybeSingle();

        if (selectErr) {
            console.error("Failed to select booking from database:", selectErr.message);
        }

        if (dbBooking && session.role !== 'admin' && dbBooking.user_id !== session.userId) {
            return { success: false, error: "Nemáte oprávnenie vymazať túto rezerváciu." };
        }

        const targetDbId = dbBooking?.id || (isUuid ? id : null);

        // Delete from Supabase
        if (targetDbId) {
            const { error: deleteErr } = await db
                .from("bookings")
                .delete()
                .eq("id", targetDbId);
            
            if (deleteErr) {
                throw new Error(`Database delete error: ${deleteErr.message}`);
            }
        } else if (id && !isUuid) {
            // Fallback attempt directly if we didn't find the record
            const { error: deleteErr } = await db
                .from("bookings")
                .delete()
                .eq("calendar_event_id", id);
            if (deleteErr) {
                throw new Error(`Database delete error: ${deleteErr.message}`);
            }
        }

        revalidatePath("/bookings");
        return { success: true };
    } catch (error: any) {
        console.error("deleteBookingAction failed:", error);
        return { success: false, error: error.message || "Failed to delete booking" };
    }
}

