"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Check, CheckCircle2, ChevronLeft, ChevronRight, CreditCard, Loader2, Palette, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import {
  fetchAdminUsersAction,
  updateBookingUserRoleAction,
  updateBookingUserDiscountTierAction,
  updateRoleBookingPolicyAction,
  type RoleBookingPolicyInput,
} from "@/app/actions/adminUsers";
import { fetchPricelistsAction } from "@/app/actions/pricelists";
import { DEFAULT_DISCOUNT_TIERS, DiscountTier } from "@/lib/bookings/pricingTypes";
import type { BookingRole } from "@/lib/auth/bookingAuth";
import {
  type AdminReservationCategory,
  DEFAULT_ADMIN_CATEGORIES,
  calculateBorderColor,
} from "@/lib/bookings/categoryTypes";
import {
  fetchReservationCategoriesAction,
  saveReservationCategoryAction,
  deleteReservationCategoryAction,
} from "@/app/actions/reservationCategories";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  card_number: string | null;
  role: BookingRole;
  created_at: string;
  discountTierId?: string;
};

type RolePolicy = RoleBookingPolicyInput;

const roleLabels: Record<BookingRole, string> = {
  admin: "Administrátor",
  user: "Používateľ",
  trainer: "Tréner",
  ntc_team: "NTC Team",
};
const roles: BookingRole[] = ["admin", "user", "trainer", "ntc_team"];
const durationLimits = [30, 60, 90, 120, ...Array.from({ length: 22 }, (_, index) => (index + 3) * 60)];
const formatDate = (value: string) => new Intl.DateTimeFormat("sk-SK").format(new Date(value));

const COLOR_PRESETS = [
  { name: "Svetložltá", hex: "#FFFF33" },
  { name: "Svetločervená", hex: "#FFC9C9" },
  { name: "Ružová", hex: "#F4CDE4" },
  { name: "Svetlomodrá", hex: "#BAE6FD" },
  { name: "Mätová", hex: "#BBF7D0" },
  { name: "Broskyňová", hex: "#FED7AA" },
  { name: "Fialová", hex: "#DDD6FE" },
  { name: "Citrónová", hex: "#FEF08A" },
  { name: "Tyrkysová", hex: "#99F6E4" },
  { name: "Sivá", hex: "#E2E8F0" },
];

export default function AdminUsersAndRoles() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [policies, setPolicies] = useState<RolePolicy[]>([]);
  const [discountTiers, setDiscountTiers] = useState<DiscountTier[]>(DEFAULT_DISCOUNT_TIERS);
  const [currentUserId, setCurrentUserId] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pendingRoles, setPendingRoles] = useState<Record<string, BookingRole>>({});
  const [pendingTiers, setPendingTiers] = useState<Record<string, string>>({});
  const [savingUserId, setSavingUserId] = useState("");
  const [savingTierUserId, setSavingTierUserId] = useState("");
  const [savingRole, setSavingRole] = useState<BookingRole | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Reservation Categories state
  const [categories, setCategories] = useState<AdminReservationCategory[]>(DEFAULT_ADMIN_CATEGORIES);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [savingCatId, setSavingCatId] = useState<string | null>(null);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [catMessage, setCatMessage] = useState("");
  const [catError, setCatError] = useState("");

  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#BAE6FD");
  const [newCatHasPlayerField, setNewCatHasPlayerField] = useState(true);
  const [isCreatingCat, setIsCreatingCat] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchPricelistsAction().then((res) => {
      if (res.success && res.pricelists.length > 0) {
        const active = res.pricelists.find((p) => p.isActive) || res.pricelists[0];
        if (active.discountTiers && active.discountTiers.length > 0) {
          setDiscountTiers(active.discountTiers);
        }
      }
    });

    setCategoriesLoading(true);
    fetchReservationCategoriesAction().then((res) => {
      if (res.success && res.categories && res.categories.length > 0) {
        setCategories(res.categories);
      }
      setCategoriesLoading(false);
    });
  }, []);

  const executeSearch = useCallback((targetPage = 1, targetQuery = query) => {
    setLoading(true);
    fetchAdminUsersAction(targetPage, targetQuery).then((result) => {
      if (result.success) {
        setUsers(result.users as AdminUser[]);
        setPolicies(result.policies as RolePolicy[]);
        setCurrentUserId(result.currentUserId);
        setTotalUsers(result.totalUsers);
        setTotalPages(result.totalPages);
        setPendingRoles({});
        setPendingTiers({});
      } else {
        setError(result.error || "Chyba načítania používateľov");
      }
      setLoading(false);
    });
  }, [query]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetchAdminUsersAction(page, query).then((result) => {
        if (!active) return;
        if (result.success) {
          setUsers(result.users as AdminUser[]);
          setPolicies(result.policies as RolePolicy[]);
          setCurrentUserId(result.currentUserId);
          setTotalUsers(result.totalUsers);
          setTotalPages(result.totalPages);
          setPendingRoles({});
          setPendingTiers({});
        } else {
          setError(result.error || "Chyba načítania používateľov");
        }
        setLoading(false);
      });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [page, query]);

  const selectRole = (userId: string, role: BookingRole) => {
    const currentRole = users.find((user) => user.id === userId)?.role;
    setPendingRoles((current) => {
      const next = { ...current };
      if (!currentRole || currentRole === role) delete next[userId];
      else next[userId] = role;
      return next;
    });
  };

  const selectTier = (userId: string, tierId: string) => {
    const currentTier = users.find((user) => user.id === userId)?.discountTierId || "tier-base";
    setPendingTiers((current) => {
      const next = { ...current };
      if (currentTier === tierId) delete next[userId];
      else next[userId] = tierId;
      return next;
    });
  };

  const saveUserRole = async (user: AdminUser) => {
    const newRole = pendingRoles[user.id];
    if (!newRole || newRole === user.role) return;
    const confirmed = window.confirm(`Naozaj chcete zmeniť rolu používateľa ${user.name} z „${roleLabels[user.role]}“ na „${roleLabels[newRole]}“?`);
    if (!confirmed) return;

    setSavingUserId(user.id);
    setError("");
    setMessage("");
    const result = await updateBookingUserRoleAction(user.id, newRole);
    if (!result.success) setError(result.error);
    else {
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, role: newRole } : item));
      setPendingRoles((current) => {
        const next = { ...current };
        delete next[user.id];
        return next;
      });
      setMessage(`Rola používateľa ${user.name} bola zmenená na ${roleLabels[newRole]}.`);
    }
    setSavingUserId("");
  };

  const saveUserTier = async (user: AdminUser) => {
    const newTier = pendingTiers[user.id];
    if (!newTier || newTier === user.discountTierId) return;

    setSavingTierUserId(user.id);
    setError("");
    setMessage("");
    const result = await updateBookingUserDiscountTierAction(user.id, newTier);
    if (!result.success) setError(result.error);
    else {
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, discountTierId: newTier } : item));
      setPendingTiers((current) => {
        const next = { ...current };
        delete next[user.id];
        return next;
      });
      const tierName = discountTiers.find((t) => t.id === newTier)?.name || newTier;
      setMessage(`Zľavová hladina používateľa ${user.name} bola nastavená na „${tierName}“.`);
    }
    setSavingTierUserId("");
  };

  const changePolicy = (role: BookingRole, field: keyof Omit<RolePolicy, "role">, value: number | boolean) => {
    setPolicies((current) => current.map((policy) => policy.role === role ? { ...policy, [field]: value } : policy));
  };

  const savePolicy = async (policy: RolePolicy) => {
    setSavingRole(policy.role);
    setError("");
    setMessage("");
    const result = await updateRoleBookingPolicyAction(policy);
    if (!result.success) setError(result.error);
    else setMessage(`Privilégiá roly ${roleLabels[policy.role]} boli uložené.`);
    setSavingRole(null);
  };

  const updateCategoryColor = (catId: string, hex: string) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? {
              ...c,
              color: hex,
              border: calculateBorderColor(hex),
            }
          : c
      )
    );
  };

  const updateCategoryName = (catId: string, name: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, name } : c))
    );
  };

  const updateCategoryPlayerField = (catId: string, hasPlayerField: boolean) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, hasPlayerField } : c))
    );
  };

  const saveCategory = async (cat: AdminReservationCategory) => {
    setSavingCatId(cat.id);
    setCatError("");
    setCatMessage("");
    const res = await saveReservationCategoryAction({
      id: cat.id,
      name: cat.name,
      color: cat.color,
      border: cat.border,
      hasPlayerField: cat.hasPlayerField,
    });
    if (!res.success) {
      setCatError(res.error || "Chyba pri ukladaní kategórie");
    } else {
      setCatMessage(`Kategória „${cat.name}“ bola úspešne uložená.`);
      if (res.category) {
        setCategories((prev) => prev.map((c) => (c.id === cat.id ? res.category! : c)));
      }
    }
    setSavingCatId(null);
  };

  const deleteCategory = async (cat: AdminReservationCategory) => {
    if (cat.isSystem) {
      alert("Systémovú kategóriu nie je možné vymazať.");
      return;
    }
    const confirmed = window.confirm(`Naozaj chcete vymazať kategóriu „${cat.name}“?`);
    if (!confirmed) return;

    setDeletingCatId(cat.id);
    setCatError("");
    setCatMessage("");
    const res = await deleteReservationCategoryAction(cat.id);
    if (!res.success) {
      setCatError(res.error || "Chyba pri mazaní kategórie");
    } else {
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      setCatMessage(`Kategória „${cat.name}“ bola úspešne vymazaná.`);
    }
    setDeletingCatId(null);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setCatError("Zadajte názov novej kategórie.");
      return;
    }
    setIsCreatingCat(true);
    setCatError("");
    setCatMessage("");
    const res = await saveReservationCategoryAction({
      name: trimmed,
      color: newCatColor,
      border: calculateBorderColor(newCatColor),
      hasPlayerField: newCatHasPlayerField,
    });
    if (!res.success) {
      setCatError(res.error || "Chyba pri vytváraní kategórie");
    } else {
      if (res.category) {
        setCategories((prev) => [...prev, res.category!]);
      }
      setCatMessage(`Nová kategória „${trimmed}“ bola vytvorená.`);
      setNewCatName("");
      setShowAddModal(false);
    }
    setIsCreatingCat(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6 font-sans">
      {/* 1. Samostatný vyhľadávací box ako v sekcii Používatelia */}
      <section className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 lg:p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeSearch(1, query);
          }}
          className="flex flex-col gap-3.5"
        >
          <div className="flex items-center gap-2 max-w-md w-full">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Hľadať podľa mena, loginu, tel. alebo karty..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 pl-9 pr-9 text-xs sm:text-sm font-medium text-slate-900 transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-emerald-500/10"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setPage(1);
                    executeSearch(1, "");
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* "Hľadať" Button */}
            <button
              type="submit"
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-200 hover:text-slate-900 cursor-pointer shrink-0 active:scale-[0.98]"
              title="Spustiť vyhľadávanie"
            >
              <Search className="h-4 w-4 text-slate-500" />
              <span>Hľadať</span>
            </button>
          </div>

          {/* Count summary */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>
              Nájdených <strong>{totalUsers}</strong> používateľov
            </span>
            {loading && (
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Načítavam...
              </span>
            )}
          </div>
        </form>
      </section>

      {/* 2. Hlavná sekcia Používatelia a roly */}
      <section id="users-roles" className="scroll-mt-24 rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 lg:p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">

        {error && (
          <button
            type="button"
            onClick={() => setError("")}
            className="mb-4 w-full rounded-2xl bg-red-50 p-3.5 text-left text-sm font-semibold text-red-700 border border-red-200 transition hover:bg-red-100/80 cursor-pointer"
          >
            {error}
          </button>
        )}
        {message && (
          <button
            type="button"
            onClick={() => setMessage("")}
            className="mb-4 w-full rounded-2xl bg-emerald-50 p-3.5 text-left text-sm font-semibold text-emerald-700 border border-emerald-200 transition hover:bg-emerald-100/80 cursor-pointer"
          >
            {message}
          </button>
        )}

        {loading ? (
          <div className="grid min-h-40 place-items-center">
            <Loader2 className="h-7 w-7 animate-spin text-slate-600" />
          </div>
        ) : (
          <>
            {/* Desktop Table View (od md: vyššie) */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200/90">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b border-slate-200/90 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Používateľ</th>
                    <th className="px-5 py-3.5">Login / Kontakt</th>
                    <th className="px-5 py-3.5">Číslo karty</th>
                    <th className="px-5 py-3.5">Rola</th>
                    <th className="px-5 py-3.5">Zľava (cenník)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-5 py-4">
                        <span className="block font-bold text-slate-900">{user.name}</span>
                        <span className="text-xs text-slate-400">
                          {user.id === currentUserId ? "Tvoj účet" : `Registrovaný ${formatDate(user.created_at)}`}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="block font-medium text-slate-700">{user.email}</span>
                        <span className="text-xs text-slate-400">{user.phone || "Bez telefónu"}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-mono font-semibold text-slate-700">
                          <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                          {user.card_number || "Bez karty"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={pendingRoles[user.id] || user.role}
                            disabled={user.id === currentUserId || savingUserId === user.id}
                            onChange={(event) => selectRole(user.id, event.target.value as BookingRole)}
                            className="min-w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-slate-300 focus:border-emerald-500 focus:outline-hidden disabled:cursor-not-allowed disabled:bg-slate-100 cursor-pointer"
                          >
                            {roles.map((role) => (
                              <option key={role} value={role}>
                                {roleLabels[role]}
                              </option>
                            ))}
                          </select>
                          {pendingRoles[user.id] && (
                            <button
                              type="button"
                              disabled={savingUserId === user.id}
                              onClick={() => void saveUserRole(user)}
                              className="flex items-center gap-1.5 rounded-xl bg-slate-950 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                            >
                              {savingUserId === user.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                              Uložiť zmenu
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={pendingTiers[user.id] || user.discountTierId || "tier-base"}
                            disabled={savingTierUserId === user.id}
                            onChange={(event) => selectTier(user.id, event.target.value)}
                            className="min-w-44 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-slate-300 focus:border-emerald-500 focus:outline-hidden disabled:cursor-not-allowed disabled:bg-slate-100 cursor-pointer"
                          >
                            {discountTiers.map((tier) => (
                              <option key={tier.id} value={tier.id}>
                                {tier.name} {tier.isPercentual ? (tier.discountPercent > 0 ? `(-${tier.discountPercent} %)` : "(0 %)") : (tier.price60 ? `(${tier.price60} €/h)` : "")}
                              </option>
                            ))}
                          </select>
                          {pendingTiers[user.id] && (
                            <button
                              type="button"
                              disabled={savingTierUserId === user.id}
                              onClick={() => void saveUserTier(user)}
                              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                            >
                              {savingTierUserId === user.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                              Uložiť
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!users.length && (
                <p className="py-12 text-center text-sm font-medium text-slate-500">
                  Nenašli sa žiadni používatelia pre zadané vyhľadávanie.
                </p>
              )}
            </div>

            {/* Mobile Card List View (pre mobily pod md:) */}
            <div className="md:hidden space-y-3">
              {users.map((user) => {
                const activeRole = pendingRoles[user.id] || user.role;
                return (
                  <div
                    key={user.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs transition"
                  >
                    {/* Header: Meno a Rola štítok */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-sm font-bold text-slate-900">{user.name}</strong>
                        <span className="text-[11px] text-slate-400">
                          {user.id === currentUserId ? "Tvoj účet" : `Registrovaný ${formatDate(user.created_at)}`}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 rounded-lg px-2.5 py-0.5 text-[11px] font-bold border ${
                          activeRole === "admin"
                            ? "bg-slate-900 text-white border-slate-800"
                            : activeRole === "trainer"
                            ? "bg-[#DCC7F0] text-slate-950 border-[#C0A0E0]"
                            : "bg-[#FFF3B0] text-slate-950 border-[#EAD77B]"
                        }`}
                      >
                        {roleLabels[activeRole]}
                      </span>
                    </div>

                    {/* Kontakt a číslo karty */}
                    <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 text-[11px]">Email</span>
                        <span className="font-medium text-slate-700 truncate max-w-[200px]">{user.email}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 text-[11px]">Telefón</span>
                        <span className="font-medium text-slate-700">{user.phone || "Bez telefónu"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 text-[11px]">Číslo karty</span>
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-mono font-semibold text-slate-700">
                          <CreditCard className="h-3 w-3 text-slate-400" />
                          {user.card_number || "Bez karty"}
                        </span>
                      </div>
                    </div>

                    {/* Nastavenie roly na mobile */}
                    <div className="mt-3.5 border-t border-slate-100 pt-3">
                      <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Zmeniť rolu
                      </label>
                      <div className="flex flex-col gap-2">
                        <select
                          value={pendingRoles[user.id] || user.role}
                          disabled={user.id === currentUserId || savingUserId === user.id}
                          onChange={(event) => selectRole(user.id, event.target.value as BookingRole)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs focus:border-emerald-500 focus:bg-white focus:outline-hidden disabled:cursor-not-allowed disabled:bg-slate-100 cursor-pointer"
                        >
                          {roles.map((role) => (
                            <option key={role} value={role}>
                              {roleLabels[role]}
                            </option>
                          ))}
                        </select>

                        {pendingRoles[user.id] && (
                          <button
                            type="button"
                            disabled={savingUserId === user.id}
                            onClick={() => void saveUserRole(user)}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer active:scale-[0.98] w-full"
                          >
                            {savingUserId === user.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Uložiť zmenu
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Nastavenie zľavy na mobile */}
                    <div className="mt-3.5 border-t border-slate-100 pt-3">
                      <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Pridelená zľava (cenník)
                      </label>
                      <div className="flex flex-col gap-2">
                        <select
                          value={pendingTiers[user.id] || user.discountTierId || "tier-base"}
                          disabled={savingTierUserId === user.id}
                          onChange={(event) => selectTier(user.id, event.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs focus:border-emerald-500 focus:bg-white focus:outline-hidden disabled:cursor-not-allowed disabled:bg-slate-100 cursor-pointer"
                        >
                          {discountTiers.map((tier) => (
                            <option key={tier.id} value={tier.id}>
                              {tier.name} {tier.isPercentual ? (tier.discountPercent > 0 ? `(-${tier.discountPercent} %)` : "(0 %)") : (tier.price60 ? `(${tier.price60} €/h)` : "")}
                            </option>
                          ))}
                        </select>

                        {pendingTiers[user.id] && (
                          <button
                            type="button"
                            disabled={savingTierUserId === user.id}
                            onClick={() => void saveUserTier(user)}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50 cursor-pointer active:scale-[0.98] w-full"
                          >
                            {savingTierUserId === user.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Uložiť zľavu
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {!users.length && (
                <p className="py-8 text-center text-sm font-medium text-slate-500">
                  Nenašli sa žiadni používatelia pre zadané vyhľadávanie.
                </p>
              )}
            </div>

            {/* Stránkovanie */}
            <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
              <p className="font-semibold text-center sm:text-left">
                Spolu <strong>{totalUsers}</strong> používateľov · Strana {page} z {totalPages} · 7 na stranu
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Predchádzajúca
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  Nasledujúca
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Privilégiá podľa roly */}
            <div className="mt-8 border-t border-slate-200/80 pt-6">
              <h3 className="text-lg font-bold tracking-tight text-slate-950">Privilégiá podľa roly</h3>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                Tieto nastavenia definujú pravidlá rezervácií a cien pre jednotlivé roly v systéme.
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {roles.map((role) => {
                  const policy = policies.find((item) => item.role === role);
                  if (!policy) return null;
                  return (
                    <div key={role} className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-5 shadow-2xs">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-base font-bold text-slate-900">{roleLabels[role]}</span>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={policy.isActive}
                            onChange={(event) => changePolicy(role, "isActive", event.target.checked)}
                            className="h-4 w-4 rounded-md border-slate-300 text-slate-950 focus:ring-slate-950 cursor-pointer"
                          />
                          Aktívna
                        </label>
                      </div>
                      <div className="space-y-3.5">
                        <label className="block text-xs font-bold text-slate-600">
                          Ako ďaleko dopredu môže rezervovať (dni)
                          <input
                            type="number"
                            min="0"
                            max="730"
                            value={policy.bookingHorizonDays}
                            onChange={(event) => changePolicy(role, "bookingHorizonDays", Number(event.target.value))}
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-medium text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
                          />
                        </label>
                        <label className="block text-xs font-bold text-slate-600">
                          Maximálne trvanie jednej rezervácie
                          <select
                            value={policy.maxBookingDurationMinutes}
                            onChange={(event) => changePolicy(role, "maxBookingDurationMinutes", Number(event.target.value))}
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-medium text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-hidden cursor-pointer"
                          >
                            {durationLimits.map((minutes) => (
                              <option key={minutes} value={minutes}>
                                {minutes < 60
                                  ? `${minutes} minút`
                                  : minutes % 60
                                  ? `${Math.floor(minutes / 60)} h ${minutes % 60} min`
                                  : `${minutes / 60} h`}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-xs font-bold text-slate-600">
                          Zľava na rezerváciu (€)
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={policy.discountEurPerHour}
                            onChange={(event) => changePolicy(role, "discountEurPerHour", Number(event.target.value))}
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-medium text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
                          />
                        </label>
                        <label className="block text-xs font-bold text-slate-600">
                          Minimálny čas na zrušenie (hodiny pred začiatkom)
                          <input
                            type="number"
                            min="0"
                            max="8760"
                            value={policy.cancellationDeadlineHours}
                            onChange={(event) => changePolicy(role, "cancellationDeadlineHours", Number(event.target.value))}
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-medium text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
                          />
                        </label>
                        <label className="flex items-center gap-2 pt-1 text-xs font-bold text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(policy.canMakeRecurring)}
                            onChange={(event) => changePolicy(role, "canMakeRecurring", event.target.checked)}
                            className="h-4 w-4 rounded-md border-slate-300 text-slate-950 focus:ring-slate-950 cursor-pointer"
                          />
                          <span>Povoliť opakované rezervácie</span>
                        </label>
                      </div>
                      <button
                        type="button"
                        disabled={savingRole === role}
                        onClick={() => void savePolicy(policy)}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                      >
                        {savingRole === role && <Loader2 className="h-4 w-4 animate-spin" />}
                        Uložiť privilégiá
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </section>

      {/* 3. Dôvody rezervácie a farby v kalendári */}
      <section id="categories" className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 lg:p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)] space-y-6 scroll-mt-20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 shadow-2xs">
                <Palette className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-950 sm:text-xl">
                Dôvody rezervácie a farby v kalendári
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Prispôsobte farby existujúcich dôvodov rezervácií (Údržba, Rezervácia Admin, Tréningy) alebo vytvorte vlastné kategórie (napr. Turnaj, Detská akadémia).
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowAddModal(true);
              setCatError("");
              setCatMessage("");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-emerald-500 cursor-pointer active:scale-[0.98] shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Pridať novú kategóriu</span>
          </button>
        </div>

        {/* Notifikácie správ / chýb pre kategórie */}
        {catMessage && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs sm:text-sm font-bold text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{catMessage}</span>
          </div>
        )}
        {catError && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50/80 p-3.5 text-xs sm:text-sm font-bold text-red-800 animate-in fade-in">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{catError}</span>
          </div>
        )}

        {/* Modálové okno pre pridanie novej kategórie */}
        {showAddModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4">
            {/* Tmavé pozadie s rozmazaním */}
            <button
              type="button"
              aria-label="Zavrieť"
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm cursor-pointer"
              onClick={() => setShowAddModal(false)}
            />

            {/* Modálová karta */}
            <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-2xl transition-all max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              {/* Hlavička modalu */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-2xs">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-950">
                      Pridať novú kategóriu rezervácie
                    </h3>
                    <p className="text-xs text-slate-500">
                      Zvoľte názov, farbu a možnosti zobrazenia v kalendári.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                  aria-label="Zavrieť okno"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Formulár */}
              <form onSubmit={handleCreateCategory} className="space-y-5">
                {/* Živý náhľad */}
                <div>
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Živý náhľad v kalendári
                  </span>
                  <div
                    className="inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-bold shadow-xs transition-all"
                    style={{
                      backgroundColor: newCatColor,
                      borderColor: calculateBorderColor(newCatColor),
                      color: "#020617",
                    }}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: calculateBorderColor(newCatColor) }}
                    />
                    <span>{newCatName.trim() || "Názov kategórie"}</span>
                  </div>
                </div>

                {/* Názov kategórie */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Názov kategórie *
                  </label>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="napr. Turnaj, Sústredenie, Akadémia..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 p-3 text-sm font-semibold text-slate-900 shadow-2xs focus:border-emerald-500 focus:bg-white focus:outline-hidden transition"
                    autoFocus
                    required
                  />
                </div>

                {/* Farba kategórie */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Farba v kalendári
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {COLOR_PRESETS.map((preset) => {
                      const isSelected = newCatColor.toUpperCase() === preset.hex.toUpperCase();
                      return (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={() => setNewCatColor(preset.hex)}
                          className={`h-8 w-8 rounded-xl border transition shadow-2xs cursor-pointer flex items-center justify-center ${
                            isSelected ? "ring-2 ring-slate-950 scale-110" : "hover:scale-105"
                          }`}
                          style={{
                            backgroundColor: preset.hex,
                            borderColor: calculateBorderColor(preset.hex),
                          }}
                          title={preset.name}
                        >
                          {isSelected && <Check className="h-4 w-4 text-slate-900" />}
                        </button>
                      );
                    })}
                    <div className="flex items-center gap-1.5 ml-1">
                      <input
                        type="color"
                        value={newCatColor}
                        onChange={(e) => setNewCatColor(e.target.value)}
                        className="h-8 w-9 rounded-xl border border-slate-200 p-0.5 cursor-pointer bg-white"
                        title="Vybrať vlastnú farbu"
                      />
                      <input
                        type="text"
                        value={newCatColor}
                        onChange={(e) => setNewCatColor(e.target.value)}
                        className="w-22 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono font-bold uppercase text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Checkbox: Meno hráča / zverenca */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5">
                  <label className="flex items-start gap-3 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCatHasPlayerField}
                      onChange={(e) => setNewCatHasPlayerField(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <span className="block leading-snug font-bold text-slate-900">
                        Zobrazovať v okne rezervácie pole „Meno hráča / zverenca“
                      </span>
                      <span className="block text-[11px] font-normal text-slate-500 mt-0.5 leading-snug">
                        Ak je zapnuté, pri rezervácii zadáte meno hráča a to sa zobrazí priamo v políčku termínu v kalendári.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Tlačidlá akcie */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Zrušiť
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingCat || !newCatName.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-emerald-500 disabled:opacity-50 transition cursor-pointer active:scale-95"
                  >
                    {isCreatingCat && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Uložiť kategóriu</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Zoznam existujúcich kategórií */}
        {categoriesLoading ? (
          <div className="flex items-center justify-center p-8 text-slate-500 text-sm gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
            <span>Načítavam kategórie...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {categories.map((cat) => {
              const isSaving = savingCatId === cat.id;
              const isDeleting = deletingCatId === cat.id;

              return (
                <div
                  key={cat.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 transition shadow-2xs hover:shadow-xs hover:border-slate-300"
                >
                  <div className="space-y-3.5">
                    {/* Hore: Živá ukážka v kalendári */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                      <div
                        className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold shadow-2xs max-w-[200px] truncate"
                        style={{
                          backgroundColor: cat.color,
                          borderColor: cat.border,
                          color: "#020617",
                        }}
                      >
                        <span className="truncate">{cat.name}</span>
                      </div>

                      {cat.isSystem ? (
                        <span className="rounded-full bg-slate-200/70 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 tracking-wide">
                          Systémová
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold tracking-wide">
                          Vlastná
                        </span>
                      )}
                    </div>

                    {/* Názov kategórie */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Názov
                      </label>
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) => updateCategoryName(cat.id, e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs sm:text-sm font-semibold text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Výber farby */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Farba
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {COLOR_PRESETS.map((preset) => {
                          const isSelected = cat.color.toUpperCase() === preset.hex.toUpperCase();
                          return (
                            <button
                              key={preset.hex}
                              type="button"
                              onClick={() => updateCategoryColor(cat.id, preset.hex)}
                              className={`h-6 w-6 rounded-md border transition shadow-2xs cursor-pointer flex items-center justify-center ${
                                isSelected ? "ring-2 ring-slate-950 scale-110" : "hover:scale-105"
                              }`}
                              style={{
                                backgroundColor: preset.hex,
                                borderColor: calculateBorderColor(preset.hex),
                              }}
                              title={preset.name}
                            >
                              {isSelected && <Check className="h-3 w-3 text-slate-900" />}
                            </button>
                          );
                        })}
                        <div className="flex items-center gap-1 ml-0.5">
                          <input
                            type="color"
                            value={cat.color}
                            onChange={(e) => updateCategoryColor(cat.id, e.target.value)}
                            className="h-6 w-7 rounded-md border border-slate-200 p-0.5 cursor-pointer bg-white"
                            title="Vybrať vlastnú farbu"
                          />
                          <input
                            type="text"
                            value={cat.color}
                            onChange={(e) => updateCategoryColor(cat.id, e.target.value)}
                            className="w-18 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-mono font-bold uppercase text-slate-800"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Zobrazovanie poľa Meno hráča */}
                    <label className="flex items-start gap-2 pt-1 text-xs font-bold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(cat.hasPlayerField)}
                        onChange={(e) => updateCategoryPlayerField(cat.id, e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded-md border-slate-300 text-slate-950 focus:ring-slate-950 cursor-pointer"
                      />
                      <span className="leading-snug">
                        Zobrazovať pole Meno hráča / zverenca
                      </span>
                    </label>
                  </div>

                  {/* Tlačidlá akcie */}
                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                    {!cat.isSystem ? (
                      <button
                        type="button"
                        disabled={isDeleting || isSaving}
                        onClick={() => deleteCategory(cat)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 hover:border-red-300 cursor-pointer disabled:opacity-50"
                        title="Zmazať kategóriu"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        <span>Zmazať</span>
                      </button>
                    ) : (
                      <div />
                    )}

                    <button
                      type="button"
                      disabled={isSaving || isDeleting}
                      onClick={() => saveCategory(cat)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span>Uložiť</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
