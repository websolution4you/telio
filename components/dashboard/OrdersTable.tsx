"use client";

import { useState, useEffect } from "react";
import type { PizzaOrder, OrderStatus } from "@/lib/mockData";
import {
    formatTime,
    formatPrice,
    parseTotalPrice,
    isRecent,
    isUnclear,
    CONFIDENCE_THRESHOLD,
} from "@/lib/mockData";
import { Phone, MapPin, TrendingUp, FileText, AlertTriangle } from "lucide-react";

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

const filterOptions: { value: "All" | OrderStatus; label: string }[] = [
    { value: "All", label: "Všetky" },
    { value: "NEW", label: "Nová" },
    { value: "CONFIRMED", label: "Potvrdená" },
    { value: "DONE", label: "Vybavená" },
    { value: "CANCELLED", label: "Zrušená" },
];

// ── Detail panel ────────────────────────────────────────────

function OrderDetail({ order }: { order: PizzaOrder | null }) {
    const [showTranscript, setShowTranscript] = useState(false);

    useEffect(() => {
        setShowTranscript(false);
    }, [order?.id]);

    if (!order) {
        return (
            <div
                style={{
                    borderLeft: "1px solid var(--border)",
                    width: 380,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-muted)",
                    fontSize: "0.85rem",
                }}
            >
                Kliknite na objednávku pre detail
            </div>
        );
    }

    const sc = getStatusDisplay(order);
    const unclear = isUnclear(order);
    const price = parseTotalPrice(order.total_price);

    return (
        <div
            style={{
                borderLeft: "1px solid var(--border)",
                padding: "1.5rem",
                width: 380,
                flexShrink: 0,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Header row */}
            <div className="flex items-center justify-between" style={{ marginBottom: "1.25rem" }}>
                <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--cyan)" }}>
                    Detail objednávky
                </span>
            </div>

            <div className="flex items-center gap-2" style={{ marginBottom: "1.5rem" }}>
                <span
                    style={{
                        background: sc.bg,
                        color: sc.text,
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: 6,
                    }}
                >
                    {sc.label}
                </span>
                {unclear && (
                    <span
                        className="flex items-center gap-1"
                        style={{
                            background: "rgba(251,191,36,0.12)",
                            color: "#fbbf24",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: 6,
                        }}
                    >
                        <AlertTriangle size={11} /> Nejasná
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-4">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                    <DetailRow icon={<Phone size={14} />} label="Zákazník">
                        <div>
                            <span style={{ color: "#fff", fontWeight: 600, fontSize: "0.95rem" }}>
                                {order.customer_name ?? "Neznámy"}
                            </span>
                            <span
                                style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)" }}
                            >
                                {order.customer_phone ?? "—"}
                                {order.phone_confidence !== null && order.phone_confidence !== undefined && (
                                    <ConfidenceBadge value={order.phone_confidence} label="istota" />
                                )}
                            </span>
                        </div>
                    </DetailRow>

                    <DetailRow icon={<MapPin size={14} />} label="Adresa">
                        <div>
                            <span style={{ color: "#fff", fontWeight: 500, fontSize: "0.85rem" }}>{order.delivery_address}</span>
                            {order.address_confidence !== null && order.address_confidence !== undefined && (
                                <ConfidenceBadge value={order.address_confidence} label="istota" />
                            )}
                        </div>
                    </DetailRow>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "1rem 0" }}>
                    <div style={{ gridColumn: "1 / -1" }}>
                        <DetailRow icon={<span style={{ fontSize: "0.85rem" }}>🍕</span>} label="Objednávka">
                            <span style={{ color: "#fff", fontSize: "0.82rem" }}>{order.pizza_type}</span>
                        </DetailRow>
                    </div>

                    <DetailRow icon={<span style={{ fontSize: "0.85rem" }}>💶</span>} label="Suma">
                        <span style={{ color: "#fff", fontWeight: 600, fontSize: "0.82rem" }}>{formatPrice(price)}</span>
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
                </div>

                {/* Info and Transcript */}
                <div style={{ marginTop: "0.5rem", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                    <div
                        className="flex items-center justify-between transition-colors"
                        style={{
                            marginBottom: 8,
                            cursor: order.notes ? "pointer" : "default",
                            padding: "4px 0"
                        }}
                        onClick={() => order.notes && setShowTranscript(!showTranscript)}
                    >
                        <div className="flex items-center gap-2">
                            <FileText size={14} style={{ color: "var(--text-muted)" }} />
                            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>
                                Prepis hovoru
                            </span>
                        </div>
                        {order.notes && (
                            <span style={{ fontSize: "0.75rem", color: "var(--cyan)", fontWeight: 500 }}>
                                {showTranscript ? "Skryť ▲" : "Zobraziť ▼"}
                            </span>
                        )}
                    </div>

                    {!order.notes ? (
                        <div
                            style={{
                                background: "rgba(0,0,0,0.3)",
                                border: "1px solid var(--border)",
                                borderRadius: 8,
                                padding: "1rem",
                                fontSize: "0.82rem",
                                color: "var(--text-muted)",
                            }}
                        >
                            Prepis nie je dostupný.
                        </div>
                    ) : showTranscript ? (
                        <div
                            style={{
                                background: "rgba(0,0,0,0.3)",
                                border: "1px solid var(--border)",
                                borderRadius: 8,
                                padding: "1rem",
                                fontSize: "0.82rem",
                                color: "var(--text)",
                                lineHeight: 1.65,
                                flex: 1,
                                overflowY: "auto",
                                whiteSpace: "pre-wrap",
                                animation: "fadeInDown 0.15s ease",
                            }}
                        >
                            {order.notes}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

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

function ConfidenceBadge({ value, label }: { value: number; label: string }) {
    const pct = Math.round(value * 100);
    const ok = value >= CONFIDENCE_THRESHOLD;
    return (
        <span
            style={{
                display: "inline-block",
                marginLeft: 6,
                fontSize: "0.65rem",
                fontWeight: 700,
                color: ok ? "#4ade80" : "#fbbf24",
                background: ok ? "rgba(74,222,128,0.1)" : "rgba(251,191,36,0.12)",
                padding: "1px 6px",
                borderRadius: 4,
            }}
        >
            {label} {pct}%
        </span>
    );
}

// ── Main table component ─────────────────────────────────────

export default function OrdersTable({ orders }: OrdersTableProps) {
    const [filter, setFilter] = useState<"All" | OrderStatus>("All");
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Initial select first order
    useEffect(() => {
        if (!selectedId && orders.length > 0) {
            setSelectedId(orders[0].id);
        }
    }, [orders, selectedId]);

    const filteredOrders =
        filter === "All" ? orders : orders.filter((o) => o.status === filter);

    const selectedOrder = orders.find((o) => o.id === selectedId) ?? null;

    function selectDetail(id: string) {
        setSelectedId(id);
    }

    return (
        <div
            style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "stretch",
            }}
        >
            {/* Left side: Table */}
            <div style={{ flex: 1, padding: "1.5rem", minWidth: 0, overflowX: "auto" }}>
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
                            onChange={(e) => setFilter(e.target.value as "All" | OrderStatus)}
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
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map((order) => {
                            const sc = getStatusDisplay(order);
                            const price = parseTotalPrice(order.total_price);
                            const unclear = isUnclear(order);
                            const isSelected = selectedId === order.id;

                            return (
                                <tr
                                    key={order.id}
                                    onClick={() => selectDetail(order.id)}
                                    style={{
                                        borderBottom: "1px solid var(--border)",
                                        cursor: "pointer",
                                        background: isSelected
                                            ? "rgba(0,255,209,0.04)"
                                            : "transparent",
                                        transition: "background 0.15s",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected)
                                            e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected)
                                            e.currentTarget.style.background = "transparent";
                                    }}
                                >
                                    {/* Čas */}
                                    <td style={{ padding: "13px 12px", fontSize: "0.85rem", color: isSelected ? "var(--cyan)" : "var(--text)", whiteSpace: "nowrap" }}>
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
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                            {order.customer_phone ?? "—"}
                                            {unclear && (
                                                <span title="Nejasné údaje" style={{ marginLeft: 4 }}>
                                                    <AlertTriangle size={11} style={{ color: "#fbbf24", verticalAlign: "middle" }} />
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Pizza */}
                                    <td style={{ padding: "13px 12px", maxWidth: 160 }}>
                                        <div
                                            style={{
                                                fontSize: "0.82rem",
                                                color: "var(--text)",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                                maxWidth: 150,
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
                                </tr>
                            );
                        })}
                        {filteredOrders.length === 0 && (
                            <tr>
                                <td
                                    colSpan={5}
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

            {/* Right side: Detail panel (Always rendered to maintain width) */}
            <OrderDetail order={selectedOrder} />
        </div>
    );
}
