"use client";

import Link from "next/link";
import { Activity } from "lucide-react";

export default function DashboardNav() {
    return (
        <header
            style={{
                background: "rgba(5,5,8,0.97)",
                borderBottom: "1px solid var(--border)",
                position: "sticky",
                top: 0,
                zIndex: 50,
            }}
        >
            <div
                className="flex items-center justify-between"
                style={{
                    maxWidth: "90rem",
                    margin: "0 auto",
                    padding: "0 2rem",
                    height: 60,
                }}
            >
                {/* Left: Logo + AI status */}
                <div className="flex items-center gap-5">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <DashLogo />
                        <div style={{ lineHeight: 1.2 }}>
                            <span
                                style={{
                                    fontSize: "0.65rem",
                                    color: "var(--text-muted)",
                                    display: "block",
                                }}
                            >
                                AI Call Agent
                            </span>
                            <span
                                style={{
                                    fontSize: "1rem",
                                    fontWeight: 700,
                                    color: "#fff",
                                }}
                            >
                                Check-in
                            </span>
                        </div>
                    </Link>

                    {/* AI online badge */}
                    <span
                        className="flex items-center gap-1.5"
                        style={{
                            background: "rgba(0,255,209,0.08)",
                            border: "1px solid rgba(0,255,209,0.2)",
                            borderRadius: 20,
                            padding: "4px 12px",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            color: "var(--cyan)",
                        }}
                    >
                        <span
                            className="animate-pulse-glow"
                            style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: "var(--cyan)",
                                display: "inline-block",
                            }}
                        />
                        AI online
                    </span>
                </div>

                {/* Right: Business selector + user */}
                <div className="flex items-center gap-3">
                    {/* Business selector */}
                    <div style={{ position: "relative" }}>
                        <select
                            style={{
                                background: "var(--bg-card)",
                                border: "1px solid var(--border)",
                                borderRadius: 8,
                                color: "var(--text)",
                                fontSize: "0.82rem",
                                fontWeight: 500,
                                padding: "7px 32px 7px 12px",
                                appearance: "none",
                                cursor: "pointer",
                                outline: "none",
                            }}
                        >
                            <option>Všetky pobočky</option>
                        </select>
                        <span
                            style={{
                                position: "absolute",
                                right: 12,
                                top: "50%",
                                transform: "translateY(-50%)",
                                pointerEvents: "none",
                                color: "var(--text-muted)",
                                fontSize: "0.6rem",
                            }}
                        >
                            ▼
                        </span>
                    </div>

                    {/* User */}
                    <button
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200"
                        style={{
                            border: "1px solid var(--border)",
                            background: "transparent",
                            color: "var(--text)",
                            fontSize: "0.82rem",
                            fontWeight: 500,
                        }}
                    >
                        <Activity size={14} style={{ color: "var(--text-muted)" }} />
                        User ▾
                    </button>
                </div>
            </div>
        </header>
    );
}

function DashLogo() {
    return (
        <svg
            width="32"
            height="32"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <rect width="28" height="28" rx="7" fill="url(#dash-logo-grad)" />
            <rect x="5" y="12" width="2.5" height="4" rx="1.25" fill="rgba(5,5,8,0.9)" />
            <rect x="9" y="9" width="2.5" height="10" rx="1.25" fill="rgba(5,5,8,0.9)" />
            <rect x="13" y="6" width="2.5" height="16" rx="1.25" fill="rgba(5,5,8,0.9)" />
            <rect x="17" y="9" width="2.5" height="10" rx="1.25" fill="rgba(5,5,8,0.9)" />
            <rect x="21" y="12" width="2.5" height="4" rx="1.25" fill="rgba(5,5,8,0.9)" />
            <defs>
                <linearGradient
                    id="dash-logo-grad"
                    x1="0"
                    y1="0"
                    x2="28"
                    y2="28"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#00FFD1" />
                    <stop offset="1" stopColor="#7B61FF" />
                </linearGradient>
            </defs>
        </svg>
    );
}
