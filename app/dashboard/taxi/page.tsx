"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Navbar from "@/components/Navbar";
import { mockRides, mockTaxiPrices, computeTaxiKpis, getRideStatus, type TaxiRide, type TaxiPrice } from "@/lib/mockTaxiData";
import { Navigation, MapPin, Phone, ChevronDown, ChevronUp } from "lucide-react";

import SalesChart from "@/components/dashboard/SalesChart";
import OrdersHeatmap from "@/components/dashboard/OrdersHeatmap";
import OrdersMap from "@/components/dashboard/OrdersMap";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { fetchTaxiDashboardAction, updateTaxiPriceAction } from "@/app/actions/dashboard";
import { taxiSupabase } from "@/lib/supabase";

// Funkcia na prehraný zvuk pri novej objednávke/jazde (pomocou Web Audio API)
const playNotificationSound = () => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        const playTone = (freq: number, startTime: number, duration: number, volume: number) => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, startTime);
            oscillator.frequency.exponentialRampToValueAtTime(freq * 0.8, startTime + duration);
            
            gainNode.gain.setValueAtTime(volume, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };

        const now = audioCtx.currentTime;
        playTone(1046.50, now, 0.6, 0.1); 
        playTone(1318.51, now + 0.05, 0.5, 0.07);
        playTone(1567.98, now + 0.1, 0.4, 0.05);
    } catch (e) {
        console.error("Audio play failed:", e);
    }
};

// --- Pomocné funkcie pre Grafy (analogicky ako Pizza) ---

const SK_DAY_NAMES = ["Ne", "Po", "Ut", "St", "Št", "Pi", "So"];

function getLast7DayLabels(): string[] {
    const result: string[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        result.push(SK_DAY_NAMES[d.getDay()]);
    }
    return result;
}

function buildTaxiSalesData(rides: TaxiRide[]) {
    const days = getLast7DayLabels();
    const buckets: Record<string, { orders: number; revenue: number }> = {};
    days.forEach((d) => (buckets[d] = { orders: 0, revenue: 0 }));

    rides.forEach((r) => {
        const d = new Date(r.created_at);
        const label = SK_DAY_NAMES[d.getDay()];
        if (buckets[label]) {
            buckets[label].orders += 1;
            buckets[label].revenue += r.fare_amount || r.price_estimate || 0;
        }
    });

    return days.map((day) => ({
        day,
        orders: buckets[day].orders,
        revenue: Math.round(buckets[day].revenue * 100) / 100,
    }));
}

function buildTaxiHeatmapData(rides: TaxiRide[]) {
    const days = getLast7DayLabels();
    const map = new Map<string, number>();

    rides.forEach((r) => {
        const d = new Date(r.created_at);
        const dayLabel = SK_DAY_NAMES[d.getDay()];
        const hour = d.getHours();
        const key = `${dayLabel}-${hour}`;
        map.set(key, (map.get(key) ?? 0) + 1);
    });

    const data: any[] = [];
    days.forEach((day) => {
        for (let h = 10; h <= 22; h++) {
            const key = `${day}-${h}`;
            data.push({ day, hour: h, count: map.get(key) ?? 0 });
        }
    });

    return { data, days };
}


// --- Komponenty UI ---

function TaxiKpiCards({ rides }: { rides: TaxiRide[] }) {
    const [period, setPeriod] = useState<1 | 7 | 30>(1);
    const data = useMemo(() => computeTaxiKpis(rides, period), [rides, period]);

    return (
        <div style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginBottom: "1rem" }}>
                <button onClick={() => setPeriod(1)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, background: period === 1 ? "var(--cyan)" : "transparent", color: period === 1 ? "#000" : "var(--text-muted)", border: "1px solid", borderColor: period === 1 ? "var(--cyan)" : "var(--border)", cursor: "pointer", transition: "all 0.2s" }}>Dnes</button>
                <button onClick={() => setPeriod(7)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, background: period === 7 ? "var(--cyan)" : "transparent", color: period === 7 ? "#000" : "var(--text-muted)", border: "1px solid", borderColor: period === 7 ? "var(--cyan)" : "var(--border)", cursor: "pointer", transition: "all 0.2s" }}>7 dní</button>
                <button onClick={() => setPeriod(30)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, background: period === 30 ? "var(--cyan)" : "transparent", color: period === 30 ? "#000" : "var(--text-muted)", border: "1px solid", borderColor: period === 30 ? "var(--cyan)" : "var(--border)", cursor: "pointer", transition: "all 0.2s" }}>30 dní</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "1.25rem" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>{period === 1 ? "Dnešné jazdy" : "Jazdy celkom"}</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#fff" }}>{data.ridesCount}</div>
                </div>
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "1.25rem" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>Obrat (odhad)</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--cyan)" }}>
                        {data.revenue.toFixed(2)} €
                    </div>
                </div>
            </div>
        </div>
    );
}

function TaxiRidesTable({ rides, calls }: { rides: TaxiRide[], calls?: any[] }) {
    // Rozbalovanie
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [highlightNew, setHighlightNew] = useState(false);
    const firstRowRef = useRef<HTMLTableRowElement>(null);

    useEffect(() => {
        if (typeof window !== "undefined" && window.location.search.includes("newCall=true")) {
            setHighlightNew(true);
            setTimeout(() => setHighlightNew(false), 6000); // 6 sekúnd highlight
            // Vyčistenie URL bez refreshu stránky
            window.history.replaceState({}, document.title, window.location.pathname);

            // Automatický scroll na mobilných zariadeniach
            if (window.innerWidth < 768) {
                setTimeout(() => {
                    firstRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 800); // Mierny delay pre uistenie sa, že tabuľka je vykreslená
            }
        }
    }, []);

    // Časovač na prepočítanie statusu (každých 10s)
    const [, setCurrentTime] = useState(Date.now());
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 10000);
        return () => clearInterval(interval);
    }, []);

    // Pomocná funkcia na nájdenie prepisu z tabuľky calls
    const findTranscript = (r: TaxiRide) => {
        if (!calls) return r.transcript || r.notes;

        // Hľadáme hovor z rovnakého čísla, ktorý sa stal v približne rovnakom čase (+/- 10 minút)
        const rideTime = new Date(r.created_at).getTime();
        const callerPhone = (r.customer_phone || '').replace(/\s+/g, '').toLowerCase();

        let matchedCall = calls.find(c => {
            if (!c.from_number) return false;
            const callFrom = c.from_number.replace(/\s+/g, '').toLowerCase();
            const callTime = new Date(c.started_at).getTime();
            const timeDiff = Math.abs(rideTime - callTime);

            // Zhoda čísla (aspoň koniec čísla ak by boli iné predvoľby) a časový rozdiel do 10 minút
            const phoneMatch = callerPhone && (callFrom.endsWith(callerPhone) || callerPhone.endsWith(callFrom));
            return phoneMatch && timeDiff < 10 * 60000;
        });

        // Fallback: Ak sme nenašli podľa čísla (napr. obaja sú "unknown"), skúsime nájsť hovor v rovnakom čase (+/- 5 minút)
        if (!matchedCall) {
            matchedCall = calls.find(c => {
                const callTime = new Date(c.started_at).getTime();
                const timeDiff = Math.abs(rideTime - callTime);
                const isBothUnknown = (!callerPhone || callerPhone === 'unknown' || callerPhone === 'neznáme') && 
                                     (!c.from_number || c.from_number.toLowerCase() === 'unknown');
                
                // Ak je to unknown, skúsime len časový match v úzkom okne
                return isBothUnknown && timeDiff < 5 * 60000;
            });
        }

        // Ak stále nič, skúsime aspoň nájsť akýkoľvek hovor v tomto čase (v prípade, že sa čísla fakt vôbec nezhodujú)
        if (!matchedCall) {
            matchedCall = calls.find(c => {
                const callTime = new Date(c.started_at).getTime();
                const timeDiff = Math.abs(rideTime - callTime);
                return timeDiff < 2 * 60000; // Veľmi úzke okno (2 min) pre úplný fallback
            });
        }

        // Priorita: matchedCall.summary (zhrnutie) > matchedCall.transcript (kompletný prepis) > r.transcript > r.notes
        const rideTranscript = r.transcript?.includes("ElevenLabs Webhook") ? null : r.transcript;
        const result = matchedCall?.summary || matchedCall?.transcript || rideTranscript || r.notes;
        
        return result;
    };



    // Limit na posledných 10 záznamov
    const displayRides = rides.slice(0, 10);

    return (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "1.5rem", flex: 2, overflowX: "auto" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#fff", marginBottom: "1rem" }}>Najnovšie jazdy</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                        <th style={{ padding: "0 12px 12px" }}>Čas</th>
                        <th style={{ padding: "0 12px 12px" }}>Zákazník (Telefón)</th>
                        <th style={{ padding: "0 12px 12px" }}>Trasa (Nástup &gt; Výstup)</th>
                        <th style={{ padding: "0 12px 12px" }}>Stav</th>
                        <th style={{ padding: "0 12px 12px", width: "40px" }}></th>
                    </tr>
                </thead>
                <tbody>
                    {displayRides.map((r, index) => {
                        // Kombinujeme reálny status s "fake live" efektom (v lib/mockTaxiData)
                        const currentStatus = getRideStatus(r.created_at, r.status);
                        const isExpanded = expandedRowId === r.id;
                        const isHighlighted = index === 0 && highlightNew;

                        return (
                            <React.Fragment key={r.id}>
                                <tr
                                    ref={index === 0 ? firstRowRef : null}
                                    onClick={() => setExpandedRowId(isExpanded ? null : r.id)}
                                    style={{
                                        borderBottom: isExpanded ? "none" : "1px solid rgba(255,255,255,0.05)",
                                        cursor: "pointer",
                                        background: isHighlighted ? "rgba(0, 255, 209, 0.15)" : isExpanded ? "rgba(255, 255, 255, 0.02)" : "transparent",
                                        boxShadow: isHighlighted ? "inset 0 0 10px rgba(0, 255, 209, 0.3)" : "none",
                                        transition: "background 1s ease-out, box-shadow 1s ease-out"
                                    }}
                                >
                                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                        {new Date(r.created_at).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}
                                        {isHighlighted && <span style={{ marginLeft: "8px", fontSize: "0.65rem", background: "var(--cyan)", color: "#000", padding: "2px 6px", borderRadius: "10px", fontWeight: "bold" }}>NOVÉ</span>}
                                    </td>
                                    <td style={{ padding: "12px", fontSize: "0.85rem" }}>
                                        <div style={{ color: "var(--cyan)", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px" }}>
                                            <Phone size={12} /> {r.customer_phone || "Neznáme"}
                                        </div>
                                    </td>
                                    <td style={{ padding: "12px", fontSize: "0.85rem" }}>
                                        <div style={{ color: "#fff", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                                            <MapPin size={12} style={{ color: "rgba(255, 255, 255, 0.4)" }} /> {r.pickup_address}
                                        </div>
                                        <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "6px" }}>
                                            <Navigation size={12} style={{ color: "var(--cyan)" }} /> {r.dropoff_address}
                                        </div>
                                    </td>
                                    <td style={{ padding: "12px", fontSize: "0.85rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <span style={{
                                                padding: "4px 8px",
                                                borderRadius: 6,
                                                fontSize: "0.7rem",
                                                fontWeight: 600,
                                                background: currentStatus === "PENDING" ? "rgba(245, 158, 11, 0.15)" : currentStatus === "CONFIRMED" || currentStatus === "EN_ROUTE" ? "rgba(0, 255, 209, 0.15)" : currentStatus === "COMPLETED" || currentStatus === "DONE" ? "rgba(74, 222, 128, 0.15)" : "rgba(255,255,255,0.05)",
                                                color: currentStatus === "PENDING" ? "#f59e0b" : currentStatus === "CONFIRMED" || currentStatus === "EN_ROUTE" ? "var(--cyan)" : currentStatus === "COMPLETED" || currentStatus === "DONE" ? "#4ade80" : "var(--text-muted)",
                                            }}>
                                                {currentStatus === "PENDING" ? "ČAKÁ" : currentStatus === "CONFIRMED" ? "POTVRDENÉ" : currentStatus === "EN_ROUTE" ? "NA CESTE" : currentStatus === "COMPLETED" || currentStatus === "DONE" ? "VYBAVENÉ" : currentStatus}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: "12px", textAlign: "right", color: "var(--text-muted)" }}>
                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </td>
                                </tr>
                                {isExpanded && (
                                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255, 255, 255, 0.02)" }}>
                                        <td colSpan={5} style={{ padding: "0 12px 16px 12px" }}>
                                            <div style={{ padding: "12px", background: "rgba(0,0,0,0.2)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                                                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Zhrnutie hovoru</div>
                                                <div style={{ fontSize: "0.85rem", color: "#e2e8f0", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                                                    {findTranscript(r) ? `„${findTranscript(r)}“` : "Pre tento hovor nie je k dispozícii prepis."}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function TaxiPricesTable({ prices, onRefresh }: { prices: TaxiPrice[], onRefresh: () => void }) {
    const [editingItem, setEditingItem] = useState<TaxiPrice | null>(null);
    const [editForm, setEditForm] = useState<Partial<TaxiPrice>>({});

    const handleSave = async () => {
        if (!editingItem) return;
        try {
            const res = await updateTaxiPriceAction(editingItem.id, editForm);
            if (res.success) {
                setEditingItem(null);
                onRefresh();
            } else {
                alert("Chyba pri ukladaní tarifu: " + res.error);
            }
        } catch (e) {
            console.error(e);
            alert("Chyba pri ukladaní tarifu.");
        }
    };

    return (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "1.5rem", flex: 1, minWidth: "300px", position: "relative" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#fff", marginBottom: "0.5rem" }}>Cenník zón</h2>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>Aktívne nastavenie taríf pre AI agenta</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {prices.map((p) => (
                    <div
                        key={p.id}
                        style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.05)",
                            borderRadius: 12,
                            padding: "1rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                            transition: "background 0.2s"
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <h3 style={{ color: "#fff", fontSize: "0.95rem", fontWeight: 600 }}>
                                    {p.from_zone} &gt; {p.to_zone}
                                </h3>
                                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                                    <span style={{ background: "rgba(0, 255, 209, 0.1)", color: "var(--cyan)", fontSize: "0.7rem", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                                        DNI: {p.price_weekday.toFixed(2)} €
                                    </span>
                                    <span style={{ background: "rgba(255, 255, 255, 0.05)", color: "var(--text-muted)", fontSize: "0.7rem", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                                        VÍK: {p.price_weekend.toFixed(2)} €
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => { setEditingItem(p); setEditForm(p); }}
                                style={{ padding: "4px 12px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 6, cursor: "pointer", fontSize: "0.75rem", transition: "all 0.2s" }}
                                onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "var(--cyan)"; }}
                                onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                            >
                                Upraviť
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit Modal */}
            {editingItem && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
                    <div style={{ background: "var(--bg-card)", border: "1px solid var(--cyan)", borderRadius: 12, padding: "2rem", width: "100%", maxWidth: 450, boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }}>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginBottom: "1.5rem" }}>Upraviť tarifu</h3>

                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                <div>
                                    <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Zóna OD</label>
                                    <input className="edit-input" style={{ width: "100%" }} value={editForm.from_zone ?? ""} onChange={e => setEditForm({ ...editForm, from_zone: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Zóna DO</label>
                                    <input className="edit-input" style={{ width: "100%" }} value={editForm.to_zone ?? ""} onChange={e => setEditForm({ ...editForm, to_zone: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                <div>
                                    <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Cez deň (€)</label>
                                    <input type="number" step="0.1" className="edit-input" style={{ width: "100%" }} value={editForm.price_weekday ?? 0} onChange={e => setEditForm({ ...editForm, price_weekday: parseFloat(e.target.value) })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Cez víkend (€)</label>
                                    <input type="number" step="0.1" className="edit-input" style={{ width: "100%" }} value={editForm.price_weekend ?? 0} onChange={e => setEditForm({ ...editForm, price_weekend: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end" style={{ marginTop: "2rem" }}>
                            <button onClick={() => setEditingItem(null)} style={{ padding: "8px 16px", background: "transparent", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8, cursor: "pointer", fontSize: "0.85rem" }}>Zrušiť</button>
                            <button onClick={handleSave} style={{ padding: "8px 20px", background: "rgba(0, 255, 209, 0.15)", border: "1px solid var(--cyan)", color: "var(--cyan)", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>Uložiť zmeny</button>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .edit-input {
                    background: rgba(0,0,0,0.4);
                    border: 1px solid var(--border);
                    color: #fff;
                    padding: 10px 12px;
                    border-radius: 8px;
                    outline: none;
                    font-size: 0.9rem;
                    transition: border-color 0.2s;
                }
                .edit-input:focus {
                    border-color: var(--cyan);
                }
            `}} />
        </div>
    );
}


// --- Main Page ---

export default function TaxiDashboardPage() {
    const [ridesToday, setRidesToday] = useState<TaxiRide[]>([]);
    const [allWeekRides, setAllWeekRides] = useState<TaxiRide[]>([]);
    const [prices, setPrices] = useState<TaxiPrice[]>([]);
    const [calls, setCalls] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [dataSource, setDataSource] = useState<"server" | "mock">("mock");
    const [realtimeTables, setRealtimeTables] = useState({ rides: "taxi_rides", calls: "calls" });
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchTaxiDashboardAction();
            if (res.success && res.data) {
                setRidesToday(res.data.ridesToday as TaxiRide[]);
                setAllWeekRides(res.data.ridesWeek as TaxiRide[]);
                setCalls(res.data.calls || []);
                if (res.data.tables?.rides || res.data.tables?.calls) {
                    const nextRealtimeTables = {
                        rides: res.data.tables?.rides || "taxi_rides",
                        calls: res.data.tables?.calls || "calls",
                    };
                    setRealtimeTables((current) =>
                        current.rides === nextRealtimeTables.rides && current.calls === nextRealtimeTables.calls
                            ? current
                            : nextRealtimeTables
                    );
                }

                // Fallback na mock cenník ak by taxi_rate_cards neexistovala alebo bola úplne prázdna (aby "cennik nechybal uplne")
                const fetchedPrices = res.data.prices as TaxiPrice[];
                setPrices(fetchedPrices && fetchedPrices.length > 0 ? fetchedPrices : mockTaxiPrices);

                setLastUpdated(new Date());
                setDataSource("server");
            } else {
                console.warn("Server action error, using mock:", res.error);
                setRidesToday(mockRides.filter(r => new Date(r.created_at).toDateString() === new Date().toDateString()));
                setAllWeekRides(mockRides);
                setPrices(mockTaxiPrices);
                setCalls([]);
                setDataSource("mock");
            }
        } catch (err) {
            console.error("fetchData exception:", err);
            setRidesToday(mockRides.filter(r => new Date(r.created_at).toDateString() === new Date().toDateString()));
            setAllWeekRides(mockRides);
            setPrices(mockTaxiPrices);
            setCalls([]);
            setDataSource("mock");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();

        return () => {
        };
    }, [fetchData]);

    useEffect(() => {
        const ridesSub = taxiSupabase
            .channel('taxi-rides-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: realtimeTables.rides }, (payload) => {
                console.log("Realtime: New ride inserted! Payload:", payload);
                if (payload.new) {
                    const newRide = payload.new as TaxiRide;
                    setRidesToday(prev => [newRide, ...prev]);
                    setAllWeekRides(prev => [newRide, ...prev].slice(0, 500));
                }
                fetchData();
                playNotificationSound();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: realtimeTables.rides }, (payload) => {
                console.log("Realtime: Ride change detected", payload.eventType);
                if (payload.eventType !== 'INSERT') fetchData();
            })
            .subscribe((status) => {
                console.log("Realtime (rides) status:", status);
            });

        const callsSub = taxiSupabase
            .channel('taxi-calls-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: realtimeTables.calls }, (payload) => {
                console.log("Realtime: New call inserted! Payload:", payload);
                if (payload.new) {
                    setCalls(prev => [payload.new, ...prev].slice(0, 100));
                }
                fetchData();
                playNotificationSound();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: realtimeTables.calls }, (payload) => {
                console.log("Realtime: Call change detected", payload.eventType);
                if (payload.eventType !== 'INSERT') fetchData();
            })
            .subscribe((status) => {
                console.log("Realtime (calls) status:", status);
            });

        return () => {
            taxiSupabase.removeChannel(ridesSub);
            taxiSupabase.removeChannel(callsSub);
        };
    }, [fetchData, realtimeTables]);

    const salesData = useMemo(() => buildTaxiSalesData(allWeekRides.length > 0 ? allWeekRides : ridesToday), [allWeekRides, ridesToday]);
    const heatmap = useMemo(() => buildTaxiHeatmapData(allWeekRides.length > 0 ? allWeekRides : ridesToday), [allWeekRides, ridesToday]);

    // Prispôsobenie mapových pípov pre OrdersMap (Očakáva pole s `delivery_address` a `created_at`)
    const todayStr = new Date().toDateString();

    const mappedOrdersToday = ridesToday
        .map(r => ({ ...r, delivery_address: r.dropoff_address, total_price: String(r.fare_amount || r.price_estimate || 0), status: (r.status === "DONE" || r.status === "COMPLETED") ? "DONE" : "NEW" } as any));

    const mappedOrdersWeek = allWeekRides
        .map(r => ({ ...r, delivery_address: r.dropoff_address, total_price: String(r.fare_amount || r.price_estimate || 0), status: (r.status === "DONE" || r.status === "COMPLETED") ? "DONE" : "NEW" } as any));

    // Nastavenie pevných známych ulíc/zón (z Pizza modulu sú to Streets)
    const defaultStreets = ["Námestie majstra pavla", "Sídlisko Západ", "Košická", "Ždiarska", "Czausika", "Nemocnica", "Autobusová stanica"];

    if (loading && allWeekRides.length === 0) {
        return (
            <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ width: 14, height: 14, border: "2px solid var(--cyan)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                    Načítavam taxi dáta (server-side)...
                </div>
                <style dangerouslySetInnerHTML={{ __html: `@keyframes spin {to {transform: rotate(360deg); } }` }} />
            </div>
        );
    }

    return (
        <div style={{ background: "var(--bg)", minHeight: "100vh", paddingTop: "100px" }}>
            <Navbar />

            <main style={{ maxWidth: "90rem", margin: "0 auto", padding: "2rem" }}>
                <div style={{ marginBottom: "1.5rem" }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: "0.5rem" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: dataSource === "server" ? "#4ade80" : "#f59e0b", display: "inline-block" }} />
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                            {dataSource === "server" 
                                ? `Live dáta zo Servera • Naposledy: ${lastUpdated.toLocaleTimeString("sk-SK")}` 
                                : "Mock dáta (Server fallback)"}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fff" }}>Taxi Dispečing</h1>
                    </div>
                </div>

                <DashboardHeader onRefresh={fetchData} />

                <TaxiKpiCards rides={allWeekRides} />

                {/* Tabuľka jázd */}
                <div style={{ marginBottom: "1.5rem" }}>
                    <TaxiRidesTable rides={allWeekRides} calls={calls} />
                </div>

                {/* Predaj (7 dní) + Heatmapa objednávok */}
                <div
                    className="charts-row"
                    style={{ display: "flex", gap: "1.5rem", alignItems: "stretch", marginBottom: "1.5rem" }}
                >
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                        <SalesChart data={salesData} />
                    </div>
                    <OrdersHeatmap data={heatmap.data} days={heatmap.days} />
                </div>

                {/* Heatmapa miest/ulíc (OrdersMap) + Cenník zón */}
                <div
                    className="charts-row"
                    style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap" }}
                >
                    <OrdersMap ordersToday={mappedOrdersToday} ordersWeek={mappedOrdersWeek} dbStreets={defaultStreets} />
                    <TaxiPricesTable prices={prices} onRefresh={fetchData} />
                </div>
            </main>
        </div>
    );
}
