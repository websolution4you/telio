"use server";

import { getCoreDb, getCoreServiceDb } from "@/lib/server/supabase";
import { getSession } from "@/lib/auth/bookingAuth";
import { logActivity } from "@/lib/server/auditLog";
import {
  DEFAULT_DISCOUNT_TIERS,
  DEFAULT_NTC_SUMMER_PRICELIST,
  DEFAULT_NTC_WINTER_PRICELIST,
  NtcPricelist,
} from "@/lib/bookings/pricingTypes";
import { formatLocalDateKey } from "@/lib/bookings/pricelistValidation";

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

/**
 * Returns the pricelist valid for the given target date (or today).
 * If no pricelist specifically covers the date (gap), falls back to the default pricelist (Option 1A).
 */
export async function getActivePricelist(targetDate?: string | Date): Promise<NtcPricelist> {
  const dateKey = formatLocalDateKey(targetDate || new Date());

  try {
    const db = getCoreDb();
    // 1. Try finding a pricelist covering target date: valid_from <= dateKey and valid_to >= dateKey
    const { data, error } = await db
      .from("ntc_pricelists")
      .select("id, name, valid_from, valid_to, is_active, non_member_surcharge_eur, intervals, discount_tiers")
      .or(`tenant_id.eq.${TENANT_ID},tenant_id.eq.default`)
      .lte("valid_from", dateKey)
      .gte("valid_to", dateKey)
      .order("valid_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      return {
        id: data.id,
        name: data.name,
        validFrom: data.valid_from,
        validTo: data.valid_to,
        isActive: true,
        nonMemberSurchargeEur: Number(data.non_member_surcharge_eur) || 2.00,
        intervals: typeof data.intervals === "string" ? JSON.parse(data.intervals) : (data.intervals || []),
        discountTiers: typeof data.discount_tiers === "string" ? JSON.parse(data.discount_tiers) : (data.discount_tiers || DEFAULT_DISCOUNT_TIERS),
      };
    }

    // 2. Fallback (Option 1A): If no exact match (gap), get latest or any configured pricelist
    const { data: anyData } = await db
      .from("ntc_pricelists")
      .select("id, name, valid_from, valid_to, is_active, non_member_surcharge_eur, intervals, discount_tiers")
      .or(`tenant_id.eq.${TENANT_ID},tenant_id.eq.default`)
      .order("valid_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (anyData) {
      return {
        id: anyData.id,
        name: anyData.name,
        validFrom: anyData.valid_from,
        validTo: anyData.valid_to,
        isActive: true,
        nonMemberSurchargeEur: Number(anyData.non_member_surcharge_eur) || 2.00,
        intervals: typeof anyData.intervals === "string" ? JSON.parse(anyData.intervals) : (anyData.intervals || []),
        discountTiers: typeof anyData.discount_tiers === "string" ? JSON.parse(anyData.discount_tiers) : (anyData.discount_tiers || DEFAULT_DISCOUNT_TIERS),
      };
    }
  } catch (err: any) {
    console.error("getActivePricelist error, fallback to in-memory:", err);
  }

  // Fallback in-memory by date or first
  const matched = inMemoryPricelists.find((p) => p.validFrom <= dateKey && p.validTo >= dateKey);
  return matched || inMemoryPricelists[0] || DEFAULT_NTC_WINTER_PRICELIST;
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
      inMemoryPricelists[idx] = { ...pricelist, isActive: true };
    } else {
      inMemoryPricelists.push({ ...pricelist, isActive: true });
    }

    // Try persisting to Supabase if table exists
    try {
      const serviceDb = getCoreServiceDb();
      await serviceDb.from("ntc_pricelists").upsert(
        {
          id: pricelist.id,
          tenant_id: TENANT_ID,
          name: pricelist.name,
          valid_from: pricelist.validFrom,
          valid_to: pricelist.validTo,
          is_active: true,
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

    await logActivity({
      action: "pricelist.save",
      category: "pricing",
      entityType: "pricelist",
      entityId: pricelist.id,
      entityName: pricelist.name,
      description: `Uložený cenník "${pricelist.name}" (${pricelist.intervals.length} intervalov, aktívny: ${pricelist.isActive ? "áno" : "nie"})`,
      changes: {
        before: null,
        after: {
          name: pricelist.name,
          validFrom: pricelist.validFrom,
          validTo: pricelist.validTo,
          isActive: pricelist.isActive,
          intervalsCount: pricelist.intervals.length,
          nonMemberSurchargeEur: pricelist.nonMemberSurchargeEur,
        }
      },
      metadata: {
        pricelistId: pricelist.id,
        isActive: pricelist.isActive,
      }
    });

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

    const activeItem = inMemoryPricelists.find((p) => p.id === id);
    await logActivity({
      action: "pricelist.activate",
      category: "pricing",
      entityType: "pricelist",
      entityId: id,
      entityName: activeItem?.name || id,
      description: `Aktivovaný cenník "${activeItem?.name || id}"`,
      changes: {
        before: { isActive: false },
        after: { isActive: true }
      },
      metadata: {
        pricelistId: id,
      }
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Chyba pri aktivácii cenníka." };
  }
}

export async function deletePricelistAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "Iba administrátor môže zmazať cenník." };
    }

    try {
      const serviceDb = getCoreServiceDb();
      const { data: dbRows, error: dbErr } = await serviceDb
        .from("ntc_pricelists")
        .select("id, name, is_active")
        .or(`tenant_id.eq.${TENANT_ID},tenant_id.eq.default`);

      if (!dbErr && dbRows) {
        const target = dbRows.find((p) => p.id === id);

        // If the pricelist to delete does not even exist in the database (e.g. client draft):
        if (!target) {
          inMemoryPricelists = inMemoryPricelists.filter((p) => p.id !== id);
          return { success: true };
        }


        // Cannot delete the only remaining pricelist in the DB
        if (dbRows.length <= 1) {
          return { success: false, error: "Nemôžete zmazať posledný zostávajúci cenník." };
        }

        const { error: delErr } = await serviceDb
          .from("ntc_pricelists")
          .delete()
          .eq("id", id);

        if (delErr) {
          return { success: false, error: delErr.message || "Chyba pri mazaní cenníka z databázy." };
        }

        inMemoryPricelists = inMemoryPricelists.filter((p) => p.id !== id);

        await logActivity({
          action: "pricelist.delete",
          category: "pricing",
          entityType: "pricelist",
          entityId: id,
          entityName: target?.name || id,
          description: `Zmazaný cenník "${target?.name || id}"`,
          changes: {
            before: { id, name: target?.name },
            after: null
          },
          level: "warning",
        });

        return { success: true };
      }
    } catch (e) {
      console.warn("Database sync check failed, falling back to memory:", e);
    }

    const toDelete = inMemoryPricelists.find((p) => p.id === id);
    if (!toDelete) {
      return { success: true };
    }

    if (toDelete.isActive) {
      return { success: false, error: "Nemôžete zmazať aktívny cenník. Najprv nastavte iný cenník ako aktívny." };
    }

    if (inMemoryPricelists.length <= 1) {
      return { success: false, error: "Nemôžete zmazať posledný zostávajúci cenník." };
    }

    inMemoryPricelists = inMemoryPricelists.filter((p) => p.id !== id);

    await logActivity({
      action: "pricelist.delete",
      category: "pricing",
      entityType: "pricelist",
      entityId: id,
      entityName: toDelete.name,
      description: `Zmazaný cenník "${toDelete.name}"`,
      changes: {
        before: { id, name: toDelete.name },
        after: null
      },
      level: "warning",
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Chyba pri zmazaní cenníka." };
  }
}
