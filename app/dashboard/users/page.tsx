import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { getSession } from "@/lib/auth/bookingAuth";
import AdminUsersDirectory from "@/components/newbookings/AdminUsersDirectory";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Používatelia | Telio NTC",
  description: "Abecedný zoznam a detailná história všetkých klientov a používateľov",
};

export default async function UsersDirectoryPage() {
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
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-md">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Používatelia
                </h1>
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                  Kompletný zoznam klientov, prehľad kreditov a detailná história rezervácií.
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

        <AdminUsersDirectory />
      </div>
    </main>
  );
}
