"use client";

import { useState, useEffect } from "react";
import { updateMenuItemAction, createMenuItemAction, deleteMenuItemAction } from "@/app/actions/dashboard";
import { Plus, Trash2, CheckCircle, XCircle, X } from "lucide-react";

export interface MenuItem {
    id: number;
    name: string;
    price: number;
    weight_grams: number | null;
    ingredients: string | null;
    display_order: number | null;
}

interface MenuTableProps {
    items: MenuItem[];
    onRefresh: () => void;
}

interface Toast {
    id: number;
    message: string;
    type: "success" | "error";
}

export default function MenuItemsConfig({ items, onRefresh }: MenuTableProps) {
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [editForm, setEditForm] = useState<Partial<MenuItem>>({});
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (message: string, type: "success" | "error" = "success") => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };

    const removeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

    const handleSave = async () => {
        try {
            let res;
            const isUpdate = !!editingItem;
            if (isCreating) {
                res = await createMenuItemAction(editForm);
            } else if (editingItem) {
                res = await updateMenuItemAction(editingItem.id, editForm);
            } else {
                return;
            }

            if (res.success) {
                showToast(isUpdate ? "Položka bola úspešne upravená." : "Položka bola úspešne pridaná.", "success");
                setEditingItem(null);
                setIsCreating(false);
                setEditForm({});
                onRefresh();
            } else {
                showToast("Chyba pri ukladaní: " + res.error, "error");
            }
        } catch (e) {
            console.error(e);
            showToast("Chyba pri ukladaní menu položky.", "error");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Naozaj chcete vymazať túto položku?")) return;
        try {
            const res = await deleteMenuItemAction(id);
            if (res.success) {
                showToast("Položka bola vymazaná.", "success");
                onRefresh();
            } else {
                showToast("Chyba pri mazaní: " + res.error, "error");
            }
        } catch (e) {
            console.error(e);
            showToast("Chyba pri mazaní položky.", "error");
        }
    };

    const openCreateModal = () => {
        setIsCreating(true);
        setEditForm({
            name: "",
            price: 0,
            weight_grams: 0,
            ingredients: "",
            display_order: (items.length > 0 ? Math.max(...items.map(i => i.display_order || 0)) + 1 : 1)
        });
    };

    return (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "1.5rem", flex: 1, position: "relative" }}>

            {/* Toast notifications */}
            <div style={{ position: "fixed", bottom: "2rem", right: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem", zIndex: 9999, pointerEvents: "none" }}>
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "14px 18px",
                            borderRadius: 12,
                            background: toast.type === "success" ? "rgba(0, 20, 16, 0.97)" : "rgba(20, 4, 4, 0.97)",
                            border: `1px solid ${toast.type === "success" ? "rgba(0, 255, 209, 0.4)" : "rgba(255, 59, 48, 0.4)"}`,
                            boxShadow: `0 8px 32px ${toast.type === "success" ? "rgba(0,255,209,0.15)" : "rgba(255,59,48,0.15)"}, 0 2px 8px rgba(0,0,0,0.4)`,
                            backdropFilter: "blur(12px)",
                            minWidth: 280,
                            maxWidth: 380,
                            pointerEvents: "all",
                            animation: "toastIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
                        }}
                    >
                        {toast.type === "success"
                            ? <CheckCircle size={18} style={{ color: "var(--cyan)", flexShrink: 0 }} />
                            : <XCircle size={18} style={{ color: "#ff3b30", flexShrink: 0 }} />
                        }
                        <span style={{ color: "#fff", fontSize: "0.875rem", fontWeight: 500, flex: 1, lineHeight: 1.4 }}>
                            {toast.message}
                        </span>
                        <button
                            onClick={() => removeToast(toast.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: 2, display: "flex", flexShrink: 0 }}
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
            <div className="flex items-center justify-between" style={{ marginBottom: "1.25rem" }}>
                <div>
                    <h2 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#fff" }}>Menu položky</h2>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>Editácia dostupných jedál a nápojov</p>
                </div>
                <button
                    onClick={openCreateModal}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 16px",
                        background: "rgba(0, 255, 209, 0.1)",
                        border: "1px solid var(--cyan)",
                        color: "var(--cyan)",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        transition: "all 0.2s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(0, 255, 209, 0.2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(0, 255, 209, 0.1)"}
                >
                    <Plus size={16} />
                    Pridať položku
                </button>
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
                            <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    style={{ padding: "6px", background: "transparent", border: "1px solid rgba(255, 59, 48, 0.3)", color: "rgba(255, 59, 48, 0.7)", borderRadius: 6, cursor: "pointer", transition: "all 0.2s" }}
                                    onMouseEnter={e => { e.currentTarget.style.color = "#ff3b30"; e.currentTarget.style.borderColor = "#ff3b30"; e.currentTarget.style.background = "rgba(255, 59, 48, 0.1)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = "rgba(255, 59, 48, 0.7)"; e.currentTarget.style.borderColor = "rgba(255, 59, 48, 0.3)"; e.currentTarget.style.background = "transparent"; }}
                                    title="Vymazať"
                                >
                                    <Trash2 size={14} />
                                </button>
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

                        </div>
                        {item.ingredients && (
                            <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.05)", lineHeight: 1.4 }}>
                                {item.ingredients}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Simple Edit/Create Modal Overlay */}
            {(editingItem || isCreating) && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
                    <div style={{ background: "var(--bg-card)", border: "1px solid var(--cyan)", borderRadius: 12, padding: "2rem", width: "100%", maxWidth: 450, boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }}>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginBottom: "1.5rem" }}>
                            {isCreating ? "Pridať novú položku" : "Upraviť položku"}
                        </h3>

                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div>
                                <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Názov jedla</label>
                                <input className="edit-input" style={{ width: "100%" }} value={editForm.name ?? ""} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                <div>
                                    <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Hmotnosť (g)</label>
                                    <input type="number" className="edit-input" style={{ width: "100%" }} value={editForm.weight_grams ?? 0} onChange={e => setEditForm({ ...editForm, weight_grams: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Poradie zobrazenia</label>
                                    <input type="number" className="edit-input" style={{ width: "100%" }} value={editForm.display_order ?? 0} onChange={e => setEditForm({ ...editForm, display_order: parseInt(e.target.value) })} />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Zloženie</label>
                                <textarea className="edit-input" style={{ width: "100%", height: 80, resize: "none" }} value={editForm.ingredients ?? ""} onChange={e => setEditForm({ ...editForm, ingredients: e.target.value })} />
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end" style={{ marginTop: "2rem" }}>
                            <button onClick={() => { setEditingItem(null); setIsCreating(false); }} style={{ padding: "8px 16px", background: "transparent", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8, cursor: "pointer", fontSize: "0.85rem" }}>Zrušiť</button>
                            <button onClick={handleSave} style={{ padding: "8px 20px", background: "rgba(0, 255, 209, 0.15)", border: "1px solid var(--cyan)", color: "var(--cyan)", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>
                                {isCreating ? "Vytvoriť" : "Uložiť zmeny"}
                            </button>
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
            @keyframes toastIn {
                from { opacity: 0; transform: translateY(12px) scale(0.95); }
                to   { opacity: 1; transform: translateY(0)   scale(1);    }
            }
            `}} />
        </div>
    );
}
