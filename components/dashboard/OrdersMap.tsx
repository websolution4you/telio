"use client";

import { useState, useMemo } from "react";
import type { PizzaOrder } from "@/lib/mockData";
import { isRecent } from "@/lib/mockData";
import { Clock } from "lucide-react";

interface OrdersMapProps {
    ordersToday: PizzaOrder[];
    ordersWeek: PizzaOrder[];
    dbStreets: string[];
}

function normalizeStr(str: string) {
    if (!str) return "";
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\b(ulica|ul\.|sidlisko|namestie)\b/g, "")
        .replace(/[^a-z]/g, "")
        .trim();
}

// Remove "Ulica" for display purposes and normalize known distinct entries
function displayStreetName(name: string) {
    const clean = name.replace(/^(Ulica |Ul\. )/i, "").trim();
    if (clean === "Jána Francisciho") return "Francisciho";
    if (clean === "Fraňa Kráľa") return "Kráľa";
    return clean;
}

/**
 * Main map coordinates mapper for canonical database streets.
 * Only valid DB entries will reach here.
 */
const LEVOCA_CANONICAL_COORDS: Record<string, { x: number; y: number }> = {
    "námestie majstra pavla": { x: 50, y: 50 },
    "czauczika": { x: 55, y: 55 },
    "francisciho": { x: 38, y: 62 },
    "sídlisko západ": { x: 25, y: 50 },
    "košická": { x: 65, y: 48 },
    "ždiarska": { x: 75, y: 60 },
    "probstnerova cesta": { x: 50, y: 35 },
};

function getStreetCoords(dbStreetName: string) {
    const key = dbStreetName.toLowerCase();

    for (const [canonical, coords] of Object.entries(LEVOCA_CANONICAL_COORDS)) {
        if (key.includes(canonical)) return coords;
    }


    // Hash for valid DB streets that don't have hardcoded coords
    let hash = 0;
    for (let i = 0; i < dbStreetName.length; i++) hash = dbStreetName.charCodeAt(i) + ((hash << 5) - hash);
    return {
        x: 10 + (Math.abs(hash) % 80),
        y: 10 + (Math.abs(hash >> 3) % 80)
    };
}

const RANGES = ["Dnes", "7 dní", "30 dní"];

export default function OrdersMap({ ordersToday, ordersWeek, dbStreets = [] }: OrdersMapProps) {
    const [rangeIdx, setRangeIdx] = useState(0);

    const filtered = useMemo(() => {
        if (rangeIdx === 0) {
            return ordersToday.filter(o => (o.status === "NEW" || o.status === "CONFIRMED") && isRecent(o));
        } else if (rangeIdx === 1) {
            return ordersWeek;
        } else {
            // Mock 30d by repeating 7d for heatmap visualization
            return [...ordersWeek, ...ordersWeek, ...ordersWeek];
        }
    }, [rangeIdx, ordersToday, ordersWeek]);

    const groupedStreets = useMemo(() => {
        if (dbStreets.length === 0) return [];

        const counts: Record<string, number> = {};

        filtered.forEach(o => {
            const originalAddr = o.delivery_address || "";
            const normAddr = normalizeStr(originalAddr);
            if (!normAddr || normAddr.length < 3) return;

            let bestMatch: string | null = null;
            let bestScore = 0;

            for (const dbName of dbStreets) {
                const normDb = normalizeStr(dbName);
                if (normDb.length < 3) continue;

                // Only match if the address contains the DB street name
                if (normAddr === normDb || normAddr.includes(normDb)) {
                    // Favor the longest matching database name
                    if (normDb.length > bestScore) {
                        bestMatch = dbName;
                        bestScore = normDb.length;
                    }
                }
            }

            // Only plot if it matched an actual DB street
            if (bestMatch) {
                const groupKey = displayStreetName(bestMatch);
                counts[groupKey] = (counts[groupKey] || 0) + 1;
            }
        });

        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [filtered, dbStreets]);

    return (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column", height: 480 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: "1.5rem" }}>
                <div>
                    <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff" }}>Heatmapa rozvozov</h2>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>Zoskupené podľa ulíc v Levoči</p>
                </div>

                <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 3 }}>
                    {RANGES.map((r, i) => (
                        <button
                            key={r}
                            onClick={() => setRangeIdx(i)}
                            style={{
                                padding: "4px 12px",
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                borderRadius: 8,
                                border: "none",
                                background: rangeIdx === i ? "var(--cyan)" : "transparent",
                                color: rangeIdx === i ? "#000" : "var(--text-muted)",
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ position: "relative", flex: 1, background: "#08090b", borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)", backgroundSize: "30px 30px", opacity: 0.5 }} />

                <div style={{ position: "absolute", top: "50%", left: "50%", width: 80, height: 80, border: "1px solid rgba(255,255,255,0.03)", background: "rgba(255,255,255,0.01)", transform: "translate(-50%, -50%)", borderRadius: "20%" }}>
                    <span style={{ position: "absolute", bottom: -15, left: "50%", transform: "translateX(-50%)", fontSize: "0.5rem", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>Centrum</span>
                </div>

                {groupedStreets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2" style={{ width: "100%", height: "100%", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        <Clock size={20} style={{ opacity: 0.4 }} />
                        {dbStreets.length === 0 ? "Žiadne mapové dáta (streets prázdne)" : "Žiadne známe objednávky"}
                    </div>
                ) : (
                    groupedStreets.map(([groupName, count]) => {
                        const coords = getStreetCoords(groupName);
                        // Prevent index out of bounds if length === 0
                        const maxCount = groupedStreets[0]?.[1] || 1;
                        const intensity = count / maxCount; // 0 to 1

                        const size = 10 + (intensity * 15);
                        const glowColor = intensity > 0.7 ? "rgba(0, 255, 209, 0.6)" : intensity > 0.3 ? "rgba(0, 255, 209, 0.3)" : "rgba(0, 255, 209, 0.1)";
                        const isMain = intensity > 0.5;

                        return (
                            <div key={groupName} style={{ position: "absolute", left: `${coords.x}%`, top: `${coords.y}%`, transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center", zIndex: Math.round(intensity * 100) }}>
                                <div style={{
                                    background: isMain ? "var(--cyan)" : "rgba(13, 14, 18, 0.8)",
                                    color: isMain ? "#000" : "#fff",
                                    padding: "2px 8px",
                                    borderRadius: 6,
                                    fontSize: isMain ? "0.75rem" : "0.65rem",
                                    fontWeight: 700,
                                    whiteSpace: "nowrap",
                                    marginBottom: 6,
                                    border: isMain ? "1px solid #fff" : "1px solid rgba(0,255,209,0.2)",
                                    boxShadow: `0 0 ${size}px ${glowColor}`,
                                    transition: "all 0.3s"
                                }}>
                                    {groupName} <span style={{ opacity: 0.7 }}>{count}×</span>
                                </div>
                                <div style={{
                                    width: size * 2.5,
                                    height: size * 2.5,
                                    borderRadius: "50%",
                                    background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
                                    position: "relative"
                                }}>
                                    <div style={{
                                        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                                        width: 6, height: 6, background: "var(--cyan)", borderRadius: "50%", boxShadow: "0 0 10px var(--cyan)"
                                    }} />
                                    {isMain && <div style={{
                                        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                                        width: size * 3, height: size * 3, border: "1px solid rgba(0, 255, 209, 0.2)", borderRadius: "50%",
                                        animation: "ripple 2s infinite ease-out"
                                    }} />}
                                </div>
                            </div >
                        );
                    })
                )}
            </div >

            <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                <div style={{ display: "flex", gap: "1rem" }}>
                    <span>Celkom lokalít: <b style={{ color: "#fff" }}>{groupedStreets.length}</b></span>
                    <span>Top lokalita: <b style={{ color: "var(--cyan)" }}>{groupedStreets[0]?.[0] || "-"}</b></span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span>Nižšia hustota</span>
                    <div style={{ width: 40, height: 4, background: "linear-gradient(90deg, rgba(0,255,209,0.1), var(--cyan))", borderRadius: 2 }} />
                    <span>Vysoká hustota</span>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes ripple { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.8; } 100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; } }
            `}} />
        </div>
    );
}
