import { createClient } from "@supabase/supabase-js";

export function getCoreDb() {
    const url = process.env.CORE_SUPABASE_URL!;
    const key = process.env.CORE_SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !key) {
        console.warn("CORE_SUPABASE_URL or CORE_SUPABASE_SERVICE_ROLE_KEY is missing");
    }
    return createClient(url || "", key || "");
}

export function getPizzaDb() {
    const url = process.env.PIZZA_SUPABASE_URL!;
    const key = process.env.PIZZA_SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !key) {
        console.warn("PIZZA_SUPABASE_URL or PIZZA_SUPABASE_SERVICE_ROLE_KEY is missing");
    }
    return createClient(url || "", key || "");
}
