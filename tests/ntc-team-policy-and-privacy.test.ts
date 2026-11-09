import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_ADMIN_CATEGORIES,
} from "../lib/bookings/categoryTypes";

import {
  isNtcTeamReservationBlockRow,
  isAdminReservationBlockRow,
  mapNtcTeamEditableAdminRowToCalendarItem,
  mergeRestrictedCalendarItems,
  toPublicCalendarItem,
} from "../lib/bookings/publicAvailability";

import type { StaffBookingRowInput, OwnBookingCalendarItem, PublicCalendarItem } from "../lib/bookings/publicAvailability";

test("1. DEFAULT_ADMIN_CATEGORIES má správne poradie a názvy", () => {
  assert.equal(DEFAULT_ADMIN_CATEGORIES.length, 3);

  // 1. Rezervácia Admin
  assert.equal(DEFAULT_ADMIN_CATEGORIES[0].id, "admin_reservation");
  assert.equal(DEFAULT_ADMIN_CATEGORIES[0].name, "Rezervácia Admin");
  assert.equal(DEFAULT_ADMIN_CATEGORIES[0].sortOrder, 1);
  assert.equal(DEFAULT_ADMIN_CATEGORIES[0].color, "#FFFF33");

  // 2. NTC Tím (bývalé Tréningy)
  assert.equal(DEFAULT_ADMIN_CATEGORIES[1].id, "training");
  assert.equal(DEFAULT_ADMIN_CATEGORIES[1].name, "NTC Tím");
  assert.equal(DEFAULT_ADMIN_CATEGORIES[1].sortOrder, 2);
  assert.equal(DEFAULT_ADMIN_CATEGORIES[1].color, "#F4CDE4");

  // 3. Údržba kurtov
  assert.equal(DEFAULT_ADMIN_CATEGORIES[2].id, "maintenance");
  assert.equal(DEFAULT_ADMIN_CATEGORIES[2].name, "Údržba kurtov");
  assert.equal(DEFAULT_ADMIN_CATEGORIES[2].sortOrder, 3);
  assert.equal(DEFAULT_ADMIN_CATEGORIES[2].color, "#FFC9C9");
});

test("2. isNtcTeamReservationBlockRow a isAdminReservationBlockRow spoľahlivo rozpoznávajú dôvody", () => {
  // NTC Tím varianty
  const validNtcVariants = [
    { admin_block_type: "NTC Tím" },
    { admin_block_type: "ntc tim" },
    { admin_block_type: "NTC TIM" },
    { admin_block_type: "training" },
    { admin_block_type: "tréningy" },
    { admin_block_type: "treningy" },
    { admin_block_type: "ntc_team" },
    { adminBlockType: "NTC Tím" },
    { notes: JSON.stringify({ adminBlockType: "NTC Tím" }) },
    { customer_name: "NTC Tím" },
  ];

  for (const variant of validNtcVariants) {
    assert.equal(isNtcTeamReservationBlockRow(variant), true, `Variant ${JSON.stringify(variant)} by mal byť rozpoznaný ako NTC Tím`);
    assert.equal(isAdminReservationBlockRow(variant), false, `Variant ${JSON.stringify(variant)} nesmie byť Rezervácia Admin`);
  }

  // Rezervácia Admin varianty
  const validAdminVariants = [
    { admin_block_type: "Rezervácia Admin" },
    { admin_block_type: "rezervacia admin" },
    { admin_block_type: "admin_reservation" },
    { admin_block_type: "admin" },
    { adminBlockType: "Rezervácia Admin" },
    { notes: JSON.stringify({ adminBlockType: "Rezervácia Admin" }) },
    { customer_name: "Rezervácia Admin" },
  ];

  for (const variant of validAdminVariants) {
    assert.equal(isAdminReservationBlockRow(variant), true, `Variant ${JSON.stringify(variant)} by mal byť rozpoznaný ako Rezervácia Admin`);
    assert.equal(isNtcTeamReservationBlockRow(variant), false, `Variant ${JSON.stringify(variant)} nesmie byť NTC Tím`);
  }

  // Údržba a iné
  const maintenanceRow = { admin_block_type: "Údržba kurtov" };
  assert.equal(isNtcTeamReservationBlockRow(maintenanceRow), false);
  assert.equal(isAdminReservationBlockRow(maintenanceRow), false);
});

test("3. mapNtcTeamEditableAdminRowToCalendarItem sanitizuje citlivé údaje a vracia len NTC Tím položky", () => {
  const callerCoachId = "coach-uuid-123";

  const ntcRowOwnedByCaller: StaffBookingRowInput = {
    id: "booking-1",
    court_id: "badminton-1",
    start_at: "2026-11-10T10:00:00.000Z",
    end_at: "2026-11-10T11:00:00.000Z",
    status: "blocked",
    price_eur: 0,
    user_id: callerCoachId,
    customer_name: "Reprezentant A",
    customer_phone: "+421900111222",
    notes: {
      adminBlockType: "NTC Tím",
      adminBlockCategoryId: "training",
      adminBlockColor: "#F4CDE4",
      adminBlockBorder: "#EAAECF",
      subSlots: [
        { from: "10:00", to: "10:30", player: "Hráč 1" },
        { from: "10:30", to: "11:00", player: "Hráč 2" },
      ],
    },
  };

  const itemCaller = mapNtcTeamEditableAdminRowToCalendarItem(ntcRowOwnedByCaller, false, callerCoachId);
  assert.ok(itemCaller, "Musí vrátiť položku pre prihláseného trénera");
  assert.equal(itemCaller?.kind, "staff-booking");
  assert.equal(itemCaller?.booking.customerName, "Reprezentant A");
  assert.equal(itemCaller?.booking.phone, undefined, "Telefón musí byť odfiltrovaný kvôli ochrane súkromia");
  assert.equal(itemCaller?.booking.userCardNumber, undefined, "Karta musí byť odfiltrovaná");
  assert.equal(itemCaller?.booking.user_id, callerCoachId, "Pre vlastnú rezerváciu trénera sa user_id zachováva");
  assert.equal(itemCaller?.booking.subSlots?.length, 2);

  // Rezervácia iného trénera
  const ntcRowOwnedByOther: StaffBookingRowInput = {
    ...ntcRowOwnedByCaller,
    id: "booking-2",
    user_id: "other-coach-uuid-456",
    customer_name: "Reprezentant B",
  };

  const itemOther = mapNtcTeamEditableAdminRowToCalendarItem(ntcRowOwnedByOther, false, callerCoachId);
  assert.ok(itemOther, "Musí vrátiť položku aj pre iného NTC trénera");
  assert.equal(itemOther?.booking.user_id, undefined, "Pre rezerváciu iného používateľa sa user_id zmaže");
  assert.equal(itemOther?.booking.customerName, "Reprezentant B");

  // Údržba alebo Rezervácia Admin nesmie byť editovateľná pre NTC Tím
  const adminRow: StaffBookingRowInput = {
    ...ntcRowOwnedByCaller,
    id: "booking-3",
    notes: { adminBlockType: "Rezervácia Admin" },
  };
  const maintenanceRow: StaffBookingRowInput = {
    ...ntcRowOwnedByCaller,
    id: "booking-4",
    notes: { adminBlockType: "Údržba kurtov" },
  };

  assert.equal(mapNtcTeamEditableAdminRowToCalendarItem(adminRow, false, callerCoachId), null);
  assert.equal(mapNtcTeamEditableAdminRowToCalendarItem(maintenanceRow, false, callerCoachId), null);
});

test("4. mergeRestrictedCalendarItems uprednostňuje NTC Tím editableAdminItems pred anonymným vlastným slotom", () => {
  const coachUserId = "coach-uuid-123";

  const ntcRow: StaffBookingRowInput = {
    id: "booking-ntc-100",
    court_id: "badminton-1",
    start_at: "2026-11-10T14:00:00.000Z",
    end_at: "2026-11-10T15:00:00.000Z",
    status: "blocked",
    price_eur: 0,
    user_id: coachUserId,
    customer_name: "NTC Tím",
    notes: {
      adminBlockType: "NTC Tím",
      adminBlockCategoryId: "training",
      adminBlockColor: "#F4CDE4",
      adminBlockBorder: "#EAAECF",
      subSlots: [{ from: "14:00", to: "15:00", player: "Hráč NTC" }],
    },
  };

  const editableItem = mapNtcTeamEditableAdminRowToCalendarItem(ntcRow, false, coachUserId);
  assert.ok(editableItem);

  const ownItem: OwnBookingCalendarItem = {
    kind: "own-booking",
    source: "calendar",
    booking: {
      id: "booking-ntc-100",
      courtId: "badminton-1",
      start: "2026-11-10T14:00:00.000Z",
      end: "2026-11-10T15:00:00.000Z",
      priceEur: 0,
      title: "Rezervácia",
      customerName: "NTC Tím",
      status: "blocked",
    },
  };

  const publicItems: PublicCalendarItem[] = [
    toPublicCalendarItem({
      courtId: "badminton-1",
      start: "2026-11-10T14:00:00.000Z",
      end: "2026-11-10T15:00:00.000Z",
      status: "occupied",
    }),
  ];

  const merged = mergeRestrictedCalendarItems(
    publicItems,
    [ownItem],
    [editableItem]
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0].kind, "staff-booking", "Položka musí byť staff-booking s kategóriou NTC Tím a subSlots");
  assert.equal(merged[0].booking.user_id, coachUserId);
  assert.equal((merged[0].booking as any).adminBlockType, "NTC Tím");
  assert.equal((merged[0].booking as any).subSlots?.length, 1);
});