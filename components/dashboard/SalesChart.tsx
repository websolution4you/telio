"use client";

import { useState, useEffect, useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";
import { type PizzaOrder, parseTotalPrice } from "@/lib/mockData";

interface DaySalesData {
    day: string;       // "Po", "Ut", ... or "D.M."
    orders: number;
    revenue: number;
}

interface SalesChartProps {
    ordersToday: PizzaOrder[];
    ordersWeek: PizzaOrder[];
    period?: number; // Global period from parent
}

const SK_DAY_NAMES = ["Ne", "Po", "Ut", "St", "Št", "Pi", "So"];

function getDayLabels(daysCount: number): string[] {
    const result: string[] = [];
    for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        if (daysCount > 7) {
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
        if (d < cutoffDate && periodDays !== 1) return; // 1 means today, special case

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

export default function SalesChart({ ordersToday, ordersWeek, period = 7 }: SalesChartProps) {
    const [localRangeIdx, setLocalRangeIdx] = useState<number | null>(null);

    // Map global period to rangeIdx (0: Dnes, 1: 7 dní, 2: 30 dní)
    const effectiveRangeIdx = localRangeIdx !== null ? localRangeIdx : (period === 1 ? 0 : (period === 7 ? 1 : 2));
    const RANGES = ["Dnes", "7 dní", "30 dní"];

    // Effect to update localRangeIdx when global period changes
    useEffect(() => {
        setLocalRangeIdx(null); // Reset local override when global changes
    }, [period]);

    // Derived period for labels and data processing
    const displayPeriod = effectiveRangeIdx === 0 ? 1 : (effectiveRangeIdx === 1 ? 7 : 30);

    const chartData = useMemo(() => {
        const rawData = displayPeriod === 1 ? ordersToday : ordersWeek;
        // In a real scenario, we'd want 30 days of data for the 30d view. 
        // For mock purposes we use allWeekOrders (ordersWeek)
        return buildSalesData(rawData, displayPeriod);
    }, [displayPeriod, ordersToday, ordersWeek]);

    return (
        <div
            style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "1.25rem 1.5rem",
                flex: 1,
                minWidth: 0,
            }}
        >
            <div className="flex items-center justify-between" style={{ marginBottom: "1rem" }}>
                <div>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#fff" }}>
                        Predaj ({displayPeriod === 1 ? "Dnes" : `${displayPeriod} dní`})
                    </h3>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                        Obrat v € po dňoch
                    </p>
                </div>

                <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 3 }}>
                    {RANGES.map((r, i) => (
                        <button
                            key={r}
                            onClick={() => setLocalRangeIdx(i)}
                            style={{
                                padding: "4px 12px",
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                borderRadius: 8,
                                border: "none",
                                background: effectiveRangeIdx === i ? "var(--cyan)" : "transparent",
                                color: effectiveRangeIdx === i ? "#000" : "var(--text-muted)",
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ width: "100%", height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barSize={displayPeriod > 7 ? 8 : 20}>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.05)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="day"
                            tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            interval={displayPeriod > 7 ? 4 : 0}
                        />
                        <YAxis
                            tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            width={40}
                        />
                        <Tooltip
                            contentStyle={{
                                background: "rgba(15,15,30,0.95)",
                                border: "1px solid rgba(0,255,209,0.2)",
                                borderRadius: 8,
                                fontSize: "0.8rem",
                                color: "#fff",
                            }}
                            formatter={(value: any) => [
                                `${Number(value).toLocaleString("sk-SK", { minimumFractionDigits: 2 })} €`,
                                "Obrat",
                            ]}
                            cursor={{ fill: "rgba(0,255,209,0.04)" }}
                        />
                        <Bar
                            dataKey="revenue"
                            fill="url(#barGradient)"
                            radius={[4, 4, 0, 0]}
                        />
                        <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#00FFD1" stopOpacity={0.8} />
                                <stop offset="100%" stopColor="#00FFD1" stopOpacity={0.2} />
                            </linearGradient>
                        </defs>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4" style={{ marginTop: 8 }}>
                <div className="flex items-center gap-1.5">
                    <span
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: "#00FFD1",
                            display: "inline-block",
                        }}
                    />
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Obrat (€)</span>
                </div>
            </div>
        </div>
    );
}

export type { DaySalesData };
