import { createClient } from "@supabase/supabase-js";
import { createCloudSqlClient, createDualWriteClient } from "./dualClient";

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

function getSupabaseBackupClient(label: string) {
    if (hasSharedDbConfig()) {
        return createNamedClient(
            process.env.SHARED_SUPABASE_URL,
            process.env.SHARED_SUPABASE_SERVICE_ROLE_KEY,
            label
        );
    }
    return createNamedClient(
        process.env.CORE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.CORE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
        label
    );
}

/**
 * Returns the primary database client for Telio.
 * - READ: Google Cloud SQL (PostgreSQL via Cloud Run PostgREST)
 * - WRITE: Google Cloud SQL + live mirror dual-write to Supabase backup
 */
export function getCoreDb() {
    const cloudSqlDb = createCloudSqlClient();
    const backupDb = getSupabaseBackupClient("CORE BACKUP");
    return createDualWriteClient(cloudSqlDb, backupDb);
}

export function getCoreServiceDb() {
    const cloudSqlDb = createCloudSqlClient();
    const backupDb = hasSharedDbConfig()
        ? createNamedClient(
              process.env.SHARED_SUPABASE_URL,
              process.env.WALLET_SUPABASE_SERVICE_ROLE_KEY || process.env.SHARED_SUPABASE_SERVICE_ROLE_KEY,
              "WALLET SHARED BACKUP"
          )
        : createNamedClient(
              process.env.CORE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
              process.env.WALLET_SUPABASE_SERVICE_ROLE_KEY || process.env.CORE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
              "WALLET CORE BACKUP"
          );

    return createDualWriteClient(cloudSqlDb, backupDb);
}

export function getSharedDb() {
    return getCoreDb();
}

export function getPizzaDb() {
    return getCoreDb();
}

export function getTaxiDb() {
    return getCoreDb();
}
