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
import { supabase } from "@/lib/supabase";
import { useLang } from "@/lib/i18n";

import type { BookingUser } from "@/lib/auth/bookingAuth";

type BookingCalendarProps = {
  courts: Court[];
  bookings: Booking[];
  currentUser?: BookingUser | null;
};

// sportLabels is now dynamically defined inside the component based on language

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function BookingCalendar({ courts, bookings, currentUser }: BookingCalendarProps) {
  const { lang } = useLang();

  const sportLabels: Record<SportType, string> = useMemo(() => ({
    badminton: lang === "sk" ? "Bedminton" : "Badminton",
    squash: "Squash",
    tennis: lang === "sk" ? "Tenis" : "Tennis",
    "tennis-clay": lang === "sk" ? "Tenis antuka" : "Tennis Clay",
  }), [lang]);

  const [selectedSport, setSelectedSport] = useState<SportType>("badminton");
  const [baseDate, setBaseDate] = useState(() => new Date());
  const viewDaysCount = 1;
  
  // Interactive Local state for bookings
  const [localBookings, setLocalBookings] = useState<Booking[]>(() => bookings);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  
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
  }, [baseDate, viewDaysCount, reloadTrigger]);

  useEffect(() => {
    console.log("Realtime (bookings): Initializing subscription to table 'bookings'...");
    const channel = supabase
      .channel("bookings-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        (payload) => {
          console.log("Realtime (bookings): Change detected!", payload);
          setReloadTrigger((prev) => prev + 1);
        }
      )
      .subscribe((status) => {
        console.log("Realtime (bookings) status:", status);
      });

    return () => {
      console.log("Realtime (bookings): Cleaning up subscription...");
      supabase.removeChannel(channel);
    };
  }, []);

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

  const formattedDate = useMemo(() => {
    const str = new Intl.DateTimeFormat("sk-SK", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(baseDate);
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, [baseDate]);

  // Filter courts for current sport
  const visibleCourts = useMemo(() => {
    let list = courts.filter((court) => court.sport === selectedSport);
    if (selectedSport === "tennis-clay") {
      const day = baseDate.getDay();
      const isWeekend = day === 0 || day === 6;
      if (isWeekend) {
        // Only Dvorec 01 and Dvorec 02
        list = list.filter(c => c.id === "tennis-clay-1" || c.id === "tennis-clay-2");
      }
    }
    return list;
  }, [courts, selectedSport, baseDate]);

  // Interval settings per sport (all sports now use 1-hour intervals)
  const isHalfHourInterval = false;
  const intervalMinutes = 60;

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
    if (!currentUser) {
      setConfirmModal({ isOpen: true, isError: true, message: "Pre vytvorenie rezervácie sa musíte prihlásiť." });
      return;
    }

    const slotTime = new Date(date);
    slotTime.setHours(slot.hour, slot.minute, 0, 0);
    
    if (slotTime < new Date()) {
      setConfirmModal({ isOpen: true, isError: true, message: "Nemožno vytvoriť rezerváciu v minulosti." });
      return;
    }
    
    setSelectedSlot({
      courtId,
      date,
      hour: slot.hour,
      minute: slot.minute,
    });
    setFormDurationMinutes(isHalfHourInterval ? 60 : 60); // Default to 60 mins for simplicity
    setFormCustomerName(currentUser?.name || "");
    setFormPhone("");
    setFormTitle("");
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

    // Check block/maintenance times for clay courts
    if (selectedSport === "tennis-clay") {
      if (courtId === "tennis-clay-1" || courtId === "tennis-clay-2") {
        if (hour === 13 || (hour < 13 && hour + formDurationMinutes / 60 > 13)) {
          setErrorMsg("V čase 13:00 - 14:00 prebieha údržba kurtov.");
          return;
        }
      }
      if (courtId === "tennis-clay-10" || courtId === "tennis-clay-11") {
        if (hour === 7) {
          setErrorMsg("Dvorec 10 a 11 sú mimo prevádzky pred 8:00.");
          return;
        }
        if (hour === 12 || (hour < 12 && hour + formDurationMinutes / 60 > 12)) {
          setErrorMsg("V čase 12:00 - 13:00 prebieha údržba kurtov.");
          return;
        }
        if (hour >= 16 || hour + formDurationMinutes / 60 > 16.5) {
          setErrorMsg("Dvorec 10 a 11 sú v prevádzke len do 16:30.");
          return;
        }
      }
    }

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
      customerName: formCustomerName.trim() || currentUser?.name || "Zákazník",
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

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; bookingId?: string; message?: string; isError?: boolean }>({ isOpen: false });

  const handleDeleteBookingClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({ isOpen: true, bookingId: id, message: "Naozaj chcete zrušiť túto rezerváciu?", isError: false });
  };

  const executeDeleteBooking = async () => {
    const id = confirmModal.bookingId;
    if (!id) return;
    
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    setIsLoading(true);
    const res = await deleteBookingAction(id);
    setIsLoading(false);
    
    if (res.success) {
      setLocalBookings((prev) => prev.filter((b) => b.id !== id));
    } else {
      setConfirmModal({ isOpen: true, isError: true, message: res.error || "Nepodarilo sa zrušiť rezerváciu v Google kalendári." });
    }
  };

const getSlovakiaTimeParts = (dateInput: string | Date) => {
  const date = new Date(dateInput);
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Bratislava",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const getValue = (type: Intl.DateTimeFormatPartTypes) => {
      const part = parts.find(p => p.type === type);
      return part ? parseInt(part.value, 10) : 0;
    };
    return {
      year: getValue("year"),
      month: getValue("month"),
      day: getValue("day"),
      hour: getValue("hour"),
      minute: getValue("minute")
    };
  } catch (e) {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes()
    };
  }
};

  // Get position style for booking on the horizontal timeline
  const getBookingStyle = (booking: Booking, dateStr: string) => {
    const startParts = getSlovakiaTimeParts(booking.start);
    const start = new Date(booking.start);
    const end = new Date(booking.end);

    const totalMinutes = (openingHours.endHour - openingHours.startHour) * 60;
    
    // Calculate start offset in minutes from openingHours.startHour using Slovakia timezone
    const startMinutes = (startParts.hour - openingHours.startHour) * 60 + startParts.minute;
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
    const baseStyle = "backdrop-blur-md shadow-lg border-t border-r border-b";
    
    if (currentUser && currentUser.id === booking.user_id) {
      return {
        bg: "linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(234, 179, 8, 0.05) 100%)",
        border: `${baseStyle} border-yellow-500/20 border-l-4 border-l-yellow-400`,
        text: "text-yellow-400 drop-shadow-md",
        badgeBg: "bg-yellow-500/20 text-yellow-300",
        label: "Vaša rezervácia"
      };
    }

    if (booking.status === "blocked") {
      return {
        bg: "linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.05) 100%)",
        border: `${baseStyle} border-amber-500/20 border-l-4 border-l-amber-500`,
        text: "text-amber-300 drop-shadow-md",
        badgeBg: "bg-amber-500/20 text-amber-300",
        label: "Údržba"
      };
    }
    
    switch (booking.source) {
      case "voice-assistant":
        return {
          bg: "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(6, 182, 212, 0.05) 100%)",
          border: `${baseStyle} border-cyan-500/20 border-l-4 border-l-cyan-400`,
          text: "text-cyan-200 drop-shadow-md",
          badgeBg: "bg-cyan-500/20 text-cyan-300",
          label: "Telio Hlas"
        };
      case "google-calendar":
        return {
          bg: "linear-gradient(135deg, rgba(167, 139, 250, 0.2) 0%, rgba(167, 139, 250, 0.05) 100%)",
          border: `${baseStyle} border-purple-500/20 border-l-4 border-l-purple-400`,
          text: "text-purple-200 drop-shadow-md",
          badgeBg: "bg-purple-500/20 text-purple-300",
          label: "GCal"
        };
      case "admin":
        return {
          bg: "linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.05) 100%)",
          border: `${baseStyle} border-red-500/20 border-l-4 border-l-red-500`,
          text: "text-red-200 drop-shadow-md",
          badgeBg: "bg-red-500/20 text-red-300",
          label: "Recepcia"
        };
      default:
        return {
          bg: "linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.05) 100%)",
          border: `${baseStyle} border-green-500/20 border-l-4 border-l-green-400`,
          text: "text-green-200 drop-shadow-md",
          badgeBg: "bg-green-500/20 text-green-300",
          label: "Web"
        };
    }
  };

  return (
    <section className="relative w-full flex flex-col items-center px-2 md:px-8" style={{ maxWidth: "84rem", width: "100%", margin: "1rem auto 0", paddingBottom: "6rem" }}>
      
      {/* Small stats info bar */}
      {false && (
        <div className="w-full flex flex-wrap justify-center items-center gap-6 text-xs font-bold text-slate-400 mb-8">
          <span className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/5 bg-[#0c0c16]/50 backdrop-blur-md shadow-lg">
            <span className="text-[#00D4FF] font-black text-sm">8</span> indoor tenisových kurtov
          </span>
          <span className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/5 bg-[#0c0c16]/50 backdrop-blur-md shadow-lg">
            <span className="text-[#7B61FF] font-black text-sm">10</span> bedmintonových kurtov
          </span>
          <span className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/5 bg-[#0c0c16]/50 backdrop-blur-md shadow-lg">
            <span className="text-cyan-400 font-black text-sm">24/7</span> hlasové rezervácie cez Telio
          </span>
        </div>
      )}

      {/* Top Banner / Simulator Notice */}
      {false && (
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
            <span className="px-6 py-2.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-300 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
              Telio Hlasový asistent ready
            </span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="w-full flex flex-col space-y-4 md:space-y-6">
        
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
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 rounded-3xl border px-4 md:px-8 py-4 mb-4 md:mb-8 min-h-[90px]" style={{ background: "rgba(12,12,20,0.72)", borderColor: "var(--border)" }}>
          
          {/* Left: Today's fixed date button */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setBaseDate(new Date())}
              className="px-6 py-2.5 rounded-full border border-white/10 hover:bg-white/5 text-xs font-black text-slate-300 transition-colors cursor-pointer hover:border-cyan-500/40 flex items-center gap-2"
              title="Prejsť na dnešný deň"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
              Dnes: {new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "numeric", year: "numeric" }).format(new Date())}
            </button>
          </div>

          {/* Center: Navigation arrows directly around the date */}
          <div className="flex items-center justify-center gap-4 flex-1 mx-4 min-w-[280px]">
            <button
              onClick={() => adjustDate(-1)}
              className="p-3 rounded-xl border border-white/10 hover:bg-white/5 text-white transition-colors cursor-pointer hover:border-cyan-500/40 flex-shrink-0"
              title="Predchádzajúci deň"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <h2 className="text-white font-extrabold text-base tracking-wide text-center min-w-[180px] select-none">
              {formattedDate}
            </h2>

            <button
              onClick={() => adjustDate(1)}
              className="p-3 rounded-xl border border-white/10 hover:bg-white/5 text-white transition-colors cursor-pointer hover:border-cyan-500/40 flex-shrink-0"
              title="Nasledujúci deň"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
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
                
                {/* Removed redundant Day Header as date is prominently shown in the toolbar */}

                {/* Grid Layout Container */}
                <div className="overflow-auto w-full custom-scrollbar" style={{ maxHeight: "65vh" }}>
                  {/* Timeline table */}
                  <div className="relative" style={{ minWidth: "900px" }}>
                    
                    {/* Current Time Indicator (Global) */}
                    {isToday && (() => {
                      const now = new Date();
                      const totalMinutes = (openingHours.endHour - openingHours.startHour) * 60;
                      const startMinutes = (now.getHours() - openingHours.startHour) * 60 + now.getMinutes();
                      const nowPercent = (startMinutes / totalMinutes) * 100;
                      
                      if (nowPercent >= 0 && nowPercent <= 100) {
                        return (
                          <div 
                            className="absolute top-0 bottom-0 pointer-events-none z-[35]"
                            style={{ left: `calc(100px + (100% - 100px) * ${nowPercent / 100})` }}
                          >
                            {/* Faint dashed line over the whole height */}
                            <div className="absolute top-0 bottom-0 w-[1px] border-l border-dashed border-cyan-400/40 -translate-x-1/2"></div>
                            {/* A subtle indicator at the top header */}
                            <div className="absolute top-[38px] w-[5px] h-[5px] rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,255,209,0.8)] -translate-x-1/2"></div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {/* Time Column Headers */}
                    <div 
                      className="grid border-b border-white/5 text-2xs font-extrabold tracking-wider text-slate-400 sticky top-0 z-40 shadow-xl"
                      style={{ gridTemplateColumns: `100px 1fr`, background: "rgba(12, 12, 20, 0.98)" }}
                    >
                      {/* Left Corner */}
                      <div className="sticky left-0 z-50 p-3 border-r border-white/5 text-center flex items-center justify-center font-bold text-slate-500" style={{ background: "rgba(12, 12, 20, 0.98)" }}>
                        {selectedSport === "tennis-clay" ? "Dvorec" : "Kurt"}
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
                            className="grid hover:bg-white/[0.01] transition-colors relative"
                            style={{ gridTemplateColumns: `100px 1fr` }}
                          >
                            {/* Court Title on Left */}
                            <div className="sticky left-0 z-20 p-3 border-r border-white/5 flex flex-col justify-center items-center text-center" style={{ background: "rgba(12, 12, 20, 0.95)" }}>
                              <span className="text-xs font-black text-white">{court.name}</span>
                              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{court.surface}</span>
                            </div>

                            {/* Timeline Cells and bookings overlay */}
                            <div className="relative h-20 w-full flex items-center group/row">
                              
                              {/* Background slot grid lines & click areas */}
                              <div className="absolute inset-0 grid w-full h-full" style={{ gridTemplateColumns: `repeat(${totalSlotsCount}, 1fr)` }}>
                                {Array.from({ length: totalSlotsCount }).map((_, slotIdx) => {
                                  const targetSlot = timeSlots[slotIdx];
                                  
                                  // Check block/maintenance times
                                  const blockStatus = (() => {
                                    if (selectedSport === "tennis-clay") {
                                      if (court.id === "tennis-clay-1" || court.id === "tennis-clay-2") {
                                        if (targetSlot.hour === 13) {
                                          return { type: "maintenance", label: "Údržba" };
                                        }
                                      }
                                      if (court.id === "tennis-clay-10" || court.id === "tennis-clay-11") {
                                        if (targetSlot.hour === 7) {
                                          return { type: "closed", label: "Mimo prevádzky" };
                                        }
                                        if (targetSlot.hour === 12) {
                                          return { type: "maintenance", label: "Údržba" };
                                        }
                                        if (targetSlot.hour >= 16) {
                                          return { type: "closed", label: "Mimo prevádzky" };
                                        }
                                      }
                                    }
                                    return null;
                                  })();

                                  if (blockStatus) {
                                    if (blockStatus.type === "maintenance") {
                                      return (
                                        <div
                                          key={slotIdx}
                                          className="h-full border-r border-white/10 bg-amber-500/10 flex flex-col items-center justify-center text-center px-1 text-[9px] font-black text-amber-400 select-none border-y border-amber-500/20"
                                          title="Údržba kurtov"
                                        >
                                          <span className="leading-tight text-amber-500/80">Údržba kurtov</span>
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <div
                                          key={slotIdx}
                                          className="h-full border-r border-white/10 bg-slate-950/70 flex items-center justify-center text-center px-1 text-[9px] font-bold text-slate-600 uppercase select-none"
                                          title="Mimo prevádzky"
                                        >
                                          <span className="block w-full h-full bg-slate-900/40"></span>
                                        </div>
                                      );
                                    }
                                  }

                                  return (
                                    <button
                                      key={slotIdx}
                                      onClick={() => handleCellClick(court.id, date, targetSlot)}
                                      className="h-full border-r border-white/5 hover:bg-white/[0.04] focus:bg-white/[0.06] focus:outline-none transition-all flex items-center justify-center text-white/0 hover:text-cyan-400 group/cell cursor-pointer"
                                      title={`Kliknutím rezervujete od ${targetSlot.label}`}
                                    >
                                      <Plus className="h-4 w-4 opacity-0 group-hover/cell:opacity-100 transition-all scale-75 group-hover/cell:scale-100" />
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
                                    
                                    const startParts = getSlovakiaTimeParts(booking.start);
                                    const endParts = getSlovakiaTimeParts(booking.end);
                                    const startTimeStr = `${String(startParts.hour).padStart(2, "0")}:${String(startParts.minute).padStart(2, "0")}`;
                                    const endTimeStr = `${String(endParts.hour).padStart(2, "0")}:${String(endParts.minute).padStart(2, "0")}`;
                                    const timeLabel = `${startTimeStr} - ${endTimeStr}`;
                                    const canDelete = currentUser && (currentUser.role === 'admin' || currentUser.id === booking.user_id);

                                    return (
                                      <div
                                        key={booking.id}
                                        className={`absolute h-full rounded-xl pointer-events-auto flex items-center overflow-hidden transition-all px-2 group/booking hover:z-20 hover:-translate-y-0.5 hover:shadow-xl ${meta.border}`}
                                        style={{
                                          ...style,
                                          background: meta.bg,
                                          left: `calc(${style.left} + 2px)`,
                                          width: `calc(${style.width} - 4px)`
                                        }}
                                        title={`${meta.label}: ${timeLabel}`}
                                      >
                                        <div className={`flex flex-col items-start leading-[1.2] ${canDelete ? 'pr-6' : 'pr-0'} ${meta.text}`}>
                                          <span className="text-[10px] font-bold font-mono select-none">
                                            {startTimeStr}
                                          </span>
                                          <span className="text-[10px] font-bold font-mono select-none opacity-80">
                                            {endTimeStr}
                                          </span>
                                        </div>
                                        {canDelete && (
                                          <button
                                            onClick={(e) => handleDeleteBookingClick(booking.id, e)}
                                            className={`absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 opacity-0 group-hover/booking:opacity-100 transition-all scale-90 hover:scale-100`}
                                            title="Zmazať rezerváciu"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        )}
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
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Content */}
          <div 
            className="relative w-full max-w-md rounded-3xl border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in duration-300"
            style={{ background: "linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))" }}
          >
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
            
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-full">NTC Rezervácia</span>
                  <h3 className="text-xl font-bold text-white mt-3">Nová rezervácia</h3>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 mb-8 space-y-2 text-sm text-slate-300">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Kurt</span>
                  <span className="font-bold text-white flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
                    {courts.find((c) => c.id === selectedSlot.courtId)?.name || ""} <span className="text-slate-500 text-xs font-normal">({sportLabels[selectedSport]})</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Dátum</span>
                  <span className="font-bold text-white">
                    {new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "long", year: "numeric" }).format(selectedSlot.date)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Začiatok</span>
                  <span className="font-bold text-white">
                    {String(selectedSlot.hour).padStart(2, "0")}:{String(selectedSlot.minute).padStart(2, "0")}
                  </span>
                </div>
              </div>

            <form onSubmit={handleCreateBookingSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 pl-1">Poznámka / Názov hry</label>
                  <div className="relative flex items-center group">
                    <MessageSquare className="absolute left-4 h-4 w-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors z-10 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="napr. Štvorhra s priateľmi"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 text-sm text-white bg-white/5 border border-white/5 rounded-xl outline-none focus:bg-cyan-500/5 focus:border-cyan-500/30 focus:ring-1 focus:ring-cyan-500/30 transition-all placeholder:text-slate-600"
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 pl-1">Dĺžka rezervácie</label>
                  <div className="relative flex items-center group">
                    <Clock className="absolute left-4 h-4 w-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors z-10 pointer-events-none" />
                    <select
                      value={formDurationMinutes}
                      onChange={(e) => setFormDurationMinutes(parseInt(e.target.value))}
                      className="w-full h-14 pl-12 pr-10 text-sm text-white bg-white/5 border border-white/5 rounded-xl outline-none focus:bg-cyan-500/5 focus:border-cyan-500/30 focus:ring-1 focus:ring-cyan-500/30 transition-all appearance-none"
                    >
                      <option value={30} className="bg-slate-900 text-white">30 minút</option>
                      <option value={60} className="bg-slate-900 text-white">1 hodina</option>
                      <option value={90} className="bg-slate-900 text-white">1,5 hodiny</option>
                      <option value={120} className="bg-slate-900 text-white">2 hodiny</option>
                    </select>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="text-xs font-bold text-red-400 bg-red-950/20 border border-red-500/20 rounded-xl p-3">
                  ⚠ {errorMsg}
                </div>
              )}

              <button
                type="submit"
                className="ntc-booking-submit-btn"
              >
                Vytvoriť rezerváciu
              </button>
            </form>
          </div>
        </div>
        </div>
      )}

      {/* Confirmation/Error Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            onClick={() => confirmModal.isError ? setConfirmModal({ isOpen: false }) : null}
          />
          <div 
            className="relative w-full max-w-sm rounded-3xl border overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200"
            style={{ 
              background: "rgba(15, 23, 42, 0.95)", 
              borderColor: confirmModal.isError ? "rgba(239, 68, 68, 0.3)" : "var(--border)" 
            }}
          >
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-2xl ${confirmModal.isError ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  {confirmModal.isError ? <X className="h-6 w-6" /> : <Trash2 className="h-6 w-6" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {confirmModal.isError ? "Chyba" : "Zrušiť rezerváciu"}
                  </h3>
                </div>
              </div>
              <p className="text-sm text-slate-300 mb-6">
                {confirmModal.message}
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmModal({ isOpen: false })}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-300 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  {confirmModal.isError ? "Zavrieť" : "Nie, ponechať"}
                </button>
                {!confirmModal.isError && (
                  <button
                    onClick={executeDeleteBooking}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                  >
                    Áno, zrušiť
                  </button>
                )}
              </div>
            </div>
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