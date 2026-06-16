"use client";

import { useMemo, useState, useEffect } from "react";
import { Calendar, Clock, Plus, Trash2, ChevronLeft, ChevronRight, User, Activity, MessageSquare } from "lucide-react";
import type { Booking, Court, SportType } from "@/lib/bookings/mockBookings";
import { openingHours } from "@/lib/bookings/mockBookings";

type BookingCalendarProps = {
  courts: Court[];
  bookings: Booking[];
};

const sportLabels: Record<SportType, string> = {
  tennis: "Tenisové kurty",
  badminton: "Bedmintonové kurty",
};

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function BookingCalendar({ courts, bookings }: BookingCalendarProps) {
  const [selectedSport, setSelectedSport] = useState<SportType>("tennis");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  
  // Interactive Local state for bookings
  const [localBookings, setLocalBookings] = useState<Booking[]>(() => bookings);
  
  useEffect(() => {
    setLocalBookings(bookings);
  }, [bookings]);

  // Form State
  const dateStr = getLocalDateString(selectedDate);
  const [formCourtId, setFormCourtId] = useState("");
  const [formHour, setFormHour] = useState(10);
  const [formCustomerName, setFormCustomerName] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const visibleCourts = useMemo(() => {
    return courts.filter((court) => court.sport === selectedSport);
  }, [courts, selectedSport]);

  // Auto-select first court when sport changes
  useEffect(() => {
    if (visibleCourts.length > 0) {
      setFormCourtId(visibleCourts[0].id);
    }
  }, [visibleCourts]);

  const activeDateBookings = useMemo(() => {
    return localBookings.filter((booking) => {
      const bDateStr = getLocalDateString(new Date(booking.start));
      return bDateStr === dateStr;
    });
  }, [localBookings, dateStr]);

  const hours = useMemo(() => {
    const list: number[] = [];
    for (let h = openingHours.startHour; h <= openingHours.endHour; h++) {
      list.push(h);
    }
    return list;
  }, []);

  const totalHours = hours.length;
  const slotHeight = 62; // px per hour

  // Day navigation helper
  const adjustDate = (days: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + days);
    setSelectedDate(next);
  };

  const handleCellClick = (courtId: string, hour: number) => {
    setFormCourtId(courtId);
    setFormHour(hour);
    setErrorMsg("");
    
    // Autofocus name field
    const nameInput = document.getElementById("customerName");
    if (nameInput) {
      nameInput.focus();
    }
  };

  const checkConflict = (courtId: string, startIso: string, endIso: string) => {
    const targetStart = new Date(startIso).getTime();
    const targetEnd = new Date(endIso).getTime();
    
    return localBookings.some((booking) => {
      if (booking.courtId !== courtId) return false;
      const bStart = new Date(booking.start).getTime();
      const bEnd = new Date(booking.end).getTime();
      
      // Overlap condition
      return targetStart < bEnd && targetEnd > bStart;
    });
  };

  const handleCreateBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formCourtId) {
      setErrorMsg("Vyberte prosím kurt.");
      return;
    }

    const startDateTime = new Date(selectedDate);
    startDateTime.setHours(formHour, 0, 0, 0);

    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(formHour + 1, 0, 0, 0);

    // Conflict Check
    if (checkConflict(formCourtId, startDateTime.toISOString(), endDateTime.toISOString())) {
      setErrorMsg("Tento čas je už pre vybraný kurt obsadený!");
      return;
    }

    const selectedCourt = courts.find((c) => c.id === formCourtId);
    const newBooking: Booking = {
      id: `user-booking-${Date.now()}`,
      courtId: formCourtId,
      title: formTitle.trim() || (selectedSport === "tennis" ? "Tenis" : "Bedminton"),
      customerName: formCustomerName.trim() || "Anonym",
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      status: "confirmed",
      source: "web",
    };

    setLocalBookings((prev) => [...prev, newBooking]);
    setFormCustomerName("");
    setFormTitle("");
  };

  const handleDeleteBooking = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Naozaj chcete zrušiť túto rezerváciu?")) {
      setLocalBookings((prev) => prev.filter((b) => b.id !== id));
    }
  };

  // Google Calendar style booking cards positioning
  const getBookingPosition = (booking: Booking) => {
    const start = new Date(booking.start);
    const end = new Date(booking.end);

    const startMinutes = (start.getHours() - openingHours.startHour) * 60 + start.getMinutes();
    const durationMinutes = (end.getTime() - start.getTime()) / 60000;
    const totalMinutes = totalHours * 60;

    const topPercent = (startMinutes / totalMinutes) * 100;
    const heightPercent = (durationMinutes / totalMinutes) * 100;

    return {
      top: `${Math.max(0, Math.min(100, topPercent))}%`,
      height: `${Math.max(5, Math.min(100, heightPercent))}%`,
    };
  };

  return (
    <section className="relative w-full flex flex-col items-center px-8" style={{ maxWidth: "76rem", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", margin: "3rem auto 0", paddingBottom: "6rem" }}>
      {/* Centered Heading Section */}
      <div className="text-center mb-10 flex flex-col items-center w-full" style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className="inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.2em] mb-4 rounded-full border px-4 py-2" style={{ borderColor: "rgba(0,255,209,0.2)", background: "rgba(0,255,209,0.04)", color: "var(--cyan)", display: "inline-flex" }}>
          <Calendar className="h-4 w-4" /> Rezervačný kalendár
        </div>
        <h2 className="text-3xl font-semibold text-white md:text-5xl" style={{ fontFamily: "var(--font-poppins), sans-serif", letterSpacing: "-0.03em", textAlign: "center" }}>
          NTC Bratislava Rezervácie
        </h2>
      </div>

      <div className="grid gap-8 lg:grid-cols-[300px_1fr] items-start w-full" style={{ width: "100%" }}>
        {/* Left Side: Booking Inputs Form */}
        <aside className="rounded-[24px] border p-6 space-y-6 w-full" style={{ background: "rgba(12,12,20,0.78)", borderColor: "var(--border)", width: "100%" }}>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Nová rezervácia</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Zvoľte parametre pre 1-hodinový prenájom kurtu.</p>
          </div>

          <form onSubmit={handleCreateBookingSubmit} className="space-y-4">
            {/* Sport selector */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Šport</label>
              <div className="grid grid-cols-2 gap-2">
                {(["tennis", "badminton"] as const).map((sport) => (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => setSelectedSport(sport)}
                    className="py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer"
                    style={{
                      borderColor: selectedSport === sport ? "rgba(0,255,209,0.45)" : "var(--border)",
                      background: selectedSport === sport ? "rgba(0,255,209,0.12)" : "rgba(255,255,255,0.02)",
                      color: selectedSport === sport ? "var(--cyan)" : "var(--text-muted)",
                    }}
                  >
                    {sport === "tennis" ? "Tenis" : "Bedminton"}
                  </button>
                ))}
              </div>
            </div>

            {/* Court Selector */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Kurt</label>
              <div className="relative">
                <Activity className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <select
                  value={formCourtId}
                  onChange={(e) => setFormCourtId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/90 pl-10 pr-3 py-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  {visibleCourts.map((court) => (
                    <option key={court.id} value={court.id}>
                      {court.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Selector */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Dátum</label>
              <div className="relative flex items-center">
                <Calendar className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(new Date(e.target.value));
                    }
                  }}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/90 pl-10 pr-3 py-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none relative"
                />
              </div>
            </div>

            {/* Hour Selector */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Čas začiatku (na 1 hod.)</label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <select
                  value={formHour}
                  onChange={(e) => setFormHour(parseInt(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/90 pl-10 pr-3 py-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  {hours.map((h) => (
                    <option key={h} value={h}>
                      {h}:00 – {h + 1}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Meno zákazníka</label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  id="customerName"
                  type="text"
                  required
                  placeholder="napr. Kamil Bartko"
                  value={formCustomerName}
                  onChange={(e) => setFormCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Booking Title / Note */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Poznámka / Názov hry</label>
              <div className="relative flex items-center">
                <MessageSquare className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="napr. Dvojhra - Novák"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="text-xs font-bold text-red-400 bg-red-950/20 border border-red-500/20 rounded-lg p-2.5">
                ⚠ {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl font-extrabold text-xs tracking-wider uppercase btn-primary cursor-pointer text-center"
            >
              Vytvoriť rezerváciu
            </button>
          </form>
        </aside>

        {/* Right Side: Google Calendar Style Resource Grid */}
        <div className="flex flex-col space-y-4 w-full min-w-0" style={{ width: "100%", minWidth: 0 }}>
          {/* Calendar Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-3" style={{ background: "rgba(12,12,20,0.4)", borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => adjustDate(-1)}
                className="p-2 rounded-lg border border-white/10 hover:bg-white/5 text-white transition-colors cursor-pointer"
                title="Predchádzajúci deň"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Dnes
              </button>
              <button
                onClick={() => adjustDate(1)}
                className="p-2 rounded-lg border border-white/10 hover:bg-white/5 text-white transition-colors cursor-pointer"
                title="Nasledujúci deň"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="text-sm font-black text-white capitalize">
              {new Intl.DateTimeFormat("sk-SK", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(selectedDate)}
            </div>

            <div className="text-xs font-bold px-3 py-1.5 rounded-full border" style={{ borderColor: "var(--border)", color: "var(--cyan)", background: "rgba(0,255,209,0.03)" }}>
              {sportLabels[selectedSport]}
            </div>
          </div>

          {/* Main Grid Card */}
          <div
            className="rounded-[28px] border overflow-hidden relative shadow-[0_24px_80px_rgba(0,0,0,0.3)]"
            style={{ background: "rgba(12,12,20,0.78)", borderColor: "var(--border)" }}
          >
            {/* Scrollable container for columns */}
            <div className="overflow-x-auto w-full custom-scrollbar">
              <div style={{ minWidth: `${100 + visibleCourts.length * 120}px` }}>
                
                {/* Horizontal Header Row (Courts) */}
                <div
                  className="grid border-b sticky top-0 z-20"
                  style={{
                    gridTemplateColumns: `100px repeat(${visibleCourts.length}, 1fr)`,
                    borderColor: "var(--border)",
                    background: "rgba(12, 12, 20, 0.96)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  {/* Empty space corner */}
                  <div className="p-4 border-r text-2xs font-extrabold uppercase tracking-widest text-slate-500 flex items-center justify-center" style={{ borderColor: "var(--border)" }}>
                    Hodiny
                  </div>
                  {visibleCourts.map((court) => {
                    const courtNum = court.id.split("-")[1];
                    const surfaceLabel = court.surface;
                    const isClay = surfaceLabel.toLowerCase().includes("clay");
                    const isHard = surfaceLabel.toLowerCase().includes("hard");
                    return (
                      <div
                        key={court.id}
                        className="p-4 border-r text-center flex flex-col justify-center items-center gap-2"
                        style={{ borderColor: "var(--border)", background: "rgba(255, 255, 255, 0.01)" }}
                      >
                        <div className="flex items-center gap-1.5 justify-center">
                          <span className="h-5 w-5 rounded-full text-[10px] font-black flex items-center justify-center"
                            style={{
                              background: selectedSport === "tennis" ? "rgba(0, 255, 209, 0.1)" : "rgba(167, 139, 250, 0.1)",
                              color: selectedSport === "tennis" ? "var(--cyan)" : "#A78BFA",
                              border: `1px solid ${selectedSport === "tennis" ? "rgba(0, 255, 209, 0.2)" : "rgba(167, 139, 250, 0.2)"}`
                            }}
                          >
                            {courtNum}
                          </span>
                          <span className="text-xs font-black text-white whitespace-nowrap">
                            {selectedSport === "tennis" ? `Tenis Kurt` : `Bedminton`}
                          </span>
                        </div>
                        <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          isClay 
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                            : isHard
                            ? "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                            : "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                        }`}>
                          {surfaceLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Grid Body */}
                <div className="relative" style={{ height: `${totalHours * slotHeight}px` }}>
                  
                  {/* Left Column Time Labels (Vertical hours) */}
                  <div className="absolute left-0 w-[100px] h-full border-r" style={{ borderColor: "var(--border)" }}>
                    {hours.map((hour, idx) => {
                      const topPos = idx * slotHeight;
                      return (
                        <div
                          key={hour}
                          className="absolute right-3 text-2xs font-extrabold font-mono tracking-tighter text-slate-400 flex items-center justify-end"
                          style={{
                            top: `${topPos}px`,
                            transform: "translateY(-50%)",
                            height: "20px",
                          }}
                        >
                          {hour}:00
                        </div>
                      );
                    })}
                  </div>

                  {/* Horizontal background lines */}
                  {hours.map((hour, idx) => {
                    const topPos = idx * slotHeight;
                    return (
                      <div
                        key={hour}
                        className="absolute left-[100px] right-0 border-b pointer-events-none"
                        style={{
                          top: `${topPos}px`,
                          borderColor: "rgba(255, 255, 255, 0.035)",
                          height: "0",
                        }}
                      />
                    );
                  })}
                  {/* Bottom boundary line */}
                  <div
                    className="absolute left-[100px] right-0 border-b pointer-events-none"
                    style={{
                      top: `${totalHours * slotHeight}px`,
                      borderColor: "rgba(255, 255, 255, 0.035)",
                    }}
                  />

                  {/* Empty cells buttons grid (clickable slots overlay) */}
                  <div
                    className="absolute inset-0 grid"
                    style={{
                      left: "100px",
                      gridTemplateColumns: `repeat(${visibleCourts.length}, 1fr)`,
                    }}
                  >
                    {visibleCourts.map((court) => (
                      <div key={court.id} className="relative h-full border-r border-white/[0.02] flex flex-col">
                        {hours.map((hour) => (
                          <button
                            key={hour}
                            type="button"
                            onClick={() => handleCellClick(court.id, hour)}
                            className="w-full flex items-center justify-center text-white/0 hover:text-cyan-400 hover:bg-cyan-500/5 focus:bg-cyan-500/10 focus:outline-none transition-all group cursor-pointer border-b border-white/[0.01]"
                            style={{ height: `${slotHeight}px` }}
                            aria-label={`Rezervovať ${court.name} o ${hour}:00`}
                          >
                            <Plus className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}

                        {/* Render active bookings on top of this court column */}
                        {activeDateBookings
                          .filter((b) => b.courtId === court.id)
                          .map((booking) => {
                            const position = getBookingPosition(booking);
                            const bStart = new Date(booking.start);
                            const bEnd = new Date(booking.end);
                            return (
                              <div
                                key={booking.id}
                                className="absolute left-1.5 right-1.5 rounded-xl border p-2 flex flex-col justify-between overflow-hidden transition-all hover:scale-[1.02] hover:shadow-[0_12px_30px_rgba(0,255,209,0.15)] z-10 shadow-lg"
                                style={{
                                  top: position.top,
                                  height: position.height,
                                  background: "rgba(15, 23, 42, 0.85)",
                                  backdropFilter: "blur(4px)",
                                  borderColor: "rgba(255, 255, 255, 0.08)",
                                  borderLeft: `4px solid ${selectedSport === "tennis" ? "var(--cyan)" : "#A78BFA"}`,
                                }}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center justify-between gap-1 w-full">
                                    <span className="text-[10px] font-black text-white truncate uppercase tracking-wide">
                                      {booking.title}
                                    </span>
                                    <button
                                      onClick={(e) => handleDeleteBooking(booking.id, e)}
                                      className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors cursor-pointer shrink-0"
                                      title="Zrušiť rezerváciu"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <p className="text-[10px] font-semibold truncate leading-tight mt-1 animate-pulse" style={{ color: "var(--text-muted)" }}>
                                    {booking.customerName}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 leading-none mt-1">
                                  <Clock className="h-2.5 w-2.5" />
                                  <span>
                                    {bStart.getHours()}:00 – {bEnd.getHours()}:00
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ))}
                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        select {
          appearance: none !important;
          background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E") !important;
          background-position: right 0.75rem center !important;
          background-repeat: no-repeat !important;
          background-size: 1.25rem !important;
          padding-right: 2.5rem !important;
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          background: transparent !important;
          bottom: 0 !important;
          color: transparent !important;
          cursor: pointer !important;
          height: auto !important;
          left: 0 !important;
          position: absolute !important;
          right: 0 !important;
          top: 0 !important;
          width: auto !important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
      `}</style>
    </section>
  );
}