import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

function loadEnv() {
    const envPaths = [
        path.resolve(process.cwd(), ".env.local"),
        path.resolve(process.cwd(), ".env")
    ];
    for (const envPath of envPaths) {
        if (fs.existsSync(envPath)) {
            console.log("Loading env from:", envPath);
            const envContent = fs.readFileSync(envPath, "utf8");
            envContent.split("\n").forEach((line) => {
                const parts = line.split("=");
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const value = parts.slice(1).join("=").trim().replace(/^"|"$/g, '');
                    if (key) {
                        process.env[key] = value;
                    }
                }
            });
        }
    }
}

loadEnv();

const supabaseUrl = process.env.CORE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.CORE_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key configured:", !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials!");
    process.exit(1);
}

const db = createClient(supabaseUrl, supabaseKey);

async function run() {
    // List tables or try querying
    console.log("Querying bookings...");
    const { data: bookings, error: bErr } = await db.from("bookings").select("*").limit(5);
    if (bErr) {
        console.error("Bookings query error:", bErr.message);
    } else {
        console.log("Bookings table exists. Rows found:", bookings?.length);
        if (bookings && bookings.length > 0) {
            console.log("Sample booking:", bookings[0]);
        }
    }

    console.log("Querying calendar_connections...");
    const { data: cals, error: cErr } = await db.from("calendar_connections").select("*").limit(5);
    if (cErr) {
        console.error("Calendar connections query error:", cErr.message);
    } else {
        console.log("Calendar connections table exists. Rows found:", cals?.length);
        if (cals && cals.length > 0) {
            console.log("Sample connection:", cals[0]);
        }
    }
}

run();
