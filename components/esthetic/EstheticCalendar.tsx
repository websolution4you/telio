"use client";

import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, Clock, Sparkles, X, UserCheck, Phone, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

type Doctor = {
  id: string;
  name: string;
  specialty: string;
};

const doctors: Doctor[] = [
  { id: "dr-vrbova", name: "MUDr. Elena Valová", specialty: "Korektívna dermatológia" },
  { id: "dr-stefankova", name: "MUDr. Adriana Šimková", specialty: "Estetická chirurgia & anti-aging" }
];

const hourSlots = [9, 10, 11, 12, 13, 14, 15, 16];

export default function EstheticCalendar() {
  const [baseDate, setBaseDate] = useState(() => {
    const d = new Date();
    return d;
  });

  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date;
    hour: number;
    doctor: Doctor;
  } | null>(null);

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate 5 working days starting from baseDate
  const visibleDates = useMemo(() => {
    const list: Date[] = [];
    const temp = new Date(baseDate);
    for (let i = 0; i < 5; i++) {
      const d = new Date(temp);
      d.setDate(temp.getDate() + i);
      list.push(d);
    }
    return list;
  }, [baseDate]);

  // Fetch bookings for the visible week from Supabase
  useEffect(() => {
    async function loadBookings() {
      setLoading(true);
      try {
        const start = new Date(visibleDates[0]);
        start.setHours(0, 0, 0, 0);

        const end = new Date(visibleDates[visibleDates.length - 1]);
        end.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from("bookings_esthetic")
          .select("start_at, end_at, doctor_id")
          .eq("status", "confirmed")
          .gte("start_at", start.toISOString())
          .lte("start_at", end.toISOString());

        if (error) {
          console.error("Error loading esthetic bookings:", error.message);
        } else {
          setBookings(data || []);
        }
      } catch (err) {
        console.error("Failed to load bookings:", err);
      } finally {
        setLoading(false);
      }
    }

    if (visibleDates.length > 0) {
      loadBookings();
    }
  }, [visibleDates]);

  // Check actual occupancy from loaded bookings
  const getSlotStatus = (date: Date, hour: number, doctorId: string) => {
    const dbDoctorId = doctorId === "dr-vrbova" ? "vrbova" : "stefankova";

    const isBooked = bookings.some((booking) => {
      const bookingStart = new Date(booking.start_at);
      const sameDoctor = booking.doctor_id === dbDoctorId;
      const sameDate =
        bookingStart.getFullYear() === date.getFullYear() &&
        bookingStart.getMonth() === date.getMonth() &&
        bookingStart.getDate() === date.getDate();
      const sameHour = bookingStart.getHours() === hour;

      return sameDoctor && sameDate && sameHour;
    });

    return isBooked ? "busy" : "free";
  };


  const adjustDate = (days: number) => {
    const next = new Date(baseDate);
    next.setDate(next.getDate() + days);
    setBaseDate(next);
  };

  const formatDateLabel = (date: Date) => {
    const dayName = new Intl.DateTimeFormat("sk-SK", { weekday: "short" }).format(date);
    const dayNum = date.getDate();
    const month = new Intl.DateTimeFormat("sk-SK", { month: "short" }).format(date);
    return {
      weekday: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      label: `${dayNum}. ${month}`
    };
  };

  const formattedMonthYear = useMemo(() => {
    const startStr = new Intl.DateTimeFormat("sk-SK", { month: "long", year: "numeric" }).format(baseDate);
    return startStr.charAt(0).toUpperCase() + startStr.slice(1);
  }, [baseDate]);

  const handleCellClick = (date: Date, hour: number, doctor: Doctor, status: string) => {
    if (status === "busy") return;
    
    setSelectedSlot({
      date,
      hour,
      doctor
    });
  };

  const triggerCallAssistant = () => {
    setSelectedSlot(null);
    const assistantEl = document.getElementById("telio-voice-assistant");
    if (assistantEl) {
      assistantEl.scrollIntoView({ behavior: "smooth", block: "center" });
      assistantEl.classList.add("ring-2", "ring-amber-400/50");
      setTimeout(() => {
        assistantEl.classList.remove("ring-2", "ring-amber-400/50");
      }, 2000);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto rounded-3xl p-6 md:p-8 border backdrop-blur-xl transition-all duration-500"
      style={{
        background: "linear-gradient(135deg, rgba(20, 16, 26, 0.5) 0%, rgba(12, 10, 15, 0.8) 100%)",
        borderColor: "rgba(224, 180, 120, 0.12)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
      }}
    >
      {/* Calendar Header with navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-[0.25em] mb-1.5" style={{ color: "#E0B478" }}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>Harmonogram lekárov</span>
            {loading && <Loader2 className="w-3 h-3 animate-spin text-amber-400 ml-1" />}
          </div>
          <h3 className="text-xl md:text-2xl font-serif text-stone-100 tracking-wide">
            Konzultačné Termíny
          </h3>
        </div>

        {/* Date Selector controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => adjustDate(-5)}
            className="p-2.5 rounded-xl border transition-colors hover:border-amber-400/30 bg-stone-900/40 text-stone-300 cursor-pointer"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-xs md:text-sm font-semibold tracking-wider text-stone-200 min-w-[120px] text-center font-serif">
            {formattedMonthYear}
          </span>

          <button
            onClick={() => adjustDate(5)}
            className="p-2.5 rounded-xl border transition-colors hover:border-amber-400/30 bg-stone-900/40 text-stone-300 cursor-pointer"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Responsive Calendar View */}
      <div className="overflow-x-auto w-full -mx-4 px-4 md:mx-0 md:px-0 scrollbar-thin">
        <div className="min-w-[800px] flex flex-col gap-2">
          
          {/* Calendar Table Headers */}
          <div className="grid grid-cols-11 gap-2 items-center text-center pb-3 border-b" style={{ borderColor: "rgba(224, 180, 120, 0.08)" }}>
            <div className="col-span-1 text-xs text-stone-500 font-bold uppercase tracking-wider text-left pl-2">
              Lekár / Čas
            </div>
            {visibleDates.map((date, idx) => {
              const info = formatDateLabel(date);
              return (
                <div key={idx} className="col-span-2 flex flex-col items-center py-2 rounded-xl bg-stone-900/30 border border-white/5 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-amber-400/80 tracking-widest">{info.weekday}</span>
                  <span className="text-xs font-serif text-stone-100 font-medium mt-0.5">{info.label}</span>
                </div>
              );
            })}
          </div>

          {/* Grid rows by Hour Slots */}
          {hourSlots.map((hour) => {
            return (
              <div key={hour} className="grid grid-cols-11 gap-2 items-center py-1">
                {/* Time Indicator column */}
                <div className="col-span-1 flex items-center gap-1.5 text-xs text-stone-300 font-semibold font-mono pl-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400/60" />
                  {`${hour}:00`}
                </div>

                {/* Day data slots */}
                {visibleDates.map((date, dayIdx) => {
                  return (
                    <div key={dayIdx} className="col-span-2 grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-stone-950/40 border border-white/5 transition-all hover:border-amber-400/10">
                      {doctors.map((doctor) => {
                        const status = getSlotStatus(date, hour, doctor.id);
                        const isBusy = status === "busy";
                        return (
                          <div
                            key={doctor.id}
                            onClick={() => handleCellClick(date, hour, doctor, status)}
                            title={`${doctor.name} - ${hour}:00`}
                            className={`p-2 rounded-lg text-center border text-[9px] font-semibold transition-all duration-200 select-none relative group ${
                              isBusy
                                ? "bg-stone-900/40 text-stone-600 border-transparent opacity-30 cursor-not-allowed"
                                : "bg-amber-400/5 hover:border-amber-400/50 hover:bg-amber-400/10 cursor-pointer text-stone-200"
                            }`}
                            style={{
                              borderColor: isBusy ? "transparent" : "rgba(224, 180, 120, 0.2)",
                            }}
                          >
                            <span className="block truncate opacity-85 group-hover:opacity-100">
                              {doctor.name.split(" ").slice(-1)[0]}
                            </span>
                            
                            {/* Visual indicator of availability */}
                            <span className="absolute bottom-1 right-1 w-1 h-1 rounded-full"
                              style={{
                                backgroundColor: isBusy ? "rgba(120,120,120,0.3)" : "#E0B478",
                                boxShadow: isBusy ? "none" : "0 0 4px #E0B478"
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}

        </div>
      </div>

      {/* Interactive explanations info bar */}
      <div className="mt-8 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border"
        style={{
          borderColor: "rgba(224, 180, 120, 0.08)",
          background: "rgba(255, 255, 255, 0.01)"
        }}
      >
        <div className="flex items-start md:items-center gap-3">
          <div className="p-2 rounded-xl" style={{ background: "rgba(224, 180, 120, 0.1)", color: "#E0B478" }}>
            <Calendar className="w-4.5 h-4.5" />
          </div>
          <div>
            <h5 className="text-xs font-semibold text-stone-200 tracking-wider">Potrebujete termín v kalendári?</h5>
            <p className="text-[11px] text-stone-500 font-medium">Kliknutím na voľné políčko kalendára zistíte, ako si vybraný čas rezervovať.</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-stone-500 font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border" style={{ borderColor: "rgba(224, 180, 120, 0.4)", backgroundColor: "rgba(224, 180, 120, 0.08)" }} />
            <span>Voľný termín</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-stone-800 opacity-40" />
            <span>Obsadené</span>
          </div>
        </div>
      </div>

      {/* Explanatory Drawer / Modal Dialog */}
      <AnimatePresence>
        {selectedSlot && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            {/* Overlay backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSlot(null)}
              className="absolute inset-0 bg-stone-950/70 backdrop-blur-sm"
            />

            {/* Modal Dialog Body */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-md rounded-3xl p-6 md:p-8 border shadow-2xl z-10"
              style={{
                background: "linear-gradient(135deg, rgba(24, 20, 30, 0.95) 0%, rgba(12, 10, 15, 0.98) 100%)",
                borderColor: "rgba(224, 180, 120, 0.25)",
                boxShadow: "0 30px 60px -15px rgba(0,0,0,0.8)"
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedSlot(null)}
                className="absolute right-4 top-4 p-2 rounded-xl text-stone-500 hover:text-stone-200 hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center">
                <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-4"
                  style={{ background: "rgba(224, 180, 120, 0.1)", color: "#E0B478" }}
                >
                  <UserCheck className="w-6 h-6" />
                </div>

                <h4 className="text-lg md:text-xl font-serif text-stone-100 tracking-wide mb-1">
                  Konzultácia s Lekárom
                </h4>
                
                <p className="text-xs text-amber-300 font-medium mb-4 font-mono">
                  {new Intl.DateTimeFormat("sk-SK", { weekday: "long", day: "numeric", month: "long" }).format(selectedSlot.date)}
                  {` o ${selectedSlot.hour}:00 (${selectedSlot.doctor.name})`}
                </p>

                <div className="p-4 rounded-2xl border text-xs text-stone-300 leading-relaxed font-sans mb-6 text-left"
                  style={{ borderColor: "rgba(255,255,255,0.04)", backgroundColor: "rgba(0,0,0,0.2)" }}
                >
                  <span className="font-bold text-amber-50 block mb-1">Dôležitá informácia:</span>
                  Pri estetických zákrokoch nie je možné vykonať priamu rezerváciu bez predchádzajúcej konzultácie. Náš hlasový asistent Telio overí vaše požiadavky na zákrok, poskytne informácie a tento termín vám ihneď zarezervuje do kalendára.
                </div>

                {/* Call assistant CTA */}
                <button
                  onClick={triggerCallAssistant}
                  className="w-full py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 font-semibold text-xs tracking-wider uppercase transition-all duration-300 relative group overflow-hidden cursor-pointer text-stone-950"
                  style={{
                    background: "linear-gradient(135deg, #E0B478 0%, #C99757 100%)"
                  }}
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                  <Phone className="w-4 h-4 relative z-10" />
                  <span className="relative z-10 font-bold">Zavolať Asistentovi</span>
                </button>

                <button
                  onClick={() => setSelectedSlot(null)}
                  className="mt-3 text-xs text-stone-500 hover:text-stone-300 transition-colors font-medium"
                >
                  Zavrieť detail
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
