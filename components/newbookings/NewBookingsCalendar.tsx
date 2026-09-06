"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock, Coins, LayoutDashboard, LogIn, LogOut, Plus, Receipt, Settings, ShieldCheck, Sparkles, UserPlus, Users, X } from "lucide-react";
import TennisBallAvatar from "@/components/icons/TennisBallAvatar";
import { ThreeDChartIcon, ThreeDSettingsIcon, ThreeDUserAvatarIcon } from "@/components/icons/ThreeDNavIcons";
import { createBookingAction, deleteBookingAction, fetchBookingsAction } from "@/app/actions/bookings";
import { logoutAction } from "@/app/actions/auth";
import { createWalletCardPayAction, createWalletCheckoutAction, getWalletAction, reconcileWalletCardPayAction, reconcileWalletCheckoutAction } from "@/app/actions/wallet";

import { supabase } from "@/lib/supabase";
import type { BookingUser } from "@/lib/auth/bookingAuth";
import type { Booking, Court, SportType } from "@/lib/bookings/mockBookings";
import { openingHours } from "@/lib/bookings/mockBookings";
import { getCourtOperatingLimitMinutes, getDurationOptions, type RoleBookingPolicy } from "@/lib/bookings/rolePolicy";

import HolographicTennisCourt from "./HolographicTennisCourt";
import NewBookingAuth from "./NewBookingAuth";
import { BookingDetailDialog, CreateBookingDialog, DeleteDialog } from "./NewBookingDialogs";

type Props = {
  courts: Court[];
  initialBookings: Booking[];
  currentUser: BookingUser | null;
  rolePolicy: RoleBookingPolicy | null;
  initialWalletBalance?: number | null;
};
type Slot = { courtId: string; date: Date; hour: number };

const sports: { id: SportType; label: string }[] = [
  { id: "badminton", label: "Bedminton" },
  { id: "squash", label: "Squash" },
  { id: "tennis", label: "Tenis indoor" },
  { id: "tennis-clay", label: "Tenis antuka" },
];

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const formatTime = (value: string) => new Intl.DateTimeFormat("sk-SK", { timeZone: "Europe/Bratislava", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

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
  if (["tennis-clay-1", "tennis-clay-2"].includes(courtId) && hour === 13) return "Údržba";
  if (["tennis-clay-10", "tennis-clay-11"].includes(courtId)) {
    if (hour === 7 || hour >= 16) return "Mimo prevádzky";
    if (hour === 12) return "Údržba";
  }
  return null;
}

function clayError(courtId: string, sport: SportType, hour: number, duration: number) {
  if (sport !== "tennis-clay") return null;
  const end = hour + duration / 60;
  if (["tennis-clay-1", "tennis-clay-2"].includes(courtId) && hour < 14 && end > 13) return "Od 13:00 do 14:00 prebieha údržba.";
  if (["tennis-clay-10", "tennis-clay-11"].includes(courtId)) {
    if (hour < 8) return "Dvorce 10 a 11 sú pred 8:00 mimo prevádzky.";
    if (hour < 13 && end > 12) return "Od 12:00 do 13:00 prebieha údržba.";
    if (end > 16.5) return "Dvorce 10 a 11 sú otvorené iba do 16:30.";
  }
  return null;
}

function playTennisHitSound() {
  if (typeof window === "undefined") return;
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

export default function NewBookingsCalendar({ courts, initialBookings, currentUser: initialCurrentUser, rolePolicy: initialRolePolicy, initialWalletBalance }: Props) {
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
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [items, setItems] = useState(initialBookings);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(false);
  const [auth, setAuth] = useState<"login" | "register" | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [detail, setDetail] = useState<Booking | null>(null);
  const [deleting, setDeleting] = useState<Booking | null>(null);
  const [notice, setNotice] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [duration, setDuration] = useState(60);
  const [multisportCardsCount, setMultisportCardsCount] = useState<0 | 1 | 2>(0);
  const [walletBalance, setWalletBalance] = useState<number | null>(initialWalletBalance ?? null);
  const [walletHighlight, setWalletHighlight] = useState(false);
  const [topUpLoading, setTopUpLoading] = useState<number | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [highlightedVoiceBookings, setHighlightedVoiceBookings] = useState<string[]>([]);
  const today = useMemo(() => { const value = new Date(); value.setHours(0, 0, 0, 0); return value; }, []);
  const bookingHorizonDays = rolePolicy?.bookingHorizonDays ?? 14;
  const maxDate = useMemo(() => { const value = new Date(today); value.setDate(value.getDate() + bookingHorizonDays); value.setHours(23, 59, 59, 999); return value; }, [today, bookingHorizonDays]);
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
    } else if (walletStatus === "success") {
      setNotice(
        amount
          ? `Platba cez Tatra banka CardPay (${amount} €) bola úspešne pripísaná na váš účet.`
          : "Platba cez Tatra banka CardPay bola úspešne pripísaná na váš účet."
      );
      window.history.replaceState({}, "", window.location.pathname);
      getWalletAction().then((result) => {
        if (result.success && result.enabled) {
          setWalletBalance(result.balanceEur);
          setWalletHighlight(true);
          setTimeout(() => setWalletHighlight(false), 3500);
          restorePendingSlotAfterTopUp();
        }
      });
    } else if (walletStatus === "pending") {
      setNotice(
        amount
          ? `Platba cez Tatra banka CardPay (${amount} €) bola prijatá. Kredit sme vám predbežne pripísali, prebieha overenie bankou...`
          : "Platba cez Tatra banka CardPay bola prijatá. Kredit sme vám predbežne pripísali, prebieha overenie bankou..."
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

      let attempts = 0;
      const maxAttempts = 10; // 10 * 30s = 5 minút

      const checkPayment = async () => {
        attempts++;
        const res = await reconcileWalletCardPayAction();
        if (res.success && res.successful > 0) {
          clearInterval(interval);
          setNotice(
            amount
              ? `Platba cez Tatra banka CardPay (${amount} €) bola úspešne potvrdená bankou.`
              : "Platba cez Tatra banka CardPay bola úspešne potvrdená bankou."
          );
          const walletRes = await getWalletAction();
          if (walletRes.success && walletRes.enabled) {
            setWalletBalance(walletRes.balanceEur);
            setWalletHighlight(true);
            setTimeout(() => setWalletHighlight(false), 3500);
            restorePendingSlotAfterTopUp();
          }
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setNotice("Platba sa stále spracováva v Tatra banke. Kredit sa definitívne potvrdí automaticky hneď po dokončení v banke.");
        }
      };

      // Prvá kontrola hneď po načítaní
      checkPayment();
      // Následná kontrola každých 30 sekúnd počas 5 minút
      const interval = setInterval(checkPayment, 30000);
      return () => clearInterval(interval);
    } else if (walletStatus === "failed" || walletStatus === "cancelled") {
      setNotice("Platba bola zrušená alebo zlyhala.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [restorePendingSlotAfterTopUp]);

  const courtColumnWidth = 100;
  const timeColumnMinWidth = 64;
    const calendarMinWidth = courtColumnWidth + hours.length * timeColumnMinWidth;
  const calendarColumns = `${courtColumnWidth}px minmax(${hours.length * timeColumnMinWidth}px, 1fr)`;
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
      setLoading(true);
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end = new Date(date); end.setHours(23, 59, 59, 999);
      const result = await fetchBookingsAction(start.toISOString(), end.toISOString());
      if (active && result.success && result.bookings) setItems(result.bookings as Booking[]);
      if (active) setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [date, reload]);

  useEffect(() => {
    const timers = voiceHighlightTimers.current;
    const channel = supabase.channel("newbookings-realtime").on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, (payload) => {
      setReload((value) => value + 1);
      if (currentUser && currentUser.role !== "admin") {
        getWalletAction().then((res) => {
          if (res.success && res.enabled) {
            setWalletBalance(res.balanceEur);
          }
        });
      }

      if (payload.eventType !== "INSERT") return;

      playTennisHitSound();

      const raw = payload.new as any;
      if (!raw?.id) return;

      const bookingId = raw.id;
      setHighlightedVoiceBookings((current) => current.includes(bookingId) ? current : [...current, bookingId]);
      const existingTimer = timers.get(bookingId);
      if (existingTimer) window.clearTimeout(existingTimer);
      const timer = window.setTimeout(() => {
        setHighlightedVoiceBookings((current) => current.filter((id) => id !== bookingId));
        timers.delete(bookingId);
      }, 4500);
      timers.set(bookingId, timer);
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

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(walletChannel);
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, [currentUser]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const visibleCourts = useMemo(() => {
    let result = courts.filter((court) => court.sport === sport);
    if (sport === "tennis-clay" && [0, 6].includes(date.getDay())) result = result.filter((court) => ["tennis-clay-1", "tennis-clay-2"].includes(court.id));
    return result;
  }, [courts, sport, date]);
  const bookings = useMemo(() => items.filter((booking) => booking.status !== "cancelled" && dateKey(new Date(booking.start)) === dateKey(date) && courts.find((court) => court.id === booking.courtId)?.sport === sport), [items, date, courts, sport]);
  const isToday = dateKey(date) === dateKey(now);
  const currentTimePercent = useMemo(() => {
    const elapsedMinutes = (now.getHours() - openingHours.startHour) * 60 + now.getMinutes();
    const totalMinutes = (openingHours.endHour - openingHours.startHour) * 60;
    return Math.max(0, Math.min(100, elapsedMinutes / totalMinutes * 100));
  }, [now]);
  const currentTimeLabel = new Intl.DateTimeFormat("sk-SK", { hour: "2-digit", minute: "2-digit" }).format(now);

    const moveDate = (days: number) => {
    const next = new Date(date); next.setDate(next.getDate() + days); next.setHours(0, 0, 0, 0);
    if (next < today) return;
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
    const courtBookings = bookings.filter((booking) => booking.courtId === courtId);
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

  const openSlot = (courtId: string, hour: number) => {
    if (!currentUser) {
      const pending = { courtId, date: new Date(date), hour };
      setPendingSlot(pending);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(
            "ntc_pending_auth_slot",
            JSON.stringify({
              courtId,
              date: date instanceof Date ? date.toISOString() : new Date(date).toISOString(),
              hour,
            })
          );
        } catch (e) {
          console.warn("Could not save pending auth slot:", e);
        }
      }
      return setAuth("register");
    }
    const start = new Date(date); start.setHours(hour, 0, 0, 0);
    if (currentUser.role !== "admin") {
      if (rolePolicy && !rolePolicy.isActive) return setNotice("Rezervácie sú pre vašu rolu momentálne deaktivované.");
      if (start < now) return setNotice("Rezerváciu v minulosti nie je možné vytvoriť.");
      const options = getAvailableDurationOptions(courtId, start);
      if (!options.length) return setNotice("Do najbližšej rezervácie alebo konca prevádzky nie je voľných aspoň 30 minút.");
      setTitle(""); setPhone(currentUser.phone || ""); setDuration(options.includes(60) ? 60 : options[0]); setMultisportCardsCount(0); setNotice(""); setSlot({ courtId, date: new Date(date), hour });
    } else {
      const options = getAvailableDurationOptions(courtId, start);
      const defaultDuration = options.length > 0 ? (options.includes(60) ? 60 : options[0]) : 60;
      setTitle("Údržba");
      setPhone(currentUser.phone || "");
      setDuration(defaultDuration);
      setMultisportCardsCount(0);
      setNotice("");
      setSlot({ courtId, date: new Date(date), hour });
    }
  };
  const hasConflict = (courtId: string, start: Date, end: Date) => bookings.some((booking) => booking.courtId === courtId && start < new Date(booking.end) && end > new Date(booking.start));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!slot || !currentUser) return;
    const validation = clayError(slot.courtId, sport, slot.hour, duration); if (validation) return setNotice(validation);
    const start = new Date(slot.date); start.setHours(slot.hour, 0, 0, 0); const end = new Date(start.getTime() + duration * 60000);
    if (hasConflict(slot.courtId, start, end)) return setNotice("Vybraný kurt je v tomto čase obsadený.");
    setLoading(true);
    const result = await createBookingAction({
      courtId: slot.courtId,
      title: title.trim() || (currentUser.role === "admin" ? "Údržba / Blokovanie" : (sports.find((item) => item.id === sport)?.label || "Rezervácia")),
      customerName: currentUser.name,
      phone: phone || undefined,
      start: start.toISOString(),
      end: end.toISOString(),
      status: "confirmed",
      source: currentUser.role === "admin" ? "admin" : "web",
      operationId: crypto.randomUUID(),
      multisportCardsCount
    });
    setLoading(false);
    if (!result.success || !result.booking) return setNotice(result.error || "Rezerváciu sa nepodarilo vytvoriť.");
    if (result.wallet && currentUser.role !== "admin") setWalletBalance(result.wallet.balanceEur);
    setItems((current) => [...current, result.booking as Booking]);
    setSlot(null);
    setNotice(
      result.wallet && result.wallet.chargedEur > 0
        ? `Rezervácia bola vytvorená. Odpočítané: ${result.wallet.chargedEur.toFixed(2)} €.`
        : (multisportCardsCount === 2 
            ? "Rezervácia bola úspešne vytvorená so 100% zľavou (2x MultiSport karta zdarma)."
            : (currentUser.role === "admin" ? "Kurt bol úspešne zablokovaný / rezervovaný." : "Rezervácia bola úspešne vytvorená."))
    );
  };
  const remove = async () => {
    if (!deleting) return;
    setLoading(true);
    const result = await deleteBookingAction(deleting.id);
    setLoading(false);
    if (!result.success) {
      setDeleting(null);
      return setNotice(result.error || "Rezerváciu sa nepodarilo zrušiť.");
    }
    if (result.wallet && currentUser?.id === deleting.user_id) {
      setWalletBalance(result.wallet.balanceEur);
    }
    setItems((current) => current.filter((booking) => booking.id !== deleting.id));
    setDeleting(null);
    setDetail(null);
    if (result.wallet && result.wallet.refunded) {
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

  const position = (booking: Booking) => {

    const start = new Date(booking.start); const end = new Date(booking.end); const total = (openingHours.endHour - openingHours.startHour) * 60; const offset = (start.getHours() - openingHours.startHour) * 60 + start.getMinutes();
    return { left: `${offset / total * 100}%`, width: `${(end.getTime() - start.getTime()) / 60000 / total * 100}%` };
  };

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-900" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <header className="relative isolate z-40 border-b border-amber-200/60 bg-gradient-to-r from-yellow-50/70 via-amber-50/60 to-orange-50/70 shadow-[0_10px_35px_rgba(249,115,22,0.06)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-16 -top-24 h-44 w-44 rounded-full bg-yellow-300/25 blur-3xl" />
          <div className="absolute -right-12 -top-28 h-48 w-48 rounded-full bg-orange-300/20 blur-3xl" />
        </div>
        <div className="relative mx-auto flex min-h-[76px] max-w-[1500px] items-center justify-between gap-2 px-4 py-3 sm:min-h-[86px] sm:gap-4 sm:px-6 lg:px-8">
          <Link href="/newbookings" className="group flex shrink-0 items-center transition hover:scale-105 active:scale-95" aria-label="NTC Domov">
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
                      <radialGradient id="ntcTitleBallGrad" cx="35%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="#f7ff57" />
                        <stop offset="60%" stopColor="#d2f500" />
                        <stop offset="100%" stopColor="#9ec200" />
                      </radialGradient>
                    </defs>
                    <circle cx="18" cy="18" r="17.5" fill="url(#ntcTitleBallGrad)" />
                    <path d="M 5,5 C 13,11 13,25 5,31" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" opacity="0.95" />
                    <path d="M 31,5 C 23,11 23,25 31,31" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" opacity="0.95" />
                  </svg>
                </span>
                VÉ CENTRUM
              </span>
            </div>

            {/* Mobile & Mobile App Compact Icon Badge */}
            <div className="flex md:hidden h-11 w-11 flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-1 shadow-md sm:h-12 sm:w-12">
              <span className="text-sm leading-none">🎾</span>
              <span className="mt-0.5 rounded-full bg-[#CCFF00] px-1.5 py-0.5 text-[8px] font-black tracking-wider text-black shadow-xs">NTC</span>
            </div>
          </Link>
          <HolographicTennisCourt />
                    {/* Desktop Horizontal Navigation (md:flex) */}
          {currentUser && (
            <nav className="hidden md:flex items-center gap-3 lg:gap-4 font-sans">
              {currentUser.role === "admin" ? (
                <>
                  {/* Admin 3D Navigation: Používatelia | Štatistiky | Nastavenia */}
                  <div className="flex items-center gap-2 lg:gap-3 mr-6 lg:mr-8">
                    {/* 1. Používatelia */}
                    <Link
                      href="/dashboard/users"
                      className="group relative flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2 min-w-[86px] shadow-2xs backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md active:translate-y-0"
                      title="Správa používateľov"
                    >
                      <div className="transition-transform duration-200 group-hover:scale-108">
                        <ThreeDUserAvatarIcon className="h-7 w-7 lg:h-8 lg:w-8" />
                      </div>
                      <span className="mt-1 text-[12px] font-medium tracking-normal text-slate-600 transition-colors duration-200 group-hover:text-slate-900">
                        Používatelia
                      </span>
                    </Link>

                    {/* 2. Štatistiky */}
                    <Link
                      href="/dashboard/newbookings"
                      className="group relative flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2 min-w-[86px] shadow-2xs backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md active:translate-y-0"
                      title="Prehľad a štatistiky"
                    >
                      <div className="transition-transform duration-200 group-hover:scale-108">
                        <ThreeDChartIcon className="h-7 w-7 lg:h-8 lg:w-8" />
                      </div>
                      <span className="mt-1 text-[12px] font-medium tracking-normal text-slate-600 transition-colors duration-200 group-hover:text-slate-900">
                        Štatistiky
                      </span>
                    </Link>

                    {/* 3. Nastavenia */}
                    <Link
                      href="/dashboard/users-roles"
                      className="group relative flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2 min-w-[86px] shadow-2xs backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md active:translate-y-0"
                      title="Nastavenia systému a rolí"
                    >
                      <div className="transition-transform duration-200 group-hover:scale-108">
                        <ThreeDSettingsIcon className="h-7 w-7 lg:h-8 lg:w-8" />
                      </div>
                      <span className="mt-1 text-[12px] font-medium tracking-normal text-slate-600 transition-colors duration-200 group-hover:text-slate-900">
                        Nastavenia
                      </span>
                    </Link>
                  </div>

                  {/* Admin User Avatar Kocka s Dropdown menu (Transakcie + Odhlásiť) */}
                  <div className="relative" ref={adminMenuRef}>
                    <button
                      type="button"
                      onClick={() => setAdminMenuOpen((prev) => !prev)}
                      className="group relative flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2 min-w-[86px] shadow-2xs backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md active:translate-y-0 cursor-pointer"
                      aria-expanded={adminMenuOpen}
                      aria-haspopup="true"
                      title="Používateľské menu"
                    >
                      <div className="transition-transform duration-200 group-hover:scale-108">
                        <TennisBallAvatar name={currentUser.name} className="h-7 w-7 lg:h-8 lg:w-8" textSize="text-[10px]" />
                      </div>
                      <span className="mt-1 flex items-center justify-center gap-1 text-[12px] font-medium tracking-normal text-slate-600 transition-colors duration-200 group-hover:text-slate-900">
                        <span className="max-w-[76px] truncate">{currentUser.name}</span>
                        <ChevronDown className={`h-3 w-3 shrink-0 text-slate-400 transition-transform duration-200 ${adminMenuOpen ? "rotate-180 text-slate-700" : "group-hover:text-slate-600"}`} />
                      </span>
                    </button>

                    {/* Dropdown Menu pre Admin User */}
                    {adminMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-64 origin-top-right rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150 font-sans">
                        {/* Hlavička dropdownu */}
                        <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1 border-b border-slate-100 bg-slate-50/70 rounded-xl">
                          <TennisBallAvatar name={currentUser.name} className="h-8 w-8" textSize="text-[11px]" />
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold text-slate-900">{currentUser.name}</span>
                            <span className="block truncate text-[10.5px] font-normal text-slate-500">Administrátor</span>
                          </div>
                        </div>

                        {/* Transakcie presunuté do avatara */}
                        <Link
                          href="/dashboard/admin-transactions"
                          onClick={() => setAdminMenuOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition duration-150 group"
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
                          onClick={async () => {
                            setAdminMenuOpen(false);
                            if (!window.confirm("Chcete sa naozaj odhlásiť?")) return;
                            await logoutAction();
                            router.refresh();
                          }}
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
                /* Non-admin používateľ */
                <>
                  <div className="flex items-center gap-1.5 lg:gap-2 mr-3 lg:mr-6">
                    <Link
                      href="/dashboard/newbookings"
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs backdrop-blur-md transition hover:border-indigo-300 hover:bg-indigo-50/70 hover:text-indigo-700"
                    >
                      <LayoutDashboard className="h-4 w-4 text-indigo-600" />
                      <span>Štatistiky</span>
                    </Link>

                    <Link
                      href="/dashboard/transactions"
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs backdrop-blur-md transition hover:border-emerald-300 hover:bg-emerald-50/70 hover:text-emerald-700"
                    >
                      <Coins className="h-4 w-4 text-emerald-600" />
                      <span>Moje transakcie</span>
                    </Link>
                  </div>

                  <div className="flex items-center gap-2">
                    {walletBalance !== null && (
                      <div
                        className={`flex items-center gap-2 rounded-xl border bg-white/95 px-3 py-2 text-slate-900 shadow-2xs backdrop-blur-xl transition-all duration-500 ${
                          walletHighlight
                            ? "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-300/80 scale-105"
                            : "border-[#d2f500]"
                        }`}
                        title="Aktuálny kredit"
                      >
                        <Coins className={`h-4 w-4 shrink-0 transition-transform duration-500 ${walletHighlight ? "text-emerald-600 scale-125" : "text-slate-700"}`} />
                        <span className="text-xs font-medium text-slate-700">Kredit:</span>
                        <strong className="text-xs lg:text-sm font-semibold text-slate-900">{walletBalance.toFixed(2)} €</strong>
                      </div>
                    )}

                    <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5 shadow-2xs">
                      <TennisBallAvatar name={currentUser.name} className="h-7 w-7" textSize="text-[10px]" />
                      <span className="text-xs font-medium text-slate-800 max-w-[130px] truncate">{currentUser.name}</span>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm("Chcete sa naozaj odhlásiť?")) return;
                        await logoutAction();
                        router.refresh();
                      }}
                      className="flex items-center gap-1.5 rounded-xl border border-red-200/80 bg-red-50/60 px-3 py-2 text-xs font-medium text-red-600 shadow-2xs transition hover:bg-red-600 hover:text-white cursor-pointer"
                      title="Odhlásiť sa"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="hidden xl:inline">Odhlásiť</span>
                    </button>
                  </div>
                </>
              )}
            </nav>
          )}

          {/* Mobile Popover Dropdown (md:hidden) */}
          {currentUser ? (
            <div className="md:hidden relative z-50 flex items-center gap-2" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="shrink-0 cursor-pointer rounded-full p-0.5 transition hover:-translate-y-0.5 active:translate-y-0"
                title={currentUser.name}
                aria-label="Používateľské menu"
                aria-expanded={userMenuOpen}
              >
                <TennisBallAvatar name={currentUser.name} className="h-10 w-10" textSize="text-xs" />
              </button>


              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2.5 w-64 origin-top-right rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-3 mb-1">
                    <TennisBallAvatar name={currentUser.name} className="h-10 w-10" textSize="text-sm" />
                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-sm font-bold text-slate-900">{currentUser.name}</b>
                      {currentUser.role === "admin" && (
                        <span className="block truncate text-[11px] font-semibold text-indigo-600">
                          Administrátor
                        </span>
                      )}
                    </div>
                  </div>

                  {currentUser.role !== "admin" && walletBalance !== null && (
                    <div className="mb-1 rounded-xl bg-gradient-to-br from-yellow-50/90 via-amber-50/80 to-orange-50/60 p-3 text-slate-900 border border-amber-200/70 shadow-xs">
                      <div className="flex items-center justify-between text-sm font-bold text-slate-900">
                        <span className="flex items-center gap-2"><Coins className="h-4 w-4 text-slate-700" /> Peňaženka</span>
                        <span className="text-slate-900">{walletBalance.toFixed(2)} €</span>
                      </div>
                                            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Stripe test mode</p>
                      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                        {[10, 20, 50].map((amount) => (
                          <button
                            key={`stripe-${amount}`}
                            type="button"
                            disabled={topUpLoading !== null}
                            onClick={() => startTopUp(amount, "stripe")}
                            className="cursor-pointer rounded-lg border border-amber-200/80 bg-white/90 px-2 py-2 text-xs font-extrabold text-slate-900 shadow-xs transition hover:border-amber-400 hover:bg-white disabled:cursor-wait disabled:opacity-50"
                          >
                            {topUpLoading === amount ? "..." : `+${amount} €`}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-sky-700">Tatra banka CardPay sandbox</p>
                      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                        {[10, 20, 50].map((amount) => (
                          <button
                            key={`cardpay-${amount}`}
                            type="button"
                            disabled={topUpLoading !== null}
                            onClick={() => startTopUp(amount, "cardpay")}
                            className="cursor-pointer rounded-lg border border-sky-200 bg-white/90 px-2 py-2 text-xs font-extrabold text-sky-700 shadow-xs transition hover:border-sky-400 hover:bg-sky-50 disabled:cursor-wait disabled:opacity-50"
                          >
                            {topUpLoading === amount ? "..." : `+${amount} €`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}


                  <div className="space-y-1">
                    {currentUser.role !== "admin" && (
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
                    )}

                    <Link
                      href="/dashboard/newbookings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition duration-150 group"
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition duration-150">
                        <LayoutDashboard className="h-4 w-4" />
                      </span>
                      <span>Moje štatistiky</span>
                    </Link>

                                        {currentUser.role === "admin" && (
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
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 transition duration-150 hover:bg-violet-50 hover:text-violet-700 sm:text-sm group"
                        >
                          <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition duration-150">
                            <Settings className="h-4 w-4" />
                          </span>
                          <span>Nastavenia</span>
                        </Link>
                      </>
                    )}

                    <button
                      onClick={async () => {
                        setUserMenuOpen(false);
                        if (!window.confirm("Chcete sa naozaj odhlásiť?")) return;
                        await logoutAction();
                        router.refresh();
                      }}
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
          ) : (
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => setAuth("register")}
                className="group flex cursor-pointer items-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white/90 px-3 py-2.5 text-xs font-bold text-slate-800 shadow-xs backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-50/60 hover:text-amber-950 sm:gap-2 sm:px-4 sm:text-sm"
              >
                <UserPlus className="h-4 w-4 text-amber-600 transition-transform duration-200 group-hover:scale-110" />
                <span>Registrovať sa</span>
              </button>
              <button
                onClick={() => setAuth("login")}
                className="group flex cursor-pointer items-center gap-1.5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-3.5 py-2.5 text-xs font-bold text-white shadow-[0_8px_22px_rgba(15,23,42,0.22)] border border-slate-800 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.32)] hover:border-slate-700 sm:gap-2 sm:px-5 sm:text-sm"
              >
                <LogIn className="h-4 w-4 text-amber-400 transition-transform duration-200 group-hover:translate-x-0.5" />
                <span>Prihlásiť</span>
              </button>
            </div>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
      </header>
      <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:py-8">
        <div className="mx-auto mb-6 flex w-full max-w-5xl flex-col items-center px-1 text-center sm:mb-8 sm:px-4">
          <h1 className="max-w-4xl text-balance text-3xl font-semibold leading-[1.15] tracking-[-0.035em] text-slate-950 sm:text-4xl md:text-5xl" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>Komplexný rezervačný systém hlasového asistenta Telio</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:mt-5 sm:text-base sm:leading-7">Webové aj hlasové rezervácie sa zobrazujú v jednom aktuálnom a prehľadnom kalendári.</p>
        </div>
        <AnimatePresence mode="wait">
          {notice && (
            <motion.div
              key={notice}
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98, transition: { duration: 0.35, ease: "easeInOut" } }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative mb-5 overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-r from-yellow-50/95 via-amber-50/90 to-orange-50/95 p-4 text-left shadow-[0_6px_20px_rgba(245,158,11,0.12)] backdrop-blur-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-900 text-sm">
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
        <section className="overflow-hidden rounded-3xl border-2 border-slate-300 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.10)]">
          <div className="border-b border-slate-200 p-4 sm:p-6">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{sports.map((item) => <button key={item.id} onClick={() => setSport(item.id)} className={`cursor-pointer rounded-xl border p-3 text-sm font-bold transition duration-200 ${sport === item.id ? "border-slate-950 bg-slate-950 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 shadow-[0_2px_8px_rgba(15,23,42,0.04)] hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm"}`}>{item.label}</button>)}</div>
            <div className="mt-5 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-5 md:flex-row">
              <button
                onClick={() => setDate(new Date())}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold shadow-xs hover:border-slate-400 hover:bg-slate-50 transition"
              >
                Dnes
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => moveDate(-1)}
                  className="cursor-pointer rounded-xl border border-slate-200 p-3 shadow-xs hover:border-slate-400 hover:bg-slate-50 transition"
                  aria-label="Predchádzajúci deň"
                >
                  <ChevronLeft className="h-4 w-4 text-slate-700" />
                </button>
                <button
                  type="button"
                  onClick={() => setDatePickerOpen(true)}
                  className="flex min-w-[200px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-bold text-slate-800 shadow-xs transition hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700 sm:min-w-[280px]"
                  aria-haspopup="dialog"
                >
                  <CalendarDays className="h-4.5 w-4.5 text-emerald-600" />
                  {new Intl.DateTimeFormat("sk-SK", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(date)}
                </button>
                <button
                  onClick={() => moveDate(1)}
                  className="cursor-pointer rounded-xl border border-slate-200 p-3 shadow-xs hover:border-slate-400 hover:bg-slate-50 transition"
                  aria-label="Nasledujúci deň"
                >
                  <ChevronRight className="h-4 w-4 text-slate-700" />
                </button>
              </div>
              <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Clock className="h-4 w-4 text-slate-400" /> Max. 14 dní
              </span>
            </div>
          </div>
          <div className="overflow-auto border-t-2 border-slate-300 bg-white">
            <div className="w-full" style={{ minWidth: `${calendarMinWidth}px` }}>
              <div className="grid border-b-2 border-slate-300 bg-gradient-to-b from-slate-50 to-slate-100/70" style={{ gridTemplateColumns: calendarColumns }}>
                <b className="sticky left-0 z-30 border-r-2 border-slate-300 bg-slate-50 p-4 text-xs font-extrabold tracking-wide text-slate-600">KURT</b>
                <div className="relative grid" style={{ gridTemplateColumns: timeColumns }}>
                  {hours.map((hour, index) => (
                    <b key={hour} className={`${index === hours.length - 1 ? "" : "border-r border-slate-200"} p-4 text-center text-xs font-bold text-slate-500`}>{hour}:00</b>
                  ))}
                  {isToday && currentTimePercent > 0 && currentTimePercent < 100 && (
                    <div className="pointer-events-none absolute inset-y-0 z-20 border-l-2 border-dashed border-[#CCFF00]" style={{ left: `${currentTimePercent}%` }}>
                      <span className="absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#CCFF00] px-2 py-1 text-[9px] font-black text-black shadow-md border border-[#99CC00]">{currentTimeLabel}</span>
                    </div>
                  )}
                </div>
              </div>
              {visibleCourts.map((court) => (
                <div key={court.id} className="grid border-b border-slate-200" style={{ gridTemplateColumns: calendarColumns }}>
                  <div className="sticky left-0 z-20 flex min-h-20 flex-col justify-center border-r-2 border-slate-300 bg-gradient-to-r from-white to-slate-50/80 px-4 shadow-[3px_0_10px_rgba(15,23,42,0.03)]">
                    <b className="text-slate-900">{court.name}</b>
                    <small className="mt-0.5 text-slate-500">{court.surface}</small>
                  </div>
                  <div className="relative grid" style={{ gridTemplateColumns: timeColumns }}>
                    {hours.map((hour, index) => {
                      const label = blockedLabel(court.id, sport, hour);
                      const past = new Date(date).setHours(hour, 0, 0, 0) < now.getTime();
                      const rightBorder = index === hours.length - 1 ? "" : "border-r border-slate-200";
                      return label ? (
                        <div key={hour} className={`grid min-h-20 cursor-not-allowed place-items-center bg-amber-50 px-1 text-center text-[10px] font-bold text-amber-700 ${rightBorder}`}>{label}</div>
                      ) : past ? (
                        <div key={hour} className={`min-h-20 cursor-not-allowed bg-slate-100 ${rightBorder}`} />
                      ) : (
                        <button key={hour} onClick={() => openSlot(court.id, hour)} className={`group grid min-h-20 cursor-pointer place-items-center transition-colors duration-200 hover:bg-emerald-50/80 ${rightBorder}`}>
                          <Plus className="h-4 w-4 text-emerald-500 opacity-0 group-hover:opacity-100" />
                        </button>
                      );
                    })}
                    {isToday && currentTimePercent > 0 && (
                      <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] border-r border-slate-300/80" style={{ width: `${currentTimePercent}%`, background: "repeating-linear-gradient(135deg, rgba(148,163,184,0.12) 0px, rgba(148,163,184,0.12) 5px, rgba(241,245,249,0.38) 5px, rgba(241,245,249,0.38) 10px)" }} />
                    )}
                    <div className="pointer-events-none absolute inset-0 z-10">
                      {bookings.filter((booking) => booking.courtId === court.id).map((booking) => {
                        const isAdmin = currentUser?.role === "admin";
                        const own = !!currentUser && currentUser.id === booking.user_id;
                        const canManage = own || isAdmin;
                        const voiceHighlight = highlightedVoiceBookings.includes(booking.id);
                        const isTrainer = booking.userRole === "trainer";
                        const isAdminBlock = booking.source === "admin" && !booking.user_id;

                        // Decide styling and text based on role
                        let bookingClasses = "";
                        let labelText = "";
                        const isDarkText = isAdmin && !isTrainer && !isAdminBlock;

                        if (isAdmin) {
                          labelText = booking.customerName || booking.title || "Rezervácia";
                          if (isTrainer) {
                            // Fialová / Purpurová presne podľa NTC dispečingu s čiernym textom
                            bookingClasses = "border-[#6025B8] bg-[#8648E8] text-black font-bold shadow-xs hover:bg-[#965EF0]";
                          } else if (isAdminBlock) {
                            // Admin blokácia
                            bookingClasses = "border-slate-800 bg-slate-900 text-white shadow-xs hover:bg-slate-800";
                          } else {
                            // Sýta čistá žltá presne podľa NTC dispečingu s čiernym textom
                            bookingClasses = "border-[#C5BC00] bg-[#ECE81A] text-black font-bold shadow-xs hover:bg-[#F7F438]";
                          }
                        } else {
                          labelText = own ? "Vaša rezervácia" : "Obsadené";
                          if (own) {
                            bookingClasses = "border-emerald-300/90 bg-gradient-to-br from-[#15803D] via-[#16A34A] to-[#14532D] text-white shadow-[0_4px_14px_rgba(22,163,74,0.35)]";
                          } else {
                            bookingClasses = "border-orange-300/90 bg-gradient-to-br from-[#D95A3F] via-[#E26A4F] to-[#C44B31] text-white shadow-[0_4px_14px_rgba(180,83,9,0.35)]";
                          }
                        }

                        return (
                          <button
                            key={booking.id}
                            onClick={() => canManage && setDetail(booking)}
                            className={`pointer-events-auto absolute inset-y-1 overflow-hidden rounded-lg border px-1 py-0.5 text-center transition duration-150 hover:scale-[1.01] flex flex-col items-center justify-center ${
                              voiceHighlight ? "voice-booking-highlight" : ""
                            } ${canManage ? "cursor-pointer" : "cursor-not-allowed"} ${bookingClasses}`}
                            style={position(booking)}
                            title={canManage ? `Detail: ${labelText}` : "Obsadené"}
                          >
                            {!isAdmin && (
                              <div className="pointer-events-none absolute inset-0 opacity-25">
                                <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none">
                                  <rect x="5" y="5" width="90" height="90" fill="none" stroke="#FFFFFF" strokeWidth="3" />
                                  <line x1="50" y1="5" x2="50" y2="95" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="6,4" />
                                </svg>
                              </div>
                            )}
                            {voiceHighlight && (
                              <>
                                <div className="pointer-events-none absolute inset-0 z-30 overflow-visible">
                                  <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                                    <rect
                                      x="2"
                                      y="2"
                                      width="96"
                                      height="96"
                                      rx="8"
                                      ry="8"
                                      fill="none"
                                      stroke="url(#orangeAgencyLaserGrad)"
                                      strokeWidth="7"
                                      className="laser-perimeter-beam"
                                    />
                                    <defs>
                                      <linearGradient id="orangeAgencyLaserGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#FFF500" />
                                        <stop offset="35%" stopColor="#FF6B00" />
                                        <stop offset="70%" stopColor="#FF0055" />
                                        <stop offset="100%" stopColor="#FFD700" />
                                      </linearGradient>
                                    </defs>
                                  </svg>
                                </div>
                                <span className="voice-booking-scan" aria-hidden="true" />
                              </>
                            )}

                            {isAdmin ? (
                              <div className="relative z-[1] flex flex-col items-center justify-center w-full px-0.5 text-center text-[clamp(9px,0.72vw,12.5px)] font-bold leading-tight select-none pointer-events-none">
                                {labelText.split(" ").filter(Boolean).map((part, idx) => (
                                  <span key={idx} className="block leading-[1.15] break-words max-w-full">
                                    {part}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <>
                                <b className="relative z-[1] block whitespace-normal break-words text-[clamp(8px,0.7vw,12px)] font-black leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] [overflow-wrap:anywhere]">
                                  <span className="block">{formatTime(booking.start)}</span>
                                  <span className="block leading-[0.55]" aria-hidden="true">–</span>
                                  <span className="block">{formatTime(booking.end)}</span>
                                </b>
                                <span className="relative z-[1] mt-0.5 block whitespace-normal break-words text-[clamp(7px,0.6vw,10px)] font-black leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] [overflow-wrap:anywhere]">
                                  {labelText}
                                </span>
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {isToday && currentTimePercent > 0 && currentTimePercent < 100 && (
                      <div className="pointer-events-none absolute inset-y-0 z-20 border-l-2 border-dashed border-[#CCFF00] drop-shadow-sm" style={{ left: `${currentTimePercent}%` }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <div className="mt-5 flex flex-wrap items-center gap-6 text-sm font-semibold">
          {currentUser?.role === "admin" ? (
            <>
              <span className="flex items-center gap-2">
                <i className="h-3.5 w-3.5 rounded-md border border-[#C5BC00] bg-[#ECE81A] shadow-xs" />
                Klient (NTC karta / bežný)
              </span>
              <span className="flex items-center gap-2">
                <i className="h-3.5 w-3.5 rounded-md border border-[#6025B8] bg-[#8648E8] shadow-xs" />
                Tréner
              </span>
              <span className="flex items-center gap-2">
                <i className="h-3.5 w-3.5 rounded-md border border-slate-800 bg-slate-900 shadow-xs" />
                Admin blokácia
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-2">
                <i className="h-3.5 w-3.5 rounded-md border border-emerald-400 bg-gradient-to-br from-[#15803D] to-[#14532D] shadow-xs" />
                Vaša rezervácia
              </span>
              <span className="flex items-center gap-2">
                <i className="h-3.5 w-3.5 rounded-md border border-orange-300 bg-gradient-to-br from-[#D95A3F] to-[#C44B31] shadow-xs" />
                Obsadené
              </span>
            </>
          )}
          {loading && <span className="text-slate-500 font-normal">Aktualizujem...</span>}
        </div>
      </main>
      {datePickerOpen && <DatePicker value={date} min={today} max={maxDate} horizonDays={bookingHorizonDays} onSelect={(selected) => selectDate(dateKey(selected))} onClose={() => setDatePickerOpen(false)} />}
      {auth && (
        <NewBookingAuth
          mode={auth}
          onClose={() => {
            setAuth(null);
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
          durationOptions={getAvailableDurationOptions(slot.courtId, new Date(new Date(slot.date).setHours(slot.hour, 0, 0, 0)))}
          discountEurPerHour={rolePolicy?.discountEurPerHour ?? 0}
          multisportCardsCount={multisportCardsCount}
          onMultisportCardsCount={setMultisportCardsCount}
          title={title}
          phone={phone}
          isAdmin={currentUser?.role === "admin"}
          hasCard={Boolean(currentUser?.cardNumber && currentUser.cardNumber.trim().length > 0)}
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
            if (typeof window !== "undefined") {
              sessionStorage.removeItem("ntc_pending_auth_slot");
            }
          }}
          onSubmit={submit}
        />
      )}
      {detail && <BookingDetailDialog booking={detail} court={courts.find((court) => court.id === detail.courtId)} canManage={!!currentUser && (currentUser.role === "admin" || currentUser.id === detail.user_id)} canCancel={currentUser?.role === "admin" || new Date(detail.start).getTime() - now.getTime() > (rolePolicy?.cancellationDeadlineHours ?? 24) * 60 * 60 * 1000} cancellationDeadlineHours={rolePolicy?.cancellationDeadlineHours ?? 24} onClose={() => setDetail(null)} onDelete={() => setDeleting(detail)} />}
      {deleting && <DeleteDialog loading={loading} error={notice || undefined} onCancel={() => { setDeleting(null); setNotice(""); }} onConfirm={remove} />}
      <style jsx global>{`
        @keyframes orange-laser-perimeter-trace {
          0% {
            stroke-dashoffset: 400;
            opacity: 1;
            filter: drop-shadow(0 0 10px #FF6B00) drop-shadow(0 0 20px #FFD700);
          }
          85% {
            stroke-dashoffset: 0;
            opacity: 1;
            filter: drop-shadow(0 0 14px #FF4500) drop-shadow(0 0 28px #FFD700);
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 0;
          }
        }
        @keyframes orange-tile-agency-pulse {
          0% {
            box-shadow: 0 0 0 2px #FF6B00, 0 0 20px rgba(255, 107, 0, 0.9), inset 0 0 15px rgba(255, 215, 0, 0.6);
            transform: scale(1.02);
          }
          20% {
            box-shadow: 0 0 0 4px #FF9E00, 0 0 35px rgba(255, 158, 0, 1), inset 0 0 22px rgba(255, 215, 0, 0.8);
            transform: scale(1.06);
          }
          40% {
            box-shadow: 0 0 0 2px #FF6B00, 0 0 22px rgba(255, 107, 0, 0.9), inset 0 0 15px rgba(255, 215, 0, 0.6);
            transform: scale(1.03);
          }
          60% {
            box-shadow: 0 0 0 4px #FF9E00, 0 0 38px rgba(255, 158, 0, 1), inset 0 0 24px rgba(255, 215, 0, 0.8);
            transform: scale(1.06);
          }
          80% {
            box-shadow: 0 0 0 2px #FF6B00, 0 0 25px rgba(255, 107, 0, 0.8);
            transform: scale(1.03);
            opacity: 1;
          }
          100% {
            box-shadow: none;
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes orange-glossy-sweep {
          0% { transform: translateX(-120%) rotate(15deg); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateX(250%) rotate(15deg); opacity: 0; }
        }
        .voice-booking-highlight {
          animation: orange-tile-agency-pulse 4s cubic-bezier(0.25, 1, 0.5, 1) forwards !important;
          z-index: 50 !important;
        }
        .laser-perimeter-beam {
          stroke-dasharray: 400;
          stroke-dashoffset: 400;
          animation: orange-laser-perimeter-trace 4s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .voice-booking-scan {
          position: absolute;
          inset: -10px;
          pointer-events: none;
          background: linear-gradient(115deg, transparent 20%, rgba(255, 215, 0, 0.4) 40%, rgba(255, 255, 255, 0.95) 50%, rgba(255, 107, 0, 0.5) 60%, transparent 80%);
          filter: blur(2px);
          animation: orange-glossy-sweep 4s ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .voice-booking-highlight { animation: none; border-color: rgba(255, 107, 0, 0.95); }
          .laser-perimeter-beam { display: none; }
          .voice-booking-scan { display: none; }
        }
      `}</style>
    </div>
  );
}
