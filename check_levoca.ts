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
const LEVOCA_TENANT_ID = '3e803e21-3177-42ed-974c-a1a1b260b88b';

async function checkLevocaData() {
    console.log(`Checking data for LEVOCA tenant: ${LEVOCA_TENANT_ID}`);
    const { count, error } = await coreDb
        .from("pizza_orders")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", LEVOCA_TENANT_ID);
    
    console.log("Total orders for LEVOCA:", count);

    const { data: recentOrders } = await coreDb
        .from("pizza_orders")
        .select("delivery_address, created_at")
        .eq("tenant_id", LEVOCA_TENANT_ID)
        .order("created_at", { ascending: false })
        .limit(10);
    
    console.log("Recent Levoča Orders:", recentOrders);
}

checkLevocaData();
