"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardNav from "@/components/dashboard/DashboardNav";
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
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Vyšší tón (A5)
        oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5); // Klesanie k A4

        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
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

function getLast7DayLabels(): string[] {
    const result: string[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        result.push(SK_DAY_NAMES[d.getDay()]);
    }
    return result;
}

function buildSalesData(orders: PizzaOrder[]): DaySalesData[] {
    const days = getLast7DayLabels();
    const buckets: Record<string, { orders: number; revenue: number }> = {};
    days.forEach((d) => (buckets[d] = { orders: 0, revenue: 0 }));

    orders.forEach((o) => {
        const d = new Date(o.created_at);
        const label = SK_DAY_NAMES[d.getDay()];
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

function buildHeatmapData(orders: PizzaOrder[]): { data: HeatmapData[]; days: string[] } {
    const days = getLast7DayLabels();
    const map = new Map<string, number>();

    orders.forEach((o) => {
        const d = new Date(o.created_at);
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
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [dbStreets, setDbStreets] = useState<string[]>([]);

    const [kpisToday, setKpisToday] = useState<KpiData>({
        ordersToday: 0,
        revenueToday: 0,
        avgOrder: 0,
        openOrders: 0,
        upsellRevenue: 0,
        upsellOffered: 0,
        upsellAccepted: 0,
        problems: 0,
    });
    const [kpisWeek, setKpisWeek] = useState<KpiData>({
        ordersToday: 0,
        revenueToday: 0,
        avgOrder: 0,
        openOrders: 0,
        upsellRevenue: 0,
        upsellOffered: 0,
        upsellAccepted: 0,
        problems: 0,
    });

    const [loading, setLoading] = useState(true);
    const [dataSource, setDataSource] = useState<"server" | "mock">("mock");
    const [realtimeOrdersTable, setRealtimeOrdersTable] = useState("pizza_orders");

    const updateOrdersAndKpis = useCallback((newOrders: PizzaOrder[], weekOrders: PizzaOrder[]) => {
        setOrders(newOrders);
        setAllWeekOrders(weekOrders);
        setKpisToday(computeKpis(newOrders));
        setKpisWeek(computeKpis(weekOrders));
    }, []);

    // ── Fetch všetky dáta zo servera naraz ──
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchPizzaDashboardAction();
            if (res.success && res.data) {
                console.log(`[DEBUG] Dashboard fetched: Today=${res.data.ordersToday?.length}, Week=${res.data.ordersWeek?.length}, Streets=${res.data.streets?.length}`);
                updateOrdersAndKpis(res.data.ordersToday as PizzaOrder[], res.data.ordersWeek as PizzaOrder[]);
                setMenuItems(res.data.menuItems);
                setDbStreets(res.data.streets);
                if (res.data.tables?.orders) {
                    setRealtimeOrdersTable(res.data.tables.orders);
                }
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

    const salesData = buildSalesData(allWeekOrders.length > 0 ? allWeekOrders : orders);
    const heatmap = buildHeatmapData(allWeekOrders.length > 0 ? allWeekOrders : orders);

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
        <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
            <DashboardNav />

            <main
                style={{
                    maxWidth: "90rem",
                    margin: "0 auto",
                    padding: "2rem",
                }}
            >
                {/* Data source indicator */}
                <div className="flex items-center gap-2" style={{ marginBottom: "0.5rem" }}>
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
                                ? "Live dáta zo Servera"
                                : "Mock dáta (Server fallback)"}
                    </span>
                </div>

                <DashboardHeader onRefresh={fetchData} />
                <KpiCards dataToday={kpisToday} dataWeek={kpisWeek} />

                {/* Main: Orders Table */}
                <div style={{ marginBottom: "1.5rem" }}>
                    <OrdersTable orders={allWeekOrders.length > 0 ? allWeekOrders.slice(0, 20) : orders.slice(0, 20)} />
                </div>

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
                        <SalesChart data={salesData} />
                    </div>
                    <OrdersHeatmap data={heatmap.data} days={heatmap.days} />
                </div>

                {/* Full-width Orders Map */}
                <div style={{ marginTop: "1.5rem" }}>
                    <OrdersMap ordersToday={orders} ordersWeek={allWeekOrders} dbStreets={dbStreets} />
                </div>

                {/* Menu Table below the map */}
                <div style={{ marginTop: "1.5rem" }}>
                    <MenuTable items={menuItems} onRefresh={fetchData} />
                </div>
            </main>

        </div>
    );
}
