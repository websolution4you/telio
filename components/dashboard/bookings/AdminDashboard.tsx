"use client";

import { useState, useEffect } from "react";
import { fetchAdminDashboardDataAction, createBookingAction } from "@/app/actions/bookings";
import { useLang } from "@/lib/i18n";
import { Users, Calendar, Activity, Loader2, Wrench, X, Check } from "lucide-react";

export default function AdminDashboard({ session }: { session: any }) {
    const { t, lang } = useLang();
    const [bookings, setBookings] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    const [selectedCustomerProfile, setSelectedCustomerProfile] = useState<string | null>(null);

    const getCustomerStats = (name: string) => {
        if (!name) return null;
        const cBookings = bookings.filter(b => b.customerName?.trim().toLowerCase() === name.trim().toLowerCase())
            .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
        if (cBookings.length === 0) return null;
        
        const totalBookings = cBookings.length;
        const totalRevenue = cBookings.reduce((sum, b) => sum + (b.price || 0), 0);
        const totalHours = cBookings.reduce((sum, b) => {
            const duration = (new Date(b.end).getTime() - new Date(b.start).getTime()) / (1000 * 60 * 60);
            return sum + (duration > 0 ? duration : 0);
        }, 0);
        return { name, totalBookings, totalRevenue, totalHours, recentBookings: cBookings.slice(0, 5) };
    };

    const customerStats = selectedCustomerProfile ? getCustomerStats(selectedCustomerProfile) : null;

    const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
    const [maintenanceCourt, setMaintenanceCourt] = useState("badminton-1");
    const [maintenanceDate, setMaintenanceDate] = useState("");
    const [maintenanceStart, setMaintenanceStart] = useState("07:00");
    const [maintenanceEnd, setMaintenanceEnd] = useState("09:00");
    const [maintenanceLoading, setMaintenanceLoading] = useState(false);

    const handleMaintenanceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMaintenanceLoading(true);
        try {
            const startIso = new Date(`${maintenanceDate}T${maintenanceStart}:00`).toISOString();
            const endIso = new Date(`${maintenanceDate}T${maintenanceEnd}:00`).toISOString();
            const res = await createBookingAction({
                courtId: maintenanceCourt,
                title: "Údržba",
                customerName: "Admin Údržba",
                start: startIso,
                end: endIso,
                status: "blocked",
                source: "admin"
            });
            if (res.success) {
                setIsMaintenanceModalOpen(false);
                const newData = await fetchAdminDashboardDataAction();
                if (newData.success) {
                    setBookings(newData.bookings || []);
                    setStats(newData.stats);
                }
            } else {
                alert(res.error);
            }
        } catch (error) {
            alert("Neplatný dátum alebo čas");
        }
        setMaintenanceLoading(false);
    };

    useEffect(() => {
        async function loadData() {
            const res = await fetchAdminDashboardDataAction();
            if (res.success) {
                setBookings(res.bookings || []);
                setStats(res.stats);
            }
            setLoading(false);
        }
        loadData();
    }, []);

    const futureBookings = bookings.filter(b => new Date(b.start).getTime() > Date.now());

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
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3 border border-cyan-400/20">
                        {t.dashboard.adminAccess}
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{t.dashboard.adminOverview}</h1>
                    <p className="text-slate-400">{t.dashboard.adminSubtitle}</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setIsMaintenanceModalOpen(true)} className="btn-primary px-5 py-2.5 flex items-center gap-2 text-sm">
                        <Wrench className="w-4 h-4" />
                        {t.dashboard.blockCourt}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Activity className="w-24 h-24 text-emerald-400" />
                    </div>
                    <h3 className="text-slate-400 font-medium mb-1">{t.dashboard.estimatedRevenue}</h3>
                    <div className="text-4xl font-bold text-white">
                        {((stats?.pastRevenueThisMonth || 0) + (stats?.futureRevenueThisMonth || 0)).toFixed(0)} €
                    </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Activity className="w-24 h-24 text-cyan-400" />
                    </div>
                    <h3 className="text-slate-400 font-medium mb-1">{lang === 'en' ? "Realized (Month)" : "Zrealizované (Mesiac)"}</h3>
                    <div className="text-4xl font-bold text-white">{stats?.pastHoursThisMonth?.toFixed(1) || 0} h</div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Calendar className="w-24 h-24 text-purple-400" />
                    </div>
                    <h3 className="text-slate-400 font-medium mb-1">{lang === 'en' ? "Planned (Month)" : "Plánované (Mesiac)"}</h3>
                    <div className="text-4xl font-bold text-white">{stats?.futureHoursThisMonth?.toFixed(1) || 0} h</div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users className="w-24 h-24 text-blue-400" />
                    </div>
                    <h3 className="text-slate-400 font-medium mb-1">{lang === 'en' ? "All bookings" : "Všetky rezervácie"}</h3>
                    <div className="text-4xl font-bold text-white">{stats?.totalBookings || 0}</div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users className="w-24 h-24 text-green-400" />
                    </div>
                    <h3 className="text-slate-400 font-medium mb-1">{lang === 'en' ? "Active customers" : "Aktívni zákazníci"}</h3>
                    <div className="text-4xl font-bold text-white">{stats?.activeCustomers || 0}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <div className="md:col-span-2 rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-6">{lang === 'en' ? "Utilization (Mon - Sun)" : "Vyťaženosť (Pondelok - Nedeľa)"}</h2>
                    <div className="overflow-x-auto">
                        <div className="min-w-[600px]">
                            <div className="grid gap-1 text-center text-xs text-slate-500 mb-2" style={{ gridTemplateColumns: "30px repeat(16, minmax(0, 1fr))" }}>
                                <div>{lang === 'en' ? "Day" : "Deň"}</div>
                                {[...Array(16)].map((_, i) => (
                                    <div key={i}>{i + 7}</div>
                                ))}
                            </div>
                            {(lang === 'en' ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] : ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne']).map((dayName, dayIndex) => (
                                <div key={dayName} className="grid gap-1 mb-1 items-center" style={{ gridTemplateColumns: "30px repeat(16, minmax(0, 1fr))" }}>
                                    <div className="text-xs text-slate-400 font-medium pr-2 text-right">{dayName}</div>
                                    {[...Array(16)].map((_, hourOffset) => {
                                        const count = stats?.heatmap?.[dayIndex]?.[hourOffset + 7] || 0;
                                        const maxCount = Math.max(1, ...((stats?.heatmap || []).flat()));
                                        const opacity = count === 0 ? 0.05 : Math.max(0.2, count / maxCount);
                                        return (
                                            <div 
                                                key={hourOffset} 
                                                className="h-8 rounded-md bg-cyan-400 transition-opacity duration-300 hover:opacity-100"
                                                style={{ opacity }}
                                                title={`${count} ${t.dashboard.bookings}`}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-6">{lang === 'en' ? "VIP Customers" : "VIP Zákazníci"}</h2>
                    <div className="space-y-4">
                        {(stats?.topCustomers || []).map((c: any, i: number) => (
                            <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
                                        {i + 1}
                                    </div>
                                    <button onClick={() => setSelectedCustomerProfile(c.name)} className="font-medium text-white capitalize hover:text-cyan-400 hover:underline text-left">
                                        {c.name}
                                    </button>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-emerald-400">{c.revenue?.toFixed(2) || '0.00'} €</div>
                                    <div className="text-xs text-slate-500">{c.hours.toFixed(1)} h ({c.count} rez.)</div>
                                </div>
                            </div>
                        ))}
                        {(!stats?.topCustomers || stats.topCustomers.length === 0) && (
                            <div className="text-center text-slate-500 py-4">{t.dashboard.noData}</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 shadow-xl mt-4">
                <h2 className="text-xl font-bold text-white mb-6">{t.dashboard.upcomingBookings}</h2>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 text-slate-400 text-[10px] md:text-sm uppercase tracking-wider">
                                <th className="pb-3 pr-2 md:pr-4 font-medium">{t.dashboard.date}</th>
                                <th className="pb-3 pr-2 md:pr-4 font-medium">{t.dashboard.time}</th>
                                <th className="pb-3 pr-2 md:pr-4 font-medium">{t.dashboard.customer}</th>
                                <th className="pb-3 pr-2 md:pr-4 font-medium">{t.dashboard.court}</th>
                                <th className="pb-3 font-medium text-center">{t.dashboard.status}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {futureBookings.slice(0, 10).map((b, i) => (
                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                    <td className="py-3 md:py-4 pr-2 md:pr-4 text-white text-[10px] md:text-sm font-medium whitespace-nowrap">{new Date(b.start).toLocaleDateString("sk-SK")}</td>
                                    <td className="py-3 md:py-4 pr-2 md:pr-4 text-slate-300 text-[10px] md:text-sm whitespace-nowrap">
                                        <div className="flex flex-col leading-tight md:leading-normal">
                                            <span>{new Date(b.start).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}</span>
                                            <span>{new Date(b.end).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 md:py-4 pr-2 md:pr-4 font-semibold">
                                        <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                                            <button onClick={() => setSelectedCustomerProfile(b.customerName)} className="text-xs md:text-sm font-medium text-white hover:text-cyan-400 hover:underline text-left">
                                                {b.customerName}
                                            </button>
                                            {(() => {
                                                const rank = stats?.topCustomers ? stats.topCustomers.findIndex((c: any) => c.name.toLowerCase() === (b.customerName || '').trim().toLowerCase()) : -1;
                                                if (rank >= 0) {
                                                    return (
                                                        <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-[9px] md:text-[10px] font-bold text-white shadow-sm flex-shrink-0" title={lang === 'en' ? `Top ${rank + 1} Customer` : `Top ${rank + 1} Zákazník`}>
                                                            {rank + 1}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    </td>
                                    <td className="py-3 md:py-4 pr-2 md:pr-4 text-slate-400 uppercase text-[9px] md:text-xs tracking-widest whitespace-nowrap">{b.courtId.replace(/tennis/i, "TEN").replace(/badminton/i, "BAD").replace(/squash/i, "SQU").replace("-", " ")}</td>
                                    <td className="py-3 md:py-4 whitespace-nowrap text-center">
                                        <div className={`inline-flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full ${
                                            b.status === 'blocked' ? 'bg-orange-500/20 text-orange-400' : 
                                            b.status === 'cancelled' ? 'bg-red-400/10 text-red-400' :
                                            'bg-green-500/20 text-green-400'
                                        }`} title={b.status === 'blocked' ? t.dashboard.maintenance : b.status === 'cancelled' ? t.dashboard.cancelled : t.dashboard.confirmed}>
                                            {b.status === 'blocked' ? <Wrench className="w-3 h-3 md:w-4 md:h-4" /> : 
                                             b.status === 'cancelled' ? <X className="w-3 h-3 md:w-4 md:h-4" /> : 
                                             <Check className="w-3 h-3 md:w-4 md:h-4" strokeWidth={3} />}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {futureBookings.length === 0 && (
                        <div className="py-8 text-center text-slate-400">{t.dashboard.noUpcoming}</div>
                    )}
                </div>
            </div>

            {/* Maintenance Modal */}
            {isMaintenanceModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMaintenanceModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Wrench className="w-5 h-5 text-cyan-400" />
                                {lang === 'en' ? "Block court" : "Zablokovať kurt"}
                            </h3>
                            <button onClick={() => setIsMaintenanceModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleMaintenanceSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">{t.dashboard.court}</label>
                                <select 
                                    value={maintenanceCourt}
                                    onChange={(e) => setMaintenanceCourt(e.target.value)}
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-cyan-400"
                                    required
                                >
                                    <option value="badminton-1">Bedminton 1</option>
                                    <option value="badminton-2">Bedminton 2</option>
                                    <option value="badminton-3">Bedminton 3</option>
                                    <option value="badminton-4">Bedminton 4</option>
                                    <option value="tennis-1">Tenis 1</option>
                                    <option value="tennis-2">Tenis 2</option>
                                    <option value="tennis-clay-1">Tenis Antuka 1</option>
                                    <option value="tennis-clay-2">Tenis Antuka 2</option>
                                    <option value="squash-1">Squash 1</option>
                                    <option value="squash-2">Squash 2</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">{t.dashboard.date}</label>
                                <input 
                                    type="date"
                                    value={maintenanceDate}
                                    onChange={(e) => setMaintenanceDate(e.target.value)}
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-cyan-400 [color-scheme:dark]"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">{lang === 'en' ? "From" : "Od"}</label>
                                    <input 
                                        type="time"
                                        value={maintenanceStart}
                                        onChange={(e) => setMaintenanceStart(e.target.value)}
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-cyan-400 [color-scheme:dark]"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">{lang === 'en' ? "To" : "Do"}</label>
                                    <input 
                                        type="time"
                                        value={maintenanceEnd}
                                        onChange={(e) => setMaintenanceEnd(e.target.value)}
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-cyan-400 [color-scheme:dark]"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsMaintenanceModalOpen(false)} className="flex-1 px-4 py-2 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-colors">
                                    {t.dashboard.cancel}
                                </button>
                                <button type="submit" disabled={maintenanceLoading} className="flex-1 btn-primary font-medium flex justify-center items-center">
                                    {maintenanceLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (lang === 'en' ? "Block" : "Zablokovať")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Customer Profile Modal */}
            {selectedCustomerProfile && customerStats && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedCustomerProfile(null)} />
                    <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-cyan-400" />
                                {lang === 'en' ? "Customer Profile" : "Profil Zákazníka"}
                            </h3>
                            <button onClick={() => setSelectedCustomerProfile(null)} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white capitalize mb-1">{customerStats.name}</div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-slate-800 rounded-2xl p-4 text-center border border-white/5">
                                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">{lang === 'en' ? "Bookings" : "Rezervácie"}</div>
                                    <div className="text-xl font-bold text-white">{customerStats.totalBookings}</div>
                                </div>
                                <div className="bg-slate-800 rounded-2xl p-4 text-center border border-white/5">
                                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">{lang === 'en' ? "Hours" : "Hodiny"}</div>
                                    <div className="text-xl font-bold text-cyan-400">{customerStats.totalHours.toFixed(1)}</div>
                                </div>
                                <div className="bg-slate-800 rounded-2xl p-4 text-center border border-white/5">
                                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">{lang === 'en' ? "Revenue" : "Tržby"}</div>
                                    <div className="text-xl font-bold text-emerald-400">{customerStats.totalRevenue.toFixed(2)} €</div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">{lang === 'en' ? "Last 5 bookings" : "Posledných 5 rezervácií"}</h4>
                                <div className="space-y-2">
                                    {customerStats.recentBookings.map((b: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                                            <div>
                                                <div className="text-sm font-medium text-white">{new Date(b.start).toLocaleDateString("sk-SK")}</div>
                                                <div className="text-xs text-slate-400 uppercase tracking-widest">{b.courtId.replace("-", " ")}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-slate-300">{new Date(b.start).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}</div>
                                                {b.price > 0 && <div className="text-xs text-emerald-400 font-bold">{b.price.toFixed(2)} €</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
