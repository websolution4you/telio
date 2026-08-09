"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, LayoutDashboard, LogIn, LogOut, Plus, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import TennisBallAvatar from "@/components/icons/TennisBallAvatar";
import { createBookingAction, deleteBookingAction, fetchBookingsAction } from "@/app/actions/bookings";
import { logoutAction } from "@/app/actions/auth";
import { supabase } from "@/lib/supabase";
import type { BookingUser } from "@/lib/auth/bookingAuth";
import type { Booking, Court, SportType } from "@/lib/bookings/mockBookings";
import { openingHours } from "@/lib/bookings/mockBookings";
import NewBookingAuth from "./NewBookingAuth";
import { BookingDetailDialog, CreateBookingDialog, DeleteDialog } from "./NewBookingDialogs";

type Props = { courts: Court[]; initialBookings: Booking[]; currentUser: BookingUser | null };
type Slot = { courtId: string; date: Date; hour: number };

const sports: { id: SportType; label: string }[] = [
  { id: "badminton", label: "Bedminton" },
  { id: "squash", label: "Squash" },
  { id: "tennis", label: "Tenis indoor" },
  { id: "tennis-clay", label: "Tenis antuka" },
];

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const formatTime = (value: string) => new Intl.DateTimeFormat("sk-SK", { timeZone: "Europe/Bratislava", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

function DatePicker({ value, min, max, onSelect, onClose }: { value: Date; min: Date; max: Date; onSelect: (date: Date) => void; onClose: () => void }) {
  const [month, setMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const firstGridDay = useMemo(() => {
    const first = new Date(month);
    const mondayOffset = (first.getDay() + 6) % 7;
    first.setDate(first.getDate() - mondayOffset);
    return first;
  }, [month]);
  const days = useMemo(() => Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstGridDay);
    day.setDate(day.getDate() + index);
    day.setHours(12, 0, 0, 0);
    return day;
  }), [firstGridDay]);
  const minMonth = new Date(min.getFullYear(), min.getMonth(), 1);
  const maxMonth = new Date(max.getFullYear(), max.getMonth(), 1);
  const canMoveBack = month > minMonth;
  const canMoveForward = month < maxMonth;

  const moveMonth = (offset: number) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Vybrať dátum rezervácie">
      <button type="button" className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={onClose} aria-label="Zavrieť kalendár" />
      <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" disabled={!canMoveBack} onClick={() => moveMonth(-1)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 disabled:cursor-not-allowed disabled:opacity-25" aria-label="Predchádzajúci mesiac"><ChevronLeft className="h-4 w-4" /></button>
          <strong className="text-base capitalize">{new Intl.DateTimeFormat("sk-SK", { month: "long", year: "numeric" }).format(month)}</strong>
          <button type="button" disabled={!canMoveForward} onClick={() => moveMonth(1)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 disabled:cursor-not-allowed disabled:opacity-25" aria-label="Nasledujúci mesiac"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="mb-2 grid grid-cols-7 text-center text-xs font-bold text-slate-500">{["Po", "Ut", "St", "Št", "Pi", "So", "Ne"].map((day) => <span key={day} className="py-2">{day}</span>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const allowed = day >= min && day <= max;
            const outsideMonth = day.getMonth() !== month.getMonth();
            const selected = dateKey(day) === dateKey(value);
            return <button type="button" key={dateKey(day)} disabled={!allowed} onClick={() => onSelect(day)} className={`aspect-square rounded-xl text-sm font-semibold transition ${selected ? "bg-slate-950 text-white shadow-md" : allowed ? "cursor-pointer text-slate-800 hover:bg-emerald-50 hover:text-emerald-700" : "cursor-not-allowed bg-slate-50/70 text-slate-300 line-through decoration-slate-300"} ${outsideMonth && allowed ? "text-slate-400" : ""}`} aria-label={new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "long", year: "numeric" }).format(day)}>{day.getDate()}</button>;
          })}
        </div>
        <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-center text-xs font-medium text-slate-500">Rezerváciu je možné vytvoriť najviac 14 dní vopred.</p>
      </div>
    </div>
  );
}

function blockedLabel(courtId: string, sport: SportType, hour: number) {
  if (sport !== "tennis-clay") return null;
  if (["tennis-clay-1", "tennis-clay-2"].includes(courtId) && hour === 13) return "Údržba";
  if (["tennis-clay-10", "tennis-clay-11"].includes(courtId)) {
    if (hour === 7 || hour >= 16) return "Mimo prevádzky";
    if (hour === 12) return "Údržba";
  }
  return null;
}

function clayError(courtId: string, sport: SportType, hour: number, duration: number) {
  if (sport !== "tennis-clay") return null;
  const end = hour + duration / 60;
  if (["tennis-clay-1", "tennis-clay-2"].includes(courtId) && hour < 14 && end > 13) return "Od 13:00 do 14:00 prebieha údržba.";
  if (["tennis-clay-10", "tennis-clay-11"].includes(courtId)) {
    if (hour < 8) return "Dvorce 10 a 11 sú pred 8:00 mimo prevádzky.";
    if (hour < 13 && end > 12) return "Od 12:00 do 13:00 prebieha údržba.";
    if (end > 16.5) return "Dvorce 10 a 11 sú otvorené iba do 16:30.";
  }
  return null;
}

function playTennisHitSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // 1. Tennis Racket Hit
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.08);
    oscGain.gain.setValueAtTime(1.0, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);

    const popOsc = ctx.createOscillator();
    const popGain = ctx.createGain();
    popOsc.type = "triangle";
    popOsc.frequency.setValueAtTime(780, now);
    popOsc.frequency.exponentialRampToValueAtTime(240, now + 0.06);
    popGain.gain.setValueAtTime(0.7, now);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    popOsc.connect(popGain);
    popGain.connect(ctx.destination);
    popOsc.start(now);
    popOsc.stop(now + 0.08);

    const snapSize = Math.floor(ctx.sampleRate * 0.04);
    const snapBuf = ctx.createBuffer(1, snapSize, ctx.sampleRate);
    const snapData = snapBuf.getChannelData(0);
    for (let i = 0; i < snapSize; i++) {
      snapData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (snapSize * 0.2));
    }
    const snap = ctx.createBufferSource();
    snap.buffer = snapBuf;
    const snapFilter = ctx.createBiquadFilter();
    snapFilter.type = "bandpass";
    snapFilter.frequency.setValueAtTime(1500, now);
    snapFilter.Q.setValueAtTime(2, now);
    const snapGain = ctx.createGain();
    snapGain.gain.setValueAtTime(0.6, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    snap.connect(snapFilter);
    snapFilter.connect(snapGain);
    snapGain.connect(ctx.destination);
    snap.start(now);
    snap.stop(now + 0.05);

    // 2. Short Applause / Clapping Effect
    const applauseDuration = 1.3;
    const startApplause = now + 0.1;
    const applauseMasterGain = ctx.createGain();
    applauseMasterGain.gain.setValueAtTime(0.001, startApplause);
    applauseMasterGain.gain.linearRampToValueAtTime(0.35, startApplause + 0.18);
    applauseMasterGain.gain.exponentialRampToValueAtTime(0.001, startApplause + applauseDuration);
    applauseMasterGain.connect(ctx.destination);

    const clapCount = 35;
    for (let i = 0; i < clapCount; i++) {
      const clapTime = startApplause + Math.pow(Math.random(), 0.85) * 0.95;
      const clapLen = Math.floor(ctx.sampleRate * 0.03);
      const clapBuf = ctx.createBuffer(1, clapLen, ctx.sampleRate);
      const cData = clapBuf.getChannelData(0);
      for (let j = 0; j < clapLen; j++) {
        cData[j] = (Math.random() * 2 - 1) * Math.exp(-j / (clapLen * 0.25));
      }
      const clapSource = ctx.createBufferSource();
      clapSource.buffer = clapBuf;

      const clapFilter = ctx.createBiquadFilter();
      clapFilter.type = "bandpass";
      clapFilter.frequency.setValueAtTime(900 + Math.random() * 1300, clapTime);
      clapFilter.Q.setValueAtTime(1.5 + Math.random() * 1.5, clapTime);

      const clapGain = ctx.createGain();
      clapGain.gain.setValueAtTime(0.25 + Math.random() * 0.35, clapTime);

      clapSource.connect(clapFilter);
      clapFilter.connect(clapGain);
      clapGain.connect(applauseMasterGain);

      clapSource.start(clapTime);
      clapSource.stop(clapTime + 0.035);
    }
  } catch (e) {
    console.error("Audio play error:", e);
  }
}

export default function NewBookingsCalendar({ courts, initialBookings, currentUser }: Props) {
  const router = useRouter();
  
  const voiceHighlightTimers = useRef(new Map<string, number>());
    const [sport, setSport] = useState<SportType>("badminton");
  const [date, setDate] = useState(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [items, setItems] = useState(initialBookings);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(false);
  const [auth, setAuth] = useState<"login" | "register" | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [detail, setDetail] = useState<Booking | null>(null);
  const [deleting, setDeleting] = useState<Booking | null>(null);
  const [notice, setNotice] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
    const [duration, setDuration] = useState(60);
  const [now, setNow] = useState(() => new Date());
  const [highlightedVoiceBookings, setHighlightedVoiceBookings] = useState<string[]>([]);
  const today = useMemo(() => { const value = new Date(); value.setHours(0, 0, 0, 0); return value; }, []);
  const maxDate = useMemo(() => { const value = new Date(today); value.setDate(value.getDate() + 14); value.setHours(23, 59, 59, 999); return value; }, [today]);
  const hours = useMemo(() => Array.from({ length: openingHours.endHour - openingHours.startHour }, (_, index) => openingHours.startHour + index), []);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);

  const courtColumnWidth = 100;
  const timeColumnMinWidth = 64;
  const calendarMinWidth = courtColumnWidth + hours.length * timeColumnMinWidth;
  const calendarColumns = `${courtColumnWidth}px minmax(${hours.length * timeColumnMinWidth}px, 1fr)`;
  const timeColumns = `repeat(${hours.length}, minmax(${timeColumnMinWidth}px, 1fr))`; 

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end = new Date(date); end.setHours(23, 59, 59, 999);
      const result = await fetchBookingsAction(start.toISOString(), end.toISOString());
      if (active && result.success && result.bookings) setItems(result.bookings as Booking[]);
      if (active) setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [date, reload]);

  useEffect(() => {
    const timers = voiceHighlightTimers.current;
    const channel = supabase.channel("newbookings-realtime").on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, (payload) => {
      setReload((value) => value + 1);
      if (payload.eventType !== "INSERT") return;

      const raw = payload.new as any;
      if (!raw?.id) return;

      let source = raw?.source;
      if (!source && raw?.notes) {
        try {
          const notesObj = typeof raw.notes === "string" ? JSON.parse(raw.notes) : raw.notes;
          source = notesObj?.source;
        } catch (e) {}
      }

      if (source === "voice-assistant") {
        const bookingId = raw.id;
        playTennisHitSound();
        setHighlightedVoiceBookings((current) => current.includes(bookingId) ? current : [...current, bookingId]);
        const existingTimer = timers.get(bookingId);
        if (existingTimer) window.clearTimeout(existingTimer);
        const timer = window.setTimeout(() => {
          setHighlightedVoiceBookings((current) => current.filter((id) => id !== bookingId));
          timers.delete(bookingId);
        }, 4000);
        timers.set(bookingId, timer);
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const visibleCourts = useMemo(() => {
    let result = courts.filter((court) => court.sport === sport);
    if (sport === "tennis-clay" && [0, 6].includes(date.getDay())) result = result.filter((court) => ["tennis-clay-1", "tennis-clay-2"].includes(court.id));
    return result;
  }, [courts, sport, date]);
  const bookings = useMemo(() => items.filter((booking) => booking.status !== "cancelled" && dateKey(new Date(booking.start)) === dateKey(date) && courts.find((court) => court.id === booking.courtId)?.sport === sport), [items, date, courts, sport]);
  const isToday = dateKey(date) === dateKey(now);
  const currentTimePercent = useMemo(() => {
    const elapsedMinutes = (now.getHours() - openingHours.startHour) * 60 + now.getMinutes();
    const totalMinutes = (openingHours.endHour - openingHours.startHour) * 60;
    return Math.max(0, Math.min(100, elapsedMinutes / totalMinutes * 100));
  }, [now]);
  const currentTimeLabel = new Intl.DateTimeFormat("sk-SK", { hour: "2-digit", minute: "2-digit" }).format(now);

    const moveDate = (days: number) => {
    const next = new Date(date); next.setDate(next.getDate() + days); next.setHours(0, 0, 0, 0);
    if (next < today) return;
    if (next > maxDate) return setNotice("Rezervácie sú možné maximálne 14 dní vopred.");
    setDate(next);
  };
    const selectDate = (value: string) => {
    if (!value) return;
    const selected = new Date(`${value}T12:00:00`);
    if (selected < today || selected > maxDate) return setNotice("Vyberte dátum od dnešného dňa, maximálne 14 dní vopred.");
        setDate(selected);
    setDatePickerOpen(false);
  };
  
  const openSlot = (courtId: string, hour: number) => {
    if (!currentUser) return setAuth("login");
    const start = new Date(date); start.setHours(hour, 0, 0, 0);
    if (start < now) return setNotice("Rezerváciu v minulosti nie je možné vytvoriť.");
    setTitle(""); setPhone(currentUser.phone || ""); setDuration(60); setNotice(""); setSlot({ courtId, date: new Date(date), hour });
  };
  const hasConflict = (courtId: string, start: Date, end: Date) => bookings.some((booking) => booking.courtId === courtId && start < new Date(booking.end) && end > new Date(booking.start));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!slot || !currentUser) return;
    const validation = clayError(slot.courtId, sport, slot.hour, duration); if (validation) return setNotice(validation);
    const start = new Date(slot.date); start.setHours(slot.hour, 0, 0, 0); const end = new Date(start.getTime() + duration * 60000);
    if (hasConflict(slot.courtId, start, end)) return setNotice("Vybraný kurt je v tomto čase obsadený.");
    setLoading(true);
    const result = await createBookingAction({ courtId: slot.courtId, title: title.trim() || sports.find((item) => item.id === sport)?.label || "Rezervácia", customerName: currentUser.name, phone: phone || undefined, start: start.toISOString(), end: end.toISOString(), status: "confirmed", source: "web" });
    setLoading(false);
    if (!result.success || !result.booking) return setNotice(result.error || "Rezerváciu sa nepodarilo vytvoriť.");
    setItems((current) => [...current, result.booking as Booking]); setSlot(null); setNotice("Rezervácia bola úspešne vytvorená.");
  };
  const remove = async () => {
    if (!deleting) return; setLoading(true); const result = await deleteBookingAction(deleting.id); setLoading(false);
    if (!result.success) { setDeleting(null); return setNotice(result.error || "Rezerváciu sa nepodarilo zrušiť."); }
    setItems((current) => current.filter((booking) => booking.id !== deleting.id)); setDeleting(null); setDetail(null); setNotice("Rezervácia bola zrušená.");
  };
  const position = (booking: Booking) => {
    const start = new Date(booking.start); const end = new Date(booking.end); const total = (openingHours.endHour - openingHours.startHour) * 60; const offset = (start.getHours() - openingHours.startHour) * 60 + start.getMinutes();
    return { left: `${offset / total * 100}%`, width: `${(end.getTime() - start.getTime()) / 60000 / total * 100}%` };
  };

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-900" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <header className="relative isolate z-40 border-b border-cyan-100/80 bg-gradient-to-r from-white via-cyan-50/80 to-indigo-50/80 shadow-[0_10px_35px_rgba(15,23,42,0.07)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-16 -top-24 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="absolute -right-12 -top-28 h-48 w-48 rounded-full bg-violet-300/20 blur-3xl" />
        </div>
        <div className="relative mx-auto flex min-h-[76px] max-w-[1500px] items-center justify-between gap-2 px-4 py-3 sm:min-h-[86px] sm:gap-4 sm:px-6 lg:px-8">
          <Link href="/" className="group flex min-w-0 items-center gap-3 sm:gap-4" aria-label="Telio domov">
            <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.3),inset_0_1px_1px_rgba(255,255,255,0.5)] transition duration-300 group-hover:-translate-y-0.5 group-hover:rotate-[-2deg] sm:h-12 sm:w-12">
              <span className="text-lg font-extrabold" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>T</span>
              <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-white p-0.5 text-violet-600 shadow-sm" />
            </span>
            <span className="min-w-0"><strong className="block text-base font-extrabold tracking-[0.12em] text-slate-950 sm:text-lg" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>TELIO</strong><span className="hidden truncate text-[10px] font-semibold tracking-wide text-slate-500 sm:block sm:text-xs">Inteligentný rezervačný systém</span></span>
          </Link>
          {currentUser ? (
            <div className="relative z-50" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="shrink-0 cursor-pointer rounded-full p-0.5 transition hover:-translate-y-0.5 active:translate-y-0"
                title={currentUser.name}
                aria-label="Používateľské menu"
                aria-expanded={userMenuOpen}
              >
                <TennisBallAvatar name={currentUser.name} className="h-10 w-10" textSize="text-xs" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2.5 w-64 origin-top-right rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-3 mb-1">
                    <TennisBallAvatar name={currentUser.name} className="h-10 w-10" textSize="text-sm" />
                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-sm font-bold text-slate-900">{currentUser.name}</b>
                      <span className="block truncate text-[11px] font-semibold text-emerald-600">
                        {currentUser.role === "admin" ? "Administrátor" : "Aktívny účet"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Link
                      href="/dashboard/newbookings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition duration-150 group"
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition duration-150">
                        <LayoutDashboard className="h-4 w-4" />
                      </span>
                      <span>Moje štatistiky</span>
                    </Link>

                    <button
                      onClick={async () => {
                        setUserMenuOpen(false);
                        if (!window.confirm("Chcete sa naozaj odhlásiť?")) return;
                        await logoutAction();
                        router.refresh();
                      }}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold text-red-600 hover:bg-red-50 transition duration-150 group cursor-pointer"
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white transition duration-150">
                        <LogOut className="h-4 w-4" />
                      </span>
                      <span>Odhlásiť sa</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={() => setAuth("register")} className="group flex cursor-pointer items-center gap-1.5 rounded-2xl border border-indigo-200 bg-white/85 px-3 py-3 text-xs font-bold text-indigo-700 shadow-[0_8px_22px_rgba(79,70,229,0.12)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 sm:gap-2 sm:px-4 sm:text-sm"><UserPlus className="h-4 w-4" /> Registrovať sa</button>
              <button onClick={() => setAuth("login")} className="group flex cursor-pointer items-center gap-1.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-3 py-3 text-xs font-bold text-white shadow-[0_10px_24px_rgba(79,70,229,0.3)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(79,70,229,0.38)] sm:gap-2 sm:px-5 sm:text-sm"><LogIn className="h-4 w-4" /> Prihlásiť</button>
            </div>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
      </header>
      <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:py-12">
        <div className="mx-auto mb-10 flex w-full max-w-5xl flex-col items-center px-1 text-center sm:mb-12 sm:px-4">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700 sm:text-xs"><ShieldCheck className="h-4 w-4" /> Tenisové centrum</span>
          <h1 className="max-w-4xl text-balance text-3xl font-semibold leading-[1.15] tracking-[-0.035em] text-slate-950 sm:text-4xl md:text-5xl" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>Komplexný rezervačný systém hlasového asistenta Telio</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:mt-5 sm:text-base sm:leading-7">Webové aj hlasové rezervácie sa zobrazujú v jednom aktuálnom a prehľadnom kalendári.</p>
        </div>
        {notice && <button onClick={() => setNotice("")} className="mb-5 w-full rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left text-sm font-semibold text-emerald-800">{notice}</button>}
        <section className="overflow-hidden rounded-3xl border-2 border-slate-300 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.10)]">
          <div className="border-b border-slate-200 p-4 sm:p-6">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{sports.map((item) => <button key={item.id} onClick={() => setSport(item.id)} className={`cursor-pointer rounded-xl border p-3 text-sm font-bold transition duration-200 ${sport === item.id ? "border-slate-950 bg-slate-950 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 shadow-[0_2px_8px_rgba(15,23,42,0.04)] hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm"}`}>{item.label}</button>)}</div>
            <div className="mt-5 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-5 md:flex-row">
              <button onClick={() => setDate(new Date())} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold">Dnes</button>
              <div className="flex items-center gap-2"><button onClick={() => moveDate(-1)} className="rounded-xl border p-3"><ChevronLeft className="h-4 w-4" /></button><button type="button" onClick={() => setDatePickerOpen(true)} className="flex min-w-[200px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-center text-sm font-bold sm:min-w-[280px]" aria-haspopup="dialog"><CalendarDays className="h-4 w-4 text-emerald-600" />{new Intl.DateTimeFormat("sk-SK", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date)}</button><button onClick={() => moveDate(1)} className="rounded-xl border p-3"><ChevronRight className="h-4 w-4" /></button></div>
              <span className="flex items-center gap-2 text-xs text-slate-500"><Clock className="h-4 w-4" /> Max. 14 dní</span>
            </div>
          </div>
                    <div className="overflow-auto border-t-2 border-slate-300 bg-white"><div className="w-full" style={{ minWidth: `${calendarMinWidth}px` }}>
            <div className="grid border-b-2 border-slate-300 bg-gradient-to-b from-slate-50 to-slate-100/70" style={{ gridTemplateColumns: calendarColumns }}><b className="sticky left-0 z-30 border-r-2 border-slate-300 bg-slate-50 p-4 text-xs font-extrabold tracking-wide text-slate-600">KURT</b><div className="relative grid" style={{ gridTemplateColumns: timeColumns }}>{hours.map((hour, index) => <b key={hour} className={`${index === hours.length - 1 ? "" : "border-r border-slate-200"} p-4 text-center text-xs font-bold text-slate-500`}>{hour}:00</b>)}{isToday && currentTimePercent > 0 && currentTimePercent < 100 && <div className="pointer-events-none absolute inset-y-0 z-20 border-l-2 border-dashed border-[#CCFF00]" style={{ left: `${currentTimePercent}%` }}><span className="absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#CCFF00] px-2 py-1 text-[9px] font-black text-black shadow-md border border-[#99CC00]">{currentTimeLabel}</span></div>}</div></div>
            {visibleCourts.map((court) => <div key={court.id} className="grid border-b border-slate-200" style={{ gridTemplateColumns: calendarColumns }}><div className="sticky left-0 z-20 flex min-h-20 flex-col justify-center border-r-2 border-slate-300 bg-gradient-to-r from-white to-slate-50/80 px-4 shadow-[3px_0_10px_rgba(15,23,42,0.03)]"><b className="text-slate-900">{court.name}</b><small className="mt-0.5 text-slate-500">{court.surface}</small></div><div className="relative grid" style={{ gridTemplateColumns: timeColumns }}>{hours.map((hour, index) => { const label = blockedLabel(court.id, sport, hour); const past = new Date(date).setHours(hour, 0, 0, 0) < now.getTime(); const rightBorder = index === hours.length - 1 ? "" : "border-r border-slate-200"; return label ? <div key={hour} className={`grid min-h-20 cursor-not-allowed place-items-center bg-amber-50 px-1 text-center text-[10px] font-bold text-amber-700 ${rightBorder}`}>{label}</div> : past ? <div key={hour} className={`min-h-20 cursor-not-allowed bg-slate-100 ${rightBorder}`} /> : <button key={hour} onClick={() => openSlot(court.id, hour)} className={`group grid min-h-20 cursor-pointer place-items-center transition-colors duration-200 hover:bg-emerald-50/80 ${rightBorder}`}><Plus className="h-4 w-4 text-emerald-500 opacity-0 group-hover:opacity-100" /></button>; })}{isToday && currentTimePercent > 0 && <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] border-r border-slate-300/80" style={{ width: `${currentTimePercent}%`, background: "repeating-linear-gradient(135deg, rgba(148,163,184,0.12) 0px, rgba(148,163,184,0.12) 5px, rgba(241,245,249,0.38) 5px, rgba(241,245,249,0.38) 10px)" }} />}
              <div className="pointer-events-none absolute inset-0 z-10">{bookings.filter((booking) => booking.courtId === court.id).map((booking) => { const own = !!currentUser && currentUser.id === booking.user_id; const canManage = own || currentUser?.role === "admin"; const voiceHighlight = highlightedVoiceBookings.includes(booking.id); return <button key={booking.id} onClick={() => canManage && setDetail(booking)} className={`pointer-events-auto absolute inset-y-2 overflow-hidden rounded-lg border px-2 text-center shadow-sm ${voiceHighlight ? "voice-booking-highlight" : ""} ${canManage ? "cursor-pointer" : "cursor-not-allowed"} ${own ? "border-amber-400 bg-amber-300 text-amber-950" : "border-emerald-600 bg-emerald-500 text-white"}`} style={position(booking)} title={canManage ? "Zobraziť detail" : "Obsadené"}>{voiceHighlight && <span className="voice-booking-scan" aria-hidden="true" />}<b className="relative z-[1] block whitespace-normal break-words text-[clamp(8px,0.7vw,12px)] leading-none [overflow-wrap:anywhere]"><span className="block">{formatTime(booking.start)}</span><span className="block leading-[0.55]" aria-hidden="true">–</span><span className="block">{formatTime(booking.end)}</span></b><span className="relative z-[1] block whitespace-normal break-words text-[clamp(7px,0.6vw,10px)] leading-none [overflow-wrap:anywhere]">{own ? "Vaša rezervácia" : "Obsadené"}</span></button>; })}</div>{isToday && currentTimePercent > 0 && currentTimePercent < 100 && <div className="pointer-events-none absolute inset-y-0 z-20 border-l-2 border-dashed border-[#CCFF00] drop-shadow-sm" style={{ left: `${currentTimePercent}%` }} />}</div></div>)}
          </div></div>
        </section>
        <div className="mt-5 flex flex-wrap gap-5 text-sm"><span className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-emerald-500" /> Obsadené</span><span className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-amber-300" /> Vaša rezervácia</span>{loading && <span className="text-slate-500">Aktualizujem...</span>}</div>
      </main>
      {datePickerOpen && <DatePicker value={date} min={today} max={maxDate} onSelect={(selected) => selectDate(dateKey(selected))} onClose={() => setDatePickerOpen(false)} />}
      {auth && <NewBookingAuth mode={auth} onClose={() => setAuth(null)} onSuccess={() => window.location.reload()} />}
      {slot && <CreateBookingDialog court={courts.find((court) => court.id === slot.courtId)} date={slot.date} hour={slot.hour} duration={duration} title={title} phone={phone} error={notice || undefined} loading={loading} onDuration={setDuration} onTitle={setTitle} onPhone={setPhone} onClose={() => setSlot(null)} onSubmit={submit} />}
      {detail && <BookingDetailDialog booking={detail} court={courts.find((court) => court.id === detail.courtId)} canManage={!!currentUser && (currentUser.role === "admin" || currentUser.id === detail.user_id)} canCancel={currentUser?.role === "admin" || new Date(detail.start).getTime() - now.getTime() > 24 * 60 * 60 * 1000} onClose={() => setDetail(null)} onDelete={() => setDeleting(detail)} />}
      {deleting && <DeleteDialog loading={loading} onCancel={() => setDeleting(null)} onConfirm={remove} />}
      <style jsx global>{`
        @keyframes new-voice-booking-border-pulse {
          0%, 100% {
            border-color: #CCFF00 !important;
            box-shadow: 0 0 0 3px rgba(204, 255, 0, 0.95), 0 0 18px rgba(204, 255, 0, 0.85);
          }
          50% {
            border-color: #eefc42 !important;
            box-shadow: 0 0 0 5px rgba(204, 255, 0, 0.5), 0 0 28px rgba(204, 255, 0, 1);
          }
        }
        @keyframes new-voice-booking-scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .voice-booking-highlight {
          animation: new-voice-booking-border-pulse 0.8s ease-in-out infinite !important;
          z-index: 40 !important;
          border-width: 2px !important;
        }
        .voice-booking-scan {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(90deg, transparent, rgba(204, 255, 0, 0.2), rgba(204, 255, 0, 0.95), rgba(204, 255, 0, 0.2), transparent);
          filter: blur(1px);
          animation: new-voice-booking-scan 1.2s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .voice-booking-highlight { animation: none; border-color: rgba(204, 255, 0, 0.95); }
          .voice-booking-scan { display: none; }
        }
      `}</style>
    </div>
  );
}
