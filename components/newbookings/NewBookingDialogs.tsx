"use client";

import { Clock3, MessageSquare, Phone, Trash2, User, X } from "lucide-react";
import type { Booking, Court } from "@/lib/bookings/mockBookings";

type CreateDialogProps = {
  court?: Court;
  date: Date;
  hour: number;
  duration: number;
  title: string;
  phone: string;
  error?: string;
  loading: boolean;
  onDuration: (value: number) => void;
  onTitle: (value: string) => void;
  onPhone: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
};

export function CreateBookingDialog(props: CreateDialogProps) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button aria-label="Zavrieť" className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" onClick={props.onClose} />
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
        <DialogHeader title="Nová rezervácia" subtitle="Skontrolujte vybraný termín a potvrďte rezerváciu." onClose={props.onClose} />
        <div className="mb-6 grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <Info label="Športovisko" value={props.court?.name || "Kurt"} />
          <Info label="Dátum" value={new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "long", year: "numeric" }).format(props.date)} />
          <Info label="Začiatok" value={`${String(props.hour).padStart(2, "0")}:00`} />
          <Info label="Trvanie" value={`${props.duration} min.`} />
        </div>
        {props.error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{props.error}</div>}
        <form onSubmit={props.onSubmit} className="space-y-4">
          <Field icon={MessageSquare} label="Poznámka / názov hry" value={props.title} onChange={props.onTitle} />
          <Field icon={Phone} label="Telefón" value={props.phone} onChange={props.onPhone} type="tel" />
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Dĺžka rezervácie</span>
            <select value={props.duration} onChange={(event) => props.onDuration(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
              <option value={30}>30 minút</option><option value={60}>1 hodina</option><option value={90}>1,5 hodiny</option><option value={120}>2 hodiny</option>
            </select>
          </label>
          <button disabled={props.loading} className="w-full rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50">{props.loading ? "Ukladanie..." : "Vytvoriť rezerváciu"}</button>
        </form>
      </div>
    </div>
  );
}

type DetailProps = {
  booking: Booking;
  court?: Court;
  canManage: boolean;
  canCancel: boolean;
  onClose: () => void;
  onDelete: () => void;
};

export function BookingDetailDialog({ booking, court, canManage, canCancel, onClose, onDelete }: DetailProps) {
  const formatDate = (value: string) => new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
  const formatTime = (value: string) => new Intl.DateTimeFormat("sk-SK", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bratislava" }).format(new Date(value));
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button aria-label="Zavrieť" className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
        <DialogHeader title="Detail rezervácie" subtitle={court?.name || "Rezervované športovisko"} onClose={onClose} />
        <div className="space-y-3">
          <Detail icon={Clock3} label="Termín" value={`${formatDate(booking.start)}, ${formatTime(booking.start)} – ${formatTime(booking.end)}`} />
          <Detail icon={User} label="Meno" value={booking.customerName || "Neznáme"} />
          {booking.phone && <Detail icon={Phone} label="Telefón" value={booking.phone} />}
          {booking.title && <Detail icon={MessageSquare} label="Poznámka" value={booking.title} />}
        </div>
        {canManage && canCancel && <button onClick={onDelete} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100"><Trash2 className="h-4 w-4" /> Zrušiť rezerváciu</button>}
        {canManage && !canCancel && <p className="mt-7 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-800">Rezerváciu už nie je možné zrušiť. Zrušenie je povolené iba viac ako 24 hodín pred začiatkom.</p>}
      </div>
    </div>
  );
}

export function DeleteDialog({ loading, onCancel, onConfirm }: { loading: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Trash2 className="h-5 w-5" /></div>
        <h3 className="text-xl font-bold text-slate-950">Zrušiť rezerváciu?</h3><p className="mt-2 text-sm leading-6 text-slate-600">Táto rezervácia bude označená ako zrušená. Naozaj chcete pokračovať?</p>
        <div className="mt-6 grid grid-cols-2 gap-3"><button onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">Ponechať</button><button disabled={loading} onClick={onConfirm} className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{loading ? "Rušenie..." : "Zrušiť"}</button></div>
      </div>
    </div>
  );
}

function DialogHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return <div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-2xl font-bold text-slate-950">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div><button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="Zavrieť"><X className="h-5 w-5" /></button></div>;
}
function Info({ label, value }: { label: string; value: string }) { return <div><span className="block text-xs font-medium text-slate-500">{label}</span><strong className="mt-1 block text-slate-950">{value}</strong></div>; }
function Detail({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) { return <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm"><Icon className="h-5 w-5" /></span><div><span className="block text-xs font-medium text-slate-500">{label}</span><strong className="mt-1 block text-sm text-slate-950">{value}</strong></div></div>; }
function Field({ icon: Icon, label, value, onChange, type = "text" }: { icon: typeof Phone; label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span><div className="relative"><Icon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-slate-950 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" /></div></label>; }
