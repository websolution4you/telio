"use client";

import React, { useEffect, useState } from "react";
import { Clock3, Trash2, X, Check, Calendar, Plus } from "lucide-react";
import { PriceInterval } from "@/lib/bookings/pricingTypes";
import { areDaysSame } from "@/lib/bookings/intervalUtils";
import PriceStepper from "./PriceStepper";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (interval: PriceInterval) => void;
  onDelete?: (intervalId: string) => void;
  initialInterval?: Partial<PriceInterval> | null;
  title?: string;
};

const DEFAULT_PRICES = {
  badminton: 14,
  tennis: 28,
  "tennis-clay": 20,
  squash: 11,
};

export default function EditIntervalModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialInterval,
  title,
}: Props) {
  const isEditing = Boolean(initialInterval?.id);

  const [name, setName] = useState("Mimo špičky");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startHour, setStartHour] = useState(7);
  const [endHour, setEndHour] = useState(12);
  const [badmintonPrice, setBadmintonPrice] = useState<number>(14);
  const [tennisPrice, setTennisPrice] = useState<number>(28);
  const [clayPrice, setClayPrice] = useState<number>(20);
  const [squashPrice, setSquashPrice] = useState<number>(11);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowDeleteConfirm(false);
      setError(null);
      if (initialInterval) {
        setName(initialInterval.name || "Nové pásmo");
        setDays(initialInterval.days && initialInterval.days.length > 0 ? [...initialInterval.days] : [1, 2, 3, 4, 5]);
        setStartHour(initialInterval.startHour ?? 7);
        setEndHour(initialInterval.endHour ?? 12);
        setBadmintonPrice(initialInterval.prices?.badminton ?? DEFAULT_PRICES.badminton);
        setTennisPrice(initialInterval.prices?.tennis ?? DEFAULT_PRICES.tennis);
        setClayPrice(initialInterval.prices?.["tennis-clay"] ?? DEFAULT_PRICES["tennis-clay"]);
        setSquashPrice(initialInterval.prices?.squash ?? DEFAULT_PRICES.squash);
      } else {
        setName("Nové pásmo");
        setDays([1, 2, 3, 4, 5]);
        setStartHour(7);
        setEndHour(12);
        setBadmintonPrice(DEFAULT_PRICES.badminton);
        setTennisPrice(DEFAULT_PRICES.tennis);
        setClayPrice(DEFAULT_PRICES["tennis-clay"]);
        setSquashPrice(DEFAULT_PRICES.squash);
      }
    }
  }, [isOpen, initialInterval]);

  if (!isOpen) return null;

  const handlePresetDays = (type: "weekday" | "weekend" | "allday") => {
    if (type === "weekday") setDays([1, 2, 3, 4, 5]);
    if (type === "weekend") setDays([6, 0]);
    if (type === "allday") setDays([1, 2, 3, 4, 5, 6, 0]);
  };

  const handlePresetName = (presetName: string) => {
    setName(presetName);
    if (presetName === "Happy Hour") {
      setStartHour(12);
      setEndHour(16);
      setDays([1, 2, 3, 4, 5]);
      setBadmintonPrice(12);
      setTennisPrice(24);
      setClayPrice(18);
      setSquashPrice(10);
    } else if (presetName === "Víkend") {
      setStartHour(7);
      setEndHour(21);
      setDays([6, 0]);
    } else if (presetName === "Mimo špičky") {
      setStartHour(7);
      setEndHour(12);
      setDays([1, 2, 3, 4, 5]);
    } else if (presetName === "Špička") {
      setStartHour(16);
      setEndHour(22);
      setDays([1, 2, 3, 4, 5]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Zadajte prosím názov časového pásma.");
      return;
    }
    if (days.length === 0) {
      setError("Vyberte aspoň jeden deň v týždni.");
      return;
    }
    if (startHour >= endHour) {
      setError("Čas 'Od' musí byť menší ako čas 'Do'.");
      return;
    }

    const intervalToSave: PriceInterval = {
      id: initialInterval?.id || `interval-${Date.now()}`,
      name: name.trim(),
      days,
      startHour,
      endHour,
      prices: {
        badminton: Number(badmintonPrice) || 0,
        tennis: Number(tennisPrice) || 0,
        "tennis-clay": Number(clayPrice) || 0,
        squash: Number(squashPrice) || 0,
      },
    };

    onSave(intervalToSave);
    onClose();
  };

  const handleDelete = () => {
    if (initialInterval?.id && onDelete) {
      onDelete(initialInterval.id);
      onClose();
    }
  };

  const durationHours = Math.max(0, endHour - startHour);
  const isWeekdaySelected = areDaysSame(days, [1, 2, 3, 4, 5]);
  const isWeekendSelected = areDaysSame(days, [6, 0]);
  const isAllWeekSelected = areDaysSame(days, [1, 2, 3, 4, 5, 6, 0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {title || (isEditing ? "Upraviť časové pásmo" : "Pridať časové pásmo")}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? "Úprava hodín, platných dní a sadzieb pásma"
                  : "Zadajte časový rozsah a sadzby nového pásma"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 border border-red-200">
              {error}
            </div>
          )}

          {/* Názov pásma & Rýchle šablóny */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Názov časového pásma
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="napr. Mimo špičky, Happy Hour, Špička, Víkend"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition"
            />
            {/* Quick Suggestions */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Rýchla voľba:</span>
              {(isWeekendSelected
                ? ["Víkend"]
                : ["Mimo špičky", "Happy Hour", "Špička"]
              ).map((pName) => (
                <button
                  key={pName}
                  type="button"
                  onClick={() => handlePresetName(pName)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                    name.toLowerCase() === pName.toLowerCase()
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {pName}
                </button>
              ))}
            </div>
          </div>

          {/* Platnosť v dňoch – pevná, neklikateľná */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Platnosť v dňoch
            </label>
            <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5">
              <span
                className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                  isWeekendSelected
                    ? "bg-blue-100 text-blue-800 border border-blue-200"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                }`}
              >
                {isWeekendSelected ? "So – Ne (Víkend)" : "Po – Pi (Pracovné dni)"}
              </span>
              <span className="text-[11px] text-slate-500">
                {isWeekendSelected
                  ? "Pásmo platí pre sobotu a nedeľu"
                  : "Pásmo platí pre pondelok až piatok"}
              </span>
            </div>
          </div>

          {/* Časový rozsah */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Časový rozsah (Hodiny)
              </label>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Trvanie: {durationHours} {durationHours === 1 ? "hodina" : durationHours < 5 ? "hodiny" : "hodín"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Od
                </span>
                <select
                  value={startHour}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 7;
                    setStartHour(val);
                    if (val >= endHour) {
                      setEndHour(Math.min(22, val + 1));
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                >
                  {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map((h) => (
                    <option key={h} value={h}>
                      {h}:00
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Do
                </span>
                <select
                  value={endHour}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 21;
                    setEndHour(val);
                    if (val <= startHour) {
                      setStartHour(Math.max(7, val - 1));
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                >
                  {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map((h) => (
                    <option key={h} value={h}>
                      {h}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Sadzby pre športy (za 1 hodinu) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Základné hodinové sadzby (€)
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                V bunkách fungujú aj šípky ↑ / ↓
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Bedminton
                </span>
                <PriceStepper
                  value={badmintonPrice}
                  onChange={setBadmintonPrice}
                  className="w-full justify-between"
                />
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Tenis (Hala)
                </span>
                <PriceStepper
                  value={tennisPrice}
                  onChange={setTennisPrice}
                  className="w-full justify-between"
                />
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Tenis (Antuka)
                </span>
                <PriceStepper
                  value={clayPrice}
                  onChange={setClayPrice}
                  className="w-full justify-between"
                />
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Squash
                </span>
                <PriceStepper
                  value={squashPrice}
                  onChange={setSquashPrice}
                  className="w-full justify-between"
                />
              </div>
            </div>
          </div>

          {/* Delete Confirmation Box if triggered */}
          {showDeleteConfirm && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-3">
              <p className="text-xs font-bold text-red-900">
                Naozaj chcete zmazať toto časové pásmo ({name})?
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition cursor-pointer"
                >
                  Áno, zmazať pásmo
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Zrušiť
                </button>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div>
              {isEditing && onDelete && !showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                  Zmazať pásmo
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-700/20 transition cursor-pointer"
              >
                <Check className="h-4 w-4" />
                {isEditing ? "Uložiť zmeny" : "Pridať pásmo"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
