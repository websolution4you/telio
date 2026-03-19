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

async function checkCallsAndSchemas() {
    console.log(`Checking calls for tenant: ${LEVOCA_TENANT_ID}`);
    const { count, error } = await coreDb
        .from("calls")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", LEVOCA_TENANT_ID);
    
    console.log("Total calls for this tenant:", count);

    // Try to find ANY call for ANY tenant
    const { data: sampleCalls } = await coreDb.from("calls").select("tenant_id").limit(10);
    console.log("Sample tenant_ids from calls:", sampleCalls?.map(c => c.tenant_id));
}

checkCallsAndSchemas();
