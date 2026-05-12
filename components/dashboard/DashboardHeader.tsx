"use client";

import { RefreshCw, Download, LayoutGrid } from "lucide-react";

interface DashboardHeaderProps {
    onRefresh?: () => void;
    title?: string;
    extraAction?: React.ReactNode;
}

export default function DashboardHeader({ onRefresh, title = "Rýchly prehľad", extraAction }: DashboardHeaderProps) {
    return (
        <div className="flex items-center justify-between mb-8">
            <div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 4 }}>Dnes</p>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#fff" }}>{title}</h1>
            </div>
                        <div className="flex items-center gap-4">
                            {extraAction}
                            <button
                                onClick={() => {
                                    const el = document.getElementById('menu-section');
                                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200"
                                style={{
                                    width: "90px",
                                    padding: "6px 0",
                                    border: "1px solid var(--border)",
                                    color: "var(--text)",
                                    background: "rgba(0,255,209,0.05)",
                                    cursor: "pointer"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = "rgba(0,255,209,0.5)";
                                    e.currentTarget.style.background = "rgba(0,255,209,0.15)";
                                    e.currentTarget.style.color = "#fff";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = "var(--border)";
                                    e.currentTarget.style.background = "rgba(0,255,209,0.05)";
                                    e.currentTarget.style.color = "var(--text)";
                                }}
                            >
                                Menu
                            </button>
                            <button
                                onClick={() => {
                                    const el = document.getElementById('charts-section');
                                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200"
                                style={{
                                    width: "90px",
                                    padding: "6px 0",
                                    border: "1px solid var(--border)",
                                    color: "var(--text)",
                                    background: "rgba(255,255,255,0.03)",
                                    cursor: "pointer"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                                    e.currentTarget.style.color = "#fff";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = "var(--border)";
                                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                                    e.currentTarget.style.color = "var(--text)";
                                }}
                            >
                                Analýzy
                            </button>
                            {/* Empty placeholder to align Menu with Dnes and Analýzy with 7 dní */}
                            <div style={{ width: "90px" }} />
                        </div>
        </div>
    );
}
