import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
envContent.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join("=").trim();
    }
});

const db = createClient(process.env.CORE_SUPABASE_URL!, process.env.CORE_SUPABASE_SERVICE_ROLE_KEY!);
const tenantId = '3e803e21-3177-42ed-974c-a1a1b260b88b'; // Using Levoca as example or I should find the one for Milan

async function diag() {
    // 1. Find tenant
    const { data: tenants, error: tError } = await db.from("tenants").select("*").ilike("name", "%Milano%");
    if (tError || !tenants || tenants.length === 0) {
        console.error("Tenant Milano not found", tError);
        return;
    }
    const tenant = tenants[0];
    console.log(`Found Tenant: ${tenant.name} (${tenant.id})`);

    // 2. Find data source
    const { data: ds } = await db.from("data_sources").select("*").eq("tenant_id", tenant.id).maybeSingle();
    const tablePrefix = ds?.table_prefix || "";
    const ordersTable = ds?.orders_table || (tablePrefix ? `${tablePrefix}_orders` : "pizza_orders");
    console.log(`Using table: ${ordersTable}`);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    console.log("Current Time (Local):", now.toString());
    console.log("Current Time (ISO):", now.toISOString());
    console.log("Start of Day (ISO):", startOfDay.toISOString());
    console.log("End of Day (ISO):", endOfDay.toISOString());

    // 3. Fetch orders
    const { data: orders, error } = await db
        .from(ordersTable)
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error fetching orders:", error);
        return;
    }

    console.log(`Last 10 orders for ${tenant.name}:`);
    orders.forEach(o => {
        const isInRange = o.created_at >= startOfDay.toISOString() && o.created_at < endOfDay.toISOString();
        console.log(`ID: ${o.id}, CreatedAt: ${o.created_at}, Total: ${o.total_price}, InRange: ${isInRange}`);
    });
}

diag();
