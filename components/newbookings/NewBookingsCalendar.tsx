"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, LayoutDashboard, LogIn, LogOut, Plus, ShieldCheck, Sparkles, UserPlus, UserRound } from "lucide-react";
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

export default function NewBookingsCalendar({ courts, initialBookings, currentUser }: Props) {
  const router = useRouter();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const voiceHighlightTimers = useRef(new Map<string, number>());
  const [sport, setSport] = useState<SportType>("badminton");
  const [date, setDate] = useState(new Date());
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
  const courtColumnWidth = 140;
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
  };
  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") input.showPicker();
    else input.click();
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
      <header className="relative isolate overflow-hidden border-b border-cyan-100/80 bg-gradient-to-r from-white via-cyan-50/80 to-indigo-50/80 shadow-[0_10px_35px_rgba(15,23,42,0.07)]">
        <div className="pointer-events-none absolute -left-16 -top-24 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-12 -top-28 h-48 w-48 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="relative mx-auto flex min-h-[76px] max-w-[1500px] items-center justify-between gap-2 px-4 py-3 sm:min-h-[86px] sm:gap-4 sm:px-6 lg:px-8">
          <Link href="/" className="group flex min-w-0 items-center gap-3 sm:gap-4" aria-label="Telio domov">
            <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.3),inset_0_1px_1px_rgba(255,255,255,0.5)] transition duration-300 group-hover:-translate-y-0.5 group-hover:rotate-[-2deg] sm:h-12 sm:w-12">
              <span className="text-lg font-extrabold" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>T</span>
              <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-white p-0.5 text-violet-600 shadow-sm" />
            </span>
            <span className="min-w-0"><strong className="block text-base font-extrabold tracking-[0.12em] text-slate-950 sm:text-lg" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>TELIO</strong><span className="block truncate text-[10px] font-semibold tracking-wide text-slate-500 sm:text-xs">Inteligentný rezervačný systém</span></span>
          </Link>
          {currentUser ? (
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-white/90 bg-white/75 p-2 shadow-[0_8px_22px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-600 text-white shadow-sm"><UserRound className="h-4 w-4" /></span>
                <span className="hidden min-w-0 sm:block"><b className="block max-w-36 truncate text-sm">{currentUser.name}</b><small className="block text-[10px] font-medium text-emerald-600">Aktívny účet</small></span>
              </div>
              <Link href="/dashboard/newbookings" className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-indigo-100 bg-white/80 text-indigo-600 shadow-[0_8px_22px_rgba(79,70,229,0.12)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:shadow-md" title="Moje rezervácie a štatistiky" aria-label="Moje rezervácie a štatistiky"><LayoutDashboard className="h-[18px] w-[18px]" /><span className="absolute right-1 top-1 h-2 w-2 rounded-full border border-white bg-emerald-500" /></Link>
              <button onClick={async () => { await logoutAction(); router.refresh(); }} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/90 bg-white/80 text-slate-500 shadow-[0_8px_22px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-600" title="Odhlásiť sa" aria-label="Odhlásiť sa"><LogOut className="h-4 w-4" /></button>
                        </div>
          ) : (
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={() => setAuth("register")} className="group flex items-center gap-1.5 rounded-2xl border border-indigo-200 bg-white/85 px-3 py-3 text-xs font-bold text-indigo-700 shadow-[0_8px_22px_rgba(79,70,229,0.12)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 sm:gap-2 sm:px-4 sm:text-sm"><UserPlus className="h-4 w-4" /> Registrovať sa</button>
              <button onClick={() => setAuth("login")} className="group flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-3 py-3 text-xs font-bold text-white shadow-[0_10px_24px_rgba(79,70,229,0.3)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(79,70,229,0.38)] sm:gap-2 sm:px-5 sm:text-sm"><LogIn className="h-4 w-4" /> Prihlásiť</button>
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
              <div className="flex items-center gap-2"><button onClick={() => moveDate(-1)} className="rounded-xl border p-3"><ChevronLeft className="h-4 w-4" /></button><div className="relative min-w-[200px] sm:min-w-[280px]"><button type="button" onClick={openDatePicker} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-center text-sm font-bold"><CalendarDays className="h-4 w-4 text-emerald-600" />{new Intl.DateTimeFormat("sk-SK", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date)}</button><input ref={dateInputRef} type="date" min={dateKey(today)} max={dateKey(maxDate)} value={dateKey(date)} onChange={(event) => selectDate(event.target.value)} className="pointer-events-none absolute inset-0 h-full w-full opacity-0" tabIndex={-1} aria-label="Vybrať dátum rezervácie" /></div><button onClick={() => moveDate(1)} className="rounded-xl border p-3"><ChevronRight className="h-4 w-4" /></button></div>
              <span className="flex items-center gap-2 text-xs text-slate-500"><Clock className="h-4 w-4" /> Max. 14 dní</span>
            </div>
          </div>
                    <div className="overflow-auto border-t-2 border-slate-300 bg-white"><div className="w-full" style={{ minWidth: `${calendarMinWidth}px` }}>
            <div className="grid border-b-2 border-slate-300 bg-gradient-to-b from-slate-50 to-slate-100/70" style={{ gridTemplateColumns: calendarColumns }}><b className="sticky left-0 z-30 border-r-2 border-slate-300 bg-slate-50 p-4 text-xs font-extrabold tracking-wide text-slate-600">KURT</b><div className="relative grid" style={{ gridTemplateColumns: timeColumns }}>{hours.map((hour, index) => <b key={hour} className={`${index === hours.length - 1 ? "" : "border-r border-slate-200"} p-4 text-center text-xs font-bold text-slate-500`}>{hour}:00</b>)}{isToday && currentTimePercent > 0 && currentTimePercent < 100 && <div className="pointer-events-none absolute inset-y-0 z-20 border-l-2 border-dashed border-cyan-500" style={{ left: `${currentTimePercent}%` }}><span className="absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-cyan-600 px-2 py-1 text-[9px] font-extrabold text-white shadow-md">{currentTimeLabel}</span></div>}</div></div>
            {visibleCourts.map((court) => <div key={court.id} className="grid border-b border-slate-200" style={{ gridTemplateColumns: calendarColumns }}><div className="sticky left-0 z-20 flex min-h-20 flex-col justify-center border-r-2 border-slate-300 bg-gradient-to-r from-white to-slate-50/80 px-4 shadow-[3px_0_10px_rgba(15,23,42,0.03)]"><b className="text-slate-900">{court.name}</b><small className="mt-0.5 text-slate-500">{court.surface}</small></div><div className="relative grid" style={{ gridTemplateColumns: timeColumns }}>{hours.map((hour, index) => { const label = blockedLabel(court.id, sport, hour); const past = new Date(date).setHours(hour, 0, 0, 0) < now.getTime(); const rightBorder = index === hours.length - 1 ? "" : "border-r border-slate-200"; return label ? <div key={hour} className={`grid min-h-20 cursor-not-allowed place-items-center bg-amber-50 px-1 text-center text-[10px] font-bold text-amber-700 ${rightBorder}`}>{label}</div> : past ? <div key={hour} className={`min-h-20 cursor-not-allowed bg-slate-100 ${rightBorder}`} /> : <button key={hour} onClick={() => openSlot(court.id, hour)} className={`group grid min-h-20 cursor-pointer place-items-center transition-colors duration-200 hover:bg-emerald-50/80 ${rightBorder}`}><Plus className="h-4 w-4 text-emerald-500 opacity-0 group-hover:opacity-100" /></button>; })}{isToday && currentTimePercent > 0 && <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] border-r border-slate-300/80" style={{ width: `${currentTimePercent}%`, background: "repeating-linear-gradient(135deg, rgba(148,163,184,0.12) 0px, rgba(148,163,184,0.12) 5px, rgba(241,245,249,0.38) 5px, rgba(241,245,249,0.38) 10px)" }} />}
              <div className="pointer-events-none absolute inset-0 z-10">{bookings.filter((booking) => booking.courtId === court.id).map((booking) => { const own = !!currentUser && currentUser.id === booking.user_id; const canManage = own || currentUser?.role === "admin"; const voiceHighlight = highlightedVoiceBookings.includes(booking.id); return <button key={booking.id} onClick={() => canManage && setDetail(booking)} className={`pointer-events-auto absolute inset-y-2 overflow-hidden rounded-lg border px-2 text-center shadow-sm ${voiceHighlight ? "voice-booking-highlight" : ""} ${canManage ? "cursor-pointer" : "cursor-not-allowed"} ${own ? "border-amber-400 bg-amber-300 text-amber-950" : "border-emerald-600 bg-emerald-500 text-white"}`} style={position(booking)} title={canManage ? "Zobraziť detail" : "Obsadené"}>{voiceHighlight && <span className="voice-booking-scan" aria-hidden="true" />}<b className="relative z-[1] block whitespace-normal break-words text-[clamp(8px,0.7vw,12px)] leading-none [overflow-wrap:anywhere]"><span className="block">{formatTime(booking.start)}</span><span className="block leading-[0.55]" aria-hidden="true">–</span><span className="block">{formatTime(booking.end)}</span></b><span className="relative z-[1] block whitespace-normal break-words text-[clamp(7px,0.6vw,10px)] leading-none [overflow-wrap:anywhere]">{own ? "Vaša rezervácia" : "Obsadené"}</span></button>; })}</div>{isToday && currentTimePercent > 0 && currentTimePercent < 100 && <div className="pointer-events-none absolute inset-y-0 z-20 border-l-2 border-dashed border-cyan-500 drop-shadow-sm" style={{ left: `${currentTimePercent}%` }}><span className="absolute -left-[5px] -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-cyan-500 shadow-[0_0_0_3px_rgba(6,182,212,0.18)]" /></div>}</div></div>)}
          </div></div>
        </section>
        <div className="mt-5 flex flex-wrap gap-5 text-sm"><span className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-emerald-500" /> Obsadené</span><span className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-amber-300" /> Vaša rezervácia</span>{loading && <span className="text-slate-500">Aktualizujem...</span>}</div>
      </main>
      {auth && <NewBookingAuth mode={auth} onClose={() => setAuth(null)} onSuccess={() => window.location.reload()} />}
      {slot && <CreateBookingDialog court={courts.find((court) => court.id === slot.courtId)} date={slot.date} hour={slot.hour} duration={duration} title={title} phone={phone} error={notice || undefined} loading={loading} onDuration={setDuration} onTitle={setTitle} onPhone={setPhone} onClose={() => setSlot(null)} onSubmit={submit} />}
      {detail && <BookingDetailDialog booking={detail} court={courts.find((court) => court.id === detail.courtId)} canManage={!!currentUser && (currentUser.role === "admin" || currentUser.id === detail.user_id)} onClose={() => setDetail(null)} onDelete={() => setDeleting(detail)} />}
      {deleting && <DeleteDialog loading={loading} onCancel={() => setDeleting(null)} onConfirm={remove} />}
      <style jsx global>{`
        @keyframes new-voice-booking-border-pulse {
          0%, 100% {
            border-color: #ef4444 !important;
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.95), 0 0 16px rgba(239, 68, 68, 0.75);
          }
          50% {
            border-color: #fca5a5 !important;
            box-shadow: 0 0 0 5px rgba(239, 68, 68, 0.4), 0 0 24px rgba(239, 68, 68, 0.95);
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
          background: linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.95), rgba(239, 68, 68, 0.2), transparent);
          filter: blur(1px);
          animation: new-voice-booking-scan 1.2s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .voice-booking-highlight { animation: none; border-color: rgba(239, 68, 68, 0.9); }
          .voice-booking-scan { display: none; }
        }
      `}</style>
    </div>
  );
}
