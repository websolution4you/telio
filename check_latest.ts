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

async function checkDetailed() {
    console.log("Detailed check of latest 5 rides in CORE (iejmuamn...):");
    const { data, error } = await coreDb
        .from("taxi_rides")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
        
    if (data) {
        console.log(JSON.stringify(data, null, 2));
    } else {
        console.log("Error:", error?.message);
    }
}

checkDetailed();
