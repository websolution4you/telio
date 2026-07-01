"use client";

import { useState } from "react";
import { loginAction } from "@/app/actions/auth";
import { LogIn } from "lucide-react";

type LoginFormProps = {
    onSuccess: () => void;
    onSwitchToRegister: () => void;
};

export default function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const result = await loginAction(email, password);

            if (result.success) {
                onSuccess();
            } else {
                setError(result.error || "Chyba pri prihlasovaní");
            }
        } catch (err) {
            setError("Chyba pri prihlasovaní");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center mb-6">
                <h1
                    className="text-2xl font-bold text-white mb-1 tracking-wide"
                    style={{
                        fontFamily: "var(--font-poppins), sans-serif",
                        textShadow: "0 0 20px rgba(123, 97, 255, 0.3)",
                    }}
                >
                    ONLINE <span style={{ color: "rgba(0,255,209,0.9)" }}>REZERVÁCIA ŠPORTOVÍSK</span>
                </h1>
            </div>

            {error && (
                <div
                    className="rounded-lg p-3 text-sm text-red-400 border border-red-500/30"
                    style={{ background: "rgba(239, 68, 68, 0.1)" }}
                >
                    {error}
                </div>
            )}

            <div>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border bg-white/95 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
                    style={{ borderColor: "rgba(0,255,209,0.3)" }}
                    placeholder="LOGIN"
                    disabled={loading}
                />
            </div>

            <div>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border bg-white/95 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
                    style={{ borderColor: "rgba(0,255,209,0.3)" }}
                    placeholder="**********"
                    disabled={loading}
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-full font-bold text-base text-white tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:scale-[1.02]"
                style={{
                    background:
                        "linear-gradient(135deg, rgba(0,255,209,0.9), rgba(123,97,255,0.9))",
                    boxShadow: "0 4px 15px rgba(0,255,209,0.3)",
                }}
            >
                {loading ? "PRIHLASOVANIE..." : "PRIHLÁSIŤ"}
            </button>

            <div className="text-center text-xs text-gray-400 pt-2">
                Nemáte účet?{" "}
                <button
                    type="button"
                    onClick={onSwitchToRegister}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors underline"
                >
                    Registrovať
                </button>
            </div>
        </form>
    );
}
