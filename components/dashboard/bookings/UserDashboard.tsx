"use client";

import { useState, useEffect } from "react";
import { fetchUserDashboardDataAction, deleteBookingAction } from "@/app/actions/bookings";
import { Calendar, Clock, Loader2, Trash2, X } from "lucide-react";

export default function UserDashboard({ session }: { session: any }) {
    const [bookings, setBookings] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; bookingId?: string; isError?: boolean; message?: string }>({ isOpen: false });

    useEffect(() => {
        async function loadData() {
            const res = await fetchUserDashboardDataAction();
            if (res.success) {
                setBookings(res.bookings);
                setStats(res.stats);
            }
            setLoading(false);
        }
        loadData();
    }, []);

    const handleCancelBooking = async () => {
        const id = cancelModal.bookingId;
        if (!id) return;
        setCancelModal(prev => ({ ...prev, isOpen: false }));
        setLoading(true);
        const res = await deleteBookingAction(id);
        if (res.success) {
            const newData = await fetchUserDashboardDataAction();
            if (newData.success) {
                setBookings(newData.bookings);
                setStats(newData.stats);
            }
        } else {
            setCancelModal({ isOpen: true, isError: true, message: res.error || "Nepodarilo sa zrušiť rezerváciu." });
        }
        setLoading(false);
    };

    const futureBookings = bookings.filter(b => new Date(b.start).getTime() > Date.now()).reverse();
    const pastBookings = bookings.filter(b => new Date(b.start).getTime() <= Date.now());

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 w-full animate-fade-in">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Vitaj, {session.name}</h1>
                    <p className="text-slate-400">Tvoj osobný prehľad rezervácií.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock className="w-24 h-24 text-cyan-400" />
                    </div>
                    <h3 className="text-slate-400 font-medium mb-1">Odohrané tento mesiac</h3>
                    <div className="text-4xl font-bold text-white">{(stats?.pastHoursThisMonth || 0).toFixed(1).replace('.0', '')} <span className="text-xl text-slate-500 font-normal">hodín</span></div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Calendar className="w-24 h-24 text-cyan-400" />
                    </div>
                    <h3 className="text-slate-400 font-medium mb-1">Celkový počet rezervácií</h3>
                    <div className="text-4xl font-bold text-white">{stats?.totalBookings || 0}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
                <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-4">Nadchádzajúce termíny</h2>
                    {futureBookings.length === 0 ? (
                        <p className="text-slate-400 text-sm">Nemáš žiadne nadchádzajúce rezervácie.</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {futureBookings.map((b, i) => {
                                const canCancel = new Date(b.start).getTime() > Date.now() + 24 * 60 * 60 * 1000;
                                return (
                                    <div key={i} className="flex justify-between items-center p-3 rounded-2xl bg-white/5 border border-white/5 group relative overflow-hidden transition-all hover:bg-white/10">
                                        <div>
                                            <div className="font-semibold text-cyan-300">{new Date(b.start).toLocaleDateString("sk-SK")}</div>
                                            <div className="text-xs text-slate-400 uppercase tracking-widest">{b.courtId.replace("-", " ")}</div>
                                        </div>
                                        <div className="text-right flex items-center gap-3">
                                            <div className="font-bold text-white">
                                                {new Date(b.start).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })} - {new Date(b.end).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}
                                            </div>
                                            {canCancel && (
                                                <button 
                                                    onClick={() => setCancelModal({ isOpen: true, bookingId: b.id })}
                                                    className="p-2 rounded-full text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors"
                                                    title="Zrušiť rezerváciu (viac ako 24h vopred)"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-4">História</h2>
                    {pastBookings.length === 0 ? (
                        <p className="text-slate-400 text-sm">Zatiaľ nemáš žiadnu históriu rezervácií.</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {pastBookings.map((b, i) => (
                                <div key={i} className="flex justify-between items-center p-3 rounded-2xl bg-white/5 border border-white/5 opacity-70">
                                    <div>
                                        <div className="font-semibold text-slate-300">{new Date(b.start).toLocaleDateString("sk-SK")}</div>
                                        <div className="text-xs text-slate-500 uppercase tracking-widest">{b.courtId.replace("-", " ")}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-slate-400">{new Date(b.start).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })} - {new Date(b.end).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            {cancelModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => cancelModal.isError ? setCancelModal({ isOpen: false }) : null} />
                    <div className="relative max-w-sm w-full bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl animate-scale-in flex flex-col items-center text-center">
                        <div className={`p-4 rounded-full mb-4 ${cancelModal.isError ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            {cancelModal.isError ? <X className="w-8 h-8" /> : <Trash2 className="w-8 h-8" />}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                            {cancelModal.isError ? "Chyba" : "Zrušiť rezerváciu"}
                        </h3>
                        <p className="text-slate-400 mb-6 text-sm">
                            {cancelModal.message || "Naozaj chcete zrušiť túto rezerváciu? Táto akcia je nevratná."}
                        </p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setCancelModal({ isOpen: false })} className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-colors">
                                {cancelModal.isError ? "Zavrieť" : "Nie, ponechať"}
                            </button>
                            {!cancelModal.isError && (
                                <button onClick={handleCancelBooking} className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all">
                                    Áno, zrušiť
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
