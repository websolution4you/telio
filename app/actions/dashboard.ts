"use server";

import { getPizzaDashboardData, getTaxiDashboardData } from "@/lib/server/dashboard";
import { getPizzaDb, getTaxiDb } from "@/lib/server/supabase";
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

export async function fetchTaxiDashboardAction() {
    try {
        const tenantId = await getCurrentTenantId('taxi');
        const data = await getTaxiDashboardData(tenantId);
        return { success: true, data };
    } catch (error: any) {
        console.error("fetchTaxiDashboardAction failed:", error);
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
export async function updateTaxiPriceAction(priceId: string, updates: any) {
    try {
        const taxiDb = getTaxiDb();
        const { error } = await taxiDb.from("taxi_rate_cards").update(updates).eq("id", priceId);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (error: any) {
        console.error("updateTaxiPriceAction failed:", error);
        return { success: false, error: error.message };
    }
}
