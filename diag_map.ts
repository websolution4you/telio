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

const PIZZA_TENANT_ID = 'ac3b439d-a446-4d67-abf7-5e04f58647fe';

async function diagnoseMapData() {
    console.log("--- Fetching Pizza Dashboard Data for Mapping ---");
    const data = await getPizzaDashboardData(PIZZA_TENANT_ID);
    
    console.log("Streets Count:", data.streets.length);
    console.log("Sample Streets:", data.streets.slice(0, 5));
    
    console.log("\nOrders (Week) Count:", data.ordersWeek.length);
    const sampleAddrs = data.ordersWeek.slice(0, 10).map(o => o.delivery_address);
    console.log("Sample Addresses:", sampleAddrs);

    // Test normalization manually
    function normalizeStr(str: string) {
        if (!str) return "";
        return str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\b(ulica|ul\.|sidlisko|namestie)\b/g, "")
            .replace(/[^a-z]/g, "")
            .trim();
    }

    console.log("\n--- Normalization Test ---");
    for (const addr of sampleAddrs) {
        const normAddr = normalizeStr(addr || "");
        console.log(`Addr: "${addr}" -> Norm: "${normAddr}"`);
        for (const street of data.streets) {
            const normDb = normalizeStr(street);
            if (normAddr && normDb && (normAddr === normDb || normAddr.includes(normDb))) {
                console.log(`  MATCH with [${street}] (Norm: ${normDb})`);
            }
        }
    }
}

diagnoseMapData();
