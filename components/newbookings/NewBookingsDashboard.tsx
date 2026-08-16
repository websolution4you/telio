"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownLeft, ArrowLeft, ArrowUpRight, CalendarDays, Clock3, Coins, LayoutDashboard, Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { deleteBookingAction, fetchUserDashboardDataAction, restoreBookingAction } from "@/app/actions/bookings";
import { createWalletCheckoutAction, getWalletHistoryAction } from "@/app/actions/wallet";

import type { SessionPayload } from "@/lib/auth/bookingAuth";
import NewBookingsAdminDashboard from "./NewBookingsAdminDashboard";

type BookingItem = {
  id: string;
  courtId: string;
  start: string;
  end: string;
  status: "confirmed" | "blocked" | "cancelled";
};

type Stats = {
  pastHoursThisMonth?: number;
  futureHoursThisMonth?: number;
  totalBookings?: number;
};

type PendingAction = { type: "delete" | "restore"; booking: BookingItem } | null;

type WalletTransaction = {
  id: string;
  type: "payment" | "booking_charge" | "refund" | "manual_adjustment" | "bonus";
  amountEur: number;
  balanceAfterEur: number;
  createdAt: string;
  booking: { startAt: string; courtId: string | null } | null;
  reason: string | null;
};


const formatDate = (value: string) => new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
const formatTime = (value: string) => new Intl.DateTimeFormat("sk-SK", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const formatHours = (value = 0) => value.toFixed(1).replace(".0", "");
const formatEur = (value: number) => new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR" }).format(value);

const courtName = (value: string) => value.replace("tennis-clay", "Antuka").replace("badminton", "Bedminton").replace("tennis", "Tenis").replace("squash", "Squash").replace("-", " ");

const statTones = {
  cyan: "border-cyan-100 from-cyan-50 to-sky-50 text-cyan-700 bg-cyan-100",
  indigo: "border-indigo-100 from-indigo-50 to-violet-50 text-indigo-700 bg-indigo-100",
  emerald: "border-emerald-100 from-emerald-50 to-teal-50 text-emerald-700 bg-emerald-100",
};

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof Clock3; label: string; value: string; tone: keyof typeof statTones }) {
  const [border, from, to, text, background] = statTones[tone].split(" ");
  return (
    <div className={`rounded-3xl border bg-gradient-to-br p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] ${border} ${from} ${to}`}>
      <span className={`mb-5 grid h-11 w-11 place-items-center rounded-2xl ${background} ${text}`}><Icon className="h-5 w-5" /></span>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <strong className="mt-1 block text-3xl font-bold tracking-tight text-slate-950">{value}</strong>
    </div>
  );
}

function BookingRow({ booking, future, now, onAction }: { booking: BookingItem; future: boolean; now: number; onAction: (value: PendingAction) => void }) {
  const cancelled = booking.status === "cancelled";
  const canCancel = future && !cancelled && new Date(booking.start).getTime() > now + 86_400_000;
  return (
    <div className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${cancelled ? "border-red-100 bg-red-50/60" : "border-slate-100 bg-slate-50/80"}`}>
      <div><div className="flex flex-wrap items-center gap-2"><b className="text-sm text-slate-950">{formatDate(booking.start)}</b>{cancelled && <span className="rounded-full bg-red-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-red-600">Zrušené</span>}{future && !cancelled && !canCancel && <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-700">Zrušenie už nie je možné</span>}</div><p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{courtName(booking.courtId)}</p>{future && !cancelled && !canCancel && <p className="mt-1 text-[10px] font-medium text-amber-700">Menej ako 24 hodín do začiatku</p>}</div>
      <div className="flex items-center justify-between gap-3 sm:justify-end"><b className={`whitespace-nowrap text-sm ${cancelled ? "text-slate-400 line-through" : "text-slate-800"}`}>{formatTime(booking.start)} – {formatTime(booking.end)}</b>{canCancel && <button onClick={() => onAction({ type: "delete", booking })} className="grid h-9 w-9 place-items-center rounded-xl border border-red-100 bg-white text-red-500 hover:bg-red-50" title="Zrušiť rezerváciu"><Trash2 className="h-4 w-4" /></button>}{future && cancelled && <button onClick={() => onAction({ type: "restore", booking })} className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-100 bg-white text-cyan-600 hover:bg-cyan-50" title="Obnoviť rezerváciu"><RefreshCw className="h-4 w-4" /></button>}</div>
    </div>
  );
}

function BookingSection({ title, empty, bookings, future = false, now, onAction }: { title: string; empty: string; bookings: BookingItem[]; future?: boolean; now: number; onAction: (value: PendingAction) => void }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_15px_45px_rgba(15,23,42,0.06)] sm:p-6"><h2 className="mb-5 text-xl font-bold text-slate-950">{title}</h2>{bookings.length ? <div className="space-y-3">{bookings.map((booking) => <BookingRow key={booking.id} booking={booking} future={future} now={now} onAction={onAction} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">{empty}</div>}</section>;
}

function WalletHistory({ balanceEur, transactions }: { balanceEur: number; transactions: WalletTransaction[] }) {
  const [loadingAmount, setLoadingAmount] = useState<number | null>(null);
  const [checkoutError, setCheckoutError] = useState("");

  const startCheckout = async (amountEur: number) => {
    setLoadingAmount(amountEur);
    setCheckoutError("");
    const result = await createWalletCheckoutAction(amountEur, crypto.randomUUID());
    if (!result.success || !result.url) {
      setCheckoutError(result.error || "Platobnú stránku sa nepodarilo otvoriť.");
      setLoadingAmount(null);
      return;
    }
    window.location.assign(result.url);
  };
  const labels: Record<WalletTransaction["type"], string> = {
    payment: "Dobitie kartou",
    booking_charge: "Platba za rezerváciu",
    refund: "Vrátenie za rezerváciu",
    manual_adjustment: "Testovacie dobitie",
    bonus: "Bonusový kredit",
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-[0_15px_45px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-100">Peňaženka</p><h2 className="mt-1 text-xl font-bold">Kredit a transakcie</h2></div>
        <div className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur"><Coins className="h-5 w-5" /><div><small className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-100">Aktuálny kredit</small><strong className="text-xl">{formatEur(balanceEur)}</strong></div></div>
      </div>
      <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
        <div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm font-bold text-slate-800">Dobiť kredit kartou</p><span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Stripe test mode</span></div>
        <div className="flex flex-wrap items-center gap-2">{[10, 20, 50].map((amount) => <button key={amount} type="button" disabled={loadingAmount !== null} onClick={() => startCheckout(amount)} className="min-w-[76px] rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-extrabold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-50">{loadingAmount === amount ? "Otváram..." : `${amount} €`}</button>)}</div>
        {checkoutError && <p className="mt-2 text-xs font-semibold text-red-600">{checkoutError}</p>}
      </div>
      {transactions.length ? (
        <div className="divide-y divide-slate-100">
          {transactions.map((transaction) => {
            const positive = transaction.amountEur > 0;
            const detail = transaction.booking
              ? `${transaction.booking.courtId ? courtName(transaction.booking.courtId) : "Rezervácia"} · ${formatDate(transaction.booking.startAt)} o ${formatTime(transaction.booking.startAt)}`
              : transaction.reason;
            return (
              <div key={transaction.id} className="flex items-center gap-3 px-5 py-4 sm:px-6">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>{positive ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}</span>
                <div className="min-w-0 flex-1"><b className="block text-sm text-slate-900">{labels[transaction.type]}</b><p className="truncate text-xs text-slate-500">{detail || `${formatDate(transaction.createdAt)} o ${formatTime(transaction.createdAt)}`}</p><p className="mt-1 text-[10px] text-slate-400">{formatDate(transaction.createdAt)}, {formatTime(transaction.createdAt)}</p></div>
                <div className="text-right"><strong className={`block whitespace-nowrap text-sm ${positive ? "text-emerald-600" : "text-red-600"}`}>{positive ? "+" : ""}{formatEur(transaction.amountEur)}</strong><small className="whitespace-nowrap text-[10px] text-slate-400">Zostatok {formatEur(transaction.balanceAfterEur)}</small></div>
              </div>
            );
          })}
        </div>
      ) : <div className="p-8 text-center text-sm text-slate-500">Zatiaľ nemáš žiadne pohyby kreditu.</div>}
    </section>
  );
}

export default function NewBookingsDashboard({ currentUser }: { currentUser: SessionPayload }) {
  return currentUser.role === "admin" ? <AdminDashboardPage /> : <UserDashboardPage currentUser={currentUser} />;
}

function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-900" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <header className="border-b border-cyan-100 bg-gradient-to-r from-white via-cyan-50 to-indigo-50 shadow-sm"><div className="mx-auto flex min-h-[76px] max-w-[1400px] items-center justify-between px-4 sm:px-6"><Link href="/newbookings" className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-600 font-bold text-white shadow-lg">T</span><span><b className="block tracking-[0.12em]">TELIO</b><small className="text-slate-500">Prehľad rezervácií</small></span></Link><Link href="/newbookings" className="flex items-center gap-2 rounded-2xl border border-white bg-white/80 px-4 py-2.5 text-sm font-bold shadow-sm"><ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Späť na kalendár</span></Link></div></header>
      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:py-12"><NewBookingsAdminDashboard /></main>
    </div>
  );
}

function UserDashboardPage({ currentUser }: { currentUser: SessionPayload }) {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [wallet, setWallet] = useState<{ balanceEur: number; transactions: WalletTransaction[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<PendingAction>(null);
  const [now] = useState(() => Date.now());

    const loadData = useCallback(async () => {
    const [bookingResult, walletResult] = await Promise.all([
      fetchUserDashboardDataAction(),
      getWalletHistoryAction(),
    ]);
    setError("");
    if (bookingResult.success) {
      setBookings((bookingResult.bookings || []) as BookingItem[]);
      setStats((bookingResult.stats || {}) as Stats);
    } else {
      setError(bookingResult.error || "Dáta sa nepodarilo načítať.");
    }
    if (walletResult.success && walletResult.enabled) {
      setWallet({ balanceEur: walletResult.balanceEur || 0, transactions: walletResult.transactions as WalletTransaction[] });
    } else {
      setWallet(null);
      if (!walletResult.success && walletResult.enabled) setError(walletResult.error || "Históriu kreditu sa nepodarilo načítať.");
    }
    setLoading(false);
  }, []);

    useEffect(() => {
    loadData();
  }, [loadData]);
  const future = useMemo(() => bookings.filter((item) => new Date(item.start).getTime() > now).sort((a, b) => +new Date(a.start) - +new Date(b.start)), [bookings, now]);
  const past = useMemo(() => bookings.filter((item) => new Date(item.start).getTime() <= now).sort((a, b) => +new Date(b.start) - +new Date(a.start)), [bookings, now]);

  const confirm = async () => {
    if (!pending) return;
    setLoading(true);
    const result = pending.type === "delete" ? await deleteBookingAction(pending.booking.id) : await restoreBookingAction(pending.booking.id);
    setPending(null);
    if (!result.success) { setError(result.error || "Operáciu sa nepodarilo dokončiť."); setLoading(false); return; }
    await loadData();
  };

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-900" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <header className="relative isolate overflow-hidden border-b border-cyan-100/80 bg-gradient-to-r from-white via-cyan-50/80 to-indigo-50/80 shadow-[0_10px_35px_rgba(15,23,42,0.07)]">
        <div className="pointer-events-none absolute -left-16 -top-24 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl" /><div className="pointer-events-none absolute -right-12 -top-28 h-48 w-48 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="relative mx-auto flex min-h-[76px] max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:min-h-[86px] sm:px-6"><Link href="/newbookings" className="flex items-center gap-3"><span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.3)]"><b>T</b><Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-white p-0.5 text-violet-600" /></span><span><b className="block tracking-[0.12em]">TELIO</b><small className="text-slate-500">Prehľad rezervácií</small></span></Link><Link href="/newbookings" className="flex items-center gap-2 rounded-2xl border border-white bg-white/80 px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:-translate-y-0.5 sm:px-4 sm:text-sm"><ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Späť na kalendár</span></Link></div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:py-12">
        <div className="mb-8"><span className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-700"><LayoutDashboard className="h-3.5 w-3.5" /> Moje rezervácie</span><h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>Vitaj, {currentUser.name}</h1><p className="mt-2 text-sm text-slate-500">Tvoje rezervácie a osobná športová štatistika.</p></div>
        {error && <button onClick={() => setError("")} className="mb-6 w-full rounded-2xl border border-red-200 bg-red-50 p-4 text-left text-sm font-semibold text-red-700">{error}</button>}
        {loading && !bookings.length ? <div className="grid min-h-[360px] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-cyan-600" /></div> : <div className="space-y-8">{wallet && <WalletHistory balanceEur={wallet.balanceEur} transactions={wallet.transactions} />}<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><StatCard icon={Clock3} label="Odohrané tento mesiac" value={`${formatHours(stats.pastHoursThisMonth)} hod.`} tone="cyan" /><StatCard icon={CalendarDays} label="Naplánované tento mesiac" value={`${formatHours(stats.futureHoursThisMonth)} hod.`} tone="indigo" /><StatCard icon={Activity} label="Počet rezervácií tento mesiac" value={String(stats.totalBookings || 0)} tone="emerald" /></div><div className="grid gap-6 lg:grid-cols-2"><BookingSection title="Nadchádzajúce termíny" empty="Nemáš žiadne aktívne rezervácie." bookings={future} future now={now} onAction={setPending} /><BookingSection title="História rezervácií" empty="Zatiaľ nemáš históriu rezervácií." bookings={past} now={now} onAction={setPending} /></div></div>}
      </main>
      {pending && <div className="fixed inset-0 z-[100] grid place-items-center p-4"><button className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setPending(null)} aria-label="Zavrieť" /><div className="relative w-full max-w-sm rounded-3xl border border-white bg-white p-6 text-center shadow-2xl"><span className={`mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl ${pending.type === "delete" ? "bg-red-50 text-red-600" : "bg-cyan-50 text-cyan-600"}`}>{pending.type === "delete" ? <Trash2 className="h-6 w-6" /> : <RefreshCw className="h-6 w-6" />}</span><h2 className="text-xl font-bold">{pending.type === "delete" ? "Zrušiť rezerváciu?" : "Obnoviť rezerváciu?"}</h2><p className="mt-2 text-sm text-slate-500">{formatDate(pending.booking.start)}, {formatTime(pending.booking.start)} – {formatTime(pending.booking.end)}</p><div className="mt-6 grid grid-cols-2 gap-3"><button onClick={() => setPending(null)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold">Späť</button><button onClick={confirm} disabled={loading} className={`rounded-xl px-4 py-3 text-sm font-bold text-white ${pending.type === "delete" ? "bg-red-600" : "bg-cyan-600"}`}>{loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Potvrdiť"}</button></div></div></div>}
    </div>
  );
}
