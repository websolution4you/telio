"use client";

import { useMemo, useState, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Activity, 
  MessageSquare, 
  X, 
  Phone,
  Sparkles,
  Info
} from "lucide-react";
import type { Booking, Court, SportType } from "@/lib/bookings/mockBookings";
import { openingHours } from "@/lib/bookings/mockBookings";
import { fetchBookingsAction, createBookingAction, deleteBookingAction } from "@/app/actions/bookings";

type BookingCalendarProps = {
  courts: Court[];
  bookings: Booking[];
};

const sportLabels: Record<SportType, string> = {
  badminton: "Badminton",
  squash: "Squash",
  tennis: "Tenis",
  "tennis-clay": "Tenis antuka",
};

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function BookingCalendar({ courts, bookings }: BookingCalendarProps) {
  const [selectedSport, setSelectedSport] = useState<SportType>("badminton");
  const [baseDate, setBaseDate] = useState(() => new Date());
  const [viewDaysCount, setViewDaysCount] = useState<number>(3); // Default to 3 days view
  
  // Interactive Local state for bookings
  const [localBookings, setLocalBookings] = useState<Booking[]>(() => bookings);
  
  // Modal / Drawer state for creation
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    courtId: string;
    date: Date;
    hour: number;
    minute: number;
  } | null>(null);

  // Form State
  const [formCustomerName, setFormCustomerName] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formSource, setFormSource] = useState<Booking["source"]>("web");
  const [formDurationMinutes, setFormDurationMinutes] = useState<number>(60);
  const [errorMsg, setErrorMsg] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadLiveBookings() {
      setIsLoading(true);
      const start = new Date(baseDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(baseDate);
      end.setDate(end.getDate() + viewDaysCount);
      end.setHours(23, 59, 59, 999);

      const res = await fetchBookingsAction(start.toISOString(), end.toISOString());
      if (active && res.success && res.bookings) {
        setLocalBookings(res.bookings);
      }
      if (active) {
        setIsLoading(false);
      }
    }
    loadLiveBookings();
    return () => {
      active = false;
    };
  }, [baseDate, viewDaysCount]);

  // Adjust base date helper
  const adjustDate = (days: number) => {
    const next = new Date(baseDate);
    next.setDate(next.getDate() + days);
    setBaseDate(next);
  };

  // Generate list of dates to show based on selected view (1, 3, or 7 days)
  const visibleDates = useMemo(() => {
    const list: Date[] = [];
    for (let i = 0; i < viewDaysCount; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      list.push(d);
    }
    return list;
  }, [baseDate, viewDaysCount]);

  // Filter courts for current sport
  const visibleCourts = useMemo(() => {
    return courts.filter((court) => court.sport === selectedSport);
  }, [courts, selectedSport]);

  // Interval settings per sport (Tenis / Tenis antuka have 30-min intervals; Badminton / Squash have 1-hour intervals)
  const isHalfHourInterval = selectedSport === "tennis" || selectedSport === "tennis-clay";
  const intervalMinutes = isHalfHourInterval ? 30 : 60;

  // Generate list of time slots
  const timeSlots = useMemo(() => {
    const slots: { hour: number; minute: number; label: string }[] = [];
    const { startHour, endHour } = openingHours;
    
    for (let h = startHour; h < endHour; h++) {
      slots.push({
        hour: h,
        minute: 0,
        label: `${h}:00`
      });
      if (isHalfHourInterval) {
        slots.push({
          hour: h,
          minute: 30,
          label: `${h}:30`
        });
      }
    }
    // Add end hour boundary label
    slots.push({
      hour: endHour,
      minute: 0,
      label: `${endHour}:00`
    });
    return slots;
  }, [isHalfHourInterval]);

  // Total columns for the grid (excluding the header/boundary column)
  const totalSlotsCount = timeSlots.length - 1;

  const handleCellClick = (courtId: string, date: Date, slot: { hour: number; minute: number }) => {
    setSelectedSlot({
      courtId,
      date,
      hour: slot.hour,
      minute: slot.minute,
    });
    // Set default duration based on intervals
    setFormDurationMinutes(isHalfHourInterval ? 60 : 60); // Default to 60 mins for simplicity
    setFormCustomerName("");
    setFormTitle("");
    setFormPhone("");
    setFormSource("web");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const checkConflict = (courtId: string, startIso: string, endIso: string, excludeId?: string) => {
    const targetStart = new Date(startIso).getTime();
    const targetEnd = new Date(endIso).getTime();
    
    return localBookings.some((booking) => {
      if (booking.id === excludeId) return false;
      if (booking.courtId !== courtId) return false;
      const bStart = new Date(booking.start).getTime();
      const bEnd = new Date(booking.end).getTime();
      
      // Overlap condition
      return targetStart < bEnd && targetEnd > bStart;
    });
  };

  const handleCreateBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    setErrorMsg("");
    const { courtId, date, hour, minute } = selectedSlot;

    const startDateTime = new Date(date);
    startDateTime.setHours(hour, minute, 0, 0);

    const endDateTime = new Date(startDateTime.getTime() + formDurationMinutes * 60000);

    // Conflict Check
    if (checkConflict(courtId, startDateTime.toISOString(), endDateTime.toISOString())) {
      setErrorMsg("Tento čas je už pre vybraný kurt obsadený!");
      return;
    }

    setIsLoading(true);
    const res = await createBookingAction({
      courtId,
      title: formTitle.trim() || (selectedSport.startsWith("tennis") ? "Tenis" : "Bedminton"),
      customerName: formCustomerName.trim() || "Zákazník",
      phone: formPhone.trim() || undefined,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      status: "confirmed",
      source: formSource,
    });

    setIsLoading(false);

    if (res.success && res.booking) {
      setLocalBookings((prev) => [...prev, res.booking as Booking]);
      setIsModalOpen(false);
      setSelectedSlot(null);
    } else {
      setErrorMsg(res.error || "Nepodarilo sa vytvoriť rezerváciu. Skontrolujte pripojenie.");
    }
  };

  const handleDeleteBooking = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Naozaj chcete zrušiť túto rezerváciu?")) {
      setIsLoading(true);
      const res = await deleteBookingAction(id);
      setIsLoading(false);
      
      if (res.success) {
        setLocalBookings((prev) => prev.filter((b) => b.id !== id));
      } else {
        alert("Nepodarilo sa zrušiť rezerváciu v Google kalendári.");
      }
    }
  };

  // Get position style for booking on the horizontal timeline
  const getBookingStyle = (booking: Booking, dateStr: string) => {
    const start = new Date(booking.start);
    const end = new Date(booking.end);

    const totalMinutes = (openingHours.endHour - openingHours.startHour) * 60;
    
    // Calculate start offset in minutes from openingHours.startHour
    const startMinutes = (start.getHours() - openingHours.startHour) * 60 + start.getMinutes();
    const durationMinutes = (end.getTime() - start.getTime()) / 60000;

    const leftPercent = (startMinutes / totalMinutes) * 100;
    const widthPercent = (durationMinutes / totalMinutes) * 100;

    return {
      left: `${Math.max(0, Math.min(100, leftPercent))}%`,
      width: `${Math.max(2, Math.min(100 - leftPercent, widthPercent))}%`,
    };
  };

  // Get color and layout based on booking details
  const getBookingColor = (booking: Booking) => {
    if (booking.status === "blocked") {
      return {
        bg: "rgba(245, 158, 11, 0.15)",
        border: "border-amber-500/40 border-l-4 border-l-amber-500",
        text: "text-amber-300",
        badgeBg: "bg-amber-500/20 text-amber-300",
        label: "Údržba"
      };
    }
    
    switch (booking.source) {
      case "voice-assistant":
        return {
          bg: "rgba(6, 182, 212, 0.15)",
          border: "border-cyan-500/40 border-l-4 border-l-cyan-400",
          text: "text-cyan-200",
          badgeBg: "bg-cyan-500/20 text-cyan-300",
          label: "Telio Hlas"
        };
      case "google-calendar":
        return {
          bg: "rgba(167, 139, 250, 0.15)",
          border: "border-purple-500/40 border-l-4 border-l-purple-400",
          text: "text-purple-200",
          badgeBg: "bg-purple-500/20 text-purple-300",
          label: "GCal"
        };
      case "admin":
        return {
          bg: "rgba(239, 68, 68, 0.15)",
          border: "border-red-500/40 border-l-4 border-l-red-500",
          text: "text-red-200",
          badgeBg: "bg-red-500/20 text-red-300",
          label: "Recepcia"
        };
      default:
        return {
          bg: "rgba(34, 197, 94, 0.15)",
          border: "border-green-500/40 border-l-4 border-l-green-400",
          text: "text-green-200",
          badgeBg: "bg-green-500/20 text-green-300",
          label: "Web"
        };
    }
  };

  return (
    <section className="relative w-full flex flex-col items-center px-4 md:px-8" style={{ maxWidth: "84rem", width: "100%", margin: "5rem auto 0", paddingBottom: "6rem" }}>
      
      {/* Top Banner / Simulator Notice */}
      <div className="w-full rounded-3xl border p-6 flex flex-col md:flex-row items-center justify-between gap-6" style={{ background: "linear-gradient(135deg, rgba(12,12,20,0.85) 0%, rgba(20,20,35,0.7) 100%)", borderColor: "var(--border)", marginBottom: "3rem" }}>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Info className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Simulátor rezervácií NTC</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Tento systém simuluje reálne správanie kalendárov. Kliknutím na voľné políčko v grafe môžete okamžite vytvoriť simulovanú rezerváciu kurtu.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-cyan-300 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
            Telio Hlasový asistent ready
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full flex flex-col space-y-10">
        
        {/* NTC-style Sport tabs selection */}
        <div className="ntc-sport-tabs-container">
          {(["badminton", "squash", "tennis", "tennis-clay"] as const).map((sport) => (
            <button
              key={sport}
              onClick={() => setSelectedSport(sport)}
              className={`ntc-sport-tab-btn ${selectedSport === sport ? "ntc-sport-tab-btn-active" : ""}`}
            >
              {sportLabels[sport]}
            </button>
          ))}
        </div>

        {/* Toolbar Header (NTC Style layout) */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border px-8 py-5 mb-8" style={{ background: "rgba(12,12,20,0.72)", borderColor: "var(--border)" }}>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustDate(-1)}
              className="p-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-white transition-colors cursor-pointer hover:border-cyan-500/40"
              title="Predchádzajúci deň"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setBaseDate(new Date())}
              className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-black text-white transition-colors cursor-pointer hover:border-cyan-500/40"
            >
              Dnes
            </button>
            <button
              onClick={() => adjustDate(1)}
              className="p-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-white transition-colors cursor-pointer hover:border-cyan-500/40"
              title="Nasledujúci deň"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <div className="relative ml-2 flex items-center">
              <Calendar className="absolute left-3.5 h-4 w-4 text-cyan-400 pointer-events-none" />
              <input
                type="date"
                value={getLocalDateString(baseDate)}
                onChange={(e) => {
                  if (e.target.value) {
                    setBaseDate(new Date(e.target.value));
                  }
                }}
                className="rounded-xl border border-white/10 bg-slate-950/80 pl-10 pr-4 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold">Zobrazenie:</span>
              <select
                value={viewDaysCount}
                onChange={(e) => setViewDaysCount(parseInt(e.target.value))}
                className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                <option value={1}>Dnes</option>
                <option value={3}>Dnes + 3 dni</option>
                <option value={7}>Dnes + 7 dní</option>
              </select>
            </div>

            <div className="text-xs font-black px-4 py-2 rounded-full border border-cyan-500/20 text-cyan-300 bg-cyan-500/5 flex items-center gap-2">
              {isLoading && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />}
              {isLoading ? "Načítavam..." : `Aktívny filter: ${sportLabels[selectedSport]}`}
            </div>
          </div>

        </div>

        {/* Stacked Days Grid list */}
        <div className="space-y-8">
          {visibleDates.map((date) => {
            const dateString = getLocalDateString(date);
            const isToday = getLocalDateString(new Date()) === dateString;
            
            // Filter bookings for this date and sport
            const dateBookings = localBookings.filter((b) => {
              const bookingDateStr = getLocalDateString(new Date(b.start));
              const courtObj = courts.find((c) => c.id === b.courtId);
              return bookingDateStr === dateString && courtObj?.sport === selectedSport;
            });

            return (
              <div 
                key={dateString}
                className="rounded-3xl border overflow-hidden relative shadow-2xl transition-all"
                style={{ 
                  background: isToday ? "rgba(15, 23, 42, 0.75)" : "rgba(12, 12, 20, 0.8)", 
                  borderColor: isToday ? "rgba(0, 255, 209, 0.25)" : "var(--border)"
                }}
              >
                
                {/* Day Header */}
                <div className="px-8 py-5 flex items-center justify-between border-b border-white/5 bg-white/[0.02]" style={{ backdropFilter: "blur(8px)" }}>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-black tracking-wide ${
                      isToday ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/35" : "bg-white/5 text-white border border-white/10"
                    }`}>
                      {new Intl.DateTimeFormat("sk-SK", { weekday: "short" }).format(date).toUpperCase()}{" "}
                      {date.getDate()}/{date.getMonth() + 1}
                    </span>
                    <span className="text-sm font-bold text-slate-400">
                      {new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "long", year: "numeric" }).format(date)}
                    </span>
                  </div>

                  {isToday && (
                    <span className="text-2xs font-extrabold uppercase tracking-widest text-cyan-400 bg-cyan-950/40 px-3 py-1 rounded-full border border-cyan-500/20 animate-pulse">
                      Dnes
                    </span>
                  )}
                </div>

                {/* Grid Layout Container */}
                <div className="overflow-x-auto w-full custom-scrollbar">
                  {/* Timeline table */}
                  <div className="relative" style={{ minWidth: "900px" }}>
                    
                    {/* Time Column Headers */}
                    <div 
                      className="grid border-b border-white/5 text-2xs font-extrabold tracking-wider text-slate-400 bg-white/[0.01]"
                      style={{ gridTemplateColumns: `140px 1fr` }}
                    >
                      {/* Left Corner */}
                      <div className="p-3 border-r border-white/5 text-center flex items-center justify-center font-bold text-slate-500">
                        Kurt / Dvorec
                      </div>
                      
                      {/* Hour markings */}
                      <div className="grid w-full h-10" style={{ gridTemplateColumns: `repeat(${totalSlotsCount}, 1fr)` }}>
                        {timeSlots.slice(0, totalSlotsCount).map((slot, idx) => {
                          return (
                            <div 
                              key={idx}
                              className="h-full border-r border-white/10 flex items-center pl-2 text-slate-300 font-mono text-[10px] select-none"
                            >
                              {slot.label}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Court Rows */}
                    <div className="divide-y divide-white/[0.03]">
                      {visibleCourts.map((court) => {
                        // Filter bookings for this specific court on this date
                        const courtBookings = dateBookings.filter((b) => b.courtId === court.id);

                        return (
                          <div 
                            key={court.id}
                            className="grid hover:bg-white/[0.01] transition-colors"
                            style={{ gridTemplateColumns: `140px 1fr` }}
                          >
                            {/* Court Title on Left (Sticky column simulation) */}
                            <div className="p-4 border-r border-white/5 flex flex-col justify-center bg-slate-950/40">
                              <span className="text-xs font-black text-white">{court.name}</span>
                              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{court.surface}</span>
                            </div>

                            {/* Timeline Cells and bookings overlay */}
                            <div className="relative h-20 w-full flex items-center group/row">
                              
                              {/* Background slot grid lines & click areas */}
                              <div className="absolute inset-0 grid w-full h-full" style={{ gridTemplateColumns: `repeat(${totalSlotsCount}, 1fr)` }}>
                                {Array.from({ length: totalSlotsCount }).map((_, slotIdx) => {
                                  const targetSlot = timeSlots[slotIdx];
                                  return (
                                    <button
                                      key={slotIdx}
                                      onClick={() => handleCellClick(court.id, date, targetSlot)}
                                      className="h-full border-r border-white/10 hover:bg-cyan-500/[0.02] focus:bg-cyan-500/[0.04] focus:outline-none transition-all flex items-center justify-center text-white/0 hover:text-cyan-400 group/cell"
                                      title={`Kliknutím rezervujete od ${targetSlot.label}`}
                                    >
                                      <Plus className="h-4 w-4 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Bookings cards overlay */}
                              <div className="absolute inset-x-0 inset-y-2 pointer-events-none">
                                <div className="relative w-full h-full">
                                  {courtBookings.map((booking) => {
                                    const style = getBookingStyle(booking, dateString);
                                    const meta = getBookingColor(booking);
                                    
                                    return (
                                      <div
                                        key={booking.id}
                                        className={`absolute h-full rounded-xl p-2 pointer-events-auto flex flex-col justify-between overflow-hidden shadow-lg transition-all hover:scale-[1.01] hover:shadow-[0_8px_20px_rgba(0,0,0,0.4)] ${meta.bg} ${meta.border}`}
                                        style={{
                                          ...style,
                                          left: `calc(${style.left} + 2px)`,
                                          width: `calc(${style.width} - 4px)`
                                        }}
                                      >
                                        <div className="min-w-0">
                                          <div className="flex items-center justify-between gap-1">
                                            <span className="text-[10px] font-black text-white truncate">
                                              {booking.title}
                                            </span>
                                            {booking.status !== "blocked" && (
                                              <button
                                                onClick={(e) => handleDeleteBooking(booking.id, e)}
                                                className="p-0.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-950/20 transition-colors cursor-pointer pointer-events-auto"
                                                title="Zrušiť rezerváciu"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </button>
                                            )}
                                          </div>
                                          <p className="text-[9px] font-semibold text-slate-300 truncate mt-0.5 leading-tight">
                                            {booking.customerName}
                                          </p>
                                        </div>

                                        <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 mt-1">
                                          <div className="flex items-center gap-1">
                                            <Clock className="h-2 w-2" />
                                            <span>
                                              {new Date(booking.start).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}
                                              {" - "}
                                              {new Date(booking.end).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                          </div>
                                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${meta.badgeBg}`}>
                                            {meta.label}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* Booking Form Dialog (Sleek Modal) */}
      {isModalOpen && selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Content */}
          <div 
            className="relative w-full max-w-md rounded-3xl border p-6 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200"
            style={{ background: "rgba(15, 23, 42, 0.95)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">NTC Rezervácia</span>
                <h3 className="text-lg font-bold text-white mt-0.5">Nová simulovaná rezervácia</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Kurt:</span>
                <span className="font-bold text-white">
                  {courts.find((c) => c.id === selectedSlot.courtId)?.name || ""} ({sportLabels[selectedSport]})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Dátum:</span>
                <span className="font-bold text-white">
                  {new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "long", year: "numeric" }).format(selectedSlot.date)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Začiatok:</span>
                <span className="font-bold text-white">
                  {String(selectedSlot.hour).padStart(2, "0")}:{String(selectedSlot.minute).padStart(2, "0")}
                </span>
              </div>
            </div>

            <form onSubmit={handleCreateBookingSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Meno zákazníka</label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="napr. Kamil Bartko"
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 py-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Telefónne číslo</label>
                  <div className="relative flex items-center">
                    <Phone className="absolute left-3.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="napr. +421..."
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 py-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Dĺžka rezervácie</label>
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <select
                      value={formDurationMinutes}
                      onChange={(e) => setFormDurationMinutes(parseInt(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 py-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none cursor-pointer"
                    >
                      <option value={30}>30 minút</option>
                      <option value={60}>1 hodina</option>
                      <option value={90}>1,5 hodiny</option>
                      <option value={120}>2 hodiny</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Poznámka / Názov hry</label>
                <div className="relative flex items-center">
                  <MessageSquare className="absolute left-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="napr. Štvorhra s priateľmi"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 py-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Kanál rezervácie</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["web", "voice-assistant", "admin"] as const).map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setFormSource(src)}
                      className="py-2 px-2 text-[10px] font-bold rounded-xl border text-center transition-all cursor-pointer"
                      style={{
                        borderColor: formSource === src ? "var(--cyan)" : "rgba(255, 255, 255, 0.05)",
                        background: formSource === src ? "rgba(0, 255, 209, 0.08)" : "rgba(255,255,255,0.02)",
                        color: formSource === src ? "var(--cyan)" : "var(--text-muted)"
                      }}
                    >
                      {src === "voice-assistant" ? "Hlas Telio" : src === "admin" ? "Recepcia" : "Web"}
                    </button>
                  ))}
                </div>
              </div>

              {errorMsg && (
                <div className="text-xs font-bold text-red-400 bg-red-950/20 border border-red-500/20 rounded-xl p-3">
                  ⚠ {errorMsg}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-extrabold text-xs tracking-wider uppercase btn-primary cursor-pointer text-center text-white"
              >
                Vytvoriť rezerváciu
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Styled overrides */}
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