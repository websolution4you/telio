import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth/bookingAuth";
import AdminUsersAndRoles from "@/components/newbookings/AdminUsersAndRoles";

export const metadata = {
  title: "Používatelia a roly",
};

export default async function UsersAndRolesPage() {
  const session = await getSession();
  if (!session) redirect("/newbookings");
  if (session.role !== "admin") redirect("/dashboard/newbookings");

  return (
    <main className="min-h-screen bg-[#f4f7f5] px-4 py-6 text-slate-900 sm:px-6 lg:py-10">
      {/* Mobile webview compatibility dummy first-child */}
      <div className="hidden" aria-hidden="true" />
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Používatelia a roly</h1>
            <p className="mt-2 text-sm text-slate-500">Správa používateľov, rolí a rezervačných privilégií.</p>
          </div>
          <Link href="/newbookings" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"><ArrowLeft className="h-4 w-4" />Späť na kalendár</Link>
        </div>
        <AdminUsersAndRoles />
      </div>
    </main>
  );
}
