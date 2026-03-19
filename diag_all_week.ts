import { getPizzaDashboardData } from "./lib/server/dashboard";
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

const LEVOCA_TENANT_ID = '3e803e21-3177-42ed-974c-a1a1b260b88b';

async function diagnoseAllWeekData() {
    console.log("--- Fetching Weekly Data for LEVOCA ---");
    const data = await getPizzaDashboardData(LEVOCA_TENANT_ID);
    
    console.log("Orders Week Total:", data.ordersWeek.length);
    
    const tenantCounts: Record<string, number> = {};
    data.ordersWeek.forEach(o => {
        tenantCounts[o.tenant_id] = (tenantCounts[o.tenant_id] || 0) + 1;
    });
    console.log("Orders Week Breakdown by Tenant:", tenantCounts);

    console.log("\nSample Addresses (All Week):");
    data.ordersWeek.slice(0, 20).forEach((o, i) => {
        console.log(`${i+1}. [Tenant: ${o.tenant_id}] ${o.delivery_address}`);
    });
}

diagnoseAllWeekData();
