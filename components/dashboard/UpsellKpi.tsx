"use client";

import type { PizzaOrder } from "@/lib/mockData";
import { parseTotalPrice, formatPrice } from "@/lib/mockData";
import { TrendingUp } from "lucide-react";

interface UpsellKpiProps {
    orders: PizzaOrder[];
}

export default function UpsellKpi({ orders }: UpsellKpiProps) {
    const offered = orders.filter((o) => o.upsell_offered);
    const accepted = orders.filter((o) => o.upsell_accepted);
    const rate =
        offered.length > 0 ? Math.round((accepted.length / offered.length) * 100) : 0;

    // Estimate upsell revenue: we don't have a dedicated field,
    // so for now we count the number of accepted upsells as a proxy.
    // In the future this could be a dedicated upsell_price column.
    const upsellItems = accepted
        .map((o) => o.upsell_item)
        .filter(Boolean);

    return (
        <div
            style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "1.25rem 1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "1.25rem",
            }}
        >
            {/* Icon */}
            <div
                style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: "rgba(74,222,128,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}
            >
                <TrendingUp size={20} style={{ color: "#4ade80" }} />
            </div>

            {/* Stats */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>
                    Upsell dnes
                </p>
                <div className="flex items-baseline gap-3" style={{ flexWrap: "wrap" }}>
                    <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "#4ade80" }}>
                        {accepted.length}
                        <span style={{ fontSize: "0.85rem", fontWeight: 400, color: "var(--text-muted)" }}>
                            /{offered.length}
                        </span>
                    </span>
                    <span
                        style={{
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            color: rate >= 50 ? "#4ade80" : rate >= 25 ? "#fbbf24" : "#f87171",
                            background:
                                rate >= 50
                                    ? "rgba(74,222,128,0.1)"
                                    : rate >= 25
                                        ? "rgba(251,191,36,0.1)"
                                        : "rgba(248,113,113,0.1)",
                            padding: "2px 8px",
                            borderRadius: 6,
                        }}
                    >
                        {rate}% úspešnosť
                    </span>
                </div>
                {upsellItems.length > 0 && (
                    <p
                        style={{
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                            marginTop: 4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {upsellItems.join(", ")}
                    </p>
                )}
            </div>
        </div>
    );
}
