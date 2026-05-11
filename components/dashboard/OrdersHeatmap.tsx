"use client";

import { useState, useEffect, useMemo } from "react";
import { type PizzaOrder } from "@/lib/mockData";

interface HeatmapData {
    day: string;     // "Po", "Ut", ...
    hour: number;    // 0-23
    count: number;
}

interface OrdersHeatmapProps {
    ordersToday: PizzaOrder[];
    ordersWeek: PizzaOrder[];
    period?: number;
}

const SK_DAY_NAMES = ["Ne", "Po", "Ut", "St", "Št", "Pi", "So"];

function buildHeatmapData(orders: PizzaOrder[], periodDays: number): { data: HeatmapData[]; days: string[] } {
    const days = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];
    const map = new Map<string, number>();

    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - periodDays);
    // V prípade dneška nastavíme cutoff na začiatok dňa, aby sme nič nestratili kvôli hodine
    if (periodDays === 1) cutoffDate.setHours(0, 0, 0, 0);

    orders.forEach((o) => {
        const d = new Date(o.created_at);
        if (d < cutoffDate) return;
        
        // Používame slovenské názvy dní pre kľúč mapy, aby sedeli s SK_DAY_NAMES
        const dayLabel = SK_DAY_NAMES[d.getDay()];
        const hour = d.getHours();
        const key = `${dayLabel}-${hour}`;
        map.set(key, (map.get(key) ?? 0) + 1);
    });

    const data: HeatmapData[] = [];
    // SK_DAY_NAMES: ["Ne", "Po", "Ut", "St", "Št", "Pi", "So"]
    // Chceme aby vizuálne v tabuľke boli dni Po-Ne
    const displayOrder = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

    displayOrder.forEach((day) => {
        for (let h = 10; h <= 22; h++) {
            const key = `${day}-${h}`;
            data.push({ day, hour: h, count: map.get(key) ?? 0 });
        }
    });

    return { data, days: displayOrder };
}

export default function OrdersHeatmap({ ordersToday, ordersWeek, period = 7 }: OrdersHeatmapProps) {
    const [localRangeIdx, setLocalRangeIdx] = useState<number | null>(null);

    // Map global period to rangeIdx (0: Dnes, 1: 7 dní, 2: 30 dní)
    const effectiveRangeIdx = localRangeIdx !== null ? localRangeIdx : (period === 1 ? 0 : (period === 7 ? 1 : 2));
    const RANGES = ["Dnes", "7 dní", "30 dní"];

    // Effect to update localRangeIdx when global period changes
    useEffect(() => {
        setLocalRangeIdx(null); // Reset local override when global changes
    }, [period]);

        // Derived period for labels based on selection
    const displayPeriod = effectiveRangeIdx === 0 ? 1 : (effectiveRangeIdx === 1 ? 7 : 30);

    const { data: heatmapData, days } = useMemo(() => {
        const rawData = displayPeriod === 1 ? ordersToday : ordersWeek;
        return buildHeatmapData(rawData, displayPeriod);
    }, [displayPeriod, ordersToday, ordersWeek]);

    // Business hours only (10-22)
    const hours = Array.from({ length: 13 }, (_, i) => i + 10);

    // Build lookup map
    const lookup = new Map<string, number>();
    heatmapData.forEach((d) => lookup.set(`${d.day}-${d.hour}`, d.count));

    const maxCount = Math.max(...heatmapData.map((d) => d.count), 1);

    function cellColor(count: number): string {
        if (count === 0) return "rgba(255,255,255,0.03)";
        const intensity = count / maxCount;
        if (intensity < 0.25) return "rgba(0,255,209,0.1)";
        if (intensity < 0.5) return "rgba(0,255,209,0.25)";
        if (intensity < 0.75) return "rgba(0,255,209,0.45)";
        return "rgba(0,255,209,0.7)";
    }

    return (
                <div
            style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "1.25rem 1.5rem",
                flex: 2,
                minWidth: 0,
            }}
        >
            <div className="flex items-center justify-between" style={{ marginBottom: "1rem" }}>
                <div>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#fff" }}>
                        Objednávky podľa hodiny
                    </h3>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                        Heatmapa – {displayPeriod === 1 ? "Dnes" : `posledných ${displayPeriod} dní`}
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

            <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                    <thead>
                        <tr>
                            <th style={{ width: 36 }} />
                            {hours.map((h) => (
                                <th
                                    key={h}
                                    style={{
                                        fontSize: "0.65rem",
                                        color: "var(--text-muted)",
                                        fontWeight: 500,
                                        padding: "0 2px 6px",
                                        textAlign: "center",
                                        minWidth: 28,
                                    }}
                                >
                                    {h}:00
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {days.map((day) => (
                            <tr key={day}>
                                <td
                                    style={{
                                        fontSize: "0.72rem",
                                        color: "var(--text-muted)",
                                        fontWeight: 600,
                                        paddingRight: 8,
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {day}
                                </td>
                                {hours.map((h) => {
                                    const count = lookup.get(`${day}-${h}`) ?? 0;
                                    return (
                                        <td key={h} style={{ padding: 1.5 }}>
                                            <div
                                                title={`${day} ${h}:00 — ${count} obj.`}
                                                style={{
                                                    width: "100%",
                                                    aspectRatio: "1.4/1",
                                                    minHeight: 18,
                                                    borderRadius: 3,
                                                    background: cellColor(count),
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: "0.6rem",
                                                    color: count > 0 ? "rgba(255,255,255,0.7)" : "transparent",
                                                    fontWeight: 600,
                                                    cursor: "default",
                                                    transition: "background 0.15s",
                                                }}
                                            >
                                                {count > 0 ? count : ""}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div
                className="flex items-center gap-2"
                style={{ marginTop: 10, justifyContent: "flex-end" }}
            >
                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Menej</span>
                {[0.03, 0.1, 0.25, 0.45, 0.7].map((op, i) => (
                    <div
                        key={i}
                        style={{
                            width: 14,
                            height: 14,
                            borderRadius: 2,
                            background:
                                op === 0.03
                                    ? "rgba(255,255,255,0.03)"
                                    : `rgba(0,255,209,${op})`,
                        }}
                    />
                ))}
                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Viac</span>
            </div>
        </div>
    );
}

export type { HeatmapData };
