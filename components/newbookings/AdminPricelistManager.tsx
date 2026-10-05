"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Calculator,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Coins,
  Copy,
  CreditCard,
  Flame,
  Info,
  Loader2,
  Percent,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  NtcPricelist,
  PriceInterval,
  DiscountTier,
  DEFAULT_NTC_WINTER_PRICELIST,
  DEFAULT_DISCOUNT_TIERS,
} from "@/lib/bookings/pricingTypes";
import {
  fetchPricelistsAction,
  savePricelistAction,
  setActivePricelistAction,
} from "@/app/actions/pricelists";

export default function AdminPricelistManager() {
  const [pricelists, setPricelists] = useState<NtcPricelist[]>([DEFAULT_NTC_WINTER_PRICELIST]);
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_NTC_WINTER_PRICELIST.id);
  const [current, setCurrent] = useState<NtcPricelist>(DEFAULT_NTC_WINTER_PRICELIST);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [previewTierId, setPreviewTierId] = useState<string>("tier-10");
  const [basePrice60, setBasePrice60] = useState<number>(10);
  const [basePrice120, setBasePrice120] = useState<number>(0);

  useEffect(() => {
    let active = true;
    fetchPricelistsAction().then((res) => {
      if (!active) return;
      if (res.success && res.pricelists.length > 0) {
        setPricelists(res.pricelists);
        const activeOne = res.pricelists.find((p) => p.isActive) || res.pricelists[0];
        setSelectedId(activeOne.id);
        setCurrent(JSON.parse(JSON.stringify(activeOne)));
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleSelectPricelist = (id: string) => {
    const found = pricelists.find((p) => p.id === id);
    if (found) {
      setSelectedId(id);
      setCurrent(JSON.parse(JSON.stringify(found)));
      setFeedback(null);
    }
  };

  const handleUpdatePrice = (
    intervalId: string,
    sportKey: "badminton" | "tennis" | "tennis-clay" | "squash",
    valueStr: string
  ) => {
    const num = parseFloat(valueStr);
    const val = isNaN(num) ? 0 : Math.max(0, num);
    setCurrent((prev) => ({
      ...prev,
      intervals: prev.intervals.map((inv) => {
        if (inv.id !== intervalId) return inv;
        return {
          ...inv,
          prices: {
            ...inv.prices,
            [sportKey]: val,
          },
        };
      }),
    }));
  };

  const areDaysSame = (a: number[], b: number[]) =>
    a.length === b.length && a.every((d) => b.includes(d));

  const sortIntervalsLogically = (intervals: PriceInterval[]): PriceInterval[] => {
    return [...intervals].sort((a, b) => {
      // 1. Day group: weekdays (Po=1 .. Pi=5) come first, weekends (So=6, Ne=7) later
      const minDayA = Math.min(...a.days.map((d) => (d === 0 ? 7 : d)));
      const minDayB = Math.min(...b.days.map((d) => (d === 0 ? 7 : d)));

      if (minDayA !== minDayB) {
        return minDayA - minDayB;
      }

      // 2. Larger day groups come before smaller subsets
      if (a.days.length !== b.days.length) {
        return b.days.length - a.days.length;
      }

      // 3. Chronologically by start hour
      return a.startHour - b.startHour;
    });
  };

  const handleSortIntervals = () => {
    setCurrent((prev) => ({
      ...prev,
      intervals: sortIntervalsLogically(prev.intervals),
    }));
  };

  const handleMoveInterval = (intervalId: string, direction: "up" | "down") => {
    setCurrent((prev) => {
      const idx = prev.intervals.findIndex((i) => i.id === intervalId);
      if (idx === -1) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.intervals.length) return prev;

      const updated = [...prev.intervals];
      const temp = updated[idx];
      updated[idx] = updated[targetIdx];
      updated[targetIdx] = temp;
      return { ...prev, intervals: updated };
    });
  };

  const handleUpdateIntervalTimes = (
    intervalId: string,
    startHour: number,
    endHour: number,
    name: string,
    changedField?: "startHour" | "endHour"
  ) => {
    setCurrent((prev) => {
      const idx = prev.intervals.findIndex((i) => i.id === intervalId);
      if (idx === -1) return prev;

      const currentInv = prev.intervals[idx];

      const updated = prev.intervals.map((inv) =>
        inv.id === intervalId ? { ...inv, startHour, endHour, name } : inv
      );

      // Auto-chain consecutive intervals for the same days
      if (changedField === "endHour") {
        for (let i = idx + 1; i < updated.length; i++) {
          if (areDaysSame(updated[i].days, currentInv.days)) {
            const nextOldEnd = updated[i].endHour;
            updated[i] = {
              ...updated[i],
              startHour: endHour,
              endHour: Math.max(endHour + 1, nextOldEnd),
            };
            break;
          }
        }
      } else if (changedField === "startHour") {
        for (let i = idx - 1; i >= 0; i--) {
          if (areDaysSame(updated[i].days, currentInv.days)) {
            const prevOldStart = updated[i].startHour;
            updated[i] = {
              ...updated[i],
              endHour: startHour,
              startHour: Math.min(startHour - 1, prevOldStart),
            };
            break;
          }
        }
      }

      return { ...prev, intervals: updated };
    });
  };

  const handleAutoAlignIntervals = () => {
    setCurrent((prev) => {
      const updated = [...prev.intervals];

      // Find unique day groups
      const uniqueDayGroups: number[][] = [];
      for (const inv of updated) {
        if (!uniqueDayGroups.some((d) => areDaysSame(d, inv.days))) {
          uniqueDayGroups.push(inv.days);
        }
      }

      for (const days of uniqueDayGroups) {
        const groupIndices: number[] = [];
        updated.forEach((inv, idx) => {
          if (areDaysSame(inv.days, days)) {
            groupIndices.push(idx);
          }
        });

        groupIndices.sort((a, b) => updated[a].startHour - updated[b].startHour);
        if (groupIndices.length === 0) continue;

        // 1. Force first interval to start at 7:00 (opening time)
        const firstIdx = groupIndices[0];
        const firstOldEnd = updated[firstIdx].endHour;
        updated[firstIdx] = {
          ...updated[firstIdx],
          startHour: 7,
          endHour: Math.max(8, firstOldEnd),
        };

        // 2. Chain intermediate intervals
        for (let k = 0; k < groupIndices.length - 1; k++) {
          const currIdx = groupIndices[k];
          const nextIdx = groupIndices[k + 1];
          const currEnd = updated[currIdx].endHour;
          const nextOldEnd = updated[nextIdx].endHour;

          updated[nextIdx] = {
            ...updated[nextIdx],
            startHour: currEnd,
            endHour: Math.max(currEnd + 1, nextOldEnd),
          };
        }

        // 3. Ensure last interval ends at least at 21:00 (closing time)
        const lastIdx = groupIndices[groupIndices.length - 1];
        if (updated[lastIdx].endHour < 21) {
          updated[lastIdx] = {
            ...updated[lastIdx],
            endHour: 21,
          };
        }
      }

      return { ...prev, intervals: sortIntervalsLogically(updated) };
    });
  };

  const isIntervalOverride = (
    inv: PriceInterval,
    allIntervals: PriceInterval[]
  ): boolean => {
    // An interval is an override exception if its days are a strict subset of broader intervals
    return (
      inv.days.length < 7 &&
      inv.days.every((d) =>
        allIntervals.some(
          (other) =>
            other.id !== inv.id &&
            other.days.includes(d) &&
            other.days.length > inv.days.length
        )
      )
    );
  };

  const validationAlerts = useMemo(() => {
    const alerts: { type: "gap" | "overlap" | "boundary"; message: string }[] = [];
    const dayNames = ["Nedeľa", "Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota"];

    // 1. Day-by-day coverage check: every day of the week must have pricing from 7:00 to 21:00
    const checkDays = [1, 2, 3, 4, 5, 6, 0];
    const missingDaysCoverage: { day: number; missingHours: number[] }[] = [];

    for (const d of checkDays) {
      const dayIntervals = current.intervals.filter((i) => i.days.includes(d));
      const missingHours: number[] = [];

      for (let h = 7; h < 21; h++) {
        const covered = dayIntervals.some((i) => i.startHour <= h && i.endHour >= h + 1);
        if (!covered) {
          missingHours.push(h);
        }
      }

      if (missingHours.length > 0) {
        missingDaysCoverage.push({ day: d, missingHours });
      }
    }

    if (missingDaysCoverage.length > 0) {
      // Group days with identical missing hours for cleaner messages
      const groupedGaps: { days: number[]; hours: string }[] = [];
      for (const item of missingDaysCoverage) {
        const minH = Math.min(...item.missingHours);
        const maxH = Math.max(...item.missingHours) + 1;
        const hourStr = `${minH}:00 – ${maxH}:00`;

        const existing = groupedGaps.find((g) => g.hours === hourStr);
        if (existing) {
          existing.days.push(item.day);
        } else {
          groupedGaps.push({ days: [item.day], hours: hourStr });
        }
      }

      for (const gap of groupedGaps) {
        const daysLabel =
          gap.days.length === 5 && [1, 2, 3, 4, 5].every((d) => gap.days.includes(d))
            ? "V pracovných dňoch (Po – Pi)"
            : gap.days.length === 2 && [6, 0].every((d) => gap.days.includes(d))
            ? "Cez víkend (So – Ne)"
            : gap.days.map((d) => dayNames[d]).join(", ");

        alerts.push({
          type: "gap",
          message: `${daysLabel} chýba cena pre ${gap.hours}.`,
        });
      }
    }

    // 2. Ambiguous overlaps: intervals that have the EXACT same days and overlap each other
    const groups: PriceInterval[][] = [];
    for (const inv of current.intervals) {
      let g = groups.find((grp) => areDaysSame(grp[0].days, inv.days));
      if (!g) {
        g = [];
        groups.push(g);
      }
      g.push(inv);
    }

    for (const g of groups) {
      if (g.length <= 1) continue;
      const sorted = [...g].sort((a, b) => a.startHour - b.startHour);
      for (let i = 0; i < sorted.length - 1; i++) {
        const curr = sorted[i];
        const next = sorted[i + 1];
        if (curr.endHour > next.startHour) {
          const daysLabel = curr.days.includes(6) ? "cez víkend" : "v pracovných dňoch";
          alerts.push({
            type: "overlap",
            message: `Pásma sa prekrývajú medzi ${next.startHour}:00 a ${curr.endHour}:00 (${daysLabel}).`,
          });
        }
      }
    }

    return alerts;
  }, [current.intervals]);

  const handleAddInterval = (groupType: "weekday" | "weekend" | "custom" = "weekday") => {
    const newId = `interval-${Date.now()}`;
    const days =
      groupType === "weekday"
        ? [1, 2, 3, 4, 5]
        : groupType === "weekend"
        ? [6, 0]
        : [1, 2, 3, 4, 5];

    // Find existing intervals for this day group
    const existing = current.intervals
      .filter((i) => areDaysSame(i.days, days))
      .sort((a, b) => a.startHour - b.startHour);

    let startHour = 7;
    let endHour = 21;
    let name =
      groupType === "weekday"
        ? "Pracovné dni (Nové pásmo)"
        : groupType === "weekend"
        ? "Víkend (Nové pásmo)"
        : "Vlastné časové pásmo";

    if (existing.length === 1) {
      // Split the single interval into two: e.g. 7-14 and 14-21
      const first = existing[0];
      const mid = Math.round((first.startHour + first.endHour) / 2);
      const updatedIntervals = current.intervals.map((inv) =>
        inv.id === first.id ? { ...inv, endHour: mid } : inv
      );
      startHour = mid;
      endHour = first.endHour;
      const newInv: PriceInterval = {
        id: newId,
        name,
        days,
        startHour,
        endHour,
        prices: { ...first.prices },
      };
      setCurrent((prev) => ({
        ...prev,
        intervals: sortIntervalsLogically([...updatedIntervals, newInv]),
      }));
      return;
    } else if (existing.length >= 2) {
      // Split the last interval into two
      const last = existing[existing.length - 1];
      const prevStart = last.startHour;
      const prevEnd = last.endHour;
      const mid = Math.max(prevStart + 1, Math.round((prevStart + prevEnd) / 2));
      const updatedIntervals = current.intervals.map((inv) =>
        inv.id === last.id ? { ...inv, endHour: mid } : inv
      );
      startHour = mid;
      endHour = prevEnd;
      const newInv: PriceInterval = {
        id: newId,
        name,
        days,
        startHour,
        endHour,
        prices: { ...last.prices },
      };
      setCurrent((prev) => ({
        ...prev,
        intervals: sortIntervalsLogically([...updatedIntervals, newInv]),
      }));
      return;
    }

    const newInv: PriceInterval = {
      id: newId,
      name,
      days,
      startHour,
      endHour,
      prices: {
        badminton: 15,
        tennis: 25,
        "tennis-clay": 20,
        squash: 12,
      },
    };
    setCurrent((prev) => ({
      ...prev,
      intervals: sortIntervalsLogically([...prev.intervals, newInv]),
    }));
  };

  const handleToggleDay = (intervalId: string, day: number) => {
    setCurrent((prev) => ({
      ...prev,
      intervals: prev.intervals.map((inv) => {
        if (inv.id !== intervalId) return inv;
        const exists = inv.days.includes(day);
        const newDays = exists ? inv.days.filter((d) => d !== day) : [...inv.days, day].sort();
        if (newDays.length === 0) return inv;
        return { ...inv, days: newDays };
      }),
    }));
  };

  const handleSetDayPreset = (intervalId: string, preset: "weekday" | "weekend" | "allday") => {
    const days =
      preset === "weekday"
        ? [1, 2, 3, 4, 5]
        : preset === "weekend"
        ? [6, 0]
        : [1, 2, 3, 4, 5, 6, 0];
    setCurrent((prev) => ({
      ...prev,
      intervals: prev.intervals.map((inv) =>
        inv.id === intervalId ? { ...inv, days } : inv
      ),
    }));
  };

  const handleSetAllDay = (intervalId: string) => {
    setCurrent((prev) => ({
      ...prev,
      intervals: prev.intervals.map((inv) =>
        inv.id === intervalId ? { ...inv, startHour: 7, endHour: 21 } : inv
      ),
    }));
  };

  const handleRemoveInterval = (intervalId: string) => {
    if (current.intervals.length <= 1) {
      alert("Cenník musí obsahovať aspoň jedno časové pásmo.");
      return;
    }
    const invToRemove = current.intervals.find((i) => i.id === intervalId);
    if (!invToRemove) return;

    setCurrent((prev) => {
      const remaining = prev.intervals.filter((i) => i.id !== intervalId);
      const sameDays = remaining.filter((i) => areDaysSame(i.days, invToRemove.days));
      if (sameDays.length > 0) {
        const sorted = [...sameDays].sort((a, b) => a.startHour - b.startHour);
        if (invToRemove.startHour <= sorted[0].startHour) {
          const nextId = sorted[0].id;
          return {
            ...prev,
            intervals: remaining.map((i) => (i.id === nextId ? { ...i, startHour: 7 } : i)),
          };
        } else {
          const lastId = sorted[sorted.length - 1].id;
          return {
            ...prev,
            intervals: remaining.map((i) => (i.id === lastId ? { ...i, endHour: Math.max(21, i.endHour) } : i)),
          };
        }
      }
      return { ...prev, intervals: remaining };
    });
  };

  const handleCreateNewPricelist = () => {
    const newId = `pricelist-${Date.now()}`;
    const newPricelist: NtcPricelist = {
      id: newId,
      name: `Nový cenník ${new Date().getFullYear()}`,
      validFrom: `${new Date().getFullYear()}-05-01`,
      validTo: `${new Date().getFullYear()}-09-30`,
      isActive: false,
      nonMemberSurchargeEur: 2.00,
      intervals: JSON.parse(JSON.stringify(current.intervals)),
      discountTiers: JSON.parse(JSON.stringify(current.discountTiers || DEFAULT_DISCOUNT_TIERS)),
    };
    setPricelists((prev) => [newPricelist, ...prev]);
    setSelectedId(newId);
    setCurrent(newPricelist);
    setFeedback({
      type: "success",
      message: "Vytvorený nový cenník. Upravte si názov, platnosť a sumy a kliknite Uložiť.",
    });
  };

  const handleUpdateTier = (tierId: string, updates: Partial<DiscountTier>) => {
    setCurrent((prev) => {
      const tiers = prev.discountTiers || DEFAULT_DISCOUNT_TIERS;
      return {
        ...prev,
        discountTiers: tiers.map((t) => {
          if (t.id !== tierId) return t;
          const merged = { ...t, ...updates };
          if ("percentageOfBase" in updates && updates.percentageOfBase !== undefined) {
            merged.discountPercent = Math.max(0, 100 - updates.percentageOfBase);
          }
          return merged;
        }),
      };
    });
  };

  const handleAddTier = () => {
    const newTier: DiscountTier = {
      id: `tier-${Date.now()}`,
      name: "Nová zľava",
      isPercentual: true,
      percentageOfBase: 85,
      discountPercent: 15,
      price60: 0,
      price120: 0,
    };
    setCurrent((prev) => ({
      ...prev,
      discountTiers: [...(prev.discountTiers || DEFAULT_DISCOUNT_TIERS), newTier],
    }));
    setPreviewTierId(newTier.id);
  };

  const handleRemoveTier = (tierId: string) => {
    setCurrent((prev) => {
      const tiers = prev.discountTiers || DEFAULT_DISCOUNT_TIERS;
      if (tiers.length <= 1) return prev;
      return {
        ...prev,
        discountTiers: tiers.filter((t) => t.id !== tierId),
      };
    });
  };

  const handleResetToDefaultTiers = () => {
    setCurrent((prev) => ({
      ...prev,
      discountTiers: JSON.parse(JSON.stringify(DEFAULT_DISCOUNT_TIERS)),
    }));
    setFeedback({
      type: "success",
      message: "Zľavové hladiny boli obnovené na pôvodné hodnoty zo systému NTC.",
    });
  };

  const handleSave = async () => {
    if (validationAlerts.length > 0) {
      setFeedback({
        type: "error",
        message:
          "Cenník nemožno uložiť: časové pásma musia pokrývať celú prevádzkovú dobu (7:00 – 21:00) bez medzier a prekrytí. Použite tlačidlo 'Automaticky zosúladiť nadväznosť časov'.",
      });
      return;
    }
    setSaving(true);
    setFeedback(null);
    const res = await savePricelistAction(current);
    if (res.success) {
      setPricelists((prev) =>
        prev.map((p) => (p.id === current.id ? JSON.parse(JSON.stringify(current)) : p))
      );
      setFeedback({ type: "success", message: "Cenník bol úspešne uložený." });
    } else {
      setFeedback({ type: "error", message: res.error || "Nepodarilo sa uložiť cenník." });
    }
    setSaving(false);
  };

  const handleMakeActive = async () => {
    setSaving(true);
    const res = await setActivePricelistAction(current.id);
    if (res.success) {
      setPricelists((prev) =>
        prev.map((p) => ({ ...p, isActive: p.id === current.id }))
      );
      setCurrent((prev) => ({ ...prev, isActive: true }));
      setFeedback({ type: "success", message: "Tento cenník bol nastavený ako aktívny." });
    } else {
      setFeedback({ type: "error", message: res.error || "Chyba pri aktivácii." });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <span className="text-sm font-semibold">Načítavam cenníky...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar: Selector & Action buttons */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 shadow-xs">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Sezónny cenník
              </span>
              {current.isActive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                  <Flame className="h-3 w-3 text-emerald-600" />
                  Aktívny v systéme
                </span>
              )}
            </div>
            <select
              value={selectedId}
              onChange={(e) => handleSelectPricelist(e.target.value)}
              className="mt-0.5 text-lg font-bold text-slate-900 bg-transparent border-none outline-none cursor-pointer hover:text-emerald-700 transition"
            >
              {pricelists.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.isActive ? "(Aktívny)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!current.isActive && (
            <button
              type="button"
              disabled={saving}
              onClick={handleMakeActive}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition cursor-pointer disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Nastaviť ako aktívny cenník
            </button>
          )}

          <button
            type="button"
            onClick={handleCreateNewPricelist}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
          >
            <Plus className="h-4 w-4 text-emerald-600" />
            Vytvoriť nový cenník
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-700/20 hover:bg-emerald-700 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Ukladám..." : "Uložiť cenník"}
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-2xl p-4 text-xs font-bold shadow-2xs flex items-center justify-between border ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-red-50 border-red-200 text-red-900"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Basic Data: Názov, Platnosť od-do, Príplatok bez karty */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          Základné parametre sezóny
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Názov cenníka
            </span>
            <input
              type="text"
              value={current.name}
              onChange={(e) => setCurrent({ ...current, name: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition"
              placeholder="napr. Cenník Zimná sezóna 2026/2027"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Platnosť od
            </span>
            <input
              type="date"
              value={current.validFrom}
              onChange={(e) => setCurrent({ ...current, validFrom: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Platnosť do
            </span>
            <input
              type="date"
              value={current.validTo}
              onChange={(e) => setCurrent({ ...current, validTo: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Príplatok bez členskej karty (€ / hod.)
            </span>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="0"
                value={current.nonMemberSurchargeEur}
                onChange={(e) =>
                  setCurrent({
                    ...current,
                    nonMemberSurchargeEur: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                €
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Main Pricing Matrix (Based on official physical board from NTC) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-emerald-600" />
              Sadzby podľa časových pásiem a športov (za 1 hodinu)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Základná pultová cena pre držiteľov karty. Pre hráčov bez karty sa automaticky pripočíta príplatok {current.nonMemberSurchargeEur.toFixed(2)} €/hod.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSortIntervals}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
              title="Zoradiť pásma chronologicky podľa dní a hodín (Pondelok – Piatok najprv, potom Víkend)"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
              Zoradiť
            </button>
            <button
              type="button"
              onClick={() => handleAddInterval("weekday")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Pridať pásmo (Po–Pi)
            </button>
            <button
              type="button"
              onClick={() => handleAddInterval("weekend")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Pridať pásmo (Víkend)
            </button>
            <button
              type="button"
              onClick={() => handleAddInterval("custom")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Vytvoriť pásmo s vlastným výberom dní"
            >
              <Plus className="h-3.5 w-3.5" />
              Vlastné
            </button>
          </div>
        </div>

        {validationAlerts.length > 0 && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-950 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Upozornenie k prevádzkovým hodinám a nadväznosti (7:00 – 21:00):</span>
              </div>
              <button
                type="button"
                onClick={handleAutoAlignIntervals}
                className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-amber-700 transition cursor-pointer self-start sm:self-auto"
              >
                Automaticky zosúladiť nadväznosť (7:00 – 21:00)
              </button>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-amber-900/90 pl-1 font-medium">
              {validationAlerts.map((a, idx) => (
                <li key={idx}>{a.message}</li>
              ))}
            </ul>
          </div>
        )}

        {/* The Matrix Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4 min-w-[240px]">Časové pásmo / Dni</th>
                <th className="py-3 px-4 min-w-[140px]">
                  <div className="flex items-center gap-1.5">
                    <span>Hodiny (od – do)</span>
                    <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 normal-case">
                      7 – 21h
                    </span>
                  </div>
                </th>
                <th className="py-3 px-4 min-w-[110px] text-center">Bedminton</th>
                <th className="py-3 px-4 min-w-[110px] text-center">Tenis (Hala)</th>
                <th className="py-3 px-4 min-w-[110px] text-center">Tenis (Antuka)</th>
                <th className="py-3 px-4 min-w-[110px] text-center">Squash</th>
                <th className="py-3 px-3 text-right">Akcie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {current.intervals.map((inv, idx) => {
                const sameDayIntervals = current.intervals
                  .filter((i) => areDaysSame(i.days, inv.days))
                  .sort((a, b) => a.startHour - b.startHour);
                const isFirstInGroup = sameDayIntervals[0]?.id === inv.id;
                const isLastInGroup =
                  sameDayIntervals[sameDayIntervals.length - 1]?.id === inv.id;

                const isOverride = isIntervalOverride(inv, current.intervals);

                const hasStartWarning =
                  !isOverride &&
                  ((isFirstInGroup && inv.startHour !== 7) || inv.startHour < 7);
                const hasEndWarning =
                  !isOverride &&
                  ((isLastInGroup && inv.endHour < 21) || inv.endHour > 22);

                return (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 min-w-[260px]">
                      <div className="flex items-center gap-2">
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
                          className="w-full rounded-lg border border-transparent hover:border-slate-200 focus:border-emerald-500 bg-transparent px-2 py-1 font-bold text-slate-900 outline-none transition text-sm"
                          placeholder="Názov pásma..."
                        />
                        {isOverride && (
                          <span
                            className="shrink-0 rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700 shadow-2xs"
                            title="Toto pásmo platí prednostne pre vybrané dni a časy. V ostatných hodinách platí všeobecný cenník."
                          >
                            ✨ Výnimka
                          </span>
                        )}
                      </div>

                      {/* Clickable Days Selector */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {[
                          { d: 1, label: "Po" },
                          { d: 2, label: "Ut" },
                          { d: 3, label: "St" },
                          { d: 4, label: "Št" },
                          { d: 5, label: "Pi" },
                          { d: 6, label: "So" },
                          { d: 0, label: "Ne" },
                        ].map(({ d, label }) => {
                          const active = inv.days.includes(d);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => handleToggleDay(inv.id, d)}
                              className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition ${
                                active
                                  ? "bg-emerald-600 text-white shadow-2xs"
                                  : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                              }`}
                              title={`Prepnúť ${label}`}
                            >
                              {label}
                            </button>
                          );
                        })}

                        <span className="text-slate-300 text-[10px] mx-0.5">|</span>

                        <button
                          type="button"
                          onClick={() => handleSetDayPreset(inv.id, "weekday")}
                          className="text-[9px] font-semibold text-slate-500 hover:text-emerald-700 hover:underline cursor-pointer"
                        >
                          Po–Pi
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetDayPreset(inv.id, "weekend")}
                          className="text-[9px] font-semibold text-slate-500 hover:text-emerald-700 hover:underline cursor-pointer"
                        >
                          So–Ne
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetDayPreset(inv.id, "allday")}
                          className="text-[9px] font-semibold text-slate-500 hover:text-emerald-700 hover:underline cursor-pointer"
                        >
                          Celý týždeň
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAllDay(inv.id)}
                          className="text-[9px] font-semibold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
                          title="Nastaviť hodiny od 7 do 21"
                        >
                          Celý deň (7–21h)
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          <input
                            type="number"
                            min="7"
                            max="21"
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
                            title={
                              hasStartWarning
                                ? isFirstInGroup && inv.startHour !== 7
                                  ? "Kurty otvárajú o 7:00, prvé pásmo musí začínať o 7:00"
                                  : "Čas nemôže byť pred 7:00"
                                : undefined
                            }
                            className={`w-12 rounded-lg border px-2 py-1 text-center font-bold outline-none transition ${
                              hasStartWarning
                                ? "border-rose-400 bg-rose-50 text-rose-950 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                                : "border-slate-200 bg-white text-slate-900 focus:border-emerald-500"
                            }`}
                          />
                          <span className="text-slate-400">–</span>
                          <input
                            type="number"
                            min="8"
                            max="22"
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
                            title={
                              hasEndWarning
                                ? isLastInGroup && inv.endHour < 21
                                  ? "Posledné pásmo musí pokrývať prevádzku do 21:00 (cez týždeň do 22:00)"
                                  : "Čas nemôže byť po 22:00"
                                : undefined
                            }
                            className={`w-12 rounded-lg border px-2 py-1 text-center font-bold outline-none transition ${
                              hasEndWarning
                                ? "border-rose-400 bg-rose-50 text-rose-950 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                                : "border-slate-200 bg-white text-slate-900 focus:border-emerald-500"
                            }`}
                          />
                          <span className="text-slate-400 font-semibold">hod.</span>
                        </div>

                        {/* Quick-fix buttons */}
                        <div className="flex items-center gap-2 text-[10px]">
                          {isFirstInGroup && inv.startHour !== 7 && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateIntervalTimes(
                                  inv.id,
                                  7,
                                  inv.endHour,
                                  inv.name,
                                  "startHour"
                                )
                              }
                              className="font-bold text-rose-600 hover:text-rose-800 underline decoration-rose-300 cursor-pointer"
                            >
                              Nastaviť 7h
                            </button>
                          )}
                          {isLastInGroup && inv.endHour < 21 && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateIntervalTimes(
                                  inv.id,
                                  inv.startHour,
                                  21,
                                  inv.name,
                                  "endHour"
                                )
                              }
                              className="font-bold text-rose-600 hover:text-rose-800 underline decoration-rose-300 cursor-pointer"
                            >
                              Doplniť do 21h
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                  {/* Bedminton */}
                  <td className="py-3.5 px-3 text-center">
                    <div className="relative inline-block w-24">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={inv.prices.badminton ?? 14}
                        onChange={(e) => handleUpdatePrice(inv.id, "badminton", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-center font-extrabold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition shadow-2xs"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        €
                      </span>
                    </div>
                  </td>

                  {/* Tenis Hala */}
                  <td className="py-3.5 px-3 text-center">
                    <div className="relative inline-block w-24">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={inv.prices.tennis ?? 29}
                        onChange={(e) => handleUpdatePrice(inv.id, "tennis", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-center font-extrabold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition shadow-2xs"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        €
                      </span>
                    </div>
                  </td>

                  {/* Tenis Antuka */}
                  <td className="py-3.5 px-3 text-center">
                    <div className="relative inline-block w-24">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={inv.prices["tennis-clay"] ?? 20}
                        onChange={(e) => handleUpdatePrice(inv.id, "tennis-clay", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-center font-extrabold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition shadow-2xs"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        €
                      </span>
                    </div>
                  </td>

                  {/* Squash */}
                  <td className="py-3.5 px-3 text-center">
                    <div className="relative inline-block w-24">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={inv.prices.squash ?? 11}
                        onChange={(e) => handleUpdatePrice(inv.id, "squash", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-center font-extrabold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition shadow-2xs"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        €
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveInterval(inv.id, "up")}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition cursor-pointer"
                        title="Posunúť vyššie"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === current.intervals.length - 1}
                        onClick={() => handleMoveInterval(inv.id, "down")}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition cursor-pointer"
                        title="Posunúť nižšie"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveInterval(inv.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                        title="Zmazať pásmo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>

        {/* Footer info box */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-950 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-blue-900">
            <Info className="h-4 w-4 shrink-0 text-blue-600" />
            <span>Pravidlá zliav a členských výhod v NTC:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-blue-900/90 pl-1">
            <li><b>Držitelia NTC karty:</b> platia presne sadzby uvedené v tabuľke.</li>
            <li><b>Hráči bez karty:</b> automatický príplatok <b>+{current.nonMemberSurchargeEur.toFixed(2)} €</b> na hodinu k uvedenej cene.</li>
            <li><b>MultiSport karty:</b> 1 karta = zľava 10 % + 50 %, 2 karty = 100 % zľava (rezervácia zdarma).</li>
            <li><b>Role (NTC Team, Tréneri):</b> zľavy a oprávnenia sa spravujú v sekcii <b>Nastavenia &gt; Pravidlá rolí</b>.</li>
          </ul>
        </div>
      </div>

      {/* Discount Tiers Section & Automatic Live Price Calculator matching legacy screen */}
      {(() => {
        const tiers = current.discountTiers && current.discountTiers.length > 0
          ? current.discountTiers
          : DEFAULT_DISCOUNT_TIERS;
        const selectedTier = tiers.find((t) => t.id === previewTierId) || tiers[1] || tiers[0];

        const round1Dec = (val: number): number => Math.round(val * 10) / 10;
        const formatEur = (val: number): string => `${round1Dec(val).toFixed(1).replace(".", ",")} €`;

        return (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Percent className="h-4 w-4 text-emerald-600" />
                    Zľavové hladiny a automatický prepočet (Ceny a zľavy)
                  </h2>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    Zaokrúhľovanie na 1 des. miesto
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Presné zľavové hladiny podľa pôvodného systému NTC (Základná cena, 10 % zľava, 20 % zľava, 50 % zľava, Bežná cena, Hotovosť).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToDefaultTiers}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  title="Obnoviť presné hladiny zo snímky obrazovky"
                >
                  Obnoviť predvolené
                </button>
                <button
                  type="button"
                  onClick={handleAddTier}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Pridať hladinu
                </button>
              </div>
            </div>

            {/* Reference Base Price Selector */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-slate-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Vzorový základ pre prepočet stĺpcov 60 / 120 min:
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-500 text-[11px] mr-1">Rýchle predvoľby:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setBasePrice60(10);
                      setBasePrice120(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      basePrice60 === 10 && basePrice120 === 0
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    10,00 € (zo screenu)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBasePrice60(29);
                      setBasePrice120(58);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      basePrice60 === 29
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Tenis hala (29 €)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBasePrice60(20);
                      setBasePrice120(40);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      basePrice60 === 20
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Tenis antuka (20 €)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBasePrice60(14);
                      setBasePrice120(28);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      basePrice60 === 14
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Bedminton (14 €)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBasePrice60(11);
                      setBasePrice120(22);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      basePrice60 === 11
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Squash (11 €)
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-600">Základná sadzba 60 min:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={basePrice60}
                      onChange={(e) => setBasePrice60(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-18 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center font-bold text-slate-900 outline-none focus:border-emerald-500"
                    />
                    <span className="font-bold text-slate-500">€</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-600">Základná sadzba 120 min:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={basePrice120}
                      onChange={(e) => setBasePrice120(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-18 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center font-bold text-slate-900 outline-none focus:border-emerald-500"
                    />
                    <span className="font-bold text-slate-500">€</span>
                  </div>
                </div>

                <span className="text-[11px] text-slate-400 italic">
                  (Prepočet sa zaokrúhľuje na 1 desatinné miesto podľa požiadavky)
                </span>
              </div>
            </div>

            {/* Table matching legacy "Úprava cenníku - Ceny" */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 min-w-[200px]">Hladina / Názov</th>
                    <th className="py-3 px-4 text-center min-w-[110px]">60 (min)</th>
                    <th className="py-3 px-4 text-center min-w-[110px]">120 (min)</th>
                    <th className="py-3 px-4 text-left min-w-[180px]">Percentuálne</th>
                    <th className="py-3 px-4 text-center min-w-[100px]">Náhľad / Akcia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {tiers.map((tier) => {
                    const isBase = tier.id === "tier-base" || tier.isDefault;
                    const isPercentual = tier.isPercentual ?? true;
                    const pctOfBase = tier.percentageOfBase ?? (100 - (tier.discountPercent || 0));

                    // Calculated values:
                    const calc60 = isPercentual
                      ? round1Dec(basePrice60 * (pctOfBase / 100))
                      : tier.price60 ?? 0;

                    const calc120 = isPercentual
                      ? round1Dec((basePrice120 > 0 ? basePrice120 : basePrice60 * 2) * (pctOfBase / 100))
                      : tier.price120 ?? 0;

                    return (
                      <tr
                        key={tier.id}
                        className={`transition ${
                          previewTierId === tier.id ? "bg-emerald-50/50" : "hover:bg-slate-50/70"
                        }`}
                      >
                        {/* Name */}
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={tier.name}
                            onChange={(e) => handleUpdateTier(tier.id, { name: e.target.value })}
                            className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 font-bold text-slate-800 outline-none hover:border-slate-300 focus:border-emerald-500 focus:bg-white text-xs"
                            placeholder="Názov hladiny"
                          />
                        </td>

                        {/* 60 min */}
                        <td className="py-3 px-4 text-center">
                          {isPercentual ? (
                            <div className="inline-flex items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200/80 px-3 py-1 font-extrabold text-emerald-800 text-xs min-w-[75px]">
                              {formatEur(calc60)}
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={tier.price60 ?? 0}
                                onChange={(e) =>
                                  handleUpdateTier(tier.id, {
                                    price60: Math.max(0, parseFloat(e.target.value) || 0),
                                  })
                                }
                                className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-center font-bold text-slate-800 outline-none focus:border-emerald-500 text-xs"
                              />
                              <span className="text-slate-400 font-bold">€</span>
                            </div>
                          )}
                        </td>

                        {/* 120 min */}
                        <td className="py-3 px-4 text-center">
                          {isPercentual ? (
                            <div className="inline-flex items-center justify-center rounded-lg bg-slate-100 border border-slate-200 px-3 py-1 font-bold text-slate-700 text-xs min-w-[75px]">
                              {formatEur(calc120)}
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={tier.price120 ?? 0}
                                onChange={(e) =>
                                  handleUpdateTier(tier.id, {
                                    price120: Math.max(0, parseFloat(e.target.value) || 0),
                                  })
                                }
                                className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-center font-bold text-slate-800 outline-none focus:border-emerald-500 text-xs"
                              />
                              <span className="text-slate-400 font-bold">€</span>
                            </div>
                          )}
                        </td>

                        {/* Percentuálne */}
                        <td className="py-3 px-4">
                          {isBase ? (
                            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                              <input type="checkbox" checked disabled className="h-4 w-4 rounded text-emerald-600" />
                              <span className="font-extrabold text-slate-700">100 %</span>
                              <span className="text-[11px] text-slate-400">(Základný cenník)</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isPercentual}
                                  onChange={(e) =>
                                    handleUpdateTier(tier.id, { isPercentual: e.target.checked })
                                  }
                                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                                <span className="text-[11px] text-slate-500">Platí %:</span>
                              </label>

                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="200"
                                  step="5"
                                  disabled={!isPercentual}
                                  value={pctOfBase}
                                  onChange={(e) => {
                                    const val = Math.max(0, Math.min(200, parseInt(e.target.value) || 0));
                                    handleUpdateTier(tier.id, {
                                      percentageOfBase: val,
                                      discountPercent: Math.max(0, 100 - val),
                                    });
                                  }}
                                  className={`w-14 rounded-lg border px-2 py-1 text-center font-extrabold text-xs outline-none ${
                                    isPercentual
                                      ? "border-slate-200 bg-white text-slate-900 focus:border-emerald-500"
                                      : "border-slate-100 bg-slate-50 text-slate-400"
                                  }`}
                                />
                                <span className="text-slate-400 font-bold text-xs">%</span>
                              </div>

                              {pctOfBase < 100 && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                  –{100 - pctOfBase} % zľava
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Actions / Preview selector */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewTierId(tier.id)}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                                previewTierId === tier.id
                                  ? "bg-emerald-600 text-white shadow-2xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {previewTierId === tier.id ? "Vybrané" : "Náhľad"}
                            </button>

                            {!isBase && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTier(tier.id)}
                                className="text-slate-300 hover:text-red-500 p-1 transition cursor-pointer rounded"
                                title="Zmazať hladinu"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Live Sports Breakdown Preview for Selected Tier */}
            {selectedTier && (
              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="bg-slate-100/80 px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-emerald-600" />
                    <span>
                      Živý náhľad sadzieb pre cenník pri hladine:{" "}
                      <span className="text-emerald-700 font-extrabold">{selectedTier.name}</span>
                      {selectedTier.isPercentual !== false && selectedTier.percentageOfBase !== undefined ? (
                        <span className="text-slate-500 font-normal ml-1">
                          ({selectedTier.percentageOfBase} % zo základu
                          {selectedTier.percentageOfBase < 100
                            ? `, zľava –${100 - selectedTier.percentageOfBase} %`
                            : ""})
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Zaokrúhlené na 1 des. miesto
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4 min-w-[200px]">Pásmo</th>
                        <th className="py-2.5 px-4 text-center min-w-[120px]">Bedminton</th>
                        <th className="py-2.5 px-4 text-center min-w-[120px]">Tenis (Hala)</th>
                        <th className="py-2.5 px-4 text-center min-w-[120px]">Tenis (Antuka)</th>
                        <th className="py-2.5 px-4 text-center min-w-[120px]">Squash</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {current.intervals.map((inv) => {
                        const pct = selectedTier.percentageOfBase ?? (100 - (selectedTier.discountPercent || 0));
                        const calcDiscount = (basePrice: number) => {
                          const val = selectedTier.isPercentual !== false
                            ? round1Dec(basePrice * (pct / 100))
                            : round1Dec(basePrice * (1 - (selectedTier.discountPercent || 0) / 100));
                          return val.toFixed(1).replace(".", ",");
                        };

                        const hasDiscount = (selectedTier.discountPercent || 0) > 0 || pct < 100;

                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-4 font-bold text-slate-800">
                              {inv.name} ({inv.startHour}:00 – {inv.endHour}:00)
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="font-extrabold text-emerald-700">
                                {calcDiscount(inv.prices.badminton ?? 14)} €
                              </span>
                              {hasDiscount && (
                                <span className="text-[10px] text-slate-400 line-through ml-1.5 font-normal">
                                  {inv.prices.badminton} €
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="font-extrabold text-emerald-700">
                                {calcDiscount(inv.prices.tennis ?? 29)} €
                              </span>
                              {hasDiscount && (
                                <span className="text-[10px] text-slate-400 line-through ml-1.5 font-normal">
                                  {inv.prices.tennis} €
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="font-extrabold text-emerald-700">
                                {calcDiscount(inv.prices["tennis-clay"] ?? 20)} €
                              </span>
                              {hasDiscount && (
                                <span className="text-[10px] text-slate-400 line-through ml-1.5 font-normal">
                                  {inv.prices["tennis-clay"]} €
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="font-extrabold text-emerald-700">
                                {calcDiscount(inv.prices.squash ?? 11)} €
                              </span>
                              {hasDiscount && (
                                <span className="text-[10px] text-slate-400 line-through ml-1.5 font-normal">
                                  {inv.prices.squash} €
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
