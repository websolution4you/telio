import { SportType } from "./mockBookings";

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
  isWeekend: boolean,
  hasCard: boolean
): number {
  if (isWeekend) {
    switch (sport) {
      case "badminton":
        return hasCard ? 13 : 15;
      case "tennis-clay":
        return hasCard ? 13 : 15;
      case "tennis":
        return hasCard ? 17 : 19;
      case "squash":
        return hasCard ? 11 : 13;
    }
  }

  // Weekdays (Monday - Friday)
  const isPeak = hour >= 16;

  switch (sport) {
    case "badminton":
      return isPeak ? (hasCard ? 19 : 21) : (hasCard ? 13 : 15);
    case "tennis-clay":
      return isPeak ? (hasCard ? 15 : 17) : (hasCard ? 13 : 15);
    case "tennis":
      return isPeak ? (hasCard ? 19 : 21) : (hasCard ? 17 : 19);
    case "squash":
      return isPeak ? (hasCard ? 15 : 17) : (hasCard ? 11 : 13);
  }
}

/**
 * Calculates exact NTC booking price for any sport, date/time, and duration.
 * Uses 15-minute slice precision across tariff boundaries, then applies fixed role discount,
 * and finally MultiSport card discounts (1 card = 50%, 2 cards = 100%).
 */
export function calculateNtcBookingPrice(
  sportOrCourtId: string,
  startDate: Date | string,
  durationMinutes: number,
  hasCard: boolean = false,
  discountEurPerHour: number = 0,
  multisportCardsCount: number = 0
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
    const hour = Number(localParts.find((part) => part.type === "hour")?.value || 0);

    const hourlyRate = getNtcHourlyRate(normalizedSport, hour, isWeekend, hasCard);
    if (i === 0) {
      firstHourlyRate = hourlyRate;
    }

    // 15-minute slice is 1/4 of the hourly rate
    totalPrice += hourlyRate / 4;
  }

  const roleDiscountEur = Math.max(0, discountEurPerHour) * duration / 60;
  const beforeMultisport = Math.max(0, totalPrice - roleDiscountEur);
  const roundedBeforeMultisport = Math.round(beforeMultisport * 100) / 100;

  let multisportDiscountEur = 0;
  let finalTotal = roundedBeforeMultisport;

  const validCards = Math.min(2, Math.max(0, Math.floor(multisportCardsCount || 0)));
  if (validCards === 1) {
    // 1 MultiSport card = 50% discount
    multisportDiscountEur = Math.round(roundedBeforeMultisport * 0.5 * 100) / 100;
    finalTotal = Math.max(0, roundedBeforeMultisport - multisportDiscountEur);
  } else if (validCards >= 2) {
    // 2 MultiSport cards = 100% discount (free)
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
