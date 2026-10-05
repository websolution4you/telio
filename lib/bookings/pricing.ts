import { SportType } from "./mockBookings";
import { DEFAULT_NTC_WINTER_PRICELIST, NtcPricelist } from "./pricingTypes";

export type NtcPricingResult = {
  totalPriceEur: number;
  originalPriceEur: number;
  isMemberRate: boolean;
  baseHourlyRate: number;
  roleDiscountEur: number;
  multisportDiscountEur: number;
  multisportCardsCount: number;
  formattedPrice: string;
};

/**
 * Normalizes court ID or sport string to a canonical NTC sport type.
 */
export function normalizeSport(sportOrCourtId: string): SportType {
  const lower = sportOrCourtId.toLowerCase();
  if (lower.startsWith("badminton")) return "badminton";
  if (lower.startsWith("tennis-clay") || lower.startsWith("clay")) return "tennis-clay";
  if (lower.startsWith("tennis")) return "tennis";
  if (lower.startsWith("squash")) return "squash";
  return "badminton";
}

/**
 * Returns hourly rate for a single 1-hour window according to NTC official pricing.
 */
export function getNtcHourlyRate(
  sport: SportType,
  hour: number,
  day: number | boolean, // 0=Ne, 1=Po, ..., 6=So or boolean isWeekend
  _hasCard: boolean = false,
  pricelist?: NtcPricelist
): number {
  const isWeekend = typeof day === "boolean" ? day : (day === 0 || day === 6);
  const activeList = pricelist || DEFAULT_NTC_WINTER_PRICELIST;
  if (activeList && activeList.intervals) {
    const matchingCandidates = activeList.intervals.filter((inv) => {
      const matchDay = typeof day === "number"
        ? inv.days.includes(day)
        : (isWeekend ? (inv.days.includes(6) || inv.days.includes(0)) : (!inv.days.includes(6) && !inv.days.includes(0)));
      return matchDay && hour >= inv.startHour && hour < inv.endHour;
    });

    if (matchingCandidates.length > 0) {
      // Prioritize more specific day rules (e.g. single day [1] overrides [1, 2, 3, 4, 5])
      matchingCandidates.sort((a, b) => a.days.length - b.days.length);
      const matching = matchingCandidates[0];
      if (matching && matching.prices && typeof (matching.prices as any)[sport] === "number") {
        return (matching.prices as any)[sport];
      }
    }

    // Safety fallback for accidental gaps: find closest interval for the same day type
    const sameDayIntervals = activeList.intervals.filter((inv) =>
      typeof day === "number"
        ? inv.days.includes(day)
        : (isWeekend ? (inv.days.includes(6) || inv.days.includes(0)) : (!inv.days.includes(6) && !inv.days.includes(0)))
    );
    if (sameDayIntervals.length > 0) {
      const closest = sameDayIntervals.reduce((prev, curr) => {
        const distPrev = Math.min(Math.abs(hour - prev.startHour), Math.abs(hour - prev.endHour));
        const distCurr = Math.min(Math.abs(hour - curr.startHour), Math.abs(hour - curr.endHour));
        return distCurr < distPrev ? curr : prev;
      });
      if (closest.prices && typeof (closest.prices as any)[sport] === "number") {
        return (closest.prices as any)[sport];
      }
    }
  }

  // Official NTC Winter Season 2026/2027 defaults
  if (isWeekend) {
    switch (sport) {
      case "badminton":
        return 14;
      case "tennis-clay":
        return 20;
      case "tennis":
        return 28;
      case "squash":
        return 11;
    }
  }

  // Weekdays (Monday - Friday)
  const isPeak = hour >= 16;

  switch (sport) {
    case "badminton":
      return isPeak ? 20 : 14;
    case "tennis-clay":
      return isPeak ? 25 : 20;
    case "tennis":
      return isPeak ? 39 : 29;
    case "squash":
      return isPeak ? 15 : 11;
  }
}

/**
 * Calculates exact NTC booking price for any sport, date/time, and duration.
 * Uses 15-minute slice precision across tariff boundaries, applies 2 € member card discount per reservation
 * plus any role discount, and finally MultiSport card discounts (1 card = 10% + 50%, 2 cards = 100%).
 */
export function calculateNtcBookingPrice(
  sportOrCourtId: string,
  startDate: Date | string,
  durationMinutes: number,
  hasCard: boolean = false,
  discountEurPerHour: number = 0,
  multisportCardsCount: number = 0,
  pricelist?: NtcPricelist
): NtcPricingResult {
  const normalizedSport = normalizeSport(sportOrCourtId);
  const start = typeof startDate === "string" ? new Date(startDate) : new Date(startDate);
  const duration = Math.max(15, durationMinutes);
  const slices = Math.round(duration / 15);

  let totalPrice = 0;
  let firstHourlyRate = 0;

  for (let i = 0; i < slices; i++) {
    const sliceTime = new Date(start.getTime() + i * 15 * 60 * 1000);
    const localParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Bratislava",
      weekday: "short",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(sliceTime);
    const weekday = localParts.find((part) => part.type === "weekday")?.value;
    const isWeekend = weekday === "Sat" || weekday === "Sun";
    const dayIndex =
      weekday === "Sun"
        ? 0
        : weekday === "Mon"
        ? 1
        : weekday === "Tue"
        ? 2
        : weekday === "Wed"
        ? 3
        : weekday === "Thu"
        ? 4
        : weekday === "Fri"
        ? 5
        : 6;
    const hour = Number(localParts.find((part) => part.type === "hour")?.value || 0);

    const hourlyRate = getNtcHourlyRate(normalizedSport, hour, dayIndex, hasCard, pricelist);
    if (i === 0) {
      firstHourlyRate = hourlyRate;
    }

    // 15-minute slice is 1/4 of the hourly rate
    totalPrice += hourlyRate / 4;
  }

  // Member card discount: e.g. 2 € per reservation (from pricelist or default 2 €)
  const cardDiscountEur = hasCard ? (pricelist?.nonMemberSurchargeEur ?? 2.00) : 0.00;
  const roleDiscount = Math.max(0, discountEurPerHour);
  const totalDiscount = Math.min(totalPrice, cardDiscountEur + roleDiscount);
  const roleDiscountEur = Math.round(totalDiscount * 100) / 100;

  const beforeMultisport = Math.max(0, totalPrice - roleDiscountEur);
  const roundedBeforeMultisport = Math.round(beforeMultisport * 100) / 100;

  let multisportDiscountEur = 0;
  let finalTotal = roundedBeforeMultisport;

  const validCards = Math.min(2, Math.max(0, Math.floor(multisportCardsCount || 0)));
  if (validCards === 1) {
    // 1 MultiSport karta: najprv 10% zľava zo základnej ceny, a následne 50% zľava
    const priceAfter10Percent = roundedBeforeMultisport * 0.9;
    finalTotal = Math.max(0, priceAfter10Percent * 0.5);
    multisportDiscountEur = Math.round((roundedBeforeMultisport - finalTotal) * 100) / 100;
  } else if (validCards >= 2) {
    // 2 MultiSport karty = 100% zľava (zadarmo)
    multisportDiscountEur = roundedBeforeMultisport;
    finalTotal = 0.00;
  }

  const roundedTotal = Math.round(finalTotal * 100) / 100;

  return {
    totalPriceEur: roundedTotal,
    originalPriceEur: roundedBeforeMultisport,
    isMemberRate: hasCard,
    baseHourlyRate: firstHourlyRate,
    roleDiscountEur,
    multisportDiscountEur,
    multisportCardsCount: validCards,
    formattedPrice: `${roundedTotal.toFixed(2)} €`,
  };
}
