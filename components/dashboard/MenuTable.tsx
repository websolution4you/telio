"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface MenuItem {
    id: number;
    name: string;
    price: number;
    weight_grams: number | null;
    ingredients: string | null;
}

export default function MenuItemsConfig() {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [editForm, setEditForm] = useState<Partial<MenuItem>>({});

    useEffect(() => {
        fetchMenu();
    }, []);

    const fetchMenu = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from("menu_items").select("*").order("id");
            if (!error && data) {
                setItems(data);
            }
        } catch (e) {
            console.error("fetchMenu err", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editingItem) return;
        try {
            const { error } = await supabase.from("menu_items").update(editForm).eq("id", editingItem.id);
            if (!error) {
                setEditingItem(null);
                fetchMenu();
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "1.5rem", flex: 1, position: "relative" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: "1.25rem" }}>
                <div>
                    <h2 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#fff" }}>Menu položky</h2>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>Editácia dostupných jedál a nápojov</p>
                </div>
            </div>

            {loading ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Načítavam menu...</div>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "0.75rem", textAlign: "left" }}>
                                <th style={{ padding: "0 12px 12px" }}>Názov</th>
                                <th style={{ padding: "0 12px 12px" }}>Cena (€)</th>
                                <th style={{ padding: "0 12px 12px" }}>Hmotnosť (g)</th>
                                <th style={{ padding: "0 12px 12px" }}>Zloženie</th>
                                <th style={{ padding: "0 12px 12px", textAlign: "right" }}>Akcie</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr><td colSpan={5} style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>Zatiaľ nie sú pridané žiadne položky.</td></tr>
                            ) : items.map((item) => (
                                <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                    <td style={{ padding: "12px", color: "#fff", fontSize: "0.85rem", fontWeight: 500 }}>{item.name}</td>
                                    <td style={{ padding: "12px", color: "var(--cyan)", fontSize: "0.85rem", fontWeight: 600 }}>{item.price?.toFixed(2)} €</td>
                                    <td style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.85rem" }}>{item.weight_grams ? `${item.weight_grams}g` : "-"}</td>
                                    <td style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                        <div style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.ingredients || ""}>
                                            {item.ingredients || "-"}
                                        </div>
                                    </td>
                                    <td style={{ padding: "12px", textAlign: "right" }}>
                                        <button
                                            onClick={() => { setEditingItem(item); setEditForm(item); }}
                                            style={{ padding: "4px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "#fff", borderRadius: 6, cursor: "pointer", fontSize: "0.75rem", transition: "all 0.2s" }}
                                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "var(--cyan)"; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                                        >
                                            Upraviť
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Simple Edit Modal Overlay */}
            {editingItem && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
                    <div style={{ background: "var(--bg-card)", border: "1px solid var(--cyan)", borderRadius: 12, padding: "2rem", width: "100%", maxWidth: 450, boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }}>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginBottom: "1.5rem" }}>Upraviť položku</h3>

                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div>
                                <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Názov jedla</label>
                                <input className="edit-input" style={{ width: "100%" }} value={editForm.name ?? ""} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                <div>
                                    <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Cena (€)</label>
                                    <input type="number" step="0.1" className="edit-input" style={{ width: "100%" }} value={editForm.price ?? 0} onChange={e => setEditForm({ ...editForm, price: parseFloat(e.target.value) })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Hmotnosť (g)</label>
                                    <input type="number" className="edit-input" style={{ width: "100%" }} value={editForm.weight_grams ?? 0} onChange={e => setEditForm({ ...editForm, weight_grams: parseInt(e.target.value) })} />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Zloženie</label>
                                <textarea className="edit-input" style={{ width: "100%", height: 80, resize: "none" }} value={editForm.ingredients ?? ""} onChange={e => setEditForm({ ...editForm, ingredients: e.target.value })} />
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
