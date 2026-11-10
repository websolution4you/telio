"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/bookingAuth";
import { getCoreDb, getCoreServiceDb } from "@/lib/server/supabase";
import { logActivity } from "@/lib/server/auditLog";

const TENANT_ID = "595cbb6c-1019-41ae-b1c2-a60c13c8dcdf";

import {
  type AdminReservationCategory,
  DEFAULT_ADMIN_CATEGORIES,
  calculateBorderColor,
} from "@/lib/bookings/categoryTypes";

async function requireAdminSession() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function fetchReservationCategoriesAction(): Promise<{
  success: boolean;
  categories: AdminReservationCategory[];
  error?: string;
}> {
  try {
    const db = getCoreDb();
    const { data, error } = await db
      .from("ntc_reservation_categories")
      .select("id, name, color, border, is_system, has_player_field, sort_order")
      .eq("tenant_id", TENANT_ID)
      .order("sort_order", { ascending: true });

    if (error) {
      console.warn("fetchReservationCategoriesAction DB lookup notice:", error.message);
      return { success: true, categories: DEFAULT_ADMIN_CATEGORIES };
    }

    if (!data || data.length === 0) {
      return { success: true, categories: DEFAULT_ADMIN_CATEGORIES };
    }

    const mapped: AdminReservationCategory[] = data.map((row) => {
      let name = row.name;
      let sortOrder = Number(row.sort_order ?? 0);
      if (row.id === "training" && (name.toLowerCase() === "tréningy" || name.toLowerCase() === "treningy")) {
        name = "NTC Tím";
      }
      // Zaistenie nového preferovaného poradia systémových kategórií:
      // 1. Rezervácia Admin, 2. NTC Tím, 3. Údržba kurtov
      if (row.id === "admin_reservation" && sortOrder === 2) sortOrder = 1;
      else if (row.id === "training" && sortOrder === 3) sortOrder = 2;
      else if (row.id === "maintenance" && sortOrder === 1) sortOrder = 3;

      // Pre Rezervácia Admin a Údržba kurtov je hasPlayerField predvolene false (rozpis hráčov je určený pre NTC Tím / tréningy)
      const defaultHasPlayer = row.id === "admin_reservation" || row.id === "maintenance" ? false : true;
      const hasPlayerField = row.has_player_field != null ? Boolean(row.has_player_field) : defaultHasPlayer;

      return {
        id: row.id,
        name,
        color: row.color,
        border: row.border || calculateBorderColor(row.color),
        isSystem: Boolean(row.is_system),
        hasPlayerField,
        sortOrder,
      };
    });

    mapped.sort((a, b) => a.sortOrder - b.sortOrder);

    return { success: true, categories: mapped };
  } catch (e: any) {
    console.error("fetchReservationCategoriesAction error:", e);
    return { success: true, categories: DEFAULT_ADMIN_CATEGORIES };
  }
}

export async function saveReservationCategoryAction(category: {
  id?: string;
  name: string;
  color: string;
  border?: string;
  hasPlayerField: boolean;
}): Promise<{ success: boolean; category?: AdminReservationCategory; error?: string }> {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return { success: false, error: "Nemáte oprávnenie spravovať kategórie." };
    }

    const trimmedName = category.name.trim();
    if (!trimmedName) {
      return { success: false, error: "Názov kategórie nemôže byť prázdny." };
    }

    const colorHex = category.color.trim();
    const borderHex = (category.border && category.border.trim()) || calculateBorderColor(colorHex);

    const db = getCoreServiceDb();
    const isNew = !category.id;
    const targetId = category.id || `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Ak ide o update, overíme či existuje a či je systémová
    let existingIsSystem = false;
    let existingSortOrder = 0;
    if (!isNew) {
      const { data: existing } = await db
        .from("ntc_reservation_categories")
        .select("is_system, sort_order")
        .eq("id", targetId)
        .maybeSingle();
      if (existing) {
        existingIsSystem = Boolean(existing.is_system);
        existingSortOrder = Number(existing.sort_order ?? 0);
      }
    } else {
      const { data: maxRow } = await db
        .from("ntc_reservation_categories")
        .select("sort_order")
        .eq("tenant_id", TENANT_ID)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      existingSortOrder = (Number(maxRow?.sort_order ?? 0)) + 1;
    }

    const rowToSave = {
      id: targetId,
      tenant_id: TENANT_ID,
      name: trimmedName,
      color: colorHex,
      border: borderHex,
      is_system: existingIsSystem,
      has_player_field: category.hasPlayerField,
      sort_order: existingSortOrder,
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error } = await db
      .from("ntc_reservation_categories")
      .upsert(rowToSave)
      .select()
      .single();

    if (error) {
      throw new Error(`Chyba pri ukladaní kategórie: ${error.message}`);
    }

    const resultCat: AdminReservationCategory = {
      id: saved.id,
      name: saved.name,
      color: saved.color,
      border: saved.border,
      isSystem: Boolean(saved.is_system),
      hasPlayerField: Boolean(saved.has_player_field),
      sortOrder: Number(saved.sort_order ?? 0),
    };

    await logActivity({
      action: isNew ? "settings.create_category" : "settings.update_category",
      category: "settings",
      entityType: "reservation_category",
      entityId: resultCat.id,
      entityName: resultCat.name,
      description: isNew
        ? `Vytvorená nová kategória rezervácie: ${resultCat.name} (${resultCat.color})`
        : `Upravená kategória rezervácie: ${resultCat.name} (${resultCat.color})`,
      changes: {
        before: null,
        after: resultCat,
      },
    });

    revalidatePath("/newbookings");
    revalidatePath("/dashboard/users-roles");
    return { success: true, category: resultCat };
  } catch (e: any) {
    console.error("saveReservationCategoryAction failed:", e);
    return { success: false, error: e.message || "Uloženie kategórie zlyhalo." };
  }
}

export async function deleteReservationCategoryAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return { success: false, error: "Nemáte oprávnenie mazať kategórie." };
    }

    const db = getCoreServiceDb();
    const { data: existing, error: findError } = await db
      .from("ntc_reservation_categories")
      .select("id, name, is_system")
      .eq("id", id)
      .maybeSingle();

    if (findError || !existing) {
      return { success: false, error: "Kategória sa nenašla." };
    }

    if (existing.is_system) {
      return { success: false, error: "Systémovú kategóriu nie je možné zmazať." };
    }

    const { error: deleteError } = await db
      .from("ntc_reservation_categories")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw new Error(`Chyba pri mazaní kategórie: ${deleteError.message}`);
    }

    await logActivity({
      action: "settings.delete_category",
      category: "settings",
      entityType: "reservation_category",
      entityId: existing.id,
      entityName: existing.name,
      description: `Zmazaná kategória rezervácie: ${existing.name}`,
      level: "warning",
    });

    revalidatePath("/newbookings");
    revalidatePath("/dashboard/users-roles");
    return { success: true };
  } catch (e: any) {
    console.error("deleteReservationCategoryAction failed:", e);
    return { success: false, error: e.message || "Zmazanie kategórie zlyhalo." };
  }
}
