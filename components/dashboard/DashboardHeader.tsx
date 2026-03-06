"use client";

import { RefreshCw, Download } from "lucide-react";

interface DashboardHeaderProps {
    onRefresh?: () => void;
}

export default function DashboardHeader({ onRefresh }: DashboardHeaderProps) {
    return (
        <div className="flex items-center justify-between mb-8">
            <div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 4 }}>Dnes</p>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#fff" }}>Rýchly prehľad</h1>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={onRefresh}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                    style={{
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                        background: "transparent",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "rgba(0,255,209,0.3)";
                        e.currentTarget.style.background = "rgba(0,255,209,0.04)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.background = "transparent";
                    }}
                >
                    <RefreshCw size={14} />
                    Refresh
                </button>
                <button
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                    style={{
                        background: "linear-gradient(135deg, #00FFD1, #00c9a7)",
                        color: "#050508",
                    }}
                >
                    <Download size={14} />
                    Export
                </button>
            </div>
        </div>
    );
}
