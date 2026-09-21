"use client";

import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  CircleUser,
  CreditCard,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { updateProfileDetailsAction, changePasswordAction } from "@/app/actions/auth";
import type { BookingUser } from "@/lib/auth/bookingAuth";
import type { HeaderUser } from "./NewBookingsHeader";

type NewBookingProfileModalProps = {
  currentUser: HeaderUser;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated?: (updatedUser: BookingUser) => void;
};

const PREFIX_OPTIONS = [
  { code: "+421", flag: "🇸🇰", label: "+421 (SK)" },
  { code: "+420", flag: "🇨🇿", label: "+420 (CZ)" },
  { code: "+43", flag: "🇦🇹", label: "+43 (AT)" },
  { code: "+36", flag: "🇭🇺", label: "+36 (HU)" },
  { code: "+48", flag: "🇵🇱", label: "+48 (PL)" },
  { code: "+", flag: "🌐", label: "+ Iné" },
];

export default function NewBookingProfileModal({
  currentUser,
  isOpen,
  onClose,
  onUserUpdated,
}: NewBookingProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");

  // Profile state
  const [name, setName] = useState(currentUser?.name || "");
  const [phonePrefix, setPhonePrefix] = useState("+421");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status state
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Initialize values from currentUser
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || "");
      const rawPhone = currentUser.phone || "";
      if (rawPhone.startsWith("+421")) {
        setPhonePrefix("+421");
        setPhoneNumber(rawPhone.slice(4).trim());
      } else if (rawPhone.startsWith("+420")) {
        setPhonePrefix("+420");
        setPhoneNumber(rawPhone.slice(4).trim());
      } else if (rawPhone.startsWith("+43")) {
        setPhonePrefix("+43");
        setPhoneNumber(rawPhone.slice(3).trim());
      } else if (rawPhone.startsWith("+36")) {
        setPhonePrefix("+36");
        setPhoneNumber(rawPhone.slice(3).trim());
      } else if (rawPhone.startsWith("+48")) {
        setPhonePrefix("+48");
        setPhoneNumber(rawPhone.slice(3).trim());
      } else if (rawPhone.startsWith("+")) {
        setPhonePrefix("+");
        setPhoneNumber(rawPhone.slice(1).trim());
      } else {
        setPhonePrefix("+421");
        setPhoneNumber(rawPhone.trim());
      }
    }
  }, [currentUser]);

  // Lock body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!name.trim() || name.trim().length < 2) {
      setProfileError("Meno a priezvisko musí mať aspoň 2 znaky.");
      return;
    }

    setProfileLoading(true);
    try {
      let fullPhone: string | undefined = undefined;
      if (phoneNumber.trim()) {
        const cleanNumber = phoneNumber.trim().replace(/\s+/g, "");
        fullPhone = cleanNumber.startsWith("+")
          ? cleanNumber
          : `${phonePrefix}${cleanNumber.replace(/^0+/, "")}`;
      }

      const res = await updateProfileDetailsAction(name.trim(), fullPhone);
      if (res.success && res.user) {
        setProfileSuccess(res.message || "Profil bol úspešne uložený.");
        if (onUserUpdated) {
          onUserUpdated(res.user);
        }
      } else {
        setProfileError(res.error || "Nepodarilo sa uložiť zmeny.");
      }
    } catch {
      setProfileError("Vyskytla sa neočakávaná chyba.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError("Zadajte vaše aktuálne heslo.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordError("Nové heslo musí mať aspoň 6 znakov.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Nové heslá sa nezhodujú.");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await changePasswordAction(currentPassword, newPassword);
      if (res.success) {
        setPasswordSuccess(res.message || "Heslo bolo úspešne zmenené.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordError(res.error || "Nepodarilo sa zmeniť heslo.");
      }
    } catch {
      setPasswordError("Vyskytla sa neočakávaná chyba.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const getRoleBadge = () => {
    if (currentUser.role === "admin") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <ShieldAlert className="h-3 w-3 text-amber-600" />
          Administrátor
        </span>
      );
    }
    if (currentUser.role === "trainer") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
          <Sparkles className="h-3 w-3 text-blue-600" />
          Tréner
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <ShieldCheck className="h-3 w-3 text-emerald-600" />
        Klient
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Profil používateľa"
    >
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-label="Zavrieť profil"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white/98 p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] backdrop-blur-xl z-10 animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          aria-label="Zavrieť"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header with Avatar & Role */}
        <div className="flex items-center gap-4 mb-6">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-xs">
            <CircleUser className="h-8 w-8" strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                {currentUser.name || "Používateľ"}
              </h2>
              {getRoleBadge()}
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {currentUser.email || "Bez emailu"}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-semibold transition border-b-2 cursor-pointer ${
              activeTab === "profile"
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <User className="h-4 w-4" />
            Osobné údaje
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("password")}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-semibold transition border-b-2 cursor-pointer ${
              activeTab === "password"
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <KeyRound className="h-4 w-4" />
            Zmena hesla
          </button>
        </div>

        {/* TAB 1: OSOBNÉ ÚDAJE */}
        {activeTab === "profile" && (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            {profileSuccess && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{profileSuccess}</span>
              </div>
            )}
            {profileError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 animate-in fade-in">
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
                <span>{profileError}</span>
              </div>
            )}

            {/* Meno a priezvisko */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Meno a priezvisko
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ján Novák"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-2xs outline-none transition focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/20"
                />
                <User className="absolute right-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Telefónne číslo */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Telefónne číslo
              </label>
              <div className="flex gap-2">
                <select
                  value={phonePrefix}
                  onChange={(e) => setPhonePrefix(e.target.value)}
                  className="h-[42px] shrink-0 rounded-xl border border-slate-300 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 shadow-2xs outline-none transition focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/20"
                >
                  {PREFIX_OPTIONS.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.flag} {p.code}
                    </option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="912 345 678"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-2xs outline-none transition focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/20"
                  />
                  <Phone className="absolute right-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Slúži pre overenie a kontakt v prípade zmien rezervácie.
              </p>
            </div>

            {/* Read-only: Email & Karta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  Prihlasovací email
                </div>
                <div className="text-xs font-semibold text-slate-700 truncate" title={currentUser.email || ""}>
                  {currentUser.email || "—"}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                  Členská karta / PIN
                </div>
                <div className="text-xs font-mono font-bold text-slate-800">
                  {(currentUser as any)?.cardNumber ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {(currentUser as any).cardNumber}
                    </span>
                  ) : (
                    <span className="text-slate-400">Bez karty</span>
                  )}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={profileLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs sm:text-sm font-bold text-white shadow-md transition duration-150 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {profileLoading ? (
                  <span>Ukladám zmeny...</span>
                ) : (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Uložiť zmeny profilu</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: ZMENA HESLA */}
        {activeTab === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {passwordSuccess && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{passwordSuccess}</span>
              </div>
            )}
            {passwordError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 animate-in fade-in">
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
                <span>{passwordError}</span>
              </div>
            )}

            {/* Súčasné heslo */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Aktuálne heslo
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm font-medium text-slate-900 shadow-2xs outline-none transition focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  aria-label={showCurrentPassword ? "Skryť heslo" : "Zobraziť heslo"}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Nové heslo */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Nové heslo
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Minimálne 6 znakov"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm font-medium text-slate-900 shadow-2xs outline-none transition focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  aria-label={showNewPassword ? "Skryť heslo" : "Zobraziť heslo"}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Potvrdenie nového hesla */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Potvrdenie nového hesla
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Zopakujte nové heslo"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm font-medium text-slate-900 shadow-2xs outline-none transition focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  aria-label={showConfirmPassword ? "Skryť heslo" : "Zobraziť heslo"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Password Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs sm:text-sm font-bold text-white shadow-md transition duration-150 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {passwordLoading ? (
                  <span>Overujem a mením heslo...</span>
                ) : (
                  <>
                    <Lock className="h-4 w-4 text-emerald-400" />
                    <span>Zmeniť heslo</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
