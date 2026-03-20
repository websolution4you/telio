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

async function findLevočaAddresses() {
    console.log("Searching for Levoča-like addresses in ALL orders...");
    const { data: orders } = await coreDb.from("pizza_orders").select("id, tenant_id, delivery_address, created_at");
    
    // Keywords for Levoča
    const keywords = ["Levoča", "Francisciho", "Czauczika", "Košická", "Rozvoj", "Nová"];
    
    orders?.forEach(o => {
        const addr = o.delivery_address || "";
        const isLevoča = keywords.some(k => addr.toLowerCase().includes(k.toLowerCase()));
        
        if (isLevoča && o.tenant_id !== LEVOCA_TENANT_ID) {
            console.log(`Potential Match: ID ${o.id} | Tenant ${o.tenant_id} | Addr: ${addr}`);
        }
    });
}

findLevočaAddresses();
