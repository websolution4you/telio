"use client";

import type { AttentionItem, AttentionType } from "@/lib/mockData";
import { MapPin, HelpCircle, AlertTriangle } from "lucide-react";

interface AttentionListProps {
    items: AttentionItem[];
}

const typeConfig: Record<AttentionType, { label: string; color: string; icon: React.ElementType }> = {
    missing_address: {
        label: "Missing address",
        color: "#f59e0b",
        icon: MapPin,
    },
    unclear_item: {
        label: "Unclear item",
        color: "#a78bfa",
        icon: HelpCircle,
    },
    low_confidence: {
        label: "Low confidence",
        color: "#f87171",
        icon: AlertTriangle,
    },
};

export default function AttentionList({ items }: AttentionListProps) {
    const openCount = items.length;

    return (
        <div
            style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "1.5rem",
                flex: 1,
                minWidth: 0,
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between" style={{ marginBottom: "1.25rem" }}>
                <div>
                    <h2 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#fff" }}>
                        Čo treba riešiť
                    </h2>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                        Top 5 výnimiek / riziko
                    </p>
                </div>
                <span
                    style={{
                        background: "rgba(0,255,209,0.12)",
                        color: "var(--cyan)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "4px 12px",
                        borderRadius: 20,
                    }}
                >
                    OPEN: {openCount}
                </span>
            </div>

            {/* Items */}
            <div className="flex flex-col gap-3">
                {items.map((item) => {
                    const cfg = typeConfig[item.type];
                    const Icon = cfg.icon;
                    return (
                        <div
                            key={item.id}
                            className="card-hover"
                            style={{
                                border: "1px solid var(--border)",
                                borderRadius: 10,
                                padding: "1rem 1.25rem",
                                cursor: "pointer",
                            }}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {/* Tags row */}
                                    <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 8 }}>
                                        <span
                                            style={{
                                                background: `${cfg.color}20`,
                                                color: cfg.color,
                                                fontSize: "0.7rem",
                                                fontWeight: 700,
                                                padding: "2px 8px",
                                                borderRadius: 6,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 4,
                                            }}
                                        >
                                            <Icon size={11} />
                                            {cfg.label}
                                        </span>
                                        {item.callTime && (
                                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                                Call {item.callTime}
                                            </span>
                                        )}
                                        {item.orderId && (
                                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                                Order #{item.orderId}
                                            </span>
                                        )}
                                        {item.total != null && (
                                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                                {item.total} €
                                            </span>
                                        )}
                                    </div>
                                    {/* Title + description */}
                                    <p
                                        style={{
                                            fontSize: "0.88rem",
                                            color: "#fff",
                                            fontWeight: 500,
                                            marginBottom: 2,
                                        }}
                                    >
                                        &quot;{item.title}&quot;
                                    </p>
                                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                        {item.description}
                                    </p>
                                </div>
                                <button
                                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
                                    style={{
                                        border: "1px solid var(--border)",
                                        color: "var(--text)",
                                        background: "transparent",
                                        marginTop: 2,
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "rgba(0,255,209,0.3)";
                                        e.currentTarget.style.background = "rgba(0,255,209,0.06)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "var(--border)";
                                        e.currentTarget.style.background = "transparent";
                                    }}
                                >
                                    Open
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
