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
    let requestedDate = "";
    try {
      const body = await req.json();
      requestedDate = body.requested_date || "";
    } catch (e) {
      // Body might be empty or not JSON, fallback to today
    }

    // Default to today if not provided
    if (!requestedDate) {
      const today = new Date();
      // Format as YYYY-MM-DD in Bratislava time
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Bratislava",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });
      requestedDate = formatter.format(today);
    } else {
      const dateMatch = requestedDate.match(/^\d{4}-\d{2}-\d{2}/);
      if (dateMatch) {
        requestedDate = dateMatch[0];
      } else {
        // Fallback to today if invalid
        const today = new Date();
        const formatter = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Europe/Bratislava",
          year: "numeric",
          month: "2-digit",
          day: "2-digit"
        });
        requestedDate = formatter.format(today);
      }
    }

    const db = getCoreDb();
    
    // We will query bookings for the next 14 days starting from requestedDate
    const startDate = new Date(`${requestedDate}T00:00:00`);
    const endDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    const { data: bookings, error } = await db
      .from("bookings_esthetic")
      .select("start_at, end_at, doctor_id")
      .eq("status", "confirmed")
      .gte("start_at", startIso)
      .lte("start_at", endIso);

    if (error) {
      console.error("Supabase error fetching availability:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create a busy map: [dateString_timeString_doctorId] -> true
    const busySlots = new Set<string>();
    const getBratislavaDateTimeKey = (isoString: string, doctorId: string) => {
      const date = new Date(isoString);
      const slovakDateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Bratislava",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(date);
      
      const slovakTimeStr = new Intl.DateTimeFormat("sk-SK", {
        timeZone: "Europe/Bratislava",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).format(date).replace(/\s/g, "").padStart(5, "0");

      return `${slovakDateStr}_${slovakTimeStr}_${doctorId}`;
    };

    bookings?.forEach((booking) => {
      const key = getBratislavaDateTimeKey(booking.start_at, booking.doctor_id);
      busySlots.add(key);
    });

    interface AvailableSlot {
      date: string;
      time: string;
      doctorId: string;
      doctorName: string;
      formattedDate: string;
    }

    const nextAvailableSlots: AvailableSlot[] = [];
    const checkDate = new Date(startDate);

    // Scan up to 14 days day-by-day
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      if (nextAvailableSlots.length >= 3) break;

      const dateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Bratislava",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(checkDate);

      // Check if it's a weekend (Saturday = 6, Sunday = 0)
      const dayOfWeek = checkDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (!isWeekend) {
        // Check slots for both doctors
        for (const time of CONSULTATION_HOURS) {
          if (nextAvailableSlots.length >= 3) break;

          const keyVrbova = `${dateStr}_${time}_vrbova`;
          const keyStefankova = `${dateStr}_${time}_stefankova`;

          // Format readable Slovak date (e.g. "pondelok 20. júla")
          const formatSlovakDate = (d: Date) => {
            const weekday = new Intl.DateTimeFormat("sk-SK", { weekday: "long" }).format(d);
            const dayNum = d.getDate();
            const month = new Intl.DateTimeFormat("sk-SK", { month: "long" }).format(d);
            return `${weekday} ${dayNum}. ${month}`;
          };

          const slovakDateStr = formatSlovakDate(checkDate);

          // Check doctor Elena Valová
          if (!busySlots.has(keyVrbova)) {
            nextAvailableSlots.push({
              date: dateStr,
              time,
              doctorId: "vrbova",
              doctorName: "MUDr. Elena Valová",
              formattedDate: slovakDateStr
            });
          }

          // Check doctor Adriana Šimková
          if (nextAvailableSlots.length < 3 && !busySlots.has(keyStefankova)) {
            nextAvailableSlots.push({
              date: dateStr,
              time,
              doctorId: "stefankova",
              doctorName: "MUDr. Adriana Šimková",
              formattedDate: slovakDateStr
            });
          }
        }
      }

      // Move to next day
      checkDate.setDate(checkDate.getDate() + 1);
    }

    let responseMessage = "";
    if (nextAvailableSlots.length === 0) {
      responseMessage = "Bohužiaľ, na najbližších 14 dní nemáme žiadne voľné konzultačné termíny. Prosím, kontaktujte recepciu.";
    } else {
      const slotTexts = nextAvailableSlots.map(
        (slot, idx) => `${idx + 1}. v ${slot.formattedDate} o ${slot.time} u lekárky ${slot.doctorName}`
      );
      responseMessage = `Našiel som nasledujúce 3 najbližšie voľné termíny na osobnú konzultáciu:\n` + 
                        slotTexts.join("\n") + 
                        `\nVyhovuje vám niektorý z nich?`;
    }

    return NextResponse.json({
      success: true,
      requested_date: requestedDate,
      available_slots: nextAvailableSlots,
      message: responseMessage
    });
  } catch (err: any) {
    console.error("Availability API exception:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
