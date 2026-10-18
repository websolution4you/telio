import { PriceInterval } from "./pricingTypes";

/**
 * Checks if two day arrays contain the exact same days.
 */
export const areDaysSame = (a: number[], b: number[]): boolean =>
  a.length === b.length && a.every((d) => b.includes(d));

/**
 * Assigns a semantic order rank to intervals:
 * 1: Mimo špičky (morning / off-peak)
 * 2: Happy Hour (mid-day discount)
 * 3: Špička (evening peak)
 * 100: Víkend (weekend)
 */
export const getIntervalRank = (inv: PriceInterval): number => {
  if (areDaysSame(inv.days, [6, 0])) return 100;

  const name = (inv.name || "").toLowerCase().trim();

  // 1. Canonical Evening Peak (Hlavná večerná špička)
  // Only the actual "Špička" or "Pondelok – Piatok (Špička)" or "Večer" ending at closing time
  const isPurePeak =
    name === "špička" ||
    name === "spicka" ||
    name === "pondelok – piatok (špička)" ||
    name === "večer" ||
    name === "vecer" ||
    name.endsWith("(špička)");

  if (isPurePeak) {
    return 3;
  }

  // 2. Morning / Off-peak (Ranné pásmo / Mimo špičky)
  if (
    name.includes("mimo") ||
    name.includes("rann") ||
    name.includes("dopolud") ||
    (inv.startHour === 7 && !name.includes("špičk") && !name.includes("spick"))
  ) {
    return 1;
  }

  // 3. Midday / Happy Hour / intermediate / any custom added band (e.g. "Špička_Test", "Stred dňa")
  return 2;
};

/**
 * Sorts intervals strictly by logical rank and then start hour.
 * Prevents rows from ever jumping or swapping randomly during time adjustments.
 */
export const sortIntervalsLogically = (intervals: PriceInterval[]): PriceInterval[] => {
  return [...intervals].sort((a, b) => {
    // 1. Day group / semantic rank
    const rankA = getIntervalRank(a);
    const rankB = getIntervalRank(b);
    if (rankA !== rankB) return rankA - rankB;

    // 2. Start hour
    if (a.startHour !== b.startHour) return a.startHour - b.startHour;
    return a.endHour - b.endHour;
  });
};

/**
 * Cleans user-facing interval names to short standard form.
 */
export const getShortIntervalName = (name: string): string => {
  let cleaned = name.trim();
  cleaned = cleaned.replace(/^(Pondelok\s*–\s*Piatok|Sobota\s*–\s*Nedeľa|Po\s*–\s*Pi|So\s*–\s*Ne)\s*/i, "");
  cleaned = cleaned.replace(/^\((.*?)\)$/, "$1");
  cleaned = cleaned.replace(/\s*\((.*?)\)$/, "");
  return cleaned.trim() || name;
};

/**
 * Synchronizes a single group of intervals belonging to the same days (e.g. Po–Pi or So–Ne)
 * so that they are 100% contiguous between opening and closing time without gaps or overlaps.
 */
export const syncDayGroupIntervals = (
  group: PriceInterval[],
  changedId?: string,
  changedField?: "startHour" | "endHour",
  newHour?: number
): PriceInterval[] => {
  if (group.length === 0) return group;

  const isWeekend = areDaysSame(group[0].days, [6, 0]);
  const minHour = 7;
  const maxHour = isWeekend ? 21 : 22;

  // Single interval in the day group covers the full day
  if (group.length === 1) {
    return [
      {
        ...group[0],
        startHour: minHour,
        endHour: maxHour,
      },
    ];
  }

  // Sort by logical rank (Morning -> Midday -> Evening Peak)
  const sorted = [...group].sort((a, b) => {
    const rankA = getIntervalRank(a);
    const rankB = getIntervalRank(b);
    if (rankA !== rankB) return rankA - rankB;
    return (a.startHour || 0) - (b.startHour || 0);
  });
  const N = sorted.length;

  // Extract boundaries T_0, T_1, ... T_{N-2}
  const boundaries: number[] = [];
  if (N === 2) {
    // 2 intervals: Morning (7 to b0) and Peak (b0 to 22)
    const b0 =
      sorted[0].endHour && sorted[0].endHour < maxHour && sorted[0].endHour > minHour
        ? sorted[0].endHour
        : sorted[1].startHour && sorted[1].startHour > minHour && sorted[1].startHour < maxHour
        ? sorted[1].startHour
        : 16;
    boundaries.push(b0);
  } else if (N === 3) {
    // 3 intervals: Morning (7 to b0), Midday (b0 to b1), Evening Peak (b1 to 22)
    let b0 = 12;
    let b1 = 16;

    if (sorted[1].startHour && sorted[1].startHour > minHour && sorted[1].startHour < maxHour) {
      b0 = sorted[1].startHour;
    } else if (sorted[0].endHour && sorted[0].endHour > minHour && sorted[0].endHour < maxHour) {
      b0 = sorted[0].endHour;
    }

    if (sorted[1].endHour && sorted[1].endHour > b0 && sorted[1].endHour < maxHour) {
      b1 = sorted[1].endHour;
    } else if (sorted[2].startHour && sorted[2].startHour > b0 && sorted[2].startHour < maxHour) {
      b1 = sorted[2].startHour;
    }

    // Ensure b0 < b1 with minimum 1h width
    if (b0 >= b1) {
      b0 = Math.max(minHour + 1, b1 - 2);
    }
    boundaries.push(b0, b1);
  } else {
    for (let k = 0; k < N - 1; k++) {
      boundaries.push(sorted[k].endHour || minHour + (k + 1) * 4);
    }
  }

  // If a specific field was changed by the user, adjust that boundary
  if (changedId && changedField && newHour !== undefined) {
    const targetIdx = sorted.findIndex((i) => i.id === changedId);
    if (targetIdx !== -1) {
      let boundaryIdx = -1;
      if (changedField === "endHour" && targetIdx < N - 1) {
        boundaryIdx = targetIdx;
      } else if (changedField === "startHour" && targetIdx > 0) {
        boundaryIdx = targetIdx - 1;
      }

      if (boundaryIdx !== -1) {
        const minAllowed = minHour + (boundaryIdx + 1);
        const maxAllowed = maxHour - (N - 1 - boundaryIdx);
        const clampedHour = Math.min(maxAllowed, Math.max(minAllowed, newHour));
        boundaries[boundaryIdx] = clampedHour;

        // Cascade forward
        for (let k = boundaryIdx; k < N - 2; k++) {
          if (boundaries[k + 1] <= boundaries[k]) {
            const nextMax = maxHour - (N - 2 - k);
            boundaries[k + 1] = Math.min(nextMax, boundaries[k] + 1);
          }
        }

        // Cascade backward
        for (let k = boundaryIdx; k >= 1; k--) {
          if (boundaries[k - 1] >= boundaries[k]) {
            const prevMin = minHour + k;
            boundaries[k - 1] = Math.max(prevMin, boundaries[k] - 1);
          }
        }
      }
    }
  } else {
    // Sanity realignment
    for (let k = 0; k < N - 1; k++) {
      const minAllowed = minHour + (k + 1);
      const maxAllowed = maxHour - (N - 1 - k);
      boundaries[k] = Math.min(maxAllowed, Math.max(minAllowed, boundaries[k]));
      if (k > 0 && boundaries[k] <= boundaries[k - 1]) {
        boundaries[k] = boundaries[k - 1] + 1;
      }
    }
  }

  return sorted.map((inv, idx) => {
    const startHour = idx === 0 ? minHour : boundaries[idx - 1];
    const endHour = idx === N - 1 ? maxHour : boundaries[idx];
    return {
      ...inv,
      startHour,
      endHour,
    };
  });
};

/**
 * Re-aligns all intervals in a pricelist across all day groups.
 */
export const realignAllIntervals = (
  intervals: PriceInterval[],
  changedId?: string,
  changedField?: "startHour" | "endHour",
  newHour?: number
): PriceInterval[] => {
  const targetInv = changedId ? intervals.find((i) => i.id === changedId) : undefined;

  const dayGroups: number[][] = [];
  for (const inv of intervals) {
    if (!dayGroups.some((dg) => areDaysSame(dg, inv.days))) {
      dayGroups.push(inv.days);
    }
  }

  const result: PriceInterval[] = [];

  for (const dg of dayGroups) {
    const group = intervals.filter((i) => areDaysSame(i.days, dg));
    const isTargetGroup = targetInv && areDaysSame(targetInv.days, dg);

    if (isTargetGroup && changedId && changedField && newHour !== undefined) {
      result.push(...syncDayGroupIntervals(group, changedId, changedField, newHour));
    } else {
      result.push(...syncDayGroupIntervals(group));
    }
  }

  return sortIntervalsLogically(result);
};
