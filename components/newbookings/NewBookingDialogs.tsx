"use client";

import { useEffect } from "react";
import { Clock3, Coins, CreditCard, Loader2, MessageSquare, Phone, Sparkles, Trash2, User, X } from "lucide-react";
import type { Booking, Court } from "@/lib/bookings/mockBookings";
import { calculateNtcBookingPrice } from "@/lib/bookings/pricing";
import { formatDuration } from "@/lib/bookings/rolePolicy";

type CreateDialogProps = {
  court?: Court;
  date: Date;
  hour: number;
  duration: number;
  title: string;
  phone: string;
  hasCard?: boolean;
  isAdmin?: boolean;
  hasMultisport?: boolean;
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

export function CreateBookingDialog(props: CreateDialogProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const bookingDate = new Date(props.date);
  bookingDate.setHours(props.hour, 0, 0, 0);

  const pricing = calculateNtcBookingPrice(
    props.court?.sport || "badminton",
    bookingDate,
    props.duration,
    Boolean(props.hasCard),
    props.discountEurPerHour,
    props.multisportCardsCount
  );

  const isInsufficientCredit =
    !props.isAdmin &&
    pricing.totalPriceEur > 0 &&
    (Boolean(props.error?.toLowerCase().includes("zostatok")) ||
      (typeof props.walletBalance === "number" && props.walletBalance < pricing.totalPriceEur));

  const missingEur = Math.max(0, pricing.totalPriceEur - (props.walletBalance ?? 0));
  const neededTopUp = Math.max(10, Math.ceil(missingEur));

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4">
      <button aria-label="Zavrieť" className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={props.onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-8">
        <DialogHeader
          title={props.isAdmin ? "Administrátorská rezervácia" : "Nová rezervácia"}
          subtitle={props.isAdmin ? "Vytvorenie rezervácie alebo zablokovanie kurtu pre údržbu / klub." : "Skontrolujte vybraný termín a potvrďte rezerváciu."}
          onClose={props.onClose}
        />
        
        <div className="mb-4 grid grid-cols-2 gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs sm:mb-6 sm:gap-3 sm:p-4 sm:text-sm">
          <Info label="Športovisko" value={props.court?.name || "Kurt"} />
          <Info label="Dátum" value={new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "long", year: "numeric" }).format(props.date)} />
          <Info label="Začiatok" value={`${String(props.hour).padStart(2, "0")}:00`} />
          <Info label="Trvanie" value={`${props.duration} min.`} />
          <div className="col-span-2 flex items-center justify-between border-t border-slate-200/80 pt-2.5 mt-0.5">
            <span className="font-semibold text-slate-600">{props.isAdmin ? "Platba / Kredit:" : "Cena rezervácie:"}</span>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {props.isAdmin ? (
                <span className="rounded-md border border-violet-300 bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-700">
                  Admin blokovanie (bez kreditu)
                </span>
              ) : (
                <>
                  {pricing.multisportCardsCount > 0 && pricing.originalPriceEur > pricing.totalPriceEur && (
                    <span className="text-xs sm:text-sm text-slate-400 line-through mr-1 font-semibold">
                      {pricing.originalPriceEur.toFixed(2)} €
                    </span>
                  )}
                  <span className="text-base font-black text-slate-950 sm:text-lg">
                    {pricing.formattedPrice}
                  </span>
                  {pricing.multisportCardsCount === 1 && (
                    <span className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 shadow-2xs">
                      MultiSport 1x (-50 %)
                    </span>
                  )}
                  {pricing.multisportCardsCount === 2 && (
                    <span className="rounded-md border border-emerald-500 bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                      MultiSport 2x (Zdarma)
                    </span>
                  )}
                  {pricing.isMemberRate && (
                    <span className="rounded-md border border-emerald-300/60 bg-emerald-100/90 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Členská tarifa</span>
                  )}
                  {props.discountEurPerHour > 0 && (
                    <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">Zľava roly {props.discountEurPerHour.toFixed(2)} €/h</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {isInsufficientCredit && props.onTopUp ? (
          <div className="mb-4 rounded-2xl border-2 border-amber-300/90 bg-gradient-to-br from-amber-50/95 via-yellow-50/80 to-orange-50/60 p-4 shadow-sm animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shadow-2xs">
                <Coins className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-900">Nedostatočný zostatok v peňaženke</h4>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                  <span>Aktuálny kredit: <b className="text-slate-900">{(props.walletBalance ?? 0).toFixed(2)} €</b></span>
                  <span>•</span>
                  <span>Cena: <b className="text-slate-900">{pricing.formattedPrice}</b></span>
                  <span>•</span>
                  <span>Chýba: <b className="text-amber-700">{missingEur.toFixed(2)} €</b></span>
                </div>
              </div>
            </div>

            <div className="mt-3.5 pt-3 border-t border-amber-200/80">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
                Vyberte sumu a spôsob dobitia kreditu:
              </span>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { amount: neededTopUp, label: `+${neededTopUp} €`, note: "Potrebná suma" },
                  { amount: 20, label: "+20 €", note: "Obľúbené" },
                  { amount: 50, label: "+50 €", note: "Výhodné" },
                ]
                  .filter((item, idx, arr) => arr.findIndex((t) => t.amount === item.amount) === idx)
                  .map((opt) => (
                    <div key={opt.amount} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold px-0.5">
                        <span>{opt.note}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          disabled={props.topUpLoading !== null}
                          onClick={() => props.onTopUp!(opt.amount, "cardpay")}
                          className="flex flex-col items-center justify-center rounded-xl border border-sky-300 bg-white py-2 px-1 text-center shadow-2xs transition hover:border-sky-500 hover:bg-sky-50 active:scale-95 disabled:opacity-50 cursor-pointer"
                          title="Tatra banka CardPay"
                        >
                          {props.topUpLoading === opt.amount ? (
                            <Loader2 className="h-4 w-4 animate-spin text-sky-700 my-1" />
                          ) : (
                            <>
                              <span className="text-xs font-black text-sky-800">{opt.label}</span>
                              <span className="text-[9px] font-bold text-sky-600">CardPay</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={props.topUpLoading !== null}
                          onClick={() => props.onTopUp!(opt.amount, "stripe")}
                          className="flex flex-col items-center justify-center rounded-xl border border-amber-300 bg-white py-2 px-1 text-center shadow-2xs transition hover:border-amber-500 hover:bg-amber-50 active:scale-95 disabled:opacity-50 cursor-pointer"
                          title="Stripe (Karta / Google Pay / Apple Pay)"
                        >
                          {props.topUpLoading === opt.amount ? (
                            <Loader2 className="h-4 w-4 animate-spin text-amber-700 my-1" />
                          ) : (
                            <>
                              <span className="text-xs font-black text-amber-800">{opt.label}</span>
                              <span className="text-[9px] font-bold text-amber-600">Stripe</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              <p className="mt-2.5 text-[11px] text-slate-500 text-center">
                Po bezpečnom zaplatení sa automaticky vrátite k potvrdeniu rezervácie.
              </p>
            </div>
          </div>
        ) : props.error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 sm:text-sm">
            {props.error}
          </div>
        ) : null}

        <form onSubmit={props.onSubmit} className="space-y-3.5 sm:space-y-4">
          <Field icon={Phone} label="Telefón" value={props.phone} onChange={props.onPhone} type="tel" />
          
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
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  MultiSport karta
                </span>
                {props.multisportCardsCount > 0 && (
                  <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 border border-emerald-300">
                    {props.multisportCardsCount === 1 ? "Zľava 50 %" : "100 % zľava (Zdarma)"}
                  </span>
                )}
              </div>

              {/* Asistencia pre držiteľa MultiSport karty */}
              {props.hasMultisport && props.multisportCardsCount === 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-xl border border-emerald-300 bg-emerald-50/90 p-2.5 text-xs text-emerald-950 shadow-2xs animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="leading-tight">
                      V profile máte evidovanú MultiSport kartu. Máte ju dnes so sebou?
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => props.onMultisportCardsCount(1)}
                    className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
                  >
                    Uplatniť zľavu 50 %
                  </button>
                </div>
              )}

              <p className="text-[11px] text-slate-500 leading-tight">
                Zaškrtnite 1 kartu pre 50% zľavu, alebo obe karty pre 100% zľavu z ceny kurtu.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                {/* Karta č. 1 */}
                <label className={`flex items-center gap-2.5 rounded-xl border p-2.5 cursor-pointer transition select-none ${
                  props.multisportCardsCount >= 1 
                    ? "border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold shadow-2xs" 
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100/70"
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
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="block font-bold">MultiSport karta č. 1</span>
                    <span className="text-[10px] text-slate-500 font-normal">-50 % z ceny kurtu</span>
                  </div>
                </label>

                {/* Karta č. 2 - 100% zľava iba ak sú zaškrtnuté obe karty */}
                <label className={`flex items-center gap-2.5 rounded-xl border p-2.5 cursor-pointer transition select-none ${
                  props.multisportCardsCount === 2 
                    ? "border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold shadow-2xs" 
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100/70"
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
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="block font-bold">MultiSport karta č. 2</span>
                    <span className="text-[10px] text-slate-500 font-normal">-100 % (obe karty)</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          <Field icon={MessageSquare} label="Poznámka" value={props.title} onChange={props.onTitle} placeholder="Voliteľná poznámka k rezervácii..." />
          <button
            type="submit"
            disabled={props.loading || isInsufficientCredit}
            className={`mt-2 w-full rounded-xl px-4 py-3 text-xs font-bold text-white transition sm:px-5 sm:py-3.5 sm:text-sm shadow-xs ${
              isInsufficientCredit
                ? "bg-slate-400 cursor-not-allowed opacity-80"
                : "bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
            }`}
          >
            {props.loading
              ? "Ukladanie..."
              : isInsufficientCredit
              ? `Najprv dobite kredit (${(props.walletBalance ?? 0).toFixed(2)} € / ${pricing.formattedPrice})`
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
  onDelete: () => void;
};

export function BookingDetailDialog({ booking, court, canManage, canCancel, cancellationDeadlineHours, onClose, onDelete }: DetailProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const formatDate = (value: string) => new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
  const formatTime = (value: string) => new Intl.DateTimeFormat("sk-SK", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bratislava" }).format(new Date(value));
  
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4">
      <button aria-label="Zavrieť" className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-8">
        <DialogHeader title="Detail rezervácie" subtitle={court?.name || "Rezervované športovisko"} onClose={onClose} />

        <div className="space-y-2.5 sm:space-y-3">
          <Detail icon={Clock3} label="Termín" value={`${formatDate(booking.start)}, ${formatTime(booking.start)} – ${formatTime(booking.end)}`} />
          <Detail icon={User} label="Meno" value={booking.customerName || "Neznáme"} />
          {booking.phone && <Detail icon={Phone} label="Telefón" value={booking.phone} />}
          {booking.multisportCardsCount && booking.multisportCardsCount > 0 ? (
            <Detail
              icon={CreditCard}
              label="MultiSport karty"
              value={booking.multisportCardsCount === 2 ? "2x karta (Zľava 100 % zdarma)" : "1x karta (Zľava 50 %)"}
            />
          ) : null}
          {booking.title && <Detail icon={MessageSquare} label="Poznámka" value={booking.title} />}
        </div>
        {canManage && canCancel && (
          <button onClick={onDelete} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700 transition hover:bg-red-100 sm:mt-7 sm:px-5 sm:text-sm">
            <Trash2 className="h-4 w-4" /> Zrušiť rezerváciu
          </button>
        )}
        {canManage && !canCancel && (
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-center text-xs font-semibold text-amber-800 sm:mt-7 sm:px-4 sm:text-sm">
            Rezerváciu už nie je možné zrušiť. Zrušenie je povolené iba viac ako {cancellationDeadlineHours} hodín pred začiatkom.
          </p>
        )}
      </div>
    </div>
  );
}

export function DeleteDialog({ loading, error, onCancel, onConfirm }: { loading: boolean; error?: string; onCancel: () => void; onConfirm: () => void }) {
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
        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-700">
            {error}
          </div>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-3">
          <button onClick={onCancel} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-700 sm:px-4 sm:py-3 sm:text-sm">
            Ponechať
          </button>
          <button disabled={loading} onClick={onConfirm} className="rounded-xl bg-red-600 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-50 sm:px-4 sm:py-3 sm:text-sm">
            {loading ? "Rušenie..." : "Zrušiť"}
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
