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

async function checkStreetsAndAddresses() {
    console.log("--- Streets from coreDb ---");
    const { data: streets } = await coreDb.from("streets").select("name");
    console.log("Streets count:", streets?.length);
    console.log("Sample streets:", streets?.slice(0, 10).map(s => s.name));

    console.log("\n--- Addresses from pizza_orders ---");
    const { data: orders } = await coreDb.from("pizza_orders").select("delivery_address").limit(10);
    console.log("Sample addresses:", orders?.map(o => o.delivery_address));
}

checkStreetsAndAddresses();
