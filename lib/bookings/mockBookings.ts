export type SportType = "tennis" | "badminton";

export type Court = {
  id: string;
  name: string;
  sport: SportType;
  surface: string;
  location: string;
};

export type BookingStatus = "confirmed" | "pending" | "blocked";

export type Booking = {
  id: string;
  courtId: string;
  title: string;
  customerName: string;
  phone?: string;
  start: string;
  end: string;
  status: BookingStatus;
  source: "voice-assistant" | "web" | "admin" | "google-calendar";
};

export const courts: Court[] = [
  ...Array.from({ length: 8 }, (_, index) => ({
    id: `tennis-${index + 1}`,
    name: `Tenisový kurt ${index + 1}`,
    sport: "tennis" as const,
    surface: index < 4 ? "Hard court" : "Clay court",
    location: "NTC indoor tenisová hala",
  })),
  ...Array.from({ length: 14 }, (_, index) => ({
    id: `badminton-${index + 1}`,
    name: `Bedmintonový kurt ${index + 1}`,
    sport: "badminton" as const,
    surface: "Indoor badminton",
    location: "NTC badmintonová hala",
  })),
];

const today = new Date();

function atDayOffset(dayOffset: number, hour: number, minute = 0) {
  const date = new Date(today);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

/**
 * Dočasné demo dáta.
 * Neskôr sa tento súbor nahradí dátami z Google Calendar API:
 * - calendar event id -> Booking.id
 * - event summary -> Booking.title/customerName
 * - event start/end -> Booking.start/end
 * - custom extendedProperties -> courtId, sport, source, status
 */
export const mockBookings: Booking[] = [
  {
    id: "booking-001",
    courtId: "tennis-1",
    title: "Dvojhra — Novák",
    customerName: "Martin Novák",
    phone: "+421 900 111 222",
    start: atDayOffset(0, 9),
    end: atDayOffset(0, 10),
    status: "confirmed",
    source: "voice-assistant",
  },
  {
    id: "booking-002",
    courtId: "tennis-3",
    title: "Tréning detí",
    customerName: "NTC tréner",
    start: atDayOffset(0, 11),
    end: atDayOffset(0, 12, 30),
    status: "blocked",
    source: "admin",
  },
  {
    id: "booking-003",
    courtId: "badminton-2",
    title: "Bedminton — Kováčová",
    customerName: "Lucia Kováčová",
    phone: "+421 911 333 444",
    start: atDayOffset(0, 17),
    end: atDayOffset(0, 18),
    status: "confirmed",
    source: "web",
  },
  {
    id: "booking-004",
    courtId: "badminton-5",
    title: "Firemný turnaj",
    customerName: "Corporate event",
    start: atDayOffset(0, 18),
    end: atDayOffset(0, 20),
    status: "pending",
    source: "google-calendar",
  },
  {
    id: "booking-005",
    courtId: "tennis-2",
    title: "Telio rezervácia",
    customerName: "Peter Baláž",
    phone: "+421 902 555 111",
    start: atDayOffset(1, 8),
    end: atDayOffset(1, 9),
    status: "confirmed",
    source: "voice-assistant",
  },
  {
    id: "booking-006",
    courtId: "badminton-9",
    title: "Štvorhra",
    customerName: "Andrea Horváthová",
    start: atDayOffset(1, 19),
    end: atDayOffset(1, 20),
    status: "confirmed",
    source: "voice-assistant",
  },
  {
    id: "booking-007",
    courtId: "tennis-6",
    title: "Servis kurtu",
    customerName: "NTC technik",
    start: atDayOffset(2, 13),
    end: atDayOffset(2, 15),
    status: "blocked",
    source: "admin",
  },
];

export const openingHours = {
  startHour: 7,
  endHour: 22,
};