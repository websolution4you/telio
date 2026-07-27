"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, LogIn, LogOut, Plus, ShieldCheck } from "lucide-react";
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
  const today = useMemo(() => { const value = new Date(); value.setHours(0, 0, 0, 0); return value; }, []);
  const maxDate = useMemo(() => { const value = new Date(today); value.setDate(value.getDate() + 14); value.setHours(23, 59, 59, 999); return value; }, [today]);
  const hours = useMemo(() => Array.from({ length: openingHours.endHour - openingHours.startHour }, (_, index) => openingHours.startHour + index), []);

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
    const channel = supabase.channel("newbookings-realtime").on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => setReload((value) => value + 1)).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const visibleCourts = useMemo(() => {
    let result = courts.filter((court) => court.sport === sport);
    if (sport === "tennis-clay" && [0, 6].includes(date.getDay())) result = result.filter((court) => ["tennis-clay-1", "tennis-clay-2"].includes(court.id));
    return result;
  }, [courts, sport, date]);
  const bookings = useMemo(() => items.filter((booking) => booking.status !== "cancelled" && dateKey(new Date(booking.start)) === dateKey(date) && courts.find((court) => court.id === booking.courtId)?.sport === sport), [items, date, courts, sport]);

  const moveDate = (days: number) => {
    const next = new Date(date); next.setDate(next.getDate() + days); next.setHours(0, 0, 0, 0);
    if (next < today) return;
    if (next > maxDate) return setNotice("Rezervácie sú možné maximálne 14 dní vopred.");
    setDate(next);
  };
  const openSlot = (courtId: string, hour: number) => {
    if (!currentUser) return setAuth("login");
    const start = new Date(date); start.setHours(hour, 0, 0, 0);
    if (start < new Date()) return setNotice("Rezerváciu v minulosti nie je možné vytvoriť.");
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
    <div className="min-h-screen bg-[#f4f7f5] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3"><b className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white">T</b><span><strong className="block">TELIO</strong><small className="text-slate-500">Rezervačný systém</small></span></Link>
          {currentUser ? <div className="flex items-center gap-3"><b className="hidden text-sm sm:block">{currentUser.name}</b><button onClick={async () => { await logoutAction(); router.refresh(); }} className="rounded-xl border border-slate-200 p-3" title="Odhlásiť sa"><LogOut className="h-4 w-4" /></button></div> : <button onClick={() => setAuth("login")} className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"><LogIn className="h-4 w-4" /> Prihlásiť</button>}
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:py-12">
        <div className="mb-8"><span className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"><ShieldCheck className="h-4 w-4" /> NTC BRATISLAVA</span><h1 className="max-w-5xl text-3xl font-bold tracking-tight sm:text-5xl">Komplexný rezervačný systém hlasového asistenta Telio</h1><p className="mt-4 max-w-3xl text-slate-600">Webové aj hlasové rezervácie sa zobrazujú v jednom aktuálnom a prehľadnom kalendári.</p></div>
        {notice && <button onClick={() => setNotice("")} className="mb-5 w-full rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left text-sm font-semibold text-emerald-800">{notice}</button>}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <div className="border-b border-slate-200 p-4 sm:p-6">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{sports.map((item) => <button key={item.id} onClick={() => setSport(item.id)} className={`rounded-xl p-3 text-sm font-bold ${sport === item.id ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-600"}`}>{item.label}</button>)}</div>
            <div className="mt-5 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-5 md:flex-row">
              <button onClick={() => setDate(new Date())} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold">Dnes</button>
              <div className="flex items-center gap-2"><button onClick={() => moveDate(-1)} className="rounded-xl border p-3"><ChevronLeft className="h-4 w-4" /></button><label className="relative flex min-w-[200px] items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-center text-sm font-bold sm:min-w-[280px]"><CalendarDays className="h-4 w-4 text-emerald-600" />{new Intl.DateTimeFormat("sk-SK", { weekday: "long", day: "numeric", month: "long" }).format(date)}<input type="date" min={dateKey(today)} max={dateKey(maxDate)} value={dateKey(date)} onChange={(event) => event.target.value && setDate(new Date(`${event.target.value}T12:00:00`))} className="absolute inset-0 cursor-pointer opacity-0" /></label><button onClick={() => moveDate(1)} className="rounded-xl border p-3"><ChevronRight className="h-4 w-4" /></button></div>
              <span className="flex items-center gap-2 text-xs text-slate-500"><Clock className="h-4 w-4" /> Max. 14 dní</span>
            </div>
          </div>
          <div className="overflow-auto"><div className="min-w-[1050px]">
            <div className="grid border-b bg-slate-50" style={{ gridTemplateColumns: "140px 1fr" }}><b className="sticky left-0 z-30 border-r bg-slate-50 p-4 text-xs text-slate-500">KURT</b><div className="grid" style={{ gridTemplateColumns: `repeat(${hours.length}, 1fr)` }}>{hours.map((hour) => <b key={hour} className="border-r p-4 text-center text-xs text-slate-500">{hour}:00</b>)}</div></div>
            {visibleCourts.map((court) => <div key={court.id} className="grid border-b" style={{ gridTemplateColumns: "140px 1fr" }}><div className="sticky left-0 z-20 flex min-h-20 flex-col justify-center border-r bg-white px-4"><b>{court.name}</b><small className="text-slate-500">{court.surface}</small></div><div className="relative grid" style={{ gridTemplateColumns: `repeat(${hours.length}, 1fr)` }}>{hours.map((hour) => { const label = blockedLabel(court.id, sport, hour); const past = new Date(date).setHours(hour, 0, 0, 0) < Date.now(); return label ? <div key={hour} className="grid min-h-20 place-items-center border-r bg-amber-50 px-1 text-center text-[10px] font-bold text-amber-700">{label}</div> : past ? <div key={hour} className="min-h-20 border-r bg-slate-100" /> : <button key={hour} onClick={() => openSlot(court.id, hour)} className="group grid min-h-20 place-items-center border-r hover:bg-emerald-50"><Plus className="h-4 w-4 text-emerald-500 opacity-0 group-hover:opacity-100" /></button>; })}<div className="pointer-events-none absolute inset-0">{bookings.filter((booking) => booking.courtId === court.id).map((booking) => { const own = !!currentUser && currentUser.id === booking.user_id; const canManage = own || currentUser?.role === "admin"; return <button key={booking.id} onClick={() => canManage && setDetail(booking)} className={`pointer-events-auto absolute inset-y-2 overflow-hidden rounded-lg border px-2 text-left shadow-sm ${own ? "border-amber-400 bg-amber-300 text-amber-950" : "border-emerald-600 bg-emerald-500 text-white"}`} style={position(booking)} title={canManage ? "Zobraziť detail" : "Obsadené"}><b className="block truncate text-xs">{formatTime(booking.start)}–{formatTime(booking.end)}</b><span className="block truncate text-[10px]">{own ? "Vaša rezervácia" : "Obsadené"}</span></button>; })}</div></div></div>)}
          </div></div>
        </section>
        <div className="mt-5 flex flex-wrap gap-5 text-sm"><span className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-emerald-500" /> Obsadené</span><span className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-amber-300" /> Vaša rezervácia</span>{loading && <span className="text-slate-500">Aktualizujem...</span>}</div>
      </main>
      {auth && <NewBookingAuth mode={auth} onClose={() => setAuth(null)} onSuccess={() => window.location.reload()} />}
      {slot && <CreateBookingDialog court={courts.find((court) => court.id === slot.courtId)} date={slot.date} hour={slot.hour} duration={duration} title={title} phone={phone} error={notice || undefined} loading={loading} onDuration={setDuration} onTitle={setTitle} onPhone={setPhone} onClose={() => setSlot(null)} onSubmit={submit} />}
      {detail && <BookingDetailDialog booking={detail} court={courts.find((court) => court.id === detail.courtId)} canManage={!!currentUser && (currentUser.role === "admin" || currentUser.id === detail.user_id)} onClose={() => setDetail(null)} onDelete={() => setDeleting(detail)} />}
      {deleting && <DeleteDialog loading={loading} onCancel={() => setDeleting(null)} onConfirm={remove} />}
    </div>
  );
}
