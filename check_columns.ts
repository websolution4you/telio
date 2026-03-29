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

async function checkColumns() {
    const { data, error } = await coreDb.from("taxi_rides").select("*").limit(1);
    if (data && data[0]) {
        console.log("Columns found in taxi_rides:", Object.keys(data[0]));
        console.log("Sample row:", data[0]);
    } else {
        console.log("Failed to find taxi_rides data:", error?.message);
    }
}

checkColumns();
