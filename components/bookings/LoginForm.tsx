"use client";

import { useState } from "react";
import { loginAction, resendVerificationEmailAction } from "@/app/actions/auth";
import { LogIn } from "lucide-react";

type LoginFormProps = {
    onSuccess: () => void;
    onSwitchToRegister: () => void;
};

export default function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
    const [resending, setResending] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleResend = async () => {
        const targetEmail = (pendingVerificationEmail || email).trim();
        if (!targetEmail) return;
        setResending(true);
        setError("");
        setNotice("");
        try {
            const origin = typeof window !== "undefined" ? window.location.origin : undefined;
            const res = await resendVerificationEmailAction(targetEmail, origin);
            if (res.success) {
                setNotice(res.message || "Nový overovací odkaz sme odoslali na váš e-mail.");
            } else {
                setError(res.error || "Nepodarilo sa odoslať overovací e-mail.");
            }
        } catch {
            setError("Nepodarilo sa odoslať overovací e-mail.");
        } finally {
            setResending(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setNotice("");
        setLoading(true);

        try {
            const result = await loginAction(email, password);

            if (result.success) {
                setPendingVerificationEmail(null);
                onSuccess();
            } else {
                if ((result as any).requiresEmailVerification) {
                    setPendingVerificationEmail((result as any).email || email.trim());
                }
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
                    className="rounded-lg p-3 text-sm text-red-400 border border-red-500/30 space-y-2"
                    style={{ background: "rgba(239, 68, 68, 0.1)" }}
                >
                    <div>{error}</div>
                    {pendingVerificationEmail && (
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={resending}
                            className="inline-block rounded-md border border-red-400/50 bg-red-950/40 px-3 py-1 text-xs font-semibold text-red-200 hover:bg-red-900/50 disabled:opacity-50"
                        >
                            {resending ? "Odosielam..." : "Znova odoslať overovací e-mail"}
                        </button>
                    )}
                </div>
            )}

            {notice && (
                <div
                    className="rounded-lg p-3 text-sm text-emerald-300 border border-emerald-500/30"
                    style={{ background: "rgba(16, 185, 129, 0.15)" }}
                >
                    {notice}
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
