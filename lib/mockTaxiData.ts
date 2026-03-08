export type TaxiRideStatus = "PENDING" | "EN_ROUTE" | "DONE" | "CANCELLED" | "CONFIRMED" | "COMPLETED";

export interface TaxiRide {
    id: string;
    tenant_id: string;
    customer_phone: string | null;
    pickup_address: string;
    dropoff_address: string;
    price_estimate?: number | null;
    fare_amount?: number | null;
    status: TaxiRideStatus;
    notes: string | null;
    created_at: string;
    transcript?: string | null;
}

export interface TaxiPrice {
    id: string;
    from_zone: string;
    to_zone: string;
    price_weekday: number;
    price_weekend: number;
    is_active: boolean;
}

export const mockTaxiPrices: TaxiPrice[] = [
    { id: "1", from_zone: "Levoča", to_zone: "Levoča", price_weekday: 2.00, price_weekend: 2.50, is_active: true },
    { id: "2", from_zone: "Levoča", to_zone: "Levočská Dolina", price_weekday: 4.00, price_weekend: 4.00, is_active: true },
    { id: "3", from_zone: "Levoča", to_zone: "SNV", price_weekday: 10.00, price_weekend: 10.00, is_active: true },
];

export function getRideStatus(createdAt: string, dbStatus?: TaxiRideStatus): TaxiRideStatus {
    // Ak už je v databáze iný status ako PENDING (napr. COMPLETED, CANCELLED), použijeme ten.
    if (dbStatus && dbStatus !== "PENDING") return dbStatus;

    const time = new Date(createdAt).getTime();
    const diffMins = (Date.now() - time) / 60000;
    if (diffMins < 5) return "PENDING";
    if (diffMins < 10) return "EN_ROUTE";
    return "DONE";
}

function generateMockTaxiRides(): TaxiRide[] {
    const rides: TaxiRide[] = [];
    const zones = ["Námestie majstra pavla", "Sídlisko Západ", "Košická", "Ždiarska", "Nemocnica", "Autobusová stanica"];

    // Generovanie histórie (posledných 7 dní)
    for (let i = 0; i < 150; i++) {
        const d = new Date();
        d.setDate(d.getDate() - Math.floor(Math.random() * 7));
        d.setHours(10 + Math.floor(Math.random() * 12));
        d.setMinutes(Math.floor(Math.random() * 60));
        rides.push({
            id: `r_hist_${i}`,
            tenant_id: "taxi-1",
            customer_phone: `+421 90${Math.floor(100000 + Math.random() * 800000)}`,
            pickup_address: zones[Math.floor(Math.random() * zones.length)],
            dropoff_address: zones[Math.floor(Math.random() * zones.length)],
            price_estimate: 2 + Math.random() * 4,
            status: "DONE",
            notes: null,
            created_at: d.toISOString(),
            transcript: `Zákazník požadoval odvoz z ${zones[Math.floor(Math.random() * zones.length)]}. AI prijala objednávku bez problémov.`,
        });
    }

    // Generovanie live jázd pre aktuálny deň
    const now = new Date();
    [1, 3, 6, 8, 15, 25, 40].forEach((minAgo, idx) => {
        const d = new Date(now.getTime() - minAgo * 60000);
        rides.push({
            id: `r_recent_${idx}`,
            tenant_id: "taxi-1",
            customer_phone: `+421 905 ${100 + idx} ${200 + idx}`,
            pickup_address: "Centrum",
            dropoff_address: zones[idx % zones.length],
            price_estimate: 2.50 + (idx * 0.5),
            status: getRideStatus(d.toISOString()),
            notes: null,
            created_at: d.toISOString(),
            transcript: `Prosím pošlite taxík z Centrum na adresu ${zones[idx % zones.length]}. Koľko to bude trvať a aká je cena?`
        });
    });

    return rides.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export const mockRides = generateMockTaxiRides();

export interface TaxiKpiData {
    ridesCount: number;
    revenue: number;
}

export function computeTaxiKpis(rides: TaxiRide[], daysCount: number = 1): TaxiKpiData {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - daysCount + 1);
    minDate.setHours(0, 0, 0, 0); // Od polnoci začiatku periody

    // Ak riešime "dnes" (daysCount === 1), dáme prísnejší string filter pre istotu 
    const isToday = daysCount === 1;
    const todayStr = new Date().toDateString();

    const filteredRides = rides.filter(r => {
        const d = new Date(r.created_at);
        if (isToday) return d.toDateString() === todayStr;
        return d.getTime() >= minDate.getTime();
    });

    const revenue = filteredRides.reduce((acc, r) => acc + (r.fare_amount || r.price_estimate || 0), 0);

    return {
        ridesCount: filteredRides.length,
        revenue: revenue
    };
}
