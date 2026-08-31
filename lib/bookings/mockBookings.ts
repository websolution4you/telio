export type SportType = "tennis" | "tennis-clay" | "squash" | "badminton";

export type Court = {
  id: string;
  name: string;
  sport: SportType;
  surface: string;
  location: string;
};

export type BookingStatus = "confirmed" | "pending" | "blocked" | "cancelled";

export interface Booking {
  id: string;
  courtId: string;
  title: string;
  customerName: string;
  phone?: string;
  start: string;
  end: string;
  status: BookingStatus;
  source: "voice-assistant" | "web" | "admin" | "google-calendar";
  user_id?: string;
  userRole?: string;
  userCardNumber?: string;
}

export const courts: Court[] = [
  ...Array.from({ length: 10 }, (_, index) => ({
    id: `badminton-${index + 1}`,
    name: `Kurt ${String(index + 1).padStart(2, "0")}`,
    sport: "badminton" as const,
    surface: "Bedminton",
    location: "NTC bedmintonová hala",
  })),
  ...Array.from({ length: 4 }, (_, index) => ({
    id: `squash-${index + 1}`,
    name: `Kurt ${String(index + 1).padStart(2, "0")}`,
    sport: "squash" as const,
    surface: "Squash Court",
    location: "NTC squash centrum",
  })),
  { id: "tennis-1", name: "Center1", sport: "tennis" as const, surface: "Hard court", location: "NTC indoor tenisová hala" },
  { id: "tennis-2", name: "Center2", sport: "tennis" as const, surface: "Hard court", location: "NTC indoor tenisová hala" },
  { id: "tennis-3", name: "Center3", sport: "tennis" as const, surface: "Hard court", location: "NTC indoor tenisová hala" },
  { id: "tennis-4", name: "Kurt 1", sport: "tennis" as const, surface: "Hard court", location: "NTC indoor tenisová hala" },
  { id: "tennis-5", name: "Kurt 2", sport: "tennis" as const, surface: "Hard court", location: "NTC indoor tenisová hala" },
  { id: "tennis-6", name: "Kurt 3", sport: "tennis" as const, surface: "Hard court", location: "NTC indoor tenisová hala" },
  { id: "tennis-clay-1", name: "Dvorec 01", sport: "tennis-clay" as const, surface: "Antuka", location: "NTC antukové dvorce" },
  { id: "tennis-clay-2", name: "Dvorec 02", sport: "tennis-clay" as const, surface: "Antuka", location: "NTC antukové dvorce" },
  { id: "tennis-clay-10", name: "Dvorec 10", sport: "tennis-clay" as const, surface: "Antuka", location: "NTC antukové dvorce" },
  { id: "tennis-clay-11", name: "Dvorec 11", sport: "tennis-clay" as const, surface: "Antuka", location: "NTC antukové dvorce" },
];

const today = new Date();

function atDayOffset(dayOffset: number, hour: number, minute = 0) {
  const date = new Date(today);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export const mockBookings: Booking[] = [
  // Badminton
  {
    id: "b-001",
    courtId: "badminton-1",
    title: "Bedminton - Novák",
    customerName: "Martin Novák",
    phone: "+421 900 111 222",
    start: atDayOffset(0, 9),
    end: atDayOffset(0, 10),
    status: "confirmed",
    source: "voice-assistant",
  },
  {
    id: "b-002",
    courtId: "badminton-1",
    title: "Bedminton - Baláž",
    customerName: "Peter Baláž",
    start: atDayOffset(0, 13),
    end: atDayOffset(0, 14),
    status: "confirmed",
    source: "web",
  },
  {
    id: "b-003",
    courtId: "badminton-2",
    title: "Tréning detí",
    customerName: "NTC Tréner",
    start: atDayOffset(0, 10),
    end: atDayOffset(0, 12),
    status: "blocked",
    source: "admin",
  },
  {
    id: "b-004",
    courtId: "badminton-7",
    title: "Bedminton - Kováč",
    customerName: "Lucia Kováčová",
    start: atDayOffset(0, 9),
    end: atDayOffset(0, 10),
    status: "confirmed",
    source: "voice-assistant",
  },
  // Tenis antuka (clay) - exhibits half-hour intervals
  {
    id: "tc-001",
    courtId: "tennis-clay-1",
    title: "Údržba kurtov",
    customerName: "Technická správa",
    start: atDayOffset(0, 13),
    end: atDayOffset(0, 14),
    status: "blocked",
    source: "admin",
  },
  {
    id: "tc-002",
    courtId: "tennis-clay-1",
    title: "Tenis - Bartko",
    customerName: "Kamil Bartko",
    start: atDayOffset(0, 9),
    end: atDayOffset(0, 10, 30),
    status: "confirmed",
    source: "voice-assistant",
  },
  {
    id: "tc-003",
    courtId: "tennis-clay-2",
    title: "Údržba kurtov",
    customerName: "Technická správa",
    start: atDayOffset(0, 13),
    end: atDayOffset(0, 14),
    status: "blocked",
    source: "admin",
  },
  // Stacked days mock data
  {
    id: "b-next-1",
    courtId: "badminton-1",
    title: "Bedminton - Zajac",
    customerName: "Marek Zajac",
    start: atDayOffset(1, 10),
    end: atDayOffset(1, 11),
    status: "confirmed",
    source: "web",
  },
  {
    id: "tc-next-1",
    courtId: "tennis-clay-1",
    title: "Tenis - Horváth",
    customerName: "Andrea Horváthová",
    start: atDayOffset(1, 14),
    end: atDayOffset(1, 15, 30),
    status: "confirmed",
    source: "google-calendar",
  }
];

export const openingHours = {
  startHour: 7,
  endHour: 22,
};