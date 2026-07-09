import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey as string);
const USER_ID = "331bf7b0-914f-4a09-856c-d4d8b68af02d";

async function check() {
    console.log("Checking bookings for user:", USER_ID);
    
    // Check bookings
    const { data: bookings, error: bookingsErr } = await supabase
        .from("bookings")
        .select("id, start_at, customer_name, court_id")
        .eq("user_id", USER_ID);
        
    if (bookingsErr) {
        console.error("Error fetching bookings:", bookingsErr.message);
    } else {
        console.log(`Found ${bookings.length} bookings for this user.`);
        if (bookings.length > 0) {
            console.log("Bookings still left:");
            bookings.forEach(b => console.log(` - Booking ID: ${b.id}, Time: ${b.start_at}, Court: ${b.court_id}`));
            
            // Delete them completely since the user tried to
            console.log("\nDeleting these remaining bookings...");
            const { error: delErr } = await supabase.from("bookings").delete().eq("user_id", USER_ID);
            if (delErr) {
                console.error("Failed to delete bookings:", delErr.message);
            } else {
                console.log("Successfully deleted the leftover bookings!");
            }
        }
    }

    // Now try to delete the user
    if (bookings && bookings.length === 0 || bookings && bookings.length > 0) {
        console.log("\nAttempting to delete the user from booking_users...");
        const { error: userDelErr } = await supabase.from("booking_users").delete().eq("id", USER_ID);
        if (userDelErr) {
            console.error("Failed to delete user:", userDelErr.message);
        } else {
            console.log("Successfully deleted the user!");
        }
    }
}
check();
