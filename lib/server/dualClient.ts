import { createClient, SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_CLOUDSQL_REST_URL = "https://telio-postgrest-652999054235.europe-west3.run.app";
const DEFAULT_CLOUDSQL_REST_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoidGVsaW9fYXBwIiwiaXNzIjoidGVsaW8iLCJleHAiOjIwODY4NDQ3NDN9.XuN3ftzpSsq3LxoxTzrlOYI0h2RJcVstOdf2E6Y4p4A";

export function createCloudSqlClient(): SupabaseClient {
    const url = process.env.CLOUDSQL_REST_URL || DEFAULT_CLOUDSQL_REST_URL;
    const key = process.env.CLOUDSQL_REST_KEY || DEFAULT_CLOUDSQL_REST_KEY;

    return createClient(url, key, {
        auth: { persistSession: false },
        global: {
            fetch: (input: RequestInfo | URL, init?: RequestInit) => {
                if (typeof input === "string") {
                    input = input.replace("/rest/v1/", "/");
                } else if (input instanceof URL) {
                    input = new URL(input.toString().replace("/rest/v1/", "/"));
                }
                return fetch(input, init);
            },
        },
    });
}

function prepareInsertPayload(args: any[], table: string) {
    if (table === "role_booking_policies") return args[0];
    const payload = args[0];
    if (Array.isArray(payload)) {
        return payload.map(item =>
            item && typeof item === "object" && !item.id
                ? { id: crypto.randomUUID(), ...item }
                : item
        );
    } else if (payload && typeof payload === "object" && !payload.id) {
        return { id: crypto.randomUUID(), ...payload };
    }
    return payload;
}

export function createDualWriteClient(
    primary: SupabaseClient,
    backup: SupabaseClient | null
): SupabaseClient {
    if (!backup) return primary;

    return new Proxy(primary, {
        get(target: any, prop: string | symbol) {
            if (prop === "from") {
                return (table: string) => {
                    const primBuilder = primary.from(table);
                    const bkpBuilder = backup ? backup.from(table) : null;
                    return wrapBuilder(primBuilder, bkpBuilder, table);
                };
            }
            if (prop === "rpc") {
                return async (fn: string, args?: any) => {
                    const primRes = await (primary as any).rpc(fn, args);
                    if (backup) {
                        (backup as any).rpc(fn, args).then((bRes: any) => {
                            if (bRes?.error) {
                                console.warn(`[DualWrite RPC] Backup mirror error on ${fn}:`, bRes.error.message);
                            }
                        }).catch((err: any) => {
                            console.warn(`[DualWrite RPC] Backup mirror exception on ${fn}:`, err?.message || err);
                        });
                    }
                    return primRes;
                };
            }
            return Reflect.get(target, prop);
        },
    }) as SupabaseClient;
}

function wrapBuilder(primBuilder: any, bkpBuilder: any, table: string) {
    return new Proxy(primBuilder, {
        get(t: any, prop: string | symbol) {
            const propName = String(prop);
            if (propName === "insert" || propName === "update" || propName === "delete" || propName === "upsert") {
                return (...args: any[]) => {
                    let finalArgs = args;
                    if (propName === "insert" || propName === "upsert") {
                        const prepared = prepareInsertPayload(args, table);
                        finalArgs = [prepared, ...args.slice(1)];
                    }
                    const primFilter = t[propName](...finalArgs);
                    let bkpFilter = bkpBuilder && typeof bkpBuilder[propName] === "function"
                        ? bkpBuilder[propName](...finalArgs)
                        : null;
                    return wrapFilterBuilder(primFilter, bkpFilter, table, propName);
                };
            }
            const orig = Reflect.get(t, prop);
            if (typeof orig === "function") {
                return (...args: any[]) => {
                    return orig.apply(t, args);
                };
            }
            return orig;
        },
    });
}

function wrapFilterBuilder(
    primFilter: any,
    bkpFilter: any,
    table: string,
    mutationType: string
) {
    let currentBkpFilter = bkpFilter;

    return new Proxy(primFilter, {
        get(t: any, prop: string | symbol) {
            if (prop === "then") {
                return async (resolve: any, reject: any) => {
                    try {
                        const primResult = await t;
                        if (currentBkpFilter && typeof currentBkpFilter.then === "function") {
                            currentBkpFilter
                                .then((bkpRes: any) => {
                                    if (bkpRes?.error) {
                                        console.warn(
                                            `[DualWrite Mirror] Backup error on ${table}.${mutationType}:`,
                                            bkpRes.error.message
                                        );
                                    }
                                })
                                .catch((err: any) => {
                                    console.warn(
                                        `[DualWrite Mirror] Backup exception on ${table}.${mutationType}:`,
                                        err?.message || err
                                    );
                                });
                        }
                        return resolve(primResult);
                    } catch (err) {
                        return reject(err);
                    }
                };
            }

            const orig = Reflect.get(t, prop);
            if (typeof orig === "function") {
                return (...args: any[]) => {
                    if (currentBkpFilter && typeof currentBkpFilter[String(prop)] === "function") {
                        currentBkpFilter = currentBkpFilter[String(prop)](...args);
                    }
                    const res = orig.apply(t, args);
                    return wrapFilterBuilder(res, currentBkpFilter, table, mutationType);
                };
            }
            return orig;
        },
    });
}
