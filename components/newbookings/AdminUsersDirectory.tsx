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
  Plus,
  Receipt,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import TennisBallAvatar from "@/components/icons/TennisBallAvatar";
import {
  fetchAdminUsersDirectoryAction,
  fetchAdminUserDetailAction,
  createBookingUserByAdminAction,
  updateBookingUserCardAction,
  updateBookingUserProfileByAdminAction,
  type AdminUserDirectoryItem,
  type AdminUserDetailData,
  type CreateAdminUserInput,
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

  // New User creation modal state
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "user" as BookingRole,
    cardNumber: "",
    hasMultisport: false,
    initialCreditEur: 0,
    password: "ntc" + Math.floor(1000 + Math.random() * 9000),
  });

  // Card assignment state in detail modal
  const [cardEditMode, setCardEditMode] = useState(false);
  const [cardEditValue, setCardEditValue] = useState("");
  const [cardActionLoading, setCardActionLoading] = useState(false);
  const [cardActionError, setCardActionError] = useState<string | null>(null);

  // Profile edit modal state
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editProfileLoading, setEditProfileLoading] = useState(false);
  const [editProfileError, setEditProfileError] = useState<string | null>(null);
  const [editProfileForm, setEditProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "user" as BookingRole,
    hasMultisport: false,
  });

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
    setCardEditMode(false);
    setCardEditValue("");
    setCardActionError(null);

    const res = await fetchAdminUserDetailAction(userId);
    if (res.success) {
      setDetailData(res.detail);
      setEditProfileForm({
        name: res.detail.user.name,
        email: res.detail.user.email,
        phone: res.detail.user.phone || "",
        role: res.detail.user.role,
        hasMultisport: res.detail.user.hasMultisport,
      });
    } else {
      setDetailError(res.error || "Nepodarilo sa načítať detail.");
    }
    setDetailLoading(false);
  };

  const closeDetail = () => {
    setSelectedUserId(null);
    setDetailData(null);
    setCardEditMode(false);
    setEditProfileOpen(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserLoading(true);
    setCreateUserError(null);

    const res = await createBookingUserByAdminAction({
      name: createForm.name,
      email: createForm.email,
      phone: createForm.phone || undefined,
      role: createForm.role,
      cardNumber: createForm.cardNumber || undefined,
      hasMultisport: createForm.hasMultisport,
      initialCreditEur: Number(createForm.initialCreditEur || 0),
      password: createForm.password || undefined,
    });

    if (res.success) {
      setCreateUserOpen(false);
      setCreateForm({
        name: "",
        email: "",
        phone: "",
        role: "user",
        cardNumber: "",
        hasMultisport: false,
        initialCreditEur: 0,
        password: "ntc" + Math.floor(1000 + Math.random() * 9000),
      });
      loadUsers(1, "", "all");
      if (res.user?.id) {
        openDetail(res.user.id);
      }
    } else {
      setCreateUserError(res.error || "Používateľa sa nepodarilo vytvoriť.");
    }
    setCreateUserLoading(false);
  };

  const handleSaveCard = async () => {
    if (!detailData) return;
    setCardActionLoading(true);
    setCardActionError(null);

    const res = await updateBookingUserCardAction(detailData.user.id, cardEditValue);
    if (res.success) {
      setDetailData({
        ...detailData,
        user: { ...detailData.user, cardNumber: res.cardNumber || null },
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === detailData.user.id ? { ...u, cardNumber: res.cardNumber || null } : u
        )
      );
      setCardEditMode(false);
      setCardEditValue("");
    } else {
      setCardActionError(res.error || "Kartu sa nepodarilo uložiť.");
    }
    setCardActionLoading(false);
  };

  const handleRemoveCard = async () => {
    if (!detailData) return;
    if (!window.confirm("Naozaj chcete odobrať klubovú kartu tomuto používateľovi? Stratí nárok na klubové zľavy.")) {
      return;
    }

    setCardActionLoading(true);
    setCardActionError(null);

    const res = await updateBookingUserCardAction(detailData.user.id, null);
    if (res.success) {
      setDetailData({
        ...detailData,
        user: { ...detailData.user, cardNumber: null },
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === detailData.user.id ? { ...u, cardNumber: null } : u))
      );
    } else {
      setCardActionError(res.error || "Kartu sa nepodarilo odobrať.");
    }
    setCardActionLoading(false);
  };

  const handleToggleMultisport = async () => {
    if (!detailData) return;
    const targetState = !detailData.user.hasMultisport;
    setCardActionLoading(true);
    setCardActionError(null);

    const res = await updateBookingUserProfileByAdminAction(detailData.user.id, {
      name: detailData.user.name,
      email: detailData.user.email,
      phone: detailData.user.phone,
      role: detailData.user.role,
      cardNumber: detailData.user.cardNumber,
      hasMultisport: targetState,
    });

    if (res.success) {
      setDetailData({
        ...detailData,
        user: { ...detailData.user, hasMultisport: targetState },
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === detailData.user.id ? { ...u, hasMultisport: targetState } : u
        )
      );
      setEditProfileForm((prev) => ({ ...prev, hasMultisport: targetState }));
    } else {
      setCardActionError(res.error || "Nepodarilo sa aktualizovať MultiSport status.");
    }
    setCardActionLoading(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailData) return;

    setEditProfileLoading(true);
    setEditProfileError(null);

    const res = await updateBookingUserProfileByAdminAction(detailData.user.id, {
      name: editProfileForm.name,
      email: editProfileForm.email,
      phone: editProfileForm.phone || null,
      role: editProfileForm.role,
      cardNumber: detailData.user.cardNumber,
      hasMultisport: editProfileForm.hasMultisport,
    });

    if (res.success) {
      setDetailData({
        ...detailData,
        user: {
          ...detailData.user,
          name: editProfileForm.name,
          email: editProfileForm.email,
          phone: editProfileForm.phone || null,
          role: editProfileForm.role,
          hasMultisport: editProfileForm.hasMultisport,
        },
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === detailData.user.id
            ? {
                ...u,
                name: editProfileForm.name,
                email: editProfileForm.email,
                phone: editProfileForm.phone || null,
                role: editProfileForm.role,
                hasMultisport: editProfileForm.hasMultisport,
              }
            : u
        )
      );
      setEditProfileOpen(false);
    } else {
      setEditProfileError(res.error || "Profil sa nepodarilo uložiť.");
    }
    setEditProfileLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Top search, Actions & Filter bar */}
      <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
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

            {/* "+ Nový používateľ" Button */}
            <button
              type="button"
              onClick={() => {
                setCreateUserError(null);
                setCreateUserOpen(true);
              }}
              className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 cursor-pointer shrink-0 active:scale-[0.98]"
            >
              <UserPlus className="h-4 w-4" />
              <span>Nový používateľ</span>
            </button>
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
                  <div className="flex flex-col gap-1 items-start">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-mono font-bold text-slate-700">
                      <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                      {user.cardNumber || "—"}
                    </span>
                    {user.hasMultisport && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300 shadow-2xs">
                        MultiSport
                      </span>
                    )}
                  </div>
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
              <div className="flex items-center gap-1">
                {user.hasMultisport && (
                  <span className="rounded-lg bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                    MS
                  </span>
                )}
                <span
                  className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold shadow-2xs ${
                    roleLabels[user.role]?.badge || "bg-slate-100 text-slate-800"
                  }`}
                >
                  {roleLabels[user.role]?.label || user.role}
                </span>
              </div>
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditProfileError(null);
                      setEditProfileOpen(true);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                  >
                    <span>Upraviť profil</span>
                  </button>
                  <button
                    type="button"
                    onClick={closeDetail}
                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 shadow-2xs hover:bg-slate-50 hover:text-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* User meta badges & controls */}
              {detailData && (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2.5 text-xs">
                    <span
                      className={`rounded-lg border px-2.5 py-1 font-bold shadow-2xs ${
                        roleLabels[detailData.user.role]?.badge || "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {roleLabels[detailData.user.role]?.label || detailData.user.role}
                    </span>
                    <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700 border border-emerald-200">
                      Kredit: {formatEur(detailData.user.walletBalanceEur)}
                    </span>
                    <span className="text-slate-400 text-xs">
                      Registrovaný: {formatDate(detailData.user.createdAt)}
                    </span>
                  </div>

                  {/* Card & MultiSport Control Bar */}
                  <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-slate-200/70 text-xs">
                    {/* NTC Card management */}
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
                      <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="font-semibold text-slate-600">Klubová karta:</span>
                      {detailData.user.cardNumber ? (
                        <>
                          <span className="font-mono font-bold text-slate-900">{detailData.user.cardNumber}</span>
                          {!cardEditMode && (
                            <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setCardEditValue(detailData.user.cardNumber || "");
                                  setCardEditMode(true);
                                }}
                                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                              >
                                Zmeniť PIN
                              </button>
                              <span className="text-slate-300">•</span>
                              <button
                                type="button"
                                disabled={cardActionLoading}
                                onClick={handleRemoveCard}
                                className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer disabled:opacity-50"
                              >
                                Odobrať
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="text-slate-400 italic">Nepriradená</span>
                          {!cardEditMode && (
                            <button
                              type="button"
                              onClick={() => {
                                setCardEditValue("");
                                setCardEditMode(true);
                              }}
                              className="ml-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                            >
                              + Priradiť kartu
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {/* Inline Card PIN Edit Form */}
                    {cardEditMode && (
                      <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                        <input
                          type="text"
                          value={cardEditValue}
                          onChange={(e) => setCardEditValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          placeholder="4-miestny PIN"
                          maxLength={4}
                          className="w-28 font-mono text-center text-xs font-bold rounded-xl border border-emerald-400 bg-white px-2 py-1 outline-none ring-2 ring-emerald-100"
                        />
                        <button
                          type="button"
                          disabled={cardActionLoading || cardEditValue.length < 1}
                          onClick={handleSaveCard}
                          className="rounded-xl bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                          Uložiť
                        </button>
                        <button
                          type="button"
                          onClick={() => setCardEditMode(false)}
                          className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 cursor-pointer"
                        >
                          Zrušiť
                        </button>
                      </div>
                    )}

                    {/* MultiSport toggle */}
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
                      <span className="font-semibold text-slate-600">MultiSport:</span>
                      <span
                        className={`font-bold ${
                          detailData.user.hasMultisport ? "text-emerald-700" : "text-slate-400"
                        }`}
                      >
                        {detailData.user.hasMultisport ? "Evidovaná (-50 %)" : "Neaktívna"}
                      </span>
                      <button
                        type="button"
                        disabled={cardActionLoading}
                        onClick={handleToggleMultisport}
                        className={`cursor-pointer rounded-lg px-2 py-0.5 text-[11px] font-bold transition ${
                          detailData.user.hasMultisport
                            ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                            : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {detailData.user.hasMultisport ? "Vypnúť" : "Aktivovať"}
                      </button>
                    </div>

                    {cardActionError && (
                      <span className="text-xs font-semibold text-red-600">{cardActionError}</span>
                    )}
                  </div>
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

      {/* Create User Modal */}
      {createUserOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-6" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity" onClick={() => setCreateUserOpen(false)} />
          <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
              <div>
                <h3 className="text-lg font-bold text-slate-950">Vytvoriť nového používateľa</h3>
                <p className="text-xs text-slate-500 mt-0.5">Rýchle založenie klienta na recepcii s kartou a kreditom.</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateUserOpen(false)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 shadow-2xs hover:bg-slate-50 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {createUserError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                  {createUserError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Celé meno *</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Ján Novák"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="klient@email.sk"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Telefón</label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+421 900 123 456"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rola</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as BookingRole })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="user">Používateľ (Klient)</option>
                    <option value="trainer">Tréner</option>
                    <option value="admin">Administrátor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Klubová karta (PIN)</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={createForm.cardNumber}
                    onChange={(e) => setCreateForm({ ...createForm, cardNumber: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                    placeholder="napr. 1234 (voliteľné)"
                    className="w-full font-mono text-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>

              {/* MultiSport toggle */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.hasMultisport}
                    onChange={(e) => setCreateForm({ ...createForm, hasMultisport: e.target.checked })}
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900">Držiteľ MultiSport karty</span>
                    <p className="text-[11px] text-slate-500">Umožní uplatniť 50 % zľavu na rezervácie kurtov.</p>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Počiatočný kredit (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={createForm.initialCreditEur}
                    onChange={(e) => setCreateForm({ ...createForm, initialCreditEur: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Počiatočné heslo</label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-mono text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateUserOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  disabled={createUserLoading}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {createUserLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  <span>{createUserLoading ? "Vytváram..." : "Vytvoriť používateľa"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editProfileOpen && detailData && (
        <div className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-6" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity" onClick={() => setEditProfileOpen(false)} />
          <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div>
                <h3 className="text-base font-bold text-slate-950">Upraviť profil používateľa</h3>
                <p className="text-xs text-slate-500">Úprava kontaktných údajov a oprávnení.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditProfileOpen(false)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 shadow-2xs hover:bg-slate-50 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-5 space-y-3.5">
              {editProfileError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                  {editProfileError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Meno</label>
                <input
                  type="text"
                  required
                  value={editProfileForm.name}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={editProfileForm.email}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Telefón</label>
                <input
                  type="tel"
                  value={editProfileForm.phone}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
                  placeholder="+421 900 123 456"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rola</label>
                <select
                  value={editProfileForm.role}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, role: e.target.value as BookingRole })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="user">Používateľ (Klient)</option>
                  <option value="trainer">Tréner</option>
                  <option value="admin">Administrátor</option>
                </select>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editProfileForm.hasMultisport}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, hasMultisport: e.target.checked })}
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900">Držiteľ MultiSport karty</span>
                    <p className="text-[11px] text-slate-500">Umožňuje uplatnenie 50 % zľavy na rezervácie.</p>
                  </div>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditProfileOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  disabled={editProfileLoading}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {editProfileLoading ? "Ukladám..." : "Uložiť zmeny"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
