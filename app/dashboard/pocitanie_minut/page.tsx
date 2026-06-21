"use client";

import { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { fetchCallsComparisonAction, type TelnyxCall, type TelnyxSummary, type NumberSummary } from "@/app/actions/calls";
import { 
    Phone, 
    Clock, 
    Coins, 
    RefreshCw, 
    HelpCircle,
    ArrowUpRight,
    ArrowDownLeft,
    PhoneCall,
    ChevronDown,
    ChevronRight,
    Layers
} from "lucide-react";

type ProviderType = "telnyx" | "my-twilio" | "shared-twilio";

export default function PocitanieMinutPage() {
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<7 | 30>(30);
    const [provider, setProvider] = useState<ProviderType>("telnyx");
    const [summary, setSummary] = useState<TelnyxSummary | null>(null);
    const [numberData, setNumberData] = useState<NumberSummary[]>([]);
    const [calls, setCalls] = useState<TelnyxCall[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [expandedNumbers, setExpandedNumbers] = useState<Record<string, boolean>>({});

    const loadData = useCallback(async (selectedPeriod: number, activeProvider: ProviderType) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchCallsComparisonAction(selectedPeriod, activeProvider);
            if (res.success && res.summary) {
                setSummary(res.summary);
                setNumberData(res.numberComparison || []);
                setCalls(res.calls || []);
            } else {
                setError(res.error || `Nepodarilo sa načítať dáta pre ${activeProvider}.`);
            }
        } catch (err: any) {
            setError(err.message || "Neočakávaná chyba.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData(period, provider);
    }, [period, provider, loadData]);

    const toggleNumber = (num: string) => {
        setExpandedNumbers(prev => ({
            ...prev,
            [num]: !prev[num]
        }));
    };

    const formatDuration = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}m ${s}s`;
    };

    const formatDate = (isoStr: string) => {
        return new Date(isoStr).toLocaleString("sk-SK", {
            day: "numeric",
            month: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    // Názov aktuálneho poskytovateľa pre texty
    const getProviderLabel = () => {
        switch (provider) {
            case "telnyx": return "Telnyx";
            case "my-twilio": return "Moje Twilio";
            case "shared-twilio": return "Spoločné Twilio";
        }
    };

    // Kľúč chýbajúceho env pre varovanie
    const getMissingEnvLabel = () => {
        switch (provider) {
            case "telnyx": return "TELNYX_API_KEY";
            case "my-twilio": return "MY_TWILIO_ACCOUNT_SID & TOKEN";
            case "shared-twilio": return "TWILIO_ACCOUNT_SID & TOKEN";
        }
    };

    return (
        <div style={{ background: "#050508", minHeight: "100vh", paddingTop: "100px", color: "#fff" }}>
            <Navbar />

            <main style={{ maxWidth: "90rem", margin: "0 auto", padding: "2rem" }}>
                {/* Header Row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1.5rem" }}>
                    <div>
                        <span style={{ fontSize: "0.75rem", color: "#7B61FF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                            HLASOVÝ PORTÁL / {getProviderLabel()}
                        </span>
                        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: "0.25rem", background: "linear-gradient(135deg, #00FFD1, #7B61FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                            Počítanie Minút
                        </h1>
                        <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)", marginTop: "0.25rem" }}>
                            Spotreba a výpis prevolaných minút pre váš hlasový projekt.
                        </p>
                    </div>

                    {/* Controls */}
                    <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                        {/* Provider switch (Telnyx / My Twilio / Shared Twilio) */}
                        <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "3px", border: "1px solid rgba(255,255,255,0.08)" }}>
                            {(["telnyx", "my-twilio", "shared-twilio"] as ProviderType[]).map((p) => {
                                const active = provider === p;
                                const label = p === "telnyx" ? "Telnyx" : p === "my-twilio" ? "Moje Twilio" : "Spoločné Twilio";
                                return (
                                    <button
                                        key={p}
                                        onClick={() => setProvider(p)}
                                        style={{
                                            padding: "6px 14px",
                                            fontSize: "0.75rem",
                                            fontWeight: 600,
                                            borderRadius: "8px",
                                            border: "none",
                                            background: active ? "linear-gradient(135deg, #7B61FF, #00FFD1)" : "transparent",
                                            color: active ? "#050508" : "rgba(255,255,255,0.6)",
                                            cursor: "pointer",
                                            transition: "all 0.2s"
                                        }}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Days switch */}
                        <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "3px", border: "1px solid rgba(255,255,255,0.08)" }}>
                            <button
                                onClick={() => setPeriod(7)}
                                style={{
                                    padding: "6px 14px",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    borderRadius: "8px",
                                    border: "none",
                                    background: period === 7 ? "linear-gradient(135deg, #00FFD1, #00c9a7)" : "transparent",
                                    color: period === 7 ? "#050508" : "rgba(255,255,255,0.6)",
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                            >
                                7 dní
                            </button>
                            <button
                                onClick={() => setPeriod(30)}
                                style={{
                                    padding: "6px 14px",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    borderRadius: "8px",
                                    border: "none",
                                    background: period === 30 ? "linear-gradient(135deg, #00FFD1, #00c9a7)" : "transparent",
                                    color: period === 30 ? "#050508" : "rgba(255,255,255,0.6)",
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                            >
                                30 dní
                            </button>
                        </div>

                        {/* Refresh */}
                        <button
                            onClick={() => loadData(period, provider)}
                            disabled={loading}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "8px 14px",
                                borderRadius: "10px",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "#fff",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(0, 255, 209, 0.4)"}
                            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"}
                        >
                            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                            Obnoviť
                        </button>
                    </div>
                </div>

                {/* API Key Notification */}
                {summary && !summary.hasRealApiKey && (
                    <div style={{
                        background: "rgba(123, 97, 255, 0.08)",
                        border: "1px solid rgba(123, 97, 255, 0.25)",
                        borderRadius: "12px",
                        padding: "1rem",
                        marginBottom: "2rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "1rem"
                    }}>
                        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                            <HelpCircle size={20} style={{ color: "#7B61FF", flexShrink: 0 }} />
                            <div>
                                <h4 style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff" }}>Simulačný Režim (Demo: {getProviderLabel()})</h4>
                                <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.55)", marginTop: "2px" }}>
                                    Premenné pre pripojenie na {getProviderLabel()} API nie sú nakonfigurované v `.env.local`. Zobrazujeme simulované CDR záznamy.
                                </p>
                            </div>
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", padding: "4px 8px", background: "rgba(0,0,0,0.2)" }}>
                            {getMissingEnvLabel()}=chýba
                        </span>
                    </div>
                )}

                {error && (
                    <div style={{ background: "rgba(ef4444,0.1)", border: "1px solid rgba(ef4444,0.2)", color: "#f87171", padding: "1rem", borderRadius: "12px", marginBottom: "2rem" }}>
                        {error}
                    </div>
                )}

                {loading && !summary ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "300px" }}>
                        <div style={{ width: 32, height: 32, border: "3px solid #00FFD1", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", marginTop: "1rem" }}>Načítavam štatistiky...</span>
                        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin {to {transform: rotate(360deg); } }` }} />
                    </div>
                ) : (
                    summary && (
                        <>
                            {/* KPI Cards */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
                                {/* Minutes Card */}
                                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "14px", padding: "1.5rem" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>PREVOLANÉ MINÚTY</span>
                                        <div style={{ background: "rgba(0, 255, 209, 0.1)", padding: "6px", borderRadius: "8px" }}>
                                            <Clock size={16} style={{ color: "#00FFD1" }} />
                                        </div>
                                    </div>
                                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff" }}>{summary.totalMinutes} min</div>
                                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", marginTop: "4px" }}>
                                        celkový účtovaný čas ({getProviderLabel()})
                                    </div>
                                </div>

                                {/* Calls Card */}
                                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "14px", padding: "1.5rem" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>POČET HOVOROV</span>
                                        <div style={{ background: "rgba(123, 97, 255, 0.1)", padding: "6px", borderRadius: "8px" }}>
                                            <Phone size={16} style={{ color: "#7B61FF" }} />
                                        </div>
                                    </div>
                                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff" }}>{summary.totalCalls}</div>
                                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", marginTop: "4px" }}>
                                        uskutočnené spojenia
                                    </div>
                                </div>

                                {/* Cost Card */}
                                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "14px", padding: "1.5rem" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>VOIP NÁKLADY</span>
                                        <div style={{ background: "rgba(251, 191, 36, 0.1)", padding: "6px", borderRadius: "8px" }}>
                                            <Coins size={16} style={{ color: "#fbbf24" }} />
                                        </div>
                                    </div>
                                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fbbf24" }}>${summary.totalCost.toFixed(2)}</div>
                                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", marginTop: "4px" }}>
                                        priemerne <strong style={{ color: "#fff" }}>${(summary.totalCost / (summary.totalCalls || 1)).toFixed(3)}</strong> / hovor
                                    </div>
                                </div>

                                {/* ElevenLabs Card */}
                                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "14px", padding: "1.5rem" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>ELEVENLABS ODHAD</span>
                                        <div style={{ background: "rgba(123, 97, 255, 0.1)", padding: "6px", borderRadius: "8px" }}>
                                            <Layers size={16} style={{ color: "#7B61FF" }} />
                                        </div>
                                    </div>
                                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#7B61FF" }}>€{(summary.totalMinutes * 0.10).toFixed(2)}</div>
                                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", marginTop: "4px" }}>
                                        odhad €0.10/min. celkovo: <strong style={{ color: "#fff" }}>~€{((summary.totalCost * 0.92) + (summary.totalMinutes * 0.10)).toFixed(2)}</strong> s VoIP
                                    </div>
                                </div>

                                {/* Lines Card */}
                                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "14px", padding: "1.5rem" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>AKTÍVNE LINKY</span>
                                        <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "6px", borderRadius: "8px" }}>
                                            <PhoneCall size={16} style={{ color: "#10b981" }} />
                                        </div>
                                    </div>
                                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#10b981" }}>{numberData.length}</div>
                                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", marginTop: "4px" }}>
                                        registrovacie virtuálne čísla
                                    </div>
                                </div>
                            </div>

                            {/* Breakdown by Phone Number */}
                            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "14px", padding: "1.5rem", marginBottom: "2rem" }}>
                                <div style={{ marginBottom: "1.25rem" }}>
                                    <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#fff" }}>Rozdelenie Spotreby Podľa Telefónneho Čísla</h3>
                                    <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
                                        Zoznam virtuálnych čísel aktívnych na platforme {getProviderLabel()}. Kliknutím na riadok rozbalíte zákazníkov.
                                    </p>
                                </div>

                                <div style={{ overflowX: "auto" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.8rem" }}>
                                        <thead>
                                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
                                                <th style={{ width: "30px" }}></th>
                                                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Virtuálne číslo (Linka)</th>
                                                <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>Počet hovorov</th>
                                                <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>Prevolané minúty</th>
                                                <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>VoIP náklady (USD)</th>
                                                <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>ElevenLabs odhad (€)</th>
                                                <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>Zákazníci</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {numberData.map((item, idx) => {
                                                const isExpanded = !!expandedNumbers[item.number];
                                                return (
                                                    <tr key={item.number || idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                                        <td colSpan={7} style={{ padding: 0 }}>
                                                            {/* Main Row */}
                                                            <div 
                                                                onClick={() => toggleNumber(item.number)}
                                                                style={{ 
                                                                    display: "flex", 
                                                                    width: "100%", 
                                                                    alignItems: "center",
                                                                    padding: "12px 14px",
                                                                    cursor: "pointer",
                                                                    transition: "all 0.15s"
                                                                }}
                                                                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                                                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                                            >
                                                                <div style={{ width: "30px", display: "flex", alignItems: "center" }}>
                                                                    {isExpanded ? <ChevronDown size={16} style={{ color: "#7B61FF" }} /> : <ChevronRight size={16} style={{ color: "rgba(255,255,255,0.4)" }} />}
                                                                </div>
                                                                <div style={{ flex: "1 1 16%", fontFamily: "monospace", color: "#00FFD1", fontWeight: 600, fontSize: "0.85rem" }}>
                                                                    {item.number}
                                                                </div>
                                                                <div style={{ flex: "1 1 16%", textAlign: "right", color: "rgba(255,255,255,0.85)" }}>
                                                                    {item.callsCount} hovorov
                                                                </div>
                                                                <div style={{ flex: "1 1 16%", textAlign: "right", color: "#7B61FF", fontWeight: 700 }}>
                                                                    {item.minutesCount} min
                                                                </div>
                                                                <div style={{ flex: "1 1 16%", textAlign: "right", color: "#fbbf24", fontWeight: 600 }}>
                                                                    ${item.costUsd.toFixed(3)}
                                                                </div>
                                                                <div style={{ flex: "1 1 16%", textAlign: "right", color: "#7B61FF", fontWeight: 600 }}>
                                                                    €{(item.minutesCount * 0.10).toFixed(2)}
                                                                </div>
                                                                <div style={{ flex: "1 1 16%", textAlign: "right", color: "rgba(255,255,255,0.4)" }}>
                                                                    {item.callers.length} unikátnych
                                                                </div>
                                                            </div>

                                                            {/* Nested Callers Table */}
                                                            {isExpanded && (
                                                                <div style={{ padding: "8px 2rem 20px 3rem", background: "rgba(0, 0, 0, 0.2)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                                                    <div style={{ borderLeft: "2px solid #7B61FF", paddingLeft: "1.5rem" }}>
                                                                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.45)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                                                            Zoznam Zákazníkov pre {item.number}
                                                                        </div>
                                                                        
                                                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                                                                            <thead>
                                                                                <tr style={{ color: "rgba(255,255,255,0.3)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                                                                    <th style={{ padding: "6px 8px", fontWeight: 500 }}>Číslo volajúceho (Zákazník)</th>
                                                                                    <th style={{ padding: "6px 8px", fontWeight: 500, textAlign: "right" }}>Hovory</th>
                                                                                    <th style={{ padding: "6px 8px", fontWeight: 500, textAlign: "right" }}>Minúty</th>
                                                                                    <th style={{ padding: "6px 8px", fontWeight: 500, textAlign: "right" }}>VoIP Náklady</th>
                                                                                    <th style={{ padding: "6px 8px", fontWeight: 500, textAlign: "right" }}>ElevenLabs odhad</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {item.callers.map((c, cIdx) => (
                                                                                    <tr key={c.callerNumber || cIdx} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                                                                                        <td style={{ padding: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.85)" }}>
                                                                                            {c.callerNumber}
                                                                                        </td>
                                                                                        <td style={{ padding: "8px", textAlign: "right", color: "rgba(255,255,255,0.6)" }}>
                                                                                            {c.callsCount}
                                                                                        </td>
                                                                                        <td style={{ padding: "8px", textAlign: "right", color: "#00FFD1", fontWeight: 600 }}>
                                                                                            {c.minutesCount} min
                                                                                        </td>
                                                                                        <td style={{ padding: "8px", textAlign: "right", color: "#fbbf24" }}>
                                                                                            ${c.costUsd.toFixed(3)}
                                                                                        </td>
                                                                                        <td style={{ padding: "8px", textAlign: "right", color: "#7B61FF", fontWeight: 600 }}>
                                                                                            €{(c.minutesCount * 0.10).toFixed(2)}
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}

                                            {numberData.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.3)" }}>
                                                        Nenašli sa žiadne štatistiky podľa čísel.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Details Table */}
                            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "14px", padding: "1.5rem" }}>
                                <div style={{ marginBottom: "1.25rem" }}>
                                    <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#fff" }}>Detailný Výpis CDR Hovorov</h3>
                                    <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
                                        Zoznam jednotlivých hovorov z platformy {getProviderLabel()} s ich trvaním a naúčtovanou cenou.
                                    </p>
                                </div>

                                <div style={{ overflowX: "auto" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.8rem" }}>
                                        <thead>
                                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
                                                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Čas začiatku</th>
                                                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Virtuálna Linka</th>
                                                <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "center" }}>Smer</th>
                                                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Druhá strana</th>
                                                <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>Dĺžka</th>
                                                <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>Billed Min.</th>
                                                <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>Naúčtovaná cena</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {calls.map((call, idx) => {
                                                const isInbound = call.direction === "inbound";
                                                const otherParty = isInbound ? call.from_number : call.to_number;
                                                
                                                return (
                                                    <tr 
                                                        key={call.id || idx} 
                                                        style={{ 
                                                            borderBottom: "1px solid rgba(255,255,255,0.04)"
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                                                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                                    >
                                                        <td style={{ padding: "12px 14px", color: "rgba(255,255,255,0.85)" }}>
                                                            {formatDate(call.started_at)}
                                                        </td>
                                                        <td style={{ padding: "12px 14px", fontFamily: "monospace", color: "#00FFD1", fontWeight: 600 }}>
                                                            {call.telnyx_number}
                                                        </td>
                                                        <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                                            <div style={{ 
                                                                display: "inline-flex", 
                                                                alignItems: "center", 
                                                                gap: "4px", 
                                                                padding: "2px 8px", 
                                                                borderRadius: "100px", 
                                                                background: isInbound ? "rgba(16, 185, 129, 0.1)" : "rgba(123, 97, 255, 0.1)",
                                                                border: isInbound ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(123, 97, 255, 0.2)",
                                                                color: isInbound ? "#34d399" : "#a78bfa",
                                                                fontSize: "0.65rem",
                                                                fontWeight: 600
                                                            }}>
                                                                {isInbound ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                                                                {isInbound ? "Prichádzajúci" : "Odchádzajúci"}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: "12px 14px", fontFamily: "monospace", color: "rgba(255,255,255,0.6)" }}>
                                                            {otherParty}
                                                        </td>
                                                        <td style={{ padding: "12px 14px", textAlign: "right", color: "rgba(255,255,255,0.8)" }}>
                                                            {formatDuration(call.duration_sec)}
                                                        </td>
                                                        <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700 }}>
                                                            {call.billed_minutes}
                                                        </td>
                                                        <td style={{ padding: "12px 14px", textAlign: "right", color: "#fbbf24", fontWeight: 600 }}>
                                                            ${call.cost_usd.toFixed(3)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}

                                            {calls.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "rgba(255,255,255,0.3)" }}>
                                                        Nenašli sa žiadne hovory pre vybrané obdobie.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )
                )}
            </main>
        </div>
    );
}
