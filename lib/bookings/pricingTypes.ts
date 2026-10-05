import { SportType } from "./mockBookings";

export type PriceInterval = {
  id: string;
  name: string;
  days: number[]; // 1=Po, 2=Ut, 3=St, 4=Št, 5=Pi, 6=So, 0=Ne
  startHour: number; // e.g. 7
  endHour: number;   // e.g. 16
  squashStartHour?: number; // e.g. 9
  squashEndHour?: number;   // e.g. 21
  prices: {
    badminton: number;
    tennis: number;
    "tennis-clay"?: number;
    squash: number;
  };
};

export type DiscountTier = {
  id: string;
  name: string;
  isPercentual: boolean; // Či sa cena počíta percentuálne zo základu
  percentageOfBase: number; // napr. 100 (základ), 90 (pre 10% zľavu), 80 (20%), 50 (50%), 100 (bežná/hotovosť)
  discountPercent: number; // 0, 10, 20, 50 (100 - percentageOfBase)
  price60?: number; // manuálna fixná cena na 60 min, ak nie je percentuálna
  price120?: number; // manuálna fixná cena na 120 min, ak nie je percentuálna
  isDefault?: boolean;
};

export const DEFAULT_DISCOUNT_TIERS: DiscountTier[] = [
  {
    id: "tier-base",
    name: "Základná cena",
    isPercentual: true,
    percentageOfBase: 100,
    discountPercent: 0,
    price60: 10,
    price120: 0,
    isDefault: true,
  },
  {
    id: "tier-10",
    name: "10 % zľava",
    isPercentual: true,
    percentageOfBase: 90,
    discountPercent: 10,
    price60: 9,
    price120: 0,
  },
  {
    id: "tier-20",
    name: "20 % zľava",
    isPercentual: true,
    percentageOfBase: 80,
    discountPercent: 20,
    price60: 8,
    price120: 0,
  },
  {
    id: "tier-50",
    name: "50 % zľava",
    isPercentual: true,
    percentageOfBase: 50,
    discountPercent: 50,
    price60: 5,
    price120: 0,
  },
  {
    id: "tier-regular",
    name: "Bežná cena",
    isPercentual: true,
    percentageOfBase: 100,
    discountPercent: 0,
    price60: 10,
    price120: 0,
  },
  {
    id: "tier-cash",
    name: "Hotovosť",
    isPercentual: true,
    percentageOfBase: 100,
    discountPercent: 0,
    price60: 10,
    price120: 0,
  },
];

export type NtcPricelist = {
  id: string;
  name: string;
  validFrom: string; // "YYYY-MM-DD"
  validTo: string;   // "YYYY-MM-DD"
  isActive: boolean;
  nonMemberSurchargeEur: number; // default 2.00
  intervals: PriceInterval[];
  discountTiers?: DiscountTier[];
};

/**
 * Official NTC Winter Season 2026/2027 pricing from the official physical price sheet:
 * Platnosť: 1. 10. 2026 – 30. 4. 2027
 */
export const DEFAULT_NTC_WINTER_PRICELIST: NtcPricelist = {
  id: "ntc-winter-2026-2027",
  name: "Cenník Zimná sezóna 2026/2027",
  validFrom: "2026-10-01",
  validTo: "2027-04-30",
  isActive: true,
  nonMemberSurchargeEur: 2.00,
  discountTiers: DEFAULT_DISCOUNT_TIERS,
  intervals: [
    {
      id: "weekday-morning",
      name: "Pondelok – Piatok (Mimo špičky)",
      days: [1, 2, 3, 4, 5],
      startHour: 7,
      endHour: 16,
      squashStartHour: 9,
      squashEndHour: 16,
      prices: {
        badminton: 14,
        tennis: 29,
        "tennis-clay": 20,
        squash: 11,
      },
    },
    {
      id: "weekday-peak",
      name: "Pondelok – Piatok (Špička)",
      days: [1, 2, 3, 4, 5],
      startHour: 16,
      endHour: 22,
      squashStartHour: 16,
      squashEndHour: 21,
      prices: {
        badminton: 20,
        tennis: 39,
        "tennis-clay": 25,
        squash: 15,
      },
    },
    {
      id: "weekend-all-day",
      name: "Sobota – Nedeľa (Celý deň)",
      days: [6, 0],
      startHour: 7,
      endHour: 21,
      squashStartHour: 9,
      squashEndHour: 21,
      prices: {
        badminton: 14,
        tennis: 28,
        "tennis-clay": 20,
        squash: 11,
      },
    },
  ],
};

export const DEFAULT_NTC_SUMMER_PRICELIST: NtcPricelist = {
  id: "ntc-summer-2027",
  name: "Cenník Letná sezóna 2027",
  validFrom: "2027-05-01",
  validTo: "2027-09-30",
  isActive: false,
  nonMemberSurchargeEur: 2.00,
  discountTiers: DEFAULT_DISCOUNT_TIERS,
  intervals: [
    {
      id: "summer-weekday-morning",
      name: "Pondelok – Piatok (Mimo špičky)",
      days: [1, 2, 3, 4, 5],
      startHour: 7,
      endHour: 16,
      prices: {
        badminton: 12,
        tennis: 24,
        "tennis-clay": 15,
        squash: 10,
      },
    },
    {
      id: "summer-weekday-peak",
      name: "Pondelok – Piatok (Špička)",
      days: [1, 2, 3, 4, 5],
      startHour: 16,
      endHour: 22,
      prices: {
        badminton: 17,
        tennis: 32,
        "tennis-clay": 18,
        squash: 13,
      },
    },
    {
      id: "summer-weekend-all-day",
      name: "Sobota – Nedeľa (Celý deň)",
      days: [6, 0],
      startHour: 7,
      endHour: 21,
      prices: {
        badminton: 12,
        tennis: 24,
        "tennis-clay": 15,
        squash: 10,
      },
    },
  ],
};
