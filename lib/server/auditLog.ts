"use server";

import { getCoreServiceDb } from "@/lib/server/supabase";
import { getSession } from "@/lib/auth/bookingAuth";

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "595cbb6c-1019-41ae-b1c2-a60c13c8dcdf";

export type AuditCategory = "bookings" | "users" | "settings" | "pricing" | "auth";
export type AuditLevel = "info" | "warning" | "critical";

export interface LogActivityInput {
  tenantId?: string;
  action: string;
  category: AuditCategory;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  description: string;
  changes?: {
    before?: any;
    after?: any;
  } | null;
  metadata?: Record<string, any> | null;
  level?: AuditLevel;
  actor?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  };
}

export interface AuditLogEntry {
  id: string;
  tenant_id: string;
  created_at: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  category: AuditCategory;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  description: string;
  changes: { before?: any; after?: any } | null;
  metadata: Record<string, any> | null;
  level: AuditLevel;
}

export interface AuditLogFilters {
  page?: number;
  pageSize?: number;
  category?: string;
  action?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  actorId?: string;
  level?: string;
}

/**
 * Bezpečné zaznamenanie aktivity do audit_logs.
 * Nikdy nevyhodí neošetrenú chybu, aby nezlyhala hlavná operácia (napr. rezervácia).
 */
export async function logActivity(input: LogActivityInput): Promise<boolean> {
  try {
    const db = getCoreServiceDb();

    // 1. Zistiť kto vykonáva akciu, ak nie je explicitne zadaný
    let actorId = input.actor?.id || null;
    let actorName = input.actor?.name || null;
    let actorEmail = input.actor?.email || null;
    let actorRole = input.actor?.role || null;

    if (!actorId && !actorName) {
      try {
        const session = await getSession();
        if (session) {
          actorId = session.userId || null;
          actorName = session.name || session.email || null;
          actorEmail = session.email || null;
          actorRole = session.role || null;
        }
      } catch {
        // Ignorovať chybu session (napr. v background kontexte)
      }
    }

    if (!actorName) {
      actorName = "Systém";
      actorRole = actorRole || "system";
    }

    // 2. Vložiť záznam do audit_logs
    const { error } = await db.from("audit_logs").insert({
      tenant_id: input.tenantId || TENANT_ID,
      actor_id: actorId,
      actor_name: actorName,
      actor_email: actorEmail,
      actor_role: actorRole,
      action: input.action,
      category: input.category,
      entity_type: input.entityType,
      entity_id: input.entityId || null,
      entity_name: input.entityName || null,
      description: input.description,
      changes: input.changes || null,
      metadata: input.metadata || null,
      level: input.level || "info",
    });

    if (error) {
      // Ak tabuľka ešte neexistuje, iba zalogujeme upozornenie do konzoly
      console.warn("⚠️ logActivity warning:", error.message);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error("❌ logActivity unhandled error:", err?.message || err);
    return false;
  }
}

/**
 * Server action: Načítanie záznamov pre administrátorské UI s filtrami a pagináciou
 */
export async function fetchAuditLogsAction(filters: AuditLogFilters = {}) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "Nemáte oprávnenie prehliadať auditné logy." };
    }

    const db = getCoreServiceDb();
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(10, Number(filters.pageSize) || 25));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = db
      .from("audit_logs")
      .select("*", { count: "exact" })
      .or(`tenant_id.eq.${TENANT_ID},tenant_id.eq.default`);

    // Filtre
    if (filters.category && filters.category !== "all") {
      query = query.eq("category", filters.category);
    }

    if (filters.level && filters.level !== "all") {
      query = query.eq("level", filters.level);
    }

    if (filters.action) {
      query = query.eq("action", filters.action);
    }

    if (filters.actorId) {
      query = query.eq("actor_id", filters.actorId);
    }

    if (filters.dateFrom) {
      query = query.gte("created_at", new Date(filters.dateFrom).toISOString());
    }

    if (filters.dateTo) {
      const dTo = new Date(filters.dateTo);
      dTo.setHours(23, 59, 59, 999);
      query = query.lte("created_at", dTo.toISOString());
    }

    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim().replace(/[,%()]/g, " ")}%`;
      query = query.or(
        `description.ilike.${term},entity_name.ilike.${term},actor_name.ilike.${term},actor_email.ilike.${term},action.ilike.${term}`
      );
    }

    // Zoradenie od najnovších
    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, count, error } = await query;

    if (error) {
      if (error.message?.includes("audit_logs") && error.message?.includes("does not exist") || (error as any).code === "42P01") {
        return {
          success: true,
          logs: [] as AuditLogEntry[],
          totalCount: 0,
          page: 1,
          totalPages: 1,
          tableMissing: true,
        };
      }
      return { success: false, error: error.message };
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    return {
      success: true,
      logs: (data || []) as AuditLogEntry[],
      totalCount,
      page,
      totalPages,
      tableMissing: false,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Nepodarilo sa načítať auditné logy." };
  }
}

/**
 * Pomocná funkcia na bezpečné escapovanie hodnôt do CSV
 */
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  if (typeof val === "object") {
    val = JSON.stringify(val);
  }
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Server action: Export vyfiltrovaných logov do CSV formátu pre Excel (UTF-8 BOM)
 */
export async function exportAuditLogsCsvAction(filters: AuditLogFilters = {}) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "Nemáte oprávnenie exportovať auditné logy." };
    }

    const db = getCoreServiceDb();
    let query = db
      .from("audit_logs")
      .select("*")
      .or(`tenant_id.eq.${TENANT_ID},tenant_id.eq.default`);

    if (filters.category && filters.category !== "all") {
      query = query.eq("category", filters.category);
    }
    if (filters.level && filters.level !== "all") {
      query = query.eq("level", filters.level);
    }
    if (filters.action) {
      query = query.eq("action", filters.action);
    }
    if (filters.dateFrom) {
      query = query.gte("created_at", new Date(filters.dateFrom).toISOString());
    }
    if (filters.dateTo) {
      const dTo = new Date(filters.dateTo);
      dTo.setHours(23, 59, 59, 999);
      query = query.lte("created_at", dTo.toISOString());
    }
    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim().replace(/[,%()]/g, " ")}%`;
      query = query.or(
        `description.ilike.${term},entity_name.ilike.${term},actor_name.ilike.${term},actor_email.ilike.${term},action.ilike.${term}`
      );
    }

    // Limit na max 5000 záznamov pre jeden export
    query = query.order("created_at", { ascending: false }).limit(5000);

    const { data, error } = await query;
    if (error) {
      return { success: false, error: error.message };
    }

    const rows = data || [];
    
    // CSV Hlavička
    const headers = [
      "ID",
      "Dátum a čas",
      "Používateľ (Kto)",
      "Email",
      "Rola",
      "Kategória",
      "Akcia",
      "Typ entity",
      "ID Entity",
      "Názov entity",
      "Popis akcie",
      "Úroveň",
      "Zmeny (Diff)",
      "Metadáta"
    ];

    const csvLines = [headers.map(escapeCsv).join(";")];

    for (const r of rows) {
      const d = new Date(r.created_at);
      const formattedDate = `${d.toLocaleDateString("sk-SK")} ${d.toLocaleTimeString("sk-SK")}`;

      const rowValues = [
        r.id,
        formattedDate,
        r.actor_name || "Systém",
        r.actor_email || "",
        r.actor_role || "",
        r.category,
        r.action,
        r.entity_type,
        r.entity_id || "",
        r.entity_name || "",
        r.description,
        r.level,
        r.changes ? JSON.stringify(r.changes) : "",
        r.metadata ? JSON.stringify(r.metadata) : ""
      ];

      csvLines.push(rowValues.map(escapeCsv).join(";"));
    }

    // UTF-8 BOM (\uFEFF) zabezpečí, že Microsoft Excel správne otvorí slovenskú diakritiku
    const csvContent = "\uFEFF" + csvLines.join("\r\n");
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `audit_logy_export_${dateStr}.csv`;

    return {
      success: true,
      csvContent,
      fileName,
      totalExported: rows.length,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Exportovanie zlyhalo." };
  }
}
