"use client";

import React, { useState } from "react";
import type { PizzaOrder } from "@/lib/mockData";
import {
    formatTime,
    formatPrice,
    parseTotalPrice,
    isRecent,
    isUnclear,
} from "@/lib/mockData";
import { MapPin, TrendingUp, FileText, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

interface OrdersTableProps {
    orders: PizzaOrder[];
}

// ── Status display config ────────────────────────────────────

function getStatusDisplay(order: PizzaOrder): {
    label: string;
    bg: string;
    text: string;
} {
    const recent = isRecent(order);

    if ((order.status === "NEW" || order.status === "CONFIRMED") && !recent) {
        return { label: "Vybavená", bg: "rgba(74,222,128,0.1)", text: "#4ade80" };
    }

    if (order.status === "NEW" && recent) {
        return { label: "Nová", bg: "rgba(59,130,246,0.15)", text: "#3b82f6" };
    }
    if (order.status === "CONFIRMED" && recent) {
        return { label: "Potvrdená", bg: "rgba(96,165,250,0.15)", text: "#60a5fa" };
    }
    if (order.status === "DONE") {
        return { label: "Vybavená", bg: "rgba(74,222,128,0.1)", text: "#4ade80" };
    }
    if (order.status === "CANCELLED") {
        return { label: "Zrušená", bg: "rgba(248,113,113,0.1)", text: "#f87171" };
    }
    return { label: order.status, bg: "rgba(255,255,255,0.06)", text: "#aaa" };
}

const filterOptions: { value: "All" | string; label: string }[] = [
    { value: "All", label: "Všetky" },
    { value: "Nová", label: "Nová" },
    { value: "Potvrdená", label: "Potvrdená" },
    { value: "Vybavená", label: "Vybavená" },
    { value: "Zrušená", label: "Zrušená" },
];

function DetailRow({
    icon,
    label,
    children,
}: {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-2">
            <span style={{ color: "var(--text-muted)", marginTop: 2, flexShrink: 0 }}>{icon}</span>
            <div>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 2 }}>
                    {label}
                </p>
                {children}
            </div>
        </div>
    );
}

// ── Main table component ─────────────────────────────────────

export default function OrdersTable({ orders }: OrdersTableProps) {
    const [filter, setFilter] = useState<"All" | string>("All");
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    const filteredOrders =
        filter === "All" ? orders : orders.filter((o) => getStatusDisplay(o).label === filter);

    return (
        <div
            style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                flex: 1,
                minWidth: 0,
                padding: "1rem",
                overflowX: "auto"
            }}
        >
            {/* Header */}
            <div className="flex items-start justify-between" style={{ marginBottom: "1.25rem" }}>
                <div>
                    <h2 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#fff" }}>
                        Najnovšie objednávky
                    </h2>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                        Posledných 20
                    </p>
                </div>
                <div style={{ position: "relative" }}>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        style={{
                            background: "var(--bg)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            color: "var(--text)",
                            fontSize: "0.8rem",
                            padding: "6px 28px 6px 12px",
                            appearance: "none",
                            cursor: "pointer",
                            outline: "none",
                        }}
                    >
                        {filterOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <span
                        style={{
                            position: "absolute",
                            right: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            pointerEvents: "none",
                            color: "var(--text-muted)",
                            fontSize: "0.65rem",
                        }}
                    >
                        ▼
                    </span>
                </div>
            </div>

            {/* Table */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        {[
                            "Čas",
                            "Zákazník",
                            "Pizza",
                            "Suma",
                            "Stav",
                        ].map((h) => (
                            <th
                                key={h}
                                style={{
                                    textAlign: "left",
                                    padding: "0 12px 12px",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    color: "var(--text-muted)",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {h}
                            </th>
                        ))}
                        <th style={{ padding: "0 12px 12px", width: "40px" }}></th>
                    </tr>
                </thead>
                <tbody>
                    {filteredOrders.map((order) => {
                        const sc = getStatusDisplay(order);
                        const price = parseTotalPrice(order.total_price);
                        const unclear = isUnclear(order);
                        const isExpanded = expandedRowId === order.id;

                        return (
                            <React.Fragment key={order.id}>
                                <tr
                                    onClick={() => setExpandedRowId(isExpanded ? null : order.id)}
                                    style={{
                                        borderBottom: isExpanded ? "none" : "1px solid var(--border)",
                                        cursor: "pointer",
                                        background: isExpanded
                                            ? "rgba(255,255,255,0.02)"
                                            : "transparent",
                                        transition: "background 0.15s",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isExpanded)
                                            e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isExpanded)
                                            e.currentTarget.style.background = "transparent";
                                    }}
                                >
                                    {/* Čas */}
                                    <td style={{ padding: "13px 12px", fontSize: "0.85rem", color: isExpanded ? "var(--cyan)" : "var(--text)", whiteSpace: "nowrap" }}>
                                        {formatTime(order.created_at)}
                                        {isRecent(order) && (
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    width: 6,
                                                    height: 6,
                                                    borderRadius: "50%",
                                                    background: "#3b82f6",
                                                    marginLeft: 6,
                                                    verticalAlign: "middle",
                                                }}
                                                title="Posledných 30 min"
                                            />
                                        )}
                                    </td>

                                    {/* Zákazník */}
                                    <td style={{ padding: "13px 12px", maxWidth: 140 }}>
                                        <div style={{ fontSize: "0.85rem", color: "#fff", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {order.customer_name ?? "—"}
                                        </div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px" }}>
                                            {order.customer_phone ?? "—"}
                                            {unclear && (
                                                <span title="Nejasné údaje">
                                                    <AlertTriangle size={11} style={{ color: "#fbbf24" }} />
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Pizza */}
                                    <td style={{ padding: "13px 12px", maxWidth: 300 }}>
                                        <div
                                            style={{
                                                fontSize: "0.82rem",
                                                color: "var(--text)",
                                                display: "-webkit-box",
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: "vertical",
                                                overflow: "hidden",
                                                lineHeight: "1.4",
                                                maxWidth: "100%",
                                            }}
                                            title={order.pizza_type}
                                        >
                                            {order.pizza_type}
                                        </div>
                                    </td>

                                    {/* Suma */}
                                    <td style={{ padding: "13px 12px", fontSize: "0.85rem", color: "#fff", fontWeight: 500, whiteSpace: "nowrap" }}>
                                        {price > 0 ? formatPrice(price) : "—"}
                                    </td>

                                    {/* Stav */}
                                    <td style={{ padding: "13px 12px" }}>
                                        <span
                                            style={{
                                                background: sc.bg,
                                                color: sc.text,
                                                fontSize: "0.7rem",
                                                fontWeight: 700,
                                                padding: "3px 10px",
                                                borderRadius: 6,
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {sc.label}
                                        </span>
                                    </td>

                                    {/* Chevron */}
                                    <td style={{ padding: "13px 12px", textAlign: "right", color: "var(--text-muted)" }}>
                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </td>
                                </tr>
                                {isExpanded && (
                                    <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(255, 255, 255, 0.02)" }}>
                                        <td colSpan={6} style={{ padding: "0 12px 16px 12px", maxWidth: 0 }}>
                                            <div style={{ padding: "16px", background: "rgba(0,0,0,0.2)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)", width: "100%", overflowX: "hidden" }}>
                                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
                                                    <DetailRow icon={<MapPin size={14} />} label="Adresa">
                                                        <span style={{ color: "#fff", fontWeight: 500, fontSize: "0.85rem" }}>{order.delivery_address}</span>
                                                    </DetailRow>
                                                    <DetailRow icon={<TrendingUp size={14} />} label="Upsell">
                                                        {order.upsell_offered ? (
                                                            <span style={{ fontSize: "0.82rem" }}>
                                                                <span style={{ color: "#fff" }}>{order.upsell_item}</span>{" "}
                                                                <span
                                                                    style={{
                                                                        fontSize: "0.7rem",
                                                                        fontWeight: 700,
                                                                        color: order.upsell_accepted ? "#4ade80" : "#f87171",
                                                                    }}
                                                                >
                                                                    {order.upsell_accepted ? "✓" : "✗"}
                                                                </span>
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>Nie</span>
                                                        )}
                                                    </DetailRow>
                                                    <DetailRow icon={<span style={{ fontSize: "0.85rem" }}>🍕</span>} label="Objednávka (Celá)">
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                                                            {order.pizza_type.split(",").map((item, idx) => {
                                                                const s = item.trim();
                                                                if (!s) return null;
                                                                return (
                                                                    <div key={idx} style={{ color: "#fff", fontSize: "0.82rem", background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)", width: "fit-content" }}>
                                                                        {s}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </DetailRow>
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-2" style={{ marginBottom: "8px" }}>
                                                        <FileText size={14} style={{ color: "var(--text-muted)" }} />
                                                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Prepis hovoru</span>
                                                    </div>
                                                    <div style={{ fontSize: "0.85rem", color: "#e2e8f0", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                                        {order.notes ? `„${order.notes}“` : "Pre tento hovor nie je k dispozícii prepis."}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                    {filteredOrders.length === 0 && (
                        <tr>
                            <td
                                colSpan={6}
                                style={{
                                    textAlign: "center",
                                    padding: "2rem",
                                    color: "var(--text-muted)",
                                    fontSize: "0.85rem",
                                }}
                            >
                                Žiadne objednávky.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
