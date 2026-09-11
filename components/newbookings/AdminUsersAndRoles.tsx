"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, CreditCard, Loader2, Search, X } from "lucide-react";
import {
  fetchAdminUsersAction,
  updateBookingUserRoleAction,
  updateRoleBookingPolicyAction,
  type RoleBookingPolicyInput,
} from "@/app/actions/adminUsers";
import type { BookingRole } from "@/lib/auth/bookingAuth";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  card_number: string | null;
  role: BookingRole;
  created_at: string;
};

type RolePolicy = RoleBookingPolicyInput;

const roleLabels: Record<BookingRole, string> = {
  admin: "Administrátor",
  user: "Používateľ",
  trainer: "Tréner",
};
const roles: BookingRole[] = ["admin", "user", "trainer"];
const durationLimits = [30, 60, 90, 120, ...Array.from({ length: 22 }, (_, index) => (index + 3) * 60)];
const formatDate = (value: string) => new Intl.DateTimeFormat("sk-SK").format(new Date(value));

export default function AdminUsersAndRoles() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [policies, setPolicies] = useState<RolePolicy[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pendingRoles, setPendingRoles] = useState<Record<string, BookingRole>>({});
  const [savingUserId, setSavingUserId] = useState("");
  const [savingRole, setSavingRole] = useState<BookingRole | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-slate-200/90 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Používateľ</th>
                    <th className="px-5 py-3.5">Login / Kontakt</th>
                    <th className="px-5 py-3.5">Číslo karty</th>
                    <th className="px-5 py-3.5">Rola</th>
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
                            ? "bg-[#8648E8] text-white border-[#6025B8]"
                            : "bg-[#ECE81A] text-slate-950 border-[#C5BC00]"
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
              <div className="mt-5 grid gap-4 xl:grid-cols-3">
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
                          Zľava za každú hodinu rezervácie (€)
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
    </div>
  );
}
