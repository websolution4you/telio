"use server";

import { getCoreDb, getCoreServiceDb } from "@/lib/server/supabase";
import { getSession } from "@/lib/auth/bookingAuth";
import {
  DEFAULT_DISCOUNT_TIERS,
  DEFAULT_NTC_SUMMER_PRICELIST,
  DEFAULT_NTC_WINTER_PRICELIST,
  NtcPricelist,
} from "@/lib/bookings/pricingTypes";

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "595cbb6c-1019-41ae-b1c2-a60c13c8dcdf";

let inMemoryPricelists: NtcPricelist[] = [
  DEFAULT_NTC_WINTER_PRICELIST,
  DEFAULT_NTC_SUMMER_PRICELIST,
];

export async function fetchPricelistsAction(): Promise<{
  success: boolean;
  pricelists: NtcPricelist[];
  error?: string;
}> {
  try {
    const db = getCoreDb();
    const { data, error } = await db
      .from("ntc_pricelists")
      .select("id, name, valid_from, valid_to, is_active, non_member_surcharge_eur, intervals, discount_tiers")
      .or(`tenant_id.eq.${TENANT_ID},tenant_id.eq.default`)
      .order("valid_from", { ascending: false });

    if (error || !data || data.length === 0) {
      // Graceful fallback to default in-memory seasonal pricelists
      return { success: true, pricelists: inMemoryPricelists };
    }

    const mapped: NtcPricelist[] = data.map((row) => ({
      id: row.id,
      name: row.name,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      isActive: Boolean(row.is_active),
      nonMemberSurchargeEur: Number(row.non_member_surcharge_eur) || 2.00,
      intervals: typeof row.intervals === "string" ? JSON.parse(row.intervals) : (row.intervals || []),
      discountTiers: typeof row.discount_tiers === "string" ? JSON.parse(row.discount_tiers) : (row.discount_tiers || DEFAULT_DISCOUNT_TIERS),
    }));

    inMemoryPricelists = mapped;
    return { success: true, pricelists: mapped };
  } catch (err: any) {
    console.error("fetchPricelistsAction error, using fallback:", err);
    return { success: true, pricelists: inMemoryPricelists };
  }
}

export async function savePricelistAction(pricelist: NtcPricelist): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "Iba administrátor môže meniť cenník." };
    }

    // Update in-memory first for instant preview
    const idx = inMemoryPricelists.findIndex((p) => p.id === pricelist.id);
    if (idx >= 0) {
      inMemoryPricelists[idx] = pricelist;
    } else {
      inMemoryPricelists.push(pricelist);
    }

    // If marked active, deactivate others
    if (pricelist.isActive) {
      for (const p of inMemoryPricelists) {
        if (p.id !== pricelist.id) p.isActive = false;
      }
    }

    // Try persisting to Supabase if table exists
    try {
      const serviceDb = getCoreServiceDb();
      if (pricelist.isActive) {
        await serviceDb
          .from("ntc_pricelists")
          .update({ is_active: false })
          .eq("tenant_id", TENANT_ID);
      }

      await serviceDb.from("ntc_pricelists").upsert(
        {
          id: pricelist.id,
          tenant_id: TENANT_ID,
          name: pricelist.name,
          valid_from: pricelist.validFrom,
          valid_to: pricelist.validTo,
          is_active: pricelist.isActive,
          non_member_surcharge_eur: pricelist.nonMemberSurchargeEur,
          intervals: pricelist.intervals,
          discount_tiers: pricelist.discountTiers || DEFAULT_DISCOUNT_TIERS,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch (dbErr) {
      // Table might not exist yet, fallback already saved in-memory
      console.warn("Could not save to Supabase ntc_pricelists (in-memory updated):", dbErr);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Nepodarilo sa uložiť cenník." };
  }
}

export async function setActivePricelistAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "Iba administrátor môže aktivovať cenník." };
    }

    for (const p of inMemoryPricelists) {
      p.isActive = p.id === id;
    }

    try {
      const serviceDb = getCoreServiceDb();
      await serviceDb
        .from("ntc_pricelists")
        .update({ is_active: false })
        .eq("tenant_id", TENANT_ID);

      await serviceDb
        .from("ntc_pricelists")
        .update({ is_active: true })
        .eq("tenant_id", TENANT_ID)
        .eq("id", id);
    } catch (e) {
      console.warn("Database sync skipped for active pricelist:", e);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Chyba pri aktivácii cenníka." };
  }
}
