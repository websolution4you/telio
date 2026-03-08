import { getCoreDb, getPizzaDb } from "./supabase";

export async function getTenantDataSource(tenantId: string) {
    const coreDb = getCoreDb();

    // Načíta tenant konfiguráciu
    const { data: tenant, error: tErr } = await coreDb
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .single();

    if (tErr || !tenant) {
        throw new Error("Tenant not found or error loading tenant data.");
    }

    // Načíta data_source pre daný tenant
    const { data: dataSource, error: dsErr } = await coreDb
        .from("data_sources")
        .select("*")
        .eq("tenant_id", tenantId)
        .single();

    if (dsErr || !dataSource) {
        throw new Error("Data source not found for this tenant.");
    }

    return { tenant, dataSource };
}

export async function getPizzaDashboardData(tenantId: string) {
    // 1. Získa routing informácie z Core DB
    const { tenant, dataSource } = await getTenantDataSource(tenantId);

    if (tenant.project_type !== "pizza") {
        throw new Error("Tento tenant nemá projekt typu pizza (architektúra pripravená na ďalšie typy).");
    }

    // 2. Načíta dáta z cieľovej (Pizza) DB pre dashboard
    const pizzaDb = getPizzaDb();

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Parallel fetching
    const [
        { data: ordersToday },
        { data: ordersWeek },
        { data: menuItems },
        { data: streets }
    ] = await Promise.all([
        pizzaDb
            .from("pizza_orders")
            .select("*")
            .gte("created_at", startOfDay.toISOString())
            .lt("created_at", endOfDay.toISOString())
            .order("created_at", { ascending: false })
            .limit(50),
        pizzaDb
            .from("pizza_orders")
            .select("*")
            .gte("created_at", weekAgo.toISOString())
            .order("created_at", { ascending: false })
            .limit(500),
        pizzaDb
            .from("menu_items")
            .select("*")
            .order("id"),
        pizzaDb
            .from("streets")
            .select("name")
    ]);

    return {
        ordersToday: ordersToday || [],
        ordersWeek: ordersWeek || [],
        menuItems: menuItems || [],
        streets: (streets || []).map((s: any) => s.name)
    };
}
