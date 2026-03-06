"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";

interface DaySalesData {
    day: string;       // "Po", "Ut", ...
    orders: number;
    revenue: number;
}

interface SalesChartProps {
    data: DaySalesData[];
}

export default function SalesChart({ data }: SalesChartProps) {
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
            <div style={{ marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#fff" }}>
                    Predaj (7 dní)
                </h3>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                    Obrat v € po dňoch
                </p>
            </div>

            <div style={{ width: "100%", height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} barSize={20}>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.05)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="day"
                            tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
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
                            formatter={(value: number) => [
                                `${value.toLocaleString("sk-SK", { minimumFractionDigits: 2 })} €`,
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
