import { getProjectContext } from "./projectContext";

export async function getPizzaDashboardData(tenantId: string) {
    const context = await getProjectContext(tenantId, "pizza");
    const { db, tables, realtimeTables } = context;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
        { data: ordersToday },
        { data: ordersWeek },
        { data: menuItems },
        { data: streets },
    ] = await Promise.all([
        db
            .from(tables.orders)
            .select("*")
            .gte("created_at", startOfDay.toISOString())
            .lt("created_at", endOfDay.toISOString())
            .order("created_at", { ascending: false })
            .limit(100),
        db
            .from(tables.orders)
            .select("*")
            .order("created_at", { ascending: false })
            .limit(500),
        db
            .from(tables.menuItems)
            .select("*")
            .order("id"),
        db
            .from(tables.streets)
            .select("name"),
    ]);

    return {
        ordersToday: ordersToday || [],
        ordersWeek: ordersWeek || [],
        menuItems: menuItems || [],
        streets: (streets || []).map((street: { name: string }) => street.name),
        realtimeTables,
        tables,
    };
}

export async function getTaxiDashboardData(tenantId: string) {
    const context = await getProjectContext(tenantId, "taxi");
    const { db, tables, realtimeTables } = context;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
        { data: ridesToday },
        { data: ridesWeek },
        { data: prices },
        { data: calls },
    ] = await Promise.all([
        db
            .from(tables.rides)
            .select("*")
            .gte("created_at", startOfDay.toISOString())
            .lt("created_at", endOfDay.toISOString())
            .order("created_at", { ascending: false })
            .limit(100),
        db
            .from(tables.rides)
            .select("*")
            .order("created_at", { ascending: false })
            .limit(500),
        db
            .from(tables.prices)
            .select("*")
            .order("id"),
        db
            .from(tables.calls)
            .select("*")
            .order("started_at", { ascending: false })
            .limit(100),
    ]);

    console.log(`[DEBUG] Taxi Dashboard: RidesToday=${ridesToday?.length}, RidesWeek=${ridesWeek?.length}, Calls=${calls?.length}`);

    return {
        ridesToday: ridesToday || [],
        ridesWeek: ridesWeek || [],
        prices: prices || [],
        calls: calls || [],
        realtimeTables,
        tables,
    };
}
