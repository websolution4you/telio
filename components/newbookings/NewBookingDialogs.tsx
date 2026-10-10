"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Calendar, CalendarSync, ChevronDown, ChevronLeft, ChevronRight, Clock3, Coins, CreditCard, List, Loader2, MessageSquare, Phone, Repeat, Sparkles, Trash2, User, X } from "lucide-react";
import type { Booking, Court } from "@/lib/bookings/mockBookings";
import { calculateNtcBookingPrice } from "@/lib/bookings/pricing";
import { formatDuration } from "@/lib/bookings/rolePolicy";
import { fetchSeriesBookingsAction } from "@/app/actions/bookings";

export const ADMIN_BLOCK_OPTIONS = [
  { value: "Údržba kurtov", color: "#FFC9C9", border: "#F29E9E" },
  { value: "Rezervácia Admin", color: "#DCC7F0", border: "#C0A0E0" },
  { value: "Tréningy", color: "#F4CDE4", border: "#EAAECF" },
] as const;

export const DAYS_OF_WEEK = [
  { id: 1, label: "Po", full: "Pondelok" },
  { id: 2, label: "Ut", full: "Utorok" },
  { id: 3, label: "St", full: "Streda" },
  { id: 4, label: "Št", full: "Štvrtok" },
  { id: 5, label: "Pi", full: "Piatok" },
  { id: 6, label: "So", full: "Sobota" },
  { id: 0, label: "Ne", full: "Nedeľa" },
] as const;

export function countRecurringOccurrences(
  startDate: Date,
  untilDateStr: string,
  frequencyWeeks: number,
  selectedDays: number[],
  repeatFrequency: "daily" | "weekly" | "monthly" | "yearly" = "weekly"
): number {
  if (!untilDateStr) return 0;
  const endDate = new Date(untilDateStr + "T23:59:59");
  if (isNaN(endDate.getTime()) || endDate < startDate) return 0;

  let count = 0;

  if (repeatFrequency === "daily") {
    let current = new Date(startDate);
    while (current <= endDate && count < 1500) {
      count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  }

  if (repeatFrequency === "monthly") {
    let current = new Date(startDate);
    const origDay = startDate.getDate();
    while (current <= endDate && count < 1500) {
      count++;
      current = new Date(current.getFullYear(), current.getMonth() + 1, origDay, startDate.getHours(), startDate.getMinutes(), 0, 0);
    }
    return count;
  }

  if (repeatFrequency === "yearly") {
    let current = new Date(startDate);
    while (current <= endDate && count < 1500) {
      count++;
      current = new Date(current.getFullYear() + 1, current.getMonth(), current.getDate(), startDate.getHours(), startDate.getMinutes(), 0, 0);
    }
    return count;
  }

  // "weekly"
  if (selectedDays.length === 0) return 0;
  let currentWeekBase = new Date(startDate);
  const dayOfWeekIndex = (currentWeekBase.getDay() + 6) % 7;
  currentWeekBase.setDate(currentWeekBase.getDate() - dayOfWeekIndex);
  currentWeekBase.setHours(0, 0, 0, 0);

  const freq = frequencyWeeks === 2 ? 2 : 1;

  while (currentWeekBase <= endDate && count < 1500) {
    for (const dow of selectedDays) {
      const dayOffset = (dow === 0 ? 7 : dow) - 1;
      const slotDate = new Date(currentWeekBase);
      slotDate.setDate(slotDate.getDate() + dayOffset);
      slotDate.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);

      if (slotDate.getTime() >= startDate.getTime() && slotDate.getTime() <= endDate.getTime()) {
        count++;
      }
    }
    currentWeekBase.setDate(currentWeekBase.getDate() + 7 * freq);
  }

  return count;
}

type CreateDialogProps = {
  court?: Court;
  date: Date;
  hour: number;
  duration: number;
  title: string;
  phone: string;
  adminBlockType?: string;
  onAdminBlockType?: (value: string) => void;
  hasCard?: boolean;
  isAdmin?: boolean;
  canMakeRecurring?: boolean;
  isRecurring?: boolean;
  onIsRecurring?: (value: boolean) => void;
  repeatFrequency?: "daily" | "weekly" | "monthly" | "yearly";
  onRepeatFrequency?: (freq: "daily" | "weekly" | "monthly" | "yearly") => void;
  frequencyWeeks?: number;
  onFrequencyWeeks?: (value: number) => void;
  daysOfWeek?: number[];
  onDaysOfWeek?: (days: number[]) => void;
  untilDate?: string;
  onUntilDate?: (dateStr: string) => void;
  repeatWeeks?: number;
  onRepeatWeeks?: (value: number) => void;
  clientPlayerName?: string;
  onClientPlayerName?: (value: string) => void;
  hasMultisport?: boolean;
  userDiscountTierId?: string;
  durationOptions: number[];
  discountEurPerHour: number;
  multisportCardsCount: 0 | 1 | 2;
  onMultisportCardsCount: (count: 0 | 1 | 2) => void;
  error?: string;
  loading: boolean;
  walletBalance?: number | null;
  onTopUp?: (amountEur: number, provider: "stripe" | "cardpay") => Promise<void>;
  topUpLoading?: number | null;
  onDuration: (value: number) => void;
  onTitle: (value: string) => void;
  onPhone: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
};

export function formatCourtDisplayName(court?: Court): string {
  if (!court) return "Kurt";

  let prefix = "";
  if (court.sport === "tennis-clay") {
    prefix = "Tenis Antuka";
  } else if (court.sport === "tennis") {
    prefix = court.surface && !court.surface.toLowerCase().includes("tennis")
      ? `Tenis ${court.surface}`
      : "Tenis";
  } else if (court.sport === "badminton") {
    prefix = "Bedminton";
  } else if (court.sport === "squash") {
    prefix = "Squash";
  } else {
    prefix = court.surface || court.sport || "";
  }

  if (prefix && !court.name.toLowerCase().startsWith(prefix.toLowerCase())) {
    return `${prefix} ${court.name}`.trim();
  }
  return court.name;
}

export function CreateBookingDialog(props: CreateDialogProps) {
  const [adminBlockTypeOpen, setAdminBlockTypeOpen] = useState(false);
  const currentBlockType = props.adminBlockType || "Údržba kurtov";
  const selectedOption = ADMIN_BLOCK_OPTIONS.find((opt) => opt.value === currentBlockType) || ADMIN_BLOCK_OPTIONS[0];

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const bookingDate = new Date(props.date);
  bookingDate.setHours(props.hour, 0, 0, 0);

  const selectedDays = props.daysOfWeek && props.daysOfWeek.length > 0 ? props.daysOfWeek : [bookingDate.getDay()];
  const frequencyWeeks = props.frequencyWeeks === 2 ? 2 : 1;
  const repeatFrequency = props.repeatFrequency || "weekly";
  const occurrencesCount = props.isRecurring
    ? countRecurringOccurrences(bookingDate, props.untilDate || "", frequencyWeeks, selectedDays, repeatFrequency)
    : 1;

  const pricing = calculateNtcBookingPrice(
    props.court?.sport || "badminton",
    bookingDate,
    props.duration,
    Boolean(props.hasCard),
    props.discountEurPerHour,
    props.multisportCardsCount,
    undefined,
    props.userDiscountTierId
  );

  const userBalanceCents = typeof props.walletBalance === "number" ? Math.round(props.walletBalance * 100) : null;
  const totalPriceCents = Math.round(pricing.totalPriceEur * 100);

  // Používateľ má nedostatočný kredit LEN vtedy, ak má na účte skutočne menej centov ako je cena
  const isInsufficientCredit =
    !props.isAdmin &&
    pricing.totalPriceEur > 0 &&
    userBalanceCents !== null &&
    userBalanceCents < totalPriceCents;

  const missingEur = Math.max(0, Math.round(totalPriceCents - (userBalanceCents ?? 0)) / 100);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4">
      <button aria-label="Zavrieť" className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={props.onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-8">
        <DialogHeader
          title={props.isAdmin ? "Administrátorská rezervácia" : "Nová rezervácia"}
          subtitle={props.isAdmin ? "Výber dôvodu blokovania kurtu a voliteľná poznámka." : "Skontrolujte vybraný termín a potvrďte rezerváciu."}
          onClose={props.onClose}
        />

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs sm:mb-5 sm:p-3.5 sm:text-sm">
          <Info label="Športovisko" value={formatCourtDisplayName(props.court)} />
          <Info label="Dátum" value={new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "long", year: "numeric" }).format(props.date)} />
          <Info label="Začiatok" value={`${String(props.hour).padStart(2, "0")}:00`} />
          <Info label="Trvanie" value={`${props.duration} min.`} />
          <div className="col-span-2 flex items-baseline gap-2 flex-wrap pt-0.5">
            <span className="font-semibold text-slate-600">{props.isAdmin ? "Platba / Kredit:" : "Cena rezervácie:"}</span>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              {props.isAdmin ? (
                <span className="rounded-md border border-violet-300 bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-700">
                  Admin blokovanie (bez kreditu)
                </span>
              ) : (
                <>
                  {pricing.originalPriceEur > pricing.totalPriceEur && (
                    <span className="text-xs sm:text-sm text-slate-400 line-through mr-1 font-semibold">
                      {pricing.originalPriceEur.toFixed(2)} €
                    </span>
                  )}
                  <span className="text-base font-black text-slate-950 sm:text-lg">
                    {pricing.formattedPrice}
                  </span>
                  {Boolean(pricing.userDiscountEur && pricing.userDiscountEur > 0) && (
                    <span className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 shadow-2xs">
                      {pricing.userDiscountTierName || "Zľava"}: -{(pricing.userDiscountEur || 0).toFixed(2)} €
                    </span>
                  )}
                  {Boolean(pricing.nonMemberSurchargeEur && pricing.nonMemberSurchargeEur > 0) && (
                    <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-850 shadow-2xs">
                      +{(pricing.nonMemberSurchargeEur || 2).toFixed(2)} € bez registrácie
                    </span>
                  )}
                  {pricing.multisportCardsCount === 1 && (
                    <span className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 shadow-2xs">
                      MultiSport 1x
                    </span>
                  )}
                  {pricing.multisportCardsCount === 2 && (
                    <span className="rounded-md border border-emerald-500 bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                      MultiSport 2x (Zdarma)
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {isInsufficientCredit && props.onTopUp ? (
          <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50/80 p-3 sm:p-3.5 shadow-2xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Coins className="h-4 w-4" />
                </div>
                <div className="min-w-0 text-xs">
                  <h4 className="font-bold text-slate-900 leading-tight">Nedostatočný zostatok v peňaženke</h4>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Aktuálny kredit: <b className="text-slate-900">{(props.walletBalance ?? 0).toFixed(2)} €</b> • Chýba: <b className="text-amber-700">{missingEur.toFixed(2)} €</b>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                <button
                  type="button"
                  disabled={props.topUpLoading !== null}
                  onClick={() => props.onTopUp!(missingEur, "cardpay")}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-sky-700 active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                  title={`Dobiť presne ${missingEur.toFixed(2)} € na pokrytie tejto rezervácie`}
                >
                  {props.topUpLoading === missingEur ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Presmerovávam...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-3.5 w-3.5" />
                      <span>Dobiť {missingEur.toFixed(2)} €</span>
                    </>
                  )}
                </button>

                {[10, 20, 50]
                  .filter((amount) => Math.abs(amount - missingEur) > 0.01)
                  .map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      disabled={props.topUpLoading !== null}
                      onClick={() => props.onTopUp!(amount, "cardpay")}
                      className="flex items-center justify-center rounded-xl border border-sky-300 bg-white/95 px-2.5 py-2 text-xs font-bold text-sky-800 shadow-2xs transition hover:bg-sky-50 active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                      title={`Dobiť ${amount} € cez CardPay`}
                    >
                      {props.topUpLoading === amount ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mx-1" />
                      ) : (
                        `+${amount} €`
                      )}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        ) : props.error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 sm:text-sm">
            {props.error}
          </div>
        ) : null}

        <form onSubmit={props.onSubmit} className="space-y-3.5 sm:space-y-4">
          {props.isAdmin ? (
            <div className="relative">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700 sm:mb-2 sm:text-sm">
                Dôvod blokácie
              </span>
              <button
                type="button"
                onClick={() => setAdminBlockTypeOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 sm:px-4 sm:py-3 sm:text-sm cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-4 w-4 rounded-md border shadow-2xs shrink-0"
                    style={{
                      backgroundColor: selectedOption.color,
                      borderColor: selectedOption.border,
                    }}
                  />
                  <span>{selectedOption.value}</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${adminBlockTypeOpen ? "rotate-180" : ""}`} />
              </button>

              {adminBlockTypeOpen && (
                <div className="absolute left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                  {ADMIN_BLOCK_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        props.onAdminBlockType?.(opt.value);
                        setAdminBlockTypeOpen(false);
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold transition text-left cursor-pointer ${currentBlockType === opt.value
                          ? "bg-slate-100 text-slate-950"
                          : "hover:bg-slate-50 text-slate-700"
                        }`}
                    >
                      <span
                        className="h-4 w-4 rounded-md border shadow-2xs shrink-0"
                        style={{
                          backgroundColor: opt.color,
                          borderColor: opt.border,
                        }}
                      />
                      <span className="text-xs sm:text-sm">{opt.value}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Field icon={Phone} label="Telefón" value={props.phone} onChange={props.onPhone} type="tel" />
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700 sm:mb-2 sm:text-sm">Dĺžka rezervácie</span>
            <select
              value={props.duration}
              onChange={(event) => props.onDuration(Number(event.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 sm:px-4 sm:py-3 sm:text-sm"
            >
              {props.durationOptions.map((minutes) => <option key={minutes} value={minutes}>{formatDuration(minutes)}</option>)}
            </select>
          </label>

          {/* MultiSport karty (len pre klientov/ne-adminov) */}
          {!props.isAdmin && (
            <div className="grid grid-cols-2 gap-2.5">
              {/* Karta č. 1 */}
              <label className={`flex items-center gap-2.5 rounded-2xl border p-3 cursor-pointer transition select-none ${props.multisportCardsCount >= 1
                  ? "border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold shadow-2xs"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100/70"
                }`}>
                <input
                  type="checkbox"
                  checked={props.multisportCardsCount >= 1}
                  onChange={(e) => {
                    if (e.target.checked) {
                      props.onMultisportCardsCount(1);
                    } else {
                      props.onMultisportCardsCount(0);
                    }
                  }}
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer shrink-0"
                />
                <span className="text-xs font-bold leading-snug">MultiSport karta č. 1</span>
              </label>

              {/* Karta č. 2 - 100% zľava iba ak sú zaškrtnuté obe karty */}
              <label className={`flex items-center gap-2.5 rounded-2xl border p-3 cursor-pointer transition select-none ${props.multisportCardsCount === 2
                  ? "border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold shadow-2xs"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100/70"
                }`}>
                <input
                  type="checkbox"
                  checked={props.multisportCardsCount === 2}
                  onChange={(e) => {
                    if (e.target.checked) {
                      // Zaškrtnutie oboch kariet = 100% zľava
                      props.onMultisportCardsCount(2);
                    } else {
                      // Odškrtnutie karty č. 2 ponechá len kartu č. 1 (-50%)
                      props.onMultisportCardsCount(1);
                    }
                  }}
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer shrink-0"
                />
                <span className="text-xs font-bold leading-snug">MultiSport karta č. 2</span>
              </label>
            </div>
          )}

          {(props.isAdmin || props.canMakeRecurring) && (
            <Field
              icon={User}
              label="Meno hráča / zverenca (voliteľné)"
              value={props.clientPlayerName || ""}
              onChange={(val) => props.onClientPlayerName?.(val)}
              placeholder="napr. Peter Novák (zobrazí sa v kalendári)"
            />
          )}

          <Field
            icon={MessageSquare}
            label="Poznámka"
            value={props.title}
            onChange={props.onTitle}
            placeholder={props.isAdmin ? "Voliteľná poznámka k blokácii..." : "Voliteľná poznámka k rezervácii..."}
          />

          {props.canMakeRecurring && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3.5 space-y-3 shadow-2xs">
              <label className="flex items-center justify-between cursor-pointer select-none">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                    <Repeat className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                      Opakovaná rezervácia
                    </span>
                    <span className="block text-[11px] text-slate-500 leading-snug">
                      Vytvoriť pravidelný termín každý týždeň
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(props.isRecurring)}
                  onChange={(e) => props.onIsRecurring?.(e.target.checked)}
                  className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
              </label>

              {props.isRecurring && (
                <div className="pt-2 border-t border-indigo-200/80 space-y-3 animate-in fade-in zoom-in-95 duration-100">
                  {/* Opakovať frekvencia (podľa systému NTC) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="block">
                      <span className="block text-xs font-semibold text-slate-700 mb-1">
                        Opakovať
                      </span>
                      <select
                        value={repeatFrequency}
                        onChange={(e) => props.onRepeatFrequency?.(e.target.value as any)}
                        className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 cursor-pointer shadow-2xs"
                      >
                        <option value="daily">Každý deň</option>
                        <option value="weekly">Každý týždeň</option>
                        <option value="monthly">Každý mesiac</option>
                        <option value="yearly">Každý rok</option>
                      </select>
                    </label>

                    {repeatFrequency === "weekly" ? (
                      <label className="block">
                        <span className="block text-xs font-semibold text-slate-700 mb-1">
                          Frekvencia cyklu
                        </span>
                        <select
                          value={frequencyWeeks}
                          onChange={(e) => props.onFrequencyWeeks?.(Number(e.target.value))}
                          className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 cursor-pointer shadow-2xs"
                        >
                          <option value={1}>1. týždeň (každých 7 dní)</option>
                          <option value={2}>2. týždeň (každých 14 dní)</option>
                        </select>
                      </label>
                    ) : (
                      <div className="flex flex-col justify-end">
                        <span className="text-[11px] text-slate-500 mb-1">Popis cyklu</span>
                        <div className="rounded-xl bg-indigo-100/60 px-3 py-2 text-xs font-bold text-indigo-900 border border-indigo-200/60 flex items-center justify-between">
                          <span className="truncate">
                            {repeatFrequency === "daily" && "Každý deň v týždni"}
                            {repeatFrequency === "monthly" && `Mesačne (${bookingDate.getDate()}. v mesiaci)`}
                            {repeatFrequency === "yearly" && `Ročne (${bookingDate.getDate()}.${bookingDate.getMonth() + 1}.)`}
                          </span>
                          <Repeat className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dni v týždni (iba ak repeatFrequency === "weekly") */}
                  {repeatFrequency === "weekly" && (
                    <div>
                      <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Dni v týždni
                      </span>
                      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                        {DAYS_OF_WEEK.map((d) => {
                          const isSelected = selectedDays.includes(d.id);
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => {
                                let next: number[];
                                if (isSelected) {
                                  if (selectedDays.length === 1) return;
                                  next = selectedDays.filter((id) => id !== d.id);
                                } else {
                                  next = [...selectedDays, d.id];
                                }
                                props.onDaysOfWeek?.(next);
                              }}
                              className={`flex flex-col items-center justify-center py-2 rounded-xl text-xs font-bold transition cursor-pointer border select-none ${
                                isSelected
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs scale-[1.02]"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300"
                              }`}
                              title={d.full}
                            >
                              <span>{d.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Až do */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-700">
                        Až do (koniec opakovania)
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800">
                        <Sparkles className="h-3 w-3 text-indigo-600" />
                        ({occurrencesCount} {occurrencesCount === 1 ? "opakovanie" : occurrencesCount < 5 ? "opakovania" : "opakovaní"})
                      </span>
                    </div>

                    <input
                      type="date"
                      value={props.untilDate || ""}
                      min={bookingDate.toISOString().slice(0, 10)}
                      onChange={(e) => props.onUntilDate?.(e.target.value)}
                      className="w-full rounded-xl border border-indigo-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 cursor-pointer shadow-2xs"
                    />

                    {/* Quick selection presets */}
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-medium mr-0.5">Rýchly výber:</span>
                      {[
                        { label: "+1 mes.", months: 1 },
                        { label: "+3 mes.", months: 3 },
                        { label: "+6 mes.", months: 6 },
                        { label: "+1 rok", months: 12 },
                        { label: "Do 30.04. (koniec sezóny)", endSeason: true },
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const d = new Date(bookingDate);
                            if (item.endSeason) {
                              const targetYear = (d.getMonth() >= 4) ? d.getFullYear() + 1 : d.getFullYear();
                              props.onUntilDate?.(`${targetYear}-04-30`);
                            } else {
                              d.setMonth(d.getMonth() + (item.months || 1));
                              props.onUntilDate?.(d.toISOString().slice(0, 10));
                            }
                          }}
                          className="rounded-lg border border-indigo-200 bg-white px-2 py-0.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-50 transition cursor-pointer shadow-2xs"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Footnote without arbitrary limit */}
                  <div className="pt-1 text-[11px] text-slate-600 leading-relaxed">
                    <p className="text-slate-600">
                      💡 Systém automaticky vytvorí všetky termíny, ktoré sú voľné. Ak nastane kolízia s inou rezerváciou, obsadený termín preskočí a vypíše vám hlásenie.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={props.loading || isInsufficientCredit}
            className={`mt-2 w-full rounded-xl px-4 py-3 text-xs font-bold text-white transition sm:px-5 sm:py-3.5 sm:text-sm shadow-xs ${isInsufficientCredit
                ? "bg-slate-400 cursor-not-allowed opacity-80"
                : props.isRecurring
                  ? "bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                  : props.isAdmin
                    ? "bg-slate-950 hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                    : "bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              }`}
          >
            {props.loading
              ? "Ukladanie..."
              : isInsufficientCredit
                ? `Najprv dobite kredit (${(props.walletBalance ?? 0).toFixed(2)} € / ${pricing.formattedPrice})`
                : props.isRecurring
                  ? `Vytvoriť opakovanú sériu (${occurrencesCount} ${occurrencesCount === 1 ? "termín" : occurrencesCount < 5 ? "termíny" : "termínov"})`
                  : props.isAdmin
                    ? `Zablokovať kurt (${selectedOption.value})`
                    : "Vytvoriť rezerváciu"}
          </button>
        </form>
      </div>
    </div>
  );
}

type DetailProps = {
  booking: Booking;
  court?: Court;
  canManage: boolean;
  canCancel: boolean;
  cancellationDeadlineHours: number;
  onClose: () => void;
  onDelete: (target?: Booking) => void;
  onStartReschedule?: (target?: Booking) => void;
  onOpenSeriesOverview?: (recurringGroupId: string) => void;
  onNavigateToDate?: (date: Date) => void;
};

export function BookingDetailDialog({
  booking,
  court,
  canManage,
  canCancel,
  cancellationDeadlineHours,
  onClose,
  onDelete,
  onStartReschedule,
  onOpenSeriesOverview,
  onNavigateToDate,
}: DetailProps) {
  const [activeBooking, setActiveBooking] = useState<Booking>(booking);
  const [seriesBookings, setSeriesBookings] = useState<Booking[]>([]);
  const [fetchingSeries, setFetchingSeries] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date(booking.start));

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    setActiveBooking(booking);
    setCalendarMonth(new Date(booking.start));
  }, [booking]);

  useEffect(() => {
    if (!booking.recurringGroupId) return;
    let active = true;
    setFetchingSeries(true);
    fetchSeriesBookingsAction(booking.recurringGroupId).then((res) => {
      if (active && res.success && res.bookings) {
        setSeriesBookings(res.bookings as Booking[]);
      }
      if (active) setFetchingSeries(false);
    });
    return () => {
      active = false;
    };
  }, [booking.recurringGroupId]);

  const formatDate = (value: string) => new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
  const formatTime = (value: string) => new Intl.DateTimeFormat("sk-SK", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bratislava" }).format(new Date(value));
  const toDateKey = (val: Date) =>
    `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, "0")}-${String(val.getDate()).padStart(2, "0")}`;

  const bookingsByDateKey = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of seriesBookings) {
      const k = toDateKey(new Date(b.start));
      const list = map.get(k) || [];
      list.push(b);
      map.set(k, list);
    }
    return map;
  }, [seriesBookings]);

  const monthCalendarDays = useMemo(() => {
    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const offset = (firstDay.getDay() + 6) % 7; // Mon=0, Sun=6
    const startGrid = new Date(firstDay);
    startGrid.setDate(startGrid.getDate() - offset);

    const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
    const totalNeeded = offset + daysInMonth > 35 ? 42 : 35;

    return Array.from({ length: totalNeeded }, (_, i) => {
      const d = new Date(startGrid);
      d.setDate(d.getDate() + i);
      d.setHours(12, 0, 0, 0);
      return d;
    });
  }, [calendarMonth]);

  const activeSeriesCount = useMemo(() => {
    return seriesBookings.filter((b) => b.status !== "cancelled").length;
  }, [seriesBookings]);

  const isMaintenanceOrAdmin =
    activeBooking.source === "admin" ||
    activeBooking.userRole === "admin" ||
    activeBooking.status === "blocked" ||
    Boolean(activeBooking.customerName && (
      activeBooking.customerName.toLowerCase().includes("údržba") ||
      activeBooking.customerName.toLowerCase().includes("admin") ||
      activeBooking.customerName.toLowerCase().includes("tréning")
    )) ||
    Boolean(activeBooking.title && (
      activeBooking.title.toLowerCase().includes("údržba") ||
      activeBooking.title.toLowerCase().includes("admin") ||
      activeBooking.title.toLowerCase().includes("tréning")
    ));

  const isFuture = new Date(activeBooking.start).getTime() > Date.now();
  const isRescheduled = Boolean(activeBooking.isRescheduled);
  const isCancelled = activeBooking.status === "cancelled";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4">
      <button aria-label="Zavrieť" className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative max-h-[92vh] w-full overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl transition-all sm:p-6 ${
        booking.recurringGroupId ? "max-w-xl sm:max-w-2xl" : "max-w-md sm:p-8"
      }`}>
        <DialogHeader
          title={isMaintenanceOrAdmin ? "Detail blokovania kurtu" : "Detail rezervácie"}
          subtitle={formatCourtDisplayName(court) || "Rezervované športovisko"}
          onClose={onClose}
        />

        {isRescheduled && (
          <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-blue-200 bg-blue-50/80 p-3 text-xs text-blue-900">
            <CalendarSync className="h-4 w-4 shrink-0 text-blue-600" />
            <span>Tento termín bol <b>presunutý</b>. Rezerváciu už nie je možné stornovať, máte však možnosť ju opätovne presunúť.</span>
          </div>
        )}

        {/* Embedded Monthly Recurring Series Calendar in Upper Section */}
        {booking.recurringGroupId && (
          <div className="mb-4 rounded-2xl border border-indigo-200/90 bg-indigo-50/60 p-3 sm:p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                  <Repeat className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-indigo-950">Prehľad opakovanej série</span>
                    <span className="rounded-full bg-indigo-200/80 px-2 py-0.5 text-[10px] font-extrabold text-indigo-900">
                      {fetchingSeries ? "..." : `${activeSeriesCount} termínov`}
                    </span>
                  </div>
                  <span className="block text-[11px] text-indigo-700">
                    Kliknutím na dátum zobrazíte detail termínu
                  </span>
                </div>
              </div>

              {/* Month switcher */}
              <div className="flex items-center gap-1 bg-white border border-indigo-200 rounded-xl px-1.5 py-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                  title="Predchádzajúci mesiac"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-1 text-xs font-extrabold capitalize text-slate-900 min-w-[95px] text-center">
                  {new Intl.DateTimeFormat("sk-SK", { month: "short", year: "numeric" }).format(calendarMonth)}
                </span>
                <button
                  type="button"
                  onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                  title="Nasledujúci mesiac"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* 7-column Calendar Grid */}
            <div className="rounded-xl border border-indigo-100/80 bg-white p-2 sm:p-2.5 shadow-2xs">
              <div className="grid grid-cols-7 mb-1 text-center text-[10px] font-bold text-slate-400">
                {["Po", "Ut", "St", "Št", "Pi", "So", "Ne"].map((d) => (
                  <div key={d} className="py-0.5">{d}</div>
                ))}
              </div>

              {fetchingSeries ? (
                <div className="flex items-center justify-center py-6 text-xs text-slate-400 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  <span>Načítavam termíny série...</span>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {monthCalendarDays.map((cellDate) => {
                    const isCurrentMonth = cellDate.getMonth() === calendarMonth.getMonth();
                    const key = toDateKey(cellDate);
                    const matchingSlots = bookingsByDateKey.get(key) || [];
                    const hasSlot = matchingSlots.length > 0;
                    const slot = matchingSlots[0];
                    const isSlotCancelled = slot?.status === "cancelled";
                    const isSelected = activeBooking && toDateKey(new Date(activeBooking.start)) === key;
                    const isToday = toDateKey(new Date()) === key;

                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={!hasSlot}
                        onClick={() => slot && setActiveBooking(slot)}
                        className={`relative min-h-[46px] sm:min-h-[50px] p-1 rounded-xl flex flex-col justify-between transition border text-left ${
                          !isCurrentMonth
                            ? "opacity-25 bg-slate-50 border-slate-100 cursor-default"
                            : hasSlot
                            ? isSlotCancelled
                              ? "bg-red-50/70 border-red-200 cursor-pointer"
                              : isSelected
                              ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500 shadow-xs cursor-pointer"
                              : "bg-emerald-50/70 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100/50 cursor-pointer shadow-2xs"
                            : "border-slate-100 bg-white cursor-default"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`text-[10px] sm:text-[11px] font-bold leading-none ${
                              hasSlot
                                ? isSlotCancelled
                                  ? "text-red-700"
                                  : isSelected
                                  ? "text-emerald-950 font-extrabold"
                                  : "text-emerald-900"
                                : isToday
                                ? "text-blue-600 font-extrabold"
                                : "text-slate-400"
                            }`}
                          >
                            {cellDate.getDate()}
                          </span>
                          {isSelected && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                          )}
                        </div>

                        {hasSlot && (
                          <div className="w-full mt-0.5">
                            {isSlotCancelled ? (
                              <span className="block truncate rounded bg-red-100 px-0.5 py-0.5 text-[8px] sm:text-[8.5px] font-bold text-red-700 text-center">
                                Uvoľnené
                              </span>
                            ) : (
                              <div className={`rounded px-0.5 py-0.5 text-[8px] sm:text-[8.5px] font-extrabold text-center shadow-2xs flex items-center justify-center gap-0.5 ${
                                isSelected ? "bg-emerald-700 text-white" : "bg-emerald-600 text-white"
                              }`}>
                                <span className="truncate">{formatTime(slot.start)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick action bar */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              {onNavigateToDate ? (
                <button
                  type="button"
                  onClick={() => onNavigateToDate(new Date(activeBooking.start))}
                  className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:text-indigo-900 transition cursor-pointer"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Prejsť na tento deň v kalendári ↗</span>
                </button>
              ) : <div />}

              {onOpenSeriesOverview && (
                <button
                  type="button"
                  onClick={() => onOpenSeriesOverview(booking.recurringGroupId!)}
                  className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                >
                  <List className="h-3.5 w-3.5" />
                  <span>Kompletný zoznam ({seriesBookings.length})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-center text-xs font-bold text-red-700">
            Tento termín ({formatDate(activeBooking.start)}) bol uvoľnený pre verejnosť.
          </div>
        )}

        <div className="space-y-2.5 sm:space-y-3">
          <Detail icon={Clock3} label="Termín" value={`${formatDate(activeBooking.start)}, ${formatTime(activeBooking.start)} – ${formatTime(activeBooking.end)}`} />
          <Detail icon={User} label={isMaintenanceOrAdmin ? "Dôvod blokácie" : "Meno"} value={isMaintenanceOrAdmin ? (activeBooking.customerName || "Údržba kurtov") : (activeBooking.customerName || "Neznáme")} />
          {activeBooking.phone && !isMaintenanceOrAdmin && <Detail icon={Phone} label="Telefón" value={activeBooking.phone} />}
          {activeBooking.multisportCardsCount && activeBooking.multisportCardsCount > 0 ? (
            <Detail
              icon={CreditCard}
              label="MultiSport karty"
              value={activeBooking.multisportCardsCount === 2 ? "2x karta (Zľava 100 % zdarma)" : "1x karta (Zľava 50 %)"}
            />
          ) : null}
          {activeBooking.title && activeBooking.title !== activeBooking.customerName && activeBooking.title !== "Údržba" && activeBooking.title !== "Údržba kurtov" && (
            <Detail icon={MessageSquare} label="Poznámka" value={activeBooking.title} />
          )}
        </div>

        {canManage && isFuture && !isCancelled && onStartReschedule && (
          <button
            type="button"
            onClick={() => onStartReschedule(activeBooking)}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500 bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-md shadow-emerald-700/20 transition hover:bg-emerald-700 sm:mt-6 sm:px-5 sm:text-sm cursor-pointer"
          >
            <CalendarSync className="h-4 w-4" /> Presunúť termín rezervácie
          </button>
        )}

        {canManage && !isRescheduled && !isCancelled && canCancel && (
          <button onClick={() => onDelete(activeBooking)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700 transition hover:bg-red-100 sm:px-5 sm:text-sm">
            <Trash2 className="h-4 w-4" /> {isMaintenanceOrAdmin ? "Odblokovať kurt" : "Zrušiť rezerváciu"}
          </button>
        )}
        {canManage && !isRescheduled && !isCancelled && !canCancel && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-center text-xs font-semibold text-amber-800 sm:px-4 sm:text-sm">
            Rezerváciu už nie je možné zrušiť. Zrušenie je povolené iba viac ako {cancellationDeadlineHours} hodín pred začiatkom.
          </p>
        )}
        {canManage && isRescheduled && (
          <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-center text-xs text-slate-600">
            Presunutú rezerváciu nie je možné zrušiť za refundáciu kreditu. Môžete ju kedykoľvek presunúť na iný termín.
          </p>
        )}
      </div>
    </div>
  );
}

export function RescheduleConfirmDialog({
  booking,
  court,
  targetCourt,
  targetDate,
  targetHour,
  durationMinutes,
  loading,
  error,
  onCancel,
  onConfirm,
}: {
  booking: Booking;
  court?: Court;
  targetCourt?: Court;
  targetDate: Date;
  targetHour: number;
  durationMinutes: number;
  loading: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const formatDate = (value: string | Date) => new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
  const formatTime = (value: string | Date) => new Intl.DateTimeFormat("sk-SK", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bratislava" }).format(new Date(value));

  const targetStart = new Date(targetDate);
  targetStart.setHours(targetHour, 0, 0, 0);
  const targetEnd = new Date(targetStart.getTime() + durationMinutes * 60000);

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={loading ? undefined : onCancel} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl bg-white p-5 shadow-2xl sm:p-7 border border-slate-200">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 sm:h-12 sm:w-12">
              <CalendarSync className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-950 sm:text-xl">Presun rezervácie</h3>
              <p className="text-xs text-slate-500">Potvrďte presun na nový voľný termín</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loading ? undefined : onCancel}
            disabled={loading}
            className="shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Comparison card */}
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Pôvodný termín</span>
            <div className="mt-1 flex items-center justify-between text-xs sm:text-sm">
              <span className="font-semibold text-slate-700">{formatCourtDisplayName(court)}</span>
              <span className="font-bold text-slate-900 line-through decoration-slate-400">
                {formatDate(booking.start)}, {formatTime(booking.start)} – {formatTime(booking.end)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center py-1 text-emerald-600">
            <ArrowRight className="h-5 w-5" />
          </div>

          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-700">Nový termín</span>
            <div className="mt-1 flex items-center justify-between text-xs sm:text-sm">
              <span className="font-bold text-emerald-950">{formatCourtDisplayName(targetCourt)}</span>
              <span className="font-extrabold text-emerald-800">
                {formatDate(targetStart)}, {formatTime(targetStart)} – {formatTime(targetEnd)}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing notice */}
        <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-xs sm:text-sm">
          <span className="font-medium text-emerald-900">Doplatok za zmenu:</span>
          <b className="text-base font-extrabold text-emerald-700">0,00 €</b>
        </div>

        {/* Important cancellation policy reminder */}
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900">
          <p className="font-semibold">Dôležité upozornenie:</p>
          <p className="mt-1 text-[11.5px] leading-relaxed">
            Presunutá rezervácia stráca možnosť byť zrušená (stornovaná za refundáciu kreditu). V prípade zmeny plánov ju však budete môcť kedykoľvek opätovne presunúť na iný termín.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:text-sm"
          >
            Späť do kalendára
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md shadow-emerald-700/20 transition hover:bg-emerald-700 disabled:opacity-50 sm:text-sm cursor-pointer"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarSync className="h-4 w-4" />}
            {loading ? "Presúvam..." : "Potvrdiť presun"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DeleteDialog({
  loading,
  error,
  isSeries,
  onCancel,
  onConfirm
}: {
  loading: boolean;
  error?: string;
  isSeries?: boolean;
  onCancel: () => void;
  onConfirm: (deleteEntireSeries: boolean) => void;
}) {
  const [deleteSeries, setDeleteSeries] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative max-h-[90vh] w-full max-w-sm overflow-y-auto overscroll-contain rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600 sm:h-12 sm:w-12">
          <Trash2 className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-bold text-slate-950 sm:text-xl">Zrušiť rezerváciu?</h3>
        <p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
          Táto rezervácia bude označená ako zrušená. Naozaj chcete pokračovať?
        </p>

        {isSeries && (
          <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3.5 text-xs space-y-2.5">
            <span className="font-bold text-indigo-950 block">Táto rezervácia je súčasťou série:</span>
            <label className="flex items-center gap-2.5 text-slate-800 cursor-pointer">
              <input
                type="radio"
                name="deleteScope"
                checked={!deleteSeries}
                onChange={() => setDeleteSeries(false)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Zrušiť <b>iba tento jeden termín</b></span>
            </label>
            <label className="flex items-center gap-2.5 text-slate-800 cursor-pointer">
              <input
                type="radio"
                name="deleteScope"
                checked={deleteSeries}
                onChange={() => setDeleteSeries(true)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Zrušiť <b>celú sériu</b> (všetky budúce termíny)</span>
            </label>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-700">
            {error}
          </div>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-3">
          <button onClick={onCancel} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-700 sm:px-4 sm:py-3 sm:text-sm">
            Ponechať
          </button>
          <button disabled={loading} onClick={() => onConfirm(deleteSeries)} className="rounded-xl bg-red-600 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-50 sm:px-4 sm:py-3 sm:text-sm">
            {loading ? "Rušenie..." : (deleteSeries ? "Zrušiť sériu" : "Zrušiť")}
          </button>
        </div>
      </div>
    </div>
  );
}

function DialogHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3 sm:mb-6 sm:gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500 sm:mt-1 sm:text-sm">{subtitle}</p>
      </div>
      <button onClick={onClose} className="shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 sm:p-2" aria-label="Zavrieť">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[11px] font-medium text-slate-500 sm:text-xs">{label}</span>
      <strong className="mt-0.5 block text-xs text-slate-950 sm:mt-1 sm:text-sm">{value}</strong>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm sm:h-10 sm:w-10">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium text-slate-500 sm:text-xs">{label}</span>
        <strong className="mt-0.5 block truncate text-xs text-slate-950 sm:mt-1 sm:text-sm">{value}</strong>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value, onChange, type = "text", placeholder }: { icon: typeof Phone; label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-700 sm:mb-2 sm:text-sm">{label}</span>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:left-4" />
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-xs text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 sm:py-3 sm:pl-11 sm:pr-4 sm:text-sm"
        />
      </div>
    </label>
  );
}

export function SeriesOverviewDialog({
  recurringGroupId,
  courtName,
  courts,
  onClose,
  onSelectDate,
  onCancelSingleBooking,
  onCancelEntireSeries,
}: {
  recurringGroupId: string;
  courtName?: string;
  courts?: Court[];
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  onCancelSingleBooking: (bookingId: string) => Promise<void>;
  onCancelEntireSeries: (recurringGroupId: string) => Promise<void>;
}) {
  const [seriesBookings, setSeriesBookings] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [confirmDeleteSeries, setConfirmDeleteSeries] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const loadSeries = async () => {
    setFetching(true);
    const res = await fetchSeriesBookingsAction(recurringGroupId);
    if (res.success && res.bookings) {
      setSeriesBookings(res.bookings);
      if (res.bookings.length > 0) {
        const first = new Date(res.bookings[0].start);
        setCalendarMonth(new Date(first.getFullYear(), first.getMonth(), 1));
        setSelectedSlot(res.bookings[0]);
      }
    }
    setFetching(false);
  };

  useEffect(() => {
    loadSeries();
  }, [recurringGroupId]);

  const effectiveCourtName =
    courtName ||
    (seriesBookings.length > 0 && seriesBookings[0].courtId && courts
      ? formatCourtDisplayName(courts.find((c) => c.id === seriesBookings[0].courtId))
      : "Kurt");

  const activeBookings = seriesBookings.filter((b) => b.status !== "cancelled");
  const cancelledBookings = seriesBookings.filter((b) => b.status === "cancelled");
  const firstBooking = seriesBookings[0];
  const lastBooking = seriesBookings[seriesBookings.length - 1];

  const formatDate = (val: string | Date) =>
    new Intl.DateTimeFormat("sk-SK", { weekday: "short", day: "numeric", month: "numeric", year: "numeric" }).format(new Date(val));
  const formatTime = (val: string | Date) =>
    new Intl.DateTimeFormat("sk-SK", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bratislava" }).format(new Date(val));
  const toDateKey = (val: Date) =>
    `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, "0")}-${String(val.getDate()).padStart(2, "0")}`;

  const handleCancelOne = async (bookingId: string) => {
    if (!confirm("Naozaj chcete uvoľniť tento konkrétny termín? Kurt sa uvoľní pre verejnosť, ostatné termíny série zostanú zachované.")) return;
    setActionLoadingId(bookingId);
    await onCancelSingleBooking(bookingId);
    await loadSeries();
    setActionLoadingId(null);
  };

  const handleDeleteAll = async () => {
    setActionLoadingId("all");
    await onCancelEntireSeries(recurringGroupId);
    setActionLoadingId(null);
    onClose();
  };

  // Monthly calendar calculations
  const monthCalendarDays = useMemo(() => {
    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const offset = (firstDay.getDay() + 6) % 7; // Mon=0
    const startGrid = new Date(firstDay);
    startGrid.setDate(startGrid.getDate() - offset);

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(startGrid);
      d.setDate(d.getDate() + i);
      d.setHours(12, 0, 0, 0);
      return d;
    });
  }, [calendarMonth]);

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-2.5 sm:p-4">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[94vh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6 flex flex-col">
        {/* Header */}
        <div className="mb-3.5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 sm:h-12 sm:w-12">
              <Repeat className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-950 sm:text-xl">
                  Prehľad opakovanej série
                </h2>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-800">
                  {activeBookings.length} termínov
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {firstBooking?.customerName ? `Hráč: ${firstBooking.customerName} • ` : ""}
                {effectiveCourtName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* View Switcher Tabs & Quick stats */}
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-white text-indigo-950 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
              <span>Mesačný kalendár</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                viewMode === "list"
                  ? "bg-white text-indigo-950 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List className="h-3.5 w-3.5 text-indigo-600" />
              <span>Zoznam termínov ({seriesBookings.length})</span>
            </button>
          </div>

          {firstBooking && lastBooking && (
            <span className="text-[11px] text-slate-500">
              Trvanie: <b>{formatDate(firstBooking.start)}</b> až <b>{formatDate(lastBooking.start)}</b>
            </span>
          )}
        </div>

        {/* View Mode 1: Graphical Monthly Calendar */}
        {viewMode === "calendar" && (
          <div className="space-y-3">
            {/* Month Navigator Header */}
            <div className="flex items-center justify-between rounded-2xl bg-indigo-50/70 border border-indigo-100 px-3 py-2">
              <button
                type="button"
                onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                className="rounded-xl border border-indigo-200 bg-white p-1.5 text-indigo-900 shadow-2xs hover:bg-indigo-50 transition cursor-pointer"
                title="Predchádzajúci mesiac"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="text-center">
                <span className="block text-sm font-extrabold capitalize text-indigo-950">
                  {new Intl.DateTimeFormat("sk-SK", { month: "long", year: "numeric" }).format(calendarMonth)}
                </span>
                <span className="block text-[10px] text-indigo-600 font-medium">
                  Kliknutím na termín zobrazíte detail dňa
                </span>
              </div>

              <button
                type="button"
                onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                className="rounded-xl border border-indigo-200 bg-white p-1.5 text-indigo-900 shadow-2xs hover:bg-indigo-50 transition cursor-pointer"
                title="Nasledujúci mesiac"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* 7-column Calendar Grid */}
            <div className="rounded-2xl border border-slate-200 bg-white p-2 sm:p-3 shadow-2xs">
              <div className="grid grid-cols-7 mb-1.5 text-center text-[11px] font-bold text-slate-400">
                {["Po", "Ut", "St", "Št", "Pi", "So", "Ne"].map((d) => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {monthCalendarDays.map((cellDate) => {
                  const isCurrentMonth = cellDate.getMonth() === calendarMonth.getMonth();
                  const key = toDateKey(cellDate);
                  const matchingSlots = seriesBookings.filter((b) => toDateKey(new Date(b.start)) === key);
                  const hasSlot = matchingSlots.length > 0;
                  const firstSlot = matchingSlots[0];
                  const isCancelled = firstSlot?.status === "cancelled";
                  const isPast = firstSlot && new Date(firstSlot.start).getTime() < Date.now();
                  const isSelected = selectedSlot && toDateKey(new Date(selectedSlot.start)) === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!hasSlot}
                      onClick={() => hasSlot && setSelectedSlot(firstSlot)}
                      className={`relative min-h-[52px] sm:min-h-[58px] p-1 rounded-xl flex flex-col justify-between transition border text-left ${
                        !isCurrentMonth
                          ? "opacity-30 bg-slate-50 border-slate-100"
                          : hasSlot
                          ? isCancelled
                            ? "bg-red-50/70 border-red-200 cursor-pointer"
                            : isSelected
                            ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500 shadow-xs cursor-pointer"
                            : "bg-emerald-50/60 border-emerald-300 hover:border-emerald-500 hover:bg-emerald-100/50 cursor-pointer shadow-2xs"
                          : "border-slate-100 bg-white cursor-default"
                      }`}
                    >
                      <span className={`text-[11px] font-bold leading-none ${
                        hasSlot
                          ? isCancelled
                            ? "text-red-700"
                            : "text-emerald-950 font-extrabold"
                          : "text-slate-500"
                      }`}>
                        {cellDate.getDate()}
                      </span>

                      {hasSlot && (
                        <div className="w-full mt-0.5">
                          {isCancelled ? (
                            <span className="block truncate rounded bg-red-100 px-1 py-0.5 text-[9px] font-bold text-red-700 text-center">
                              Uvoľnené
                            </span>
                          ) : (
                            <div className="rounded bg-emerald-600 px-1 py-0.5 text-[9px] font-extrabold text-white text-center shadow-2xs flex items-center justify-center gap-0.5">
                              <Clock3 className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{formatTime(firstSlot.start)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Slot Detailed Action Box */}
            {selectedSlot ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 sm:p-3.5 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-extrabold text-slate-950">
                        {formatDate(selectedSlot.start)}
                      </span>
                      <span className="text-xs font-bold text-emerald-800">
                        {formatTime(selectedSlot.start)} – {formatTime(selectedSlot.end)}
                      </span>
                      {selectedSlot.status === "cancelled" ? (
                        <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                          Uvoľnené pre verejnosť
                        </span>
                      ) : (
                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          Aktívny termín
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-600 block mt-0.5">
                      Športovisko: <b>{effectiveCourtName}</b> {selectedSlot.customerName ? `• ${selectedSlot.customerName}` : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDate(new Date(selectedSlot.start));
                        onClose();
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                    >
                      Prejsť v kalendári ↗
                    </button>

                    {selectedSlot.status !== "cancelled" && new Date(selectedSlot.start).getTime() > Date.now() && (
                      <button
                        type="button"
                        disabled={actionLoadingId === selectedSlot.id}
                        onClick={() => handleCancelOne(selectedSlot.id)}
                        className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition cursor-pointer shadow-2xs disabled:opacity-50"
                      >
                        {actionLoadingId === selectedSlot.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Uvoľniť termín"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-xs text-slate-400 py-1">
                Vyberte kliknutím zelený termín v kalendári vyššie pre akcie s daným dňom.
              </p>
            )}
          </div>
        )}

        {/* View Mode 2: List of all slots */}
        {viewMode === "list" && (
          <div className="flex-1 overflow-y-auto max-h-[360px] rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {fetching ? (
              <div className="flex items-center justify-center p-8 text-xs text-slate-400 gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                <span>Načítavam termíny série...</span>
              </div>
            ) : seriesBookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                V tejto sérii sa nenašli žiadne termíny.
              </div>
            ) : (
              seriesBookings.map((b, idx) => {
                const bStart = new Date(b.start);
                const isPast = bStart.getTime() < Date.now();
                const isCancelled = b.status === "cancelled";
                const isLoading = actionLoadingId === b.id;

                return (
                  <div
                    key={b.id || idx}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2.5 transition ${
                      isCancelled
                        ? "bg-slate-50/80 opacity-60"
                        : isPast
                        ? "bg-slate-50/40"
                        : "hover:bg-indigo-50/30"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                        {idx + 1}.
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-900">
                            {formatDate(b.start)}
                          </span>
                          <span className="text-xs font-semibold text-slate-600">
                            {formatTime(b.start)} – {formatTime(b.end)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isCancelled ? (
                            <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                              Uvoľnené pre verejnosť
                            </span>
                          ) : isPast ? (
                            <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              Uplynulý termín
                            </span>
                          ) : (
                            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              Aktívny termín
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectDate(new Date(b.start));
                          onClose();
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 transition cursor-pointer shadow-2xs"
                        title="Prejsť na tento deň v kalendári"
                      >
                        Prejsť v kalendári ↗
                      </button>

                      {!isCancelled && !isPast && (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleCancelOne(b.id)}
                          className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition cursor-pointer shadow-2xs disabled:opacity-50"
                          title="Uvoľniť kurt na tento termín (napr. pri turnaji hráča)"
                        >
                          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Uvoľniť termín"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {confirmDeleteSeries ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-red-700 font-bold">Naozaj zrušiť celú sériu?</span>
              <button
                type="button"
                disabled={actionLoadingId === "all"}
                onClick={handleDeleteAll}
                className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 transition cursor-pointer shadow-xs"
              >
                {actionLoadingId === "all" ? "Ruším sériu..." : "Áno, zrušiť celú sériu"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteSeries(false)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Nie
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDeleteSeries(true)}
              className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer py-1"
            >
              Zrušiť celú sériu ({activeBookings.length} termínov)
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl border border-slate-200 px-5 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Zavrieť
          </button>
        </div>
      </div>
    </div>
  );
}
