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

import { getTaxiDashboardData } from "./lib/server/dashboard";
import { getCurrentTenantId } from "./lib/config/tenants";
import { getProjectContext } from "./lib/server/projectContext";

async function run() {
    console.log("Testing getTaxiDashboardData...");
    const tenantId = await getCurrentTenantId("taxi");
    console.log("Tenant ID:", tenantId);
    
    const context = await getProjectContext(tenantId, "taxi");
    console.log("Tables being used:", context.tables);
    console.log("DB Project:", context.db ? "DB initialized" : "Missing DB");

    try {
        const now = new Date();
        const slovakiaNow = new Date(now.getTime() + (1 * 60 * 60 * 1000));
        const startOfDay = new Date(Date.UTC(slovakiaNow.getUTCFullYear(), slovakiaNow.getUTCMonth(), slovakiaNow.getUTCDate(), 0, 0, 0));
        startOfDay.setTime(startOfDay.getTime() - (1 * 60 * 60 * 1000));
        const endOfDay = new Date(startOfDay);
        endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
        console.log(`Querying rides between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`);

        const data = await getTaxiDashboardData(tenantId);
        console.log(`Returned ${data.ridesToday?.length} rides today.`);
        if (data.ridesToday && data.ridesToday.length > 0) {
            console.log("Top ride:", data.ridesToday[0]);
        }
    } catch (err) {
        console.error("Error calling data:", err);
    }
}
run();
