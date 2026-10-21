import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { getSession } from "@/lib/auth/bookingAuth";
import AdminAuditLogs from "@/components/newbookings/AdminAuditLogs";
import NewBookingsHeader from "@/components/newbookings/NewBookingsHeader";

export const metadata = {
  title: "História aktivít a Audit logy | Telio NTC",
};

export default async function AuditLogsPage() {
  const session = await getSession();
  if (!session) redirect("/newbookings");
  if (session.role !== "admin") redirect("/dashboard/newbookings");

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-900" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <NewBookingsHeader currentUser={session} activeTab="audit-logs" />
      <main className="px-4 py-6 text-slate-900 sm:px-6 lg:py-8">
        {/* Mobile webview compatibility dummy first-child */}
        <div className="hidden" aria-hidden="true" />
        <div className="mx-auto max-w-[1500px]">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <ShieldAlert className="h-3.5 w-3.5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">História aktivít a Logy</h1>
              </div>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Kompletný auditný záznam všetkých operácií v systéme – rezervácie, storná, zmeny nastavení, cenníkov a používateľov.
              </p>
            </div>
            <Link
              href="/newbookings"
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Späť na kalendár
            </Link>
          </div>

          <AdminAuditLogs />
        </div>
      </main>
    </div>
  );
}
