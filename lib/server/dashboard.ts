import { getProjectContext } from "./projectContext";

export async function getPizzaDashboardData(tenantId: string) {
    const context = await getProjectContext(tenantId, "pizza");
    const { db, tables, realtimeTables } = context;

    // Explicitly calculate start/end of day for Slovakia (UTC+1)
    // To be safe, we calculate what "today" means in UTC for a UTC+1 observer
    const now = new Date();
    const slovakiaNow = new Date(now.getTime() + (1 * 60 * 60 * 1000)); // Shift to UTC+1
    const startOfDay = new Date(Date.UTC(slovakiaNow.getUTCFullYear(), slovakiaNow.getUTCMonth(), slovakiaNow.getUTCDate(), 0, 0, 0));
    startOfDay.setTime(startOfDay.getTime() - (1 * 60 * 60 * 1000)); // Shift back to UTC for DB query
    
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    console.log(`[DEBUG] Dashboard Range (UTC): ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

    const [
        { data: ordersToday },
        { data: ordersWeek },
        { data: menuItems },
        { data: streets },
    ] = await Promise.all([
        db
            .from(tables.orders)
            .select("*")
            // Odstránený tenant filter pre zobrazenie všetkých
            .gte("created_at", startOfDay.toISOString())
            .lt("created_at", endOfDay.toISOString())
            .order("created_at", { ascending: false })
            .limit(100),
        db
            .from(tables.orders)
            .select("*")
            // Odstránený tenant filter pre zobrazenie všetkých
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

    const kpisToday = calculateKpis(ordersToday || []);
    const kpisWeek = calculateKpis(ordersWeek || []);

    return {
        ordersToday: ordersToday || [],
        ordersWeek: ordersWeek || [],
        kpisToday,
        kpisWeek,
        menuItems: menuItems || [],
        streets: (streets || []).map((street: { name: string }) => street.name),
        realtimeTables,
        tables,
    };
}

export async function getTaxiDashboardData(tenantId: string) {
    const context = await getProjectContext(tenantId, "taxi");
    const { db, tables, realtimeTables } = context;

    // Explicitly calculate start/end of day for Slovakia (UTC+1)
    const now = new Date();
    const slovakiaNow = new Date(now.getTime() + (1 * 60 * 60 * 1000));
    const startOfDay = new Date(Date.UTC(slovakiaNow.getUTCFullYear(), slovakiaNow.getUTCMonth(), slovakiaNow.getUTCDate(), 0, 0, 0));
    startOfDay.setTime(startOfDay.getTime() - (1 * 60 * 60 * 1000));
    
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const [
        { data: ridesToday },
        { data: ridesWeek },
        { data: prices },
        { data: calls },
    ] = await Promise.all([
        db
            .from(tables.rides)
            .select("*")
            // Odstránený tenant filter pre zobrazenie všetkých
            .gte("created_at", startOfDay.toISOString())
            .lt("created_at", endOfDay.toISOString())
            .order("created_at", { ascending: false })
            .limit(100),
        db
            .from(tables.rides)
            .select("*")
            // Odstránený tenant filter pre zobrazenie všetkých
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

    const kpisToday = calculateTaxiKpis(ridesToday || []);
    const kpisWeek = calculateTaxiKpis(ridesWeek || []);

    return {
        ridesToday: ridesToday || [],
        ridesWeek: ridesWeek || [],
        kpisToday,
        kpisWeek,
        prices: prices || [],
        calls: (calls || []).slice(0, 50),
        realtimeTables,
        tables,
    };
}

function calculateKpis(orders: any[]) {
    const totalOrders = orders.length;
    let totalRevenue = 0;
    
    orders.forEach(order => {
        const price = parseFloat(order.total_price);
        if (!isNaN(price)) {
            totalRevenue += price;
        }
    });

    return {
        totalOrders,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        averageOrderValue: totalOrders > 0 ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0
    };
}

function calculateTaxiKpis(rides: any[]) {
    const totalRides = rides.length;
    let totalRevenue = 0;
    
    rides.forEach(ride => {
        const price = ride.fare_amount || ride.price_estimate || 0;
        totalRevenue += parseFloat(String(price));
    });

    return {
        totalRides,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        averageRideValue: totalRides > 0 ? parseFloat((totalRevenue / totalRides).toFixed(2)) : 0
    };
}
