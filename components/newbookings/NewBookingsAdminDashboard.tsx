"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CalendarDays, Check, Loader2, Users, Wrench, X } from "lucide-react";
import { createBookingAction, fetchAdminDashboardDataAction } from "@/app/actions/bookings";
import AdminUsersAndRoles from "./AdminUsersAndRoles";

type Booking = { id: string; courtId: string; customerName: string; start: string; end: string; status: "confirmed" | "blocked" | "cancelled"; price?: number };
type Customer = { name: string; hours: number; count: number; revenue: number };
type Stats = { pastHoursThisMonth?: number; futureHoursThisMonth?: number; pastRevenueThisMonth?: number; futureRevenueThisMonth?: number; totalBookings?: number; activeCustomers?: number; topCustomers?: Customer[]; heatmap?: number[][] };

const time = (value: string) => new Intl.DateTimeFormat("sk-SK", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const date = (value: string) => new Intl.DateTimeFormat("sk-SK").format(new Date(value));
const court = (value: string) => value.replace("tennis-clay", "Antuka").replace("badminton", "Bedminton").replace("tennis", "Tenis").replace("squash", "Squash").replace("-", " ");

function Metric({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof Activity; color: string }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)]"><span className={`mb-5 grid h-11 w-11 place-items-center rounded-2xl ${color}`}><Icon className="h-5 w-5" /></span><p className="text-sm text-slate-500">{label}</p><b className="mt-1 block text-3xl text-slate-950">{value}</b></div>;
}

export default function NewBookingsAdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ courtId: "badminton-1", date: "", start: "07:00", end: "09:00" });
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    const result = await fetchAdminDashboardDataAction();
    setError("");
    if (result.success) { setBookings((result.bookings || []) as Booking[]); setStats((result.stats || {}) as Stats); }
    else setError(result.error || "Dáta sa nepodarilo načítať.");
    setLoading(false);
    }, []);

    useEffect(() => {
    let active = true;
    fetchAdminDashboardDataAction().then((dashboardResult) => {
      if (!active) return;
      if (dashboardResult.success) { setBookings((dashboardResult.bookings || []) as Booking[]); setStats((dashboardResult.stats || {}) as Stats); }
      else setError(dashboardResult.error || "Dáta sa nepodarilo načítať.");
      setLoading(false);
    });
        return () => { active = false; };
  }, []);

  const upcoming = useMemo(() => bookings.filter((item) => new Date(item.start).getTime() > now).sort((a, b) => +new Date(a.start) - +new Date(b.start)).slice(0, 10), [bookings, now]);
  const blockCourt = async (event: React.FormEvent) => {
    event.preventDefault();
    const start = new Date(`${form.date}T${form.start}:00`); const end = new Date(`${form.date}T${form.end}:00`);
    if (end <= start) return setError("Čas ukončenia musí byť neskôr ako začiatok.");
    setLoading(true);
    const result = await createBookingAction({ courtId: form.courtId, title: "Údržba", customerName: "Admin Údržba", start: start.toISOString(), end: end.toISOString(), status: "blocked", source: "admin" });
    if (!result.success) { setError(result.error || "Kurt sa nepodarilo zablokovať."); setLoading(false); return; }
    setModal(false); await load();
  };
  const maxHeat = Math.max(1, ...(stats.heatmap || []).flat());

  if (loading && !bookings.length) return <div className="grid min-h-[360px] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-cyan-600" /></div>;
  return <div className="space-y-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight text-slate-950">Administrátorský prehľad</h1><p className="mt-2 text-sm text-slate-500">Kompletný prehľad prevádzky, zákazníkov a rezervácií.</p></div><button onClick={() => setModal(true)} className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg"><Wrench className="h-4 w-4" /> Zablokovať kurt</button></div>
    {error && <button onClick={() => setError("")} className="w-full rounded-2xl border border-red-200 bg-red-50 p-4 text-left text-sm font-semibold text-red-700">{error}</button>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Odhadované tržby" value={`${((stats.pastRevenueThisMonth || 0) + (stats.futureRevenueThisMonth || 0)).toFixed(0)} €`} icon={Activity} color="bg-emerald-100 text-emerald-700" /><Metric label="Zrealizované" value={`${(stats.pastHoursThisMonth || 0).toFixed(1)} h`} icon={Activity} color="bg-cyan-100 text-cyan-700" /><Metric label="Plánované" value={`${(stats.futureHoursThisMonth || 0).toFixed(1)} h`} icon={CalendarDays} color="bg-indigo-100 text-indigo-700" /><Metric label="Rezervácie" value={String(stats.totalBookings || 0)} icon={CalendarDays} color="bg-violet-100 text-violet-700" /><Metric label="Aktívni zákazníci" value={String(stats.activeCustomers || 0)} icon={Users} color="bg-amber-100 text-amber-700" /></div>
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]"><section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-5 text-xl font-bold">Vyťaženosť</h2><div className="overflow-auto"><div className="min-w-[620px] space-y-1">{["Po", "Ut", "St", "Št", "Pi", "So", "Ne"].map((day, dayIndex) => <div key={day} className="grid items-center gap-1" style={{ gridTemplateColumns: "30px repeat(16, 1fr)" }}><b className="text-xs text-slate-500">{day}</b>{Array.from({ length: 16 }, (_, offset) => { const count = stats.heatmap?.[dayIndex]?.[offset + 7] || 0; return <span key={offset} className="h-7 rounded-md bg-cyan-500" style={{ opacity: count ? Math.max(.2, count / maxHeat) : .06 }} title={`${offset + 7}:00 — ${count} rezervácií`} />; })}</div>)}</div></div></section><section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-5 text-xl font-bold">VIP zákazníci</h2><div className="space-y-3">{(stats.topCustomers || []).map((customer, index) => <div key={customer.name} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3"><span className="flex items-center gap-3"><i className="grid h-8 w-8 place-items-center rounded-full bg-indigo-100 text-xs font-bold not-italic text-indigo-700">{index + 1}</i><b className="text-sm capitalize">{customer.name}</b></span><span className="text-right"><b className="block text-sm text-emerald-600">{customer.revenue.toFixed(2)} €</b><small className="text-slate-500">{customer.hours.toFixed(1)} h</small></span></div>)}</div></section></div>
            <AdminUsersAndRoles />
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-5 text-xl font-bold">Nadchádzajúce rezervácie</h2><div className="overflow-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-wider text-slate-400"><th className="pb-3">Dátum</th><th className="pb-3">Čas</th><th className="pb-3">Zákazník</th><th className="pb-3">Kurt</th><th className="pb-3 text-center">Stav</th></tr></thead><tbody>{upcoming.map((item) => <tr key={item.id} className="border-b border-slate-100"><td className="py-4 font-semibold">{date(item.start)}</td><td>{time(item.start)} – {time(item.end)}</td><td>{item.customerName}</td><td className="text-slate-500">{court(item.courtId)}</td><td><span className={`mx-auto grid h-8 w-8 place-items-center rounded-full ${item.status === "blocked" ? "bg-amber-100 text-amber-700" : item.status === "cancelled" ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}>{item.status === "blocked" ? <Wrench className="h-4 w-4" /> : item.status === "cancelled" ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}</span></td></tr>)}</tbody></table></div></section>
    {modal && <div className="fixed inset-0 z-[100] grid place-items-center p-4"><button className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setModal(false)} aria-label="Zavrieť" /><form onSubmit={blockCourt} className="relative w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Zablokovať kurt</h2><button type="button" onClick={() => setModal(false)}><X /></button></div><label className="block text-sm font-semibold">Kurt<select value={form.courtId} onChange={(event) => setForm({ ...form, courtId: event.target.value })} className="mt-1 w-full rounded-xl border p-3">{["badminton-1","badminton-2","badminton-3","badminton-4","tennis-1","tennis-2","tennis-clay-1","tennis-clay-2","squash-1","squash-2"].map((id) => <option key={id} value={id}>{court(id)}</option>)}</select></label><label className="block text-sm font-semibold">Dátum<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="mt-1 w-full rounded-xl border p-3" /></label><div className="grid grid-cols-2 gap-3"><label className="text-sm font-semibold">Od<input required type="time" value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value })} className="mt-1 w-full rounded-xl border p-3" /></label><label className="text-sm font-semibold">Do<input required type="time" value={form.end} onChange={(event) => setForm({ ...form, end: event.target.value })} className="mt-1 w-full rounded-xl border p-3" /></label></div><button disabled={loading} className="w-full rounded-xl bg-slate-950 p-3 font-bold text-white">{loading ? "Ukladám..." : "Zablokovať"}</button></form></div>}
  </div>;
}
