"use server";

import { getProjectContext } from "@/lib/server/projectContext";
import { getCurrentTenantId } from "@/lib/config/tenants";
import { snapToRoads } from "@/lib/maps/roads";
import { revalidatePath } from "next/cache";

/**
 * Updates a driver's location, performs snapping to roads, and persists to DB.
 */
export async function updateDriverLocationAction(driverId: string, lat: number, lng: number) {
  try {
    const tenantId = await getCurrentTenantId("taxi");
    const { db, tables } = await getProjectContext(tenantId, "taxi");

    // 1. Snapping via Google Roads API
    const snapped = await snapToRoads([{ lat, lng }]);
    const snappedPoint = snapped[0] || { lat, lng };

    // 2. Update database
    const { error } = await db
      .from(tables.drivers)
      .update({
        lat,
        lng,
        snapped_lat: snappedPoint.lat,
        snapped_lng: snappedPoint.lng,
        last_update: new Date().toISOString(),
      })
      .eq("id", driverId);

    if (error) throw error;

    revalidatePath("/dashboard/taxi/map");
    return { success: true, snapped: snappedPoint };

  } catch (err) {
    console.error("updateDriverLocationAction failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Internal error" };
  }
}
