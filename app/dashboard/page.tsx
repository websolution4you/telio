"use client";

export default function DashboardIndexPage() {
    return (
        <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center p-6 sm:p-12 md:p-20">
            <div className="max-w-4xl w-full flex flex-col items-center">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 text-center tracking-tight">
                    Vyberte projekt
                </h1>
                <p className="text-white/50 mb-12 text-center text-sm sm:text-base md:text-lg max-w-lg">
                    Tento rozcestník je dočasný a nahradí ho neskôr tenant login flow.
                </p>

                <div className="flex flex-col md:flex-row gap-6 w-full justify-center items-stretch">
                    {/* Pizza Dashboard */}
                    <a
                        href="/dashboard/pizza"
                        className="group flex flex-col items-center p-8 sm:p-10 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:-translate-y-1 transition-all duration-300 w-full md:w-[320px] text-center"
                    >
                        <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform duration-300">🍕</div>
                        <h2 className="text-xl sm:text-2xl font-bold text-cyan-400 mb-3">
                            Dashboard Pizza
                        </h2>
                        <p className="text-sm text-white/60 leading-relaxed">
                            Reálne dáta pre pizzeria tenant, prepojené s pizza databázou.
                        </p>
                    </a>

                    {/* Taxi Dashboard */}
                    <a
                        href="/dashboard/taxi"
                        className="group flex flex-col items-center p-8 sm:p-10 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/10 hover:border-white/30 hover:-translate-y-1 transition-all duration-300 w-full md:w-[320px] text-center"
                    >
                        <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform duration-300">🚕</div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
                            Dashboard Taxi
                        </h2>
                        <p className="text-sm text-white/40 leading-relaxed">
                            Pripravené na napojenie reálnych taxi dát. Placeholder mód.
                        </p>
                    </a>
                </div>
            </div>
        </div>
    );
}
