import type { BookingRole } from "@/lib/auth/bookingAuth";

export type RoleBookingPolicy = {
  role: BookingRole;
  maxBookingDurationMinutes: number;
  bookingHorizonDays: number;
  discountEurPerHour: number;
  cancellationDeadlineHours: number;
  isActive: boolean;
};

export function getDurationOptions(maxMinutes: number): number[] {
  const normalizedMax = Math.max(0, Math.floor(maxMinutes));
  const options = [30, 60, 90, 120].filter((minutes) => minutes <= normalizedMax);
  for (let minutes = 180; minutes <= normalizedMax; minutes += 60) options.push(minutes);
  return options;
}

export function isAllowedBookingDuration(durationMinutes: number, maxMinutes: number): boolean {
  return getDurationOptions(maxMinutes).includes(durationMinutes);
}

function getBratislavaDateParts(date: Date) {
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
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute") };
}

export function getBratislavaDateKey(date: Date): string {
  const { year, month, day } = getBratislavaDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getCourtOperatingLimitMinutes(courtId: string, start: Date): number {
  const { hour, minute } = getBratislavaDateParts(start);
  const minuteOfDay = hour * 60 + minute;
  let boundaryMinute = 22 * 60;

  if (["tennis-clay-1", "tennis-clay-2"].includes(courtId) && minuteOfDay < 14 * 60) {
    boundaryMinute = 13 * 60;
  }

  if (["tennis-clay-10", "tennis-clay-11"].includes(courtId)) {
    if (minuteOfDay < 8 * 60 || (minuteOfDay >= 12 * 60 && minuteOfDay < 13 * 60) || minuteOfDay >= 16 * 60 + 30) return 0;
    boundaryMinute = minuteOfDay < 12 * 60 ? 12 * 60 : 16 * 60 + 30;
  }

  return Math.max(0, boundaryMinute - minuteOfDay);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minút`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!remainder) return hours === 1 ? "1 hodina" : `${hours} hodiny`;
  return `${hours}:${String(remainder).padStart(2, "0")} hod.`;
}
