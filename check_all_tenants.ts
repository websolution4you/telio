import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load .env.local manually
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
envContent.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join("=").trim();
    }
});

const coreDb = createClient(process.env.CORE_SUPABASE_URL!, process.env.CORE_SUPABASE_SERVICE_ROLE_KEY!);

async function checkAllTenants() {
    console.log("--- All Tenants ---");
    const { data: tenants } = await coreDb.from("tenants").select("*");
    console.log(JSON.stringify(tenants, null, 2));

    console.log("\n--- Check for any table with 'pizza' in name ---");
    // Since I can't use information_schema easily, I'll try to guess
    const guesses = ["pizza_orders", "levoca_orders", "orders", "all_orders", "items"];
    for (const g of guesses) {
        const { count, error } = await coreDb.from(g).select("*", { count: "exact", head: true });
        if (!error) console.log(`Table ${g} exists (Count: ${count})`);
    }
}

checkAllTenants();
