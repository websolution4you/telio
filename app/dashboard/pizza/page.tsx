"use client";

import { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import KpiCards from "@/components/dashboard/KpiCards";

import OrdersTable from "@/components/dashboard/OrdersTable";
import SalesChart from "@/components/dashboard/SalesChart";
import type { DaySalesData } from "@/components/dashboard/SalesChart";
import OrdersHeatmap from "@/components/dashboard/OrdersHeatmap";
import type { HeatmapData } from "@/components/dashboard/OrdersHeatmap";
import OrdersMap from "@/components/dashboard/OrdersMap";
import MenuTable from "@/components/dashboard/MenuTable";
import type { MenuItem } from "@/components/dashboard/MenuTable";

import { fetchPizzaDashboardAction } from "@/app/actions/dashboard";
import { supabase } from "@/lib/supabase";

// Funkcia na prehraný zvuk pri novej objednávke (pomocou Web Audio API)
const playNotificationSound = () => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Funkcia na vytvorenie tónu
        const playTone = (freq: number, startTime: number, duration: number, volume: number) => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, startTime);
            oscillator.frequency.exponentialRampToValueAtTime(freq * 0.8, startTime + duration);
            
            gainNode.gain.setValueAtTime(volume, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };

        const now = audioCtx.currentTime;
        // Akord (C6, E6, G6) pre príjemnejší "cink"
        playTone(1046.50, now, 0.6, 0.1); // C6
        playTone(1318.51, now + 0.05, 0.5, 0.07); // E6
        playTone(1567.98, now + 0.1, 0.4, 0.05); // G6
    } catch (e) {
        console.error("Audio play failed:", e);
    }
};

import {
    mockOrders,
    computeKpis,
    parseTotalPrice,
    type PizzaOrder,
    type KpiData,
    type AttentionItem,
} from "@/lib/mockData";

// ── Helpers for charts ──────────────────────────────────────

const SK_DAY_NAMES = ["Ne", "Po", "Ut", "St", "Št", "Pi", "So"];

function getDayLabels(daysCount: number): string[] {
    const result: string[] = [];
    for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        if (daysCount > 7) {
            // Pre viac ako 7 dní používame formát D.M.
            result.push(`${d.getDate()}.${d.getMonth() + 1}.`);
        } else {
            result.push(SK_DAY_NAMES[d.getDay()]);
        }
    }
    return result;
}

function buildSalesData(orders: PizzaOrder[], periodDays: number): DaySalesData[] {
    const days = getDayLabels(periodDays);
    const buckets: Record<string, { orders: number; revenue: number }> = {};
    days.forEach((d) => (buckets[d] = { orders: 0, revenue: 0 }));

    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - periodDays);

    orders.forEach((o) => {
        const d = new Date(o.created_at);
        if (d < cutoffDate) return;

        let label = "";
        if (periodDays > 7) {
            label = `${d.getDate()}.${d.getMonth() + 1}.`;
        } else {
            label = SK_DAY_NAMES[d.getDay()];
        }

        if (buckets[label]) {
            buckets[label].orders += 1;
            buckets[label].revenue += parseTotalPrice(o.total_price);
        }
    });

    return days.map((day) => ({
        day,
        orders: buckets[day].orders,
        revenue: Math.round(buckets[day].revenue * 100) / 100,
    }));
}

function buildHeatmapData(orders: PizzaOrder[], periodDays: number): { data: HeatmapData[]; days: string[] } {
    // Heatmapa by mala mať vždy len dni v týždni, bez ohľadu na to či agregujeme za 7 alebo 30 dní
    const days = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];
    const map = new Map<string, number>();

    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - periodDays);

    orders.forEach((o) => {
        const d = new Date(o.created_at);
        if (d < cutoffDate) return;
        
        const dayLabel = SK_DAY_NAMES[d.getDay()];
        const hour = d.getHours();
        const key = `${dayLabel}-${hour}`;
        map.set(key, (map.get(key) ?? 0) + 1);
    });

    const data: HeatmapData[] = [];
    days.forEach((day) => {
        for (let h = 10; h <= 22; h++) {
            const key = `${day}-${h}`;
            data.push({ day, hour: h, count: map.get(key) ?? 0 });
        }
    });

    return { data, days };
}

// ── Main Dashboard ──────────────────────────────────────────

export default function DashboardPage() {
    const [orders, setOrders] = useState<PizzaOrder[]>([]);
    const [allWeekOrders, setAllWeekOrders] = useState<PizzaOrder[]>([]);
    const [allMonthOrders, setAllMonthOrders] = useState<PizzaOrder[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [dbStreets, setDbStreets] = useState<string[]>([]);

    const [kpisToday, setKpisToday] = useState<KpiData>({
        ordersToday: 0,
        revenueToday: 0,
        avgOrder: 0,
        openOrders: 0,
        problems: 0,
        upsellRevenue: 0,
        upsellOffered: 0,
        upsellAccepted: 0,
    });
    const [kpisWeek, setKpisWeek] = useState<KpiData>({
        ordersToday: 0,
        revenueToday: 0,
        avgOrder: 0,
        openOrders: 0,
        problems: 0,
        upsellRevenue: 0,
        upsellOffered: 0,
        upsellAccepted: 0,
    });
    const [kpisMonth, setKpisMonth] = useState<KpiData>({
        ordersToday: 0,
        revenueToday: 0,
        avgOrder: 0,
        openOrders: 0,
        problems: 0,
        upsellRevenue: 0,
        upsellOffered: 0,
        upsellAccepted: 0,
    });

        const [loading, setLoading] = useState(true);
    const [dataSource, setDataSource] = useState<"server" | "mock">("mock");
    const [realtimeOrdersTable, setRealtimeOrdersTable] = useState("pizza_orders");
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    
    const [viewPeriod, setViewPeriod] = useState<1 | 7 | 30>(30);

        const updateOrdersAndKpis = useCallback((newOrders: PizzaOrder[], extendedOrders: PizzaOrder[]) => {
        setOrders(newOrders);
        
        // Filter out week orders from the extended (30 days) batch
        const now = new Date();
        const slovakiaNow = new Date(now.getTime() + (1 * 60 * 60 * 1000));
        const startOfDay = new Date(Date.UTC(slovakiaNow.getUTCFullYear(), slovakiaNow.getUTCMonth(), slovakiaNow.getUTCDate(), 0, 0, 0));
        startOfDay.setTime(startOfDay.getTime() - (1 * 60 * 60 * 1000));
        
        const sevenDaysAgo = new Date(startOfDay);
        sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
        const sevenDaysAgoTime = sevenDaysAgo.getTime();

        const weekOrders = extendedOrders.filter(o => new Date(o.created_at).getTime() >= sevenDaysAgoTime);

        setAllWeekOrders(weekOrders);
        setAllMonthOrders(extendedOrders);
        
        setKpisToday(computeKpis(newOrders));
        setKpisWeek(computeKpis(weekOrders));
        setKpisMonth(computeKpis(extendedOrders));
    }, []);

    // ── Fetch všetky dáta zo servera naraz ──
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchPizzaDashboardAction();
            if (res.success && res.data) {
                console.log(`[DEBUG] Dashboard fetched: Today=${res.data.ordersToday?.length}, Extended=${res.data.ordersExtended?.length}, Streets=${res.data.streets?.length}`);
                updateOrdersAndKpis(res.data.ordersToday as PizzaOrder[], res.data.ordersExtended as PizzaOrder[]);
                setMenuItems(res.data.menuItems);
                setDbStreets(res.data.streets);
                if (res.data.tables?.orders) {
                    setRealtimeOrdersTable(res.data.tables.orders);
                }
                setLastUpdated(new Date());
                setDataSource("server");
            } else {
                console.warn("Server action error, using mock:", res.error);
                updateOrdersAndKpis(mockOrders, mockOrders);
                setDataSource("mock");
            }
        } catch (err) {
            console.error("fetchData exception:", err);
            updateOrdersAndKpis(mockOrders, mockOrders);
            setDataSource("mock");
        } finally {
            setLoading(false);
        }
    }, [updateOrdersAndKpis]);

    // ── Initial fetch ──
    useEffect(() => {
        fetchData();

        return () => {
        };
    }, [fetchData]);

    useEffect(() => {
        const ordersSub = supabase
            .channel('pizza-orders-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: realtimeOrdersTable }, () => {
                console.log("Realtime (pizza): New order inserted!");
                fetchData();
                playNotificationSound();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: realtimeOrdersTable }, (payload) => {
                console.log("Realtime (pizza): Change detected", payload.eventType);
                if (payload.eventType !== 'INSERT') fetchData();
            })
            .subscribe((status) => {
                console.log("Realtime (pizza) status:", status);
            });

        return () => {
            supabase.removeChannel(ordersSub);
        };
    }, [fetchData, realtimeOrdersTable]);

                const ordersForPeriod = viewPeriod === 1 
        ? orders 
        : (viewPeriod === 7 ? allWeekOrders : allMonthOrders);
        
    const salesData = buildSalesData(ordersForPeriod, viewPeriod === 1 ? 1 : viewPeriod);
    const heatmap = buildHeatmapData(ordersForPeriod, viewPeriod === 1 ? 1 : viewPeriod);

    if (loading && orders.length === 0) {
        return (
            <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ width: 14, height: 14, border: "2px solid var(--cyan)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                    Načítavam telio (server-side)...
                </div>
                <style dangerouslySetInnerHTML={{ __html: `@keyframes spin {to {transform: rotate(360deg); } }` }} />
            </div>
        );
    }

    return (
        <div style={{ background: "var(--bg)", minHeight: "100vh", paddingTop: "100px" }}>
            <Navbar />

            <main
                style={{
                    maxWidth: "90rem",
                    margin: "0 auto",
                    padding: "2rem",
                }}
            >
                                                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span
                            style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: dataSource === "server" ? "#4ade80" : "#f59e0b",
                                display: "inline-block",
                            }}
                        />
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                            {loading
                                ? "Načítavam dáta..."
                                : dataSource === "server"
                                    ? `Live dáta zo Servera • Naposledy: ${lastUpdated.toLocaleTimeString("sk-SK")}`
                                    : "Mock dáta (Server fallback)"}
                        </span>
                    </div>
                </div>

                <DashboardHeader onRefresh={fetchData} />

                <div style={{ display: "flex", gap: "16px", justifyContent: "flex-end", marginBottom: "1.5rem", marginTop: "-1rem" }}>
                                            <button 
                                                onClick={() => setViewPeriod(1)} 
                                                className="flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200"
                                                style={{ 
                                                    padding: "4px 14px", 
                                                    background: viewPeriod === 1 ? "linear-gradient(135deg, #00FFD1, #00c9a7)" : "rgba(255,255,255,0.03)", 
                                                    color: viewPeriod === 1 ? "#050508" : "var(--text)", 
                                                    border: viewPeriod === 1 ? "none" : "1px solid var(--border)", 
                                                    cursor: "pointer",
                                                    boxShadow: viewPeriod === 1 ? "0 8px 16px rgba(0, 255, 209, 0.25)" : "none",
                                                    fontWeight: viewPeriod === 1 ? "bold" : "500"
                                                }}
                                                onMouseEnter={e => { if (viewPeriod !== 1) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#fff"; } }}
                                                onMouseLeave={e => { if (viewPeriod !== 1) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "var(--text)"; } }}
                                            >
                                                Dnes
                                            </button>
                                            <button 
                                                onClick={() => setViewPeriod(7)} 
                                                className="flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200"
                                                style={{ 
                                                    padding: "4px 14px", 
                                                    background: viewPeriod === 7 ? "linear-gradient(135deg, #00FFD1, #00c9a7)" : "rgba(255,255,255,0.03)", 
                                                    color: viewPeriod === 7 ? "#050508" : "var(--text)", 
                                                    border: viewPeriod === 7 ? "none" : "1px solid var(--border)", 
                                                    cursor: "pointer",
                                                    boxShadow: viewPeriod === 7 ? "0 8px 16px rgba(0, 255, 209, 0.25)" : "none",
                                                    fontWeight: viewPeriod === 7 ? "bold" : "500"
                                                }}
                                                onMouseEnter={e => { if (viewPeriod !== 7) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#fff"; } }}
                                                onMouseLeave={e => { if (viewPeriod !== 7) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "var(--text)"; } }}
                                            >
                                                7 dní
                                            </button>
                                            <button 
                                                onClick={() => setViewPeriod(30)} 
                                                className="flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200"
                                                style={{ 
                                                    padding: "4px 14px", 
                                                    background: viewPeriod === 30 ? "linear-gradient(135deg, #00FFD1, #00c9a7)" : "rgba(255,255,255,0.03)", 
                                                    color: viewPeriod === 30 ? "#050508" : "var(--text)", 
                                                    border: viewPeriod === 30 ? "none" : "1px solid var(--border)", 
                                                    cursor: "pointer",
                                                    boxShadow: viewPeriod === 30 ? "0 8px 16px rgba(0, 255, 209, 0.25)" : "none",
                                                    fontWeight: viewPeriod === 30 ? "bold" : "500"
                                                }}
                                                onMouseEnter={e => { if (viewPeriod !== 30) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#fff"; } }}
                                                onMouseLeave={e => { if (viewPeriod !== 30) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "var(--text)"; } }}
                                            >
                                                30 dní
                                            </button>
                                        </div>

                <KpiCards dataToday={kpisToday} dataWeek={kpisWeek} dataMonth={kpisMonth} overridePeriod={viewPeriod} />

                                {/* Main: Orders Table */}
                <div style={{ marginBottom: "1.5rem" }}>
                    <OrdersTable orders={allWeekOrders.length > 0 ? allWeekOrders.slice(0, 10) : orders.slice(0, 10)} />
                </div>

                <div id="charts-section" />

                                {/* Upsell + SalesChart + Heatmap row */}
                <div
                    className="charts-row"
                    style={{
                        display: "flex",
                        gap: "1.5rem",
                        alignItems: "stretch",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "1.5rem",
                            flex: 1,
                            minWidth: 0,
                        }}
                    >
                                                <SalesChart ordersToday={orders} ordersWeek={allWeekOrders} period={viewPeriod} />
                    </div>
                    <OrdersHeatmap ordersToday={orders} ordersWeek={allWeekOrders} period={viewPeriod} />
                </div>

                                {/* Full-width Orders Map */}
                                <div style={{ marginTop: "1.5rem" }}>
                                    <OrdersMap ordersToday={orders} ordersWeek={allWeekOrders} ordersMonth={allMonthOrders} dbStreets={dbStreets} period={viewPeriod} />
                                </div>
                                    {/* Menu Table below the map */}
                <div id="menu-section" style={{ marginTop: "1.5rem" }}>
                    <MenuTable items={menuItems} onRefresh={fetchData} />
                </div>
            </main>

        </div>
    );
}
