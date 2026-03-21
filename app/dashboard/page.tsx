"use client";

export default function DashboardIndexPage() {
    return (
        <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center p-8">
            <div className="flex flex-col items-center">
                <h1 
                    className="text-3xl sm:text-4xl font-extrabold text-center tracking-tight"
                    style={{ marginBottom: '60px' }}
                >
                    Vyberte projekt
                </h1>

                <div 
                    className="flex flex-col md:flex-row justify-center items-center"
                    style={{ gap: '60px' }}
                >
                    {/* Pizza Dashboard */}
                    <a
                        href="/dashboard/pizza"
                        className="group flex flex-col items-center justify-center p-16 rounded-3xl bg-white/[0.03] border border-white/10 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:-translate-y-2 transition-all duration-500 w-[280px] aspect-square"
                    >
                        <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-500">🍕</div>
                        <h2 className="text-2xl font-bold text-cyan-400 tracking-tight">
                            Dashboard Pizza
                        </h2>
                    </a>

                    {/* Taxi Dashboard */}
                    <a
                        href="/dashboard/taxi"
                        className="group flex flex-col items-center justify-center p-16 rounded-3xl bg-white/[0.03] border border-white/10 hover:bg-white/10 hover:border-white/30 hover:-translate-y-2 transition-all duration-500 w-[280px] aspect-square"
                    >
                        <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-500">🚕</div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">
                            Dashboard Taxi
                        </h2>
                    </a>
                </div>
            </div>
        </div>
    );
}
