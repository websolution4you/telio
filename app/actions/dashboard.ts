"use server";

import { getPizzaDashboardData } from "@/lib/server/dashboard";
import { getPizzaDb } from "@/lib/server/supabase";
import { getCurrentTenantId } from "@/lib/config/tenants";

export async function fetchPizzaDashboardAction() {
    try {
        const tenantId = await getCurrentTenantId('pizza');
        const data = await getPizzaDashboardData(tenantId);
        return { success: true, data };
    } catch (error: any) {
        console.error("fetchPizzaDashboardAction failed:", error);
        return { success: false, error: error.message };
    }
}

export async function updateMenuItemAction(itemId: number, updates: any) {
    try {
        // Zápis priamo do pizza DB
        const pizzaDb = getPizzaDb();
        const { error } = await pizzaDb.from("menu_items").update(updates).eq("id", itemId);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (error: any) {
        console.error("updateMenuItemAction failed:", error);
        return { success: false, error: error.message };
    }
}
