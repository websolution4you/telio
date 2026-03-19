"use client";

import { RefreshCw, Download, LayoutGrid } from "lucide-react";

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
            <div className="flex items-center gap-4">
                <button
                    onClick={() => {
                        const el = document.getElementById('menu-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200"
                    style={{
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                        background: "rgba(0,255,209,0.05)",
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
                    <LayoutGrid size={16} />
                    Menu
                </button>
                <button
                    onClick={onRefresh}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200"
                    style={{
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                        background: "rgba(255,255,255,0.03)",
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
                    <RefreshCw size={16} />
                    Refresh
                </button>
                <button
                    className="flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{
                        background: "linear-gradient(135deg, #00FFD1, #00c9a7)",
                        color: "#050508",
                        boxShadow: "0 8px 16px rgba(0, 255, 209, 0.25)",
                        border: "none",
                        cursor: "pointer"
                    }}
                >
                    <Download size={16} />
                    Export
                </button>
            </div>
        </div>
    );
}
