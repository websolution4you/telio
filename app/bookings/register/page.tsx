"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import { UserPlus, Sparkles } from "lucide-react";

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [cardNumber, setCardNumber] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Heslá sa nezhodujú");
            return;
        }

        setLoading(true);

        try {
            const result = await registerAction(name, email, password, cardNumber);

            if (result.success) {
                router.push("/bookings");
                router.refresh();
            } else {
                setError(result.error || "Chyba pri registrácii");
            }
        } catch (err) {
            setError("Chyba pri registrácii");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main
            className="min-h-screen grid-bg overflow-hidden flex items-center justify-center py-12"
            style={{ background: "var(--bg)" }}
        >
            <div
                className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full blur-[90px]"
                style={{
                    background:
                        "radial-gradient(ellipse, rgba(0,255,209,0.13), rgba(123,97,255,0.08), transparent 68%)",
                }}
            />

            <div className="relative z-10 w-full max-w-md px-6">
                <div
                    className="rounded-2xl border p-8"
                    style={{
                        borderColor: "rgba(0,255,209,0.2)",
                        background: "rgba(0,0,0,0.5)",
                        backdropFilter: "blur(10px)",
                    }}
                >
                    <div className="mb-8 text-center">
                        <div
                            className="inline-flex items-center gap-3 rounded-full border px-5 py-3 text-xs font-black uppercase tracking-[0.2em] mb-6"
                            style={{
                                borderColor: "rgba(0,255,209,0.25)",
                                background: "rgba(0,255,209,0.06)",
                                color: "var(--cyan)",
                            }}
                        >
                            <Sparkles className="h-4 w-4" /> Telio Bookings
                        </div>

                        <h1
                            className="text-3xl font-semibold text-white mb-2"
                            style={{
                                fontFamily: "var(--font-poppins), sans-serif",
                                textShadow:
                                    "0 0 25px rgba(123, 97, 255, 0.4), 0 0 50px rgba(123, 97, 255, 0.2)",
                            }}
                        >
                            Registrácia
                        </h1>
                        <p className="text-gray-400 text-sm">
                            Vytvorte si účet pre rezervačný systém NTC
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div
                                className="rounded-lg p-3 text-sm text-red-400 border border-red-500/30"
                                style={{ background: "rgba(239, 68, 68, 0.1)" }}
                            >
                                {error}
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="name"
                                className="block text-sm font-medium text-gray-300 mb-2"
                            >
                                Celé meno
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-lg border bg-black/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                style={{ borderColor: "rgba(0,255,209,0.2)" }}
                                placeholder="Ján Novák"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-gray-300 mb-2"
                            >
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-lg border bg-black/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                style={{ borderColor: "rgba(0,255,209,0.2)" }}
                                placeholder="vas@email.sk"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="cardNumber"
                                className="block text-sm font-medium text-gray-300 mb-2"
                            >
                                Číslo karty <span className="text-gray-500">(voliteľné)</span>
                            </label>
                            <input
                                id="cardNumber"
                                type="text"
                                value={cardNumber}
                                onChange={(e) => setCardNumber(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border bg-black/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                style={{ borderColor: "rgba(0,255,209,0.2)" }}
                                placeholder="NTC-12345"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-300 mb-2"
                            >
                                Heslo
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full px-4 py-3 rounded-lg border bg-black/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                style={{ borderColor: "rgba(0,255,209,0.2)" }}
                                placeholder="••••••••"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="confirmPassword"
                                className="block text-sm font-medium text-gray-300 mb-2"
                            >
                                Potvrdiť heslo
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full px-4 py-3 rounded-lg border bg-black/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                style={{ borderColor: "rgba(0,255,209,0.2)" }}
                                placeholder="••••••••"
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                            style={{
                                background:
                                    "linear-gradient(135deg, rgba(0,255,209,0.8), rgba(123,97,255,0.8))",
                            }}
                        >
                            <UserPlus className="h-5 w-5" />
                            {loading ? "Registrácia..." : "Zaregistrovať sa"}
                        </button>

                        <div className="text-center text-sm text-gray-400">
                            Už máte účet?{" "}
                            <Link
                                href="/bookings/login"
                                className="text-cyan-400 hover:text-cyan-300 transition-colors"
                            >
                                Prihláste sa
                            </Link>
                        </div>

                        <div className="text-center">
                            <Link
                                href="/"
                                className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
                            >
                                ← Späť na hlavnú stránku
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}
