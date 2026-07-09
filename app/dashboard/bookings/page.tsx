import { getSession } from "@/lib/auth/bookingAuth";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/dashboard/bookings/AdminDashboard";
import UserDashboard from "@/components/dashboard/bookings/UserDashboard";
import Navbar from "@/components/Navbar";

export default async function BookingsDashboardPage() {
    const session = await getSession();

    if (!session) {
        redirect("/bookings");
    }

    return (
        <main className="min-h-screen overflow-hidden text-white" style={{ background: "var(--bg)" }}>
            <Navbar />
            <div className="pt-32 pb-24 px-4 sm:px-8 max-w-7xl mx-auto w-full relative z-10 flex flex-col gap-8">
                {session.role === 'admin' ? (
                    <AdminDashboard session={session} />
                ) : (
                    <UserDashboard session={session} />
                )}
            </div>
        </main>
    );
}
