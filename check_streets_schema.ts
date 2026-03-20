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

async function checkStreetsSchema() {
    const { data: cols, error } = await coreDb.rpc('get_table_columns', { table_name: 'streets' });
    if (error) {
        // Fallback: try to select one row and see keys
        const { data: row } = await coreDb.from("streets").select("*").limit(1);
        console.log("Streets row keys:", row ? Object.keys(row[0]) : "Empty");
    } else {
        console.log("Streets columns:", cols);
    }
}

checkStreetsSchema();
