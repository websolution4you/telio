"use client";

import { useMemo, useState, useEffect } from "react";
import { Calendar, Clock, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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
    <section className="relative mx-auto px-8" style={{ maxWidth: "76rem", margin: "3rem auto 0", paddingBottom: "6rem" }}>
      {/* Centered Heading Section */}
      <div className="text-center mb-10 flex flex-col items-center w-full">
        <div className="inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.2em] mb-4 rounded-full border px-4 py-2" style={{ borderColor: "rgba(0,255,209,0.2)", background: "rgba(0,255,209,0.04)", color: "var(--cyan)" }}>
          <Calendar className="h-4 w-4" /> Rezervačný kalendár
        </div>
        <h2 className="text-3xl font-semibold text-white md:text-5xl" style={{ fontFamily: "var(--font-poppins), sans-serif", letterSpacing: "-0.03em" }}>
          NTC Bratislava Rezervácie
        </h2>
      </div>

      <div className="grid gap-8 lg:grid-cols-[300px_1fr] items-start">
        {/* Left Side: Booking Inputs Form */}
        <aside className="rounded-[24px] border p-6 space-y-6" style={{ background: "rgba(12,12,20,0.78)", borderColor: "var(--border)" }}>
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
              <select
                value={formCourtId}
                onChange={(e) => setFormCourtId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                {visibleCourts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selector */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Dátum</label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(new Date(e.target.value));
                  }
                }}
                className="w-full rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Hour Selector */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Čas začiatku (na 1 hod.)</label>
              <select
                value={formHour}
                onChange={(e) => setFormHour(parseInt(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {h}:00 – {h + 1}:00
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Meno zákazníka</label>
              <input
                id="customerName"
                type="text"
                required
                placeholder="napr. Kamil Bartko"
                value={formCustomerName}
                onChange={(e) => setFormCustomerName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Booking Title / Note */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Poznámka / Názov hry</label>
              <input
                type="text"
                placeholder="napr. Dvojhra - Novák"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
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
        <div className="flex flex-col space-y-4 w-full">
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
            <div className="overflow-x-auto w-full scrollbar-thin">
              <div style={{ minWidth: `${120 + visibleCourts.length * 110}px` }}>
                
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
                  {visibleCourts.map((court) => (
                    <div
                      key={court.id}
                      className="p-4 border-r text-center flex flex-col justify-center gap-0.5"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <span className="text-xs font-black text-white whitespace-nowrap">{court.name}</span>
                      <span className="text-[10px] whitespace-nowrap opacity-60 font-semibold" style={{ color: "var(--text-muted)" }}>{court.surface}</span>
                    </div>
                  ))}
                </div>

                {/* Grid Body */}
                <div className="relative" style={{ height: `${totalHours * slotHeight}px` }}>
                  
                  {/* Left Column Time Labels (Vertical hours) & Horizontal background lines */}
                  {hours.map((hour, idx) => {
                    const topPos = idx * slotHeight;
                    return (
                      <div key={hour} className="absolute left-0 right-0 pointer-events-none" style={{ top: `${topPos}px`, height: `${slotHeight}px` }}>
                        
                        {/* Vertical time line indicator */}
                        <div
                          className="absolute left-0 w-[100px] border-r flex items-start justify-center pr-2 pt-2 text-2xs font-black font-mono tracking-tighter"
                          style={{
                            height: "100%",
                            borderColor: "var(--border)",
                            color: "var(--text-muted)",
                            background: "rgba(12, 12, 20, 0.4)",
                          }}
                        >
                          {hour}:00
                        </div>

                        {/* Horizontal boundary grid line */}
                        <div className="absolute left-[100px] right-0 border-b w-full" style={{ top: "0", borderColor: "rgba(255,255,255,0.035)", height: "0" }} />
                      </div>
                    );
                  })}

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
                                className="absolute left-1.5 right-1.5 rounded-xl border p-2 flex flex-col justify-between overflow-hidden transition-all hover:scale-[1.01] hover:brightness-110 z-10 shadow-lg"
                                style={{
                                  top: position.top,
                                  height: position.height,
                                  background: "linear-gradient(135deg, rgba(0, 255, 209, 0.16), rgba(12, 12, 20, 0.95))",
                                  borderColor: "rgba(0, 255, 209, 0.4)",
                                  boxShadow: "0 6px 15px rgba(0, 0, 0, 0.4)",
                                }}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] font-black text-cyan-300 truncate tracking-tight uppercase">
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
                                  <p className="text-[10px] text-white/80 font-bold truncate leading-tight mt-0.5">
                                    {booking.customerName}
                                  </p>
                                </div>
                                <span className="block text-[9px] font-bold text-slate-400 leading-none">
                                  {bStart.getHours()}:00 – {bEnd.getHours()}:00
                                </span>
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
    </section>
  );
}