"use client";

import { useState } from "react";
import { registerAction } from "@/app/actions/auth";
import { UserPlus } from "lucide-react";

type RegisterFormProps = {
    onSuccess: () => void;
    onSwitchToLogin: () => void;
};

export default function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [phone, setPhone] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!firstName.trim() || !lastName.trim()) {
            setError("Meno a priezvisko sú povinné");
            return;
        }

        if (password !== confirmPassword) {
            setError("Heslá sa nezhodujú");
            return;
        }

        setLoading(true);

        try {
            const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
            const result = await registerAction(fullName, email, password, undefined, phone);

            if (result.success) {
                onSuccess();
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
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="text-center mb-3">
                <h2
                    className="text-xl font-semibold text-white mb-1"
                    style={{
                        fontFamily: "var(--font-poppins), sans-serif",
                        textShadow: "0 0 20px rgba(123, 97, 255, 0.3)",
                    }}
                >
                    Registrácia
                </h2>
            </div>

            {error && (
                <div
                    className="rounded-lg p-3 text-sm text-red-400 border border-red-500/30"
                    style={{ background: "rgba(239, 68, 68, 0.1)" }}
                >
                    {error}
                </div>
            )}

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-lg border bg-black/30 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        style={{ borderColor: "rgba(0,255,209,0.2)" }}
                        placeholder="Meno"
                        disabled={loading}
                    />
                </div>
                <div>
                    <input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-lg border bg-black/30 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        style={{ borderColor: "rgba(0,255,209,0.2)" }}
                        placeholder="Priezvisko"
                        disabled={loading}
                    />
                </div>
            </div>

            <div>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border bg-black/30 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    style={{ borderColor: "rgba(0,255,209,0.2)" }}
                    placeholder="Email"
                    disabled={loading}
                />
            </div>

            <div>
                <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border bg-black/30 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 mb-3"
                    style={{ borderColor: "rgba(0,255,209,0.2)" }}
                    placeholder="Telefónne číslo (+421...)"
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
                    minLength={6}
                    className="w-full px-3 py-2 rounded-lg border bg-black/30 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    style={{ borderColor: "rgba(0,255,209,0.2)" }}
                    placeholder="Heslo (min. 6 znakov)"
                    disabled={loading}
                />
            </div>

            <div>
                <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 rounded-lg border bg-black/30 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    style={{ borderColor: "rgba(0,255,209,0.2)" }}
                    placeholder="Potvrdiť heslo"
                    disabled={loading}
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg font-medium text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                style={{
                    background:
                        "linear-gradient(135deg, rgba(0,255,209,0.8), rgba(123,97,255,0.8))",
                }}
            >
                <UserPlus className="h-4 w-4" />
                {loading ? "Registrácia..." : "Zaregistrovať"}
            </button>

            <div className="text-center text-xs text-gray-400 pt-2">
                Máte účet?{" "}
                <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors underline"
                >
                    Prihlásiť sa
                </button>
            </div>
        </form>
    );
}
