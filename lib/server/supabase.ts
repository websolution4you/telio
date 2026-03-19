import { createClient } from "@supabase/supabase-js";

function createNamedClient(url: string | undefined, key: string | undefined, label: string) {
    if (!url || !key) {
        console.warn(`${label} Supabase credentials are missing`);
    }

    return createClient(url || "", key || "");
}

export function hasSharedDbConfig() {
    return Boolean(
        process.env.SHARED_SUPABASE_URL && process.env.SHARED_SUPABASE_SERVICE_ROLE_KEY
    );
}

export function getCoreDb() {
    return createNamedClient(
        process.env.CORE_SUPABASE_URL,
        process.env.CORE_SUPABASE_SERVICE_ROLE_KEY,
        "CORE"
    );
}

export function getSharedDb() {
    return createNamedClient(
        process.env.SHARED_SUPABASE_URL,
        process.env.SHARED_SUPABASE_SERVICE_ROLE_KEY,
        "SHARED"
    );
}

export function getPizzaDb() {
    return getCoreDb();
}

export function getTaxiDb() {
    return getCoreDb();
}
