"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  fetchDemoCallHistoryAction,
  type DemoCallItem,
  type DemoPlanStats,
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
  Trash2,
  ChevronDown,
  ChevronUp,
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

const formatDurationVerbose = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m === 0) return `${s} s`;
  return `${m}m ${s < 10 ? "0" : ""}${s}s`;
};

const PLAN_PACKAGES = [300, 500, 1000] as const;

export default function ClientDemoDashboard() {
  const [calls, setCalls] = useState<DemoCallItem[]>([]);
  const [planStats, setPlanStats] = useState<DemoPlanStats | null>(null);
  const [selectedPlanMinutes, setSelectedPlanMinutes] = useState<number>(300);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Vyhľadávanie a rozbalený riadok ("výber z hovoru")
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

  // Audio prehrávač
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadCalls = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const result = await fetchDemoCallHistoryAction(300);
      if (result.success && result.calls) {
        setCalls(result.calls);
        if (result.planStats) {
          setPlanStats(result.planStats);
        }
      } else {
        setError(result.error || "Nepodarilo sa načítať vybrané hovory.");
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
  const handlePlayToggle = (call: DemoCallItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!audioRef.current) return;

    if (activeCallId === call.id) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.error("Audio play error:", err);
            setError("Prehrávanie zlyhalo. Skúste znova.");
          });
      }
    } else {
      setActiveCallId(call.id);
      setAudioLoading(true);
      setAudioProgress(0);
      setAudioCurrentTime(0);
      audioRef.current.src = call.audioUrl;
      audioRef.current.load();
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setAudioLoading(false);
        })
        .catch((err) => {
          console.error("Audio switch error:", err);
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
    e.stopPropagation();
    if (!audioRef.current) return;
    const newPercent = parseFloat(e.target.value);
    const newTime = (newPercent / 100) * (audioRef.current.duration || 1);
    audioRef.current.currentTime = newTime;
    setAudioProgress(newPercent);
    setAudioCurrentTime(newTime);
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    audioRef.current.muted = !audioRef.current.muted;
    setIsMuted(audioRef.current.muted);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setAudioProgress(100);
  };

  const toggleRowExpand = (callId: string) => {
    setExpandedCallId((prev) => (prev === callId ? null : callId));
  };

  // Filtrované hovory
  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchNum = c.callerNumber.toLowerCase().includes(query);
        const matchTitle = c.summaryTitle.toLowerCase().includes(query);
        const matchSummary = (c.transcriptSummary || "").toLowerCase().includes(query);
        return matchNum || matchTitle || matchSummary;
      }
      return true;
    });
  }, [calls, searchQuery]);

  // Výpočty pre paušál
  const usedMinutes = planStats?.usedMinutes ?? 40;
  const remainingMinutes = Math.max(0, selectedPlanMinutes - usedMinutes);
  const usedPercentage = Math.min(100, Math.round((usedMinutes / selectedPlanMinutes) * 100));
  const avgCallDurationSec = planStats?.avgCallDurationSec ?? 60;
  const callsPerDay = planStats?.callsPerDay ?? 2.5;
  const callsPerMonth = planStats?.callsPerMonth ?? 40;

  return (
    <div
      className="min-h-screen bg-[#f4f7f5] text-slate-900 font-sans"
      style={{ fontFamily: "var(--font-inter), sans-serif" }}
    >
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

      {/* Čistá Telio Demo Hlavička */}
      <header
        className="relative isolate z-40 border-b border-slate-700/80 shadow-[0_4px_24px_rgba(0,0,0,0.22)] text-white"
        style={{
          background:
            "linear-gradient(180deg, #1C1F24 0%, #333842 35%, #505764 70%, #6E7786 100%)",
        }}
      >
        <div className="mx-auto flex min-h-[66px] max-w-[1440px] items-center justify-between gap-3 px-4 py-2.5 sm:min-h-[76px] sm:px-6 lg:px-8">
          <div className="flex items-center gap-3.5">
            <Link
              href="/"
              className="flex items-center gap-2.5 transition hover:opacity-90"
              title="Telio.sk"
            >
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 font-black text-lg shadow-md shadow-emerald-950/30">
                T
              </div>
              <div>
                <span className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                  telio<span className="text-emerald-400">.sk</span>
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-widest text-slate-300">
                  Klientsky portál
                </span>
              </div>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-6 sm:space-y-8">
        {/* Nadpis stránky a prepínač paušálu */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Prehľad paušálu a hovorov
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
              Sledovanie spotreby minút v paušále a história vybraných ElevenLabs hovorov.
            </p>
          </div>

          {/* Prepínač veľkosti paušálu */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-semibold text-slate-500">Balík paušálu:</span>
            <div className="flex items-center gap-1 rounded-2xl bg-white p-1 border border-slate-200/90 shadow-2xs text-xs font-bold">
              {PLAN_PACKAGES.map((pkg) => (
                <button
                  key={pkg}
                  type="button"
                  onClick={() => setSelectedPlanMinutes(pkg)}
                  className={`cursor-pointer px-3 py-1.5 rounded-xl transition ${
                    selectedPlanMinutes === pkg
                      ? "bg-slate-950 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-950 hover:bg-slate-100"
                  }`}
                >
                  {pkg} min
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SEKCIA 1: PAUŠÁL A KĽÚČOVÉ METRIKY (Jednotný vizuál bez ikon a bez duplicitného popisu) */}
        <section className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)] space-y-5">
          {/* Horná lišta čerpania paušálu */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-950">
              Mesačný hlasový paušál ({selectedPlanMinutes} minút)
            </h2>

            {/* Progress bar čerpania paušálu */}
            <div className="w-full sm:w-72 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500">Čerpanie paušálu</span>
                <span className="text-slate-900">{usedPercentage} %</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/70">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                  style={{ width: `${Math.max(4, usedPercentage)}%` }}
                />
              </div>
            </div>
          </div>

          {/* 5 Kľúčových kariet paušálu – zjednotený čistý dizajn bez ikon */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* 1. Celkové minúty */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Celkové minúty
              </span>
              <strong className="block text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
                {selectedPlanMinutes} <span className="text-base font-bold text-slate-500">min</span>
              </strong>
            </div>

            {/* 2. Zostáva minút */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Zostáva minút
              </span>
              <strong className="block text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
                {remainingMinutes} <span className="text-base font-bold text-slate-500">min</span>
              </strong>
            </div>

            {/* 3. Čas na hovor priemer */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Čas na hovor priemer
              </span>
              <strong className="block text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
                {formatDurationVerbose(avgCallDurationSec)}
              </strong>
            </div>

            {/* 4. Počet hovorov / deň */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Počet hovorov / deň
              </span>
              <strong className="block text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
                {callsPerDay.toLocaleString("sk-SK")}
              </strong>
            </div>

            {/* 5. Počet hovorov / mesiac */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Počet hovorov / mesiac
              </span>
              <strong className="block text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
                {callsPerMonth}
              </strong>
            </div>
          </div>
        </section>

        {/* SEKCIA 2: ELEVENLABS HOVORY */}
        <section className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
          {/* Hlavička tabuľky hovorov */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-950">
                  História hovorov NTC asistenta
                </h2>
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                  {filteredCalls.length}{" "}
                  {filteredCalls.length === 1
                    ? "hovor"
                    : filteredCalls.length >= 2 && filteredCalls.length <= 4
                    ? "hovory"
                    : "hovorov"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kliknite na riadok hovoru pre zobrazenie zhrnutia a údajov z konverzácie.
              </p>
            </div>

            {/* Nástroje: Hľadanie + Obnoviť */}
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Hľadať číslo alebo text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-44 sm:w-56 rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs font-medium text-slate-700 placeholder-slate-400 transition-all focus:border-indigo-300 focus:bg-white focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => loadCalls(true)}
                disabled={refreshing || loading}
                title="Obnoviť hovory"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-95 disabled:opacity-50"
              >
                <RotateCcw
                  className={`h-4 w-4 ${refreshing ? "animate-spin text-indigo-600" : ""}`}
                />
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-500 hover:text-red-700 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Stav načítavania */}
          {loading && !calls.length ? (
            <div className="grid min-h-[220px] place-items-center">
              <div className="flex flex-col items-center gap-2.5">
                <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
                <span className="text-xs font-medium text-slate-500">
                  Načítavam hovory NTC asistenta...
                </span>
              </div>
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="grid min-h-[180px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-sm text-slate-500">
              <div className="max-w-md">
                <PhoneCall className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                <p className="font-semibold text-slate-800">Nenašli sa žiadne hovory</p>
                <p className="mt-1 text-xs text-slate-500">
                  Skúste upraviť hľadaný výraz alebo obnoviť zoznam.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200/90">
              <table className="w-full min-w-[780px] text-left text-sm border-collapse">
                <thead className="border-b border-slate-200/90 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="w-10 px-3 py-3.5 text-center"></th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Čas hovoru</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Telefónne číslo</th>
                    <th className="px-4 py-3.5">Zhrnutie hovoru</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap">Dĺžka</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap">Stav</th>
                    <th className="px-4 py-3.5 text-right whitespace-nowrap">Nahrávka</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap">Akcie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCalls.map((call) => {
                    const isExpanded = expandedCallId === call.id;
                    const isActiveAudio = activeCallId === call.id;
                    const isCallPlaying = isActiveAudio && isPlaying;

                    return (
                      <CallRowWithDetail
                        key={call.id}
                        call={call}
                        isExpanded={isExpanded}
                        isActiveAudio={isActiveAudio}
                        isCallPlaying={isCallPlaying}
                        audioLoading={audioLoading}
                        audioProgress={audioProgress}
                        audioCurrentTime={audioCurrentTime}
                        audioDuration={audioDuration}
                        isMuted={isMuted}
                        onToggleExpand={() => toggleRowExpand(call.id)}
                        onPlayToggle={(e) => handlePlayToggle(call, e)}
                        onSeek={handleSeek}
                        onToggleMute={handleToggleMute}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

interface CallRowProps {
  call: DemoCallItem;
  isExpanded: boolean;
  isActiveAudio: boolean;
  isCallPlaying: boolean;
  audioLoading: boolean;
  audioProgress: number;
  audioCurrentTime: number;
  audioDuration: number;
  isMuted: boolean;
  onToggleExpand: () => void;
  onPlayToggle: (e: React.MouseEvent) => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleMute: (e: React.MouseEvent) => void;
}

function CallRowWithDetail({
  call,
  isExpanded,
  isActiveAudio,
  isCallPlaying,
  audioLoading,
  audioProgress,
  audioCurrentTime,
  audioDuration,
  isMuted,
  onToggleExpand,
  onPlayToggle,
  onSeek,
  onToggleMute,
}: CallRowProps) {
  return (
    <>
      {/* Hlavný klikateľný riadok */}
      <tr
        onClick={onToggleExpand}
        className={`cursor-pointer transition-colors select-none ${
          isExpanded
            ? "bg-slate-100/80"
            : isActiveAudio
            ? "bg-indigo-50/30 hover:bg-slate-50/80"
            : "hover:bg-slate-50/80"
        }`}
        title="Kliknite pre zobrazenie detailu hovoru"
      >
        {/* Šípka rozbalenia */}
        <td className="px-3 py-4 text-center">
          <span className="inline-grid h-7 w-7 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        </td>

        {/* Dátum a čas */}
        <td className="px-4 py-4 font-medium text-slate-900 whitespace-nowrap">
          {formatDate(call.startedAt)}
        </td>

        {/* Telefónne číslo volajúceho */}
        <td className="px-4 py-4 whitespace-nowrap">
          <span className="font-mono text-xs font-semibold text-slate-800">
            {call.callerNumber}
          </span>
        </td>

        {/* Zhrnutie hovoru */}
        <td className="px-4 py-4 max-w-[340px]">
          <span className="font-semibold text-slate-900 truncate block">
            {call.summaryTitle}
          </span>
        </td>

        {/* Dĺžka */}
        <td className="px-4 py-4 text-center font-mono text-xs font-semibold text-slate-600 whitespace-nowrap">
          {formatSeconds(call.durationSec)}
        </td>

        {/* Stav */}
        <td className="px-4 py-4 text-center">
          <span
            className={`inline-grid h-7 w-7 place-items-center rounded-full ${
              call.callSuccessful === "success"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
            title={
              call.callSuccessful === "success"
                ? "Hovor úspešný"
                : "Hovor ukončený"
            }
          >
            {call.callSuccessful === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
          </span>
        </td>

        {/* Prehrávač hovoru */}
        <td
          className="px-4 py-4 text-right whitespace-nowrap"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-end gap-2">
            {isActiveAudio && (
              <div className="flex items-center gap-2 rounded-2xl bg-white border border-indigo-200 px-3 py-1.5 shadow-2xs">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={audioProgress}
                  onChange={onSeek}
                  className="h-1.5 w-20 sm:w-28 cursor-pointer appearance-none rounded-lg bg-indigo-100 accent-indigo-600"
                />
                <span className="font-mono text-[11px] text-slate-600 whitespace-nowrap">
                  {formatSeconds(audioCurrentTime)} /{" "}
                  {formatSeconds(audioDuration || call.durationSec)}
                </span>
                <button
                  type="button"
                  onClick={onToggleMute}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  title={isMuted ? "Zapnúť zvuk" : "Stlmiť"}
                >
                  {isMuted ? (
                    <VolumeX className="h-3.5 w-3.5" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onPlayToggle}
              className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-2xl font-bold shadow-2xs transition-all active:scale-95 ${
                isCallPlaying
                  ? "bg-indigo-600 text-white shadow-indigo-200"
                  : "border border-slate-200 bg-white text-slate-800 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600"
              }`}
              title={
                isCallPlaying ? "Pozastaviť nahrávku" : "Prehrať nahrávku hovoru"
              }
            >
              {isActiveAudio && audioLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              ) : isCallPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current ml-0.5" />
              )}
            </button>
          </div>
        </td>

        {/* Tlačidlo zmazania (neaktívne) */}
        <td
          className="px-4 py-4 text-center whitespace-nowrap"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Mazanie záznamov je v ukážkovom režime neaktívne"
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </td>
      </tr>

      {/* Rozbalený detail po kliknutí na riadok – čistý zjednotený blok */}
      {isExpanded && (
        <tr className="bg-slate-50/60">
          <td colSpan={8} className="px-4 py-4 sm:px-6">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-950">
                  {call.summaryTitle}
                </h3>

                <button
                  type="button"
                  disabled
                  title="Mazanie hovorov nie je v ukážkovom režime povolené"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400 opacity-60 cursor-not-allowed"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Zmazať hovor</span>
                </button>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Zhrnutie konverzácie
                </p>
                <p className="text-sm leading-relaxed text-slate-700 bg-slate-50/80 rounded-xl p-3.5 border border-slate-100">
                  {call.transcriptSummary}
                </p>
              </div>

              {call.extractedFields.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Zachytené údaje z hovoru
                  </p>
                  <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                    {call.extractedFields.map((field) => (
                      <div
                        key={field.id}
                        className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5"
                      >
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {field.label}
                        </span>
                        <strong className="mt-0.5 block text-xs sm:text-sm font-bold text-slate-900">
                          {field.value}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
