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
    if (hasSharedDbConfig()) {
        return getSharedDb();
    }
    return getCoreServiceDb();
}

export function getCoreServiceDb() {
    const url = process.env.CORE_SUPABASE_URL;
    const key = process.env.CORE_SUPABASE_SERVICE_ROLE_KEY;

    if (process.env.VERCEL_ENV === "preview") {
        let urlProjectRef = "invalid-or-missing";
        let keyType = "missing";
        let keyRole = "unknown";
        let keyProjectRef = "not-available";

        try {
            if (url) urlProjectRef = new URL(url).hostname.split(".")[0];
        } catch {}

        if (key) {
            if (key.startsWith("sb_secret_")) {
                keyType = "supabase-secret";
                keyRole = "service-role";
            } else if (key.split(".").length === 3) {
                keyType = "jwt";
                try {
                    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString());
                    keyRole = payload.role || "missing-role";
                    keyProjectRef = payload.ref || "missing-ref";
                } catch {
                    keyRole = "invalid-jwt";
                }
            } else {
                keyType = "unknown";
            }
        }

        console.info("CORE Supabase wallet diagnostics", {
            urlProjectRef,
            keyType,
            keyRole,
            keyProjectRef,
        });
    }

    return createNamedClient(url, key, "CORE");
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
