"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  CreditCard,
  History,
  Loader2,
  Mail,
  Phone,
  Receipt,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import TennisBallAvatar from "@/components/icons/TennisBallAvatar";
import {
  fetchAdminUsersDirectoryAction,
  fetchAdminUserDetailAction,
  type AdminUserDirectoryItem,
  type AdminUserDetailData,
} from "@/app/actions/adminUsers";
import type { BookingRole } from "@/lib/auth/bookingAuth";

const formatEur = (value: number) =>
  new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR" }).format(value);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(value)
  );

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("sk-SK", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const formatTimeRange = (start: string, end: string) => {
  const s = new Intl.DateTimeFormat("sk-SK", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(start)
  );
  const e = new Intl.DateTimeFormat("sk-SK", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(end)
  );
  return `${s} – ${e}`;
};

const courtLabel = (courtId: string) => {
  return courtId
    .replace("tennis-clay-", "Antuka ")
    .replace("badminton-", "Bedminton ")
    .replace("tennis-", "Tenis ")
    .replace("squash-", "Squash ");
};

const roleLabels: Record<BookingRole, { label: string; badge: string }> = {
  admin: {
    label: "Administrátor",
    badge: "bg-slate-900 text-white border-slate-800",
  },
  trainer: {
    label: "Tréner",
    badge: "bg-[#8648E8] text-white border-[#6025B8] font-bold",
  },
  user: {
    label: "Používateľ",
    badge: "bg-[#ECE81A] text-slate-950 border-[#C5BC00] font-bold",
  },
};

const txLabels: Record<string, string> = {
  payment: "Dobitie kreditu (CardPay / Stripe)",
  booking_charge: "Platba za rezerváciu",
  refund: "Vrátenie kreditu",
  manual_adjustment: "Manuálna úprava kreditu",
  bonus: "Kreditový bonus",
};

export default function AdminUsersDirectory() {
  const [users, setUsers] = useState<AdminUserDirectoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | BookingRole>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User Detail modal state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<AdminUserDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"bookings" | "wallet">("bookings");
  const [modalBookingsPage, setModalBookingsPage] = useState(1);
  const [modalWalletPage, setModalWalletPage] = useState(1);
  const MODAL_PAGE_SIZE = 10;

  const [isPending, startTransition] = useTransition();

  const loadUsers = useCallback(
    async (targetPage: number, targetQuery: string, targetRole: "all" | BookingRole) => {
      setLoading(true);
      setError(null);
      const res = await fetchAdminUsersDirectoryAction(targetPage, targetQuery, targetRole);
      if (res.success) {
        setUsers(res.users);
        setPage(res.page);
        setTotalPages(res.totalPages);
        setTotalCount(res.totalCount);
      } else {
        setError(res.error || "Chyba načítania používateľov");
      }
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        loadUsers(page, query, roleFilter);
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [page, query, roleFilter, loadUsers]);

  const openDetail = async (userId: string) => {
    setSelectedUserId(userId);
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);
    setActiveTab("bookings");
    setModalBookingsPage(1);
    setModalWalletPage(1);

    const res = await fetchAdminUserDetailAction(userId);
    if (res.success) {
      setDetailData(res.detail);
    } else {
      setDetailError(res.error || "Nepodarilo sa načítať detail.");
    }
    setDetailLoading(false);
  };

  const closeDetail = () => {
    setSelectedUserId(null);
    setDetailData(null);
  };

  return (
    <div className="space-y-6">
      {/* Top search & Filter bar */}
      <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Hľadať podľa mena, emailu, tel. alebo karty..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-10 text-sm font-medium text-slate-900 transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-emerald-500/10"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Role Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: "all", label: "Všetci" },
                { id: "user", label: "Používatelia" },
                { id: "trainer", label: "Tréneri" },
                { id: "admin", label: "Administrátori" },
              ] as const
            ).map((filter) => {
              const active = roleFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => {
                    setRoleFilter(filter.id);
                    setPage(1);
                  }}
                  className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? "bg-slate-950 text-white shadow-xs"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Count summary */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
          <span>
            Nájdených <strong>{totalCount}</strong> používateľov
          </span>
          {loading && (
            <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Načítavam...
            </span>
          )}
        </div>
      </section>

      {/* Error state */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Desktop Table View */}
      <section className="hidden md:block overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold tracking-wider text-slate-500 uppercase">
            <tr>
              <th className="px-6 py-4">Používateľ</th>
              <th className="px-6 py-4">Kontakt</th>
              <th className="px-6 py-4">Číslo karty</th>
              <th className="px-6 py-4">Rola</th>
              <th className="px-6 py-4">Kredit</th>
              <th className="px-6 py-4">Rezervácie</th>
              <th className="px-6 py-4 text-right">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr
                key={user.id}
                onClick={() => openDetail(user.id)}
                className="group cursor-pointer transition hover:bg-slate-50/80"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <TennisBallAvatar name={user.name} className="h-10 w-10 rounded-2xl shadow-xs" textSize="text-xs" />
                    </div>
                    <div>
                      <strong className="block font-bold text-slate-900 group-hover:text-emerald-700 transition">
                        {user.name}
                      </strong>
                      <span className="text-xs text-slate-400">
                        Reg. {formatDate(user.createdAt)}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-0.5 text-xs">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <Mail className="h-3.5 w-3.5 text-slate-400" /> {user.email}
                    </span>
                    {user.phone && (
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Phone className="h-3.5 w-3.5 text-slate-400" /> {user.phone}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-mono font-bold text-slate-700">
                    <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                    {user.cardNumber || "—"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold shadow-2xs ${
                      roleLabels[user.role]?.badge || "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {roleLabels[user.role]?.label || user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <strong
                    className={`text-sm font-bold ${
                      user.walletBalanceEur > 0 ? "text-emerald-600" : "text-slate-600"
                    }`}
                  >
                    {formatEur(user.walletBalanceEur)}
                  </strong>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                    {user.bookingsCount}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    type="button"
                    className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition group-hover:border-emerald-400 group-hover:bg-emerald-50 group-hover:text-emerald-700"
                  >
                    Otvoriť históriu →
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  Nenašli sa žiadni používatelia pre zadané kritériá.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Mobile Card List View */}
      <section className="md:hidden space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            onClick={() => openDetail(user.id)}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <TennisBallAvatar name={user.name} className="h-10 w-10 rounded-2xl shadow-xs" textSize="text-xs" />
                <div>
                  <strong className="block text-sm font-bold text-slate-900">{user.name}</strong>
                  <span className="text-xs text-slate-400">{user.email}</span>
                </div>
              </div>
              <span
                className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold shadow-2xs ${
                  roleLabels[user.role]?.badge || "bg-slate-100 text-slate-800"
                }`}
              >
                {roleLabels[user.role]?.label || user.role}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs">
              <div>
                <span className="block text-[10px] text-slate-400">Karta</span>
                <span className="font-mono font-bold text-slate-700">
                  {user.cardNumber || "—"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">Zostatok</span>
                <span
                  className={`font-bold ${
                    user.walletBalanceEur > 0 ? "text-emerald-600" : "text-slate-700"
                  }`}
                >
                  {formatEur(user.walletBalanceEur)}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] text-slate-400">Rezervácie</span>
                <span className="font-bold text-slate-700">{user.bookingsCount}</span>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-xs">
          <span className="text-xs text-slate-500">
            Strana <strong>{page}</strong> z <strong>{totalPages}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" /> Predchádzajúca
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 hover:bg-slate-50"
            >
              Nasledujúca <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUserId && (
        <div
          className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
            onClick={closeDetail}
          />
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-emerald-50/40 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <TennisBallAvatar
                    name={detailData?.user.name || "NTC"}
                    className="h-14 w-14 rounded-2xl shadow-md"
                    textSize="text-sm"
                  />
                  <div>
                    <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">
                      {detailData?.user.name || "Načítavam..."}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1 text-slate-700">
                        <Mail className="h-3.5 w-3.5 text-slate-400" /> {detailData?.user.email}
                      </span>
                      {detailData?.user.phone && (
                        <span className="flex items-center gap-1 text-slate-700">
                          <Phone className="h-3.5 w-3.5 text-slate-400" /> {detailData?.user.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 shadow-2xs hover:bg-slate-50 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* User meta badges */}
              {detailData && (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                  <span
                    className={`rounded-lg border px-2.5 py-1 font-bold shadow-2xs ${
                      roleLabels[detailData.user.role]?.badge || "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {roleLabels[detailData.user.role]?.label || detailData.user.role}
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono font-bold text-slate-700">
                    Karta: {detailData.user.cardNumber || "—"}
                  </span>
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700 border border-emerald-200">
                    Kredit: {formatEur(detailData.user.walletBalanceEur)}
                  </span>
                  <span className="text-slate-400">
                    Registrovaný: {formatDate(detailData.user.createdAt)}
                  </span>
                </div>
              )}
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 bg-slate-50/50 px-6">
              <button
                type="button"
                onClick={() => setActiveTab("bookings")}
                className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition ${
                  activeTab === "bookings"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <CalendarDays className="h-4 w-4" />
                Rezervácie ({detailData?.bookings.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("wallet")}
                className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition ${
                  activeTab === "wallet"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Coins className="h-4 w-4" />
                Pohyby kreditu ({detailData?.transactions.length || 0})
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {detailLoading && (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  <span className="ml-2 text-sm">Načítavam kompletnú históriu...</span>
                </div>
              )}

              {detailError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {detailError}
                </div>
              )}

              {/* Bookings Tab */}
              {!detailLoading && detailData && activeTab === "bookings" && (
                <div className="space-y-3">
                  {detailData.bookings
                    .slice(
                      (modalBookingsPage - 1) * MODAL_PAGE_SIZE,
                      modalBookingsPage * MODAL_PAGE_SIZE
                    )
                    .map((booking) => {
                      const isCancelled = booking.status === "cancelled";
                      return (
                        <div
                          key={booking.id}
                          className={`rounded-2xl border p-4 transition ${
                            isCancelled
                              ? "border-slate-200 bg-slate-50/50 opacity-60"
                              : "border-slate-200 bg-white shadow-2xs hover:border-emerald-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <strong className="text-sm font-bold text-slate-900">
                                  {courtLabel(booking.courtId)}
                                </strong>
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                    isCancelled
                                      ? "bg-red-50 text-red-700 border border-red-200"
                                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  }`}
                                >
                                  {isCancelled ? "Zrušená" : "Potvrdená"}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatDate(booking.startAt)}, {formatTimeRange(booking.startAt, booking.endAt)}
                              </p>
                            </div>
                            <div className="text-right">
                              <strong className="block text-sm font-bold text-slate-900">
                                {formatEur(booking.priceEur)}
                              </strong>
                              <span className="text-[10px] text-slate-400">
                                Vytvorené {formatDateTime(booking.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {detailData.bookings.length > MODAL_PAGE_SIZE && (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <span>
                        Strana <strong>{modalBookingsPage}</strong> z{" "}
                        <strong>
                          {Math.max(1, Math.ceil(detailData.bookings.length / MODAL_PAGE_SIZE))}
                        </strong>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={modalBookingsPage <= 1}
                          onClick={() => setModalBookingsPage((p) => Math.max(1, p - 1))}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 hover:bg-slate-50"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" /> Predchádzajúca
                        </button>
                        <button
                          type="button"
                          disabled={
                            modalBookingsPage >=
                            Math.ceil(detailData.bookings.length / MODAL_PAGE_SIZE)
                          }
                          onClick={() => setModalBookingsPage((p) => p + 1)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 hover:bg-slate-50"
                        >
                          Nasledujúca <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {detailData.bookings.length === 0 && (
                    <div className="py-12 text-center text-sm text-slate-400">
                      Tento používateľ zatiaľ nemá žiadne rezervácie.
                    </div>
                  )}
                </div>
              )}

              {/* Wallet Transactions Tab */}
              {!detailLoading && detailData && activeTab === "wallet" && (
                <div className="space-y-3">
                  {detailData.transactions
                    .slice(
                      (modalWalletPage - 1) * MODAL_PAGE_SIZE,
                      modalWalletPage * MODAL_PAGE_SIZE
                    )
                    .map((tx) => {
                      const isPositive =
                        tx.type === "payment" || tx.type === "refund" || tx.type === "bonus" || tx.amountEur > 0;
                      return (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`grid h-9 w-9 place-items-center rounded-xl ${
                                isPositive
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              {isPositive ? (
                                <ArrowDownLeft className="h-4 w-4" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4" />
                              )}
                            </span>
                            <div>
                              <b className="block text-xs font-bold text-slate-900">
                                {txLabels[tx.type] || tx.type}
                              </b>
                              <span className="text-[11px] text-slate-400">
                                {formatDateTime(tx.createdAt)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <strong
                              className={`text-sm font-bold ${
                                isPositive ? "text-emerald-600" : "text-slate-900"
                              }`}
                            >
                              {isPositive ? "+" : ""}
                              {formatEur(tx.amountEur)}
                            </strong>
                          </div>
                        </div>
                      );
                    })}

                  {detailData.transactions.length > MODAL_PAGE_SIZE && (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <span>
                        Strana <strong>{modalWalletPage}</strong> z{" "}
                        <strong>
                          {Math.max(1, Math.ceil(detailData.transactions.length / MODAL_PAGE_SIZE))}
                        </strong>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={modalWalletPage <= 1}
                          onClick={() => setModalWalletPage((p) => Math.max(1, p - 1))}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 hover:bg-slate-50"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" /> Predchádzajúca
                        </button>
                        <button
                          type="button"
                          disabled={
                            modalWalletPage >=
                            Math.ceil(detailData.transactions.length / MODAL_PAGE_SIZE)
                          }
                          onClick={() => setModalWalletPage((p) => p + 1)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 hover:bg-slate-50"
                        >
                          Nasledujúca <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {detailData.transactions.length === 0 && (
                    <div className="py-12 text-center text-sm text-slate-400">
                      Zatiaľ žiadne pohyby kreditu.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 bg-slate-50/80 px-6 py-3 text-right">
              <button
                type="button"
                onClick={closeDetail}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100"
              >
                Zavrieť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
