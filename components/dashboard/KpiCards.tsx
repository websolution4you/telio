"use client";

import { useState } from "react";
import type { KpiData } from "@/lib/mockData";
import { formatPrice } from "@/lib/mockData";

interface KpiCardsProps {
    dataToday: KpiData;
    dataWeek: KpiData;
    onProblemsClick?: () => void;
    overridePeriod?: 1 | 7 | 30;
}

interface CardDef {
    id: string;
    label: string;
    value: React.ReactNode;
    sub: React.ReactNode;
    accent?: string;
    clickable?: boolean;
    onClick?: () => void;
}

const RANGES = ["dnes", "7 dní", "30 dní"];

// Get the corresponding kpi data object based on range index
const getDataObj = (idx: number, dataToday: KpiData, dataWeek: KpiData) => {
    if (idx === 1 || idx === 2) return dataWeek; // fallback 30d to week for now if missing
    return dataToday;
};

export default function KpiCards({ dataToday, dataWeek, onProblemsClick, overridePeriod }: KpiCardsProps) {
        const [rangeIdx, setRangeIdx] = useState<Record<string, number>>({
        orders: 0,
        revenue: 0,
        upsell: 0,
        caller: 0,
    });

    // If an external period override is provided, we use it directly
    const getEffectiveIdx = (key: string) => {
        if (overridePeriod !== undefined) {
            return overridePeriod === 1 ? 0 : (overridePeriod === 7 ? 1 : 2);
        }
        return rangeIdx[key] || 0;
    };

    const cycleRange = (key: string) => {
        if (overridePeriod !== undefined) return; // Disable local cycling if globally overridden
        setRangeIdx((prev) => ({
            ...prev,
            [key]: ((prev[key] || 0) + 1) % 3,
        }));
    };

    const cards: CardDef[] = [
        {
            id: "orders",
            label: `Objednávky ${RANGES[getEffectiveIdx("orders")]}`,
            value: String(getDataObj(getEffectiveIdx("orders"), dataToday, dataWeek).ordersToday),
            sub: "",
            clickable: overridePeriod === undefined,
            onClick: () => cycleRange("orders"),
        },
        {
            id: "revenue",
            label: `Obrat ${RANGES[getEffectiveIdx("revenue")]}`,
            value: formatPrice(getDataObj(getEffectiveIdx("revenue"), dataToday, dataWeek).revenueToday),
            sub: "bez tipov",
            clickable: overridePeriod === undefined,
            onClick: () => cycleRange("revenue"),
        },
        {
            id: "avg",
            label: "Priemer objednávky",
            value: formatPrice(getDataObj(getEffectiveIdx("avg"), dataToday, dataWeek).avgOrder),
            sub: RANGES[getEffectiveIdx("avg")],
            clickable: overridePeriod === undefined,
            onClick: () => cycleRange("avg"),
        },
        {
            id: "top-caller",
            label: `Top zákazník ${RANGES[getEffectiveIdx("caller")]}`,
            value: getDataObj(getEffectiveIdx("caller"), dataToday, dataWeek).topCaller?.phone || "-",
            sub: `${getDataObj(getEffectiveIdx("caller"), dataToday, dataWeek).topCaller?.count || 0} objednávok`,
            clickable: overridePeriod === undefined,
            onClick: () => cycleRange("caller"),
        },
        {
            id: "upsell",
            label: `Upsell ${RANGES[getEffectiveIdx("upsell")]}`,
            value: (
                <span className="flex items-baseline gap-1" style={{ whiteSpace: "nowrap" }}>
                    <span style={{ color: "#4ade80" }}>
                        {formatPrice(getDataObj(getEffectiveIdx("upsell"), dataToday, dataWeek).upsellRevenue)}
                    </span>
                </span>
            ),
            sub: getDataObj(getEffectiveIdx("upsell"), dataToday, dataWeek).upsellOffered > 0
                ? `${getDataObj(getEffectiveIdx("upsell"), dataToday, dataWeek).upsellAccepted}/${getDataObj(getEffectiveIdx("upsell"), dataToday, dataWeek).upsellOffered} (${Math.round((getDataObj(getEffectiveIdx("upsell"), dataToday, dataWeek).upsellAccepted / getDataObj(getEffectiveIdx("upsell"), dataToday, dataWeek).upsellOffered) * 100)}% úspešnosť)`
                : "žiadne",
            accent: getDataObj(getEffectiveIdx("upsell"), dataToday, dataWeek).upsellAccepted > 0 ? "#4ade80" : undefined,
            clickable: overridePeriod === undefined,
            onClick: () => cycleRange("upsell"),
        },
    ];

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem",
                marginBottom: "2rem",
            }}
            className="kpi-grid"
        >
            {cards.map((card) => (
                <div
                    key={card.id}
                    onClick={card.onClick}
                    className={card.clickable ? "card-hover" : ""}
                    style={{
                        background: "var(--bg-card)",
                        border: card.accent
                            ? `1px solid ${card.accent}40`
                            : "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "1.25rem 1.5rem",
                        position: "relative",
                        overflow: "hidden",
                        cursor: card.clickable ? "pointer" : "default",
                        transition: "background 0.2s, border-color 0.2s",
                        userSelect: card.clickable ? "none" : "auto",
                    }}
                >
                    {card.accent && (
                        <div
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 3,
                                background: card.accent,
                            }}
                        />
                    )}
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 8, transition: "color 0.2s" }}>
                        {card.label}
                    </p>
                    <p
                        style={{
                            fontSize: "1.75rem",
                            fontWeight: 700,
                            color: card.accent || "#fff",
                            lineHeight: 1.1,
                            marginBottom: 4,
                            wordBreak: "break-word",
                        }}
                    >
                        {card.value}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {card.sub}
                    </p>
                </div>
            ))}
        </div>
    );
}
