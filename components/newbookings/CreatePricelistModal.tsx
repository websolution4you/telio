"use client";

import React, { useEffect, useState } from "react";
import {
  Calendar,
  Check,
  Clock3,
  Copy,
  Info,
  Pencil,
  Plus,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import {
  NtcPricelist,
  PriceInterval,
  DEFAULT_DISCOUNT_TIERS,
} from "@/lib/bookings/pricingTypes";
import EditIntervalModal from "./EditIntervalModal";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (pricelist: NtcPricelist) => void;
  currentPricelist?: NtcPricelist;
};

import {
  areDaysSame,
  getIntervalRank,
  getShortIntervalName,
  realignAllIntervals,
  sortIntervalsLogically,
} from "@/lib/bookings/intervalUtils";

const DEFAULT_INTERVALS: PriceInterval[] = [
  {
    id: "init-1",
    name: "Mimo špičky",
    days: [1, 2, 3, 4, 5],
    startHour: 7,
    endHour: 16,
    prices: { badminton: 14, tennis: 29, "tennis-clay": 20, squash: 11 },
  },
  {
    id: "init-2",
    name: "Špička",
    days: [1, 2, 3, 4, 5],
    startHour: 16,
    endHour: 22,
    prices: { badminton: 20, tennis: 39, "tennis-clay": 25, squash: 15 },
  },
  {
    id: "init-3",
    name: "Víkend",
    days: [6, 0],
    startHour: 7,
    endHour: 21,
    prices: { badminton: 14, tennis: 28, "tennis-clay": 20, squash: 11 },
  },
];

export default function CreatePricelistModal({
  isOpen,
  onClose,
  onCreate,
  currentPricelist,
}: Props) {
  const currentYear = new Date().getFullYear();
  const [name, setName] = useState(`Letná sezóna ${currentYear}`);
  const [validFrom, setValidFrom] = useState(`${currentYear}-05-01`);
  const [validTo, setValidTo] = useState(`${currentYear}-09-30`);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [intervalModalOpen, setIntervalModalOpen] = useState(false);
  const [editingInterval, setEditingInterval] = useState<Partial<PriceInterval> | null>(null);
  const [intervalModalTitle, setIntervalModalTitle] = useState("Pridať časové pásmo");

  const getFreshDefaultIntervals = (): PriceInterval[] => [
    {
      id: `init-1-${Date.now()}`,
      name: "Mimo špičky",
      days: [1, 2, 3, 4, 5],
      startHour: 7,
      endHour: 16,
      prices: { badminton: 14, tennis: 29, "tennis-clay": 20, squash: 11 },
    },
    {
      id: `init-2-${Date.now()}`,
      name: "Špička",
      days: [1, 2, 3, 4, 5],
      startHour: 16,
      endHour: 22,
      prices: { badminton: 20, tennis: 39, "tennis-clay": 25, squash: 15 },
    },
    {
      id: `init-3-${Date.now()}`,
      name: "Víkend",
      days: [6, 0],
      startHour: 7,
      endHour: 21,
      prices: { badminton: 14, tennis: 28, "tennis-clay": 20, squash: 11 },
    },
  ];

  const [intervals, setIntervals] = useState<PriceInterval[]>(getFreshDefaultIntervals);

  // Every time the modal opens, reset to fresh standard default intervals & fields
  useEffect(() => {
    if (isOpen) {
      setName(`Letná sezóna ${currentYear}`);
      setValidFrom(`${currentYear}-05-01`);
      setValidTo(`${currentYear}-09-30`);
      setIntervals(getFreshDefaultIntervals());
      setJustAddedId(null);
    }
  }, [isOpen, currentYear]);

  if (!isOpen) return null;

  const hasWeekend = intervals.some((i) => areDaysSame(i.days, [6, 0]));
  const weekdayIntervals = intervals.filter((i) => areDaysSame(i.days, [1, 2, 3, 4, 5]));
  const weekdayCount = weekdayIntervals.length;
  const isHappyHourInterval = (i: PriceInterval) =>
    i.name.toLowerCase().includes("happy") || (i.startHour === 12 && i.endHour === 16);
  const hasHappyHour = weekdayIntervals.some(isHappyHourInterval);
  const regularWeekdayIntervals = weekdayIntervals.filter((i) => !isHappyHourInterval(i));
  const canAddGeneralWeekday = regularWeekdayIntervals.length < 2;

  const handleUpdateIntervalTimes = (
    intervalId: string,
    newStartHour: number,
    newEndHour: number,
    newName?: string,
    changedField?: "startHour" | "endHour"
  ) => {
    setIntervals((prev) => {
      let updated = prev;
      if (newName !== undefined) {
        updated = updated.map((i) => (i.id === intervalId ? { ...i, name: newName } : i));
      }
      return realignAllIntervals(
        updated,
        intervalId,
        changedField,
        changedField === "startHour" ? newStartHour : newEndHour
      );
    });
  };

  const handleOpenAddIntervalModal = (type: "happy" | "weekday" | "weekend") => {
    if (type === "happy") {
      if (hasHappyHour || weekdayCount >= 3) return;
      setEditingInterval({
        id: `hh-${Date.now()}`,
        name: "Happy Hour",
        days: [1, 2, 3, 4, 5],
        startHour: 12,
        endHour: 16,
        prices: { badminton: 12, tennis: 24, "tennis-clay": 18, squash: 10 },
      });
      setIntervalModalTitle("Pridať pásmo Happy Hour");
      setIntervalModalOpen(true);
      return;
    }

    if (type === "weekend") {
      if (hasWeekend) return;
      setEditingInterval({
        id: `inv-we-${Date.now()}`,
        name: "Víkend",
        days: [6, 0],
        startHour: 7,
        endHour: 21,
        prices: { badminton: 14, tennis: 28, "tennis-clay": 20, squash: 11 },
      });
      setIntervalModalTitle("Pridať víkendové pásmo");
      setIntervalModalOpen(true);
      return;
    }

    if (!canAddGeneralWeekday) return;
    const existingRegular = regularWeekdayIntervals[0];

    let startHour = 16;
    let endHour = 22;
    let name = "Špička";

    if (existingRegular) {
      const isMorning =
        existingRegular.name.toLowerCase().includes("mimo") ||
        existingRegular.name.toLowerCase().includes("rann") ||
        existingRegular.startHour === 7;
      const isPeak =
        existingRegular.name.toLowerCase().includes("špičk") ||
        existingRegular.name.toLowerCase().includes("spick");

      if (isMorning && !isPeak) {
        startHour = 16;
        endHour = 22;
        name = "Špička";
      } else if (isPeak && !isMorning) {
        startHour = 7;
        endHour = 16;
        name = "Mimo špičky";
      } else {
        startHour = 16;
        endHour = 22;
        name = "Špička";
      }
    } else {
      startHour = 7;
      endHour = 16;
      name = "Mimo špičky";
    }

    setEditingInterval({
      id: `inv-${Date.now()}`,
      name,
      days: [1, 2, 3, 4, 5],
      startHour,
      endHour,
      prices: { badminton: 14, tennis: 28, "tennis-clay": 20, squash: 11 },
    });
    setIntervalModalTitle("Pridať pásmo (Po–Pi)");
    setIntervalModalOpen(true);
  };

  const handleOpenEditIntervalModal = (inv: PriceInterval) => {
    setEditingInterval(JSON.parse(JSON.stringify(inv)));
    setIntervalModalTitle(`Upraviť časové pásmo: ${inv.name}`);
    setIntervalModalOpen(true);
  };

  const handleSaveIntervalFromModal = (interval: PriceInterval) => {
    const existing = intervals.some((i) => i.id === interval.id);
    if (existing) {
      setIntervals((prev) => {
        const updated = prev.map((i) =>
          i.id === interval.id
            ? {
                ...interval,
                name: getShortIntervalName(interval.name),
              }
            : i
        );
        return realignAllIntervals(updated, interval.id, "endHour", interval.endHour);
      });
    } else {
      // Prevent duplicate names in same day group
      const duplicate = intervals.find(
        (i) =>
          areDaysSame(i.days, interval.days) &&
          i.name.trim().toLowerCase() === interval.name.trim().toLowerCase()
      );
      if (duplicate) {
        alert(`Pásmo s názvom "${interval.name}" už v týchto dňoch existuje. Zvoľte prosím iný názov.`);
        return;
      }

      const updated = [
        ...intervals,
        {
          ...interval,
          name: getShortIntervalName(interval.name),
        },
      ];
      setIntervals(realignAllIntervals(updated));
      setJustAddedId(interval.id);
      setTimeout(() => setJustAddedId(null), 2500);
    }
  };

  const handleRemoveInterval = (id: string) => {
    if (intervals.length <= 1) return;
    setIntervals((prev) => {
      const remaining = prev.filter((i) => i.id !== id);
      return realignAllIntervals(remaining);
    });
  };

  const handleCopyFromCurrent = () => {
    if (currentPricelist?.intervals) {
      setIntervals(
        realignAllIntervals(
          currentPricelist.intervals.map((inv) => ({
            ...inv,
            name: getShortIntervalName(inv.name),
          }))
        )
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newId = `pricelist-${Date.now()}`;
    const newPricelist: NtcPricelist = {
      id: newId,
      name: name.trim() || `Nový cenník ${currentYear}`,
      validFrom,
      validTo,
      isActive: false,
      nonMemberSurchargeEur: currentPricelist?.nonMemberSurchargeEur ?? 0,
      intervals,
      discountTiers: currentPricelist?.discountTiers
        ? JSON.parse(JSON.stringify(currentPricelist.discountTiers))
        : DEFAULT_DISCOUNT_TIERS,
    };

    onCreate(newPricelist);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Zavrieť"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-950 sm:text-lg leading-tight">
                Vytvoriť nový cenník
              </h2>
              <p className="text-[11px] text-slate-500">
                Základné parametre a časové pásma
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Názov cenníka a Platnosť v kompaktnom grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Názov cenníka
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="napr. Letná sezóna 2026"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 transition shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-slate-400" />
                Platnosť od
              </label>
              <input
                type="date"
                required
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-slate-400" />
                Platnosť do
              </label>
              <input
                type="date"
                required
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition shadow-2xs"
              />
            </div>
          </div>

          {/* Informatívna poznámka k platnosti */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 text-[11px] text-slate-600">
            <Info className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>
              <b>Platnosť je informatívna</b>, cenník sa v systéme uplatňuje, ak je nastavený ako <b>aktívny</b>.
            </span>
          </div>

          {/* Cenové hladiny / Časové pásma */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5 text-emerald-600" />
                Cenové hladiny (max 3 pre Po–Pi, 1 pre Víkend)
              </label>

              {/* Tlačidlá na pridanie pásma – trvalo viditeľné, neaktívne (zašedené) keď už existujú */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={hasHappyHour}
                  onClick={() => handleOpenAddIntervalModal("happy")}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
                    hasHappyHour
                      ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                      : "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 cursor-pointer shadow-2xs"
                  }`}
                  title={
                    hasHappyHour
                      ? "Pásmo Happy Hour už je pridané"
                      : "Vložiť pásmo Happy Hour (napr. 12:00 – 16:00)"
                  }
                >
                  <Sun className={`h-3 w-3 ${hasHappyHour ? "text-slate-400" : "text-amber-600"}`} />
                  Happy Hour (napr. 12–16h)
                </button>

                <button
                  type="button"
                  disabled={!canAddGeneralWeekday}
                  onClick={() => handleOpenAddIntervalModal("weekday")}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
                    !canAddGeneralWeekday
                      ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 cursor-pointer shadow-2xs"
                  }`}
                  title={
                    !canAddGeneralWeekday
                      ? "Základné pásma pre pracovné dni (Mimo špičky aj Špička) už máte nastavené. Môžete pridať už len Happy Hour."
                      : "Pridať pásmo pre Po–Pi"
                  }
                >
                  <Plus className={`h-3 w-3 ${!canAddGeneralWeekday ? "text-slate-400" : "text-emerald-700"}`} />
                  Po–Pi
                </button>

                <button
                  type="button"
                  disabled={hasWeekend}
                  onClick={() => handleOpenAddIntervalModal("weekend")}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
                    hasWeekend
                      ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                      : "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 cursor-pointer shadow-2xs"
                  }`}
                  title={
                    hasWeekend
                      ? "Víkend (7–21h) už v cenníku existuje"
                      : "Pridať celodenné víkendové pásmo (7:00 – 21:00)"
                  }
                >
                  <Plus className={`h-3 w-3 ${hasWeekend ? "text-slate-400" : "text-blue-700"}`} />
                  Víkend (7–21h)
                </button>
              </div>
            </div>

            {/* Kompaktný zoznam pásiem */}
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
              {intervals.map((inv) => {
                const isWeekend = areDaysSame(inv.days, [6, 0]);
                const isWeekday = areDaysSame(inv.days, [1, 2, 3, 4, 5]);
                const isJustAdded = justAddedId === inv.id;

                const weekdayGroup = intervals.filter((i) => areDaysSame(i.days, [1, 2, 3, 4, 5]));
                const invIdxInWeekday = weekdayGroup.findIndex((i) => i.id === inv.id);
                const isFirstInWeekday = isWeekday && invIdxInWeekday === 0;
                const isLastInWeekday = isWeekday && invIdxInWeekday === weekdayGroup.length - 1;

                // Smart boundaries:
                // First band always starts at 7:00, last weekday ends at 22:00, weekend is 7–21
                const maxEndHourForCurrent = isWeekday
                  ? 22 - (weekdayGroup.length - 1 - invIdxInWeekday)
                  : 21;
                const minStartHourForCurrent = isWeekday
                  ? 7 + invIdxInWeekday
                  : 7;

                const startHourOptions: number[] = [];
                for (let h = minStartHourForCurrent; h <= 21; h++) {
                  startHourOptions.push(h);
                }

                const endHourOptions: number[] = [];
                for (let h = inv.startHour + 1; h <= maxEndHourForCurrent; h++) {
                  endHourOptions.push(h);
                }

                return (
                  <div
                    key={inv.id}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 transition ${
                      isJustAdded
                        ? "border-amber-400 bg-amber-50/80 shadow-xs ring-2 ring-amber-300"
                        : "border-slate-200 bg-slate-50/70 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          isWeekday
                            ? "bg-emerald-100 text-emerald-800"
                            : isWeekend
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-200 text-slate-800"
                        }`}
                      >
                        {isWeekday ? "Po–Pi" : isWeekend ? "So–Ne" : "Dni"}
                      </span>

                      <input
                        type="text"
                        value={inv.name}
                        onChange={(e) =>
                          handleUpdateIntervalTimes(
                            inv.id,
                            inv.startHour,
                            inv.endHour,
                            e.target.value
                          )
                        }
                        className="bg-transparent font-bold text-xs text-slate-900 border-none outline-none focus:underline min-w-0 w-36 truncate"
                        placeholder="Názov"
                      />

                      <span className="text-[10px] text-slate-400 hidden sm:inline">
                        ({inv.endHour - inv.startHour}h)
                      </span>
                    </div>

                    {/* Čas od - do dropdowns */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center gap-1">
                        {isFirstInWeekday || isWeekend ? (
                          <span
                            title={isWeekend ? "Víkend začína o 7:00" : "Otváracia doba areálu (7:00)"}
                            className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 shadow-2xs select-none"
                          >
                            7:00
                          </span>
                        ) : (
                          <select
                            value={inv.startHour}
                            onChange={(e) =>
                              handleUpdateIntervalTimes(
                                inv.id,
                                parseInt(e.target.value) || 7,
                                inv.endHour,
                                inv.name,
                                "startHour"
                              )
                            }
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                          >
                            {startHourOptions.map((h) => (
                              <option key={h} value={h}>
                                {h}:00
                              </option>
                            ))}
                          </select>
                        )}
                        <span className="text-slate-400 font-bold">–</span>
                        {isLastInWeekday || isWeekend ? (
                          <span
                            title={
                              isWeekend
                                ? "Víkend končí o 21:00"
                                : "Záverečná doba areálu cez týždeň (22:00)"
                            }
                            className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 shadow-2xs select-none"
                          >
                            {isWeekend ? "21:00" : "22:00"}
                          </span>
                        ) : (
                          <select
                            value={inv.endHour}
                            onChange={(e) =>
                              handleUpdateIntervalTimes(
                                inv.id,
                                inv.startHour,
                                parseInt(e.target.value) || 21,
                                inv.name,
                                "endHour"
                              )
                            }
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                          >
                            {endHourOptions.map((h) => (
                              <option key={h} value={h}>
                                {h}:00
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Upraviť pásmo v okne */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditIntervalModal(inv)}
                        className="p-1 text-slate-400 hover:text-emerald-700 transition rounded-lg hover:bg-emerald-50 cursor-pointer ml-0.5"
                        title="Upraviť pásmo v okne"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      {/* Zmazať pásmo */}
                      {intervals.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveInterval(inv.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-rose-50 cursor-pointer ml-0.5"
                          title="Odstrániť pásmo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Zrušiť
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-700/20 hover:bg-emerald-700 transition cursor-pointer"
            >
              <Check className="h-4 w-4" />
              Vytvoriť cenník
            </button>
          </div>
        </form>
      </div>

      {/* Modal for adding/editing time band */}
      <EditIntervalModal
        isOpen={intervalModalOpen}
        onClose={() => {
          setIntervalModalOpen(false);
          setEditingInterval(null);
        }}
        initialInterval={editingInterval}
        title={intervalModalTitle}
        onSave={handleSaveIntervalFromModal}
        onDelete={handleRemoveInterval}
      />
    </div>
  );
}
