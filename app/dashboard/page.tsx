"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import DashboardNav from "@/components/dashboard/DashboardNav";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import KpiCards from "@/components/dashboard/KpiCards";
import AttentionList from "@/components/dashboard/AttentionList";
import OrdersTable from "@/components/dashboard/OrdersTable";
import SalesChart from "@/components/dashboard/SalesChart";
import type { DaySalesData } from "@/components/dashboard/SalesChart";
import OrdersHeatmap from "@/components/dashboard/OrdersHeatmap";
import type { HeatmapData } from "@/components/dashboard/OrdersHeatmap";
import { supabase } from "@/lib/supabase";
import {
    mockOrders,
    mockAttentionItems,
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
    const [orders, setOrders] = useState<PizzaOrder[]>(mockOrders);
    const [allWeekOrders, setAllWeekOrders] = useState<PizzaOrder[]>([]);
    const [kpis, setKpis] = useState<KpiData>(computeKpis(mockOrders));
    const [attentionItems] = useState<AttentionItem[]>(mockAttentionItems);
    const [loading, setLoading] = useState(true);
    const [dataSource, setDataSource] = useState<"supabase" | "mock">("mock");
    const [realtimeConnected, setRealtimeConnected] = useState(false);

    const [showProblems, setShowProblems] = useState(false);

    const ordersRef = useRef<PizzaOrder[]>(orders);
    ordersRef.current = orders;
    const dataSourceRef = useRef(dataSource);
    dataSourceRef.current = dataSource;

    const updateOrdersAndKpis = useCallback((newOrders: PizzaOrder[]) => {
        setOrders(newOrders);
        setKpis(computeKpis(newOrders));
    }, []);

    // ── Fetch today's orders ──
    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const endOfDay = new Date(startOfDay);
            endOfDay.setDate(endOfDay.getDate() + 1);

            const { data, error } = await supabase
                .from("pizza_orders")
                .select("*")
                .gte("created_at", startOfDay.toISOString())
                .lt("created_at", endOfDay.toISOString())
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) {
                console.warn("Supabase query failed, using mock data:", error.message);
                updateOrdersAndKpis(mockOrders);
                setDataSource("mock");
            } else if (data && data.length > 0) {
                updateOrdersAndKpis(data as PizzaOrder[]);
                setDataSource("supabase");
            } else {
                const { data: allData, error: allError } = await supabase
                    .from("pizza_orders")
                    .select("*")
                    .order("created_at", { ascending: false })
                    .limit(50);

                if (allError || !allData || allData.length === 0) {
                    updateOrdersAndKpis(mockOrders);
                    setDataSource("mock");
                } else {
                    updateOrdersAndKpis(allData as PizzaOrder[]);
                    setDataSource("supabase");
                }
            }
        } catch {
            updateOrdersAndKpis(mockOrders);
            setDataSource("mock");
        } finally {
            setLoading(false);
        }
    }, [updateOrdersAndKpis]);

    // ── Fetch last 7 days for charts ──
    const fetchWeekOrders = useCallback(async () => {
        try {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);

            const { data, error } = await supabase
                .from("pizza_orders")
                .select("created_at, total_price, status")
                .gte("created_at", weekAgo.toISOString())
                .order("created_at", { ascending: false })
                .limit(500);

            if (!error && data && data.length > 0) {
                setAllWeekOrders(data as PizzaOrder[]);
            }
        } catch {
            // silently fail — charts just show empty
        }
    }, []);

    // ── Initial fetch ──
    useEffect(() => {
        fetchOrders();
        fetchWeekOrders();
    }, [fetchOrders, fetchWeekOrders]);

    // ── Supabase Realtime subscription ──
    useEffect(() => {
        const channel = supabase
            .channel("pizza_orders_realtime")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "pizza_orders" },
                (payload) => {
                    console.log("🔔 Realtime INSERT:", payload.new);
                    const newOrder = payload.new as PizzaOrder;
                    const updated = [newOrder, ...ordersRef.current].slice(0, 50);
                    updateOrdersAndKpis(updated);
                    setDataSource("supabase");
                    // Also add to week orders for chart updates
                    setAllWeekOrders((prev) => [newOrder, ...prev]);
                }
            )
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "pizza_orders" },
                (payload) => {
                    console.log("🔔 Realtime UPDATE:", payload.new);
                    const updatedOrder = payload.new as PizzaOrder;
                    const updated = ordersRef.current.map((o) =>
                        o.id === updatedOrder.id ? updatedOrder : o
                    );
                    updateOrdersAndKpis(updated);
                }
            )
            .on(
                "postgres_changes",
                { event: "DELETE", schema: "public", table: "pizza_orders" },
                (payload) => {
                    console.log("🔔 Realtime DELETE:", payload.old);
                    const deletedId = (payload.old as { id: string }).id;
                    const updated = ordersRef.current.filter((o) => o.id !== deletedId);
                    updateOrdersAndKpis(updated);
                }
            )
            .subscribe((status) => {
                console.log("Realtime subscription status:", status);
                setRealtimeConnected(status === "SUBSCRIBED");
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [updateOrdersAndKpis]);

    // ── Chart data ──
    const salesData = buildSalesData(allWeekOrders.length > 0 ? allWeekOrders : orders);
    const heatmap = buildHeatmapData(allWeekOrders.length > 0 ? allWeekOrders : orders);

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
                            background: dataSource === "supabase" ? "#4ade80" : "#f59e0b",
                            display: "inline-block",
                        }}
                    />
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        {loading
                            ? "Načítavam dáta..."
                            : dataSource === "supabase"
                                ? `Live dáta zo Supabase${realtimeConnected ? " (realtime ⚡)" : ""}`
                                : "Mock dáta (Supabase nepripojený)"}
                    </span>
                </div>

                <DashboardHeader onRefresh={() => { fetchOrders(); fetchWeekOrders(); }} />
                <KpiCards data={kpis} onProblemsClick={() => setShowProblems(true)} />

                {/* Main: Orders Table */}
                <div style={{ marginBottom: "1.5rem" }}>
                    <OrdersTable orders={orders} />
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
            </main>

            {/* Problem Modal */}
            {showProblems && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0,0,0,0.6)",
                        backdropFilter: "blur(4px)",
                        zIndex: 100,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <div
                        style={{
                            background: "var(--bg)",
                            border: "1px solid var(--border)",
                            borderRadius: 12,
                            padding: "2rem",
                            width: "100%",
                            maxWidth: 500,
                            maxHeight: "90vh",
                            overflowY: "auto",
                        }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>
                                Čo treba riešiť
                            </h2>
                            <button
                                onClick={() => setShowProblems(false)}
                                style={{
                                    color: "var(--text-muted)",
                                    fontSize: "0.85rem",
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                }}
                            >
                                ✕ Zavrieť
                            </button>
                        </div>
                        <AttentionList items={attentionItems} />
                    </div>
                </div>
            )}
        </div>
    );
}
