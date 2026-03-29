import { createClient } from "@supabase/supabase-js";

function createNamedClient(url: string | undefined, key: string | undefined, label: string) {
    if (!url || !key) {
        console.warn(`${label} Supabase client credentials are missing`);
    }

    return createClient(url || "", key || "");
}

function hasSharedClientConfig() {
    return Boolean(
        process.env.NEXT_PUBLIC_SHARED_SUPABASE_URL && process.env.NEXT_PUBLIC_SHARED_SUPABASE_ANON_KEY
    );
}

function getSharedClient() {
    return createNamedClient(
        process.env.NEXT_PUBLIC_SHARED_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SHARED_SUPABASE_ANON_KEY,
        "SHARED"
    );
}

function getPizzaClient() {
    if (hasSharedClientConfig()) {
        return getSharedClient();
    }

    return createNamedClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        "PIZZA"
    );
}

function getTaxiClient() {
    return getPizzaClient();
}

export const supabase = getPizzaClient();
export const taxiSupabase = getTaxiClient();
