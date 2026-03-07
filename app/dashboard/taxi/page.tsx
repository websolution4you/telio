"use client";

import React, { useState, useMemo, useEffect } from "react";
import DashboardNav from "@/components/dashboard/DashboardNav";
import { mockRides, mockTaxiPrices, computeTaxiKpis, getRideStatus, type TaxiRide, type TaxiPrice } from "@/lib/mockTaxiData";
import { Navigation, MapPin, Phone, ChevronDown, ChevronUp } from "lucide-react";

import SalesChart from "@/components/dashboard/SalesChart";
import OrdersHeatmap from "@/components/dashboard/OrdersHeatmap";
import OrdersMap from "@/components/dashboard/OrdersMap";

// --- Pomocné funkcie pre Grafy (analogicky ako Pizza) ---

const SK_DAY_NAMES = ["Ne", "Po", "Ut", "St", "Št", "Pi", "So"];

function getLast7DayLabels(): string[] {
    const result: string[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        result.push(SK_DAY_NAMES[d.getDay()]);
    }
    return result;
}

function buildTaxiSalesData(rides: TaxiRide[]) {
    const days = getLast7DayLabels();
    const buckets: Record<string, { orders: number; revenue: number }> = {};
    days.forEach((d) => (buckets[d] = { orders: 0, revenue: 0 }));

    rides.forEach((r) => {
        const d = new Date(r.created_at);
        const label = SK_DAY_NAMES[d.getDay()];
        if (buckets[label]) {
            buckets[label].orders += 1;
            buckets[label].revenue += r.price_estimate || 0;
        }
    });

    return days.map((day) => ({
        day,
        orders: buckets[day].orders,
        revenue: Math.round(buckets[day].revenue * 100) / 100,
    }));
}

function buildTaxiHeatmapData(rides: TaxiRide[]) {
    const days = getLast7DayLabels();
    const map = new Map<string, number>();

    rides.forEach((r) => {
        const d = new Date(r.created_at);
        const dayLabel = SK_DAY_NAMES[d.getDay()];
        const hour = d.getHours();
        const key = `${dayLabel}-${hour}`;
        map.set(key, (map.get(key) ?? 0) + 1);
    });

    const data: any[] = [];
    days.forEach((day) => {
        for (let h = 10; h <= 22; h++) {
            const key = `${day}-${h}`;
            data.push({ day, hour: h, count: map.get(key) ?? 0 });
        }
    });

    return { data, days };
}


// --- Komponenty UI ---

function TaxiKpiCards({ rides }: { rides: TaxiRide[] }) {
    const [period, setPeriod] = useState<1 | 7 | 30>(1);
    const data = useMemo(() => computeTaxiKpis(rides, period), [rides, period]);

    return (
        <div style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginBottom: "1rem" }}>
                <button onClick={() => setPeriod(1)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, background: period === 1 ? "var(--cyan)" : "transparent", color: period === 1 ? "#000" : "var(--text-muted)", border: "1px solid", borderColor: period === 1 ? "var(--cyan)" : "var(--border)", cursor: "pointer", transition: "all 0.2s" }}>Dnes</button>
                <button onClick={() => setPeriod(7)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, background: period === 7 ? "var(--cyan)" : "transparent", color: period === 7 ? "#000" : "var(--text-muted)", border: "1px solid", borderColor: period === 7 ? "var(--cyan)" : "var(--border)", cursor: "pointer", transition: "all 0.2s" }}>7 dní</button>
                <button onClick={() => setPeriod(30)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, background: period === 30 ? "var(--cyan)" : "transparent", color: period === 30 ? "#000" : "var(--text-muted)", border: "1px solid", borderColor: period === 30 ? "var(--cyan)" : "var(--border)", cursor: "pointer", transition: "all 0.2s" }}>30 dní</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "1.25rem" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>{period === 1 ? "Dnešné jazdy" : "Jazdy celkom"}</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#fff" }}>{data.ridesCount}</div>
                </div>
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "1.25rem" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>Obrat (odhad)</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--cyan)" }}>
                        {data.revenue.toFixed(2)} €
                    </div>
                </div>
            </div>
        </div>
    );
}

function TaxiRidesTable({ rides }: { rides: TaxiRide[] }) {
    // Rozbalovanie
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    // Časovač na prepočítanie statusu (každých 10s)
    const [, setCurrentTime] = useState(Date.now());
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 10000);
        return () => clearInterval(interval);
    }, []);

    // Filter na dnešné zobrazenie a limit na 15 záznamov (ako Pizza)
    const todayStr = new Date().toDateString();
    const displayRides = rides.filter(r => new Date(r.created_at).toDateString() === todayStr).slice(0, 15);

    return (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "1.5rem", flex: 2, overflowX: "auto" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#fff", marginBottom: "1rem" }}>Aktuálne jazdy (Dnes)</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                        <th style={{ padding: "0 12px 12px" }}>Čas</th>
                        <th style={{ padding: "0 12px 12px" }}>Zákazník (Telefón)</th>
                        <th style={{ padding: "0 12px 12px" }}>Trasa (Nástup &gt; Výstup)</th>
                        <th style={{ padding: "0 12px 12px" }}>Stav</th>
                        <th style={{ padding: "0 12px 12px", width: "40px" }}></th>
                    </tr>
                </thead>
                <tbody>
                    {displayRides.map(r => {
                        // Dynamicky stav pre fake live efekt
                        const currentStatus = getRideStatus(r.created_at);
                        const isExpanded = expandedRowId === r.id;

                        return (
                            <React.Fragment key={r.id}>
                                <tr
                                    onClick={() => setExpandedRowId(isExpanded ? null : r.id)}
                                    style={{
                                        borderBottom: isExpanded ? "none" : "1px solid rgba(255,255,255,0.05)",
                                        cursor: "pointer",
                                        background: isExpanded ? "rgba(255, 255, 255, 0.02)" : "transparent",
                                        transition: "background 0.2s"
                                    }}
                                >
                                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                        {new Date(r.created_at).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}
                                    </td>
                                    <td style={{ padding: "12px", fontSize: "0.85rem" }}>
                                        <div style={{ color: "var(--cyan)", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px" }}>
                                            <Phone size={12} /> {r.customer_phone || "Neznáme"}
                                        </div>
                                    </td>
                                    <td style={{ padding: "12px", fontSize: "0.85rem" }}>
                                        <div style={{ color: "#fff", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                                            <MapPin size={12} style={{ color: "rgba(255, 255, 255, 0.4)" }} /> {r.pickup_address}
                                        </div>
                                        <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "6px" }}>
                                            <Navigation size={12} style={{ color: "var(--cyan)" }} /> {r.dropoff_address}
                                        </div>
                                    </td>
                                    <td style={{ padding: "12px", fontSize: "0.85rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <span style={{
                                                padding: "4px 8px",
                                                borderRadius: 6,
                                                fontSize: "0.7rem",
                                                fontWeight: 600,
                                                background: currentStatus === "PENDING" ? "rgba(245, 158, 11, 0.15)" : currentStatus === "EN_ROUTE" ? "rgba(0, 255, 209, 0.15)" : "rgba(255,255,255,0.05)",
                                                color: currentStatus === "PENDING" ? "#f59e0b" : currentStatus === "EN_ROUTE" ? "var(--cyan)" : "var(--text-muted)",
                                            }}>
                                                {currentStatus === "PENDING" ? "ČAKÁ (< 5m)" : currentStatus === "EN_ROUTE" ? "NA CESTE" : "VYBAVENÉ"}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: "12px", textAlign: "right", color: "var(--text-muted)" }}>
                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </td>
                                </tr>
                                {isExpanded && (
                                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255, 255, 255, 0.02)" }}>
                                        <td colSpan={5} style={{ padding: "0 12px 16px 12px" }}>
                                            <div style={{ padding: "12px", background: "rgba(0,0,0,0.2)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                                                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Prepis hovoru</div>
                                                <div style={{ fontSize: "0.85rem", color: "#e2e8f0", lineHeight: 1.5 }}>
                                                    {r.transcript ? `„${r.transcript}“` : "Pre tento hovor nie je k dispozícii prepis."}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function TaxiPricesTable({ prices }: { prices: TaxiPrice[] }) {
    return (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "1.5rem", flex: 1, minWidth: "300px" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#fff", marginBottom: "0.5rem" }}>Cenník zón</h2>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "1rem" }}>Aktívne nastavenie taríf pre AI agenta</p>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                        <th style={{ padding: "0 0 8px 0" }}>Zóna Od &gt; Do</th>
                        <th style={{ padding: "0 0 8px 0" }}>Cez deň</th>
                        <th style={{ padding: "0 0 8px 0" }}>Cez víkend</th>
                    </tr>
                </thead>
                <tbody>
                    {prices.map(p => (
                        <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "10px 0", fontSize: "0.85rem", color: "#fff" }}>
                                {p.from_zone} &gt; {p.to_zone}
                            </td>
                            <td style={{ padding: "10px 0", fontSize: "0.85rem", color: "var(--cyan)", fontWeight: 600 }}>{p.price_weekday.toFixed(2)} €</td>
                            <td style={{ padding: "10px 0", fontSize: "0.85rem", color: "rgba(0, 255, 209, 0.6)", fontWeight: 600 }}>{p.price_weekend.toFixed(2)} €</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}


// --- Main Page ---

export default function TaxiDashboardPage() {
    const salesData = useMemo(() => buildTaxiSalesData(mockRides), []);
    const heatmap = useMemo(() => buildTaxiHeatmapData(mockRides), []);

    // Prispôsobenie mapových pípov pre OrdersMap (Očakáva pole s `delivery_address` a `created_at`)
    const todayStr = new Date().toDateString();

    // Na mape chceme zobraziť miesto VÝSTUPU (dropoff_address), dá sa to zmeniť aj na pickup_address !
    const mappedOrdersToday = mockRides
        .filter(r => new Date(r.created_at).toDateString() === todayStr)
        .map(r => ({ ...r, delivery_address: r.dropoff_address, total_price: String(r.price_estimate), status: getRideStatus(r.created_at) === "DONE" ? "DONE" : "NEW" } as any));

    const mappedOrdersWeek = mockRides
        .map(r => ({ ...r, delivery_address: r.dropoff_address, total_price: String(r.price_estimate), status: getRideStatus(r.created_at) === "DONE" ? "DONE" : "NEW" } as any));

    // Nastavenie pevných známych ulíc/zón (z Pizza modulu sú to Streets)
    const defaultStreets = ["Námestie majstra pavla", "Sídlisko Západ", "Košická", "Ždiarska", "Czausika", "Nemocnica", "Autobusová stanica"];

    return (
        <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
            <DashboardNav />

            <main style={{ maxWidth: "90rem", margin: "0 auto", padding: "2rem" }}>
                <div style={{ marginBottom: "1.5rem" }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: "0.5rem" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Mock Demo Dáta (Taxi)</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fff" }}>Taxi Dispečing</h1>
                    </div>
                </div>

                <TaxiKpiCards rides={mockRides} />

                {/* Tabuľka jázd */}
                <div style={{ marginBottom: "1.5rem" }}>
                    <TaxiRidesTable rides={mockRides} />
                </div>

                {/* Predaj (7 dní) + Heatmapa objednávok */}
                <div
                    className="charts-row"
                    style={{ display: "flex", gap: "1.5rem", alignItems: "stretch", marginBottom: "1.5rem" }}
                >
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                        <SalesChart data={salesData} />
                    </div>
                    <OrdersHeatmap data={heatmap.data} days={heatmap.days} />
                </div>

                {/* Heatmapa miest/ulíc (OrdersMap) + Cenník zón */}
                <div
                    className="charts-row"
                    style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap" }}
                >
                    <OrdersMap ordersToday={mappedOrdersToday} ordersWeek={mappedOrdersWeek} dbStreets={defaultStreets} />
                    <TaxiPricesTable prices={mockTaxiPrices} />
                </div>
            </main>
        </div>
    );
}
