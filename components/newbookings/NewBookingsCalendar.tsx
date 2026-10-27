"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, CalendarDays, CalendarSync, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Clock, Coins, LayoutDashboard, LogIn, LogOut, Palette, Plus, Receipt, Repeat, Settings, ShieldCheck, Sparkles, UserPlus, Users, X } from "lucide-react";
import TennisBallAvatar from "@/components/icons/TennisBallAvatar";
import { ThreeDChartIcon, ThreeDSettingsIcon, ThreeDUserAvatarIcon } from "@/components/icons/ThreeDNavIcons";
import { createBookingAction, createRecurringBookingAction, deleteBookingAction, fetchBookingsAction, rescheduleBookingAction } from "@/app/actions/bookings";
import { logoutAction } from "@/app/actions/auth";
import { createWalletCardPayAction, createWalletCheckoutAction, getWalletAction, reconcileWalletCardPayAction, reconcileWalletCheckoutAction } from "@/app/actions/wallet";

import { supabase } from "@/lib/supabase";
import type { BookingUser } from "@/lib/auth/bookingAuth";
import type { Booking, Court, SportType } from "@/lib/bookings/mockBookings";
import { openingHours } from "@/lib/bookings/mockBookings";
import { calculateNtcBookingPrice } from "@/lib/bookings/pricing";
import type { NtcPricelist } from "@/lib/bookings/pricingTypes";
import { createBratislavaIso, getBratislavaDateKey, getCourtOperatingLimitMinutes, getDurationOptions, type RoleBookingPolicy } from "@/lib/bookings/rolePolicy";
import {
  type AdminReservationCategory,
  DEFAULT_ADMIN_CATEGORIES,
} from "@/lib/bookings/categoryTypes";

import HolographicTennisCourt from "./HolographicTennisCourt";
import NewBookingsHeader from "./NewBookingsHeader";
import NewBookingAuth from "./NewBookingAuth";
import { BookingDetailDialog, CreateBookingDialog, DeleteDialog, RescheduleConfirmDialog, SeriesOverviewDialog, formatCourtDisplayName } from "./NewBookingDialogs";

type Props = {
  courts: Court[];
  initialBookings: Booking[];
  initialCategories?: AdminReservationCategory[];
  currentUser: BookingUser | null;
  rolePolicy: RoleBookingPolicy | null;
  initialWalletBalance?: number | null;
  activePricelist?: NtcPricelist;
};
type Slot = { courtId: string; date: Date; hour: number };

const sports: { id: SportType; label: string }[] = [
  { id: "badminton", label: "Bedminton" },
  { id: "squash", label: "Squash" },
  { id: "tennis", label: "Tenis indoor" },
  { id: "tennis-clay", label: "Tenis antuka" },
];

const dateKey = (date: Date) => getBratislavaDateKey(date);
const formatTime = (value: string) => new Intl.DateTimeFormat("sk-SK", { timeZone: "Europe/Bratislava", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const formatCompactInterval = (startVal: string, endVal: string) => {
  const s = new Date(startVal);
  const e = new Date(endVal);
  const sParts = new Intl.DateTimeFormat("sk-SK", { timeZone: "Europe/Bratislava", hour: "numeric", minute: "numeric" }).formatToParts(s);
  const eParts = new Intl.DateTimeFormat("sk-SK", { timeZone: "Europe/Bratislava", hour: "numeric", minute: "numeric" }).formatToParts(e);
  const sHour = sParts.find(p => p.type === "hour")?.value || "";
  const sMin = sParts.find(p => p.type === "minute")?.value || "00";
  const eHour = eParts.find(p => p.type === "hour")?.value || "";
  const eMin = eParts.find(p => p.type === "minute")?.value || "00";
  const sText = sMin === "00" || sMin === "0" ? sHour : `${sHour}:${sMin}`;
  const eText = eMin === "00" || eMin === "0" ? eHour : `${eHour}:${eMin}`;
  return `${sText}–${eText}`;
};

function DatePicker({ value, min, max, horizonDays, onSelect, onClose }: { value: Date; min: Date; max: Date; horizonDays: number; onSelect: (date: Date) => void; onClose: () => void }) {
  const [month, setMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const firstGridDay = useMemo(() => {
    const first = new Date(month);
    const mondayOffset = (first.getDay() + 6) % 7;
    first.setDate(first.getDate() - mondayOffset);
    return first;
  }, [month]);
  const days = useMemo(() => Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstGridDay);
    day.setDate(day.getDate() + index);
    day.setHours(12, 0, 0, 0);
    return day;
  }), [firstGridDay]);
  const minMonth = new Date(min.getFullYear(), min.getMonth(), 1);
  const maxMonth = new Date(max.getFullYear(), max.getMonth(), 1);
  const canMoveBack = month > minMonth;
  const canMoveForward = month < maxMonth;

  const moveMonth = (offset: number) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Vybrať dátum rezervácie">
      <button type="button" className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={onClose} aria-label="Zavrieť kalendár" />
      <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" disabled={!canMoveBack} onClick={() => moveMonth(-1)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 disabled:cursor-not-allowed disabled:opacity-25" aria-label="Predchádzajúci mesiac"><ChevronLeft className="h-4 w-4" /></button>
          <strong className="text-base capitalize">{new Intl.DateTimeFormat("sk-SK", { month: "long", year: "numeric" }).format(month)}</strong>
          <button type="button" disabled={!canMoveForward} onClick={() => moveMonth(1)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 disabled:cursor-not-allowed disabled:opacity-25" aria-label="Nasledujúci mesiac"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="mb-2 grid grid-cols-7 text-center text-xs font-bold text-slate-500">{["Po", "Ut", "St", "Št", "Pi", "So", "Ne"].map((day) => <span key={day} className="py-2">{day}</span>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const allowed = day >= min && day <= max;
            const outsideMonth = day.getMonth() !== month.getMonth();
            const selected = dateKey(day) === dateKey(value);
            return <button type="button" key={dateKey(day)} disabled={!allowed} onClick={() => onSelect(day)} className={`aspect-square rounded-xl text-sm font-semibold transition ${selected ? "bg-slate-950 text-white shadow-md" : allowed ? "cursor-pointer text-slate-800 hover:bg-emerald-50 hover:text-emerald-700" : "cursor-not-allowed bg-slate-50/70 text-slate-300 line-through decoration-slate-300"} ${outsideMonth && allowed ? "text-slate-400" : ""}`} aria-label={new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "long", year: "numeric" }).format(day)}>{day.getDate()}</button>;
          })}
        </div>
        <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-center text-xs font-medium text-slate-500">Rezerváciu je možné vytvoriť najviac {horizonDays} dní vopred.</p>
      </div>
    </div>
  );
}

function blockedLabel(courtId: string, sport: SportType, hour: number) {
  if (sport !== "tennis-clay") return null;
  if (["tennis-clay-10", "tennis-clay-11"].includes(courtId)) {
    if (hour === 7 || hour >= 17) return "Mimo prevádzky";
  }
  return null;
}

function clayError(courtId: string, sport: SportType, hour: number, duration: number) {
  if (sport !== "tennis-clay") return null;
  const end = hour + duration / 60;
  if (["tennis-clay-10", "tennis-clay-11"].includes(courtId)) {
    if (hour < 8) return "Dvorce 10 a 11 sú pred 8:00 mimo prevádzky.";
    if (end > 16.5) return "Dvorce 10 a 11 sú otvorené iba do 16:30.";
  }
  return null;
}

let lastSoundPlayTime = 0;
function playTennisHitSound() {
  if (typeof window === "undefined") return;
  const nowMs = Date.now();
  if (nowMs - lastSoundPlayTime < 3000) return; // Throttle to max once per 3s
  lastSoundPlayTime = nowMs;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const now = ctx.currentTime;

    // 1. Tennis Racket Hit
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.08);
    oscGain.gain.setValueAtTime(1.0, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);

    const popOsc = ctx.createOscillator();
    const popGain = ctx.createGain();
    popOsc.type = "triangle";
    popOsc.frequency.setValueAtTime(780, now);
    popOsc.frequency.exponentialRampToValueAtTime(240, now + 0.06);
    popGain.gain.setValueAtTime(0.7, now);
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(420, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.07);
    gain.gain.setValueAtTime(0.7, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.07);

    // 2. Ball pop resonance
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) output[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 850;
    filter.Q.value = 3.5;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + 0.05);

    // 3. Short court applause for successful reservation
    const applauseLen = 1.2;
    const applauseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * applauseLen), ctx.sampleRate);
    const applauseData = applauseBuffer.getChannelData(0);
    for (let i = 0; i < applauseBuffer.length; i++) applauseData[i] = Math.random() * 2 - 1;

    const applauseMasterGain = ctx.createGain();
    applauseMasterGain.gain.setValueAtTime(0.001, ctx.currentTime + 0.08);
    applauseMasterGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.25);
    applauseMasterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08 + applauseLen);
    applauseMasterGain.connect(ctx.destination);

    // Simulate multi-claps
    const claps = 18;
    const clapBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.035), ctx.sampleRate);
    const clapData = clapBuf.getChannelData(0);
    for (let i = 0; i < clapBuf.length; i++) clapData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));

    for (let i = 0; i < claps; i++) {
      const clapTime = ctx.currentTime + 0.09 + Math.random() * (applauseLen - 0.15);
      const clapSource = ctx.createBufferSource();
      clapSource.buffer = clapBuf;

      const clapFilter = ctx.createBiquadFilter();
      clapFilter.type = "bandpass";
      clapFilter.frequency.setValueAtTime(900 + Math.random() * 1300, clapTime);
      clapFilter.Q.setValueAtTime(1.5 + Math.random() * 1.5, clapTime);

      const clapGain = ctx.createGain();
      clapGain.gain.setValueAtTime(0.25 + Math.random() * 0.35, clapTime);

      clapSource.connect(clapFilter);
      clapFilter.connect(clapGain);
      clapGain.connect(applauseMasterGain);

      clapSource.start(clapTime);
      clapSource.stop(clapTime + 0.035);
    }
  } catch (e) {
    console.error("Audio play error:", e);
  }
}

export default function NewBookingsCalendar({
  courts,
  initialBookings,
  initialCategories,
  currentUser: initialCurrentUser,
  rolePolicy: initialRolePolicy,
  initialWalletBalance,
  activePricelist,
}: Props) {
  const router = useRouter();
  const voiceHighlightTimers = useRef(new Map<string, number>());
  const [currentUser, setCurrentUser] = useState(initialCurrentUser);
  const [rolePolicy, setRolePolicy] = useState(initialRolePolicy);
  const [pendingSlot, setPendingSlot] = useState<Slot | null>(null);

  useEffect(() => {
    const origBodyBg = document.body.style.backgroundColor;
    const origHtmlBg = document.documentElement.style.backgroundColor;
    document.body.style.backgroundColor = "#f4f7f5";
    document.documentElement.style.backgroundColor = "#f4f7f5";
    return () => {
      document.body.style.backgroundColor = origBodyBg;
      document.documentElement.style.backgroundColor = origHtmlBg;
    };
  }, []);

  useEffect(() => {
    setCurrentUser(initialCurrentUser);
  }, [initialCurrentUser]);

  useEffect(() => {
    setRolePolicy(initialRolePolicy);
  }, [initialRolePolicy]);

  const [sport, setSport] = useState<SportType>("badminton");
  const [date, setDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [items, setItems] = useState(initialBookings);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(false);

  const weekDays = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const d = new Date(date);
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);
      return d;
    });
  }, [date]);

  const weekEndDate = useMemo(() => {
    const end = new Date(date);
    end.setDate(end.getDate() + 7);
    return end;
  }, [date]);
  const [auth, setAuth] = useState<"login" | "register" | "forgot" | "reset" | null>(null);
  const [resetToken, setResetToken] = useState<string | undefined>(undefined);

  // Check URL query parameters for password reset token on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("reset_token");
      if (token) {
        setResetToken(token);
        setAuth("reset");
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, []);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [detail, setDetail] = useState<Booking | null>(null);
  const [deleting, setDeleting] = useState<Booking | null>(null);
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
  const [rescheduleSlot, setRescheduleSlot] = useState<{ courtId: string; date: Date; hour: number } | null>(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");
  const [notice, setNotice] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [categories, setCategories] = useState<AdminReservationCategory[]>(
    initialCategories && initialCategories.length > 0
      ? initialCategories
      : DEFAULT_ADMIN_CATEGORIES
  );

  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      setCategories(initialCategories);
    }
  }, [initialCategories]);

  const [adminBlockType, setAdminBlockType] = useState<string>("Údržba kurtov");
  const [duration, setDuration] = useState(60);
  const [isRecurring, setIsRecurring] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState(4);
  const [frequencyWeeks, setFrequencyWeeks] = useState(1);
  const [repeatFrequency, setRepeatFrequency] = useState<"daily" | "weekly" | "monthly" | "yearly">("weekly");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1]);
  const [untilDate, setUntilDate] = useState("");
  const [seriesOverviewGroupId, setSeriesOverviewGroupId] = useState<string | null>(null);
  const [clientPlayerName, setClientPlayerName] = useState("");
  const [multisportCardsCount, setMultisportCardsCount] = useState<0 | 1 | 2>(0);
  const [walletBalance, setWalletBalance] = useState<number | null>(initialWalletBalance ?? null);
  const [walletHighlight, setWalletHighlight] = useState(false);
  const [topUpLoading, setTopUpLoading] = useState<number | null>(null);

  const canUserMakeRecurring = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === "admin" || currentUser.role === "ntc_team") return true;
    return Boolean(rolePolicy?.canMakeRecurring);
  }, [currentUser, rolePolicy]);

  const reschedDurationMin = useMemo(() => {
    if (!reschedulingBooking) return 60;
    const s = new Date(reschedulingBooking.start).getTime();
    const e = new Date(reschedulingBooking.end).getTime();
    return Math.max(30, Math.round((e - s) / 60000));
  }, [reschedulingBooking]);

  const reschedOriginalPrice = useMemo(() => {
    if (!reschedulingBooking) return 0;
    if (reschedulingBooking.priceEur != null) return Number(reschedulingBooking.priceEur);
    const isRegistered = Boolean(currentUser);
    const roleDiscount = rolePolicy?.discountEurPerHour ?? 0;
    return calculateNtcBookingPrice(
      reschedulingBooking.courtId,
      reschedulingBooking.start,
      reschedDurationMin,
      isRegistered,
      roleDiscount,
      reschedulingBooking.multisportCardsCount || 0,
      activePricelist,
      currentUser?.discountTierId
    ).totalPriceEur;
  }, [reschedulingBooking, reschedDurationMin, currentUser, rolePolicy, activePricelist]);
  const [now, setNow] = useState(() => new Date());
  const [highlightedVoiceBookings, setHighlightedVoiceBookings] = useState<string[]>([]);
  const handledRecurringSoundGroups = useRef(new Set<string>());
  const knownBookingIds = useRef<Set<string>>(new Set(initialBookings.map((b) => b.id)));
  const today = useMemo(() => { const value = new Date(); value.setHours(0, 0, 0, 0); return value; }, []);
  const bookingHorizonDays = rolePolicy?.bookingHorizonDays ?? 14;
  const maxDate = useMemo(() => {
    if (currentUser?.role === "admin" || currentUser?.role === "ntc_team" || rolePolicy?.canMakeRecurring) {
      const value = new Date(today);
      value.setFullYear(value.getFullYear() + 3); // Admin & recurring roles can navigate up to 3 years ahead
      return value;
    }
    const value = new Date(today);
    value.setDate(value.getDate() + bookingHorizonDays);
    value.setHours(23, 59, 59, 999);
    return value;
  }, [today, bookingHorizonDays, currentUser, rolePolicy]);
  const hours = useMemo(() => Array.from({ length: openingHours.endHour - openingHours.startHour }, (_, index) => openingHours.startHour + index), []);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setAdminMenuOpen(false);
      }
    };
    if (userMenuOpen || adminMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen, adminMenuOpen]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => {
      setNotice("");
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // Restore pending slot if user was in booking dialog before top-up
  const restorePendingSlotAfterTopUp = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const savedRaw = sessionStorage.getItem("ntc_pending_booking_after_topup");
      if (savedRaw) {
        sessionStorage.removeItem("ntc_pending_booking_after_topup");
        const saved = JSON.parse(savedRaw);
        if (saved && saved.courtId && saved.date && typeof saved.hour === "number") {
          const parsedDate = new Date(saved.date);
          setTimeout(() => {
            setSlot({
              courtId: saved.courtId,
              date: parsedDate,
              hour: saved.hour,
            });
            if (saved.duration) setDuration(saved.duration);
            if (saved.phone) setPhone(saved.phone);
            if (saved.title) setTitle(saved.title);
          }, 300);
        }
      }
    } catch (e) {
      console.warn("Could not restore slot after top up:", e);
    }
  }, []);

  // Restore pending slot if user just registered or logged in
  useEffect(() => {
    if (typeof window === "undefined" || !currentUser) return;
    try {
      const savedRaw = sessionStorage.getItem("ntc_pending_auth_slot");
      if (savedRaw) {
        sessionStorage.removeItem("ntc_pending_auth_slot");
        const saved = JSON.parse(savedRaw);
        if (saved && saved.courtId && saved.date && typeof saved.hour === "number") {
          const parsedDate = new Date(saved.date);
          setTimeout(() => {
            const start = new Date(parsedDate);
            start.setHours(saved.hour, 0, 0, 0);
            const options = getAvailableDurationOptions(saved.courtId, start);
            setTitle("");
            setPhone(currentUser.phone || "");
            setDuration(options.includes(60) ? 60 : options[0] || 60);
            setMultisportCardsCount(0);
            setNotice("");
            setSlot({
              courtId: saved.courtId,
              date: parsedDate,
              hour: saved.hour,
            });
          }, 200);
        }
      }
    } catch (e) {
      console.warn("Could not restore slot after auth:", e);
    }
  }, [currentUser]);

  // Handle return from payment gateway (CardPay / Stripe)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const walletStatus = params.get("wallet");
    const amount = params.get("amount");
    const sessionId = params.get("session_id");

    if (sessionId) {
      window.history.replaceState({}, "", window.location.pathname);
      reconcileWalletCheckoutAction(sessionId).then((res) => {
        if (res.success) {
          setNotice("Platba cez Stripe bola úspešne pripísaná na váš účet.");
          getWalletAction().then((walletRes) => {
            if (walletRes.success && walletRes.enabled) {
              setWalletBalance(walletRes.balanceEur);
              setWalletHighlight(true);
              setTimeout(() => setWalletHighlight(false), 3500);
              restorePendingSlotAfterTopUp();
            }
          });
        }
      });
    } else if (walletStatus === "success" || walletStatus === "pending") {
      setNotice(
        amount
          ? `Platba cez Tatra banka CardPay (${amount} €) bola úspešne pripísaná na váš účet.`
          : "Platba cez Tatra banka CardPay bola úspešne pripísaná na váš účet."
      );
      window.history.replaceState({}, "", window.location.pathname);

      if (amount) {
        const numAmount = Number(amount);
        if (!isNaN(numAmount) && numAmount > 0) {
          setWalletBalance((prev) => Math.round(((prev ?? 0) + numAmount) * 100) / 100);
        }
      }
      getWalletAction().then((result) => {
        if (result.success && result.enabled && result.balanceEur !== null) {
          setWalletBalance(result.balanceEur);
        }
      });
      setWalletHighlight(true);
      setTimeout(() => setWalletHighlight(false), 3500);
      restorePendingSlotAfterTopUp();

      if (walletStatus === "pending") {
        let attempts = 0;
        const maxAttempts = 10; // 10 * 30s = 5 minút

        const checkPayment = async () => {
          attempts++;
          const res = await reconcileWalletCardPayAction();
          if (res.success && res.successful > 0) {
            clearInterval(interval);
            const walletRes = await getWalletAction();
            if (walletRes.success && walletRes.enabled) {
              setWalletBalance(walletRes.balanceEur);
              restorePendingSlotAfterTopUp();
            }
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
          }
        };

        // Prvá kontrola hneď po načítaní
        checkPayment();
        // Následná kontrola každých 30 sekúnd počas 5 minút
        const interval = setInterval(checkPayment, 30000);
        return () => clearInterval(interval);
      }
    } else if (walletStatus === "failed" || walletStatus === "cancelled") {
      setNotice("Platba bola zrušená alebo zlyhala.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [restorePendingSlotAfterTopUp]);

  const courtColumnWidth = 82;
  const timeColumnMinWidth = 64;
  const rightSpacerWidth = 24;
  const calendarMinWidth = courtColumnWidth + hours.length * timeColumnMinWidth + rightSpacerWidth;
  const calendarColumns = `${courtColumnWidth}px minmax(${hours.length * timeColumnMinWidth}px, 1fr) ${rightSpacerWidth}px`;
  const timeColumns = `repeat(${hours.length}, minmax(${timeColumnMinWidth}px, 1fr))`;

  useEffect(() => {
    let active = true;
    if (!currentUser || currentUser.role === "admin") {
      if (!currentUser) setWalletBalance(null);
      return;
    }

    // Always fetch fresh balance on mount
    getWalletAction().then((result) => {
      if (active && result.success && result.enabled) {
        setWalletBalance(result.balanceEur);
      }
    });

    // Check for any pending CardPay payments and poll until settled
    const checkAndPollPending = async () => {
      const cardPayResult = await reconcileWalletCardPayAction();
      if (!active) return;
      if (cardPayResult.success && cardPayResult.successful > 0) {
        const walletRes = await getWalletAction();
        if (active && walletRes.success && walletRes.enabled) {
          setWalletBalance(walletRes.balanceEur);
          setWalletHighlight(true);
          setTimeout(() => setWalletHighlight(false), 3500);
        }
      }
      if (active && cardPayResult.success && cardPayResult.pending > 0) {
        for (let attempt = 0; attempt < 30 && active; attempt++) {
          await new Promise((r) => setTimeout(r, 2500));
          if (!active) return;
          const nextRes = await reconcileWalletCardPayAction();
          if (!active) return;
          if (nextRes.success && nextRes.successful > 0) {
            const walletRes = await getWalletAction();
            if (active && walletRes.success && walletRes.enabled) {
              setWalletBalance(walletRes.balanceEur);
              setWalletHighlight(true);
              setTimeout(() => setWalletHighlight(false), 3500);
            }
            return;
          }
          if (nextRes.success && nextRes.failed > 0 && nextRes.pending === 0) return;
        }
      }
    };
    checkAndPollPending();

    return () => { active = false; };
  }, [currentUser]);

  useEffect(() => {
    let active = true;
    async function load() {
      // Prefetch a window around `date` (-14 to +28 days) so navigating days/weeks is INSTANT!
      const start = new Date(date);
      start.setDate(start.getDate() - 14);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setDate(end.getDate() + 28);
      end.setHours(23, 59, 59, 999);

      const result = await fetchBookingsAction(start.toISOString(), end.toISOString());
      if (active && result.success && result.bookings) {
        const fetched = result.bookings as Booking[];
        for (const b of fetched) {
          knownBookingIds.current.add(b.id);
        }
        setItems((prev) => {
          const freshMap = new Map(prev.map((b) => [b.id, b]));
          for (const b of fetched) {
            freshMap.set(b.id, b);
          }
          return Array.from(freshMap.values());
        });
      }
      if (active) setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [date, reload]);

  useEffect(() => {
    const timers = voiceHighlightTimers.current;

    // 1. Supabase Realtime WebSocket listener (instant 0ms response when event arrives)
    const channel = supabase.channel("newbookings-realtime").on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, (payload) => {
      if (currentUser && currentUser.role !== "admin") {
        getWalletAction().then((res) => {
          if (res.success && res.enabled) {
            setWalletBalance(res.balanceEur);
          }
        });
      }

      if (payload.eventType === "INSERT") {
        const raw = payload.new as any;
        if (!raw?.id) return;

        const bookingId = raw.id;
        const alreadyKnown = knownBookingIds.current.has(bookingId);
        knownBookingIds.current.add(bookingId);

        let notesObj: any = {};
        try {
          notesObj = typeof raw.notes === "string" ? JSON.parse(raw.notes) : (raw.notes || {});
        } catch { }

        const resolvedCourtId = notesObj.courtId || raw.court_id || raw.courtId || "badminton-1";
        const mappedBooking: Booking = {
          id: raw.id,
          courtId: resolvedCourtId,
          title: notesObj.notes || raw.customer_name || "Rezervácia",
          customerName: raw.customer_name || "Rezervácia",
          phone: raw.customer_phone || undefined,
          start: raw.start_at,
          end: raw.end_at,
          status: (raw.status || "confirmed") as any,
          source: (notesObj.source || "voice-assistant") as any,
          user_id: raw.user_id || undefined,
          userRole: "user",
        };

        setItems((current) => {
          const filtered = current.filter((b) => b.id !== mappedBooking.id);
          return [...filtered, mappedBooking];
        });

        // If booking was already handled by our own submit action, skip sound and re-animation
        if (alreadyKnown) return;

        const recurringId = notesObj.recurringGroupId;
        if (recurringId) {
          if (!handledRecurringSoundGroups.current.has(recurringId)) {
            handledRecurringSoundGroups.current.add(recurringId);
            playTennisHitSound();
          }
        } else {
          playTennisHitSound();
        }

        // Only animate if this booking falls on the currently viewed date / week
        const bStart = new Date(raw.start_at);
        const bKey = dateKey(bStart);
        const isVisibleNow = viewMode === "week"
          ? bKey >= dateKey(date) && bKey <= dateKey(weekEndDate)
          : bKey === dateKey(date);

        if (isVisibleNow) {
          setHighlightedVoiceBookings((current) => current.includes(bookingId) ? current : [...current, bookingId]);
          const existingTimer = timers.get(bookingId);
          if (existingTimer) window.clearTimeout(existingTimer);
          const timer = window.setTimeout(() => {
            setHighlightedVoiceBookings((current) => current.filter((id) => id !== bookingId));
            timers.delete(bookingId);
          }, 4500);
          timers.set(bookingId, timer);
        }
      } else if (payload.eventType === "DELETE") {
        const oldId = (payload.old as any)?.id;
        if (oldId) {
          setItems((current) => current.filter((b) => b.id !== oldId));
        }
      } else if (payload.eventType === "UPDATE") {
        const updated = payload.new as any;
        if (updated?.id) {
          if (updated.status === "cancelled") {
            setItems((current) => current.filter((b) => b.id !== updated.id));
          } else {
            setItems((current) => current.map((b) => b.id === updated.id ? { ...b, status: updated.status } : b));
          }
        }
      }
    }).subscribe();

    const walletChannel = supabase.channel("wallets-realtime").on("postgres_changes", { event: "*", schema: "public", table: "wallets" }, (payload) => {
      if (currentUser && currentUser.role !== "admin") {
        const raw = payload.new as any;
        if (raw?.user_id === currentUser.id && raw?.balance_eur !== undefined) {
          setWalletBalance(Number(raw.balance_eur));
          setWalletHighlight(true);
          setTimeout(() => setWalletHighlight(false), 3500);
        }
      }
    }).subscribe();

    // 2. Background Polling from Google Cloud SQL every 3.5s
    // Ensures real-time updates even when database writes bypass Supabase websockets
    const pollInterval = window.setInterval(async () => {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      if (viewMode === "week") {
        end.setDate(end.getDate() + 7);
      }
      end.setHours(23, 59, 59, 999);
      const result = await fetchBookingsAction(start.toISOString(), end.toISOString());
      if (!result.success || !result.bookings) return;

      const freshBookings = result.bookings as Booking[];
      setItems((prevItems) => {
        const newArrivals = freshBookings.filter(
          (fb) => !knownBookingIds.current.has(fb.id) && fb.status !== "cancelled"
        );

        for (const fb of freshBookings) {
          knownBookingIds.current.add(fb.id);
        }

        if (newArrivals.length > 0) {
          const unplayedArrivals = newArrivals.filter((b) => {
            if (b.recurringGroupId) {
              if (handledRecurringSoundGroups.current.has(b.recurringGroupId)) return false;
              handledRecurringSoundGroups.current.add(b.recurringGroupId);
            }
            return true;
          });
          if (unplayedArrivals.length > 0) {
            playTennisHitSound();
          }
          for (const nb of newArrivals) {
            const bookingId = nb.id;
            const bKey = dateKey(new Date(nb.start));
            const isVisibleNow = viewMode === "week"
              ? bKey >= dateKey(date) && bKey <= dateKey(weekEndDate)
              : bKey === dateKey(date);

            if (isVisibleNow) {
              setHighlightedVoiceBookings((current) => current.includes(bookingId) ? current : [...current, bookingId]);
              const existingTimer = timers.get(bookingId);
              if (existingTimer) window.clearTimeout(existingTimer);
              const timer = window.setTimeout(() => {
                setHighlightedVoiceBookings((current) => current.filter((id) => id !== bookingId));
                timers.delete(bookingId);
              }, 4500);
              timers.set(bookingId, timer);
            }
          }
        }
        const freshMap = new Map(prevItems.map((b) => [b.id, b]));
        for (const fb of freshBookings) {
          freshMap.set(fb.id, fb);
        }
        return Array.from(freshMap.values());
      });

      if (currentUser && currentUser.role !== "admin") {
        getWalletAction().then((wRes) => {
          if (wRes.success && wRes.enabled && wRes.balanceEur !== undefined) {
            setWalletBalance(wRes.balanceEur);
          }
        });
      }
    }, 3500);

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(walletChannel);
      window.clearInterval(pollInterval);
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      setHighlightedVoiceBookings([]);
    };
  }, [currentUser, date, viewMode]);


  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const getVisibleCourtsForDay = useCallback((dayDate: Date) => {
    let result = courts.filter((court) => court.sport === sport);
    if (sport === "tennis-clay" && [0, 6].includes(dayDate.getDay())) {
      result = result.filter((court) => ["tennis-clay-1", "tennis-clay-2"].includes(court.id));
    }
    return result;
  }, [courts, sport]);

  const visibleCourts = useMemo(() => getVisibleCourtsForDay(date), [getVisibleCourtsForDay, date]);

  const getBookingsForDay = useCallback(
    (targetDate: Date) => {
      const targetKey = dateKey(targetDate);
      return items.filter(
        (booking) =>
          booking.status !== "cancelled" &&
          dateKey(new Date(booking.start)) === targetKey &&
          courts.find((court) => court.id === booking.courtId)?.sport === sport
      );
    },
    [items, courts, sport]
  );

  const bookings = useMemo(() => getBookingsForDay(date), [getBookingsForDay, date]);
  const isToday = dateKey(date) === dateKey(now);
  const currentTimePercent = useMemo(() => {
    const elapsedMinutes = (now.getHours() - openingHours.startHour) * 60 + now.getMinutes();
    const totalMinutes = (openingHours.endHour - openingHours.startHour) * 60;
    return Math.max(0, Math.min(100, elapsedMinutes / totalMinutes * 100));
  }, [now]);
  const pastPercent = useMemo(() => {
    if (!isToday) {
      return dateKey(date) < dateKey(now) ? 100 : 0;
    }
    const elapsedHours = Math.max(
      0,
      Math.min(
        openingHours.endHour - openingHours.startHour,
        now.getHours() + 1 - openingHours.startHour
      )
    );
    const totalHours = openingHours.endHour - openingHours.startHour;
    return (elapsedHours / totalHours) * 100;
  }, [now, isToday, date]);
  const currentTimeLabel = new Intl.DateTimeFormat("sk-SK", { hour: "2-digit", minute: "2-digit" }).format(now);

  const calendarScrollRef = useRef<HTMLDivElement>(null);
  const floatingHeaderScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScrollRef = useRef<"calendar" | "floating" | null>(null);
  const [showFloatingHeader, setShowFloatingHeader] = useState(false);
  const timeGridRef = useRef<HTMLDivElement>(null);
  const initialScrollDoneRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      const el = calendarScrollRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const shouldShow = rect.top < -30 && rect.bottom > 130;
      setShowFloatingHeader(shouldShow);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const scrollToCurrentTime = useCallback((smooth = false) => {
    const container = calendarScrollRef.current;
    const timeGrid = timeGridRef.current;
    if (!container || !timeGrid) return;

    const currentNow = new Date();
    const elapsedMinutes = (currentNow.getHours() - openingHours.startHour) * 60 + currentNow.getMinutes();
    const totalMinutes = (openingHours.endHour - openingHours.startHour) * 60;
    const percent = Math.max(0, Math.min(100, (elapsedMinutes / totalMinutes) * 100));

    if (percent > 0) {
      const timeGridWidth = timeGrid.offsetWidth || (hours.length * timeColumnMinWidth);
      const lineLeftPx = timeGridWidth * (percent / 100);
      const targetScroll = Math.max(0, lineLeftPx - 6);

      if (smooth) {
        container.scrollTo({ left: targetScroll, behavior: "smooth" });
        if (floatingHeaderScrollRef.current) {
          floatingHeaderScrollRef.current.scrollTo({ left: targetScroll, behavior: "smooth" });
        }
      } else {
        container.scrollLeft = targetScroll;
        if (floatingHeaderScrollRef.current) {
          floatingHeaderScrollRef.current.scrollLeft = targetScroll;
        }
      }
    }
  }, [hours.length, timeColumnMinWidth]);

  // Vykoná sa IBA JEDENKRÁT pri prvom načítaní/otvorení stránky kalendára
  useEffect(() => {
    if (initialScrollDoneRef.current) return;
    initialScrollDoneRef.current = true;

    scrollToCurrentTime(false);
    const t1 = window.setTimeout(() => scrollToCurrentTime(false), 80);
    const t2 = window.setTimeout(() => scrollToCurrentTime(false), 300);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [scrollToCurrentTime]);

  const moveDate = (days: number) => {
    const next = new Date(date); next.setDate(next.getDate() + days); next.setHours(0, 0, 0, 0);
    if (next < today && currentUser?.role !== "admin") return;
    if (next > maxDate) return setNotice(`Rezervácie sú pre vašu rolu možné maximálne ${bookingHorizonDays} dní vopred.`);
    setDate(next);
  };
  const selectDate = (value: string) => {
    if (!value) return;
    const selected = new Date(`${value}T12:00:00`);
    if (selected < today || selected > maxDate) return setNotice(`Vyberte dátum od dnešného dňa, maximálne ${bookingHorizonDays} dní vopred.`);
    setDate(selected);
    setDatePickerOpen(false);
  };

  const getAvailableDurationOptions = (courtId: string, start: Date) => {
    if (currentUser?.role !== "admin" && rolePolicy && !rolePolicy.isActive) return [];
    const startDayKey = dateKey(start);
    const dayBookings = items.filter(
      (booking) =>
        booking.status !== "cancelled" &&
        dateKey(new Date(booking.start)) === startDayKey &&
        courts.find((court) => court.id === booking.courtId)?.sport === sport
    );
    const courtBookings = dayBookings.filter((booking) => booking.courtId === courtId);
    if (courtBookings.some((booking) => new Date(booking.start) <= start && new Date(booking.end) > start)) return [];
    const nextBooking = courtBookings
      .filter((booking) => new Date(booking.start) >= start)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];
    const minutesUntilNextBooking = nextBooking
      ? Math.floor((new Date(nextBooking.start).getTime() - start.getTime()) / 60000)
      : Number.POSITIVE_INFINITY;
    const maxAllowed = rolePolicy?.maxBookingDurationMinutes ?? (currentUser?.role === "admin" ? 720 : 120);
    const availableMinutes = Math.min(
      maxAllowed,
      getCourtOperatingLimitMinutes(courtId, start),
      minutesUntilNextBooking
    );
    return getDurationOptions(availableMinutes);
  };

  const handleAuthSuccess = (user?: BookingUser) => {
    setAuth(null);
    if (user) {
      setCurrentUser(user);
      if (!rolePolicy) {
        setRolePolicy({
          role: user.role || "user",
          maxBookingDurationMinutes: 120,
          bookingHorizonDays: 14,
          discountEurPerHour: 0,
          cancellationDeadlineHours: 24,
          isActive: true,
        });
      }
      getWalletAction().then((res) => {
        if (res.success && typeof res.balanceEur === "number") {
          setWalletBalance(res.balanceEur);
        } else {
          setWalletBalance(0);
        }
      });

      let targetSlot = pendingSlot;
      if (!targetSlot && typeof window !== "undefined") {
        try {
          const savedRaw = sessionStorage.getItem("ntc_pending_auth_slot");
          if (savedRaw) {
            const saved = JSON.parse(savedRaw);
            if (saved && saved.courtId && saved.date && typeof saved.hour === "number") {
              targetSlot = {
                courtId: saved.courtId,
                date: new Date(saved.date),
                hour: saved.hour,
              };
            }
          }
        } catch (e) {
          console.warn("Could not restore pending auth slot:", e);
        }
      }

      if (typeof window !== "undefined") {
        sessionStorage.removeItem("ntc_pending_auth_slot");
      }
      setPendingSlot(null);

      if (targetSlot) {
        setTimeout(() => {
          const start = new Date(targetSlot.date);
          start.setHours(targetSlot.hour, 0, 0, 0);
          const options = getAvailableDurationOptions(targetSlot.courtId, start);
          setTitle("");
          setPhone(user.phone || "");
          setDuration(options.includes(60) ? 60 : options[0] || 60);
          setMultisportCardsCount(0);
          setNotice("");
          setSlot(targetSlot);
        }, 150);
        return;
      }
      router.refresh();
    } else {
      router.refresh();
    }
  };

  const openSlot = (courtId: string, hour: number, targetDate: Date = date) => {
    if (reschedulingBooking) {
      const status = getRescheduleSlotStatus(courtId, hour, targetDate);
      if (!status || !status.eligible) {
        if (status?.reason === "price_mismatch") {
          setNotice(`Tento termín má inú cenu (${status.targetPrice?.toFixed(2)} €). Vyberte termín s rovnakou cenou ${reschedOriginalPrice.toFixed(2)} €.`);
        } else if (status?.reason === "occupied") {
          setNotice("Tento termín je už obsadený.");
        } else if (status?.reason === "past") {
          setNotice("Termín v minulosti nie je možné vybrať.");
        } else if (status?.reason === "current") {
          setNotice("Toto je váš pôvodný termín rezervácie.");
        } else {
          setNotice("Tento termín nie je k dispozícii pre presun.");
        }
        return;
      }
      setRescheduleSlot({ courtId, date: new Date(targetDate), hour });
      setRescheduleError("");
      return;
    }
    if (!currentUser) {
      const pending = { courtId, date: new Date(targetDate), hour };
      setPendingSlot(pending);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(
            "ntc_pending_auth_slot",
            JSON.stringify({
              courtId,
              date: targetDate instanceof Date ? targetDate.toISOString() : new Date(targetDate).toISOString(),
              hour,
            })
          );
        } catch (e) {
          console.warn("Could not save pending auth slot:", e);
        }
      }
      return setAuth("register");
    }
    const startIso = createBratislavaIso(targetDate, hour, 0);
    const start = new Date(startIso);
    setIsRecurring(false);
    setRepeatWeeks(4);
    setFrequencyWeeks(1);
    setDaysOfWeek([start.getDay()]);
    const defaultUntil = new Date(start);
    defaultUntil.setMonth(defaultUntil.getMonth() + 3);
    setUntilDate(defaultUntil.toISOString().slice(0, 10));
    setClientPlayerName("");
    if (currentUser.role !== "admin") {
      if (rolePolicy && !rolePolicy.isActive) return setNotice("Rezervácie sú pre vašu rolu momentálne deaktivované.");
      if (start < now) return setNotice("Rezerváciu v minulosti nie je možné vytvoriť.");
      const options = getAvailableDurationOptions(courtId, start);
      if (!options.length) return setNotice("Do najbližšej rezervácie alebo konca prevádzky nie je voľných aspoň 30 minút.");
      setTitle(""); setPhone(currentUser.phone || ""); setDuration(options.includes(60) ? 60 : options[0]); setMultisportCardsCount(0); setNotice(""); setSlot({ courtId, date: new Date(targetDate), hour });
    } else {
      const options = getAvailableDurationOptions(courtId, start);
      const defaultDuration = options.length > 0 ? (options.includes(60) ? 60 : options[0]) : 60;
      setAdminBlockType("Údržba kurtov");
      setTitle("");
      setPhone("");
      setDuration(defaultDuration);
      setMultisportCardsCount(0);
      setNotice("");
      setSlot({ courtId, date: new Date(targetDate), hour });
    }
  };
  const hasConflict = (courtId: string, start: Date, end: Date) => items.some((booking) => booking.status !== "cancelled" && booking.courtId === courtId && start < new Date(booking.end) && end > new Date(booking.start));

  const getRescheduleSlotStatus = useCallback((courtId: string, hour: number, targetDate: Date = date) => {
    if (!reschedulingBooking) return null;
    const targetIsToday = dateKey(targetDate) === dateKey(now);
    const isPast = targetIsToday ? hour <= now.getHours() : dateKey(targetDate) < dateKey(now);
    if (isPast) return { eligible: false, reason: "past" as const };

    const startIso = createBratislavaIso(targetDate, hour, 0);
    const start = new Date(startIso);
    const end = new Date(start.getTime() + reschedDurationMin * 60000);

    // Check if it's the current slot of the booking itself
    if (courtId === reschedulingBooking.courtId && start.getTime() === new Date(reschedulingBooking.start).getTime()) {
      return { eligible: false, reason: "current" as const };
    }

    // Check operating limit / blocked label
    const label = blockedLabel(courtId, sport, hour);
    if (label) return { eligible: false, reason: "blocked" as const };

    // Check conflicts (ignoring the booking being rescheduled itself)
    const targetDayKey = dateKey(targetDate);
    const conflict = items.some(
      (b) => b.status !== "cancelled" && b.id !== reschedulingBooking.id && b.courtId === courtId && dateKey(new Date(b.start)) === targetDayKey && start < new Date(b.end) && end > new Date(b.start)
    );
    if (conflict) return { eligible: false, reason: "occupied" as const };

    // Check operating limits of court
    const courtLimit = getCourtOperatingLimitMinutes(courtId, start);
    if (courtLimit < reschedDurationMin) return { eligible: false, reason: "closed" as const };

    if (currentUser?.role !== "admin") {
      const isRegistered = Boolean(currentUser);
      const roleDiscount = rolePolicy?.discountEurPerHour ?? 0;
      const calc = calculateNtcBookingPrice(
        courtId,
        start.toISOString(),
        reschedDurationMin,
        isRegistered,
        roleDiscount,
        reschedulingBooking.multisportCardsCount || 0,
        activePricelist,
        currentUser?.discountTierId
      );
      if (Math.abs(calc.totalPriceEur - reschedOriginalPrice) > 0.05) {
        return { eligible: false, reason: "price_mismatch" as const, targetPrice: calc.totalPriceEur };
      }
    }

    return { eligible: true };
  }, [reschedulingBooking, now, date, reschedDurationMin, blockedLabel, sport, items, currentUser, rolePolicy, reschedOriginalPrice, activePricelist]);

  const handleConfirmReschedule = async () => {
    if (!reschedulingBooking || !rescheduleSlot) return;
    setRescheduleLoading(true);
    setRescheduleError("");

    const startIso = createBratislavaIso(rescheduleSlot.date, rescheduleSlot.hour, 0);
    const start = new Date(startIso);
    const end = new Date(start.getTime() + reschedDurationMin * 60000);
    const endIso = end.toISOString();

    const res = await rescheduleBookingAction({
      bookingId: reschedulingBooking.id,
      newCourtId: rescheduleSlot.courtId,
      newStart: startIso,
      newEnd: endIso,
    });

    setRescheduleLoading(false);
    if (!res.success) {
      setRescheduleError(res.error || "Presun rezervácie sa nepodaril.");
      return;
    }

    setItems((prev) =>
      prev.map((b) =>
        b.id === reschedulingBooking.id
          ? {
            ...b,
            courtId: rescheduleSlot.courtId,
            start: start.toISOString(),
            end: end.toISOString(),
            isRescheduled: true,
          }
          : b
      )
    );

    playTennisHitSound();
    const reschedId = reschedulingBooking.id;
    const timers = voiceHighlightTimers.current;
    setHighlightedVoiceBookings((curr) => curr.includes(reschedId) ? curr : [...curr, reschedId]);
    const existingTimer = timers.get(reschedId);
    if (existingTimer) window.clearTimeout(existingTimer);
    const highlightTimer = window.setTimeout(() => {
      setHighlightedVoiceBookings((curr) => curr.filter((id) => id !== reschedId));
      timers.delete(reschedId);
    }, 4500);
    timers.set(reschedId, highlightTimer);

    setNotice("Rezervácia bola úspešne presunutá na nový termín.");
    setRescheduleSlot(null);
    setReschedulingBooking(null);
    setRescheduleError("");
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!slot || !currentUser) return;
    const validation = clayError(slot.courtId, sport, slot.hour, duration); if (validation) return setNotice(validation);
    const startIso = createBratislavaIso(slot.date, slot.hour, 0);
    const start = new Date(startIso);
    const end = new Date(start.getTime() + duration * 60000);
    const endIso = end.toISOString();
    if (hasConflict(slot.courtId, start, end)) return setNotice("Vybraný kurt je v tomto čase obsadený.");

    setLoading(true);
    const effectiveBlockType = adminBlockType || "Údržba kurtov";
    const isMaintenanceBlock = currentUser.role === "admin" && effectiveBlockType === "Údržba kurtov";
    const customNote = title.trim();
    const effectivePlayerName = isMaintenanceBlock ? "" : clientPlayerName.trim();

    if (isRecurring && canUserMakeRecurring) {
      const result = await createRecurringBookingAction({
        courtId: slot.courtId,
        title: customNote || (currentUser.role === "admin" ? effectiveBlockType : (sports.find((item) => item.id === sport)?.label || "Rezervácia")),
        customerName: effectivePlayerName || (currentUser.role === "admin" ? effectiveBlockType : currentUser.name),
        phone: phone || undefined,
        start: startIso,
        end: endIso,
        repeatFrequency,
        frequencyWeeks,
        daysOfWeek,
        untilDate: untilDate || undefined,
        repeatWeeks,
        adminBlockType: currentUser.role === "admin" ? effectiveBlockType : undefined,
        clientPlayerName: effectivePlayerName || undefined,
      });

      setLoading(false);
      if (!result.success || !result.bookings?.length) {
        return setNotice(result.error || "Opakovanú rezerváciu sa nepodarilo vytvoriť.");
      }

      const newBookings = result.bookings as Booking[];
      for (const nb of newBookings) {
        knownBookingIds.current.add(nb.id);
      }
      setItems((current) => [...current, ...newBookings]);
      setSlot(null);
      setIsRecurring(false);
      setRepeatFrequency("weekly");
      setClientPlayerName("");

      const createdGroupId = newBookings[0]?.recurringGroupId;
      if (createdGroupId) {
        handledRecurringSoundGroups.current.add(createdGroupId);
        setSeriesOverviewGroupId(createdGroupId);
      }

      playTennisHitSound();

      // Trigger magnify-drop animation ONLY on the booking visible on the current screen
      const visibleBooking = newBookings.find((b) => {
        const bKey = dateKey(new Date(b.start));
        if (viewMode === "week") {
          return bKey >= dateKey(date) && bKey <= dateKey(weekEndDate);
        }
        return bKey === dateKey(date);
      }) || newBookings[0];

      if (visibleBooking) {
        const vId = visibleBooking.id;
        const timers = voiceHighlightTimers.current;
        setHighlightedVoiceBookings((current) => current.includes(vId) ? current : [...current, vId]);
        const existingTimer = timers.get(vId);
        if (existingTimer) window.clearTimeout(existingTimer);
        const timer = window.setTimeout(() => {
          setHighlightedVoiceBookings((current) => current.filter((id) => id !== vId));
          timers.delete(vId);
        }, 4500);
        timers.set(vId, timer);
      }

      if (result.skippedDates && result.skippedDates.length > 0) {
        setNotice(
          `Vytvorených ${result.createdCount} z ${result.totalRequested} rezervácií. Preskočené termíny kvôli obsadenosti: ${result.skippedDates.join(", ")}.`
        );
      } else {
        setNotice(`Úspešne vytvorená opakovaná séria (${result.createdCount} termínov).`);
      }
      return;
    }

    const result = await createBookingAction({
      courtId: slot.courtId,
      title: currentUser.role === "admin"
        ? (customNote || effectiveBlockType)
        : (customNote || (sports.find((item) => item.id === sport)?.label || "Rezervácia")),
      customerName: effectivePlayerName || (currentUser.role === "admin" ? effectiveBlockType : currentUser.name),
      phone: phone || undefined,
      start: startIso,
      end: endIso,
      status: currentUser.role === "admin" ? "blocked" : "confirmed",
      source: currentUser.role === "admin" ? "admin" : "web",
      operationId: crypto.randomUUID(),
      multisportCardsCount,
      adminBlockType: currentUser.role === "admin" ? effectiveBlockType : undefined,
      clientPlayerName: effectivePlayerName || undefined,
    });
    setLoading(false);
    if (!result.success || !result.booking) return setNotice(result.error || "Rezerváciu sa nepodarilo vytvoriť.");
    if (result.wallet && currentUser.role !== "admin") setWalletBalance(result.wallet.balanceEur);
    const newBooking = {
      ...result.booking,
      adminBlockType: currentUser.role === "admin" ? effectiveBlockType : undefined,
      clientPlayerName: effectivePlayerName || undefined,
    } as Booking;
    knownBookingIds.current.add(newBooking.id);
    playTennisHitSound();
    setItems((current) => [...current, newBooking]);
    // Trigger highlight animation on the new booking box for 3 seconds
    const newId = newBooking.id;
    const timers = voiceHighlightTimers.current;
    setHighlightedVoiceBookings((current) => current.includes(newId) ? current : [...current, newId]);
    const existingTimer = timers.get(newId);
    if (existingTimer) window.clearTimeout(existingTimer);
    const highlightTimer = window.setTimeout(() => {
      setHighlightedVoiceBookings((current) => current.filter((id) => id !== newId));
      timers.delete(newId);
    }, 4500);
    timers.set(newId, highlightTimer);
    setSlot(null);
    setIsRecurring(false);
    setClientPlayerName("");
    setNotice(
      result.wallet && result.wallet.chargedEur > 0
        ? `Rezervácia bola vytvorená. Odpočítané: ${result.wallet.chargedEur.toFixed(2)} €.`
        : (multisportCardsCount === 2
          ? "Rezervácia bola úspešne vytvorená so 100% zľavou (2x MultiSport karta zdarma)."
          : (currentUser.role === "admin" ? `Kurt bol úspešne zablokovaný (${effectiveBlockType}).` : "Rezervácia bola úspešne vytvorená."))
    );
  };

  const remove = async (deleteEntireSeries = false) => {
    if (!deleting) return;
    setLoading(true);
    const result = await deleteBookingAction(deleting.id, deleteEntireSeries);
    setLoading(false);
    if (!result.success) {
      setDeleting(null);
      return setNotice(result.error || "Rezerváciu sa nepodarilo zrušiť.");
    }
    if (result.wallet && currentUser?.id === deleting.user_id) {
      setWalletBalance(result.wallet.balanceEur);
    }
    if (deleteEntireSeries && deleting.recurringGroupId) {
      const fromMs = new Date(deleting.start).getTime();
      setItems((current) =>
        current.filter((b) => !(b.recurringGroupId === deleting.recurringGroupId && new Date(b.start).getTime() >= fromMs))
      );
    } else {
      setItems((current) => current.filter((booking) => booking.id !== deleting.id));
    }
    setDeleting(null);
    setDetail(null);
    if (deleteEntireSeries) {
      setNotice(`Celá séria (${result.deletedCount || 1} termínov) bola úspešne zrušená.`);
    } else if (result.wallet && result.wallet.refunded) {
      const isSelf = currentUser?.id === deleting.user_id;
      setNotice(
        isSelf
          ? `Rezervácia bola zrušená. Vrátené do peňaženky: ${result.wallet.refundedEur.toFixed(2)} €.`
          : `Rezervácia bola zrušená. Zákazníkovi (${deleting.customerName || "používateľ"}) bol vrátený kredit: ${result.wallet.refundedEur.toFixed(2)} €.`
      );
    } else {
      setNotice("Rezervácia bola zrušená.");
    }
  };
  const startTopUp = async (amountEur: number, provider: "stripe" | "cardpay") => {
    setTopUpLoading(amountEur);
    setNotice("");
    if (slot && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          "ntc_pending_booking_after_topup",
          JSON.stringify({
            courtId: slot.courtId,
            date: slot.date instanceof Date ? slot.date.toISOString() : new Date(slot.date).toISOString(),
            hour: slot.hour,
            duration,
            phone,
            title,
          })
        );
      } catch (e) {
        console.warn("Could not save pending booking slot:", e);
      }
    }
    const operationId = crypto.randomUUID();
    const result = provider === "cardpay"
      ? await createWalletCardPayAction(amountEur, operationId)
      : await createWalletCheckoutAction(amountEur, operationId);
    if (!result.success || !result.url) {
      setTopUpLoading(null);
      setNotice(result.error || "Platobnú stránku sa nepodarilo otvoriť.");
      return;
    }
    window.location.replace(result.url);
  };

  const getBratislavaMinutes = (dateStr: string) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Bratislava",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    }).formatToParts(new Date(dateStr));
    const h = Number(parts.find((p) => p.type === "hour")?.value || 0);
    const m = Number(parts.find((p) => p.type === "minute")?.value || 0);
    return h * 60 + m;
  };

  const position = (booking: Booking) => {
    const startM = getBratislavaMinutes(booking.start);
    const endM = getBratislavaMinutes(booking.end);
    const total = (openingHours.endHour - openingHours.startHour) * 60;
    const offset = startM - openingHours.startHour * 60;
    const duration = Math.max(0, endM - startM);
    return { left: `${(offset / total) * 100}%`, width: `${(duration / total) * 100}%` };
  };

  const renderDaySection = (dayDate: Date, isFirstDay: boolean, showDayHeader: boolean) => {
    const dayIsToday = dateKey(dayDate) === dateKey(now);
    const dayBookings = getBookingsForDay(dayDate);
    const dayCourts = getVisibleCourtsForDay(dayDate);
    const dayPastPercent = !dayIsToday
      ? (dateKey(dayDate) < dateKey(now) ? 100 : 0)
      : Math.max(
          0,
          Math.min(
            100,
            ((now.getHours() + 1 - openingHours.startHour) / (openingHours.endHour - openingHours.startHour)) * 100
          )
        );

    return (
      <div key={dateKey(dayDate)} className="w-full">
        {showDayHeader && (
          <div className="border-y-2 border-slate-300 bg-gradient-to-r from-slate-800 via-slate-850 to-slate-900 shadow-xs">
            <div className="sticky left-0 z-30 flex items-center justify-between px-3 sm:px-4 py-2 text-white w-fit min-w-[280px] max-w-full">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <CalendarDays className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-xs sm:text-sm font-bold capitalize tracking-wide whitespace-nowrap">
                  {new Intl.DateTimeFormat("sk-SK", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(dayDate)}
                </span>
                {dayIsToday && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-300 border border-emerald-500/40 whitespace-nowrap">
                    Dnes
                  </span>
                )}
              </div>
              <span className="ml-4 text-[11px] font-semibold text-slate-300 whitespace-nowrap">
                {dayBookings.length} {dayBookings.length === 1 ? "rezervácia" : (dayBookings.length >= 2 && dayBookings.length <= 4 ? "rezervácie" : "rezervácií")}
              </span>
            </div>
          </div>
        )}

        <div className="grid border-b border-slate-200 bg-slate-50/80" style={{ gridTemplateColumns: calendarColumns }}>
          <div className="sticky left-0 z-20 flex flex-col items-center justify-center text-center border-r border-slate-200 bg-slate-50 px-1 py-1.5 shadow-[2px_0_6px_rgba(15,23,42,0.03)] select-none">
            <b className="text-[10px] sm:text-[11px] font-extrabold tracking-wide text-slate-600 uppercase leading-tight">
              KURT
            </b>
            <span className="mt-0.5 rounded px-1.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold text-emerald-800 bg-emerald-100/90 border border-emerald-300/70 leading-tight whitespace-nowrap shadow-2xs">
              {(() => {
                const parts = new Intl.DateTimeFormat("sk-SK", { weekday: "short", day: "numeric", month: "numeric" }).formatToParts(dayDate);
                const wdRaw = parts.find((p) => p.type === "weekday")?.value || "";
                const wd = wdRaw.charAt(0).toUpperCase() + wdRaw.slice(1);
                const d = parts.find((p) => p.type === "day")?.value || "";
                const m = parts.find((p) => p.type === "month")?.value || "";
                return `${wd} ${d}.${m}.`;
              })()}
            </span>
          </div>
          <div ref={isFirstDay ? timeGridRef : undefined} className="relative grid" style={{ gridTemplateColumns: timeColumns }}>
            {hours.map((hour) => (
              <div key={hour} className="py-3.5 text-center text-xs font-bold text-slate-500 tracking-wide">
                {hour}:00
              </div>
            ))}
            {dayIsToday && currentTimePercent > 0 && currentTimePercent < 100 && (
              <div className="pointer-events-none absolute inset-y-0 z-20 border-l-2 border-dashed border-[#84CC16]" style={{ left: `${currentTimePercent}%` }} />
            )}
          </div>
          <div className="bg-slate-50/50" aria-hidden="true" />
        </div>

        {dayCourts.map((court) => {
          const courtHasHighlight = dayBookings.some(
            (b) => b.courtId === court.id && highlightedVoiceBookings.includes(b.id)
          );
          return (
            <div key={court.id} className={`grid border-b border-slate-100 py-1 ${courtHasHighlight ? "relative z-30" : ""}`} style={{ gridTemplateColumns: calendarColumns }}>
              <div className="sticky left-0 z-20 flex min-h-20 flex-col items-center justify-center text-center border-r border-slate-200 bg-white/95 px-1.5 shadow-[3px_0_10px_rgba(15,23,42,0.03)] backdrop-blur-xs">
                <b className="w-full text-center text-slate-900 font-bold text-[11px] sm:text-[11.5px] leading-tight tracking-tight whitespace-nowrap">{court.name}</b>
                <small className="mt-0.5 w-full text-center text-[9.5px] sm:text-[10px] text-slate-500 font-medium leading-tight tracking-tight whitespace-nowrap">{court.surface.replace(" Court", "")}</small>
              </div>
              <div className="relative grid" style={{ gridTemplateColumns: timeColumns }}>
                {hours.map((hour) => {
                  const label = blockedLabel(court.id, sport, hour);
                  const isPast = dayIsToday
                    ? hour <= now.getHours()
                    : dateKey(dayDate) < dateKey(now);
                  const isClayPartial16 =
                    sport === "tennis-clay" &&
                    ["tennis-clay-10", "tennis-clay-11"].includes(court.id) &&
                    hour === 16;

                  const reschedStatus = reschedulingBooking ? getRescheduleSlotStatus(court.id, hour, dayDate) : null;

                  return (
                    <div key={hour} className="p-1 h-full">
                      {label ? (
                        <div className="grid h-full min-h-[72px] cursor-not-allowed place-items-center rounded-2xl bg-amber-50/80 border border-amber-200/70 px-1 text-center text-[10px] font-bold text-amber-700 shadow-xs">
                          {label}
                        </div>
                      ) : isPast ? (
                        <div className="h-full min-h-[72px] cursor-not-allowed rounded-2xl bg-slate-100/40 border border-slate-200/40" />
                      ) : reschedulingBooking ? (
                        reschedStatus?.reason === "current" ? (
                          <div className="flex flex-col items-center justify-center h-full min-h-[72px] rounded-2xl border-2 border-slate-300 bg-slate-100/80 text-slate-500 p-1 text-center shadow-xs">
                            <span className="text-[10px] font-bold leading-tight">Pôvodný termín</span>
                          </div>
                        ) : reschedStatus?.reason === "price_mismatch" ? (
                          <div
                            className="flex flex-col items-center justify-center h-full min-h-[72px] rounded-2xl border border-slate-200/60 bg-slate-100/70 text-slate-400 p-1 text-center shadow-2xs cursor-not-allowed select-none"
                            title={`Iná cena: ${reschedStatus.targetPrice?.toFixed(2)} € (pôvodná: ${reschedOriginalPrice.toFixed(2)} €)`}
                          >
                            <span className="text-[10px] font-semibold text-slate-400">Iná cena</span>
                            <span className="text-[9.5px] font-bold text-slate-400/80">{reschedStatus.targetPrice?.toFixed(0)} €</span>
                          </div>
                        ) : reschedStatus?.eligible ? (
                          <button
                            type="button"
                            onClick={() => openSlot(court.id, hour, dayDate)}
                            className="group flex flex-col items-center justify-center h-full min-h-[72px] w-full cursor-pointer rounded-2xl border-2 border-emerald-500 bg-emerald-50/90 hover:bg-emerald-100 hover:border-emerald-600 transition-all duration-150 hover:scale-[1.02] shadow-sm p-1"
                            title={`Presunúť sem (${hour}:00, ${reschedOriginalPrice.toFixed(2)} €)`}
                          >
                            <CalendarSync className="h-4 w-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                            <span className="mt-1 text-[10px] sm:text-[10.5px] font-extrabold text-emerald-800 leading-tight text-center">
                              Presunúť sem
                            </span>
                          </button>
                        ) : (
                          <div className="h-full min-h-[72px] cursor-not-allowed rounded-2xl bg-slate-100/40 border border-slate-200/40" />
                        )
                      ) : isClayPartial16 ? (
                        <div className="flex h-full min-h-[72px] w-full overflow-hidden rounded-2xl border border-slate-200/70 shadow-xs">
                          {isPast ? (
                            <div className="h-full w-1/2 cursor-not-allowed bg-slate-100/40 border-r border-slate-200/50" />
                          ) : (
                            <button
                              type="button"
                              onClick={() => openSlot(court.id, hour, dayDate)}
                              className="group grid h-full w-1/2 cursor-pointer place-items-center bg-[#F1F5F9] border-r border-slate-200 transition-all duration-150 hover:bg-slate-200/90"
                              title="Rezervácia 16:00 – 16:30"
                            >
                              <Plus className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          )}
                          <div
                            className="h-full w-1/2 cursor-not-allowed bg-amber-50/80 border-l border-amber-200/60"
                            title="Od 16:30 mimo prevádzky"
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openSlot(court.id, hour, dayDate)}
                          className="group grid h-full min-h-[72px] w-full cursor-pointer place-items-center rounded-2xl bg-[#F1F5F9] border border-slate-200/70 transition-all duration-150 hover:scale-[1.02] hover:bg-slate-200/90 hover:border-slate-300 shadow-xs"
                        >
                          <Plus className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </div>
                  );
                })}
                {dayIsToday && dayPastPercent > 0 && (
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 z-[2]"
                    style={{
                      width: `${dayPastPercent}%`,
                      background: "repeating-linear-gradient(135deg, rgba(148,163,184,0.18) 0px, rgba(148,163,184,0.18) 5px, rgba(241,245,249,0.3) 5px, rgba(241,245,249,0.3) 10px)",
                    }}
                  />
                )}
                <div className={`pointer-events-none absolute inset-0 ${courtHasHighlight ? "z-40" : "z-10"}`}>
                  {dayBookings.filter((booking) => booking.courtId === court.id).map((booking) => {
                    const isAdmin = currentUser?.role === "admin";
                    const isNtcTeam = currentUser?.role === "ntc_team";
                    const own = !!currentUser && currentUser.id === booking.user_id;
                    const canManage = own || isAdmin || isNtcTeam;
                    const voiceHighlight = highlightedVoiceBookings.includes(booking.id);
                    const isTrainer = booking.userRole === "trainer";

                    const blockType = (booking.adminBlockType || "").toLowerCase();
                    const nameLower = (booking.customerName || "").toLowerCase();
                    const titleLower = (booking.title || "").toLowerCase();
                    // 1. Prioritné priradenie podľa explicitne zvoleného typu (adminBlockType)
                    let matchedCategory: AdminReservationCategory | undefined;

                    if (blockType) {
                      matchedCategory = categories.find((cat) => {
                        const cName = cat.name.toLowerCase();
                        const cId = cat.id.toLowerCase();
                        return blockType === cName || blockType === cId;
                      });
                    }

                    // 2. Fallback detekcia pre staré historické záznamy bez adminBlockType
                    if (!matchedCategory) {
                      if (
                        isTrainer ||
                        nameLower === "tréningy" ||
                        nameLower === "treningy" ||
                        nameLower === "tréning" ||
                        titleLower.includes("tréning") ||
                        titleLower.includes("trening")
                      ) {
                        matchedCategory = categories.find((c) => c.id === "training");
                      } else if (
                        nameLower === "rezervácia admin" ||
                        nameLower === "rezervacia admin" ||
                        titleLower.includes("admin")
                      ) {
                        matchedCategory = categories.find((c) => c.id === "admin_reservation");
                      } else if (
                        nameLower.includes("údržba") ||
                        titleLower.includes("údržba") ||
                        booking.status === "blocked" ||
                        booking.source === "admin"
                      ) {
                        matchedCategory = categories.find((c) => c.id === "maintenance");
                      }
                    }

                    const isMaintenance = matchedCategory?.id === "maintenance" || (!matchedCategory && (booking.status === "blocked" || booking.source === "admin"));
                    const isAnyAdminOrBlock = Boolean(matchedCategory) || booking.source === "admin" || booking.status === "blocked";

                    let bookingClasses = "";
                    let labelText = "";
                    let slotCustomStyle: React.CSSProperties = {};

                    if (isAdmin || isNtcTeam) {
                      const rawPlayer = (booking.clientPlayerName?.trim() || booking.customerName?.trim() || "");
                      const allKnownNames = [
                        "tréningy", "treningy", "tréning", "trening",
                        "rezervácia admin", "rezervacia admin", "admin", "admin user",
                        "údržba kurtov", "udrzba kurtov", "údržba", "udrzba",
                        "rezervácia", "rezervacia",
                        ...categories.map((c) => c.name.toLowerCase()),
                        ...categories.map((c) => c.id.toLowerCase()),
                      ];
                      const isDefaultSystemName = allKnownNames.includes(rawPlayer.toLowerCase());
                      const customPlayerName = isDefaultSystemName ? "" : rawPlayer;

                      if (matchedCategory) {
                        labelText = matchedCategory.hasPlayerField
                          ? (customPlayerName || matchedCategory.name)
                          : matchedCategory.name;
                        slotCustomStyle = {
                          backgroundColor: matchedCategory.color,
                          borderColor: matchedCategory.border,
                        };
                        bookingClasses = "text-slate-950 font-bold shadow-xs hover:brightness-95";
                      } else {
                        labelText = customPlayerName || booking.title || "Rezervácia";
                        slotCustomStyle = {
                          backgroundColor: "#FFF3B0",
                          borderColor: "#EAD77B",
                        };
                        bookingClasses = "text-slate-950 font-bold shadow-xs hover:bg-[#FEECA0]";
                      }
                    } else {
                      if (isAnyAdminOrBlock) {
                        labelText = isMaintenance ? "Údržba" : "Obsadené";
                        bookingClasses = "border-slate-400 bg-slate-500 text-white font-semibold shadow-xs";
                      } else if (own) {
                        labelText = "Vaša rezervácia";
                        bookingClasses = "border-emerald-300 bg-[#DCFCE7] text-emerald-950 font-bold shadow-xs hover:bg-[#BBF7D0]";
                      } else {
                        labelText = "Obsadené";
                        bookingClasses = "border-slate-300 bg-[#CBD5E1] text-slate-800 font-semibold shadow-xs";
                      }
                    }
                    const isBeingRescheduled = reschedulingBooking?.id === booking.id;
                    if (isBeingRescheduled) {
                      labelText = "Presúva sa...";
                      slotCustomStyle = {};
                      bookingClasses = "border-2 border-dashed border-emerald-500 bg-emerald-100/90 text-emerald-950 font-bold ring-2 ring-emerald-400";
                    }

                    return (
                      <div
                        key={booking.id}
                        className={`absolute inset-y-0 p-1 ${voiceHighlight ? "z-50" : ""}`}
                        style={position(booking)}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (reschedulingBooking) {
                              if (booking.id === reschedulingBooking.id) {
                                setNotice("Túto rezerváciu práve presúvate. Vyberte zelené okienko [Presunúť sem] pre nový termín.");
                              } else {
                                setNotice("Tento termín je už obsadený inou rezerváciou.");
                              }
                              return;
                            }
                            if (canManage) setDetail(booking);
                          }}
                          style={slotCustomStyle}
                          className={`pointer-events-auto h-full w-full overflow-hidden rounded-2xl border px-1.5 py-1 text-center transition duration-150 hover:scale-[1.01] flex flex-col items-center justify-center ${voiceHighlight ? "booking-magnify-drop" : ""
                            } ${canManage ? "cursor-pointer" : "cursor-not-allowed"} ${bookingClasses}`}
                          title={canManage ? `Detail: ${labelText}` : (isAnyAdminOrBlock ? "Údržba" : "Obsadené")}
                        >
                          {isAdmin || isNtcTeam ? (
                            booking.subSlots && booking.subSlots.length > 0 ? (
                              <div className="relative z-[1] flex h-full w-full select-none pointer-events-none divide-x-2 divide-slate-950/30 overflow-hidden">
                                {(() => {
                                  const parseTimeToMin = (tStr: string) => {
                                    const [h, m] = tStr.split(":").map(Number);
                                    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
                                  };
                                  const bStartMin = getBratislavaMinutes(booking.start);
                                  const bEndMin = getBratislavaMinutes(booking.end);
                                  const totalMins = Math.max(1, bEndMin - bStartMin);

                                  return booking.subSlots.map((slot, sIdx) => {
                                    const sMin = parseTimeToMin(slot.from);
                                    const eMin = parseTimeToMin(slot.to);
                                    let slotDur = eMin - sMin;
                                    if (slotDur <= 0) slotDur = totalMins / booking.subSlots!.length;
                                    const widthPct = Math.max(5, Math.min(100, (slotDur / totalMins) * 100));

                                    return (
                                      <div
                                        key={sIdx}
                                        style={{ width: `${widthPct}%` }}
                                        className="flex flex-col items-center justify-center h-full px-0.5 py-0.5 text-center min-w-0 overflow-hidden leading-tight"
                                      >
                                        <span className="block text-[clamp(7.5px,0.55vw,9.5px)] font-bold text-slate-700/90 leading-tight whitespace-nowrap mb-0.5">
                                          {slot.from}–{slot.to}
                                        </span>
                                        <div className="flex flex-col items-center justify-center w-full text-[clamp(7.5px,0.6vw,10.5px)] font-extrabold text-slate-950 leading-[1.1] tracking-tight">
                                          {slot.player.split(" ").filter(Boolean).map((part, pIdx) => (
                                            <span key={pIdx} className="block whitespace-nowrap max-w-full">
                                              {part}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            ) : (
                              <div className="relative z-[1] flex flex-col items-center justify-center w-full px-0.5 text-center text-[clamp(8px,0.65vw,11px)] font-bold leading-tight select-none pointer-events-none tracking-tight">
                                {booking.recurringGroupId && (
                                  <Repeat className="h-2.5 w-2.5 mb-0.5 opacity-75 shrink-0" />
                                )}
                                {labelText.split(" ").filter(Boolean).map((part, idx) => (
                                  <span key={idx} className="block leading-[1.15] whitespace-nowrap max-w-full">
                                    {part}
                                  </span>
                                ))}
                              </div>
                            )
                          ) : (
                            <div className={`relative z-[1] flex flex-col items-center justify-center w-full px-0.5 text-center font-sans select-none pointer-events-none ${own ? "text-emerald-950" : (isAnyAdminOrBlock ? "text-white" : "text-slate-800")
                              }`}>
                              <span className="block text-[clamp(8.5px,0.65vw,11px)] font-bold leading-tight tracking-tight whitespace-nowrap inline-flex items-center gap-1 justify-center">
                                {booking.recurringGroupId && (
                                  <Repeat className="h-2.5 w-2.5 opacity-75 shrink-0" />
                                )}
                                {formatCompactInterval(booking.start, booking.end)}
                              </span>
                              <div className="mt-0.5 flex flex-col items-center justify-center w-full px-0.5 text-center text-[clamp(8px,0.6vw,10.5px)] font-bold leading-[1.1] tracking-tight">
                                {labelText.split(" ").filter(Boolean).map((part, idx) => (
                                  <span key={idx} className="block whitespace-nowrap max-w-full">
                                    {part}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {dayIsToday && currentTimePercent > 0 && currentTimePercent < 100 && (
                  <div className="pointer-events-none absolute inset-y-0 z-20 border-l-2 border-dashed border-[#84CC16]" style={{ left: `${currentTimePercent}%` }} />
                )}
              </div>
              <div className="bg-slate-50/20" aria-hidden="true" />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-900" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <NewBookingsHeader
        currentUser={currentUser}
        walletBalance={walletBalance}
        walletHighlight={walletHighlight}
        activeTab="calendar"
        onAuthModal={(mode) => setAuth(mode)}
        onTopUp={startTopUp}
        topUpLoading={topUpLoading}
      />
      <main className="mx-auto max-w-[1500px] px-2 py-4 sm:px-6 sm:py-7 lg:py-8">
        <div className="mx-auto mb-4 sm:mb-7 flex w-full max-w-5xl flex-col items-center px-2 text-center pt-1 sm:pt-2">
          <h1
            className="text-xl font-medium tracking-tight text-slate-800 sm:text-3xl lg:text-4xl"
            style={{ fontFamily: "var(--font-poppins), sans-serif" }}
          >
            Rezervačný systém NTC
          </h1>
        </div>
        <AnimatePresence mode="wait">
          {notice && (
            <motion.div
              key={notice}
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98, transition: { duration: 0.35, ease: "easeInOut" } }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative mb-2.5 sm:mb-5 overflow-hidden rounded-xl sm:rounded-2xl border border-amber-200/90 bg-gradient-to-r from-yellow-50/95 via-amber-50/90 to-orange-50/95 p-2.5 sm:p-4 text-left shadow-[0_6px_20px_rgba(245,158,11,0.12)] backdrop-blur-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-6 w-6 sm:h-7 sm:w-7 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-900 text-xs sm:text-sm">
                    🎾
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-amber-950">{notice}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotice("")}
                  className="shrink-0 rounded-lg p-1 text-amber-800/70 hover:bg-amber-100 hover:text-amber-950 transition cursor-pointer"
                  aria-label="Zavrieť hlásenie"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 5, ease: "linear" }}
                className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-orange-500/40 via-orange-400/30 to-amber-400/20"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Plávajúca prichytená hlavička s hodinami pri vertikálnom scrollovaní nadol */}
        <div
          className={`fixed top-0 left-0 right-0 z-40 transition-all duration-150 ${showFloatingHeader
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-full pointer-events-none"
            }`}
          style={{
            boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.12)",
          }}
        >
          <div className="border-b border-slate-300 bg-slate-50/98 backdrop-blur-md">
            <div className="mx-auto max-w-[1500px] px-2 sm:px-6">
              <div
                ref={floatingHeaderScrollRef}
                className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                onScroll={(e) => {
                  if (calendarScrollRef.current && isSyncingScrollRef.current !== "calendar") {
                    isSyncingScrollRef.current = "floating";
                    calendarScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
                    isSyncingScrollRef.current = null;
                  }
                }}
              >
                <div className="w-full" style={{ minWidth: `${calendarMinWidth}px` }}>
                  <div className="grid border-b border-slate-200 bg-slate-50" style={{ gridTemplateColumns: calendarColumns }}>
                    <div className="sticky left-0 z-30 flex flex-col items-center justify-center text-center border-r border-slate-200 bg-slate-100 px-1 py-1.5 text-slate-700 shadow-[2px_0_6px_rgba(15,23,42,0.04)] select-none">
                      <b className="text-[10px] sm:text-[11px] font-extrabold tracking-wide uppercase leading-tight">
                        KURT
                      </b>
                      {viewMode === "day" && (
                        <span className="mt-0.5 rounded px-1.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold text-emerald-800 bg-emerald-100/90 border border-emerald-300/70 leading-tight whitespace-nowrap shadow-2xs">
                          {(() => {
                            const parts = new Intl.DateTimeFormat("sk-SK", { weekday: "short", day: "numeric", month: "numeric" }).formatToParts(date);
                            const wdRaw = parts.find((p) => p.type === "weekday")?.value || "";
                            const wd = wdRaw.charAt(0).toUpperCase() + wdRaw.slice(1);
                            const d = parts.find((p) => p.type === "day")?.value || "";
                            const m = parts.find((p) => p.type === "month")?.value || "";
                            return `${wd} ${d}.${m}.`;
                          })()}
                        </span>
                      )}
                    </div>
                    <div className="relative grid bg-slate-50" style={{ gridTemplateColumns: timeColumns }}>
                      {hours.map((hour) => (
                        <div key={hour} className="py-2.5 text-center text-xs font-bold text-slate-600 tracking-wide">
                          {hour}:00
                        </div>
                      ))}
                      {isToday && currentTimePercent > 0 && currentTimePercent < 100 && (
                        <div className="pointer-events-none absolute inset-y-0 z-20 border-l-2 border-dashed border-[#84CC16]" style={{ left: `${currentTimePercent}%` }} />
                      )}
                    </div>
                    <div className="bg-slate-50" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-xl sm:rounded-3xl border sm:border-2 border-slate-300 bg-white shadow-sm sm:shadow-[0_20px_55px_rgba(15,23,42,0.10)]">
          <div className="border-b border-slate-200 p-2 sm:p-6">
            {reschedulingBooking && (
              <div className="mb-3 sm:mb-4 rounded-xl sm:rounded-2xl border-2 border-emerald-500 bg-emerald-50/90 p-3 sm:p-4 shadow-sm">
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                      <CalendarSync className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                          Režim presunu rezervácie
                        </span>
                        <span className="text-xs font-bold text-emerald-950">
                          {reschedDurationMin} min. | {reschedOriginalPrice.toFixed(2)} €
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-700">
                        Vyberte zelené okienko <b>Presunúť sem</b>. Ostatné okienka s inou cenou alebo obsadené termíny sú vyblokované.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReschedulingBooking(null);
                      setRescheduleSlot(null);
                      setRescheduleError("");
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition shrink-0 cursor-pointer self-start sm:self-auto"
                  >
                    <X className="h-4 w-4 text-slate-500" /> Zrušiť presun
                  </button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-4 sm:gap-2">
              {sports.map((item) => {
                const origCourt = courts.find((c) => c.id === reschedulingBooking?.courtId);
                const isSportLocked = Boolean(reschedulingBooking && origCourt && item.id !== origCourt.sport);
                return (
                  <button
                    key={item.id}
                    disabled={isSportLocked}
                    onClick={() => setSport(item.id)}
                    title={isSportLocked ? "Počas presunu rezervácie je možné vybrať iba rovnaký šport" : undefined}
                    className={`cursor-pointer rounded-lg sm:rounded-xl border py-1.5 px-2 sm:p-3 text-xs sm:text-sm font-semibold sm:font-bold transition duration-200 ${sport === item.id
                        ? "border-slate-950 bg-slate-950 text-white shadow-xs sm:shadow-sm"
                        : isSportLocked
                          ? "border-slate-200 bg-slate-100 text-slate-400 opacity-40 cursor-not-allowed"
                          : "border-slate-200 bg-white text-slate-600 shadow-2xs hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 hover:shadow-xs"
                      }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 sm:mt-5 sm:gap-4 sm:pt-5">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => {
                    setDate(new Date());
                    setTimeout(() => scrollToCurrentTime(true), 60);
                  }}
                  className="shrink-0 cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:border-slate-400 hover:bg-slate-50 transition sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm sm:font-bold sm:shadow-xs"
                >
                  Dnes
                </button>
                <div className="inline-flex p-0.5 rounded-lg sm:rounded-xl bg-slate-100 border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setViewMode("day")}
                    className={`cursor-pointer px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-bold rounded-md sm:rounded-lg transition ${
                      viewMode === "day"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    1 deň
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("week");
                      if (dateKey(date) < dateKey(today)) {
                        setDate(new Date());
                      }
                    }}
                    className={`cursor-pointer px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-bold rounded-md sm:rounded-lg transition ${
                      viewMode === "week"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Dnes + 7 dní
                  </button>
                </div>
              </div>
              <div className="flex flex-1 items-center justify-center gap-1 sm:flex-initial sm:gap-1.5">
                <button
                  type="button"
                  onClick={() => moveDate(-7)}
                  className="shrink-0 cursor-pointer rounded-lg border border-slate-200 p-1 shadow-2xs hover:border-slate-400 hover:bg-slate-50 transition sm:rounded-xl sm:p-2.5 sm:shadow-xs text-slate-700"
                  aria-label="Predchádzajúci týždeň (-7 dní)"
                  title="Predchádzajúci týždeň (-7 dní)"
                >
                  <ChevronsLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveDate(-1)}
                  className="shrink-0 cursor-pointer rounded-lg border border-slate-200 p-1 shadow-2xs hover:border-slate-400 hover:bg-slate-50 transition sm:rounded-xl sm:p-2.5 sm:shadow-xs text-slate-700"
                  aria-label="Predchádzajúci deň"
                  title="Predchádzajúci deň"
                >
                  <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDatePickerOpen(true)}
                  className="flex flex-1 sm:flex-initial min-w-0 sm:min-w-[280px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-center text-xs font-semibold text-slate-800 shadow-2xs transition hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm sm:font-bold sm:shadow-xs"
                  aria-haspopup="dialog"
                >
                  <CalendarDays className="h-3.5 w-3.5 shrink-0 text-emerald-600 sm:h-4.5 sm:w-4.5" />
                  <span className="truncate">
                    {viewMode === "week" ? (
                      `${new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "numeric" }).format(date)} – ${new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "numeric", year: "numeric" }).format(weekEndDate)}`
                    ) : (
                      new Intl.DateTimeFormat("sk-SK", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(date)
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => moveDate(1)}
                  className="shrink-0 cursor-pointer rounded-lg border border-slate-200 p-1 shadow-2xs hover:border-slate-400 hover:bg-slate-50 transition sm:rounded-xl sm:p-2.5 sm:shadow-xs text-slate-700"
                  aria-label="Nasledujúci deň"
                  title="Nasledujúci deň"
                >
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveDate(7)}
                  className="shrink-0 cursor-pointer rounded-lg border border-slate-200 p-1 shadow-2xs hover:border-slate-400 hover:bg-slate-50 transition sm:rounded-xl sm:p-2.5 sm:shadow-xs text-slate-700"
                  aria-label="Nasledujúci týždeň (+7 dní)"
                  title="Nasledujúci týždeň (+7 dní)"
                >
                  <ChevronsRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
              <span className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-500 shrink-0">
                <Clock className="h-4 w-4 text-slate-400" /> Max. 14 dní
              </span>
            </div>
          </div>
          <div
            ref={calendarScrollRef}
            className="overflow-x-auto border-t-2 border-slate-200 bg-white"
            onScroll={(e) => {
              if (floatingHeaderScrollRef.current && isSyncingScrollRef.current !== "floating") {
                isSyncingScrollRef.current = "calendar";
                floatingHeaderScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
                isSyncingScrollRef.current = null;
              }
            }}
          >
            <div className="w-full" style={{ minWidth: `${calendarMinWidth}px` }}>
              {viewMode === "day"
                ? renderDaySection(date, true, false)
                : weekDays.map((day, idx) => renderDaySection(day, idx === 0, true))}
            </div>
          </div>
        </section>
        <div className="mt-4 sm:mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm font-semibold">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            {currentUser?.role === "admin" ? (
              <>
                <span className="flex items-center gap-2">
                  <i className="h-3.5 w-3.5 rounded-md border border-[#EAD77B] bg-[#FFF3B0] shadow-xs" />
                  Klient
                </span>
                {categories.map((cat) => (
                  <span key={cat.id} className="flex items-center gap-2">
                    <i
                      className="h-3.5 w-3.5 rounded-md border shadow-xs"
                      style={{
                        backgroundColor: cat.color,
                        borderColor: cat.border,
                      }}
                    />
                    {cat.name}
                  </span>
                ))}
                <Link
                  href="/dashboard/users-roles#categories"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 cursor-pointer active:scale-95"
                  title="Upraviť farby a kategórie v nastaveniach"
                >
                  <Palette className="h-3.5 w-3.5 text-slate-500" />
                  <span>Farby & kategórie</span>
                </Link>
              </>
            ) : (
              <>
                {currentUser && (
                  <span className="flex items-center gap-2">
                    <i className="h-3.5 w-3.5 rounded-md border border-emerald-300 bg-[#DCFCE7] shadow-xs" />
                    Vaša rezervácia
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <i className="h-3.5 w-3.5 rounded-md border border-slate-300 bg-[#CBD5E1] shadow-xs" />
                  Obsadené
                </span>
                <span className="flex items-center gap-2">
                  <i className="h-3.5 w-3.5 rounded-md border border-slate-500 bg-slate-500 shadow-xs" />
                  Údržba
                </span>
              </>
            )}
            {loading && <span className="text-slate-500 font-normal">Aktualizujem...</span>}
          </div>

          <div className="flex items-center sm:justify-end">
            <a
              href="https://telio.sk"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/90 px-3.5 py-1.5 text-xs text-slate-600 shadow-xs backdrop-blur-sm transition-all duration-300 hover:border-emerald-400 hover:bg-white hover:text-slate-900 hover:shadow-[0_4px_20px_rgba(16,185,129,0.15)] cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[10px] font-medium tracking-wider uppercase text-slate-400 group-hover:text-slate-500 transition-colors">
                  powered by
                </span>
                <strong className="font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent group-hover:from-emerald-500 group-hover:to-teal-500 transition-all">
                  Telio
                </strong>
              </span>
              <span className="h-3 w-[1px] bg-slate-200" />
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 group-hover:text-slate-700 transition-colors">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                AI hlasové služby 24/7
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-600" />
            </a>
          </div>
        </div>
      </main>
      {datePickerOpen && <DatePicker value={date} min={today} max={maxDate} horizonDays={bookingHorizonDays} onSelect={(selected) => selectDate(dateKey(selected))} onClose={() => setDatePickerOpen(false)} />}
      {auth && (
        <NewBookingAuth
          mode={auth}
          resetToken={resetToken}
          onClose={() => {
            setAuth(null);
            setResetToken(undefined);
            setPendingSlot(null);
          }}
          onSuccess={(user) => handleAuthSuccess(user)}
        />
      )}
      {slot && (
        <CreateBookingDialog
          court={courts.find((court) => court.id === slot.courtId)}
          date={slot.date}
          hour={slot.hour}
          duration={duration}
          pricelist={activePricelist}
          durationOptions={getAvailableDurationOptions(slot.courtId, new Date(new Date(slot.date).setHours(slot.hour, 0, 0, 0)))}
          discountEurPerHour={rolePolicy?.discountEurPerHour ?? 0}
          userDiscountTierId={currentUser?.discountTierId}
          multisportCardsCount={multisportCardsCount}
          onMultisportCardsCount={setMultisportCardsCount}
          title={title}
          phone={phone}
          categories={categories}
          adminBlockType={adminBlockType}
          onAdminBlockType={setAdminBlockType}
          isAdmin={currentUser?.role === "admin"}
          canMakeRecurring={canUserMakeRecurring}
          isRecurring={isRecurring}
          onIsRecurring={setIsRecurring}
          repeatFrequency={repeatFrequency}
          onRepeatFrequency={setRepeatFrequency}
          frequencyWeeks={frequencyWeeks}
          onFrequencyWeeks={setFrequencyWeeks}
          daysOfWeek={daysOfWeek}
          onDaysOfWeek={setDaysOfWeek}
          untilDate={untilDate}
          onUntilDate={setUntilDate}
          repeatWeeks={repeatWeeks}
          onRepeatWeeks={setRepeatWeeks}
          clientPlayerName={clientPlayerName}
          onClientPlayerName={setClientPlayerName}
          hasCard={Boolean(currentUser)}
          hasMultisport={Boolean(currentUser?.hasMultisport)}
          error={notice || undefined}
          loading={loading}
          walletBalance={walletBalance}
          onTopUp={startTopUp}
          topUpLoading={topUpLoading}
          onDuration={setDuration}
          onTitle={setTitle}
          onPhone={setPhone}
          onClose={() => {
            setSlot(null);
            setIsRecurring(false);
            setRepeatFrequency("weekly");
            setClientPlayerName("");
            if (typeof window !== "undefined") {
              sessionStorage.removeItem("ntc_pending_auth_slot");
            }
          }}
          onSubmit={submit}
        />
      )}
      {detail && (
        <BookingDetailDialog
          booking={detail}
          court={courts.find((court) => court.id === detail.courtId)}
          canManage={!!currentUser && (currentUser.role === "admin" || currentUser.role === "ntc_team" || currentUser.id === detail.user_id)}
          canCancel={currentUser?.role === "admin" || new Date(detail.start).getTime() - now.getTime() > (rolePolicy?.cancellationDeadlineHours ?? 24) * 60 * 60 * 1000}
          cancellationDeadlineHours={rolePolicy?.cancellationDeadlineHours ?? 24}
          currentRole={currentUser?.role}
          onSubSlotsUpdated={(bookingId, subSlots) => {
            setItems((prev) =>
              prev.map((b) => (b.id === bookingId ? { ...b, subSlots } : b))
            );
          }}
          onClose={() => setDetail(null)}
          onDelete={(target) => setDeleting(target || detail)}
          onOpenSeriesOverview={(groupId) => setSeriesOverviewGroupId(groupId)}
          onNavigateToDate={(targetDate) => {
            setDate(targetDate);
            setDetail(null);
            setTimeout(() => scrollToCurrentTime(true), 100);
          }}
          onStartReschedule={(target) => {
            const targetBooking = target || detail;
            const origCourt = courts.find((court) => court.id === targetBooking.courtId);
            if (origCourt && origCourt.sport !== sport) {
              setSport(origCourt.sport);
            }
            setReschedulingBooking(targetBooking);
            setDetail(null);
            setNotice("Vyberte nový voľný termín v kalendári s rovnakou cenou a dĺžkou.");
          }}
        />
      )}
      {rescheduleSlot && reschedulingBooking && (
        <RescheduleConfirmDialog
          booking={reschedulingBooking}
          court={courts.find((court) => court.id === reschedulingBooking.courtId)}
          targetCourt={courts.find((court) => court.id === rescheduleSlot.courtId)}
          targetDate={rescheduleSlot.date}
          targetHour={rescheduleSlot.hour}
          durationMinutes={reschedDurationMin}
          loading={rescheduleLoading}
          error={rescheduleError}
          onCancel={() => {
            setRescheduleSlot(null);
            setRescheduleError("");
          }}
          onConfirm={handleConfirmReschedule}
        />
      )}
      {deleting && (
        <DeleteDialog
          loading={loading}
          error={notice || undefined}
          isSeries={Boolean(deleting.recurringGroupId)}
          onCancel={() => { setDeleting(null); setNotice(""); }}
          onConfirm={(deleteSeries) => remove(deleteSeries)}
        />
      )}
      {seriesOverviewGroupId && (
        <SeriesOverviewDialog
          recurringGroupId={seriesOverviewGroupId}
          courtName={detail ? formatCourtDisplayName(courts.find((c) => c.id === detail.courtId)) : undefined}
          courts={courts}
          onClose={() => setSeriesOverviewGroupId(null)}
          onSelectDate={(targetDate) => {
            setDate(targetDate);
            setDetail(null);
            setTimeout(() => scrollToCurrentTime(true), 100);
          }}
          onCancelSingleBooking={async (bookingId) => {
            const res = await deleteBookingAction(bookingId, false);
            if (res.success) {
              setItems((prev) => prev.filter((b) => b.id !== bookingId));
              setNotice("Termín bol úspešne uvoľnený pre verejnosť.");
            } else {
              setNotice(res.error || "Termín sa nepodarilo uvoľniť.");
            }
          }}
          onCancelEntireSeries={async (groupId) => {
            const targetBooking = detail || items.find((b) => b.recurringGroupId === groupId);
            if (targetBooking) {
              setDeleting(targetBooking);
              await remove(true);
            }
            setSeriesOverviewGroupId(null);
          }}
        />
      )}
      <style jsx global>{`
        @keyframes booking-magnify-and-drop {
          0% {
            transform: scale(0.86) translateY(0);
            box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
            filter: brightness(1);
          }
          /* 1. Fast dynamic spring lift-off into the foreground */
          9% {
            transform: scale(1.38) translateY(-6px);
            box-shadow: 
              0 28px 52px -6px rgba(15, 23, 42, 0.4),
              0 0 0 3.5px rgba(255, 255, 255, 0.98),
              0 0 36px rgba(16, 185, 129, 0.6),
              0 0 68px rgba(56, 189, 248, 0.38);
            filter: brightness(1.09) contrast(1.05);
          }
          /* 2. Floating showcase phase with gentle breathing hover (~2.8 seconds of clear visibility) */
          25% {
            transform: scale(1.33) translateY(-8px);
            box-shadow: 
              0 24px 44px -8px rgba(15, 23, 42, 0.34),
              0 0 0 3px rgba(255, 255, 255, 0.95),
              0 0 30px rgba(16, 185, 129, 0.45),
              0 0 55px rgba(56, 189, 248, 0.28);
            filter: brightness(1.06) contrast(1.03);
          }
          48% {
            transform: scale(1.36) translateY(-9px);
            box-shadow: 
              0 26px 48px -8px rgba(15, 23, 42, 0.38),
              0 0 0 3.5px rgba(255, 255, 255, 0.98),
              0 0 42px rgba(16, 185, 129, 0.55),
              0 0 72px rgba(56, 189, 248, 0.36);
            filter: brightness(1.10) contrast(1.05);
          }
          68% {
            transform: scale(1.33) translateY(-7px);
            box-shadow: 
              0 22px 40px -8px rgba(15, 23, 42, 0.32),
              0 0 0 3px rgba(255, 255, 255, 0.92),
              0 0 30px rgba(16, 185, 129, 0.4);
            filter: brightness(1.05);
          }
          /* 3. Rapid gravity drop back into the calendar day */
          82% {
            transform: scale(0.92) translateY(3px);
            box-shadow: 
              0 6px 14px rgba(15, 23, 42, 0.24),
              0 0 0 1.5px rgba(255, 255, 255, 0.85),
              0 0 18px rgba(16, 185, 129, 0.32);
            filter: brightness(1.02);
          }
          /* 4. Elastic impact rebound & settle */
          90% {
            transform: scale(1.06) translateY(-2px);
            box-shadow: 
              0 10px 20px rgba(15, 23, 42, 0.16),
              0 0 12px rgba(16, 185, 129, 0.22);
          }
          96% {
            transform: scale(0.98) translateY(1px);
            box-shadow: 0 4px 10px rgba(15, 23, 42, 0.12);
          }
          100% {
            transform: scale(1) translateY(0);
            box-shadow: none;
            filter: none;
          }
        }
        .booking-magnify-drop,
        .voice-booking-highlight {
          position: relative;
          animation: booking-magnify-and-drop 4.5s cubic-bezier(0.22, 1, 0.36, 1) forwards !important;
          z-index: 50 !important;
          transform-origin: center center;
          will-change: transform, box-shadow, filter;
        }
        @media (prefers-reduced-motion: reduce) {
          .booking-magnify-drop,
          .voice-booking-highlight {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
