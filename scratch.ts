import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey as string);

async function check() {
    const { data, error } = await supabase.from("bookings").select("customer_name").eq("tenant_id", "595cbb6c-1019-41ae-b1c2-a60c13c8dcdf");
    if (error) {
        console.error(error);
        return;
    }
    const names = (data || []).map(d => (d.customer_name || "Neznámy zákazník").trim());
    console.log("Total rows:", data.length);
    const unique = new Set(names);
    console.log("Unique count:", unique.size);
    console.log("Unique names:", Array.from(unique));
}
check();
