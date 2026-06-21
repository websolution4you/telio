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
    const key = process.env.TELNYX_API_KEY;
    if (!key) return;

    try {
        const url = "https://api.telnyx.com/v2/detail_records?filter[record_type]=sip-trunking&page[size]=1";
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${key}`,
                'Accept': 'application/json'
            }
        });
        const json = await res.json();
        if (json.data && json.data[0]) {
            console.log("Keys in sip-trunking data:", Object.keys(json.data[0]));
            console.log("Sample record:", JSON.stringify(json.data[0], null, 2));
        } else {
            console.log("No data returned for sip-trunking. Response:", JSON.stringify(json, null, 2));
        }
    } catch (e: any) {
        console.error("Failed:", e.message);
    }
}

checkColumns();
