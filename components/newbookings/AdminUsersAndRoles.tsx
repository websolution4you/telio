"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Loader2, Search, ShieldCheck } from "lucide-react";
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
const formatDate = (value: string) => new Intl.DateTimeFormat("sk-SK").format(new Date(value));

export default function AdminUsersAndRoles() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [policies, setPolicies] = useState<RolePolicy[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState("");
  const [savingRole, setSavingRole] = useState<BookingRole | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchAdminUsersAction().then((result) => {
      if (!active) return;
      if (result.success) {
        setUsers(result.users as AdminUser[]);
        setPolicies(result.policies as RolePolicy[]);
        setCurrentUserId(result.currentUserId);
      } else setError(result.error);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("sk");
    if (!normalized) return users;
    return users.filter((user) => [user.name, user.email, user.phone, user.card_number, roleLabels[user.role]]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase("sk").includes(normalized)));
  }, [query, users]);

  const updateRole = async (userId: string, role: BookingRole) => {
    const previousRole = users.find((user) => user.id === userId)?.role;
    if (!previousRole || previousRole === role) return;
    setSavingUserId(userId);
    setError("");
    setMessage("");
    setUsers((current) => current.map((user) => user.id === userId ? { ...user, role } : user));
    const result = await updateBookingUserRoleAction(userId, role);
    if (!result.success) {
      setUsers((current) => current.map((user) => user.id === userId ? { ...user, role: previousRole } : user));
      setError(result.error);
    } else setMessage("Rola používateľa bola uložená.");
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
    <section id="users-roles" className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-700"><ShieldCheck className="h-5 w-5" /></span>
        <div><h2 className="text-xl font-bold">Používatelia a roly</h2><p className="text-sm text-slate-500">Rola sa používateľovi prejaví pri ďalšom prihlásení.</p></div>
      </div>

      {error && <button type="button" onClick={() => setError("")} className="mb-4 w-full rounded-xl bg-red-50 p-3 text-left text-sm font-semibold text-red-700">{error}</button>}
      {message && <button type="button" onClick={() => setMessage("")} className="mb-4 w-full rounded-xl bg-emerald-50 p-3 text-left text-sm font-semibold text-emerald-700">{message}</button>}

      {loading ? <div className="grid min-h-32 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div> : (
        <>
          <div className="relative mb-4 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Hľadať podľa mena, loginu, telefónu alebo karty" className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead><tr className="border-b text-xs uppercase tracking-wider text-slate-400"><th className="pb-3">Používateľ</th><th className="pb-3">Login</th><th className="pb-3">Číslo karty</th><th className="pb-3">Rola</th></tr></thead>
              <tbody>{filteredUsers.map((user) => <tr key={user.id} className="border-b border-slate-100 last:border-0">
                <td className="py-4"><b className="block text-slate-900">{user.name}</b><small className="text-slate-400">{user.id === currentUserId ? "Tvoj účet" : `Registrovaný ${formatDate(user.created_at)}`}</small></td>
                <td><span className="block text-slate-700">{user.email}</span><small className="text-slate-400">{user.phone || "Bez telefónu"}</small></td>
                <td><span className="inline-flex items-center gap-2 text-slate-700"><CreditCard className="h-4 w-4 text-slate-400" />{user.card_number || "Bez karty"}</span></td>
                <td><div className="flex items-center gap-2"><select value={user.role} disabled={user.id === currentUserId || savingUserId === user.id} onChange={(event) => void updateRole(user.id, event.target.value as BookingRole)} className="min-w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100">{roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select>{savingUserId === user.id && <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />}</div></td>
              </tr>)}</tbody>
            </table>
            {!filteredUsers.length && <p className="py-8 text-center text-sm text-slate-500">Nenašli sa žiadni používatelia.</p>}
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <h3 className="text-lg font-bold text-slate-900">Privilégiá podľa roly</h3>
            <p className="mt-1 text-sm text-slate-500">Tieto nastavenia pripravujú pravidlá rezervácií a cien pre jednotlivé roly.</p>
            <div className="mt-4 grid gap-4 xl:grid-cols-3">{roles.map((role) => {
              const policy = policies.find((item) => item.role === role);
              if (!policy) return null;
              return <div key={role} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-4 flex items-center justify-between"><b>{roleLabels[role]}</b><label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={policy.isActive} onChange={(event) => changePolicy(role, "isActive", event.target.checked)} /> Aktívna</label></div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-semibold text-slate-600">Max. rezervácia (min)<input type="number" min="15" max="1440" step="15" value={policy.maxBookingDurationMinutes} onChange={(event) => changePolicy(role, "maxBookingDurationMinutes", Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-900" /></label>
                  <label className="text-xs font-semibold text-slate-600">Dní dopredu<input type="number" min="0" max="730" value={policy.bookingHorizonDays} onChange={(event) => changePolicy(role, "bookingHorizonDays", Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-900" /></label>
                  <label className="text-xs font-semibold text-slate-600">Zľava (%)<input type="number" min="0" max="100" step="0.01" value={policy.discountPercent} onChange={(event) => changePolicy(role, "discountPercent", Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-900" /></label>
                  <label className="text-xs font-semibold text-slate-600">Storno lehota (h)<input type="number" min="0" max="8760" value={policy.cancellationDeadlineHours} onChange={(event) => changePolicy(role, "cancellationDeadlineHours", Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-900" /></label>
                </div>
                <button type="button" disabled={savingRole === role} onClick={() => void savePolicy(policy)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{savingRole === role && <Loader2 className="h-4 w-4 animate-spin" />}Uložiť privilégiá</button>
              </div>;
            })}</div>
          </div>
        </>
      )}
    </section>
  );
}
