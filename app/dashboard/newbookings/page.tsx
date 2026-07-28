import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/bookingAuth";
import NewBookingsDashboard from "@/components/newbookings/NewBookingsDashboard";

export default async function NewBookingsDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/newbookings");

  return <NewBookingsDashboard currentUser={session} />;
}
