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

async function searchAllTables() {
    console.log("Searching for all tables in the database...");
    
    // Attempt 1: Information Schema
    const { data: tablesRaw, error: err1 } = await coreDb
        .from("information_schema.tables" as any)
        .select("table_name")
        .eq("table_schema", "public");

    if (tablesRaw) {
        console.log("Tables found via information_schema:", tablesRaw.map((t: any) => t.table_name));
    } else {
        console.log("Failed to query information_schema:", err1?.message);
    }

    // Attempt 2: Probing common names
    const commonNames = [
        "pizza_orders", "taxi_rides", "menu_items", "streets", "calls",
        "pizza_pizza_orders", "taxi_taxi_rides", "levoca_pizza_orders", "peter_dev_pizza_orders"
    ];
    
    for (const name of commonNames) {
        const { count, error } = await coreDb.from(name).select("*", { count: "exact", head: true });
        if (!error) {
            console.log(`Table exists: ${name} (Count: ${count})`);
        }
    }
}

searchAllTables();
