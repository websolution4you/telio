"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Lock, LogIn, UserPlus, X } from "lucide-react";
import {
  loginAction,
  registerAction,
  requestPasswordResetAction,
  resetPasswordWithTokenAction,
} from "@/app/actions/auth";
import type { BookingUser } from "@/lib/auth/bookingAuth";

type NewBookingAuthProps = {
  mode: "login" | "register" | "forgot" | "reset";
  resetToken?: string;
  onClose: () => void;
  onSuccess: (user?: BookingUser) => void;
};

const PREFIX_OPTIONS = [
  { code: "+421", flag: "🇸🇰", label: "+421 (SK)" },
  { code: "+420", flag: "🇨🇿", label: "+420 (CZ)" },
  { code: "+43", flag: "🇦🇹", label: "+43 (AT)" },
  { code: "+36", flag: "🇭🇺", label: "+36 (HU)" },
  { code: "+48", flag: "🇵🇱", label: "+48 (PL)" },
  { code: "+", flag: "🌐", label: "+ Iné" },
];

export default function NewBookingAuth({ mode: initialMode, resetToken, onClose, onSuccess }: NewBookingAuthProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">(initialMode);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("+421");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (mode === "register") {
      if (!firstName.trim() || !lastName.trim()) {
        setError("Meno a priezvisko sú povinné.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Heslá sa nezhodujú.");
        return;
      }
    }

    if (mode === "reset") {
      if (password.length < 6) {
        setError("Nové heslo musí mať aspoň 6 znakov.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Heslá sa nezhodujú.");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "forgot") {
        const origin = typeof window !== "undefined" ? window.location.origin : undefined;
        const res = await requestPasswordResetAction(email, origin);
        if (res.success) {
          setSuccessMessage(res.message || "Inštrukcie na obnovu hesla sme odoslali na váš email.");
        } else {
          setError(res.error || "Nepodarilo sa odoslať žiadosť.");
        }
        return;
      }

      if (mode === "reset") {
        if (!resetToken) {
          setError("Chýba platný token na obnovu hesla.");
          return;
        }
        const res = await resetPasswordWithTokenAction(resetToken, password);
        if (res.success) {
          setSuccessMessage(res.message || "Heslo bolo úspešne zmenené! Teraz sa môžete prihlásiť.");
          setTimeout(() => {
            setMode("login");
            setSuccessMessage("");
            setPassword("");
            setConfirmPassword("");
          }, 2500);
        } else {
          setError(res.error || "Nepodarilo sa obnoviť heslo.");
        }
        return;
      }

      let fullPhone: string | undefined = undefined;
      if (phone.trim()) {
        const cleanNumber = phone.trim().replace(/\s+/g, "");
        fullPhone = cleanNumber.startsWith("+")
          ? cleanNumber
          : `${phonePrefix}${cleanNumber.replace(/^0+/, "")}`;
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      const result = mode === "login"
        ? await loginAction(email, password)
        : await registerAction(fullName, email, password, undefined, fullPhone);

      if (!result.success) {
        setError(result.error || "Požiadavku sa nepodarilo spracovať.");
        return;
      }
      onSuccess(result.user);
    } catch (err: any) {
      console.error("NewBookingAuth submit error:", err);
      setError(err?.message || "Požiadavku sa nepodarilo spracovať.");
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

  useEffect(() => {
    if (mode === "register") {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setPhone("");
    }
    setError("");
    setSuccessMessage("");
  }, [mode]);

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Prihlásenie a registrácia">
      <button type="button" className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} aria-label="Zavrieť dialóg" />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              {mode === "login" && <LogIn className="h-5 w-5" />}
              {mode === "register" && <UserPlus className="h-5 w-5" />}
              {mode === "forgot" && <KeyRound className="h-5 w-5" />}
              {mode === "reset" && <Lock className="h-5 w-5" />}
            </div>
            <h2 className="text-2xl font-bold text-slate-950">
              {mode === "login" && "Prihlásenie"}
              {mode === "register" && "Rýchla registrácia"}
              {mode === "forgot" && "Obnova hesla"}
              {mode === "reset" && "Nové heslo"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "login" && "Prihláste sa, aby ste mohli vytvárať a spravovať svoje rezervácie."}
              {mode === "register" && "Vytvorte si účet za pár sekúnd pre okamžité rezervovanie kurtov."}
              {mode === "forgot" && "Zadajte svoj email a zašleme vám odkaz na nastavenie nového hesla."}
              {mode === "reset" && "Zadajte a potvrďte vaše nové prihlasovacie heslo."}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer" aria-label="Zavrieť">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 animate-in fade-in">{error}</div>}
        {successMessage && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Dummy inputs to prevent aggressive browser autofill of saved admin credentials */}
          {mode === "register" && (
            <div className="hidden" aria-hidden="true">
              <input type="text" name="fake_username_remember" tabIndex={-1} autoComplete="off" />
              <input type="password" name="fake_password_remember" tabIndex={-1} autoComplete="new-password" />
            </div>
          )}

          {mode === "register" && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Meno" value={firstName} onChange={setFirstName} placeholder="Janko" name="register_first_name" required />
                <Field label="Priezvisko" value={lastName} onChange={setLastName} placeholder="Hraško" name="register_last_name" required />
              </div>
              <div>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">Telefónne číslo</span>
                  <div className="relative flex rounded-xl border border-slate-200 bg-slate-50 transition focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100">
                    <select
                      value={phonePrefix}
                      onChange={(e) => setPhonePrefix(e.target.value)}
                      className="cursor-pointer bg-transparent py-3 pl-3 pr-1 text-xs sm:text-sm font-bold text-slate-700 outline-none border-r border-slate-200/80 my-1 shrink-0"
                      aria-label="Predvoľba krajiny"
                    >
                      {PREFIX_OPTIONS.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.flag} {p.code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      name="register_phone"
                      autoComplete="off"
                      data-lpignore="true"
                      value={phone}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (phonePrefix === "+421" && val.startsWith("09")) {
                          val = val.slice(1);
                        }
                        setPhone(val);
                      }}
                      placeholder={phonePrefix === "+421" ? "900 123 456" : "telefónne číslo"}
                      required
                      className="w-full bg-transparent px-3 py-3 text-slate-950 outline-none placeholder:text-slate-400 font-medium text-sm sm:text-base"
                    />
                  </div>
                </label>
                <p className="mt-1 text-[11px] text-slate-400">Predvoľba +421 je predvyplnená, stačí napísať napr. 900 123 456.</p>
              </div>
            </>
          )}

          {/* Email field (for login, register, forgot) */}
          {mode !== "reset" && (
            <Field
              label="E-mail"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="vas@email.sk"
              autoComplete={mode === "register" ? "new-password" : "email"}
              name={mode === "register" ? "register_new_email" : "email"}
              required
            />
          )}

          {/* Password with eye toggle (for login, register, reset) */}
          {mode !== "forgot" && (
            <div>
              <label className="block">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">
                    {mode === "reset" ? "Nové heslo" : "Heslo"}
                  </span>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setError("");
                      }}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition cursor-pointer"
                    >
                      Zabudli ste heslo?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name={mode === "register" ? "register_new_password" : "password"}
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    data-lpignore="true"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={mode === "login" ? undefined : 6}
                    placeholder={mode === "login" ? "Vaše heslo" : "Minimálne 6 znakov"}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    aria-label={showPassword ? "Skryť heslo" : "Zobraziť heslo"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </label>
            </div>
          )}

          {/* Confirm password (for register and reset) */}
          {(mode === "register" || mode === "reset") && (
            <div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">Potvrdenie nového hesla</span>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="register_confirm_password"
                    autoComplete="new-password"
                    data-lpignore="true"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Zopakujte nové heslo"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    aria-label={showConfirmPassword ? "Skryť heslo" : "Zobraziť heslo"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 shadow-md cursor-pointer"
          >
            {loading
              ? "Spracovanie..."
              : mode === "login"
              ? "Prihlásiť sa"
              : mode === "register"
              ? "Vytvoriť účet"
              : mode === "forgot"
              ? "Odoslať odkaz na obnovu"
              : "Uložiť nové heslo"}
          </button>
        </form>

        {/* Bottom links */}
        <div className="mt-6 text-center text-sm text-slate-500">
          {mode === "login" && (
            <p>
              Ešte nemáte účet?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
                className="font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                Registrovať sa
              </button>
            </p>
          )}

          {mode === "register" && (
            <p>
              Už máte účet?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className="font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                Prihlásiť sa
              </button>
            </p>
          )}

          {(mode === "forgot" || mode === "reset") && (
            <p>
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className="font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                ← Späť na prihlásenie
              </button>
            </p>
          )}
        </div>
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
  autoComplete?: string;
  name?: string;
};

function Field({ label, value, onChange, type = "text", placeholder, required, minLength, autoComplete = "off", name }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        type={type}
        name={name}
        autoComplete={autoComplete}
        data-lpignore="true"
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
