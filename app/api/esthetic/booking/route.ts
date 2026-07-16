import { NextResponse } from "next/server";
import { getCoreDb } from "@/lib/server/supabase";
import { revalidatePath } from "next/cache";

function getSlovakTimezoneOffset(dateStr: string): string {
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    const s = d.toLocaleString("en-US", { timeZone: "Europe/Bratislava", timeZoneName: "longOffset" });
    const match = s.match(/GMT([+-]\d+)/);
    if (match) {
      const hours = match[1];
      const sign = hours.startsWith("-") ? "-" : "+";
      const num = Math.abs(parseInt(hours)).toString().padStart(2, "0");
      return `${sign}${num}:00`;
    }
  } catch (e) {
    console.error("Error calculating timezone offset:", e);
  }
  return "+02:00"; // Default summer fallback
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { customer_name, phone, date, time, procedure_id, doctor_id } = body;

    // Validation
    if (!customer_name || !date || !time) {
      return NextResponse.json({ error: "Missing required parameters: customer_name, date, time" }, { status: 400 });
    }

    // Format date and time
    const dateMatch = date.match(/^\d{4}-\d{2}-\d{2}/);
    if (!dateMatch) {
      return NextResponse.json({ error: "Invalid date format. Expected YYYY-MM-DD" }, { status: 400 });
    }
    const formattedDate = dateMatch[0];

    const timeMatch = time.match(/^\d{2}:\d{2}/);
    if (!timeMatch) {
      return NextResponse.json({ error: "Invalid time format. Expected HH:MM" }, { status: 400 });
    }
    const formattedTime = timeMatch[0];

    // Calculate timezone-aware timestamps
    const offset = getSlovakTimezoneOffset(formattedDate);
    const startIso = `${formattedDate}T${formattedTime}:00${offset}`;
    
    // Set consultation duration to 30 minutes
    const startDate = new Date(startIso);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
    const endIso = endDate.toISOString();

    const db = getCoreDb();

    // Check availability first to assign a doctor if not specified or to verify conflict
    const { data: existingBookings, error: fetchError } = await db
      .from("bookings_esthetic")
      .select("doctor_id")
      .eq("status", "confirmed")
      .eq("start_at", startIso);

    if (fetchError) {
      console.error("Database check error:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const bookedDoctors = new Set(existingBookings?.map(b => b.doctor_id) || []);

    // Resolve doctor_id
    if (!doctor_id) {
      if (!bookedDoctors.has("vrbova")) {
        doctor_id = "vrbova";
      } else if (!bookedDoctors.has("stefankova")) {
        doctor_id = "stefankova";
      } else {
        return NextResponse.json({
          success: false,
          error: "Obidve lekárky sú v tomto čase už obsadené. Prosím, navrhnite iný čas."
        }, { status: 400 });
      }
    } else {
      // If doctor is specified, verify she is free
      if (bookedDoctors.has(doctor_id)) {
        return NextResponse.json({
          success: false,
          error: `MUDr. ${doctor_id === "vrbova" ? "Valová" : "Šimková"} je v tomto čase už obsadená.`
        }, { status: 400 });
      }
    }

    // Insert booking
    const { data: newBooking, error: insertError } = await db
      .from("bookings_esthetic")
      .insert({
        customer_name,
        customer_phone: phone || null,
        start_at: startIso,
        end_at: endIso,
        doctor_id,
        procedure_id: procedure_id || "consultation",
        status: "confirmed",
        source: "voice-assistant"
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Revalidate the esthetic page so it renders the new booked slot
    try {
      revalidatePath("/esthetic");
    } catch (e) {
      console.error("Failed to revalidate path /esthetic:", e);
    }

    const doctorName = doctor_id === "vrbova" ? "MUDr. Elena Valová" : "MUDr. Adriana Šimková";
    return NextResponse.json({
      success: true,
      message: `Termín bol úspešne zarezervovaný dňa ${formattedDate} o ${formattedTime} k lekárke ${doctorName}.`,
      booking: newBooking
    });
  } catch (err: any) {
    console.error("Booking API exception:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
