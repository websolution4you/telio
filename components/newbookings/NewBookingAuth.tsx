"use client";

import { useEffect, useState } from "react";
import { LogIn, UserPlus, X } from "lucide-react";
import { loginAction, registerAction } from "@/app/actions/auth";

type NewBookingAuthProps = {
  mode: "login" | "register";
  onClose: () => void;
  onSuccess: () => void;
};

export default function NewBookingAuth({ mode: initialMode, onClose, onSuccess }: NewBookingAuthProps) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
        : await registerAction(name, email, password, cardNumber, phone);

      if (!result.success) {
        setError(result.error || "Požiadavku sa nepodarilo spracovať.");
        return;
      }
      onSuccess();
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
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              {mode === "login" ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <h2 className="text-2xl font-bold text-slate-950">{mode === "login" ? "Prihlásenie" : "Nový účet"}</h2>
            <p className="mt-1 text-sm text-slate-500">Prihláste sa, aby ste mohli vytvárať a spravovať svoje rezervácie.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Zavrieť">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <>
              <Field label="Celé meno" value={name} onChange={setName} required />
              <Field label="Telefónne číslo" type="tel" value={phone} onChange={setPhone} required />
              <Field label="4-miestny PIN kód karty" value={cardNumber} onChange={(value) => setCardNumber(value.replace(/\D/g, "").slice(0, 4))} required />
            </>
          )}
          <Field label="E-mail" type="email" value={email} onChange={setEmail} required />
          <Field label="Heslo" type="password" value={password} onChange={setPassword} required minLength={6} />
          {mode === "register" && <Field label="Potvrdenie hesla" type="password" value={confirmPassword} onChange={setConfirmPassword} required minLength={6} />}

          <button disabled={loading} className="mt-2 w-full rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
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
  required?: boolean;
  minLength?: number;
};

function Field({ label, value, onChange, type = "text", required, minLength }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        minLength={minLength}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
      />
    </label>
  );
}
