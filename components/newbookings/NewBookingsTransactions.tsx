"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Coins, LayoutDashboard, Loader2, Sparkles } from "lucide-react";
import { createWalletCheckoutAction, getWalletHistoryAction, reconcileWalletCheckoutAction } from "@/app/actions/wallet";
import type { SessionPayload } from "@/lib/auth/bookingAuth";

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
const formatEur = (value: number) => new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR" }).format(value);
const courtName = (value: string) => value.replace("tennis-clay", "Antuka").replace("badminton", "Bedminton").replace("tennis", "Tenis").replace("squash", "Squash").replace("-", " ");

const labels: Record<WalletTransaction["type"], string> = {
  payment: "Dobitie kartou",
  booking_charge: "Platba za rezerváciu",
  refund: "Vrátenie za rezerváciu",
  manual_adjustment: "Testovacie dobitie",
  bonus: "Bonusový kredit",
};

export default function NewBookingsTransactions({ currentUser }: { currentUser: SessionPayload }) {
  const [wallet, setWallet] = useState<{ balanceEur: number; transactions: WalletTransaction[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAmount, setLoadingAmount] = useState<number | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [walletNotice, setWalletNotice] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    const walletResult = await getWalletHistoryAction();
    setError("");
    if (walletResult.success && walletResult.enabled) {
      setWallet({ balanceEur: walletResult.balanceEur || 0, transactions: walletResult.transactions as WalletTransaction[] });
    } else {
      setWallet(null);
      if (!walletResult.success && walletResult.enabled) setError(walletResult.error || "Históriu kreditu sa nepodarilo načítať.");
    }
    setLoading(false);
  }, []);

      useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const checkoutSessionId = params.get("session_id");
    const walletStatus = params.get("wallet");

    if (walletStatus || checkoutSessionId) window.history.replaceState({}, "", window.location.pathname);
    const initialize = async () => {
      if (walletStatus === "cancelled") setWalletNotice("Dobíjanie kreditu bolo zrušené.");
      if (walletStatus === "success" && checkoutSessionId) {
        setWalletNotice("Overujem platbu a pripisujem kredit...");
        const result = await reconcileWalletCheckoutAction(checkoutSessionId);
        if (!active) return;
        setWalletNotice(result.success ? "Platba bola úspešne prijatá a kredit bol pripísaný." : result.error || "Platbu sa zatiaľ nepodarilo potvrdiť.");
      }
      if (active) await loadData();
    };
    const timer = window.setTimeout(() => { void initialize(); }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadData]);

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

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-900" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <header className="relative isolate overflow-hidden border-b border-emerald-100/80 bg-gradient-to-r from-white via-emerald-50/70 to-teal-50/70 shadow-[0_10px_35px_rgba(15,23,42,0.07)]">
        <div className="pointer-events-none absolute -left-16 -top-24 h-44 w-44 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-12 -top-28 h-48 w-48 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="relative mx-auto flex min-h-[76px] max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:min-h-[86px] sm:px-6">
          <Link href="/newbookings" className="flex items-center gap-3">
            <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white shadow-[0_10px_24px_rgba(16,185,129,0.3)]">
              <b>T</b>
              <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-white p-0.5 text-emerald-600" />
            </span>
            <span>
              <b className="block tracking-[0.12em]">TELIO</b>
              <small className="text-slate-500">Peňaženka a transakcie</small>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard/newbookings"
              className="flex items-center gap-2 rounded-2xl border border-indigo-200 bg-white/90 px-3 py-2.5 text-xs font-bold text-indigo-700 shadow-xs hover:-translate-y-0.5 hover:bg-indigo-50 sm:px-4 sm:text-sm"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Moje štatistiky</span>
            </Link>
            <Link
              href="/newbookings"
              className="flex items-center gap-2 rounded-2xl border border-white bg-white/90 px-3 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:-translate-y-0.5 sm:px-4 sm:text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Späť na kalendár</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:py-12">
        <div className="mb-8">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
            <Coins className="h-3.5 w-3.5" /> Moje transakcie
          </span>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>
            Vitaj, {currentUser.name}
          </h1>
          <p className="mt-2 text-sm text-slate-500">Prehľad tvojej peňaženky, dobitia a pohybov kreditu.</p>
        </div>

        {walletNotice && (
          <button onClick={() => setWalletNotice("")} className="mb-6 w-full rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left text-sm font-semibold text-emerald-700">
            {walletNotice}
          </button>
        )}
        {error && (
          <button onClick={() => setError("")} className="mb-6 w-full rounded-2xl border border-red-200 bg-red-50 p-4 text-left text-sm font-semibold text-red-700">
            {error}
          </button>
        )}

        {loading ? (
          <div className="grid min-h-[360px] place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="space-y-8">
            <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-[0_15px_45px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-4 bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-100">PEŇAŽENKA</p>
                  <h2 className="mt-1 text-xl font-bold">Kredit a transakcie</h2>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                  <Coins className="h-5 w-5" />
                  <div>
                    <small className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-100">AKTUÁLNY KREDIT</small>
                    <strong className="text-xl">{formatEur(wallet?.balanceEur || 0)}</strong>
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
                <div className="mb-2 flex items-center justify-between gap-3">
                                                      <p className="text-sm font-bold text-slate-800">Dobiť kredit kartou</p>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Stripe</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[10, 20, 50].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      disabled={loadingAmount !== null}
                      onClick={() => startCheckout(amount)}
                      className="min-w-[76px] rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-extrabold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-50"
                    >
                      {loadingAmount === amount ? "Otváram..." : `${amount} €`}
                    </button>
                  ))}
                </div>
                {checkoutError && <p className="mt-2 text-xs font-semibold text-red-600">{checkoutError}</p>}
              </div>

              {wallet?.transactions.length ? (
                <div className="divide-y divide-slate-100">
                  {wallet.transactions.map((transaction) => {
                    const positive = transaction.amountEur > 0;
                    const detail = transaction.booking
                      ? `${transaction.booking.courtId ? courtName(transaction.booking.courtId) : "Rezervácia"} · ${formatDate(transaction.booking.startAt)} o ${formatTime(transaction.booking.startAt)}`
                      : transaction.reason;
                    return (
                      <div key={transaction.id} className="flex items-center gap-3 px-5 py-4 sm:px-6">
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                          {positive ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <b className="block text-sm text-slate-900">{labels[transaction.type]}</b>
                          <p className="truncate text-xs text-slate-500">{detail || `${formatDate(transaction.createdAt)} o ${formatTime(transaction.createdAt)}`}</p>
                          <p className="mt-1 text-[10px] text-slate-400">{formatDate(transaction.createdAt)}, {formatTime(transaction.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <strong className={`block whitespace-nowrap text-sm ${positive ? "text-emerald-600" : "text-red-600"}`}>
                            {positive ? "+" : ""}{formatEur(transaction.amountEur)}
                          </strong>
                          <small className="whitespace-nowrap text-[10px] text-slate-400">Zostatok {formatEur(transaction.balanceAfterEur)}</small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-slate-500">Zatiaľ nemáš žiadne pohyby kreditu.</div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
