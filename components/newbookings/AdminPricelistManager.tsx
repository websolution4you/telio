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
  Pencil,
  Plus,
  Save,
  Sparkles,
  Sun,
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
  deletePricelistAction,
} from "@/app/actions/pricelists";
import {
  areDaysSame,
  getIntervalRank,
  getShortIntervalName,
  realignAllIntervals,
  sortIntervalsLogically,
} from "@/lib/bookings/intervalUtils";
import {
  analyzePricelistTimeline,
  countDaysBetween,
  formatDateSk,
  getPricelistSeasonStatus,
} from "@/lib/bookings/pricelistValidation";
import CreatePricelistModal from "./CreatePricelistModal";
import EditIntervalModal from "./EditIntervalModal";
import PriceStepper from "./PriceStepper";

export default function AdminPricelistManager() {
  const [pricelists, setPricelists] = useState<NtcPricelist[]>([DEFAULT_NTC_WINTER_PRICELIST]);
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_NTC_WINTER_PRICELIST.id);
  const [current, setCurrent] = useState<NtcPricelist>(DEFAULT_NTC_WINTER_PRICELIST);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [intervalModalOpen, setIntervalModalOpen] = useState(false);
  const [editingInterval, setEditingInterval] = useState<Partial<PriceInterval> | null>(null);
  const [intervalModalTitle, setIntervalModalTitle] = useState("Pridať časové pásmo");
  const [showDeletePricelistConfirm, setShowDeletePricelistConfirm] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [previewTierId, setPreviewTierId] = useState<string>("tier-10");
  const [customTierDirty, setCustomTierDirty] = useState<Record<string, boolean>>({});

  const effectiveList = useMemo(() => {
    return pricelists.map((p) => (p.id === current.id ? current : p));
  }, [pricelists, current]);

  const timelineAnalysis = useMemo(() => {
    return analyzePricelistTimeline(effectiveList);
  }, [effectiveList]);

  const currentOverlaps = useMemo(() => {
    return timelineAnalysis.overlaps.filter(
      (o) => o.pricelistA.id === current.id || o.pricelistB.id === current.id
    );
  }, [timelineAnalysis, current.id]);

  const currentGaps = useMemo(() => {
    return timelineAnalysis.gaps.filter(
      (g) => g.pricelistBefore.id === current.id || g.pricelistAfter.id === current.id
    );
  }, [timelineAnalysis, current.id]);

  const currentInvalid = useMemo(() => {
    return timelineAnalysis.invalidRanges.find((r) => r.pricelist.id === current.id);
  }, [timelineAnalysis, current.id]);

  const currentDurationDays = useMemo(() => {
    if (!current.validFrom || !current.validTo) return 0;
    return countDaysBetween(current.validFrom, current.validTo);
  }, [current.validFrom, current.validTo]);

  const currentStatus = getPricelistSeasonStatus(current);

  const sanitizeTiers = (tiers?: DiscountTier[]): DiscountTier[] => {
    if (!tiers || tiers.length === 0) return DEFAULT_DISCOUNT_TIERS;
    const filtered = tiers.filter((t) => t.id !== "tier-regular" && t.id !== "tier-cash");
    return filtered.length > 0 ? filtered : DEFAULT_DISCOUNT_TIERS;
  };

  const sanitizeIntervalDays = (intervals: PriceInterval[]): PriceInterval[] => {
    return intervals.map((inv) => {
      const lower = (inv.name || "").toLowerCase();
      // If it's a weekday band by name, ensure it's Po-Pi
      if (
        lower.includes("mimo") ||
        lower.includes("happy") ||
        lower.includes("špičk") ||
        lower.includes("spick") ||
        lower.includes("pondelok") ||
        lower.includes("piatok")
      ) {
        if (!areDaysSame(inv.days, [1, 2, 3, 4, 5])) {
          return { ...inv, days: [1, 2, 3, 4, 5] };
        }
      }
      // If it's a weekend band by name, ensure it's So-Ne
      if (
        lower.includes("víkend") ||
        lower.includes("vikend") ||
        lower.includes("sobota") ||
        lower.includes("nedeľa")
      ) {
        if (!areDaysSame(inv.days, [6, 0])) {
          return { ...inv, days: [6, 0] };
        }
      }
      return inv;
    });
  };

  useEffect(() => {
    let active = true;
    fetchPricelistsAction().then((res) => {
      if (!active) return;
      if (res.success && res.pricelists.length > 0) {
        const sanitizedList = res.pricelists.map((p) => ({
          ...p,
          intervals: sanitizeIntervalDays(p.intervals),
        }));
        setPricelists(sanitizedList);
        const activeOne = sanitizedList.find((p) => p.isActive) || sanitizedList[0];
        setSelectedId(activeOne.id);
        const cloned = JSON.parse(JSON.stringify(activeOne));
        cloned.discountTiers = sanitizeTiers(cloned.discountTiers);
        cloned.intervals = realignAllIntervals(cloned.intervals);
        setCurrent(cloned);
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
      const cloned = JSON.parse(JSON.stringify(found));
      cloned.discountTiers = sanitizeTiers(cloned.discountTiers);
      cloned.intervals = realignAllIntervals(sanitizeIntervalDays(cloned.intervals));
      setCurrent(cloned);
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
      const updated = prev.intervals.map((inv) =>
        inv.id === intervalId ? { ...inv, name } : inv
      );
      return {
        ...prev,
        intervals: realignAllIntervals(
          updated,
          intervalId,
          changedField,
          changedField === "startHour" ? startHour : endHour
        ),
      };
    });
  };

  const handleAutoAlignIntervals = () => {
    setCurrent((prev) => ({
      ...prev,
      intervals: realignAllIntervals(prev.intervals),
    }));
    setFeedback({
      type: "success",
      message: "Časové pásma boli automaticky zosúladené.",
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

  const handleOpenAddIntervalModal = (type: "happy" | "weekday" | "weekend") => {
    if (type === "happy") {
      const hasHappyHour = current.intervals.some(
        (i) =>
          areDaysSame(i.days, [1, 2, 3, 4, 5]) &&
          (i.name.toLowerCase().includes("happy") || (i.startHour === 12 && i.endHour === 16))
      );
      if (hasHappyHour) {
        setFeedback({
          type: "error",
          message: "Pásmo Happy Hour už v cenníku existuje.",
        });
        return;
      }
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
      const hasWeekend = current.intervals.some((i) => areDaysSame(i.days, [6, 0]));
      if (hasWeekend) {
        setFeedback({
          type: "error",
          message: "Víkendové pásmo (7:00 – 21:00) už v cenníku existuje.",
        });
        return;
      }
      setEditingInterval({
        id: `interval-we-${Date.now()}`,
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

    // Weekday: max 2 regular bands (Mimo špičky, Špička) + 1 Happy Hour = max 3 total
    const weekdayIntervals = current.intervals
      .filter((i) => areDaysSame(i.days, [1, 2, 3, 4, 5]))
      .sort((a, b) => a.startHour - b.startHour);

    const isHappyHourInterval = (i: PriceInterval) =>
      i.name.toLowerCase().includes("happy") || (i.startHour === 12 && i.endHour === 16);
    const regularWeekdayIntervals = weekdayIntervals.filter((i) => !isHappyHourInterval(i));

    if (regularWeekdayIntervals.length >= 2) {
      setFeedback({
        type: "error",
        message: "Pre pracovné dni už máte nastavené obe základné pásma (Mimo špičky a Špička). Ak chcete pridať tretie pásmo, použite '+ Happy Hour'.",
      });
      return;
    }

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
        // Morning exists, suggest Peak
        startHour = 16;
        endHour = 22;
        name = "Špička";
      } else if (isPeak && !isMorning) {
        // Peak exists, suggest Morning
        startHour = 7;
        endHour = 16;
        name = "Mimo špičky";
      } else {
        // Default to Špička if existing covers full day
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
      id: `interval-${Date.now()}`,
      name,
      days: [1, 2, 3, 4, 5],
      startHour,
      endHour,
      prices: {
        badminton: 14,
        tennis: 28,
        "tennis-clay": 20,
        squash: 11,
      },
    });
    setIntervalModalTitle("Pridať pásmo pre pracovné dni (Po–Pi)");
    setIntervalModalOpen(true);
  };

  const handleOpenEditIntervalModal = (inv: PriceInterval) => {
    setEditingInterval(JSON.parse(JSON.stringify(inv)));
    setIntervalModalTitle(`Upraviť časové pásmo: ${inv.name}`);
    setIntervalModalOpen(true);
  };

  const handleSaveIntervalFromModal = (interval: PriceInterval) => {
    const existingIndex = current.intervals.findIndex((i) => i.id === interval.id);

    if (existingIndex !== -1) {
      setCurrent((prev) => {
        const updated = prev.intervals.map((inv) =>
          inv.id === interval.id ? interval : inv
        );
        return {
          ...prev,
          intervals: realignAllIntervals(updated, interval.id, "endHour", interval.endHour),
        };
      });
      setFeedback({
        type: "success",
        message: `Pásmo "${interval.name}" bolo úspešne upravené.`,
      });
    } else {
      // Prevent duplicate names in same day group
      const duplicate = current.intervals.find(
        (i) =>
          areDaysSame(i.days, interval.days) &&
          i.name.trim().toLowerCase() === interval.name.trim().toLowerCase()
      );
      if (duplicate) {
        setFeedback({
          type: "error",
          message: `Pásmo s názvom "${interval.name}" už v týchto dňoch existuje. Zvoľte prosím iný názov (napr. Happy Hour).`,
        });
        return;
      }

      setCurrent((prev) => {
        const updated = [...prev.intervals, interval];
        return {
          ...prev,
          intervals: realignAllIntervals(updated),
        };
      });
      setFeedback({
        type: "success",
        message: `Pridané časové pásmo "${interval.name}".`,
      });
    }
  };

  const handleDeletePricelist = async () => {
    if (current.isActive) {
      setDeleteModalError("Nemôžete zmazať aktívny cenník. Najprv nastavte iný cenník ako aktívny.");
      return;
    }
    if (pricelists.length <= 1) {
      setDeleteModalError("Nemôžete zmazať jediný zostávajúci cenník.");
      return;
    }

    setSaving(true);
    setDeleteModalError(null);
    const res = await deletePricelistAction(current.id);
    if (res.success) {
      const remaining = pricelists.filter((p) => p.id !== current.id);
      setPricelists(remaining);
      const nextOne = remaining[0];
      setSelectedId(nextOne.id);
      setCurrent(JSON.parse(JSON.stringify(nextOne)));
      setShowDeletePricelistConfirm(false);
      setDeleteModalError(null);
      setFeedback({
        type: "success",
        message: `Cenník bol úspešne zmazaný.`,
      });
    } else {
      setDeleteModalError(res.error || "Nepodarilo sa zmazať cenník.");
    }
    setSaving(false);
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
      return {
        ...prev,
        intervals: realignAllIntervals(remaining),
      };
    });
    setFeedback({
      type: "success",
      message: `Pásmo "${invToRemove.name}" bolo odstránené a zostávajúce pásma boli automaticky prepojené.`,
    });
  };

  const handleCreateNewPricelist = () => {
    setIsCreateModalOpen(true);
  };

  const handleConfirmCreatePricelist = async (newPricelist: NtcPricelist) => {
    setPricelists((prev) => [newPricelist, ...prev]);
    setSelectedId(newPricelist.id);
    setCurrent(newPricelist);
    setIsCreateModalOpen(false);

    setSaving(true);
    const res = await savePricelistAction(newPricelist);
    setSaving(false);

    if (res.success) {
      setFeedback({
        type: "success",
        message: `Vytvorený nový cenník „${newPricelist.name}“. Sadzby môžete ďalej upravovať a kedykoľvek uložiť.`,
      });
    } else {
      setFeedback({
        type: "error",
        message: res.error || "Cenník bol pridaný lokálne, ale nepodarilo sa ho uložiť do databázy.",
      });
    }
  };

  const handleUpdateTier = (tierId: string, updates: Partial<DiscountTier>) => {
    setCurrent((prev) => {
      const tiers = prev.discountTiers || DEFAULT_DISCOUNT_TIERS;
      return {
        ...prev,
        discountTiers: tiers.map((t) => {
          if (t.id !== tierId) return t;
          const merged = { ...t, ...updates };
          if ("discountPercent" in updates && updates.discountPercent !== undefined) {
            merged.percentageOfBase = Math.max(0, 100 - updates.discountPercent);
          } else if ("percentageOfBase" in updates && updates.percentageOfBase !== undefined) {
            merged.discountPercent = Math.max(0, 100 - updates.percentageOfBase);
          }
          return merged;
        }),
      };
    });
  };

  const handleAddTier = () => {
    const newTier: DiscountTier = {
      id: `tier-custom-${Date.now()}`,
      name: "Vlastná zľava",
      isPercentual: true,
      percentageOfBase: 85,
      discountPercent: 15,
      price60: 0,
      price120: 0,
      isDefault: false,
    };
    setCurrent((prev) => ({
      ...prev,
      discountTiers: [...sanitizeTiers(prev.discountTiers), newTier],
    }));
    setPreviewTierId(newTier.id);
    setCustomTierDirty((prev) => ({ ...prev, [newTier.id]: true }));
  };

  const handleRemoveTier = (tierId: string) => {
    setCurrent((prev) => {
      const tiers = sanitizeTiers(prev.discountTiers);
      if (tiers.length <= 1) return prev;
      return {
        ...prev,
        discountTiers: tiers.filter((t) => t.id !== tierId),
      };
    });
    setCustomTierDirty((prev) => {
      const next = { ...prev };
      delete next[tierId];
      return next;
    });
  };

  const handleResetToDefaultTiers = () => {
    setCurrent((prev) => ({
      ...prev,
      discountTiers: JSON.parse(JSON.stringify(DEFAULT_DISCOUNT_TIERS)),
    }));
    setPreviewTierId("tier-10");
    setFeedback({
      type: "success",
      message: "Zľavové hladiny boli obnovené na predvolené.",
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
      if (currentOverlaps.length > 0 || currentGaps.length > 0) {
        setFeedback({
          type: "success",
          message: "Cenník bol uložený. (Upozornenie: V termínoch platnosti boli zistené kolízie alebo nepokryté dni).",
        });
      } else {
        setFeedback({ type: "success", message: "Cenník bol úspešne uložený." });
      }
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
              {currentStatus === "current" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                  <Flame className="h-3 w-3 text-emerald-600" />
                  Aktuálne platný (dnes)
                </span>
              )}
              {currentStatus === "upcoming" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-extrabold text-sky-800">
                  <Calendar className="h-3 w-3 text-sky-600" />
                  Budúca sezóna
                </span>
              )}
              {currentStatus === "expired" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                  <Clock3 className="h-3 w-3 text-slate-400" />
                  Ukončená platnosť
                </span>
              )}
            </div>
            <select
              value={selectedId}
              onChange={(e) => handleSelectPricelist(e.target.value)}
              className="mt-0.5 text-lg font-bold text-slate-900 bg-transparent border-none outline-none cursor-pointer hover:text-emerald-700 transition"
            >
              {pricelists.map((p) => {
                const st = getPricelistSeasonStatus(p);
                const tag = st === "current" ? " • Dnes platný" : st === "upcoming" ? " • Budúci" : " • Ukončený";
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatDateSk(p.validFrom)} – {formatDateSk(p.validTo)}){tag}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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

          <button
            type="button"
            disabled={saving || pricelists.length <= 1}
            onClick={() => {
              setDeleteModalError(null);
              setShowDeletePricelistConfirm(true);
            }}
            title={
              pricelists.length <= 1
                ? "Nemožno zmazať jediný existujúci cenník"
                : "Zmazať tento cenník"
            }
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition shadow-2xs ${
              pricelists.length <= 1
                ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 cursor-pointer"
            }`}
          >
            <Trash2 className="h-4 w-4" />
            Zmazať cenník
          </button>
        </div>
      </div>

      {/* Timeline Overview Ribbon */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Časová os a kontinuita sezón
            </h3>
          </div>
          {timelineAnalysis.hasOverlaps ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-bold">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              Zistené prekrývanie termínov
            </span>
          ) : timelineAnalysis.hasGaps ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 text-sky-800 px-3 py-1 text-xs font-bold">
              <Info className="h-3.5 w-3.5 text-sky-600" />
              Zistená medzera medzi sezónami
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-bold">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              Plynulá nadväznosť sezón
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {timelineAnalysis.sortedPricelists.map((p) => {
            const isSelected = p.id === current.id;
            const st = getPricelistSeasonStatus(p);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPricelist(p.id)}
                className={`flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-semibold transition border cursor-pointer ${
                  isSelected
                    ? "bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div
                  className={`h-2 w-2 rounded-full ${
                    st === "current"
                      ? "bg-emerald-500 animate-pulse"
                      : st === "upcoming"
                      ? "bg-sky-500"
                      : "bg-slate-400"
                  }`}
                />
                <span className="font-bold">{p.name}</span>
                <span className="text-[11px] text-slate-500">
                  ({formatDateSk(p.validFrom)} – {formatDateSk(p.validTo)})
                </span>
              </button>
            );
          })}
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sun className="h-4 w-4 text-emerald-600" />
            Základné parametre sezóny
          </h2>
          {currentDurationDays > 0 && !currentInvalid && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              Dĺžka sezóny: <b>{currentDurationDays} dní</b> ({formatDateSk(current.validFrom)} – {formatDateSk(current.validTo)})
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        </div>

        {/* Dynamické upozornenia na platnosť, kolízie a medzery */}
        {currentInvalid ? (
          <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-800">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Neplatný rozsah dátumov:</div>
              <div>{currentInvalid.message}</div>
            </div>
          </div>
        ) : currentOverlaps.length > 0 ? (
          <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 border border-amber-300 p-4 text-xs text-amber-950 shadow-2xs">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <span>Upozornenie: Prekrývanie termínov platnosti</span>
                <span className="rounded-full bg-amber-200/80 px-2 py-0.2 text-[10px] font-extrabold text-amber-900">
                  {currentOverlaps.length} {currentOverlaps.length === 1 ? "kolízia" : "kolízie"}
                </span>
              </div>
              <div className="space-y-1 text-slate-800">
                {currentOverlaps.map((ov, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 bg-white/70 rounded-xl px-2.5 py-1.5 border border-amber-200/60 font-medium">
                    <span className="text-amber-700 font-bold">•</span>
                    <span>{ov.message}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-amber-800/90 pt-0.5">
                V období prekrytia systém priradí cenník automaticky. Odporúčame dátumy zosúladiť, aby sa obdobia neprekrývali.
              </p>
            </div>
          </div>
        ) : currentGaps.length > 0 ? (
          <div className="flex items-start gap-2.5 rounded-2xl bg-sky-50 border border-sky-300 p-4 text-xs text-sky-950 shadow-2xs">
            <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <div className="font-bold text-sky-900 flex items-center gap-1.5">
                <span>Upozornenie: Medzera v platnosti cenníkov (nepokryté dni)</span>
                <span className="rounded-full bg-sky-200/80 px-2 py-0.2 text-[10px] font-extrabold text-sky-900">
                  {currentGaps.length} {currentGaps.length === 1 ? "medzera" : "medzery"}
                </span>
              </div>
              <div className="space-y-1 text-slate-800">
                {currentGaps.map((gp, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 bg-white/70 rounded-xl px-2.5 py-1.5 border border-sky-200/60 font-medium">
                    <span className="text-sky-700 font-bold">•</span>
                    <span>{gp.message}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-sky-800/90 pt-0.5">
                Ak hráč vytvorí rezerváciu v nepokrytom období, použije sa základný cenník ako záložná poistka.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200/80 px-3.5 py-2.5 text-xs text-emerald-900">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              <b>Termíny sú v poriadku:</b> Cenník plynule nadväzuje na ostatné cenníky bez prekrývania a medzier. Ceny sa budú pri rezerváciách uplatňovať automaticky v zadanom intervale.
            </span>
          </div>
        )}
      </div>

      {/* Main Pricing Matrix (Based on official physical board from NTC) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-emerald-600" />
              Sadzby podľa časových pásiem a športov (za 1 hodinu)
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-xs text-slate-500">
                Základné pultové sadzby za jednotlivé športoviská podľa zvolených dní a hodín.
              </p>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                <span>Ceny v bunkách viete posúvať aj šípkami</span>
                <kbd className="rounded bg-white px-1 py-0.2 shadow-2xs border border-emerald-300 font-mono text-[9px] font-extrabold text-emerald-900">↑</kbd>
                <kbd className="rounded bg-white px-1 py-0.2 shadow-2xs border border-emerald-300 font-mono text-[9px] font-extrabold text-emerald-900">↓</kbd>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(() => {
              const hasWeekend = current.intervals.some((i) => areDaysSame(i.days, [6, 0]));
              const weekdayIntervals = current.intervals.filter((i) => areDaysSame(i.days, [1, 2, 3, 4, 5]));
              const isHappyHourInterval = (i: PriceInterval) =>
                i.name.toLowerCase().includes("happy") || (i.startHour === 12 && i.endHour === 16);
              const hasHappyHour = weekdayIntervals.some(isHappyHourInterval);
              const regularWeekdayIntervals = weekdayIntervals.filter((i) => !isHappyHourInterval(i));
              const canAddGeneralWeekday = regularWeekdayIntervals.length < 2;

              return (
                <>
                  <button
                    type="button"
                    disabled={hasHappyHour}
                    onClick={() => handleOpenAddIntervalModal("happy")}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                      hasHappyHour
                        ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                        : "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 cursor-pointer shadow-2xs"
                    }`}
                    title={
                      hasHappyHour
                        ? "Pásmo Happy Hour už v cenníku existuje"
                        : "Pridať pásmo Happy Hour (napr. 12:00 – 16:00 pre Po–Pi)"
                    }
                  >
                    <Sun className={`h-3.5 w-3.5 ${hasHappyHour ? "text-slate-400" : "text-amber-600"}`} />
                    + Happy Hour (napr. 12–16h)
                  </button>

                  <button
                    type="button"
                    disabled={!canAddGeneralWeekday}
                    onClick={() => handleOpenAddIntervalModal("weekday")}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                      !canAddGeneralWeekday
                        ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                        : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 cursor-pointer shadow-2xs"
                    }`}
                    title={
                      !canAddGeneralWeekday
                        ? "Základné pásma pre pracovné dni (Mimo špičky aj Špička) už máte nastavené. Môžete pridať už len Happy Hour."
                        : "Pridať pásmo (Po–Pi)"
                    }
                  >
                    <Plus className={`h-3.5 w-3.5 ${!canAddGeneralWeekday ? "text-slate-400" : "text-emerald-700"}`} />
                    Pridať pásmo (Po–Pi)
                  </button>

                  <button
                    type="button"
                    disabled={hasWeekend}
                    onClick={() => handleOpenAddIntervalModal("weekend")}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                      hasWeekend
                        ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                        : "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 cursor-pointer shadow-2xs"
                    }`}
                    title={
                      hasWeekend
                        ? "Víkendové pásmo (7:00 – 21:00) už v cenníku existuje"
                        : "Pridať celodenné víkendové pásmo (7:00 – 21:00)"
                    }
                  >
                    <Plus className={`h-3.5 w-3.5 ${hasWeekend ? "text-slate-400" : "text-blue-700"}`} />
                    Pridať pásmo (Víkend)
                  </button>
                </>
              );
            })()}
          </div>
        </div>

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
                  .sort((a, b) => getIntervalRank(a) - getIntervalRank(b));
                const invIdxInGroup = sameDayIntervals.findIndex((i) => i.id === inv.id);
                const isFirstInGroup = invIdxInGroup === 0;
                const isLastInGroup = invIdxInGroup === sameDayIntervals.length - 1;
                const isWeekend = areDaysSame(inv.days, [6, 0]);
                const isWeekday = areDaysSame(inv.days, [1, 2, 3, 4, 5]);
                const isAllWeek = areDaysSame(inv.days, [1, 2, 3, 4, 5, 6, 0]);

                const maxEndHourForCurrent = isWeekday
                  ? 22 - (sameDayIntervals.length - 1 - invIdxInGroup)
                  : 21;
                const minStartHourForCurrent = isWeekday
                  ? 7 + invIdxInGroup
                  : 7;

                const startHourOptions: number[] = [];
                for (let h = minStartHourForCurrent; h <= 21; h++) {
                  startHourOptions.push(h);
                }

                const endHourOptions: number[] = [];
                for (let h = inv.startHour + 1; h <= maxEndHourForCurrent; h++) {
                  endHourOptions.push(h);
                }

                const isOverride = isIntervalOverride(inv, current.intervals);

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

                      {/* Non-clickable Days Indicator */}
                      <div className="mt-1 flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            isWeekend
                              ? "bg-blue-50 text-blue-800 border border-blue-200/60"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                          }`}
                        >
                          {isWeekend ? "So – Ne (Víkend)" : "Po – Pi (Pracovné dni)"}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-xs">
                          {isFirstInGroup || isWeekend ? (
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
                          {isLastInGroup || isWeekend ? (
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
                        <span className="text-[10px] text-slate-400 font-medium">
                          Trvanie: {inv.endHour - inv.startHour} hod.
                        </span>
                      </div>
                    </td>

                  {/* Bedminton */}
                  <td className="py-3.5 px-3 text-center">
                    <PriceStepper
                      value={inv.prices.badminton ?? 14}
                      onChange={(val) => handleUpdatePrice(inv.id, "badminton", String(val))}
                    />
                  </td>

                  {/* Tenis Hala */}
                  <td className="py-3.5 px-3 text-center">
                    <PriceStepper
                      value={inv.prices.tennis ?? 29}
                      onChange={(val) => handleUpdatePrice(inv.id, "tennis", String(val))}
                    />
                  </td>

                  {/* Tenis Antuka */}
                  <td className="py-3.5 px-3 text-center">
                    <PriceStepper
                      value={inv.prices["tennis-clay"] ?? 20}
                      onChange={(val) => handleUpdatePrice(inv.id, "tennis-clay", String(val))}
                    />
                  </td>

                  {/* Squash */}
                  <td className="py-3.5 px-3 text-center">
                    <PriceStepper
                      value={inv.prices.squash ?? 11}
                      onChange={(val) => handleUpdatePrice(inv.id, "squash", String(val))}
                    />
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
                        onClick={() => handleOpenEditIntervalModal(inv)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer"
                        title="Upraviť časové pásmo v okne"
                      >
                        <Pencil className="h-3.5 w-3.5" />
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
      </div>

      {/* Discount Tiers Section */}
      {(() => {
        const tiers = sanitizeTiers(current.discountTiers);
        const selectedTier = tiers.find((t) => t.id === previewTierId) || tiers[1] || tiers[0];

        const round1Dec = (val: number): number => Math.round(val * 10) / 10;

        return (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Percent className="h-4 w-4 text-emerald-600" />
                  Zľavové hladiny a automatický prepočet
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToDefaultTiers}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  title="Obnoviť predvolené zľavové hladiny"
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

            {/* Simplified Discount Tiers Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 min-w-[200px]">Hladina / Názov</th>
                    <th className="py-3 px-4 min-w-[220px]">Zľava</th>
                    <th className="py-3 px-4 text-right min-w-[120px]">Akcia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {tiers.map((tier) => {
                    const isBase = tier.id === "tier-base";
                    const isDefault = Boolean(tier.isDefault || ["tier-base", "tier-10", "tier-20", "tier-50"].includes(tier.id));
                    const discountPercent = tier.discountPercent ?? Math.max(0, 100 - (tier.percentageOfBase ?? 100));
                    const isSelected = previewTierId === tier.id;

                    return (
                      <tr
                        key={tier.id}
                        onClick={() => setPreviewTierId(tier.id)}
                        className={`transition cursor-pointer border-b border-slate-100 ${
                          isSelected
                            ? "bg-emerald-50/70 border-emerald-200 ring-1 ring-inset ring-emerald-300/80"
                            : "hover:bg-slate-50/80"
                        }`}
                        title="Kliknutím na tento riadok zobrazíte živý náhľad cien"
                      >
                        {/* Name: editable only for custom tier */}
                        <td className="py-3 px-4">
                          {isDefault ? (
                            <span className="font-bold text-slate-900 text-xs px-2 py-1 block">
                              {tier.name}
                            </span>
                          ) : (
                            <input
                              type="text"
                              value={tier.name}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                handleUpdateTier(tier.id, { name: e.target.value });
                                setCustomTierDirty((prev) => ({ ...prev, [tier.id]: true }));
                              }}
                              className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-900 outline-none focus:border-emerald-500 text-xs shadow-2xs"
                              placeholder="Názov vlastnej hladiny"
                            />
                          )}
                        </td>

                        {/* Discount badge: editable for custom tier, fixed for default tiers */}
                        <td className="py-3 px-4">
                          {isBase ? (
                            <span className="inline-flex items-center text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs">
                              Bez zľavy (Základná cena)
                            </span>
                          ) : isDefault ? (
                            <span className="inline-flex items-center text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg shadow-2xs">
                              –{discountPercent} % zľava
                            </span>
                          ) : (
                            <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <span className="text-emerald-800 font-extrabold text-sm">–</span>
                              <PriceStepper
                                value={discountPercent}
                                min={0}
                                max={99}
                                step={1}
                                unit="%"
                                onChange={(val) => {
                                  handleUpdateTier(tier.id, {
                                    discountPercent: val,
                                    percentageOfBase: 100 - val,
                                  });
                                  setCustomTierDirty((prev) => ({ ...prev, [tier.id]: true }));
                                }}
                              />
                              <span className="text-emerald-800 font-bold text-xs">zľava</span>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {!isDefault && customTierDirty[tier.id] && (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={async () => {
                                  await handleSave();
                                  setCustomTierDirty((prev) => ({ ...prev, [tier.id]: false }));
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition cursor-pointer disabled:opacity-50"
                                title="Uložiť zmeny tejto vlastnej zľavy"
                              >
                                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Uložiť
                              </button>
                            )}

                            {!isDefault && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTier(tier.id)}
                                className="text-slate-400 hover:text-red-600 p-1.5 transition cursor-pointer rounded-lg hover:bg-red-50"
                                title="Zmazať vlastnú hladinu"
                              >
                                <Trash2 className="h-4 w-4" />
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
                    <Percent className="h-4 w-4 text-emerald-600" />
                    <span>
                      Živý náhľad sadzieb pre cenník pri hladine:{" "}
                      <span className="text-emerald-700 font-extrabold">{selectedTier.name}</span>
                      {selectedTier.isPercentual !== false ? (
                        <span className="text-slate-500 font-normal ml-1">
                          {selectedTier.id === "tier-base" || (selectedTier.discountPercent === 0 && selectedTier.percentageOfBase === 100)
                            ? "(základná cena bez zľavy)"
                            : `(zľava –${selectedTier.discountPercent ?? (100 - (selectedTier.percentageOfBase ?? 100))} %)`}
                        </span>
                      ) : null}
                    </span>
                  </div>
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
      {/* Create Pricelist Modal */}
      <CreatePricelistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleConfirmCreatePricelist}
        currentPricelist={current}
        existingPricelists={pricelists}
      />

      {/* Edit / Add Interval Modal */}
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

      {/* Delete Pricelist Confirmation Dialog */}
      {showDeletePricelistConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Zmazať cenník</h3>
                <p className="text-xs text-slate-500">Táto akcia je nevratná</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Naozaj si prajete natrvalo zmazať cenník <b>„{current.name}“</b>? Všetky jeho nastavené sadzby a časové pásma budú zmazané zo systému.
            </p>

            {deleteModalError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800 flex items-start gap-2.5 animate-in fade-in">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{deleteModalError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowDeletePricelistConfirm(false);
                  setDeleteModalError(null);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Zrušiť
              </button>
              <button
                type="button"
                disabled={saving || pricelists.length <= 1}
                onClick={handleDeletePricelist}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-md shadow-rose-700/20 transition cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Áno, zmazať cenník
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
