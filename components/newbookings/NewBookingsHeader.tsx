"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CalendarCheck,
  CalendarDays,
  ChartLine,
  ChevronDown,
  ChevronRight,
  CircleUser,
  Coins,
  CreditCard,
  LayoutDashboard,
  LogIn,
  LogOut,
  ReceiptText,
  Settings,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import HolographicTennisCourt from "./HolographicTennisCourt";
import NewBookingProfileModal from "./NewBookingProfileModal";
import { logoutAction } from "@/app/actions/auth";
import { createWalletCardPayAction, getWalletAction } from "@/app/actions/wallet";
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
  walletBalance: propWalletBalance = null,
  walletHighlight = false,
  activeTab,
  onAuthModal,
  onTopUp,
  topUpLoading = null,
}: NewBookingsHeaderProps) {
  const router = useRouter();
  const [headerUser, setHeaderUser] = useState<HeaderUser | null | undefined>(currentUser);

  useEffect(() => {
    setHeaderUser(currentUser);
  }, [currentUser]);

  const rawUserName = headerUser?.name || currentUser?.name || "Užívateľ";
  const userName = rawUserName.toLowerCase() === "admin user" ? "Admin" : rawUserName;
  const [walletBalance, setWalletBalance] = useState<number | null>(propWalletBalance);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [clientMenuOpen, setClientMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [mobileWalletMenuOpen, setMobileWalletMenuOpen] = useState(false);
  const [internalLoadingAmount, setInternalLoadingAmount] = useState<number | null>(null);
  const [topUpError, setTopUpError] = useState<string | null>(null);

  const adminMenuRef = useRef<HTMLDivElement>(null);
  const clientMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const walletMenuRef = useRef<HTMLDivElement>(null);
  const mobileWalletMenuRef = useRef<HTMLDivElement>(null);

  // Sync propWalletBalance when provided from page
  useEffect(() => {
    if (propWalletBalance !== null && propWalletBalance !== undefined) {
      setWalletBalance(propWalletBalance);
    }
  }, [propWalletBalance]);

  // Automatically fetch live wallet balance from database whenever user is logged in
  useEffect(() => {
    if (currentUser) {
      getWalletAction().then((res) => {
        if (res.success && res.balanceEur !== undefined && res.balanceEur !== null) {
          setWalletBalance(res.balanceEur);
        }
      }).catch((err) => {
        console.error("NewBookingsHeader live wallet fetch error:", err);
      });
    }
  }, [currentUser, activeTab]);

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
      if (walletMenuRef.current && !walletMenuRef.current.contains(event.target as Node)) {
        setWalletMenuOpen(false);
      }
      if (mobileWalletMenuRef.current && !mobileWalletMenuRef.current.contains(event.target as Node)) {
        setMobileWalletMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTopUp = async (amount: number) => {
    setTopUpError(null);
    setInternalLoadingAmount(amount);
    try {
      if (onTopUp) {
        await onTopUp(amount, "cardpay");
      } else {
        const operationId = crypto.randomUUID();
        const res = await createWalletCardPayAction(amount, operationId);
        if (res.success && res.url) {
          window.location.href = res.url;
          return;
        }
        setTopUpError(res.error || "Nepodarilo sa vytvoriť platbu.");
        setInternalLoadingAmount(null);
      }
    } catch (err: any) {
      console.error("Top-up failed:", err);
      setTopUpError(err?.message || "Nepodarilo sa inicializovať platbu.");
      setInternalLoadingAmount(null);
    }
  };

  const renderTopUpPopover = () => {
    const isAnyLoading = topUpLoading !== null || internalLoadingAmount !== null;
    const isLoading = (amount: number) => topUpLoading === amount || internalLoadingAmount === amount;

    return (
      <div className="text-slate-900 font-sans">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <CreditCard className="h-4 w-4 text-sky-700 shrink-0" />
            Dobiť cez Tatra banka CardPay
          </p>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-700">
            Sandbox
          </span>
        </div>
        <p className="mb-3 text-xs text-slate-500 leading-relaxed">
          Budete presmerovaný na zabezpečenú testovaciu platobnú stránku Tatra banky.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[10, 20, 50].map((amount) => (
            <button
              key={amount}
              type="button"
              disabled={isAnyLoading}
              onClick={() => handleTopUp(amount)}
              className="cursor-pointer rounded-xl border border-sky-200 bg-white py-2.5 text-center text-xs font-extrabold text-sky-700 shadow-xs transition hover:border-sky-400 hover:bg-sky-50 active:scale-95 disabled:cursor-wait disabled:opacity-50"
            >
              {isLoading(amount) ? "Otváram..." : `${amount} €`}
            </button>
          ))}
        </div>
        {topUpError && (
          <p className="mt-2 text-xs font-semibold text-red-600">
            {topUpError}
          </p>
        )}
      </div>
    );
  };

  const handleLogout = async () => {
    setAdminMenuOpen(false);
    setClientMenuOpen(false);
    setUserMenuOpen(false);
    try {
      await logoutAction();
    } catch (err) {
      console.error("Logout action error:", err);
    }
    window.location.href = "/api/auth/logout";
  };

  return (
    <header
      className="relative isolate z-40 border-b border-slate-700/80 shadow-[0_4px_24px_rgba(0,0,0,0.22)] text-white"
      style={{
        background: "linear-gradient(180deg, #1C1F24 0%, #333842 35%, #505764 70%, #6E7786 100%)",
      }}
    >
      <div className="relative mx-auto flex min-h-[64px] max-w-[1500px] items-center justify-between gap-1.5 px-3 py-2 sm:min-h-[78px] sm:gap-4 sm:px-6 lg:px-8">
        {/* NTC Logo / Official Brand */}
        <Link
          href="/newbookings"
          className="group flex shrink-0 items-center transition duration-200 hover:opacity-90 active:scale-[0.99]"
          aria-label="NTC Domov - Kalendár"
          title="Prejsť na kalendár rezervácií"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/ntc-brand-logo.png"
            alt="Národné tenisové centrum"
            className="h-9 sm:h-11 md:h-12 lg:h-[50px] w-auto object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)] select-none"
          />
        </Link>


        {/* Desktop Horizontal Navigation (md:flex) */}
        {currentUser ? (
          <nav className="hidden md:flex items-center gap-2 lg:gap-3 font-sans">
            {currentUser.role === "admin" ? (
              <>
                {/* Admin Navigation: Používatelia | Štatistiky | Nastavenia */}
                <div className="flex items-center gap-1.5 lg:gap-2 mr-3 lg:mr-4">
                  {/* 1. Používatelia */}
                  <Link
                    href="/dashboard/users"
                    className={`group relative flex h-[58px] w-[80px] shrink-0 flex-col items-center justify-center rounded-xl border transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${
                      activeTab === "users"
                        ? "border-white/25 bg-white/15 text-white shadow-inner"
                        : "border-transparent bg-transparent text-slate-300 hover:border-white/10 hover:bg-white/10 hover:text-white"
                    }`}
                    title="Správa používateľov"
                  >
                    <div className="transition-transform duration-200 group-hover:scale-105">
                      <Users className="h-4.5 w-4.5 transition-colors duration-200" strokeWidth={1.8} />
                    </div>
                    <span className="mt-1 text-[11px] font-medium tracking-normal transition-colors duration-200">
                      Používatelia
                    </span>
                  </Link>

                  {/* 2. Štatistiky */}
                  <Link
                    href="/dashboard/newbookings"
                    className={`group relative flex h-[58px] w-[80px] shrink-0 flex-col items-center justify-center rounded-xl border transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${
                      activeTab === "stats"
                        ? "border-white/25 bg-white/15 text-white shadow-inner"
                        : "border-transparent bg-transparent text-slate-300 hover:border-white/10 hover:bg-white/10 hover:text-white"
                    }`}
                    title="Prehľad a štatistiky"
                  >
                    <div className="transition-transform duration-200 group-hover:scale-105">
                      <ChartLine className="h-4.5 w-4.5 transition-colors duration-200" strokeWidth={1.8} />
                    </div>
                    <span className="mt-1 text-[11px] font-medium tracking-normal transition-colors duration-200">
                      Štatistiky
                    </span>
                  </Link>

                  {/* 3. Nastavenia */}
                  <Link
                    href="/dashboard/users-roles"
                    className={`group relative flex h-[58px] w-[80px] shrink-0 flex-col items-center justify-center rounded-xl border transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${
                      activeTab === "settings"
                        ? "border-white/25 bg-white/15 text-white shadow-inner"
                        : "border-transparent bg-transparent text-slate-300 hover:border-white/10 hover:bg-white/10 hover:text-white"
                    }`}
                    title="Nastavenia systému a rolí"
                  >
                    <div className="transition-transform duration-200 group-hover:scale-105">
                      <Settings className="h-4.5 w-4.5 transition-colors duration-200" strokeWidth={1.8} />
                    </div>
                    <span className="mt-1 text-[11px] font-medium tracking-normal transition-colors duration-200">
                      Nastavenia
                    </span>
                  </Link>
                </div>

                {/* Admin User Avatar s Dropdown menu (Transakcie + Odhlásiť) */}
                <div className="relative" ref={adminMenuRef}>
                  <button
                    type="button"
                    onClick={() => setAdminMenuOpen((prev) => !prev)}
                    className={`group relative flex h-[58px] w-[80px] shrink-0 flex-col items-center justify-center rounded-xl border transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ${
                      adminMenuOpen || activeTab === "transactions"
                        ? "border-white/25 bg-white/15 text-white shadow-inner"
                        : "border-transparent bg-transparent text-slate-300 hover:border-white/10 hover:bg-white/10 hover:text-white"
                    }`}
                    aria-expanded={adminMenuOpen}
                    aria-haspopup="true"
                    title="Používateľské menu administrátora"
                  >
                    <div className="transition-transform duration-200 group-hover:scale-105">
                      <CircleUser className="h-4.5 w-4.5 text-emerald-400 transition-colors duration-200 group-hover:text-emerald-300" strokeWidth={1.8} />
                    </div>
                    <span className="mt-1 flex items-center justify-center gap-0.5 text-[11px] font-medium tracking-normal transition-colors duration-200">
                      <span className="max-w-[60px] truncate">{userName}</span>
                      <ChevronDown
                        className={`h-3 w-3 shrink-0 text-slate-400 transition-transform duration-200 ${
                          adminMenuOpen ? "rotate-180 text-white" : "group-hover:text-white"
                        }`}
                      />
                    </span>
                  </button>

                  {/* Dropdown Menu pre Admin User */}
                  {adminMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 origin-top-right rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150 font-sans">
                      {/* Hlavička dropdownu */}
                      <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1 border-b border-slate-100 bg-slate-50/70 rounded-xl">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                          <CircleUser className="h-5 w-5" strokeWidth={1.8} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-slate-900">{userName}</span>
                          <span className="block truncate text-[10.5px] font-bold text-[#65a30d]">Administrátor</span>
                        </div>
                      </div>

                      {/* Môj profil */}
                      <button
                        type="button"
                        onClick={() => {
                          setAdminMenuOpen(false);
                          setProfileModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-xs font-medium text-slate-700 hover:border-slate-200/80 hover:bg-slate-100/90 hover:text-slate-950 transition-colors duration-150 group cursor-pointer text-left"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors duration-150 shadow-2xs">
                          <CircleUser className="h-4 w-4" />
                        </span>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-medium text-slate-800 group-hover:text-slate-950 transition-colors duration-150">Môj profil</span>
                          <span className="text-[10px] font-normal text-slate-400">Údaje a zmena hesla</span>
                        </div>
                      </button>

                      {/* Transakcie presunuté do avatara */}
                      <Link
                        href="/dashboard/admin-transactions"
                        onClick={() => setAdminMenuOpen(false)}
                        className={`flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-xs font-medium transition-colors duration-150 group ${activeTab === "transactions"
                            ? "bg-slate-100 text-slate-950 font-semibold border-slate-200/80"
                            : "text-slate-700 hover:border-slate-200/80 hover:bg-slate-100/90 hover:text-slate-950"
                          }`}
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors duration-150 shadow-2xs">
                          <ReceiptText className="h-4 w-4" />
                        </span>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-medium text-slate-800 group-hover:text-slate-950 transition-colors duration-150">Transakcie</span>
                          <span className="text-[10px] font-normal text-slate-400">Prehľad platieb a kreditov</span>
                        </div>
                      </Link>

                      <div className="my-1 border-t border-slate-100" />

                      {/* Odhlásiť sa */}
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2 text-xs font-medium text-red-600 hover:border-red-200/70 hover:bg-red-50 hover:text-red-700 transition-colors duration-150 group cursor-pointer text-left"
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-red-100/80 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors duration-150 shadow-2xs">
                          <LogOut className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-xs font-medium text-red-700 transition-colors duration-150">Odhlásiť sa</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Non-admin používateľ: 1. Peňaženka, 2. Avatar s dropdownom */
              <div className="flex items-center gap-2 font-sans">
                {/* 1. Peňaženka s vybaľovacím oknom */}
                <div className="relative" ref={walletMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setWalletMenuOpen((prev) => !prev);
                      setClientMenuOpen(false);
                    }}
                    className={`group relative flex h-[58px] w-[86px] shrink-0 flex-col items-center justify-center rounded-xl border transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ${
                      walletMenuOpen
                        ? "border-emerald-400/50 bg-white/15 ring-2 ring-emerald-400/30 text-white shadow-inner"
                        : walletHighlight
                        ? "border-emerald-500 bg-emerald-500/20 ring-4 ring-emerald-400/50 scale-105"
                        : "border-transparent bg-transparent text-slate-300 hover:border-white/10 hover:bg-white/10 hover:text-white"
                    }`}
                    title="Dobiť kredit peňaženky"
                    aria-expanded={walletMenuOpen}
                  >
                    <div className="transition-transform duration-200 group-hover:scale-105">
                      <Wallet className="h-4.5 w-4.5 text-emerald-400 transition-colors duration-200 group-hover:text-emerald-300" strokeWidth={1.8} />
                    </div>
                    <span
                      className={`mt-0.5 text-[10.5px] leading-tight transition-colors duration-200 ${
                        walletMenuOpen ? "font-semibold text-white" : "font-medium text-slate-300 group-hover:text-white"
                      }`}
                    >
                      Peňaženka
                    </span>
                    <span className="mt-0.5 text-[10.5px] font-bold leading-tight text-emerald-400 group-hover:text-emerald-300">
                      {walletBalance !== null ? `${walletBalance.toFixed(2)} €` : "0.00 €"}
                    </span>
                  </button>

                  {walletMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 origin-top-right rounded-2xl border border-slate-200/90 bg-white/98 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                      {renderTopUpPopover()}
                    </div>
                  )}
                </div>

                {/* 2. Používateľ Avatar s dropdownom */}
                <div className="relative" ref={clientMenuRef}>
                  <button
                    type="button"
                    onClick={() => setClientMenuOpen((prev) => !prev)}
                    className={`group relative flex h-[58px] w-[86px] shrink-0 flex-col items-center justify-center rounded-xl border transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ${
                      clientMenuOpen || activeTab === "stats"
                        ? "border-white/25 bg-white/15 text-white shadow-inner"
                        : "border-transparent bg-transparent text-slate-300 hover:border-white/10 hover:bg-white/10 hover:text-white"
                    }`}
                    aria-expanded={clientMenuOpen}
                    aria-haspopup="true"
                    title="Používateľské menu"
                  >
                    <div className="transition-transform duration-200 group-hover:scale-105">
                      <CircleUser className="h-4.5 w-4.5 text-emerald-400 transition-colors duration-200 group-hover:text-emerald-300" strokeWidth={1.8} />
                    </div>
                    <span className="mt-0.5 block max-w-[76px] truncate text-center text-[10.5px] font-medium leading-tight text-slate-200 transition-colors duration-200 group-hover:text-white">
                      {userName}
                    </span>
                    <span className="mt-0.5 flex items-center justify-center gap-0.5 text-[10.5px] font-bold leading-tight text-emerald-400">
                      <span>Účet</span>
                      <ChevronDown
                        className={`h-3 w-3 shrink-0 transition-transform duration-200 ${
                          clientMenuOpen ? "rotate-180 text-emerald-300" : "text-emerald-400 group-hover:text-emerald-300"
                        }`}
                      />
                    </span>
                  </button>

                  {/* Dropdown Menu pre Klienta */}
                  {clientMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 origin-top-right rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150 font-sans">
                      {/* Hlavička dropdownu */}
                      <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1 border-b border-slate-100 bg-slate-50/70 rounded-xl">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
                          <CircleUser className="h-5 w-5" strokeWidth={1.8} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-slate-900">{userName}</span>
                          <span className="block truncate text-[10.5px] font-normal text-slate-500">
                            {currentUser.role === "trainer" ? "Tréner" : "Klient"}
                          </span>
                        </div>
                      </div>

                      {/* 1. Moje rezervácie (predtým Štatistiky) */}
                      <Link
                        href="/dashboard/newbookings"
                        onClick={() => setClientMenuOpen(false)}
                        className={`flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-xs font-medium transition-colors duration-150 group ${
                          activeTab === "stats"
                            ? "bg-slate-100 text-slate-950 font-semibold border-slate-200/80"
                            : "text-slate-700 hover:border-slate-200/80 hover:bg-slate-100/90 hover:text-slate-950"
                        }`}
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors duration-150 shadow-2xs">
                          <CalendarCheck className="h-4 w-4" />
                        </span>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-medium text-slate-800 group-hover:text-slate-950 transition-colors duration-150">Moje rezervácie</span>
                          <span className="text-[10px] font-normal text-slate-400">Prehľad a štatistiky termínov</span>
                        </div>
                      </Link>

                      {/* 2. Moje transakcie */}
                      <Link
                        href="/dashboard/transactions"
                        onClick={() => setClientMenuOpen(false)}
                        className={`flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-xs font-medium transition-colors duration-150 group ${
                          activeTab === "transactions"
                            ? "bg-slate-100 text-slate-950 font-semibold border-slate-200/80"
                            : "text-slate-700 hover:border-slate-200/80 hover:bg-slate-100/90 hover:text-slate-950"
                        }`}
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors duration-150 shadow-2xs">
                          <ReceiptText className="h-4 w-4" />
                        </span>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-medium text-slate-800 group-hover:text-slate-950 transition-colors duration-150">Moje transakcie</span>
                          <span className="text-[10px] font-normal text-slate-400">História peňaženky a platieb</span>
                        </div>
                      </Link>

                      {/* 3. Môj profil */}
                      <button
                        type="button"
                        onClick={() => {
                          setClientMenuOpen(false);
                          setProfileModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-xs font-medium text-slate-700 hover:border-slate-200/80 hover:bg-slate-100/90 hover:text-slate-950 transition-colors duration-150 group cursor-pointer text-left"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors duration-150 shadow-2xs">
                          <CircleUser className="h-4 w-4" />
                        </span>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-medium text-slate-800 group-hover:text-slate-950 transition-colors duration-150">Môj profil</span>
                          <span className="text-[10px] font-normal text-slate-400">Údaje a zmena hesla</span>
                        </div>
                      </button>

                      <div className="my-1 border-t border-slate-100" />

                      {/* 4. Odhlásiť sa */}
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2 text-xs font-medium text-red-600 hover:border-red-200/70 hover:bg-red-50 hover:text-red-700 transition-colors duration-150 group cursor-pointer text-left"
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-red-100/80 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors duration-150 shadow-2xs">
                          <LogOut className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-xs font-medium text-red-700 transition-colors duration-150">Odhlásiť sa</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </nav>
        ) : (
          /* Neregistrovaný / Neautentifikovaný návštevník */
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {onAuthModal ? (
              <>
                <button
                  type="button"
                  onClick={() => onAuthModal("register")}
                  className="group flex cursor-pointer items-center gap-1 rounded-xl border border-white/30 bg-white/95 px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:bg-white sm:gap-2 sm:rounded-2xl sm:px-4 sm:py-2.5 sm:text-sm"
                >
                  <UserPlus className="h-3.5 w-3.5 shrink-0 text-slate-600 transition-transform duration-200 group-hover:scale-110 sm:h-4 sm:w-4" />
                  <span className="whitespace-nowrap">Registrovať sa</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAuthModal("login")}
                  className="group flex cursor-pointer items-center gap-1 rounded-xl border border-slate-900 bg-slate-950 px-2.5 py-1.5 text-xs font-bold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-slate-850 hover:shadow-lg active:translate-y-0 sm:gap-2 sm:rounded-2xl sm:px-5 sm:py-2.5 sm:text-sm"
                >
                  <LogIn className="h-3.5 w-3.5 shrink-0 text-[#CCFF00] transition-transform duration-200 group-hover:scale-110 sm:h-4 sm:w-4" />
                  <span className="whitespace-nowrap">Prihlásiť sa</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/newbookings?auth=register"
                  className="group flex cursor-pointer items-center gap-1 rounded-xl border border-white/30 bg-white/95 px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:bg-white sm:gap-2 sm:rounded-2xl sm:px-4 sm:py-2.5 sm:text-sm"
                >
                  <UserPlus className="h-3.5 w-3.5 shrink-0 text-slate-600 transition-transform duration-200 group-hover:scale-110 sm:h-4 sm:w-4" />
                  <span className="whitespace-nowrap">Registrovať sa</span>
                </Link>
                <Link
                  href="/newbookings?auth=login"
                  className="group flex cursor-pointer items-center gap-1 rounded-xl border border-slate-900 bg-slate-950 px-2.5 py-1.5 text-xs font-bold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-slate-850 hover:shadow-lg active:translate-y-0 sm:gap-2 sm:rounded-2xl sm:px-5 sm:py-2.5 sm:text-sm"
                >
                  <LogIn className="h-3.5 w-3.5 shrink-0 text-[#CCFF00] transition-transform duration-200 group-hover:scale-110 sm:h-4 sm:w-4" />
                  <span className="whitespace-nowrap">Prihlásiť sa</span>
                </Link>
              </>
            )}
          </div>
        )}

        {/* Mobile Popover Dropdown (md:hidden) */}
        {currentUser && (
          <div className="md:hidden relative z-50 flex items-center gap-1.5">
            {/* Rýchly prístup k peňaženke na mobile s vybaľovacím oknom */}
            {currentUser.role !== "admin" && (
              <div className="relative" ref={mobileWalletMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setMobileWalletMenuOpen((prev) => !prev);
                    setUserMenuOpen(false);
                  }}
                  className={`group relative flex h-[54px] w-[76px] xs:w-[84px] shrink-0 flex-col items-center justify-center rounded-xl border transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ${
                    mobileWalletMenuOpen
                      ? "border-emerald-400/50 bg-white/15 ring-2 ring-emerald-400/30 text-white shadow-inner"
                      : walletHighlight
                      ? "border-emerald-500 bg-emerald-500/20 ring-4 ring-emerald-400/50 scale-105"
                      : "border-transparent bg-transparent text-slate-300 hover:border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                  title="Dobiť kredit peňaženky"
                  aria-expanded={mobileWalletMenuOpen}
                >
                  <div className="transition-transform duration-200 group-hover:scale-105">
                    <Wallet className="h-4 w-4 text-emerald-400 transition-colors duration-200 group-hover:text-emerald-300" strokeWidth={1.8} />
                  </div>
                  <span
                    className={`mt-0.5 text-[10px] leading-tight transition-colors duration-200 ${
                      mobileWalletMenuOpen ? "font-semibold text-white" : "font-medium text-slate-300 group-hover:text-white"
                    }`}
                  >
                    Peňaženka
                  </span>
                  <span className="mt-0.5 text-[10px] font-bold leading-tight text-emerald-400 group-hover:text-emerald-300">
                    {walletBalance !== null ? `${walletBalance.toFixed(2)} €` : "0.00 €"}
                  </span>
                </button>

                {mobileWalletMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 origin-top-right rounded-2xl border border-slate-200/90 bg-white/98 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                    {renderTopUpPopover()}
                  </div>
                )}
              </div>
            )}

            {/* Tlačidlo profilu na mobile */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen((prev) => !prev);
                  setMobileWalletMenuOpen(false);
                }}
                className={`group relative flex h-[54px] w-[76px] xs:w-[84px] shrink-0 flex-col items-center justify-center rounded-xl border transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ${
                  userMenuOpen
                    ? "border-white/25 bg-white/15 text-white shadow-inner"
                    : "border-transparent bg-transparent text-slate-300 hover:border-white/10 hover:bg-white/10 hover:text-white"
                }`}
                title={userName}
                aria-label="Používateľské menu"
                aria-expanded={userMenuOpen}
              >
                <div className="transition-transform duration-200 group-hover:scale-105">
                  <CircleUser className="h-4 w-4 text-emerald-400 transition-colors duration-200 group-hover:text-emerald-300" strokeWidth={1.8} />
                </div>
                <span className="mt-0.5 block max-w-[68px] truncate text-center text-[10px] font-medium leading-tight text-slate-200 transition-colors duration-200 group-hover:text-white">
                  {userName}
                </span>
                <span className="mt-0.5 flex items-center justify-center gap-0.5 text-[10px] font-bold leading-tight text-emerald-400">
                  <span>Účet</span>
                  <ChevronDown
                    className={`h-3 w-3 shrink-0 transition-transform duration-200 ${
                      userMenuOpen ? "rotate-180 text-emerald-300" : "text-emerald-400 group-hover:text-emerald-300"
                    }`}
                  />
                </span>
              </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 origin-top-right rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150 font-sans">
                <div className="flex items-center gap-2.5 border-b border-slate-100 px-3 py-2.5 mb-1">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
                    <CircleUser className="h-5 w-5" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-sm font-bold text-slate-900">{userName}</b>
                    {currentUser.role === "admin" ? (
                      <span className="block truncate text-[11px] font-bold text-[#65a30d]">
                        Administrátor
                      </span>
                    ) : (
                      <span className="block truncate text-[11px] font-normal text-slate-500">
                        {currentUser.role === "trainer" ? "Tréner" : "Klient"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Dobíjanie kreditu (pre non-admin) */}
                {currentUser.role !== "admin" && walletBalance !== null && onTopUp && (
                  <div className="mb-1 rounded-xl bg-slate-50 p-3 text-slate-900 border border-slate-200/80 shadow-xs">
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
                    className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:border-slate-200/80 hover:bg-slate-100/90 hover:text-slate-950 transition-colors duration-150 group"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors duration-150">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    <span className="transition-colors duration-150">Kalendár rezervácií</span>
                  </Link>

                  {currentUser.role === "admin" ? (
                    <>
                      <Link
                        href="/dashboard/users"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:border-slate-200/80 hover:bg-slate-100/90 hover:text-slate-950 transition-colors duration-150 group"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors duration-150">
                          <Users className="h-4 w-4" />
                        </span>
                        <span className="transition-colors duration-150">Používatelia</span>
                      </Link>

                      <Link
                        href="/dashboard/newbookings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:border-slate-200/80 hover:bg-slate-100/90 hover:text-slate-950 transition-colors duration-150 group"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors duration-150">
                          <LayoutDashboard className="h-4 w-4" />
                        </span>
                        <span className="transition-colors duration-150">Štatistiky</span>
                      </Link>

                      <Link
                        href="/dashboard/admin-transactions"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:border-slate-200/80 hover:bg-slate-100/90 hover:text-slate-950 transition-colors duration-150 group"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors duration-150">
                          <ReceiptText className="h-4 w-4" />
                        </span>
                        <span className="transition-colors duration-150">Transakcie</span>
                      </Link>

                      <Link
                        href="/dashboard/users-roles"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:border-slate-200/80 hover:bg-slate-100/90 hover:text-slate-950 transition-colors duration-150 group"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors duration-150">
                          <Settings className="h-4 w-4" />
                        </span>
                        <span className="transition-colors duration-150">Nastavenia</span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/dashboard/newbookings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:border-slate-200/80 hover:bg-slate-100/90 hover:text-slate-950 transition-colors duration-150 group"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors duration-150">
                          <CalendarCheck className="h-4 w-4" />
                        </span>
                        <span className="transition-colors duration-150">Moje rezervácie</span>
                      </Link>

                      <Link
                        href="/dashboard/transactions"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:border-slate-200/80 hover:bg-slate-100/90 hover:text-slate-950 transition-colors duration-150 group"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors duration-150">
                          <ReceiptText className="h-4 w-4" />
                        </span>
                        <span className="transition-colors duration-150">Moje transakcie</span>
                      </Link>
                    </>
                  )}

                  {/* Môj profil (mobil) */}
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      setProfileModalOpen(true);
                    }}
                    className="w-full flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:border-slate-200/80 hover:bg-slate-100/90 hover:text-slate-950 transition-colors duration-150 group cursor-pointer text-left"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors duration-150">
                      <CircleUser className="h-4 w-4" />
                    </span>
                    <span className="transition-colors duration-150">Môj profil a heslo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-xs sm:text-sm font-semibold text-red-600 hover:border-red-200/70 hover:bg-red-50 hover:text-red-700 transition-colors duration-150 group cursor-pointer text-left"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors duration-150">
                      <LogOut className="h-4 w-4" />
                    </span>
                    <span className="transition-colors duration-150">Odhlásiť sa</span>
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        )}
        {/* Modálne okno profilu používateľa */}
        {headerUser && (
          <NewBookingProfileModal
            currentUser={headerUser}
            isOpen={profileModalOpen}
            onClose={() => setProfileModalOpen(false)}
            onUserUpdated={(updatedUser) => {
              setHeaderUser((prev) => ({ ...prev, ...updatedUser }));
              router.refresh();
            }}
          />
        )}
      </div>
    </header>
  );
}
