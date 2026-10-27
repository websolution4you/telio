import { NtcPricelist } from "./pricingTypes";

export type PricelistDateOverlap = {
  pricelistA: NtcPricelist;
  pricelistB: NtcPricelist;
  overlapFrom: string;
  overlapTo: string;
  daysCount: number;
  message: string;
};

export type PricelistDateGap = {
  pricelistBefore: NtcPricelist;
  pricelistAfter: NtcPricelist;
  gapFrom: string;
  gapTo: string;
  daysCount: number;
  message: string;
};

export type PricelistDateInvalid = {
  pricelist: NtcPricelist;
  message: string;
};

export type PricelistTimelineAnalysis = {
  hasOverlaps: boolean;
  hasGaps: boolean;
  hasInvalidRanges: boolean;
  overlaps: PricelistDateOverlap[];
  gaps: PricelistDateGap[];
  invalidRanges: PricelistDateInvalid[];
  sortedPricelists: NtcPricelist[];
};

/**
 * Returns date in YYYY-MM-DD format based on Bratislava local time.
 */
export function formatLocalDateKey(date?: Date | string | null): string {
  if (!date) return "";
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bratislava",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Formats YYYY-MM-DD into human-readable Slovak format: DD.MM.YYYY
 */
export function formatDateSk(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || "";
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

/**
 * Safe UTC date math adding/subtracting days to avoid DST jumps.
 */
export function addDays(dateStr: string, days: number): string {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T12:00:00Z`);
  if (isNaN(d.getTime())) return dateStr;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Calculates number of calendar days between two YYYY-MM-DD dates (inclusive).
 */
export function countDaysBetween(fromStr: string, toStr: string): number {
  if (!fromStr || !toStr) return 0;
  const a = new Date(`${fromStr}T12:00:00Z`).getTime();
  const b = new Date(`${toStr}T12:00:00Z`).getTime();
  if (isNaN(a) || isNaN(b) || b < a) return 0;
  return Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Analyzes the timeline continuity of a set of seasonal pricelists.
 * Identifies:
 * 1. Invalid date ranges (validFrom > validTo)
 * 2. Overlapping date ranges between any two pricelists
 * 3. Gaps (missing days) between chronological pricelists
 */
export function analyzePricelistTimeline(
  pricelists: NtcPricelist[]
): PricelistTimelineAnalysis {
  const invalidRanges: PricelistDateInvalid[] = [];
  const overlaps: PricelistDateOverlap[] = [];
  const gaps: PricelistDateGap[] = [];

  const validPricelists: NtcPricelist[] = [];

  // 1. Check for basic range sanity
  for (const p of pricelists) {
    if (!p.validFrom || !p.validTo) {
      invalidRanges.push({
        pricelist: p,
        message: `Cenník „${p.name || "Bez názvu"}“ nemá vyplnené dátumy platnosti.`,
      });
      continue;
    }
    if (p.validFrom > p.validTo) {
      invalidRanges.push({
        pricelist: p,
        message: `Cenník „${p.name}“ má dátum začiatku (${formatDateSk(p.validFrom)}) neskorší ako koniec (${formatDateSk(p.validTo)}).`,
      });
      continue;
    }
    validPricelists.push(p);
  }

  // Sort valid pricelists by validFrom ascending
  const sorted = [...validPricelists].sort((a, b) =>
    a.validFrom.localeCompare(b.validFrom) || a.validTo.localeCompare(b.validTo)
  );

  // 2. Check for overlaps between all pairs
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];

      // Two ranges [A_from, A_to] and [B_from, B_to] overlap iff
      // A_from <= B_to && B_from <= A_to
      if (a.validFrom <= b.validTo && b.validFrom <= a.validTo) {
        const overlapFrom = a.validFrom > b.validFrom ? a.validFrom : b.validFrom;
        const overlapTo = a.validTo < b.validTo ? a.validTo : b.validTo;
        const days = countDaysBetween(overlapFrom, overlapTo);

        overlaps.push({
          pricelistA: a,
          pricelistB: b,
          overlapFrom,
          overlapTo,
          daysCount: days,
          message: `Cenníky „${a.name}“ a „${b.name}“ sa prekrývajú v termíne od ${formatDateSk(overlapFrom)} do ${formatDateSk(overlapTo)} (${days} ${days === 1 ? "deň" : days < 5 ? "dni" : "dní"}).`,
        });
      }
    }
  }

  // 3. Check for chronological gaps between adjacent seasons
  if (sorted.length > 1) {
    let currentCoverageEnd = sorted[0].validTo;
    let lastCoveringPricelist = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      const expectedNextDay = addDays(currentCoverageEnd, 1);

      // If next starts after the expected consecutive day, there's a gap!
      if (next.validFrom > expectedNextDay) {
        const gapFrom = expectedNextDay;
        const gapTo = addDays(next.validFrom, -1);
        const days = countDaysBetween(gapFrom, gapTo);

        gaps.push({
          pricelistBefore: lastCoveringPricelist,
          pricelistAfter: next,
          gapFrom,
          gapTo,
          daysCount: days,
          message: `Medzi cenníkmi „${lastCoveringPricelist.name}“ (končí ${formatDateSk(lastCoveringPricelist.validTo)}) a „${next.name}“ (začína ${formatDateSk(next.validFrom)}) je nepokryté obdobie od ${formatDateSk(gapFrom)} do ${formatDateSk(gapTo)} (${days} ${days === 1 ? "deň" : days < 5 ? "dni" : "dní"}).`,
        });
      }

      // Extend coverage end if next pricelist ends later
      if (next.validTo > currentCoverageEnd) {
        currentCoverageEnd = next.validTo;
        lastCoveringPricelist = next;
      }
    }
  }

  return {
    hasOverlaps: overlaps.length > 0,
    hasGaps: gaps.length > 0,
    hasInvalidRanges: invalidRanges.length > 0,
    overlaps,
    gaps,
    invalidRanges,
    sortedPricelists: sorted,
  };
}

/**
 * Returns the season state of a pricelist relative to today's date.
 */
export function getPricelistSeasonStatus(
  pricelist: NtcPricelist,
  todayDateKey?: string
): "current" | "upcoming" | "expired" {
  const today = todayDateKey || formatLocalDateKey(new Date());
  if (pricelist.validFrom <= today && pricelist.validTo >= today) {
    return "current";
  }
  if (pricelist.validFrom > today) {
    return "upcoming";
  }
  return "expired";
}
