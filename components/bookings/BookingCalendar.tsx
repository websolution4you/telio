"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { CalendarDays, Clock, Mic2, RefreshCw, ShieldCheck, Globe, User, Shield, HelpCircle, PhoneCall, Plus, Play, Sparkles } from "lucide-react";
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

const SourceIcon = ({ source, className }: { source: string; className?: string }) => {
  switch (source) {
    case "voice-assistant":
      return <Mic2 className={className} />;
    case "web":
      return <Globe className={className} />;
    case "admin":
      return <ShieldCheck className={className} />;
    case "google-calendar":
      return <CalendarDays className={className} />;
    default:
      return <HelpCircle className={className} />;
  }
};

function getBookingOffset(startIso: string, startHour: number, totalHours: number) {
  const date = new Date(startIso);
  const minutesFromOpen = (date.getHours() - startHour) * 60 + date.getMinutes();
  const totalMinutes = totalHours * 60;
  return Math.max(0, Math.min(100, (minutesFromOpen / totalMinutes) * 100));
}

function getBookingWidth(startIso: string, endIso: string, totalHours: number) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const totalMinutes = totalHours * 60;
  const durationMinutes = Math.max(30, (end - start) / 60000);
  return Math.max(5, Math.min(100, (durationMinutes / totalMinutes) * 100));
}

export default function BookingCalendar({ courts, bookings }: BookingCalendarProps) {
  const [selectedSport, setSelectedSport] = useState<SportType | "all">("all");
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  
  // Interactive Local state for bookings
  const [localBookings, setLocalBookings] = useState<Booking[]>(() => bookings);
  
  useEffect(() => {
    setLocalBookings(bookings);
  }, [bookings]);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfDay(new Date()), index)), []);
  const hours = useMemo(
    () => Array.from({ length: openingHours.endHour - openingHours.startHour + 1 }, (_, index) => openingHours.startHour + index),
    []
  );

  const visibleCourts = useMemo(() => {
    return selectedSport === "all" ? courts : courts.filter((court) => court.sport === selectedSport);
  }, [courts, selectedSport]);

  const visibleBookings = useMemo(() => {
    return localBookings.filter((booking) => {
      const court = courts.find((item) => item.id === booking.courtId);
      if (!court) return false;
      if (selectedSport !== "all" && court.sport !== selectedSport) return false;
      return sameDay(new Date(booking.start), selectedDate);
    });
  }, [localBookings, courts, selectedDate, selectedSport]);

  // Auto-select first booking when bookings load or change
  useEffect(() => {
    if (visibleBookings.length > 0) {
      setSelectedBooking(visibleBookings[0]);
    } else {
      setSelectedBooking(null);
    }
  }, [visibleBookings]);

  const activeUtilization = Math.round((visibleBookings.length / Math.max(1, visibleCourts.length * 4)) * 100);

  // Voice Simulation State & Refs
  const [simStep, setSimStep] = useState<number>(-1); // -1: not started, 0..3: active steps, -2: complete
  const [simLogs, setSimLogs] = useState<Array<{ sender: "user" | "telio"; text: string }>>([]);
  const simTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up simulation timeout on component unmount
  useEffect(() => {
    return () => {
      if (simTimeoutRef.current) {
        clearTimeout(simTimeoutRef.current);
      }
    };
  }, []);

  const startSimulation = () => {
    // Clear any running simulation timeout
    if (simTimeoutRef.current) {
      clearTimeout(simTimeoutRef.current);
    }
    
    setSimStep(0);
    setSimLogs([]);
    
    const script = [
      { sender: "user" as const, text: "Dobrý deň, chcel by som rezervovať tenisový kurt na dnešok o 14:00." },
      { sender: "telio" as const, text: "Dobrý deň! Preverujem dostupnosť v Google kalendári... Našiel som voľný Tenisový kurt 2 od 14:00 do 15:00. Mám pre vás vytvoriť rezerváciu na meno Kamil Bartko?" },
      { sender: "user" as const, text: "Áno, poprosím." },
      { sender: "telio" as const, text: "Skvelé! Rezervácia na Tenisový kurt 2 od 14:00 je potvrdená. Práve som ju zapísal do Google kalendára." }
    ];

    let current = 0;
    const nextStep = () => {
      if (current < script.length) {
        const nextLog = script[current];
        if (nextLog) {
          setSimLogs((prev) => [...prev, nextLog]);
        }
        setSimStep(current + 1);
        current++;
        const delays = [2200, 2600, 1600, 2000];
        simTimeoutRef.current = setTimeout(nextStep, delays[current - 1] || 2000);
      } else {
        const bookingTime = new Date(selectedDate);
        bookingTime.setHours(14, 0, 0, 0);
        
        const voiceBooking: Booking = {
          id: `voice-sim-${Date.now()}`,
          courtId: "tennis-2",
          title: "Dvojhra — Bartko (Hlas)",
          customerName: "Kamil Bartko",
          phone: "+421 905 999 888",
          start: bookingTime.toISOString(),
          end: new Date(bookingTime.getTime() + 60 * 60000).toISOString(),
          status: "confirmed",
          source: "voice-assistant",
        };

        setLocalBookings((prev) => {
          if (prev.some(b => b.courtId === "tennis-2" && sameDay(new Date(b.start), selectedDate) && new Date(b.start).getHours() === 14)) {
            return prev;
          }
          return [...prev, voiceBooking];
        });
        setSelectedBooking(voiceBooking);
        setSimStep(-2); // finished
      }
    };

    simTimeoutRef.current = setTimeout(nextStep, 600);
  };

  // Booking Creation Modal State
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [newBookingData, setNewBookingData] = useState<{
    courtId: string;
    courtName: string;
    sport: SportType;
    hour: number;
    duration: number;
    customerName: string;
    phone: string;
    title: string;
  } | null>(null);

  const handleCellClick = (court: Court, hour: number) => {
    const cellTime = new Date(selectedDate);
    cellTime.setHours(hour, 0, 0, 0);
    
    const isOccupied = localBookings.some((b) => {
      if (b.courtId !== court.id) return false;
      const bStart = new Date(b.start).getTime();
      const bEnd = new Date(b.end).getTime();
      const targetTime = cellTime.getTime();
      return targetTime >= bStart && targetTime < bEnd;
    });

    if (isOccupied) return;

    setNewBookingData({
      courtId: court.id,
      courtName: court.name,
      sport: court.sport,
      hour: hour,
      duration: 1.0,
      customerName: "",
      phone: "",
      title: court.sport === "tennis" ? "Dvojhra — Tenis" : "Bedminton — štvorhra",
    });
    setIsNewBookingOpen(true);
  };

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookingData) return;

    const startDateTime = new Date(selectedDate);
    startDateTime.setHours(newBookingData.hour, 0, 0, 0);

    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + newBookingData.duration * 60);

    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      courtId: newBookingData.courtId,
      title: newBookingData.title || (newBookingData.sport === "tennis" ? "Tenis" : "Bedminton"),
      customerName: newBookingData.customerName || "Anonymný zákazník",
      phone: newBookingData.phone,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      status: "confirmed",
      source: "web",
    };

    setLocalBookings((prev) => [...prev, newBooking]);
    setSelectedBooking(newBooking);
    setIsNewBookingOpen(false);
    setNewBookingData(null);
  };

  return (
    <section className="relative mx-auto px-8" style={{ maxWidth: "76rem", margin: "6rem auto 0", paddingBottom: "6rem" }}>
      {/* Centered Heading Section */}
      <div className="text-center mb-14 flex flex-col items-center w-full">
        <div className="inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.2em] mb-4 rounded-full border px-4 py-2" style={{ borderColor: "rgba(0,255,209,0.2)", background: "rgba(0,255,209,0.04)", color: "var(--cyan)" }}>
          <CalendarDays className="h-4 w-4" /> Live rezervačný kalendár
        </div>
        <h2 className="text-3xl font-semibold text-white md:text-5xl" style={{ fontFamily: "var(--font-poppins), sans-serif", letterSpacing: "-0.03em" }}>
          Dostupnosť kurtov v NTC Bratislava
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 md:text-base" style={{ color: "var(--text-muted)" }}>
          Prehľad voľných a obsadených časov pre tenis a bedminton. Kliknite na prázdne políčko pre okamžitú rezerváciu, alebo vyskúšajte simuláciu hlasového asistenta v pravom paneli.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div
          className="rounded-[28px] border overflow-hidden"
          style={{ background: "rgba(12,12,20,0.78)", borderColor: "var(--border)", boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}
        >
          <div className="flex flex-col items-center gap-6 border-b p-6 md:p-8" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.01)" }}>
            {/* Sport selection filters */}
            <div className="flex flex-wrap justify-center gap-2.5">
              {(["all", "tennis", "badminton"] as const).map((sport) => (
                <button
                  key={sport}
                  onClick={() => setSelectedSport(sport)}
                  className="rounded-full border px-5 py-2.5 text-sm font-semibold transition-all hover:bg-white/[0.05]"
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

            {/* Date selection filters */}
            <div className="flex gap-3 overflow-x-auto justify-center w-full pb-2 scrollbar-thin">
              {days.map((day) => {
                const active = sameDay(day, selectedDate);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className="min-w-[125px] rounded-2xl border px-4 py-3.5 text-center transition-all hover:bg-white/[0.04]"
                    style={{
                      cursor: "pointer",
                      borderColor: active ? "rgba(123,97,255,0.55)" : "var(--border)",
                      background: active ? "rgba(123,97,255,0.18)" : "rgba(255,255,255,0.03)",
                      color: active ? "white" : "var(--text-muted)",
                    }}
                  >
                    <span className="block text-[10px] uppercase tracking-wider opacity-60 font-bold">{sameDay(day, startOfDay(new Date())) ? "Dnes" : "Deň"}</span>
                    <span className="mt-1.5 block text-sm font-extrabold capitalize">{formatDate(day)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--border)" }}>
            <div style={{ minWidth: `${190 + hours.length * 90}px` }}>
              {/* Sticky Time Header */}
              <div
                className="grid border-b sticky top-[68px] z-20"
                style={{
                  gridTemplateColumns: "190px 1fr",
                  borderColor: "var(--border)",
                  background: "rgba(12, 12, 20, 0.95)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div
                  className="border-r p-4 text-xs font-bold uppercase tracking-[0.16em] sticky left-0 z-30"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text-muted)",
                    background: "rgba(12, 12, 20, 0.95)",
                  }}
                >
                  Kurt
                </div>
                <div className="grid" style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(90px, 1fr))` }}>
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
                      {/* Sticky court label column */}
                      <div
                        className="flex flex-col justify-center border-r px-4 sticky left-0 z-10"
                        style={{
                          borderColor: "var(--border)",
                          background: "rgba(12, 12, 20, 0.95)",
                        }}
                      >
                        <span className="text-sm font-bold text-white whitespace-nowrap">{court.name}</span>
                        <span className="mt-1 text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{court.surface}</span>
                      </div>
                      
                      {/* Grid cells and cards */}
                      <div className="relative grid" style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(90px, 1fr))` }}>
                        {hours.map((hour) => (
                          <button
                            key={hour}
                            type="button"
                            onClick={() => handleCellClick(court, hour)}
                            className="border-r border-white/[0.035] hover:bg-white/[0.04] transition-colors relative focus:outline-none focus:bg-white/[0.02]"
                            style={{ cursor: "pointer", appearance: "none" }}
                            aria-label={`Rezervovať ${court.name} o ${hour}:00`}
                          />
                        ))}
                        {courtBookings.map((booking) => {
                          const style = statusStyles[booking.status];
                          const isNew = booking.id.startsWith("voice-sim");
                          return (
                            <button
                              key={booking.id}
                              type="button"
                              onClick={() => setSelectedBooking(booking)}
                              className={`absolute top-2.5 bottom-2.5 rounded-xl border px-3 text-left transition-all hover:scale-[1.02] flex flex-col justify-center gap-0.5 z-10 ${
                                isNew ? "animate-new-booking" : ""
                              }`}
                              style={{
                                left: `${getBookingOffset(booking.start, openingHours.startHour, hours.length)}%`,
                                width: `${getBookingWidth(booking.start, booking.end, hours.length)}%`,
                                minWidth: "100px",
                                background: `linear-gradient(135deg, ${style.bg.replace("0.16", "0.22").replace("0.14", "0.2")}, rgba(12, 12, 20, 0.85))`,
                                borderColor: style.border,
                                color: style.color,
                                cursor: "pointer",
                                boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
                              }}
                            >
                              <div className="flex items-center gap-1.5 w-full min-w-0">
                                <SourceIcon source={booking.source} className="h-3 w-3 shrink-0 opacity-80" />
                                <span className="font-extrabold text-xs truncate">{booking.title}</span>
                              </div>
                              <span className="block truncate text-[10px] text-white/70 font-bold leading-none">
                                {formatTime(booking.start)}–{formatTime(booking.end)}
                              </span>
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

        <aside className="space-y-5 lg:sticky lg:top-[88px] self-start z-10">
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

          {/* Voice Simulator Card */}
          <div className="rounded-[28px] border p-6 overflow-hidden relative" style={{ background: "rgba(12,12,20,0.78)", borderColor: "var(--border)" }}>
            {/* Glowing mic background indicator if active */}
            {simStep >= 0 && (
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full blur-[50px] animate-pulse" style={{ background: "rgba(123,97,255,0.25)" }} />
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "#A78BFA" }}>
                <Mic2 className={`h-4 w-4 ${simStep >= 0 ? "animate-pulse text-red-400" : ""}`} /> Hlasový asistent Telio
              </div>
              {simStep === -1 && (
                <button
                  onClick={startSimulation}
                  className="text-xs font-bold px-3 py-1.5 rounded-full border border-purple-500/30 hover:border-purple-500/60 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Play className="h-3 w-3" /> Simulovať hovor
                </button>
              )}
            </div>

            {simStep === -1 ? (
              <div className="mt-4">
                <p className="text-sm leading-6 text-slate-400">
                  Telio hlasový agent vybavuje telefonické rezervácie kurtov. Simulujte reálny hovor zákazníka a sledujte, ako Telio zapíše rezerváciu priamo pred vašimi očami.
                </p>
                <div className="mt-4 text-xs space-y-1.5 text-slate-500 border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <div>📞 1. Zákazník zavolá a požiada o rezerváciu</div>
                  <div>🤖 2. Telio preverí voľné sloty v Google Kalendári</div>
                  <div>⚡ 3. Zápis a vizualizácia na webe v reálnom čase</div>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-col min-h-[160px]">
                <div className="flex-1 space-y-3.5 mb-4 text-sm max-h-[220px] overflow-y-auto pr-1">
                  {simLogs.filter(Boolean).map((log, index) => (
                    <div
                      key={index}
                      className={`flex flex-col gap-1 rounded-2xl p-3 max-w-[85%] ${
                        log?.sender === "user"
                          ? "bg-slate-800 text-slate-100 self-end rounded-tr-none ml-auto"
                          : "border border-purple-500/20 bg-purple-500/5 text-purple-200 self-start rounded-tl-none mr-auto"
                      }`}
                      style={{ animation: "fadeInUp 0.3s ease" }}
                    >
                      <span className="text-[10px] font-bold uppercase opacity-65 tracking-wider">
                        {log?.sender === "user" ? "Zákazník" : "Telio AI"}
                      </span>
                      <p className="leading-5">{log?.text}</p>
                    </div>
                  ))}
                  {simStep > 0 && simStep % 2 !== 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-purple-300/60 pl-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  )}
                </div>

                {simStep === -2 && (
                  <div className="border-t pt-3 flex flex-col gap-3 items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" /> Rezervácia bola úspešne pridaná do kalendára!
                    </span>
                    <button
                      onClick={() => setSimStep(-1)}
                      className="w-full text-xs font-bold py-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 transition-all cursor-pointer"
                    >
                      Resetovať simulátor
                    </button>
                  </div>
                )}
              </div>
            )}
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
                  <div className="mt-2 flex items-center gap-1.5 capitalize">Zdroj: <span className="text-slate-300 flex items-center gap-1"><SourceIcon source={selectedBooking.source} className="h-3.5 w-3.5" />{selectedBooking.source.replace("-", " ")}</span></div>
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
              <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>Vyberte rezerváciu v kalendári alebo kliknite na voľné políčko a vytvorte novú.</p>
            )}
          </div>
        </aside>
      </div>

      {/* Interactive Booking Modal */}
      {isNewBookingOpen && newBookingData && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsNewBookingOpen(false)} />
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 p-6 shadow-2xl overflow-hidden" style={{ background: "rgba(12,12,20,0.95)" }}>
            {/* Glowing effect inside modal */}
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full blur-[80px]" style={{ background: "var(--cyan)", opacity: 0.15 }} />
            <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full blur-[80px]" style={{ background: "var(--purple)", opacity: 0.15 }} />

            <div className="relative z-10">
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--border)" }}>
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Plus className="h-5 w-5 text-cyan-400" /> Nová rezervácia
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">{newBookingData.courtName} · {formatDate(selectedDate)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewBookingOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateBooking} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Čas začiatku</label>
                  <input
                    type="text"
                    disabled
                    value={`${newBookingData.hour}:00`}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Trvanie</label>
                  <select
                    value={newBookingData.duration}
                    onChange={(e) => setNewBookingData({ ...newBookingData, duration: parseFloat(e.target.value) })}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value={1.0}>1 hodina (60 min)</option>
                    <option value={1.5}>1.5 hodiny (90 min)</option>
                    <option value={2.0}>2 hodiny (120 min)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Rezervované pre (Meno)</label>
                  <input
                    type="text"
                    required
                    placeholder="napr. Jozef Mrkva"
                    value={newBookingData.customerName}
                    onChange={(e) => setNewBookingData({ ...newBookingData, customerName: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Telefónne číslo</label>
                  <input
                    type="tel"
                    placeholder="napr. +421 905 123 456"
                    value={newBookingData.phone}
                    onChange={(e) => setNewBookingData({ ...newBookingData, phone: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Názov rezervácie / Poznámka</label>
                  <input
                    type="text"
                    placeholder={`napr. ${newBookingData.sport === "tennis" ? "Dvojhra - Novák" : "Bedminton - štvorhra"}`}
                    value={newBookingData.title}
                    onChange={(e) => setNewBookingData({ ...newBookingData, title: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsNewBookingOpen(false)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Zrušiť
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary py-3 text-sm font-bold cursor-pointer"
                  >
                    Vytvoriť
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-new-booking {
          0% { box-shadow: 0 0 0 0 rgba(0, 255, 209, 0.75); border-color: rgba(0, 255, 209, 0.85); }
          70% { box-shadow: 0 0 0 10px rgba(0, 255, 209, 0); border-color: rgba(0, 255, 209, 0.35); }
          100% { box-shadow: 0 0 0 0 rgba(0, 255, 209, 0); border-color: rgba(0, 255, 209, 0.35); }
        }
        .animate-new-booking {
          animation: pulse-new-booking 2s infinite;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}