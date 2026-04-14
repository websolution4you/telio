import { supabaseAdmin } from "@/lib/supabase-server";
import { Bot, MessageSquare, AlertTriangle, TrendingUp, Layout, Globe, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

const s = {
  page: { minHeight: "100vh", backgroundColor: "#f4f4f5", padding: "2.5rem", fontFamily: "sans-serif", color: "#18181b" } as React.CSSProperties,
  inner: { maxWidth: "1200px", margin: "0 auto" } as React.CSSProperties,
  title: { fontSize: "1.875rem", fontWeight: 800, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" } as React.CSSProperties,
  subtitle: { color: "#71717a", fontSize: "0.95rem", marginBottom: "2.5rem" } as React.CSSProperties,
  grid4: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.25rem", marginBottom: "2.5rem" } as React.CSSProperties,
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2.5rem" } as React.CSSProperties,
  card: { backgroundColor: "#fff", borderRadius: "1rem", border: "1px solid #e4e4e7", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" } as React.CSSProperties,
  cardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" } as React.CSSProperties,
  cardLabel: { fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#71717a" } as React.CSSProperties,
  cardValue: { fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.02em" } as React.CSSProperties,
  sectionTitle: { fontSize: "0.95rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" } as React.CSSProperties,
  sectionHeader: { padding: "1rem 1.5rem", borderBottom: "1px solid #f0f0f1", display: "flex", alignItems: "center", justifyContent: "space-between" } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.875rem" } as React.CSSProperties,
  th: { padding: "0.75rem 1.5rem", textAlign: "left" as const, fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "#71717a", backgroundColor: "#fafafa", borderBottom: "1px solid #f0f0f1" } as React.CSSProperties,
  td: { padding: "0.85rem 1.5rem", borderBottom: "1px solid #f4f4f5" } as React.CSSProperties,
  badge: { fontSize: "0.65rem", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: "0.4rem", backgroundColor: "#f4f4f5", color: "#52525b" } as React.CSSProperties,
  section: { backgroundColor: "#fff", borderRadius: "1rem", border: "1px solid #e4e4e7", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: "2.5rem", overflow: "hidden" } as React.CSSProperties,
  inquiryItem: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", padding: "0.65rem 0.85rem", backgroundColor: "#fafafa", borderRadius: "0.6rem", marginBottom: "0.5rem" } as React.CSSProperties,
  inquiryText: { fontSize: "0.85rem", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, color: "#3f3f46" } as React.CSSProperties,
  inquiryCount: { fontSize: "0.65rem", fontWeight: 700, backgroundColor: "#fff", border: "1px solid #e4e4e7", padding: "0.15rem 0.45rem", borderRadius: "0.35rem", whiteSpace: "nowrap" as const } as React.CSSProperties,
};

export default async function ChatbotInsightsPage({
  searchParams,
}: {
  searchParams: { hide_unknown?: string };
}) {
  if (!supabaseAdmin) {
    return (
      <div style={{ padding: "2.5rem", color: "#ef4444", backgroundColor: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "0.75rem", margin: "2.5rem" }}>
        Error: Supabase Admin client not initialized. Check your environment variables.
      </div>
    );
  }

  const hideUnknown = searchParams.hide_unknown === "true";

  const { data: latestLogs, error: logsError } = await supabaseAdmin
    .from("chatbot_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: allStats, error: statsError } = await supabaseAdmin
    .from("chatbot_logs")
    .select("is_fallback, session_id, intent, user_message, page_url");

  if (logsError || statsError) {
    return (
      <div style={{ padding: "2.5rem", color: "#ef4444" }}>
        Error: {logsError?.message || statsError?.message}
      </div>
    );
  }

  const logs = allStats || [];
  const totalMessages = logs.length;
  const totalSessions = new Set(logs.map(l => l.session_id)).size;
  const fallbackCount = logs.filter(l => l.is_fallback).length;
  const fallbackRate = totalMessages > 0 ? ((fallbackCount / totalMessages) * 100).toFixed(1) : "0.0";

  // Aggregate Data for Intents
  const intentCounts: Record<string, number> = {};
  const intentFallbacks: Record<string, number> = {};
  
  logs.forEach(l => {
    // Skip unknown if hidden
    if (hideUnknown && l.intent === "nezname") return;
    
    intentCounts[l.intent] = (intentCounts[l.intent] || 0) + 1;
    if (l.is_fallback) intentFallbacks[l.intent] = (intentFallbacks[l.intent] || 0) + 1;
  });

  const displayLogs = hideUnknown ? logs.filter(l => l.intent !== "nezname") : logs;
  const displayTotal = displayLogs.length;
  const topIntent = Object.entries(intentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

  const questionCounts: Record<string, number> = {};
  logs.forEach(l => {
    const norm = l.user_message.toLowerCase().trim();
    questionCounts[norm] = (questionCounts[norm] || 0) + 1;
  });
  const topQuestions = Object.entries(questionCounts).sort((a, b) => b[1] - a[1]).slice(0, 20);

  const pageStats: Record<string, { count: number, sessions: Set<string> }> = {};
  logs.forEach(l => {
    if (!pageStats[l.page_url]) pageStats[l.page_url] = { count: 0, sessions: new Set() };
    pageStats[l.page_url].count++;
    pageStats[l.page_url].sessions.add(l.session_id);
  });
  const sortedPages = Object.entries(pageStats).sort((a, b) => b[1].count - a[1].count).slice(0, 10);
  const fallbackLogs = latestLogs?.filter(l => l.is_fallback).slice(0, 30) || [];

  return (
    <div style={s.page}>
      <div style={s.inner}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2.5rem" }}>
          <div>
            <h1 style={s.title}>
              <Bot size={30} color="#3b82f6" />
              Chatbot Prehľad
            </h1>
            <p style={s.subtitle}>Interný prehľad využívania a výkonnosti Telio chatbota.</p>
          </div>
          
          <div style={{ display: "flex", gap: "1rem" }}>
             <a 
               href={hideUnknown ? "/internal/chatbot" : "/internal/chatbot?hide_unknown=true"}
               style={{ 
                 fontSize: "0.75rem", 
                 fontWeight: 600, 
                 padding: "0.5rem 1rem", 
                 borderRadius: "0.5rem", 
                 backgroundColor: hideUnknown ? "#3b82f6" : "#fff", 
                 color: hideUnknown ? "#fff" : "#3b82f6",
                 border: "1px solid #3b82f6",
                 textDecoration: "none",
                 transition: "all 0.2s"
               }}
             >
               {hideUnknown ? "✓ Skryté 'nezname'" : "Skryť 'nezname'"}
             </a>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={s.grid4}>
          {[
            { label: "Celkom správ", value: totalMessages, color: "#3b82f6", icon: <MessageSquare size={18} /> },
            { label: "Unikátne sedenia", value: totalSessions, color: "#22c55e", icon: <TrendingUp size={18} /> },
            { label: "Miera fallbackov", value: `${fallbackRate}%`, color: "#f97316", icon: <AlertTriangle size={18} />, tooltip: "Bezpečnostný mechanizmus: % správ, ktoré musela prevziať predpripravená odpoveď pri chybe alebo neistote modelu." },
            { label: "Najčastejší zámer", value: topIntent, color: "#a855f7", icon: <Layout size={18} /> },
          ].map(({ label, value, color, icon, tooltip }) => (
            <div key={label} style={s.card} title={tooltip}>
              <div style={s.cardHeader}>
                <span style={s.cardLabel}>{label}</span>
                <span style={{ color }}>{icon}</span>
              </div>
              <div style={{ ...s.cardValue, fontSize: typeof value === "string" && value.length > 8 ? "1.2rem" : "2rem" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Top Intents + Common Inquiries */}
        <div style={s.grid2}>
          {/* Intents Table */}
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <span style={s.sectionTitle}>
                <TrendingUp size={16} color="#3b82f6" /> 
                Najčastejšie zámery {hideUnknown && <span style={{ color: "#71717a", fontWeight: 400 }}>(bez 'nezname')</span>}
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["Zámer", "Počet", "%", "Fallback %"].map(h => <th key={h} style={s.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(intentCounts).sort((a, b) => b[1] - a[1]).map(([intent, count]) => {
                    const pct = ((count / displayTotal) * 100).toFixed(1);
                    const fbRatio = ((intentFallbacks[intent] || 0) / count * 100).toFixed(1);
                    return (
                      <tr key={intent} style={{ borderBottom: "1px solid #f4f4f5" }}>
                        <td style={{ ...s.td, fontWeight: 600, textTransform: "capitalize" }}>{intent}</td>
                        <td style={s.td}>{count}</td>
                        <td style={{ ...s.td, color: "#71717a" }}>{pct}%</td>
                        <td style={{ ...s.td, fontWeight: 700, color: Number(fbRatio) > 40 ? "#f97316" : "#71717a" }}>{fbRatio}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Common Inquiries */}
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <span style={s.sectionTitle}><MessageSquare size={16} color="#3b82f6" /> Časté otázky</span>
            </div>
            <div style={{ padding: "1rem 1.25rem", maxHeight: "380px", overflowY: "auto" }}>
              {topQuestions.map(([q, count]) => (
                <div key={q} style={s.inquiryItem}>
                  <span style={s.inquiryText}>"{q}"</span>
                  <span style={s.inquiryCount}>{count}×</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Pages */}
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <span style={s.sectionTitle}><Globe size={16} color="#3b82f6" /> Najaktívnejšie stránky</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>URL stránky</th>
                  <th style={{ ...s.th, textAlign: "right" }}>Správy</th>
                  <th style={{ ...s.th, textAlign: "right" }}>Unikátne sedenia</th>
                </tr>
              </thead>
              <tbody>
                {sortedPages.map(([url, stats]) => (
                  <tr key={url}>
                    <td style={{ ...s.td, fontFamily: "monospace", fontSize: "0.78rem", color: "#52525b" }}>{url}</td>
                    <td style={{ ...s.td, textAlign: "right", fontWeight: 700 }}>{stats.count}</td>
                    <td style={{ ...s.td, textAlign: "right", color: "#71717a" }}>{stats.sessions.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Latest Fallbacks */}
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <span style={s.sectionTitle}><AlertTriangle size={16} color="#f97316" /> Posledné fallbacky</span>
            <span style={{ fontSize: "0.7rem", color: "#a1a1aa" }}>Posledných 30</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Čas", "Otázka používateľa", "Odpoveď asistenta", "Zámer", "Zdroj"].map(h => <th key={h} style={s.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {fallbackLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ ...s.td, whiteSpace: "nowrap", color: "#a1a1aa", fontSize: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <Clock size={10} />
                        {new Date(log.created_at).toLocaleString("sk-SK", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>
                    <td style={{ ...s.td, fontWeight: 600, maxWidth: "200px" }}>"{log.user_message}"</td>
                    <td style={{ ...s.td, fontStyle: "italic", maxWidth: "280px", color: "#52525b" }}>
                      <span title={log.assistant_reply} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {log.assistant_reply}
                      </span>
                    </td>
                    <td style={{ ...s.td, textTransform: "capitalize" }}>{log.intent}</td>
                    <td style={{ ...s.td, fontFamily: "monospace", fontSize: "0.7rem", color: "#a1a1aa" }}>{log.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
