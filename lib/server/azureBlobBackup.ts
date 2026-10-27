import { getCoreServiceDb } from "@/lib/server/supabase";
import { logActivity } from "@/lib/server/auditLog";

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "595cbb6c-1019-41ae-b1c2-a60c13c8dcdf";

export interface AzureUploadResult {
  blobName: string;
  blobUrl: string;
  sizeBytes: number;
  recordsCount: number;
}

/**
 * Robustne zostaví cieľovú URL pre Azure Blob s priloženým SAS tokenom.
 */
export function buildAzureBlobUrl(containerSasUrl: string, blobPath: string): string {
  const url = new URL(containerSasUrl.trim());
  const cleanContainerPath = url.pathname.replace(/\/+$/, "");
  const cleanBlobPath = blobPath.replace(/^\/+/, "");
  url.pathname = `${cleanContainerPath}/${cleanBlobPath}`;
  return url.toString();
}

/**
 * Odošle JSON objekt do Azure Blob Storage cez natívne HTTPS REST API (BlockBlob).
 */
export async function uploadJsonToAzureBlob(
  containerSasUrl: string,
  blobPath: string,
  data: any
): Promise<{ success: boolean; blobPath: string; sizeBytes: number; error?: string }> {
  try {
    const fullUrl = buildAzureBlobUrl(containerSasUrl, blobPath);
    const jsonString = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    const buffer = Buffer.from(jsonString, "utf-8");

    const res = await fetch(fullUrl, {
      method: "PUT",
      headers: {
        "x-ms-blob-type": "BlockBlob",
        "x-ms-version": "2023-11-03",
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": String(buffer.byteLength),
      },
      body: buffer,
    });

    if (res.status !== 201) {
      const errText = await res.text().catch(() => "");
      return {
        success: false,
        blobPath,
        sizeBytes: buffer.byteLength,
        error: `Azure Blob Storage odpovedalo HTTP ${res.status} (${res.statusText}): ${errText.slice(0, 300)}`,
      };
    }

    return {
      success: true,
      blobPath,
      sizeBytes: buffer.byteLength,
    };
  } catch (err: any) {
    return {
      success: false,
      blobPath,
      sizeBytes: 0,
      error: err?.message || String(err),
    };
  }
}

/**
 * Vykoná denný export záznamov za určený deň a nahrá ich do Azure Blob Storage.
 * Ukladá:
 *   - telio-logs/YYYY/MM/DD/calls-summary.json
 *   - telio-logs/YYYY/MM/DD/audit-logs.json
 */
export async function runDailyAzureLogsBackup(targetDateStr?: string): Promise<{
  success: boolean;
  dateKey: string;
  uploads: AzureUploadResult[];
  errors: string[];
}> {
  const containerSasUrl =
    process.env.AZURE_LOGS_CONTAINER_URL ||
    process.env.AZURE_STORAGE_SAS_URL ||
    process.env.AZURE_STORAGE_CONTAINER_URL;

  if (!containerSasUrl) {
    return {
      success: false,
      dateKey: targetDateStr || "",
      uploads: [],
      errors: ["Chýba premenná prostredia AZURE_LOGS_CONTAINER_URL vo Verceli."],
    };
  }

  // 1. Určenie dátumu (predvolene včerajší deň, alebo manuálne zadaný YYYY-MM-DD)
  let dateKey: string;
  if (targetDateStr && /^\d{4}-\d{2}-\d{2}$/.test(targetDateStr)) {
    dateKey = targetDateStr;
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    dateKey = yesterday.toISOString().slice(0, 10);
  }

  const [year, month, day] = dateKey.split("-");
  const dayStart = `${dateKey}T00:00:00.000Z`;
  const dayEnd = `${dateKey}T23:59:59.999Z`;

  const db = getCoreServiceDb();
  const uploads: AzureUploadResult[] = [];
  const errors: string[] = [];

  // 2. Export hovorov (calls)
  try {
    let callsRecords: any[] = [];
    const { data: calls, error: callsError } = await db
      .from("calls")
      .select("*")
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd)
      .order("created_at", { ascending: true });

    if (!callsError && calls) {
      callsRecords = calls;
    }

    const callsPayload = {
      exportedAt: new Date().toISOString(),
      date: dateKey,
      tenantId: TENANT_ID,
      count: callsRecords.length,
      calls: callsRecords,
    };

    const callsBlobPath = `${year}/${month}/${day}/calls-summary.json`;
    const callsRes = await uploadJsonToAzureBlob(containerSasUrl, callsBlobPath, callsPayload);

    if (callsRes.success) {
      uploads.push({
        blobName: callsBlobPath,
        blobUrl: buildAzureBlobUrl(containerSasUrl, callsBlobPath).split("?")[0], // URL bez query tokenu pre log
        sizeBytes: callsRes.sizeBytes,
        recordsCount: callsRecords.length,
      });
    } else {
      errors.push(`Upload calls zlyhal: ${callsRes.error}`);
    }
  } catch (err: any) {
    errors.push(`Chyba pri príprave calls: ${err.message}`);
  }

  // 3. Export auditných logov (audit_logs)
  try {
    let auditRecords: any[] = [];
    const { data: audit, error: auditError } = await db
      .from("audit_logs")
      .select("*")
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd)
      .order("created_at", { ascending: true });

    if (!auditError && audit) {
      auditRecords = audit;
    }

    const auditPayload = {
      exportedAt: new Date().toISOString(),
      date: dateKey,
      tenantId: TENANT_ID,
      count: auditRecords.length,
      auditLogs: auditRecords,
    };

    const auditBlobPath = `${year}/${month}/${day}/audit-logs.json`;
    const auditRes = await uploadJsonToAzureBlob(containerSasUrl, auditBlobPath, auditPayload);

    if (auditRes.success) {
      uploads.push({
        blobName: auditBlobPath,
        blobUrl: buildAzureBlobUrl(containerSasUrl, auditBlobPath).split("?")[0],
        sizeBytes: auditRes.sizeBytes,
        recordsCount: auditRecords.length,
      });
    } else {
      errors.push(`Upload audit_logs zlyhal: ${auditRes.error}`);
    }
  } catch (err: any) {
    errors.push(`Chyba pri príprave audit_logs: ${err.message}`);
  }

  // 4. Záznam operácie do lokálneho audit logu
  const isOverallSuccess = uploads.length > 0 && errors.length === 0;
  await logActivity({
    action: "system.backup_azure",
    category: "settings",
    entityType: "azure_backup",
    entityId: dateKey,
    entityName: `Denná záloha za ${dateKey}`,
    description: isOverallSuccess
      ? `Úspešný denný export do Azure Blob Storage: ${uploads.map((u) => `${u.blobName} (${u.recordsCount} záznamov, ${(u.sizeBytes / 1024).toFixed(1)} KB)`).join(", ")}`
      : `Záloha do Azure za ${dateKey} skončila s chybami: ${errors.join("; ")}`,
    metadata: {
      dateKey,
      uploads,
      errors,
    },
    level: isOverallSuccess ? "info" : "warning",
  });

  return {
    success: isOverallSuccess,
    dateKey,
    uploads,
    errors,
  };
}
