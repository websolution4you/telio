import { NextResponse } from "next/server";
import { getCoreDb } from "@/lib/server/supabase";

const CONSULTATION_HOURS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00"
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { requested_date } = body;

    if (!requested_date) {
      return NextResponse.json({ error: "Missing requested_date parameter" }, { status: 400 });
    }

    // Format requested date to YYYY-MM-DD
    const dateMatch = requested_date.match(/^\d{4}-\d{2}-\d{2}/);
    if (!dateMatch) {
      return NextResponse.json({ error: "Invalid date format. Expected YYYY-MM-DD" }, { status: 400 });
    }
    const formattedDate = dateMatch[0];

    const db = getCoreDb();

    // Query all bookings for the requested day
    const { data: bookings, error } = await db
      .from("bookings_esthetic")
      .select("start_at, end_at, doctor_id")
      .eq("status", "confirmed")
      .gte("start_at", `${formattedDate}T00:00:00.000Z`)
      .lte("start_at", `${formattedDate}T23:59:59.999Z`);

    if (error) {
      console.error("Supabase error fetching availability:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const doctorBookings = {
      vrbova: new Set<string>(),
      stefankova: new Set<string>()
    };

    // Helper to extract HH:MM from timestamptz
    const getHourMinute = (isoString: string) => {
      const date = new Date(isoString);
      // Format as HH:MM in Europe/Bratislava (CET/CEST) timezone
      const formatter = new Intl.DateTimeFormat("sk-SK", {
        timeZone: "Europe/Bratislava",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
      return formatter.format(date).replace(/\s/g, ""); // e.g. "09:00" or "9:00" -> sanitize to "09:00" format
    };

    bookings?.forEach((booking) => {
      const timeStr = getHourMinute(booking.start_at);
      // Normalize single-digit hours (e.g. "9:00" -> "09:00")
      const normalizedTime = timeStr.padStart(5, "0");
      const doc = booking.doctor_id as "vrbova" | "stefankova";
      if (doctorBookings[doc]) {
        doctorBookings[doc].add(normalizedTime);
      }
    });

    const availabilitySummary: string[] = [];

    // Check availability for MUDr. Elena Valová
    const freeVrbova = CONSULTATION_HOURS.filter(time => !doctorBookings.vrbova.has(time));
    if (freeVrbova.length > 0) {
      availabilitySummary.push(`MUDr. Elena Valová má voľné termíny: ${freeVrbova.join(", ")}.`);
    } else {
      availabilitySummary.push(`MUDr. Elena Valová nemá na tento deň žiadne voľné termíny.`);
    }

    // Check availability for MUDr. Adriana Šimková
    const freeStefankova = CONSULTATION_HOURS.filter(time => !doctorBookings.stefankova.has(time));
    if (freeStefankova.length > 0) {
      availabilitySummary.push(`MUDr. Adriana Šimková má voľné termíny: ${freeStefankova.join(", ")}.`);
    } else {
      availabilitySummary.push(`MUDr. Adriana Šimková nemá na tento deň žiadne voľné termíny.`);
    }

    const responseText = `Pre dátum ${formattedDate} sú k dispozícii nasledovné možnosti:\n` + availabilitySummary.join("\n");

    return NextResponse.json({
      success: true,
      requested_date: formattedDate,
      free_slots: {
        vrbova: freeVrbova,
        stefankova: freeStefankova
      },
      message: responseText
    });
  } catch (err: any) {
    console.error("Availability API exception:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
