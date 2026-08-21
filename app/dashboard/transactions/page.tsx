import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/bookingAuth";
import NewBookingsTransactions from "@/components/newbookings/NewBookingsTransactions";

export default async function NewBookingsTransactionsPage() {
  const session = await getSession();
  if (!session) redirect("/newbookings");

  return <NewBookingsTransactions currentUser={session} />;
}
