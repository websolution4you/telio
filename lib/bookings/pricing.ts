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
  _hasCard: boolean = false
): number {
  if (isWeekend) {
    switch (sport) {
      case "badminton":
        return 15;
      case "tennis-clay":
        return 15;
      case "tennis":
        return 19;
      case "squash":
        return 13;
    }
  }

  // Weekdays (Monday - Friday)
  const isPeak = hour >= 16;

  switch (sport) {
    case "badminton":
      return isPeak ? 21 : 15;
    case "tennis-clay":
      return isPeak ? 17 : 15;
    case "tennis":
      return isPeak ? 21 : 19;
    case "squash":
      return isPeak ? 17 : 13;
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

    const hourlyRate = getNtcHourlyRate(normalizedSport, hour, isWeekend);
    if (i === 0) {
      firstHourlyRate = hourlyRate;
    }

    // 15-minute slice is 1/4 of the hourly rate
    totalPrice += hourlyRate / 4;
  }

  // Member card discount: 2 € per reservation (e.g. 13 € - 2 € = 11 € for 1h, 26 € - 2 € = 24 € for 2h)
  const cardDiscountEur = hasCard ? 2.00 : 0.00;
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
