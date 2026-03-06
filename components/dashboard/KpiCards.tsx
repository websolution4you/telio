"use client";

import type { KpiData } from "@/lib/mockData";
import { formatPrice } from "@/lib/mockData";

interface KpiCardsProps {
    data: KpiData;
    onProblemsClick?: () => void;
}

interface CardDef {
    label: string;
    value: React.ReactNode;
    sub: React.ReactNode;
    accent?: string;
    clickable?: boolean;
}

export default function KpiCards({ data, onProblemsClick }: KpiCardsProps) {

    const cards: CardDef[] = [
        {
            label: "Objednávky dnes",
            value: String(data.ordersToday),
            sub: "AI + manuál",
        },
        {
            label: "Obrat dnes",
            value: formatPrice(data.revenueToday),
            sub: "bez tipov",
        },
        {
            label: "Priemer objednávky",
            value: formatPrice(data.avgOrder),
            sub: "dnes",
        },
        {
            label: "Neuzavreté",
            value: String(data.openOrders),
            sub: "NOVÁ / POTVRDENÁ",
        },
        {
            label: "Upsell dnes",
            value: (
                <span className="flex items-baseline gap-1" style={{ whiteSpace: "nowrap" }}>
                    <span style={{ color: "#4ade80" }}>{data.upsellAccepted}</span>
                    <span style={{ fontSize: "0.55em", color: "var(--text-muted)", fontWeight: 400 }}>/{data.upsellOffered}</span>
                </span>
            ),
            sub: data.upsellAccepted > 0
                ? <span style={{ color: "#4ade80", fontWeight: 600 }}>+{formatPrice(data.upsellRevenue)}</span>
                : data.upsellOffered === 0 ? "žiadne" : "0% úspešnosť",
            accent: data.upsellAccepted > 0 ? "#4ade80" : undefined,
        },
        {
            label: "Problémy",
            value: String(data.problems),
            sub: "vyžaduje kontrolu",
            accent: "#ff4d6a",
            clickable: true,
        },
    ];

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: "1rem",
                marginBottom: "2rem",
            }}
            className="kpi-grid"
        >
            {cards.map((card) => (
                <div
                    key={card.label}
                    onClick={card.clickable ? onProblemsClick : undefined}
                    className="card-hover"
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
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 8 }}>
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
