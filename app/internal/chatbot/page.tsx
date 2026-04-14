import { supabaseAdmin } from "@/lib/supabase-server";
import { Bot, MessageSquare, AlertTriangle, TrendingUp, Layout, Globe, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ChatbotInsightsPage() {
  if (!supabaseAdmin) {
    return (
      <div className="p-10 text-red-500 bg-red-50 rounded-xl m-10 border border-red-200">
        Error: Supabase Admin client not initialized. Check your environment variables.
      </div>
    );
  }

  // 1. Fetch Latest Logs (for Fallbacks and General context)
  const { data: latestLogs, error: logsError } = await supabaseAdmin
    .from("chatbot_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  // 2. Aggregate Data for KPIs
  const { data: allStats, error: statsError } = await supabaseAdmin
    .from("chatbot_logs")
    .select("is_fallback, session_id, intent, user_message, page_url");

  if (logsError || statsError) {
    return (
      <div className="p-10 text-red-500 bg-red-50 rounded-xl m-10 border border-red-200">
        Error loading insights: {logsError?.message || statsError?.message}
      </div>
    );
  }

  const logs = allStats || [];
  const totalMessages = logs.length;
  const totalSessions = new Set(logs.map(l => l.session_id)).size;
  const fallbackCount = logs.filter(l => l.is_fallback).length;
  const fallbackRate = totalMessages > 0 ? ((fallbackCount / totalMessages) * 100).toFixed(1) : 0;

  // Top Intent
  const intentCounts: Record<string, number> = {};
  const intentFallbacks: Record<string, number> = {};
  logs.forEach(l => {
    intentCounts[l.intent] = (intentCounts[l.intent] || 0) + 1;
    if (l.is_fallback) intentFallbacks[l.intent] = (intentFallbacks[l.intent] || 0) + 1;
  });
  const topIntent = Object.entries(intentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

  // Top Questions (Normalized)
  const questionCounts: Record<string, number> = {};
  logs.forEach(l => {
    const norm = l.user_message.toLowerCase().trim();
    questionCounts[norm] = (questionCounts[norm] || 0) + 1;
  });
  const topQuestions = Object.entries(questionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  // Top Pages
  const pageStats: Record<string, { count: number, sessions: Set<string> }> = {};
  logs.forEach(l => {
    if (!pageStats[l.page_url]) pageStats[l.page_url] = { count: 0, sessions: new Set() };
    pageStats[l.page_url].count++;
    pageStats[l.page_url].sessions.add(l.session_id);
  });
  const sortedPages = Object.entries(pageStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 sm:p-10 font-sans text-zinc-900 dark:text-zinc-100">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Bot className="text-blue-500" size={32} />
            Chatbot Insights
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">
            Internal overview of Telio chatbot usage and performance.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Messages" value={totalMessages} icon={<MessageSquare className="text-blue-500" />} />
          <StatCard title="Total Sessions" value={totalSessions} icon={<TrendingUp className="text-green-500" />} />
          <StatCard title="Fallback Rate" value={`${fallbackRate}%`} icon={<AlertTriangle className="text-orange-500" />} />
          <StatCard title="Top Intent" value={topIntent} icon={<Layout className="text-purple-500" />} />
        </div>

        {/* Grid for Intent and Questions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Top Intents Table */}
          <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-500" />
              <h2 className="font-bold">Top Intents</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Intent</th>
                    <th className="px-6 py-3 font-semibold">Count</th>
                    <th className="px-6 py-3 font-semibold">%</th>
                    <th className="px-6 py-3 font-semibold">Fallback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {Object.entries(intentCounts).sort((a,b) => b[1]-a[1]).map(([intent, count]) => {
                    const pct = ((count / totalMessages) * 100).toFixed(1);
                    const fbRatio = ((intentFallbacks[intent] || 0) / count * 100).toFixed(1);
                    return (
                      <tr key={intent} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                        <td className="px-6 py-4 font-medium capitalize">{intent}</td>
                        <td className="px-6 py-4">{count}</td>
                        <td className="px-6 py-4 text-zinc-500">{pct}%</td>
                        <td className={`px-6 py-4 font-semibold ${Number(fbRatio) > 40 ? "text-orange-500" : "text-zinc-500"}`}>
                          {fbRatio}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Top Questions List */}
          <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm flex flex-col">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
              <MessageSquare size={18} className="text-blue-500" />
              <h2 className="font-bold">Common Inquiries</h2>
            </div>
            <div className="p-6 space-y-3 flex-1 overflow-y-auto max-h-[400px]">
              {topQuestions.map(([q, count]) => (
                <div key={q} className="flex items-center justify-between gap-4 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl group hover:bg-zinc-100 transition-colors">
                  <span className="text-sm italic truncate">"{q}"</span>
                  <span className="text-[10px] font-bold bg-white dark:bg-zinc-700 px-2 py-1 rounded-md shadow-sm border border-zinc-100 dark:border-zinc-600">
                    {count}x
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Top Pages Section */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
            <Globe size={18} className="text-blue-500" />
            <h2 className="font-bold">Top Pages</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Page URL</th>
                  <th className="px-6 py-3 font-semibold text-right">Messages</th>
                  <th className="px-6 py-3 font-semibold text-right">Unique Sessions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {sortedPages.map(([url, stats]) => (
                  <tr key={url} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="px-6 py-4 font-mono text-xs opacity-80 max-w-xs truncate">{url}</td>
                    <td className="px-6 py-4 text-right font-bold">{stats.count}</td>
                    <td className="px-6 py-4 text-right text-zinc-500">{stats.sessions.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Latest Fallbacks Section */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-orange-500" />
              <h2 className="font-bold">Latest Fallbacks</h2>
            </div>
            <span className="text-[10px] text-zinc-400">Latest 30</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">User Message</th>
                  <th className="px-6 py-3">Assistant Reply</th>
                  <th className="px-6 py-3">Intent</th>
                  <th className="px-6 py-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-600 dark:text-zinc-400">
                {latestLogs?.filter(l => l.is_fallback).slice(0, 30).map((log) => (
                  <tr key={log.id} className="hover:bg-orange-50/30 dark:hover:bg-orange-900/5">
                    <td className="px-6 py-4 whitespace-nowrap opacity-60">
                      <div className="flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(log.created_at).toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-200">"{log.user_message}"</td>
                    <td className="px-6 py-4 italic max-w-sm">
                      <p className="truncate" title={log.assistant_reply}>{log.assistant_reply}</p>
                    </td>
                    <td className="px-6 py-4 capitalize">{log.intent}</td>
                    <td className="px-6 py-4 text-[10px] font-mono opacity-50">{log.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
      <div className="flex items-center justify-between text-zinc-400">
        <span className="text-xs font-bold uppercase tracking-widest">{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-black tracking-tight">{value}</div>
    </div>
  );
}
