"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { 
  fetchDashboardCallHistoryAction, 
  type DashboardCallItem 
} from "@/app/actions/calls";
import { 
  PhoneCall, 
  Play, 
  Pause, 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Volume2, 
  VolumeX, 
  Info, 
  Sparkles,
  AlertCircle
} from "lucide-react";

const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("sk-SK", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const formatSeconds = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

export default function AdminCallHistory() {
  const [calls, setCalls] = useState<DashboardCallItem[]>([]);
  const [configuredAgentId, setConfiguredAgentId] = useState<string>("");
  const [hasNtcKey, setHasNtcKey] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Vyhľadávanie
  const [searchQuery, setSearchQuery] = useState("");

  // Audio Prehrávač
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0); // 0 až 100
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeSummaryModal, setActiveSummaryModal] = useState<DashboardCallItem | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadCalls = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const result = await fetchDashboardCallHistoryAction(50);
      if (result.success && result.calls) {
        setCalls(result.calls);
        setConfiguredAgentId(result.configuredAgentId || "");
        setHasNtcKey(Boolean(result.hasNtcKey));
      } else {
        setConfiguredAgentId(result.configuredAgentId || "");
        setError(result.error || "Nepodarilo sa načítať históriu hovorov.");
      }
    } catch (err: any) {
      setError(err.message || "Chyba pri načítaní hovorov.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  // Ovládanie audia
  const handlePlayToggle = (call: DashboardCallItem) => {
    if (!audioRef.current) return;

    if (activeCallId === call.id) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => {
          console.error("Audio play error:", e);
          setError("Prehrávanie zlyhalo. Skúste znova.");
        });
      }
    } else {
      // Zmena hovoru
      setActiveCallId(call.id);
      setAudioLoading(true);
      setAudioProgress(0);
      setAudioCurrentTime(0);
      audioRef.current.src = call.audioUrl;
      audioRef.current.load();
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setAudioLoading(false);
      }).catch((e) => {
        console.error("Audio switch error:", e);
        setAudioLoading(false);
        setError("Audio nahrávku sa nepodarilo načítať.");
      });
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration || 1;
    setAudioCurrentTime(cur);
    setAudioDuration(dur);
    setAudioProgress((cur / dur) * 100);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newPercent = parseFloat(e.target.value);
    const newTime = (newPercent / 100) * (audioRef.current.duration || 1);
    audioRef.current.currentTime = newTime;
    setAudioProgress(newPercent);
    setAudioCurrentTime(newTime);
  };

  const handleToggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !audioRef.current.muted;
    setIsMuted(audioRef.current.muted);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setAudioProgress(100);
  };

  // Filtrované hovory
  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchNum = c.callerNumber.toLowerCase().includes(query);
        const matchName = (c.callerName || "").toLowerCase().includes(query);
        const matchTitle = c.summaryTitle.toLowerCase().includes(query);
        return matchNum || matchName || matchTitle;
      }
      return true;
    });
  }, [calls, searchQuery]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md">
      {/* Skrytý audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleAudioEnded}
        onError={() => {
          setAudioLoading(false);
          setIsPlaying(false);
          setError("Chyba pri prehrávaní audio nahrávky.");
        }}
        preload="none"
      />

      {/* Hlavička sekcie */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-md shadow-indigo-100">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">História hovorov NTC asistenta</h2>
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                  {filteredCalls.length} {filteredCalls.length === 1 ? "hovor" : filteredCalls.length >= 2 && filteredCalls.length <= 4 ? "hovory" : "hovorov"}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center flex-wrap gap-1.5 mt-0.5">
                <span>Záznamy hovorov hlasového asistenta NTC s možnosťou priameho vypočutia a zhrnutia.</span>
                {configuredAgentId && (
                  <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full font-semibold">
                    Agent: {configuredAgentId}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Nástroje: Hľadanie + Refresh */}
        <div className="flex items-center gap-2">
          {/* Vyhľadávanie */}
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Hľadať volajúceho..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-40 rounded-2xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs font-medium text-slate-700 placeholder-slate-400 transition-all focus:w-52 focus:border-indigo-300 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Tlačidlo Obnoviť */}
          <button
            onClick={() => loadCalls(true)}
            disabled={refreshing || loading}
            title="Obnoviť hovory NTC"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-95 disabled:opacity-50"
          >
            <RotateCcw className={`h-4 w-4 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Načítavanie */}
      {loading && !calls.length ? (
        <div className="grid min-h-[200px] place-items-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            <span className="text-xs text-slate-500">Načítavam hovory NTC asistenta...</span>
          </div>
        </div>
      ) : filteredCalls.length === 0 ? (
        <div className="grid min-h-[170px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-sm text-slate-500">
          <div className="max-w-md">
            <PhoneCall className="mx-auto mb-2 h-7 w-7 text-slate-300" />
            <p className="font-semibold text-slate-800">Zatiaľ žiadne hovory pre NTC asistenta</p>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              {configuredAgentId ? (
                <>Pre agenta <code className="font-mono font-bold text-indigo-600">{configuredAgentId}</code> neboli nájdené žiadne hovory.</>
              ) : (
                <>V premenných nie je nastavené <code className="font-mono text-indigo-600 font-semibold">ELEVENLABS_NTC_AGENT_ID</code>.</>
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                <th className="pb-3 pl-2">Čas hovoru</th>
                <th className="pb-3">Volajúci zákazník</th>
                <th className="pb-3">Zhrnutie hovoru</th>
                <th className="pb-3 text-center">Dĺžka</th>
                <th className="pb-3 text-center">Stav</th>
                <th className="pb-3 pr-2 text-right">Nahrávka</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCalls.map((call) => {
                const isActive = activeCallId === call.id;
                const isCallPlaying = isActive && isPlaying;

                return (
                  <tr
                    key={call.id}
                    className={`transition-colors ${
                      isActive ? "bg-indigo-50/40" : "hover:bg-slate-50/70"
                    }`}
                  >
                    {/* Dátum a čas */}
                    <td className="py-3.5 pl-2 font-medium text-slate-900 whitespace-nowrap">
                      {formatDate(call.startedAt)}
                    </td>

                    {/* Volajúci (Meno + Číslo) */}
                    <td className="py-3.5">
                      {call.callerName ? (
                        <div>
                          <b className="block text-sm font-semibold text-slate-900">
                            {call.callerName}
                          </b>
                          <span className="font-mono text-xs text-slate-500">
                            {call.callerNumber}
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono text-xs font-medium text-slate-700">
                          {call.callerNumber}
                        </span>
                      )}
                    </td>

                    {/* Zhrnutie hovoru */}
                    <td className="py-3.5 max-w-[280px]">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium text-slate-800" title={call.summaryTitle}>
                          {call.summaryTitle}
                        </span>
                        {call.transcriptSummary && (
                          <button
                            onClick={() => setActiveSummaryModal(call)}
                            className="text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                            title="Zobraziť detailné zhrnutie"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Dĺžka */}
                    <td className="py-3.5 text-center text-xs font-semibold text-slate-600 whitespace-nowrap">
                      {formatSeconds(call.durationSec)}
                    </td>

                    {/* Stav */}
                    <td className="py-3.5 text-center">
                      <span
                        className={`inline-grid h-7 w-7 place-items-center rounded-full ${
                          call.callSuccessful === "success"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                        title={call.callSuccessful === "success" ? "Hovor úspešný" : "Hovor ukončený"}
                      >
                        {call.callSuccessful === "success" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                      </span>
                    </td>

                    {/* Prehrávač hovoru */}
                    <td className="py-3.5 pr-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isActive && (
                          <div className="flex items-center gap-2 rounded-2xl bg-white border border-indigo-200 px-3 py-1.5 shadow-sm">
                            {/* Scrubber / Progress bar */}
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={audioProgress}
                              onChange={handleSeek}
                              className="h-1.5 w-24 cursor-pointer appearance-none rounded-lg bg-indigo-100 accent-indigo-600 sm:w-32"
                            />
                            {/* Čas prehrávania */}
                            <span className="font-mono text-[11px] text-slate-600 whitespace-nowrap">
                              {formatSeconds(audioCurrentTime)} / {formatSeconds(audioDuration || call.durationSec)}
                            </span>
                            {/* Mute */}
                            <button
                              onClick={handleToggleMute}
                              className="text-slate-400 hover:text-slate-700"
                              title={isMuted ? "Zapnúť zvuk" : "Stlmiť"}
                            >
                              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        )}

                        {/* Play / Pause tlačidlo */}
                        <button
                          onClick={() => handlePlayToggle(call)}
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl font-bold shadow-sm transition-all active:scale-95 ${
                            isCallPlaying
                              ? "bg-indigo-600 text-white shadow-indigo-200"
                              : "border border-slate-200 bg-white text-slate-800 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600"
                          }`}
                          title={isCallPlaying ? "Pozastaviť nahrávku" : "Prehrať nahrávku hovoru"}
                        >
                          {isActive && audioLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                          ) : isCallPlaying ? (
                            <Pause className="h-4 w-4 fill-current" />
                          ) : (
                            <Play className="h-4 w-4 fill-current ml-0.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modálne okno so zhrnutím hovoru */}
      {activeSummaryModal && (
        <div className="fixed inset-0 z-[120] grid place-items-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            onClick={() => setActiveSummaryModal(null)}
          />
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-100 text-indigo-700">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {activeSummaryModal.summaryTitle}
                  </h3>
                  <p className="text-xs text-slate-500">
                    NTC Asistent • {formatDate(activeSummaryModal.startedAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSummaryModal(null)}
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Zhrnutie konverzácie
              </p>
              <p className="text-sm leading-relaxed text-slate-700">
                {activeSummaryModal.transcriptSummary || activeSummaryModal.summaryTitle}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Volajúci: <b className="text-slate-800">{activeSummaryModal.callerName || activeSummaryModal.callerNumber}</b></span>
              <span>Trvanie: <b className="text-slate-800">{formatSeconds(activeSummaryModal.durationSec)}</b></span>
            </div>

            <button
              onClick={() => setActiveSummaryModal(null)}
              className="w-full rounded-2xl bg-slate-950 py-2.5 text-sm font-bold text-white shadow-md hover:bg-slate-800"
            >
              Zavrieť
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
