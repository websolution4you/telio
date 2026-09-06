"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Coins,
  LayoutDashboard,
  LogIn,
  LogOut,
  Receipt,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";
import TennisBallAvatar from "@/components/icons/TennisBallAvatar";
import { ThreeDChartIcon, ThreeDSettingsIcon, ThreeDUserAvatarIcon, ThreeDWalletIcon } from "@/components/icons/ThreeDNavIcons";
import HolographicTennisCourt from "./HolographicTennisCourt";
import { logoutAction } from "@/app/actions/auth";
import type { BookingUser, SessionPayload } from "@/lib/auth/bookingAuth";

export type ActiveTab = "calendar" | "users" | "stats" | "settings" | "transactions";

export type HeaderUser = BookingUser | SessionPayload | {
  id?: string;
  userId?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  phone?: string | null;
  cardNumber?: string | null;
  hasMultisport?: boolean | null;
};

export type NewBookingsHeaderProps = {
  currentUser?: HeaderUser | null;
  walletBalance?: number | null;
  walletHighlight?: boolean;
  activeTab?: ActiveTab;
  onAuthModal?: (mode: "login" | "register") => void;
  onTopUp?: (amountEur: number, provider: "stripe" | "cardpay") => Promise<void>;
  topUpLoading?: number | null;
};

export default function NewBookingsHeader({
  currentUser,
  walletBalance = null,
  walletHighlight = false,
  activeTab,
  onAuthModal,
  onTopUp,
  topUpLoading = null,
}: NewBookingsHeaderProps) {
  const router = useRouter();
  const userName = currentUser?.name || "Užívateľ";
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [clientMenuOpen, setClientMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);
  const clientMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setAdminMenuOpen(false);
      }
      if (clientMenuRef.current && !clientMenuRef.current.contains(event.target as Node)) {
        setClientMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setAdminMenuOpen(false);
    setClientMenuOpen(false);
    setUserMenuOpen(false);
    if (!window.confirm("Chcete sa naozaj odhlásiť?")) return;
    await logoutAction();
    window.location.href = "/newbookings";
  };

  return (
    <header className="relative isolate z-40 border-b border-amber-200/60 bg-gradient-to-r from-yellow-50/70 via-amber-50/60 to-orange-50/70 shadow-[0_10px_35px_rgba(249,115,22,0.06)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 -top-24 h-44 w-44 rounded-full bg-yellow-300/25 blur-3xl" />
        <div className="absolute -right-12 -top-28 h-48 w-48 rounded-full bg-orange-300/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[76px] max-w-[1500px] items-center justify-between gap-2 px-4 py-3 sm:min-h-[86px] sm:gap-4 sm:px-6 lg:px-8">
        {/* NTC Logo Banner */}
        <Link
          href="/newbookings"
          className="group flex shrink-0 items-center transition hover:scale-105 active:scale-95"
          aria-label="NTC Domov - Kalendár"
          title="Prejsť na kalendár rezervácií"
        >
          {/* Desktop NÁRODNÉ TENIS-O-VÉ CENTRUM Logo Banner on 3D Antuka Clay Court */}
          <div className="hidden md:flex relative overflow-hidden items-center justify-center rounded-2xl border border-orange-800/60 bg-gradient-to-r from-[#B8442A] via-[#E26A4F] to-[#C44B31] px-5 py-2.5 shadow-[0_4px_16px_rgba(180,83,9,0.38)] transition duration-300 group-hover:shadow-[0_6px_22px_rgba(180,83,9,0.48)]">
            {/* 3D Perspective Clay Court White Lines Overlay */}
            <div className="pointer-events-none absolute inset-0 opacity-30">
              <svg viewBox="0 0 220 70" className="h-full w-full" preserveAspectRatio="none">
                <polygon points="12,4 208,4 216,66 4,66" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
                <line x1="110" y1="4" x2="110" y2="66" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3,2" />
                <line x1="52" y1="4" x2="44" y2="66" stroke="#FFFFFF" strokeWidth="1" />
                <line x1="168" y1="4" x2="176" y2="66" stroke="#FFFFFF" strokeWidth="1" />
              </svg>
            </div>

            {/* NÁRODNÉ TENIS [🎾] VÉ CENTRUM Typography */}
            <span
              className="relative z-10 flex items-center gap-0.5 text-sm font-black uppercase tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] sm:text-base md:text-lg"
              style={{ fontFamily: "var(--font-poppins), sans-serif" }}
            >
              NÁRODNÉ TENIS
              <span className="inline-flex items-center justify-center mx-[1px]">
                <svg viewBox="0 0 36 36" className="h-4 w-4 sm:h-5 sm:w-5 md:h-5.5 md:w-5.5 drop-shadow-[0_0_8px_rgba(204,255,0,0.85)]" fill="none">
                  <defs>
                    <radialGradient id="ntcTitleBallGradShared" cx="35%" cy="30%" r="70%">
                      <stop offset="0%" stopColor="#f7ff57" />
                      <stop offset="60%" stopColor="#d2f500" />
                      <stop offset="100%" stopColor="#9ec200" />
                    </radialGradient>
                  </defs>
                  <circle cx="18" cy="18" r="17.5" fill="url(#ntcTitleBallGradShared)" />
                  <path d="M 5,5 C 13,11 13,25 5,31" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" opacity="0.95" />
                  <path d="M 31,5 C 23,11 23,25 31,31" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" opacity="0.95" />
                </svg>
              </span>
              VÉ CENTRUM
            </span>
          </div>

          {/* Mobile Compact Icon Badge */}
          <div className="flex md:hidden h-11 w-11 flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-1 shadow-md sm:h-12 sm:w-12">
            <span className="text-sm leading-none">🎾</span>
            <span className="mt-0.5 rounded-full bg-[#CCFF00] px-1.5 py-0.5 text-[8px] font-black tracking-wider text-black shadow-xs">NTC</span>
          </div>
        </Link>

        {/* Ambient Tennis Court for Mobile */}
        <HolographicTennisCourt />

        {/* Desktop Horizontal Navigation (md:flex) */}
        {currentUser ? (
          <nav className="hidden md:flex items-center gap-3 lg:gap-4 font-sans">
            {currentUser.role === "admin" ? (
              <>
                {/* Admin 3D Navigation: Používatelia | Štatistiky | Nastavenia */}
                <div className="flex items-center gap-2 lg:gap-3 mr-6 lg:mr-8">
                  {/* 1. Používatelia */}
                  <Link
                    href="/dashboard/users"
                    className={`group relative flex h-[82px] w-[96px] shrink-0 flex-col items-center justify-center rounded-2xl border px-2 py-2 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${
                      activeTab === "users"
                        ? "border-cyan-400 bg-white ring-2 ring-cyan-400/25 shadow-sm"
                        : "border-slate-200/80 bg-white/90 shadow-2xs hover:border-slate-300 hover:bg-white"
                    }`}
                    title="Správa používateľov"
                  >
                    <div className="transition-transform duration-200 group-hover:scale-108">
                      <ThreeDUserAvatarIcon className="h-7 w-7 lg:h-8 lg:w-8" />
                    </div>
                    <span
                      className={`mt-1 text-[12px] tracking-normal transition-colors duration-200 ${
                        activeTab === "users" ? "font-semibold text-slate-950" : "font-medium text-slate-600 group-hover:text-slate-900"
                      }`}
                    >
                      Používatelia
                    </span>
                  </Link>

                  {/* 2. Štatistiky */}
                  <Link
                    href="/dashboard/newbookings"
                    className={`group relative flex h-[82px] w-[96px] shrink-0 flex-col items-center justify-center rounded-2xl border px-2 py-2 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${
                      activeTab === "stats"
                        ? "border-violet-400 bg-white ring-2 ring-violet-400/25 shadow-sm"
                        : "border-slate-200/80 bg-white/90 shadow-2xs hover:border-slate-300 hover:bg-white"
                    }`}
                    title="Prehľad a štatistiky"
                  >
                    <div className="transition-transform duration-200 group-hover:scale-108">
                      <ThreeDChartIcon className="h-7 w-7 lg:h-8 lg:w-8" />
                    </div>
                    <span
                      className={`mt-1 text-[12px] tracking-normal transition-colors duration-200 ${
                        activeTab === "stats" ? "font-semibold text-slate-950" : "font-medium text-slate-600 group-hover:text-slate-900"
                      }`}
                    >
                      Štatistiky
                    </span>
                  </Link>

                  {/* 3. Nastavenia */}
                  <Link
                    href="/dashboard/users-roles"
                    className={`group relative flex h-[82px] w-[96px] shrink-0 flex-col items-center justify-center rounded-2xl border px-2 py-2 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${
                      activeTab === "settings"
                        ? "border-purple-400 bg-white ring-2 ring-purple-400/25 shadow-sm"
                        : "border-slate-200/80 bg-white/90 shadow-2xs hover:border-slate-300 hover:bg-white"
                    }`}
                    title="Nastavenia systému a rolí"
                  >
                    <div className="transition-transform duration-200 group-hover:scale-108">
                      <ThreeDSettingsIcon className="h-7 w-7 lg:h-8 lg:w-8" />
                    </div>
                    <span
                      className={`mt-1 text-[12px] tracking-normal transition-colors duration-200 ${
                        activeTab === "settings" ? "font-semibold text-slate-950" : "font-medium text-slate-600 group-hover:text-slate-900"
                      }`}
                    >
                      Nastavenia
                    </span>
                  </Link>
                </div>

                {/* Admin User Avatar Kocka s Dropdown menu (Transakcie + Odhlásiť) */}
                <div className="relative" ref={adminMenuRef}>
                  <button
                    type="button"
                    onClick={() => setAdminMenuOpen((prev) => !prev)}
                    className={`group relative flex h-[82px] w-[96px] shrink-0 flex-col items-center justify-center rounded-2xl border px-2 py-2 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 cursor-pointer ${
                      activeTab === "transactions"
                        ? "border-emerald-400 bg-white ring-2 ring-emerald-400/25 shadow-sm"
                        : "border-slate-200/80 bg-white/90 shadow-2xs hover:border-slate-300 hover:bg-white"
                    }`}
                    aria-expanded={adminMenuOpen}
                    aria-haspopup="true"
                    title="Používateľské menu administrátora"
                  >
                    <div className="transition-transform duration-200 group-hover:scale-108">
                      <TennisBallAvatar name={userName} className="h-7 w-7 lg:h-8 lg:w-8" textSize="text-[10px]" />
                    </div>
                    <span className="mt-1 flex items-center justify-center gap-1 text-[12px] font-medium tracking-normal text-slate-600 transition-colors duration-200 group-hover:text-slate-900">
                      <span className="max-w-[76px] truncate">{userName}</span>
                      <ChevronDown
                        className={`h-3 w-3 shrink-0 text-slate-400 transition-transform duration-200 ${
                          adminMenuOpen ? "rotate-180 text-slate-700" : "group-hover:text-slate-600"
                        }`}
                      />
                    </span>
                  </button>

                  {/* Dropdown Menu pre Admin User */}
                  {adminMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 origin-top-right rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150 font-sans">
                      {/* Hlavička dropdownu */}
                      <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1 border-b border-slate-100 bg-slate-50/70 rounded-xl">
                        <TennisBallAvatar name={userName} className="h-8 w-8" textSize="text-[11px]" />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-slate-900">{userName}</span>
                          <span className="block truncate text-[10.5px] font-normal text-slate-500">Administrátor</span>
                        </div>
                      </div>

                      {/* Transakcie presunuté do avatara */}
                      <Link
                        href="/dashboard/admin-transactions"
                        onClick={() => setAdminMenuOpen(false)}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium transition duration-150 group ${
                          activeTab === "transactions"
                            ? "bg-emerald-50 text-emerald-800 font-semibold"
                            : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                        }`}
                      >
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100/80 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition duration-150 shadow-2xs">
                          <Receipt className="h-4 w-4" />
                        </span>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-medium text-slate-800 group-hover:text-emerald-800">Transakcie</span>
                          <span className="text-[10px] font-normal text-slate-400">Prehľad platieb a kreditov</span>
                        </div>
                      </Link>

                      <div className="my-1 border-t border-slate-100" />

                      {/* Odhlásiť sa */}
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition duration-150 group cursor-pointer text-left"
                      >
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-red-100/80 text-red-600 group-hover:bg-red-600 group-hover:text-white transition duration-150 shadow-2xs">
                          <LogOut className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-xs font-medium text-red-700">Odhlásiť sa</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Non-admin používateľ: 1. Peňaženka kocka, 2. Avatar kocka s dropdownom - IDENTICKÉ ROZMERY A FARBY */
              <div className="flex items-center gap-3 font-sans">
                {/* 1. Peňaženka Kocka (Presne w-[104px] h-[82px]) */}
                <Link
                  href="/dashboard/transactions"
                  className={`group relative flex h-[82px] w-[104px] shrink-0 flex-col items-center justify-center rounded-2xl border px-2 py-2 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${
                    activeTab === "transactions"
                      ? "border-amber-400 bg-white ring-2 ring-amber-400/30 shadow-sm"
                      : walletHighlight
                      ? "border-amber-500 bg-amber-50/80 ring-4 ring-amber-300/80 scale-105"
                      : "border-amber-200/80 bg-white/95 shadow-xs hover:border-amber-300 hover:bg-white"
                  }`}
                  title="Moja peňaženka a história transakcií"
                >
                  <div className="transition-transform duration-200 group-hover:scale-108">
                    <ThreeDWalletIcon className="h-7 w-7" />
                  </div>
                  <span
                    className={`mt-1 text-[11.5px] leading-tight transition-colors duration-200 ${
                      activeTab === "transactions" ? "font-semibold text-amber-950" : "font-medium text-slate-700 group-hover:text-amber-950"
                    }`}
                  >
                    Peňaženka
                  </span>
                  <span className="mt-0.5 text-[11px] font-bold leading-tight text-amber-700">
                    {walletBalance !== null ? `${walletBalance.toFixed(2)} €` : "0.00 €"}
                  </span>
                </Link>

                {/* 2. Používateľ Avatar Kocka (Presne w-[104px] h-[82px]) */}
                <div className="relative" ref={clientMenuRef}>
                  <button
                    type="button"
                    onClick={() => setClientMenuOpen((prev) => !prev)}
                    className={`group relative flex h-[82px] w-[104px] shrink-0 flex-col items-center justify-center rounded-2xl border px-2 py-2 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 cursor-pointer ${
                      activeTab === "stats"
                        ? "border-amber-400 bg-white ring-2 ring-amber-400/30 shadow-sm"
                        : "border-amber-200/80 bg-white/95 shadow-xs hover:border-amber-300 hover:bg-white"
                    }`}
                    aria-expanded={clientMenuOpen}
                    aria-haspopup="true"
                    title="Používateľské menu"
                  >
                    <div className="transition-transform duration-200 group-hover:scale-108">
                      <TennisBallAvatar name={userName} className="h-7 w-7" textSize="text-[10px]" />
                    </div>
                    <span className="mt-1 block max-w-[88px] truncate text-center text-[11.5px] font-medium leading-tight text-slate-700 transition-colors duration-200 group-hover:text-amber-950">
                      {userName}
                    </span>
                    <span className="mt-0.5 flex items-center justify-center gap-0.5 text-[11px] font-semibold leading-tight text-amber-700">
                      <span>Účet</span>
                      <ChevronDown
                        className={`h-3 w-3 shrink-0 transition-transform duration-200 ${
                          clientMenuOpen ? "rotate-180 text-amber-800" : "text-amber-700/80 group-hover:text-amber-800"
                        }`}
                      />
                    </span>
                  </button>

                  {/* Dropdown Menu pre Klienta */}
                  {clientMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 origin-top-right rounded-2xl border border-amber-200/90 bg-white/95 p-1.5 shadow-[0_20px_50px_rgba(180,83,9,0.16)] backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150 font-sans">
                      {/* Hlavička dropdownu */}
                      <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1 border-b border-amber-100/80 bg-amber-50/60 rounded-xl">
                        <TennisBallAvatar name={userName} className="h-8 w-8" textSize="text-[11px]" />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-slate-900">{userName}</span>
                          <span className="block truncate text-[10.5px] font-normal text-amber-700">
                            {currentUser.role === "trainer" ? "Tréner" : "Klient"}
                          </span>
                        </div>
                      </div>

                      {/* 1. Moje rezervácie (predtým Štatistiky) */}
                      <Link
                        href="/dashboard/newbookings"
                        onClick={() => setClientMenuOpen(false)}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium transition duration-150 group ${
                          activeTab === "stats"
                            ? "bg-amber-100/70 text-amber-950 font-semibold"
                            : "text-slate-700 hover:bg-amber-50 hover:text-amber-900"
                        }`}
                      >
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100/90 text-amber-800 group-hover:bg-[#B8442A] group-hover:text-white transition duration-150 shadow-2xs">
                          <LayoutDashboard className="h-4 w-4" />
                        </span>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-medium text-slate-800 group-hover:text-amber-950">Moje rezervácie</span>
                          <span className="text-[10px] font-normal text-slate-400">Prehľad a štatistiky termínov</span>
                        </div>
                      </Link>

                      {/* 2. Moje transakcie */}
                      <Link
                        href="/dashboard/transactions"
                        onClick={() => setClientMenuOpen(false)}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium transition duration-150 group ${
                          activeTab === "transactions"
                            ? "bg-amber-100/70 text-amber-950 font-semibold"
                            : "text-slate-700 hover:bg-amber-50 hover:text-amber-900"
                        }`}
                      >
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100/90 text-amber-800 group-hover:bg-[#B8442A] group-hover:text-white transition duration-150 shadow-2xs">
                          <Receipt className="h-4 w-4" />
                        </span>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-medium text-slate-800 group-hover:text-amber-950">Moje transakcie</span>
                          <span className="text-[10px] font-normal text-slate-400">História peňaženky a platieb</span>
                        </div>
                      </Link>

                      <div className="my-1 border-t border-slate-100" />

                      {/* 3. Odhlásiť sa */}
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition duration-150 group cursor-pointer text-left"
                      >
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-red-100/80 text-red-600 group-hover:bg-red-600 group-hover:text-white transition duration-150 shadow-2xs">
                          <LogOut className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-xs font-medium text-red-700">Odhlásiť sa</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </nav>
        ) : (
          /* Neregistrovaný / Neautentifikovaný návštevník */
          <div className="flex shrink-0 items-center gap-2">
            {onAuthModal ? (
              <>
                <button
                  type="button"
                  onClick={() => onAuthModal("register")}
                  className="group flex cursor-pointer items-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white/90 px-3 py-2.5 text-xs font-bold text-slate-800 shadow-xs backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-50/60 hover:text-amber-950 sm:gap-2 sm:px-4 sm:text-sm"
                >
                  <UserPlus className="h-4 w-4 text-amber-600 transition-transform duration-200 group-hover:scale-110" />
                  <span>Registrovať sa</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAuthModal("login")}
                  className="group flex cursor-pointer items-center gap-1.5 rounded-2xl border border-slate-900 bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg active:translate-y-0 sm:gap-2 sm:px-5 sm:text-sm"
                >
                  <LogIn className="h-4 w-4 text-[#CCFF00] transition-transform duration-200 group-hover:scale-110" />
                  <span>Prihlásiť sa</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/newbookings?auth=register"
                  className="group flex cursor-pointer items-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white/90 px-3 py-2.5 text-xs font-bold text-slate-800 shadow-xs backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-50/60 hover:text-amber-950 sm:gap-2 sm:px-4 sm:text-sm"
                >
                  <UserPlus className="h-4 w-4 text-amber-600 transition-transform duration-200 group-hover:scale-110" />
                  <span>Registrovať sa</span>
                </Link>
                <Link
                  href="/newbookings?auth=login"
                  className="group flex cursor-pointer items-center gap-1.5 rounded-2xl border border-slate-900 bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg active:translate-y-0 sm:gap-2 sm:px-5 sm:text-sm"
                >
                  <LogIn className="h-4 w-4 text-[#CCFF00] transition-transform duration-200 group-hover:scale-110" />
                  <span>Prihlásiť sa</span>
                </Link>
              </>
            )}
          </div>
        )}

        {/* Mobile Popover Dropdown (md:hidden) */}
        {currentUser && (
          <div className="md:hidden relative z-50 flex items-center gap-2" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className="shrink-0 cursor-pointer rounded-full p-0.5 transition hover:-translate-y-0.5 active:translate-y-0"
              title={userName}
              aria-label="Používateľské menu"
              aria-expanded={userMenuOpen}
            >
              <TennisBallAvatar name={userName} className="h-10 w-10" textSize="text-xs" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2.5 w-64 origin-top-right rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150 font-sans">
                <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-3 mb-1">
                  <TennisBallAvatar name={userName} className="h-10 w-10" textSize="text-sm" />
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-sm font-bold text-slate-900">{userName}</b>
                    {currentUser.role === "admin" && (
                      <span className="block truncate text-[11px] font-semibold text-indigo-600">
                        Administrátor
                      </span>
                    )}
                  </div>
                </div>

                {/* Dobíjanie kreditu (pre non-admin) */}
                {currentUser.role !== "admin" && walletBalance !== null && onTopUp && (
                  <div className="mb-1 rounded-xl bg-gradient-to-br from-yellow-50/90 via-amber-50/80 to-orange-50/60 p-3 text-slate-900 border border-amber-200/70 shadow-xs">
                    <div className="flex items-center justify-between text-sm font-bold text-slate-900">
                      <span className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-slate-700" /> Peňaženka
                      </span>
                      <span className="text-slate-900">{walletBalance.toFixed(2)} €</span>
                    </div>
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-sky-700">CardPay dobitie</p>
                    <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                      {[10, 20, 50].map((amount) => (
                        <button
                          key={`cardpay-${amount}`}
                          type="button"
                          disabled={topUpLoading !== null}
                          onClick={() => onTopUp(amount, "cardpay")}
                          className="cursor-pointer rounded-lg border border-sky-200 bg-white/90 px-2 py-2 text-xs font-extrabold text-sky-700 shadow-xs transition hover:border-sky-400 hover:bg-sky-50 disabled:cursor-wait disabled:opacity-50"
                        >
                          {topUpLoading === amount ? "..." : `+${amount} €`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  {/* Kalendár odkaz */}
                  <Link
                    href="/newbookings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition duration-150 group"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100 text-amber-800 group-hover:bg-amber-600 group-hover:text-white transition duration-150">
                      🎾
                    </span>
                    <span>Kalendár rezervácií</span>
                  </Link>

                  {currentUser.role === "admin" ? (
                    <>
                      <Link
                        href="/dashboard/users"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 transition duration-150 group"
                      >
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition duration-150">
                          <Users className="h-4 w-4" />
                        </span>
                        <span>Používatelia</span>
                      </Link>

                      <Link
                        href="/dashboard/newbookings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition duration-150 group"
                      >
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition duration-150">
                          <LayoutDashboard className="h-4 w-4" />
                        </span>
                        <span>Štatistiky</span>
                      </Link>

                      <Link
                        href="/dashboard/admin-transactions"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition duration-150 group"
                      >
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition duration-150">
                          <Receipt className="h-4 w-4" />
                        </span>
                        <span>Transakcie</span>
                      </Link>

                      <Link
                        href="/dashboard/users-roles"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 transition duration-150 hover:bg-violet-50 hover:text-violet-700 group"
                      >
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition duration-150">
                          <Settings className="h-4 w-4" />
                        </span>
                        <span>Nastavenia</span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/dashboard/newbookings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition duration-150 group"
                      >
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition duration-150">
                          <LayoutDashboard className="h-4 w-4" />
                        </span>
                        <span>Moje rezervácie</span>
                      </Link>

                      <Link
                        href="/dashboard/transactions"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition duration-150 group"
                      >
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition duration-150">
                          <Coins className="h-4 w-4" />
                        </span>
                        <span>Moje transakcie</span>
                      </Link>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold text-red-600 hover:bg-red-50 transition duration-150 group cursor-pointer"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white transition duration-150">
                      <LogOut className="h-4 w-4" />
                    </span>
                    <span>Odhlásiť sa</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
