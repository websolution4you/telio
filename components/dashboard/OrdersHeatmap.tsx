"use client";

interface HeatmapData {
    day: string;     // "Po", "Ut", ...
    hour: number;    // 0-23
    count: number;
}

interface OrdersHeatmapProps {
    data: HeatmapData[];
    days: string[];
}

export default function OrdersHeatmap({ data, days }: OrdersHeatmapProps) {
    // Business hours only (10-22)
    const hours = Array.from({ length: 13 }, (_, i) => i + 10);

    // Build lookup map
    const lookup = new Map<string, number>();
    data.forEach((d) => lookup.set(`${d.day}-${d.hour}`, d.count));

    const maxCount = Math.max(...data.map((d) => d.count), 1);

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
            <div style={{ marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#fff" }}>
                    Objednávky podľa hodiny
                </h3>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                    Heatmapa – posledných 7 dní
                </p>
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
