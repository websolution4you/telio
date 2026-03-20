"use server";

import { getPizzaDashboardData, getTaxiDashboardData } from "@/lib/server/dashboard";
import { getCurrentTenantId } from "@/lib/config/tenants";
import { getProjectContext } from "@/lib/server/projectContext";
import { revalidatePath } from "next/cache";

type UpdatePayload = Record<string, unknown>;

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Unknown error";
}

export async function fetchPizzaDashboardAction() {
    try {
        const tenantId = await getCurrentTenantId("pizza");
        const data = await getPizzaDashboardData(tenantId);
        revalidatePath("/dashboard/pizza");
        return { success: true, data };
    } catch (error: unknown) {
        console.error("fetchPizzaDashboardAction failed:", error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function fetchTaxiDashboardAction() {
    try {
        const tenantId = await getCurrentTenantId("taxi");
        const data = await getTaxiDashboardData(tenantId);
        revalidatePath("/dashboard/taxi");
        return { success: true, data };
    } catch (error: unknown) {
        console.error("fetchTaxiDashboardAction failed:", error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function updateMenuItemAction(itemId: number, updates: UpdatePayload) {
    try {
        const tenantId = await getCurrentTenantId("pizza");
        const { db, tables } = await getProjectContext(tenantId, "pizza");
        const { error } = await db.from(tables.menuItems).update(updates).eq("id", itemId);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error: unknown) {
        console.error("updateMenuItemAction failed:", error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function updateTaxiPriceAction(priceId: string, updates: UpdatePayload) {
    try {
        const tenantId = await getCurrentTenantId("taxi");
        const { db, tables } = await getProjectContext(tenantId, "taxi");
        const { error } = await db.from(tables.prices).update(updates).eq("id", priceId);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error: unknown) {
        console.error("updateTaxiPriceAction failed:", error);
        return { success: false, error: getErrorMessage(error) };
    }
}
