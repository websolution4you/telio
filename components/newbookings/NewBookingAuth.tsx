"use client";

import { useEffect, useState } from "react";
import { CreditCard, Eye, EyeOff, LogIn, UserPlus, X } from "lucide-react";
import { loginAction, registerAction } from "@/app/actions/auth";
import type { BookingUser } from "@/lib/auth/bookingAuth";

type NewBookingAuthProps = {
  mode: "login" | "register";
  onClose: () => void;
  onSuccess: (user?: BookingUser) => void;
};

export default function NewBookingAuth({ mode: initialMode, onClose, onSuccess }: NewBookingAuthProps) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hasCard, setHasCard] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (mode === "register" && password !== confirmPassword) {
      setError("Heslá sa nezhodujú.");
      return;
    }

    setLoading(true);
    try {
      const result = mode === "login"
        ? await loginAction(email, password)
        : await registerAction(name, email, password, hasCard ? cardNumber : undefined, phone);

      if (!result.success) {
        setError(result.error || "Požiadavku sa nepodarilo spracovať.");
        return;
      }
      onSuccess(result.user);
    } catch {
      setError("Požiadavku sa nepodarilo spracovať.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4">
      <button aria-label="Zavrieť" className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              {mode === "login" ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <h2 className="text-2xl font-bold text-slate-950">{mode === "login" ? "Prihlásenie" : "Rýchla registrácia"}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "login"
                ? "Prihláste sa, aby ste mohli vytvárať a spravovať svoje rezervácie."
                : "Vytvorte si účet za pár sekúnd pre okamžité rezervovanie kurtov."}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Zavrieť">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <>
              <Field label="Celé meno" value={name} onChange={setName} placeholder="Janko Hraško" required />
              <div>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">Telefónne číslo</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+421 900 123 456"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
                <p className="mt-1 text-[11px] text-slate-400">Slúži na potvrdenie a prípadné SMS/kontakt pri zmene termínu.</p>
              </div>

              {/* Voliteľná karta NTC */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 transition">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasCard}
                    onChange={(e) => {
                      setHasCard(e.target.checked);
                      if (!e.target.checked) setCardNumber("");
                    }}
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                      Mám klubovú kartu NTC
                    </span>
                    <span className="text-[11px] text-slate-500">Máte už zakúpenú kartu z recepcie? Zadajte jej PIN kód.</span>
                  </div>
                </label>

                {hasCard && (
                  <div className="mt-3 pt-3 border-t border-slate-200 animate-in fade-in duration-200">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-700">4-miestny PIN kód karty</span>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="napr. 1234"
                        maxLength={4}
                        required={hasCard}
                        className="w-full font-mono text-center tracking-widest text-lg font-bold rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      />
                    </label>
                    <p className="mt-1 text-[11px] text-slate-400">Kartu je možné kedykoľvek priradiť aj dodatočne na recepcii.</p>
                  </div>
                )}
              </div>
            </>
          )}

          <Field label="E-mail" type="email" value={email} onChange={setEmail} placeholder="vas@email.sk" required />

          {/* Password with eye toggle */}
          <div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Heslo</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Minimálne 6 znakov"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  aria-label={showPassword ? "Skryť heslo" : "Zobraziť heslo"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </label>
          </div>

          {mode === "register" && (
            <div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">Potvrdenie hesla</span>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Zopakujte heslo"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    aria-label={showConfirmPassword ? "Skryť heslo" : "Zobraziť heslo"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </label>
            </div>
          )}

          <button disabled={loading} className="mt-2 w-full rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 shadow-md">
            {loading ? "Spracovanie..." : mode === "login" ? "Prihlásiť sa" : "Vytvoriť účet"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {mode === "login" ? "Ešte nemáte účet?" : "Už máte účet?"}{" "}
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} className="font-bold text-emerald-700 hover:text-emerald-800">
            {mode === "login" ? "Registrovať sa" : "Prihlásiť sa"}
          </button>
        </p>
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
};

function Field({ label, value, onChange, type = "text", placeholder, required, minLength }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        minLength={minLength}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
      />
    </label>
  );
}
