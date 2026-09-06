import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Receipt } from "lucide-react";
import { getSession } from "@/lib/auth/bookingAuth";
import AdminTransactions from "@/components/newbookings/AdminTransactions";
import NewBookingsHeader from "@/components/newbookings/NewBookingsHeader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Transakcie (Administrátor) | Telio",
  description: "Kompletný prehľad všetkých transakcií, dobití a platieb klientov.",
};

export default async function AdminTransactionsPage() {
  const session = await getSession();
  if (!session) redirect("/newbookings");
  if (session.role !== "admin") redirect("/dashboard/transactions");

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-900" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <NewBookingsHeader currentUser={session} activeTab="transactions" />
      <main className="px-4 py-6 text-slate-900 sm:px-6 lg:py-8">
      {/* Mobile webview compatibility dummy first-child */}
      <div className="hidden" aria-hidden="true" />
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-600 text-white shadow-md">
                <Receipt className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Všetky transakcie
                </h1>
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                  Kompletný prehľad dobití, platieb a vratiek kreditu všetkých klientov.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/newbookings"
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Späť na kalendár
            </Link>
          </div>
        </div>
        <AdminTransactions />
      </div>
    </main>
  </div>
);
}
