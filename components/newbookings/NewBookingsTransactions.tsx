"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Coins, CreditCard, LayoutDashboard, Loader2, Sparkles } from "lucide-react";
import { addTestWalletCreditAction, createWalletCardPayAction, getWalletHistoryAction, reconcileWalletCardPayAction, reconcileWalletCheckoutAction } from "@/app/actions/wallet";
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

type FilterType = "all" | "booking_charge" | "refund" | "payment" | "manual_adjustment";

const filterButtons: { id: FilterType; label: string }[] = [
  { id: "all", label: "Všetky" },
  { id: "booking_charge", label: "Platba za rezerváciu" },
  { id: "refund", label: "Vrátenie za rezerváciu" },
  { id: "payment", label: "Dobitie kartou" },
  { id: "manual_adjustment", label: "Testovacie dobitie" },
];

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
  const [cardPayLoadingAmount, setCardPayLoadingAmount] = useState<number | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [walletNotice, setWalletNotice] = useState("");
  const [error, setError] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");

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
      const cardPayResult = await reconcileWalletCardPayAction();
      if (!active) return;
      if (cardPayResult.success && cardPayResult.successful > 0) {
        setWalletNotice(cardPayResult.successful === 1
          ? "CardPay platba bola potvrdená a kredit bol pripísaný."
          : `${cardPayResult.successful} CardPay platby boli potvrdené a kredit bol pripísaný.`);
      }
      if (walletStatus === "cancelled") setWalletNotice("Dobíjanie kreditu bolo zrušené.");
      if (walletStatus === "failed") setWalletNotice("CardPay platba nebola úspešná.");
      if (walletStatus === "pending" && (!cardPayResult.success || cardPayResult.successful === 0)) setWalletNotice("CardPay platba čaká na potvrdenie. Stav skontrolujeme automaticky.");
      if (walletStatus === "error") setWalletNotice("CardPay platbu sa nepodarilo overiť.");
      if (walletStatus === "login-required") setWalletNotice("Pre dokončenie CardPay platby sa prihláste.");
      if (walletStatus === "success" && !checkoutSessionId && (!cardPayResult.success || cardPayResult.successful === 0)) setWalletNotice("CardPay platba bola úspešná a kredit bol pripísaný.");
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

  const addTestCredit = async (amountEur: number) => {
    setLoadingAmount(amountEur);
    setCheckoutError("");
    const result = await addTestWalletCreditAction(amountEur, crypto.randomUUID());
    if (!result.success) {
      setCheckoutError(result.error || "Testovací kredit sa nepodarilo pridať.");
      setLoadingAmount(null);
      return;
    }
    setWalletNotice(`Testovací kredit +${formatEur(result.amountEur)} bol pridaný.`);
    await loadData();
    setLoadingAmount(null);
  };

      const startCardPay = async (amountEur: number) => {
    setCardPayLoadingAmount(amountEur);
    setCheckoutError("");
    const result = await createWalletCardPayAction(amountEur, crypto.randomUUID());
    if (!result.success || !result.url) {
      setCheckoutError(result.error || "CardPay platbu sa nepodarilo pripraviť.");
      setCardPayLoadingAmount(null);
      return;
    }
    window.location.assign(result.url);
  };

  const counts = useMemo(() => {
    const list = wallet?.transactions || [];
    return {
      all: list.length,
      booking_charge: list.filter((t) => t.type === "booking_charge").length,
      refund: list.filter((t) => t.type === "refund").length,
      payment: list.filter((t) => t.type === "payment").length,
      manual_adjustment: list.filter((t) => t.type === "manual_adjustment").length,
    };
  }, [wallet?.transactions]);

  const filteredTransactions = useMemo(() => {
    if (!wallet?.transactions) return [];
    if (selectedFilter === "all") return wallet.transactions;
    return wallet.transactions.filter((t) => t.type === selectedFilter);
  }, [wallet, selectedFilter]);

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

                            <div className="border-b border-slate-100 bg-sky-50/60 px-5 py-4 sm:px-6">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-bold text-slate-800"><CreditCard className="h-4 w-4 text-sky-700" /> Dobiť cez Tatra banka CardPay</p>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-700">Sandbox</span>
                </div>
                <p className="mb-3 text-xs text-slate-500">Budete presmerovaný na zabezpečenú testovaciu platobnú stránku Tatra banky.</p>
                <div className="flex flex-wrap items-center gap-2">
                  {[10, 20, 50].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      disabled={cardPayLoadingAmount !== null}
                      onClick={() => startCardPay(amount)}
                      className="min-w-[76px] cursor-pointer rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-xs font-extrabold text-sky-700 transition hover:border-sky-400 hover:bg-sky-50 disabled:cursor-wait disabled:opacity-50"
                    >
                      {cardPayLoadingAmount === amount ? "Otváram..." : `${amount} €`}
                    </button>
                  ))}
                </div>
                {checkoutError && <p className="mt-2 text-xs font-semibold text-red-600">{checkoutError}</p>}
              </div>

              {/* Test Top-up section */}
              <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-800">Testovacie dobitie</p>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Bez platobnej karty</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[10, 20, 50].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      disabled={loadingAmount !== null}
                      onClick={() => addTestCredit(amount)}
                      className="min-w-[76px] rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-extrabold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-50 cursor-pointer"
                    >
                      {loadingAmount === amount ? "Pridávam..." : `+${amount} €`}
                    </button>
                                    ))}
                </div>
              </div>

              {/* Category Filter Bar */}
              <div className="border-b border-slate-100 bg-slate-50/40 px-5 py-3.5 sm:px-6">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {filterButtons.map((btn) => {
                    const active = selectedFilter === btn.id;
                    const count = counts[btn.id];
                    return (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => setSelectedFilter(btn.id)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition duration-150 cursor-pointer ${
                          active
                            ? "bg-slate-900 text-white shadow-xs"
                            : "border border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <span>{btn.label}</span>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${
                            active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Transactions List */}
              {filteredTransactions.length ? (
                <div className="divide-y divide-slate-100">
                  {filteredTransactions.map((transaction) => {
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
                <div className="p-8 text-center">
                  <p className="text-sm font-medium text-slate-500">
                    {selectedFilter === "all"
                      ? "Zatiaľ nemáš žiadne pohyby kreditu."
                      : `V kategórii „${filterButtons.find((b) => b.id === selectedFilter)?.label}“ nemáš žiadne transakcie.`}
                  </p>
                  {selectedFilter !== "all" && (
                    <button
                      type="button"
                      onClick={() => setSelectedFilter("all")}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
                    >
                      Zobraziť všetky transakcie
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
