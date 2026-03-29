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
const taxiDb = createClient(process.env.TAXI_SUPABASE_URL!, process.env.TAXI_SUPABASE_SERVICE_ROLE_KEY!);

async function search(db: any, label: string) {
    console.log(`--- Searching Project ${label} ---`);
    const commonNames = ["taxi_rides", "calls", "taxi_rate_cards"];
    for (const name of commonNames) {
        const { count, error } = await db.from(name).select("*", { count: "exact", head: true });
        if (!error) {
            console.log(`Table exists: ${name} (Count: ${count})`);
        } else {
             console.log(`Table missing: ${name} (${error.message})`);
        }
    }
}

async function run() {
    await search(coreDb, "CORE");
    await search(taxiDb, "TAXI");
}

run();
