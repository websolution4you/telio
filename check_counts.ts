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
const PIZZA_TENANT_ID = 'ac3b439d-a446-4d67-abf7-5e04f58647fe';

async function checkOrderCounts() {
    console.log(`Checking orders for tenant: ${PIZZA_TENANT_ID}`);
    const { count, error } = await coreDb
        .from("pizza_orders")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", PIZZA_TENANT_ID);
    
    console.log("Total orders for this tenant:", count);

    const { count: totalCount } = await coreDb
        .from("pizza_orders")
        .select("*", { count: "exact", head: true });
    
    console.log("Total orders in table (all tenants):", totalCount);
}

checkOrderCounts();
