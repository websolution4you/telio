import type { BookingRole } from "@/lib/auth/bookingAuth";

export type RoleBookingPolicy = {
  role: BookingRole;
  maxBookingDurationMinutes: number;
  bookingHorizonDays: number;
  discountEurPerHour: number;
  cancellationDeadlineHours: number;
  isActive: boolean;
  canMakeRecurring?: boolean;
};

export function getDurationOptions(maxMinutes: number): number[] {
  const normalizedMax = Math.max(0, Math.floor(maxMinutes));
  const options: number[] = [];
  for (let minutes = 30; minutes <= normalizedMax; minutes += 30) {
    options.push(minutes);
  }
  return options;
}

export function isAllowedBookingDuration(durationMinutes: number, maxMinutes: number): boolean {
  return getDurationOptions(maxMinutes).includes(durationMinutes);
}

export function getBratislavaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bratislava",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value || 0);
  const year = value("year");
  const month = value("month");
  const day = value("day");
  const hour = value("hour");
  const minute = value("minute");
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const rawDay = utcDate.getUTCDay();
  const dayOfWeek = (rawDay + 6) % 7; // 0 = Mon, ..., 6 = Sun
  return { year, month, day, hour, minute, dayOfWeek };
}

export function getBratislavaDateKey(date: Date): string {
  const { year, month, day } = getBratislavaDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function createBratislavaIso(dateInput: Date | string, hour: number, minute = 0): string {
  const d = typeof dateInput === "string"
    ? new Date(dateInput.includes("T") ? dateInput : `${dateInput}T12:00:00Z`)
    : new Date(dateInput);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bratislava",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const year = parts.find((p) => p.type === "year")?.value || "2026";
  const month = parts.find((p) => p.type === "month")?.value || "01";
  const day = parts.find((p) => p.type === "day")?.value || "01";
  const dateStr = `${year}-${month}-${day}`;

  const noonUtc = new Date(`${dateStr}T12:00:00Z`);
  const offParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Bratislava",
    timeZoneName: "longOffset",
  }).formatToParts(noonUtc);
  const offStr = offParts.find((p) => p.type === "timeZoneName")?.value || "GMT+1";
  const m = offStr.match(/GMT([+-]\d+)(?::(\d+))?/);
  const offHours = m ? parseInt(m[1], 10) : 1;
  const offMins = m && m[2] ? parseInt(m[2], 10) : 0;
  const totalOffMin = offHours * 60 + (offHours >= 0 ? offMins : -offMins);

  const utcTotalMin = hour * 60 + minute - totalOffMin;
  const utcDate = new Date(`${dateStr}T00:00:00Z`);
  utcDate.setUTCMinutes(utcTotalMin);
  return utcDate.toISOString();
}

export function getCourtOperatingLimitMinutes(courtId: string, start: Date): number {
  const { hour, minute } = getBratislavaDateParts(start);
  const minuteOfDay = hour * 60 + minute;
  let boundaryMinute = 22 * 60;

  if (["tennis-clay-10", "tennis-clay-11"].includes(courtId)) {
    if (minuteOfDay < 8 * 60 || minuteOfDay >= 16 * 60 + 30) return 0;
    boundaryMinute = 16 * 60 + 30;
  }

  return Math.max(0, boundaryMinute - minuteOfDay);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minút`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  const hourWord = (h: number) => {
    if (h === 1) return "hodina";
    if (h >= 2 && h <= 4) return "hodiny";
    return "hodín";
  };
  if (!remainder) return `${hours} ${hourWord(hours)}`;
  return `${hours}:${String(remainder).padStart(2, "0")} hod.`;
}
