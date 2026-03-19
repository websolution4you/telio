"use client";

import { useState } from "react";
import { updateMenuItemAction } from "@/app/actions/dashboard";

export interface MenuItem {
    id: number;
    name: string;
    price: number;
    weight_grams: number | null;
    ingredients: string | null;
}

interface MenuTableProps {
    items: MenuItem[];
    onRefresh: () => void;
}

export default function MenuItemsConfig({ items, onRefresh }: MenuTableProps) {
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [editForm, setEditForm] = useState<Partial<MenuItem>>({});

    const handleSave = async () => {
        if (!editingItem) return;
        try {
            const res = await updateMenuItemAction(editingItem.id, editForm);
            if (res.success) {
                setEditingItem(null);
                onRefresh();
            } else {
                alert("Chyba pri ukladaní menu položky: " + res.error);
            }
        } catch (e) {
            console.error(e);
            alert("Chyba pri ukladaní menu položky.");
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

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "1rem" }}>
                {(!items || items.length === 0) ? (
                    <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", gridColumn: "1 / -1" }}>
                        Zatiaľ nie sú pridané žiadne položky.
                    </div>
                ) : items.map((item) => (
                    <div
                        key={item.id}
                        style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.05)",
                            borderRadius: 12,
                            padding: "1rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            transition: "background 0.2s"
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                            <div>
                                <h3 style={{ color: "#fff", fontSize: "0.95rem", fontWeight: 600, marginBottom: "4px" }}>{item.name}</h3>
                                {item.weight_grams && (
                                    <span style={{ display: "inline-block", background: "rgba(255,255,255,0.1)", color: "var(--text-muted)", fontSize: "0.7rem", padding: "2px 6px", borderRadius: 4 }}>
                                        {item.weight_grams}g
                                    </span>
                                )}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                                <div style={{ color: "var(--cyan)", fontSize: "1rem", fontWeight: 700 }}>
                                    {item.price?.toFixed(2)} €
                                </div>
                                <button
                                    onClick={() => { setEditingItem(item); setEditForm(item); }}
                                    style={{ padding: "4px 12px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 6, cursor: "pointer", fontSize: "0.75rem", transition: "all 0.2s" }}
                                    onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "var(--cyan)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                                >
                                    Upraviť
                                </button>
                            </div>
                        </div>
                        {item.ingredients && (
                            <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.05)", lineHeight: 1.4 }}>
                                {item.ingredients}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Simple Edit Modal Overlay */}
            {editingItem && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
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
