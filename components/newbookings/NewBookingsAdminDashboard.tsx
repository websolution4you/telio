"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, CalendarDays, Check, Loader2, Users, Wrench, X } from "lucide-react";
import { createBookingAction, fetchAdminDashboardDataAction } from "@/app/actions/bookings";
import AdminCallHistory from "./AdminCallHistory";

type Booking = { id: string; courtId: string; customerName: string; start: string; end: string; status: "confirmed" | "blocked" | "cancelled"; price?: number };
type Customer = { name: string; hours: number; count: number; revenue: number };
type Stats = { pastHoursThisMonth?: number; futureHoursThisMonth?: number; pastRevenueThisMonth?: number; futureRevenueThisMonth?: number; totalBookings?: number; activeCustomers?: number; topCustomers?: Customer[]; heatmap?: number[][] };

const time = (value: string) => new Intl.DateTimeFormat("sk-SK", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const date = (value: string) => new Intl.DateTimeFormat("sk-SK").format(new Date(value));
const court = (value: string) => value.replace("tennis-clay", "Antuka").replace("badminton", "Bedminton").replace("tennis", "Tenis").replace("squash", "Squash").replace("-", " ");

function Metric({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof Activity; color: string }) {
  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] transition hover:shadow-md">
      <span className={`mb-4 grid h-10 w-10 place-items-center rounded-2xl ${color} shadow-2xs`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-xs sm:text-sm font-medium text-slate-500">{label}</p>
      <strong className="mt-1 block text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">{value}</strong>
    </div>
  );
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
    if (result.success) {
      setBookings((result.bookings || []) as Booking[]);
      setStats((result.stats || {}) as Stats);
    } else {
      setError(result.error || "Dáta sa nepodarilo načítať.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    fetchAdminDashboardDataAction().then((dashboardResult) => {
      if (!active) return;
      if (dashboardResult.success) {
        setBookings((dashboardResult.bookings || []) as Booking[]);
        setStats((dashboardResult.stats || {}) as Stats);
      } else {
        setError(dashboardResult.error || "Dáta sa nepodarilo načítať.");
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const upcoming = useMemo(
    () =>
      bookings
        .filter((item) => new Date(item.start).getTime() > now)
        .sort((a, b) => +new Date(a.start) - +new Date(b.start))
        .slice(0, 10),
    [bookings, now]
  );

  const blockCourt = async (event: React.FormEvent) => {
    event.preventDefault();
    const start = new Date(`${form.date}T${form.start}:00`);
    const end = new Date(`${form.date}T${form.end}:00`);
    if (end <= start) return setError("Čas ukončenia musí byť neskôr ako začiatok.");
    setLoading(true);
    const result = await createBookingAction({
      courtId: form.courtId,
      title: "Údržba",
      customerName: "Údržba",
      start: start.toISOString(),
      end: end.toISOString(),
      status: "blocked",
      source: "admin",
    });
    if (!result.success) {
      setError(result.error || "Kurt sa nepodarilo zablokovať.");
      setLoading(false);
      return;
    }
    setModal(false);
    await load();
  };

  const maxHeat = Math.max(1, ...(stats.heatmap || []).flat());

  if (loading && !bookings.length) {
    return (
      <div className="grid min-h-[360px] place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 font-sans">
      {/* Hlavička zjednotená s Používateľmi a Nastaveniami */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Štatistiky</h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Kompletný prehľad prevádzky, zákazníkov a vyťaženosti kurtov.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/newbookings"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Späť na kalendár
          </Link>
          <button
            type="button"
            onClick={() => setModal(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-200 hover:text-slate-900 cursor-pointer active:scale-[0.98]"
          >
            <Wrench className="h-4 w-4 text-slate-500" />
            <span>Zablokovať kurt</span>
          </button>
        </div>
      </div>

      {error && (
        <button
          type="button"
          onClick={() => setError("")}
          className="w-full rounded-2xl border border-red-200 bg-red-50 p-4 text-left text-sm font-semibold text-red-700 transition hover:bg-red-100/80 cursor-pointer"
        >
          {error}
        </button>
      )}

      {/* Metriky */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Odhadované tržby"
          value={`${((stats.pastRevenueThisMonth || 0) + (stats.futureRevenueThisMonth || 0)).toFixed(0)} €`}
          icon={Activity}
          color="bg-emerald-100 text-emerald-700"
        />
        <Metric
          label="Zrealizované"
          value={`${(stats.pastHoursThisMonth || 0).toFixed(1)} h`}
          icon={Activity}
          color="bg-cyan-100 text-cyan-700"
        />
        <Metric
          label="Plánované"
          value={`${(stats.futureHoursThisMonth || 0).toFixed(1)} h`}
          icon={CalendarDays}
          color="bg-indigo-100 text-indigo-700"
        />
        <Metric
          label="Rezervácie"
          value={String(stats.totalBookings || 0)}
          icon={CalendarDays}
          color="bg-violet-100 text-violet-700"
        />
        <Metric
          label="Aktívni zákazníci"
          value={String(stats.activeCustomers || 0)}
          icon={Users}
          color="bg-amber-100 text-amber-700"
        />
      </div>

      {/* Vyťaženosť a VIP zákazníci */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
          <h2 className="mb-4 text-lg sm:text-xl font-bold tracking-tight text-slate-950">Vyťaženosť kurtov</h2>
          <div className="overflow-x-auto">
            <div className="min-w-[620px] space-y-1">
              {["Po", "Ut", "St", "Št", "Pi", "So", "Ne"].map((day, dayIndex) => (
                <div key={day} className="grid items-center gap-1" style={{ gridTemplateColumns: "30px repeat(16, 1fr)" }}>
                  <b className="text-xs font-bold text-slate-500">{day}</b>
                  {Array.from({ length: 16 }, (_, offset) => {
                    const count = stats.heatmap?.[dayIndex]?.[offset + 7] || 0;
                    return (
                      <span
                        key={offset}
                        className="h-7 rounded-md bg-emerald-500 transition-opacity"
                        style={{ opacity: count ? Math.max(0.2, count / maxHeat) : 0.06 }}
                        title={`${offset + 7}:00 — ${count} rezervácií`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
          <h2 className="mb-4 text-lg sm:text-xl font-bold tracking-tight text-slate-950">VIP zákazníci</h2>
          <div className="space-y-2.5">
            {(stats.topCustomers || []).map((customer, index) => (
              <div
                key={customer.name}
                className="flex items-center justify-between rounded-2xl bg-slate-50/80 border border-slate-100 p-3 transition hover:bg-slate-100/70"
              >
                <span className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-100 text-xs font-bold text-indigo-700 shadow-2xs">
                    {index + 1}
                  </span>
                  <strong className="text-sm font-bold text-slate-900 capitalize">{customer.name}</strong>
                </span>
                <span className="text-right">
                  <strong className="block text-sm font-bold text-emerald-600">{customer.revenue.toFixed(2)} €</strong>
                  <span className="text-xs text-slate-400">{customer.hours.toFixed(1)} h</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Nadchádzajúce rezervácie */}
      <section className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
        <h2 className="mb-4 text-lg sm:text-xl font-bold tracking-tight text-slate-950">Nadchádzajúce rezervácie</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200/90">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-slate-200/90 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Dátum</th>
                <th className="px-5 py-3.5">Čas</th>
                <th className="px-5 py-3.5">Zákazník</th>
                <th className="px-5 py-3.5">Kurt</th>
                <th className="px-5 py-3.5 text-center">Stav</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {upcoming.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-5 py-4 font-bold text-slate-900">{date(item.start)}</td>
                  <td className="px-5 py-4 font-medium text-slate-700">
                    {time(item.start)} – {time(item.end)}
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-800">{item.customerName}</td>
                  <td className="px-5 py-4 text-slate-500">{court(item.courtId)}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`mx-auto grid h-8 w-8 place-items-center rounded-xl shadow-2xs ${
                        item.status === "blocked"
                          ? "bg-amber-100 text-amber-700"
                          : item.status === "cancelled"
                          ? "bg-red-100 text-red-600"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {item.status === "blocked" ? (
                        <Wrench className="h-4 w-4" />
                      ) : item.status === "cancelled" ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!upcoming.length && (
            <p className="py-8 text-center text-sm font-medium text-slate-500">
              Žiadne nadchádzajúce rezervácie.
            </p>
          )}
        </div>
      </section>

      <AdminCallHistory />

      {/* Modal Zablokovať kurt */}
      {modal && (
        <div className="fixed inset-0 z-[100] grid place-items-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm cursor-pointer"
            onClick={() => setModal(false)}
            aria-label="Zavrieť"
          />
          <form
            onSubmit={blockCourt}
            className="relative w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-2xl border border-slate-200"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xl font-bold tracking-tight text-slate-950">Zablokovať kurt</h2>
              <button
                type="button"
                onClick={() => setModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="block text-xs font-bold text-slate-700">
              Kurt
              <select
                value={form.courtId}
                onChange={(event) => setForm({ ...form, courtId: event.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-hidden cursor-pointer"
              >
                {[
                  "badminton-1",
                  "badminton-2",
                  "badminton-3",
                  "badminton-4",
                  "tennis-1",
                  "tennis-2",
                  "tennis-clay-1",
                  "tennis-clay-2",
                  "squash-1",
                  "squash-2",
                ].map((id) => (
                  <option key={id} value={id}>
                    {court(id)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold text-slate-700">
              Dátum
              <input
                required
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-hidden"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-bold text-slate-700">
                Od
                <input
                  required
                  type="time"
                  value={form.start}
                  onChange={(event) => setForm({ ...form, start: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-hidden"
                />
              </label>
              <label className="text-xs font-bold text-slate-700">
                Do
                <input
                  required
                  type="time"
                  value={form.end}
                  onChange={(event) => setForm({ ...form, end: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-hidden"
                />
              </label>
            </div>
            <button
              disabled={loading}
              className="w-full rounded-xl bg-slate-950 p-3 font-bold text-sm text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer active:scale-[0.98]"
            >
              {loading ? "Ukladám..." : "Zablokovať"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
