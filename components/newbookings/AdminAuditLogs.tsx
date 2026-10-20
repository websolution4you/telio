"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Search,
  Filter,
  Download,
  Calendar,
  AlertCircle,
  Clock,
  User,
  Shield,
  Layers,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Database
} from "lucide-react";
import {
  fetchAuditLogsAction,
  exportAuditLogsCsvAction,
  type AuditLogEntry,
  type AuditCategory,
  type AuditLevel,
} from "@/lib/server/auditLog";

const CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: "all", label: "Všetky", icon: "🌐" },
  { id: "bookings", label: "Rezervácie", icon: "🎾" },
  { id: "users", label: "Používatelia", icon: "👥" },
  { id: "settings", label: "Nastavenia", icon: "⚙️" },
  { id: "pricing", label: "Cenníky", icon: "💶" },
];

const PERIODS = [
  { id: "all", label: "Celá história" },
  { id: "today", label: "Dnes" },
  { id: "7days", label: "Posledných 7 dní" },
  { id: "30days", label: "Posledných 30 dní" },
];

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [category, setCategory] = useState("all");
  const [level, setLevel] = useState("all");
  const [period, setPeriod] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // Vypočítanie dátumov pre zvolené obdobie
  const getDateRange = (periodId: string) => {
    if (periodId === "all") return { dateFrom: undefined, dateTo: undefined };
    const now = new Date();
    const to = now.toISOString();

    if (periodId === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { dateFrom: start.toISOString(), dateTo: to };
    }
    if (periodId === "7days") {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { dateFrom: start.toISOString(), dateTo: to };
    }
    if (periodId === "30days") {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { dateFrom: start.toISOString(), dateTo: to };
    }
    return { dateFrom: undefined, dateTo: undefined };
  };

  const loadLogs = (targetPage = page) => {
    setLoading(true);
    const { dateFrom, dateTo } = getDateRange(period);

    fetchAuditLogsAction({
      page: targetPage,
      pageSize,
      category,
      level,
      search: search.trim() || undefined,
      dateFrom,
      dateTo,
    })
      .then((res) => {
        if (res.success) {
          setLogs(res.logs || []);
          setTotalCount(res.totalCount || 0);
          setTotalPages(res.totalPages || 1);
          setPage(res.page || 1);
          setTableMissing(Boolean(res.tableMissing));
        } else {
          console.error("fetchAuditLogsAction error:", res.error);
        }
      })
      .catch((err) => {
        console.error("fetchAuditLogsAction exception:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadLogs(1);
  }, [category, level, period, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs(1);
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const { dateFrom, dateTo } = getDateRange(period);
      const res = await exportAuditLogsCsvAction({
        category,
        level,
        search: search.trim() || undefined,
        dateFrom,
        dateTo,
      });

      if (res.success && res.csvContent) {
        // Vytvoriť a spustiť sťahovanie v prehliadači
        const blob = new Blob([res.csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", res.fileName || "audit_logs.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        alert(res.error || "Exportovanie do CSV zlyhalo.");
      }
    } catch (err: any) {
      alert("Chyba pri sťahovaní CSV: " + (err?.message || err));
    } finally {
      setIsExporting(false);
    }
  };

  const getActionBadge = (action: string, category: string) => {
    if (action.includes("delete")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200/80">
          <XCircle className="h-3 w-3 text-rose-500" />
          Zmazanie
        </span>
      );
    }
    if (action.includes("create")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/80">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          Vytvorenie
        </span>
      );
    }
    if (action.includes("reschedule") || action.includes("restore")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 border border-sky-200/80">
          <RefreshCw className="h-3 w-3 text-sky-500" />
          Zmena termínu
        </span>
      );
    }
    if (action.includes("activate")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200/80">
          <CheckCircle2 className="h-3 w-3 text-purple-500" />
          Aktivácia
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200/80">
        <Info className="h-3 w-3 text-amber-500" />
        Úprava
      </span>
    );
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case "admin":
        return <span className="text-[10px] font-bold text-lime-700 bg-lime-100/70 px-1.5 py-0.5 rounded">Admin</span>;
      case "trainer":
        return <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">Tréner</span>;
      case "ntc_team":
        return <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded">NTC Tím</span>;
      case "system":
        return <span className="text-[10px] font-bold text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded">Systém</span>;
      default:
        return <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">Používateľ</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upozornenie, ak ešte nebola spustená SQL migrácia v Supabase */}
      {tableMissing && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-5 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
              <Database className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-950">Databázová tabuľka audit_logs ešte neexistuje</h3>
              <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                Pre plné ukladanie a načítavanie logov je potrebné spustiť SQL migráciu{" "}
                <code className="rounded bg-amber-200/80 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-950">
                  audit_logs_migration.sql
                </code>{" "}
                v <strong>Supabase SQL Editore</strong>. Súbor migrácie bol pripravený v koreňovom priečinku projektu.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => loadLogs(1)}
                  className="rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-amber-900 transition"
                >
                  Skontrolovať znova
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ovládací panel s filtrami a exportom */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
        {/* Kategórie */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    active
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tlačidlo exportu do CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting || totalCount === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-2xs transition hover:bg-emerald-100 hover:border-emerald-600/50 active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Stiahnuť vyfiltrované záznamy do tabuľky Excel (CSV s UTF-8 BOM)"
          >
            {isExporting ? (
              <RefreshCw className="h-4 w-4 animate-spin text-emerald-700" />
            ) : (
              <Download className="h-4 w-4 text-emerald-700" />
            )}
            <span>Exportovať CSV pre Excel</span>
          </button>
        </div>

        {/* Vyhľadávanie a podrobné filtre */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
          {/* Hľadanie */}
          <form onSubmit={handleSearchSubmit} className="lg:col-span-6 relative">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Hľadať v popise, zákazníkoch, kurtoch, mene administrátora..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200/90 bg-slate-50/50 pl-10 pr-20 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none transition"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
              >
                Hľadať
              </button>
            </div>
          </form>

          {/* Obdobie */}
          <div className="lg:col-span-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full rounded-xl border border-slate-200/90 bg-slate-50/50 pl-9 pr-8 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-slate-900 focus:bg-white focus:outline-none transition appearance-none cursor-pointer"
              >
                {PERIODS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Úroveň */}
          <div className="lg:col-span-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full rounded-xl border border-slate-200/90 bg-slate-50/50 pl-9 pr-8 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-slate-900 focus:bg-white focus:outline-none transition appearance-none cursor-pointer"
              >
                <option value="all">Všetky úrovne</option>
                <option value="info">Bežné (Info)</option>
                <option value="warning">Upozornenia (Zmazania / Warning)</option>
                <option value="critical">Kritické (Critical)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Počítadlo záznamov */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <div>
            Nájdených <strong>{totalCount}</strong> záznamov v audit logu
          </div>
          <button
            type="button"
            onClick={() => loadLogs(page)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Obnoviť
          </button>
        </div>
      </div>

      {/* Tabuľka auditných logov */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 pl-4 pr-2 sm:pl-5">Čas</th>
                <th className="py-3 px-3">Kto vykonal</th>
                <th className="py-3 px-3">Typ akcie</th>
                <th className="py-3 px-3">Popis & Entita</th>
                <th className="py-3 px-3 text-right pr-4 sm:pr-5">Detaily</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-slate-400 mb-2" />
                    Načítavam auditné záznamy...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <AlertCircle className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    Žiadne záznamy nezodpovedajú zvoleným filtrom.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const d = new Date(log.created_at);
                  const isExpanded = expandedRowId === log.id;
                  const hasDetails = Boolean(log.changes || (log.metadata && Object.keys(log.metadata).length > 0));

                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isExpanded ? "bg-slate-50/60" : ""
                      }`}
                    >
                      {/* Čas */}
                      <td className="py-3.5 pl-4 pr-2 sm:pl-5 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 text-xs sm:text-[13px]">
                          {d.toLocaleDateString("sk-SK")}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {d.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </div>
                      </td>

                      {/* Kto vykonal */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 font-bold text-xs">
                            {log.actor_name ? log.actor_name.charAt(0).toUpperCase() : "S"}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 text-xs truncate max-w-[140px] sm:max-w-[180px]">
                              {log.actor_name || "Systém"}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {getRoleBadge(log.actor_role)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Typ akcie */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          {getActionBadge(log.action, log.category)}
                          <span className="font-mono text-[10px] text-slate-400">{log.action}</span>
                        </div>
                      </td>

                      {/* Popis & Entita */}
                      <td className="py-3.5 px-3 max-w-[280px] sm:max-w-md">
                        <div className="text-xs sm:text-[13px] font-medium text-slate-900 line-clamp-2">
                          {log.description}
                        </div>
                        {log.entity_name && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                            <span className="font-semibold text-slate-600">Entita:</span>
                            <span className="truncate">{log.entity_name}</span>
                          </div>
                        )}
                      </td>

                      {/* Detaily tlačidlo */}
                      <td className="py-3.5 px-3 text-right pr-4 sm:pr-5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-950 transition cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginácia */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-5">
            <div className="text-xs text-slate-500">
              Stránka <strong>{page}</strong> z <strong>{totalPages}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => loadLogs(page - 1)}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Predchádzajúca</span>
              </button>
              <button
                type="button"
                onClick={() => loadLogs(page + 1)}
                disabled={page >= totalPages || loading}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <span>Nasledujúca</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal pre podrobný pohľad na vybraný log s Diffom */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Hlavička modalu */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  {getActionBadge(selectedLog.action, selectedLog.category)}
                  <span className="font-mono text-xs text-slate-400">{selectedLog.action}</span>
                </div>
                <h3 className="mt-1.5 text-base sm:text-lg font-bold text-slate-950">
                  {selectedLog.description}
                </h3>
                <div className="mt-1 text-xs text-slate-500">
                  {new Date(selectedLog.created_at).toLocaleString("sk-SK")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Informácie o aktérovi a entite */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Kto akciu vykonal</div>
                <div className="mt-1 font-semibold text-slate-900 text-sm">
                  {selectedLog.actor_name || "Systém"}
                </div>
                {selectedLog.actor_email && (
                  <div className="text-xs text-slate-500">{selectedLog.actor_email}</div>
                )}
                <div className="mt-1.5">
                  {getRoleBadge(selectedLog.actor_role)}
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Dotknutá entita</div>
                <div className="mt-1 font-semibold text-slate-900 text-sm">
                  {selectedLog.entity_name || selectedLog.entity_type}
                </div>
                <div className="text-xs text-slate-500">Typ: {selectedLog.entity_type}</div>
                {selectedLog.entity_id && (
                  <div className="mt-1 font-mono text-[10.5px] text-slate-400 truncate">
                    ID: {selectedLog.entity_id}
                  </div>
                )}
              </div>
            </div>

            {/* Diff (Zmeny pred a po) */}
            {selectedLog.changes && (
              <div className="mt-5">
                <div className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-slate-500" />
                  Zaznamenané zmeny (Diff):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Pred */}
                  <div className="rounded-xl border border-rose-200/60 bg-rose-50/40 p-3">
                    <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wide mb-1.5">
                      Pôvodný stav (Before)
                    </div>
                    <pre className="max-h-60 overflow-auto font-mono text-[11px] text-slate-700 bg-white/80 p-2.5 rounded-lg border border-rose-100">
                      {selectedLog.changes.before
                        ? JSON.stringify(selectedLog.changes.before, null, 2)
                        : "Žiadny pôvodný stav (nový záznam)"}
                    </pre>
                  </div>

                  {/* Po */}
                  <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-3">
                    <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide mb-1.5">
                      Nový stav (After)
                    </div>
                    <pre className="max-h-60 overflow-auto font-mono text-[11px] text-slate-700 bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                      {selectedLog.changes.after
                        ? JSON.stringify(selectedLog.changes.after, null, 2)
                        : "Žiadny nový stav (záznam zmazaný)"}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Metadáta */}
            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div className="mt-5">
                <div className="text-xs font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-slate-500" />
                  Dodatočné metadáta:
                </div>
                <pre className="max-h-48 overflow-auto font-mono text-[11px] text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            )}

            {/* Päta modalu */}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
              >
                Zavrieť detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
