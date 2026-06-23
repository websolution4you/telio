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
const supabaseKey = process.env.CORE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing CORE_SUPABASE_URL or CORE_SUPABASE_SERVICE_ROLE_KEY!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Attempting to enable realtime for 'bookings' table...");
    const { data, error } = await supabase.rpc('exec_sql', {
        sql: "alter publication supabase_realtime add table bookings;"
    });

    if (error) {
        console.error("Failed to enable realtime via exec_sql RPC:", error.message);
    } else {
        console.log("Realtime successfully enabled for bookings table!", data);
    }
}

run();
