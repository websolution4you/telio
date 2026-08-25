"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  Copy,
  CreditCard,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Tag,
  User,
  X,
} from "lucide-react";
import TennisBallAvatar from "@/components/icons/TennisBallAvatar";
import {
  fetchAdminTransactionsAction,
  type AdminTransactionItem,
} from "@/app/actions/adminTransactions";

const formatEur = (val: number) =>
  new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR" }).format(val);

const formatDateTime = (iso: string) => {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("sk-SK", {
      timeZone: "Europe/Bratislava",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso;
  }
};

const formatTimeOnly = (iso: string) => {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("sk-SK", {
      timeZone: "Europe/Bratislava",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso;
  }
};

type CategoryKey = "all" | "charges" | "refunds" | "cardpay" | "stripe" | "test";

const categoryPills: { key: CategoryKey; label: string; countKey: keyof { all: number; charges: number; refunds: number; cardpay: number; stripe: number; test: number } }[] = [
  { key: "all", label: "Všetky", countKey: "all" },
  { key: "charges", label: "Platby za rezerváciu", countKey: "charges" },
  { key: "refunds", label: "Vrátenie kreditu", countKey: "refunds" },
  { key: "cardpay", label: "Dobitie CardPay", countKey: "cardpay" },
  { key: "stripe", label: "Dobitie Stripe", countKey: "stripe" },
  { key: "test", label: "Testovacie dobitia", countKey: "test" },
];

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<AdminTransactionItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryKey>("all");
  const [categoryCounts, setCategoryCounts] = useState({
    all: 0,
    charges: 0,
    refunds: 0,
    cardpay: 0,
    stripe: 0,
    test: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const loadData = async (targetPage: number, targetQuery: string, targetCategory: CategoryKey) => {
    setLoading(true);
    setError("");
    const res = await fetchAdminTransactionsAction(targetPage, targetQuery, targetCategory);
    if (res.success) {
      setTransactions(res.transactions);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
      setPage(res.page);
      setCategoryCounts(res.categoryCounts);
    } else {
      setError(res.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData(page, query, category);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [page, query, category]);

  return (
    <div className="space-y-6">
      {/* Controls Card: Search & Filters */}
      <div className="rounded-3xl border-2 border-slate-200/90 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.06)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search bar */}
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Hľadať podľa mena klienta, emailu, karty, ID platby, rezervácie..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-10 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setPage(1);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Refresh button & Result info */}
          <div className="flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-slate-600">
            <span className="rounded-xl bg-slate-100 px-3 py-2 font-medium text-slate-700">
              Nájdených: <strong className="font-bold text-slate-900">{totalCount}</strong> transakcií
            </span>
            <button
              type="button"
              onClick={() => loadData(page, query, category)}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Obnoviť
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          {categoryPills.map((pill) => {
            const count = categoryCounts[pill.countKey] || 0;
            const active = category === pill.key;
            return (
              <button
                key={pill.key}
                type="button"
                onClick={() => {
                  setCategory(pill.key);
                  setPage(1);
                }}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-xs ${
                  active
                    ? "bg-slate-950 text-white shadow-md"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span>{pill.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 shadow-xs">
          {error}
        </div>
      )}

      {/* Transactions Table Card */}
      <div className="overflow-hidden rounded-3xl border-2 border-slate-200/90 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-700">
            <thead>
              <tr className="border-b-2 border-slate-200 bg-slate-50 text-xs font-extrabold tracking-wider text-slate-600">
                <th className="px-5 py-4">DÁTUM A ČAS</th>
                <th className="px-5 py-4">KLIENT</th>
                <th className="px-5 py-4">ČLENSKÁ KARTA</th>
                <th className="px-5 py-4">TYP TRANSAKCIE</th>
                <th className="px-5 py-4">IDENTIFIKÁTORY / DETAIL</th>
                <th className="px-5 py-4 text-right">SUMA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading && transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-slate-500">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-emerald-600" />
                    Načítavam transakcie...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-slate-500">
                    Nenašli sa žiadne transakcie zodpovedajúce filtrom.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isPositive = tx.amountEur > 0;
                  const isCharge = tx.type === "booking_charge";
                  const isRefund = tx.type === "refund";

                  return (
                    <tr key={tx.id} className="transition hover:bg-slate-50/80">
                      {/* Dátum a čas */}
                      <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{formatDateTime(tx.createdAt)}</span>
                        </div>
                      </td>

                      {/* Klient */}
                      <td className="px-5 py-4">
                        {tx.user ? (
                          <div className="flex items-center gap-3">
                            <TennisBallAvatar name={tx.user.name} className="h-8 w-8 shrink-0" textSize="text-[10px]" />
                            <div className="min-w-0">
                              <span className="block truncate font-bold text-slate-900">{tx.user.name}</span>
                              <span className="block truncate text-[11px] text-slate-500">{tx.user.email}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Neznámy používateľ</span>
                        )}
                      </td>

                      {/* Číslo členskej karty */}
                      <td className="whitespace-nowrap px-5 py-4">
                        {tx.user?.cardNumber ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/80 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-800 shadow-2xs">
                            <CreditCard className="h-3 w-3 text-emerald-600" />
                            {tx.user.cardNumber}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">–</span>
                        )}
                      </td>

                      {/* Typ transakcie */}
                      <td className="px-5 py-4">
                        {isCharge ? (
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/80 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-1 text-xs font-bold text-amber-900 shadow-2xs">
                            <ArrowDownLeft className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            Platba za rezerváciu
                          </span>
                        ) : isRefund ? (
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300/80 bg-gradient-to-r from-sky-50 to-indigo-50 px-3 py-1 text-xs font-bold text-sky-900 shadow-2xs">
                            <ArrowUpRight className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                            Vrátenie za rezerváciu
                          </span>
                        ) : tx.category === "cardpay" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/80 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900 shadow-2xs">
                            <Coins className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            Dobitie CardPay (TB)
                          </span>
                        ) : tx.category === "stripe" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-300/80 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-900 shadow-2xs">
                            <CreditCard className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                            Dobitie Stripe
                          </span>
                        ) : tx.category === "test_topup" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-purple-300/80 bg-purple-50 px-3 py-1 text-xs font-bold text-purple-900 shadow-2xs">
                            <Tag className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                            Testovacie dobitie
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">
                            {tx.categoryLabel}
                          </span>
                        )}
                      </td>

                      {/* Identifikátory / Detail */}
                      <td className="px-5 py-4 text-xs">
                        <div className="space-y-1">
                          {/* Booking info if attached */}
                          {tx.bookingDetails && (
                            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-700 uppercase">
                                {tx.bookingDetails.courtName}
                              </span>
                              {tx.bookingDetails.startAt && (
                                <span className="text-slate-600">
                                  {formatDateTime(tx.bookingDetails.startAt)}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Bank / Provider Payment ID */}
                          {tx.providerPaymentId && (
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <span className="rounded bg-sky-100/90 px-1.5 py-0.5 text-[9px] font-black uppercase text-sky-800">
                                {tx.provider === "tatrabanka" ? "TB Platba" : tx.provider === "stripe" ? "Stripe" : "Banka Ref"}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(tx.providerPaymentId!, `prov-${tx.id}`)}
                                className="group flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-800 hover:bg-sky-50 hover:text-sky-900 transition"
                                title={`Skopírovať ${tx.providerPaymentId}`}
                              >
                                <span className="font-bold">{tx.providerPaymentId.length > 18 ? `${tx.providerPaymentId.slice(0, 8)}...${tx.providerPaymentId.slice(-6)}` : tx.providerPaymentId}</span>
                                {copiedId === `prov-${tx.id}` ? (
                                  <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                                ) : (
                                  <Copy className="h-3 w-3 text-slate-400 opacity-60 group-hover:opacity-100 shrink-0" />
                                )}
                              </button>
                            </div>
                          )}

                          {/* Payment ID (public.payments) */}
                          {tx.paymentId && (
                            <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
                              <span className="text-slate-400 font-sans">Payment ID:</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(tx.paymentId!, `pay-${tx.id}`)}
                                className="group flex items-center gap-1 rounded px-1 text-slate-600 hover:bg-slate-200 transition"
                                title={`Skopírovať Payment ID: ${tx.paymentId}`}
                              >
                                <span>{tx.paymentId.slice(0, 13)}...</span>
                                {copiedId === `pay-${tx.id}` ? (
                                  <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                                ) : (
                                  <Copy className="h-2.5 w-2.5 text-slate-400 opacity-60 group-hover:opacity-100 shrink-0" />
                                )}
                              </button>
                            </div>
                          )}

                          {/* Transaction ID */}
                          <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                            <span>Tx: {tx.id.slice(0, 8)}...</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(tx.id, `tx-${tx.id}`)}
                              className="rounded p-0.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
                              title="Skopírovať Transaction ID"
                            >
                              {copiedId === `tx-${tx.id}` ? (
                                <Check className="h-2.5 w-2.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-2.5 w-2.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Suma */}
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <span
                          className={`inline-block text-sm font-black ${
                            isPositive
                              ? "text-emerald-600"
                              : "text-amber-700"
                          }`}
                        >
                          {isPositive ? "+" : ""}
                          {formatEur(tx.amountEur)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar (20 per page) */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/80 px-5 py-4 sm:flex-row">
          <span className="text-xs font-semibold text-slate-600">
            Strana <strong className="font-bold text-slate-900">{page}</strong> z{" "}
            <strong className="font-bold text-slate-900">{totalPages}</strong> (20 na stranu)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Predchádzajúca
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && page > 3) {
                  pageNum = Math.min(totalPages - 4 + i, page - 2 + i);
                }
                const isCurrent = pageNum === page;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    disabled={loading}
                    onClick={() => setPage(pageNum)}
                    className={`h-8 w-8 rounded-lg text-xs font-bold transition ${
                      isCurrent
                        ? "bg-slate-950 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Ďalšia
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
