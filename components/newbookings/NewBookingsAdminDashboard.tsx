"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, CalendarDays, Check, Loader2, Users, Wrench, X } from "lucide-react";
import { createBookingAction, fetchAdminDashboardDataAction, fetchCourtHeatmapAction, type HeatmapCell, type CourtStatSummary } from "@/app/actions/bookings";
import { courts as ntcCourts, type SportType } from "@/lib/bookings/mockBookings";
import AdminCallHistory from "./AdminCallHistory";

type Booking = { id: string; courtId: string; customerName: string; start: string; end: string; status: "confirmed" | "blocked" | "cancelled"; price?: number };
type Customer = { name: string; hours: number; count: number; revenue: number };
type Stats = { pastHoursThisMonth?: number; futureHoursThisMonth?: number; pastRevenueThisMonth?: number; futureRevenueThisMonth?: number; totalBookings?: number; activeCustomers?: number; topCustomers?: Customer[]; heatmap?: number[][] };

const time = (value: string) => new Intl.DateTimeFormat("sk-SK", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const date = (value: string) => new Intl.DateTimeFormat("sk-SK").format(new Date(value));
const court = (value: string) => value.replace("tennis-clay", "Antuka").replace("badminton", "Bedminton").replace("tennis", "Tenis").replace("squash", "Squash").replace("-", " ");

function formatHeatmapDetail(cell: HeatmapCell | undefined, isSingleCourtView: boolean): string {
  if (!cell) return "";
  const isSingle = isSingleCourtView || cell.isSingleCourt;

  if (isSingle) {
    if (cell.occurrences <= 1) {
      return cell.occupiedSlots > 0 ? "obsadený" : "voľný";
    }
    if (cell.occupiedSlots === 0) {
      return `voľný vo všetkých ${cell.occurrences} týždňoch`;
    }
    const prep = cell.occurrences === 4 || cell.occurrences === 6 || cell.occurrences === 7 ? "zo" : "z";
    return `obsadený ${cell.occupiedSlots}× ${prep} ${cell.occurrences} týždňov v mesiaci`;
  }

  // Viacero kurtov (celý šport alebo celé stredisko)
  if (cell.occurrences <= 1) {
    return `obsadených ${cell.occupiedSlots} z ${cell.totalCourts} kurtov`;
  }
  return `priemerne ${cell.occupiedCount} z ${cell.totalCourts} kurtov`;
}

export default function NewBookingsAdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ courtId: "badminton-1", date: "", start: "07:00", end: "09:00" });
  const [now] = useState(() => Date.now());

  // Dynamické filtre a dáta pre vyťaženosť kurtov (Blok 2)
  const [selectedSport, setSelectedSport] = useState<"all" | SportType>("badminton");
  const [selectedPeriod, setSelectedPeriod] = useState<"this_week" | "this_month" | "last_week" | "last_month">("this_week");
  const [selectedCourtId, setSelectedCourtId] = useState<string>("");
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>([]);
  const [courtStats, setCourtStats] = useState<CourtStatSummary[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  useEffect(() => {
    let active = true;
    setHeatmapLoading(true);
    fetchCourtHeatmapAction({
      sport: selectedSport,
      period: selectedPeriod,
      courtId: selectedCourtId || undefined,
    }).then((res) => {
      if (!active) return;
      if (res.success && res.heatmap) {
        setHeatmapData(res.heatmap);
        setCourtStats(res.courtStats || []);
      }
      setHeatmapLoading(false);
    });
    return () => {
      active = false;
    };
  }, [selectedSport, selectedPeriod, selectedCourtId]);

  const sportOptions: { id: "all" | SportType; label: string; count: number; icon: string }[] = [
    { id: "badminton", label: "Bedminton", count: 10, icon: "🏸" },
    { id: "tennis", label: "Tenis indoor", count: 6, icon: "🎾" },
    { id: "tennis-clay", label: "Tenis antuka", count: 4, icon: "🧱" },
    { id: "squash", label: "Squash", count: 4, icon: "⬛" },
    { id: "all", label: "Všetky", count: 24, icon: "🌐" },
  ];

  const courtsForSport = useMemo(() => {
    if (selectedSport === "all") return ntcCourts;
    return ntcCourts.filter((c) => c.sport === selectedSport);
  }, [selectedSport]);

  const heatmapByDay = useMemo(() => {
    const map: Record<number, Record<number, HeatmapCell>> = {};
    for (let d = 0; d < 7; d++) map[d] = {};
    for (const cell of heatmapData) {
      if (!map[cell.dayIndex]) map[cell.dayIndex] = {};
      map[cell.dayIndex][cell.hour] = cell;
    }
    return map;
  }, [heatmapData]);

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

      {/* Vyťaženosť a VIP zákazníci */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] xl:grid-cols-[1.7fr_1fr]">
        <section className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
          {/* Hlavička sekcie a prepínač obdobia */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-950">Vyťaženosť kurtov</h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Reálna obsadenosť podľa hodín z kalendára (07:00 – 22:00)
              </p>
            </div>

            {/* Prepínač obdobia */}
            <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold text-slate-700">
              {(
                [
                  { id: "this_week", label: "Tento týždeň" },
                  { id: "this_month", label: "Tento mesiac" },
                  { id: "last_week", label: "Minulý týždeň" },
                  { id: "last_month", label: "Minulý mesiac" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPeriod(p.id)}
                  className={`cursor-pointer px-2.5 py-1.5 rounded-xl transition text-[11px] sm:text-xs ${
                    selectedPeriod === p.id
                      ? "bg-white text-slate-950 shadow-2xs font-extrabold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prepínače športov a výber kurtu */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {sportOptions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedSport(s.id);
                    setSelectedCourtId("");
                  }}
                  className={`cursor-pointer inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold border transition ${
                    selectedSport === s.id
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                      selectedSport === s.id ? "bg-emerald-700 text-emerald-100" : "bg-slate-200/80 text-slate-600"
                    }`}
                  >
                    {s.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Filter konkrétneho kurtu */}
            {courtsForSport.length > 1 && (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span>Kurt:</span>
                <select
                  value={selectedCourtId}
                  onChange={(e) => setSelectedCourtId(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-hidden cursor-pointer"
                >
                  <option value="">Všetky kurty ({courtsForSport.length})</option>
                  {courtsForSport.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.surface})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Inšpekčný riadok s detailom po hoveri a legendou */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-xl bg-slate-50 text-slate-700 border border-slate-200/80 min-h-[32px]">
              {hoveredCell ? (
                <>
                  <span className="font-bold text-slate-950">
                    {hoveredCell.dayName} {hoveredCell.hour}:00 – {hoveredCell.hour + 1}:00:
                  </span>
                  <span className="font-extrabold text-emerald-700">
                    {hoveredCell.percentage}% vyťaženosť
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    ({formatHeatmapDetail(hoveredCell, Boolean(selectedCourtId))})
                  </span>
                </>
              ) : (
                <span className="text-slate-400 text-[11px]">
                  Prejdite kurzorom ponad okienko pre zobrazenie detailu hodiny
                </span>
              )}
            </div>

            {/* Legenda vyťaženosti */}
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <span>0%</span>
              <span className="h-3 w-3 rounded-xs bg-slate-100 border border-slate-200" title="0% (voľno)" />
              <span className="h-3 w-3 rounded-xs bg-emerald-100 border border-emerald-200" title="1-25%" />
              <span className="h-3 w-3 rounded-xs bg-emerald-300 border border-emerald-400" title="26-50%" />
              <span className="h-3 w-3 rounded-xs bg-emerald-500 border border-emerald-600" title="51-75%" />
              <span className="h-3 w-3 rounded-xs bg-emerald-700 border border-emerald-800" title="76-100% (špička)" />
              <span>100%</span>
            </div>
          </div>

          {/* Mriežka heatmapy */}
          <div className="relative overflow-x-auto pb-1">
            {heatmapLoading && (
              <div className="absolute inset-0 z-20 grid place-items-center bg-white/70 backdrop-blur-2xs rounded-2xl">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              </div>
            )}
            <div className="min-w-[620px] space-y-1.5">
              {/* Hodiny na vrchu kalendára */}
              <div className="grid items-center gap-1 text-[10px] font-bold text-slate-400" style={{ gridTemplateColumns: "32px repeat(16, 1fr)" }}>
                <span className="text-center"></span>
                {Array.from({ length: 16 }, (_, offset) => (
                  <span key={offset} className="text-center tracking-tight">
                    {offset + 7}h
                  </span>
                ))}
              </div>

              {/* Riadky pre jednotlivé dni v týždni */}
              {["Po", "Ut", "St", "Št", "Pi", "So", "Ne"].map((day, dayIndex) => (
                <div key={day} className="grid items-center gap-1" style={{ gridTemplateColumns: "32px repeat(16, 1fr)" }}>
                  <b className="text-center text-xs font-bold text-slate-600">{day}</b>
                  {Array.from({ length: 16 }, (_, offset) => {
                    const hour = offset + 7;
                    const cell = heatmapByDay[dayIndex]?.[hour];
                    const pct = cell?.percentage || 0;
                    const count = cell?.occupiedCount || 0;
                    const total = cell?.totalCourts || (courtsForSport.length || 1);

                    return (
                      <button
                        key={offset}
                        type="button"
                        onMouseEnter={() => cell && setHoveredCell(cell)}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`h-7 rounded-md transition-all duration-150 hover:scale-110 hover:z-10 cursor-pointer ${
                          pct === 0
                            ? "bg-slate-100/80 border border-slate-200/60"
                            : pct <= 25
                            ? "bg-emerald-100/90 border border-emerald-200"
                            : pct <= 50
                            ? "bg-emerald-300 border border-emerald-400"
                            : pct <= 75
                            ? "bg-emerald-500 border border-emerald-600 shadow-2xs"
                            : "bg-emerald-700 border border-emerald-800 shadow-xs"
                        }`}
                        title={`${day} ${hour}:00–${hour + 1}:00: ${pct}% vyťaženosť (${formatHeatmapDetail(cell, Boolean(selectedCourtId))})`}
                        aria-label={`${day} ${hour}:00–${hour + 1}:00: ${pct}% (${formatHeatmapDetail(cell, Boolean(selectedCourtId))})`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Prehľad vyťaženosti jednotlivých kurtov (Zoznam s progress barmi) */}
          {courtStats.length > 0 && !selectedCourtId && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Vyťaženosť jednotlivých kurtov ({courtStats.length})
                  </h3>
                </div>
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-400">
                  Zoradené podľa odohraných hodín
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 max-h-[300px] overflow-y-auto pr-1">
                {courtStats.map((item, idx) => (
                  <div
                    key={item.courtId}
                    onClick={() => setSelectedCourtId(item.courtId)}
                    className="group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 transition hover:border-emerald-300 hover:bg-emerald-50/40 cursor-pointer"
                    title={`Kliknite pre zobrazenie heatmapy iba pre ${item.courtName}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-white border border-slate-200 text-[9px] font-bold text-slate-600 shadow-2xs">
                          {idx + 1}
                        </span>
                        <b className="truncate text-xs font-bold text-slate-900 group-hover:text-emerald-800">
                          {item.courtName}
                        </b>
                        <span className="truncate text-[9.5px] text-slate-400">
                          {item.surface.replace(" Court", "")}
                        </span>
                      </div>
                      <span className="shrink-0 rounded-md bg-emerald-100/90 border border-emerald-200 px-1.5 py-0.2 text-[10px] font-extrabold text-emerald-800">
                        {item.utilizationPercent}%
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            item.utilizationPercent >= 70
                              ? "bg-emerald-600"
                              : item.utilizationPercent >= 40
                              ? "bg-emerald-400"
                              : "bg-amber-400"
                          }`}
                          style={{ width: `${item.utilizationPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[9.5px] text-slate-500 font-medium">
                        <span>{item.occupiedHours.toFixed(1)} h obsadené</span>
                        <span>{item.bookingsCount} rezervácií</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
          {/* Hlavička VIP zákazníkov s údajom Aktívni zákazníci vpravo */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-950">VIP zákazníci</h2>
              <p className="text-xs text-slate-500">Najaktívnejší hráči tento mesiac</p>
            </div>

            {/* Údaj Aktívni zákazníci presunutý do pravej časti */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/60 px-3.5 py-1.5 shadow-2xs">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800 shadow-2xs">
                <Users className="h-4 w-4" />
              </span>
              <div className="text-left sm:text-right">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Aktívni zákazníci</span>
                <strong className="block text-base sm:text-lg font-extrabold leading-tight text-slate-950">
                  {stats.activeCustomers || 0}
                </strong>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {(!stats.topCustomers || stats.topCustomers.length === 0) && (
              <p className="py-6 text-center text-xs text-slate-400">Tento mesiac zatiaľ nie sú zaznamenané rezervácie.</p>
            )}
            {(stats.topCustomers || []).map((customer, index) => (
              <div
                key={customer.name}
                className="flex items-center justify-between rounded-2xl bg-slate-50/80 border border-slate-100 p-3 transition hover:bg-slate-100/80"
              >
                <span className="flex items-center gap-3">
                  <span className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
                    {index + 1}
                  </span>
                  <strong className="text-xs sm:text-sm font-bold text-slate-900 capitalize">{customer.name}</strong>
                </span>
                <span className="text-right">
                  <strong className="block text-xs sm:text-sm font-bold text-emerald-600">{customer.revenue.toFixed(2)} €</strong>
                  <span className="text-[11px] text-slate-400">{customer.hours.toFixed(1)} h</span>
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
