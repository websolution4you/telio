"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Clock, Mic2, RefreshCw, ShieldCheck } from "lucide-react";
import type { Booking, Court, SportType } from "@/lib/bookings/mockBookings";
import { openingHours } from "@/lib/bookings/mockBookings";

type BookingCalendarProps = {
  courts: Court[];
  bookings: Booking[];
};

const sportLabels: Record<SportType | "all", string> = {
  all: "Všetky kurty",
  tennis: "Tenis",
  badminton: "Bedminton",
};

const statusStyles = {
  confirmed: {
    label: "Potvrdené",
    bg: "rgba(0,255,209,0.16)",
    border: "rgba(0,255,209,0.35)",
    color: "#00FFD1",
  },
  pending: {
    label: "Čaká na potvrdenie",
    bg: "rgba(245,158,11,0.14)",
    border: "rgba(245,158,11,0.35)",
    color: "#FBBF24",
  },
  blocked: {
    label: "Blokované",
    bg: "rgba(123,97,255,0.16)",
    border: "rgba(123,97,255,0.35)",
    color: "#A78BFA",
  },
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("sk-SK", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("sk-SK", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getBookingOffset(startIso: string) {
  const date = new Date(startIso);
  const minutesFromOpen = (date.getHours() - openingHours.startHour) * 60 + date.getMinutes();
  const totalMinutes = (openingHours.endHour - openingHours.startHour) * 60;
  return Math.max(0, Math.min(100, (minutesFromOpen / totalMinutes) * 100));
}

function getBookingWidth(startIso: string, endIso: string) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const totalMinutes = (openingHours.endHour - openingHours.startHour) * 60;
  const durationMinutes = Math.max(30, (end - start) / 60000);
  return Math.max(5, Math.min(100, (durationMinutes / totalMinutes) * 100));
}

export default function BookingCalendar({ courts, bookings }: BookingCalendarProps) {
  const [selectedSport, setSelectedSport] = useState<SportType | "all">("all");
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(bookings[0] ?? null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfDay(new Date()), index)), []);
  const hours = useMemo(
    () => Array.from({ length: openingHours.endHour - openingHours.startHour + 1 }, (_, index) => openingHours.startHour + index),
    []
  );

  const visibleCourts = useMemo(() => {
    return selectedSport === "all" ? courts : courts.filter((court) => court.sport === selectedSport);
  }, [courts, selectedSport]);

  const visibleBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const court = courts.find((item) => item.id === booking.courtId);
      if (!court) return false;
      if (selectedSport !== "all" && court.sport !== selectedSport) return false;
      return sameDay(new Date(booking.start), selectedDate);
    });
  }, [bookings, courts, selectedDate, selectedSport]);

  const activeUtilization = Math.round((visibleBookings.length / Math.max(1, visibleCourts.length * 4)) * 100);

  return (
    <section className="relative" style={{ maxWidth: "86rem", margin: "0 auto", padding: "0 2rem 6rem" }}>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div
          className="rounded-[28px] border overflow-hidden"
          style={{ background: "rgba(12,12,20,0.78)", borderColor: "var(--border)", boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}
        >
          <div className="flex flex-col gap-5 border-b p-5 md:p-6" style={{ borderColor: "var(--border)" }}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "var(--cyan)" }}>
                  <CalendarDays className="h-4 w-4" /> Live rezervačný kalendár
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-white md:text-3xl" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>
                  Dostupnosť kurtov v NTC Bratislava
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {(["all", "tennis", "badminton"] as const).map((sport) => (
                  <button
                    key={sport}
                    onClick={() => setSelectedSport(sport)}
                    className="rounded-full border px-4 py-2 text-sm font-semibold transition-all"
                    style={{
                      cursor: "pointer",
                      borderColor: selectedSport === sport ? "rgba(0,255,209,0.45)" : "var(--border)",
                      background: selectedSport === sport ? "rgba(0,255,209,0.12)" : "rgba(255,255,255,0.03)",
                      color: selectedSport === sport ? "var(--cyan)" : "var(--text-muted)",
                    }}
                  >
                    {sportLabels[sport]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map((day) => {
                const active = sameDay(day, selectedDate);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className="min-w-[120px] rounded-2xl border px-4 py-3 text-left transition-all"
                    style={{
                      cursor: "pointer",
                      borderColor: active ? "rgba(123,97,255,0.55)" : "var(--border)",
                      background: active ? "rgba(123,97,255,0.18)" : "rgba(255,255,255,0.03)",
                      color: active ? "white" : "var(--text-muted)",
                    }}
                  >
                    <span className="block text-xs uppercase tracking-wide opacity-70">{sameDay(day, startOfDay(new Date())) ? "Dnes" : "Deň"}</span>
                    <span className="mt-1 block text-sm font-bold capitalize">{formatDate(day)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <div style={{ minWidth: "980px" }}>
              <div className="grid border-b" style={{ gridTemplateColumns: "190px 1fr", borderColor: "var(--border)" }}>
                <div className="border-r p-4 text-xs font-bold uppercase tracking-[0.16em]" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                  Kurt
                </div>
                <div className="grid" style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(58px, 1fr))` }}>
                  {hours.map((hour) => (
                    <div key={hour} className="border-r p-4 text-center text-xs font-semibold" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                      {hour}:00
                    </div>
                  ))}
                </div>
              </div>

              <div>
                {visibleCourts.map((court) => {
                  const courtBookings = visibleBookings.filter((booking) => booking.courtId === court.id);
                  return (
                    <div key={court.id} className="grid min-h-[76px] border-b" style={{ gridTemplateColumns: "190px 1fr", borderColor: "var(--border)" }}>
                      <div className="flex flex-col justify-center border-r px-4" style={{ borderColor: "var(--border)" }}>
                        <span className="text-sm font-bold text-white">{court.name}</span>
                        <span className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{court.surface}</span>
                      </div>
                      <div className="relative grid" style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(58px, 1fr))` }}>
                        {hours.map((hour) => (
                          <div key={hour} className="border-r" style={{ borderColor: "rgba(255,255,255,0.035)" }} />
                        ))}
                        {courtBookings.map((booking) => {
                          const style = statusStyles[booking.status];
                          return (
                            <button
                              key={booking.id}
                              onClick={() => setSelectedBooking(booking)}
                              className="absolute top-3 bottom-3 rounded-2xl border px-3 text-left transition-all hover:scale-[1.01]"
                              style={{
                                left: `${getBookingOffset(booking.start)}%`,
                                width: `${getBookingWidth(booking.start, booking.end)}%`,
                                minWidth: "92px",
                                background: style.bg,
                                borderColor: style.border,
                                color: style.color,
                                cursor: "pointer",
                                boxShadow: "0 10px 28px rgba(0,0,0,0.22)",
                              }}
                            >
                              <span className="block truncate text-xs font-black">{booking.title}</span>
                              <span className="mt-1 block truncate text-[11px] text-white/75">{formatTime(booking.start)}–{formatTime(booking.end)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[28px] border p-6" style={{ background: "rgba(12,12,20,0.78)", borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "var(--cyan)" }}>
              <RefreshCw className="h-4 w-4" /> Google Calendar sync
            </div>
            <p className="mt-4 text-sm leading-6" style={{ color: "var(--text-muted)" }}>
              Táto stránka je pripravená na napojenie na Google Calendar API. Telio bude vedieť kontrolovať voľné sloty, vytvárať rezervácie a frontend ich zobrazí v tomto kalendári.
            </p>
            <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: "rgba(0,255,209,0.18)", background: "rgba(0,255,209,0.05)" }}>
              <div className="text-3xl font-black text-white">{activeUtilization}%</div>
              <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>Orientačné vyťaženie vybraného dňa</div>
            </div>
          </div>

          <div className="rounded-[28px] border p-6" style={{ background: "rgba(12,12,20,0.78)", borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "#A78BFA" }}>
              <Mic2 className="h-4 w-4" /> Telio voice flow
            </div>
            <ul className="mt-4 space-y-3 text-sm" style={{ color: "var(--text-muted)" }}>
              <li>1. Zákazník zavolá a povie šport, dátum a čas.</li>
              <li>2. Telio preverí dostupnosť kurtov v Google kalendári.</li>
              <li>3. Po potvrdení vytvorí rezerváciu.</li>
              <li>4. Web zobrazí rezerváciu v reálnom kalendári.</li>
            </ul>
          </div>

          <div className="rounded-[28px] border p-6" style={{ background: "rgba(12,12,20,0.78)", borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "var(--cyan)" }}>
              <ShieldCheck className="h-4 w-4" /> Detail rezervácie
            </div>
            {selectedBooking ? (
              <div className="mt-4 space-y-3">
                <div>
                  <div className="text-lg font-bold text-white">{selectedBooking.title}</div>
                  <div className="text-sm" style={{ color: "var(--text-muted)" }}>{selectedBooking.customerName}</div>
                </div>
                <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.03)", color: "var(--text-muted)" }}>
                  <div className="flex items-center gap-2 text-white"><Clock className="h-4 w-4" /> {formatTime(selectedBooking.start)} – {formatTime(selectedBooking.end)}</div>
                  <div className="mt-2">Zdroj: {selectedBooking.source}</div>
                  {selectedBooking.phone && <div className="mt-2">Tel.: {selectedBooking.phone}</div>}
                </div>
                <span
                  className="inline-flex rounded-full border px-3 py-1 text-xs font-bold"
                  style={{
                    borderColor: statusStyles[selectedBooking.status].border,
                    color: statusStyles[selectedBooking.status].color,
                    background: statusStyles[selectedBooking.status].bg,
                  }}
                >
                  {statusStyles[selectedBooking.status].label}
                </span>
              </div>
            ) : (
              <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>Vyberte rezerváciu v kalendári.</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}