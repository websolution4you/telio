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
  Sparkles,
  Trash2,
  Clock,
  Hourglass,
  Timer,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Bot,
  User,
  FileText,
  ShieldCheck,
  Headphones,
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
  const [sourceLabel, setSourceLabel] = useState<string>("ElevenLabs AI Asistent");
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
        if (result.sourceLabel) {
          setSourceLabel(result.sourceLabel);
        }
        // Automaticky rozbalíme prvý hovor, aby klient hneď videl ukážku alebo necháme na kliknutie
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
  const usedMinutes = planStats?.usedMinutes ?? 70;
  const remainingMinutes = Math.max(0, selectedPlanMinutes - usedMinutes);
  const usedPercentage = Math.min(100, Math.round((usedMinutes / selectedPlanMinutes) * 100));
  const avgCallDurationSec = planStats?.avgCallDurationSec ?? 58;
  const callsPerDay = planStats?.callsPerDay ?? 3.4;
  const callsPerMonth = planStats?.callsPerMonth ?? 72;

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

      {/* Čistá Telio Demo Hlavička (v štýle /dashboard/newbookings) */}
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

            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
              Ukážkový Dashboard
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-slate-900/40 px-3.5 py-2 text-xs font-semibold text-slate-200 backdrop-blur-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden xs:inline">{sourceLabel}</span>
              <span className="xs:hidden">ElevenLabs</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-6 sm:space-y-8">
        {/* Nadpis stránky a prepínač paušálu */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-2">
              <Headphones className="h-3.5 w-3.5 text-emerald-600" />
              Hlasový AI Asistent • Štatistika a Hovory
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Prehľad paušálu a hovorov
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
              Sledovanie spotreby minút v paušále a história vybraných ElevenLabs hovorov s prepisom a nahrávkou.
            </p>
          </div>

          {/* Prepínač veľkosti paušálu pre prezentáciu klientovi */}
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

        {/* SEKCIa 1: PAUŠÁL A KĽÚČOVÉ METRIKY (Hneď na začiatku) */}
        <section className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)] space-y-5">
          {/* Horná lišta čerpania paušálu */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-sm shadow-emerald-200">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-950">
                    Mesačný hlasový paušál ({selectedPlanMinutes} minút)
                  </h2>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                    Aktívny
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Prevolaných <strong className="text-slate-800">{usedMinutes} min</strong> z{" "}
                  <strong className="text-slate-800">{selectedPlanMinutes} min</strong> • Zostáva{" "}
                  <strong className="text-emerald-700">{remainingMinutes} minút</strong> ({100 - usedPercentage} % kapacity)
                </p>
              </div>
            </div>

            {/* Progress bar čerpania paušálu */}
            <div className="w-full sm:w-72 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500">Čerpanie paušálu</span>
                <span className="text-slate-900">{usedPercentage} %</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                  style={{ width: `${Math.max(4, usedPercentage)}%` }}
                />
              </div>
            </div>
          </div>

          {/* 5 Kľúčových kariet paušálu */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* 1. Celkové minúty */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 transition hover:bg-white hover:shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Celkové minúty
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white shadow-2xs">
                  <Clock className="h-4 w-4" />
                </span>
              </div>
              <strong className="block text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
                {selectedPlanMinutes} <span className="text-base font-bold text-slate-500">min</span>
              </strong>
              <p className="mt-1 text-xs text-slate-500">
                Predplatený mesačný paušál
              </p>
            </div>

            {/* 2. Zostáva minút */}
            <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 to-teal-50/40 p-4 transition hover:shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Zostáva minút
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-white shadow-2xs">
                  <Hourglass className="h-4 w-4" />
                </span>
              </div>
              <strong className="block text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-700">
                {remainingMinutes} <span className="text-base font-bold text-emerald-600">min</span>
              </strong>
              <p className="mt-1 text-xs text-emerald-800/80 font-medium">
                Prevolané: <b>{usedMinutes} min</b> ({usedPercentage} %)
              </p>
            </div>

            {/* 3. Čas na hovor priemer */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 transition hover:bg-white hover:shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Čas na hovor priemer
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-2xs">
                  <Timer className="h-4 w-4" />
                </span>
              </div>
              <strong className="block text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
                {formatDurationVerbose(avgCallDurationSec)}
              </strong>
              <p className="mt-1 text-xs text-slate-500">
                Priemerné trvanie vybavenia
              </p>
            </div>

            {/* 4. Počet hovorov / deň */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 transition hover:bg-white hover:shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Počet hovorov / deň
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-600 text-white shadow-2xs">
                  <CalendarClock className="h-4 w-4" />
                </span>
              </div>
              <strong className="block text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
                {callsPerDay.toLocaleString("sk-SK")}
              </strong>
              <p className="mt-1 text-xs text-slate-500">
                Priemerne za aktívny deň
              </p>
            </div>

            {/* 5. Počet hovorov / mesiac */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 transition hover:bg-white hover:shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Počet hovorov / mesiac
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-white shadow-2xs">
                  <CalendarDays className="h-4 w-4" />
                </span>
              </div>
              <strong className="block text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
                {callsPerMonth}
              </strong>
              <p className="mt-1 text-xs text-slate-500">
                Vybavené AI asistentom za mesiac
              </p>
            </div>
          </div>
        </section>

        {/* SEKCIA 2: ELEVENLABS HOVORY (Vybrané hovory s rozbalením výberu z hovoru po kliknutí na riadok) */}
        <section className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
          {/* Hlavička tabuľky hovorov */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-md shadow-indigo-100">
                  <PhoneCall className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-950">
                      Vybrané hovory AI asistenta (ElevenLabs)
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
                    Kliknite na ľubovoľný riadok v tabuľke pre zobrazenie <b>výberu z hovoru</b> (AI zhrnutie, kľúčové údaje a prepis rozhovoru).
                  </p>
                </div>
              </div>
            </div>

            {/* Nástroje: Hľadanie + Obnoviť */}
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Hľadať číslo alebo obsah..."
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
            <div className="grid min-h-[240px] place-items-center">
              <div className="flex flex-col items-center gap-2.5">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <span className="text-xs font-medium text-slate-500">
                  Načítavam vybrané ElevenLabs hovory...
                </span>
              </div>
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="grid min-h-[180px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-sm text-slate-500">
              <div className="max-w-md">
                <PhoneCall className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                <p className="font-semibold text-slate-800">Nenašli sa žiadne vybrané hovory</p>
                <p className="mt-1 text-xs text-slate-500">
                  Skúste upraviť hľadaný výraz alebo obnoviť zoznam.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200/90">
              <table className="w-full min-w-[820px] text-left text-sm border-collapse">
                <thead className="border-b border-slate-200/90 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="w-10 px-3 py-3.5 text-center"></th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Čas hovoru</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Telefónne číslo</th>
                    <th className="px-4 py-3.5">Téma / Výber z hovoru</th>
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
            ? "bg-indigo-50/60 hover:bg-indigo-50/80"
            : isActiveAudio
            ? "bg-indigo-50/30 hover:bg-slate-50/80"
            : "hover:bg-slate-50/80"
        }`}
        title="Kliknite pre zobrazenie výberu z hovoru"
      >
        {/* Šípka rozbalenia */}
        <td className="px-3 py-4 text-center">
          <span
            className={`inline-grid h-7 w-7 place-items-center rounded-xl border transition ${
              isExpanded
                ? "border-indigo-200 bg-indigo-600 text-white shadow-2xs"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        </td>

        {/* Dátum a čas */}
        <td className="px-4 py-4 font-semibold text-slate-900 whitespace-nowrap">
          {formatDate(call.startedAt)}
        </td>

        {/* Telefónne číslo volajúceho */}
        <td className="px-4 py-4 whitespace-nowrap">
          <span className="inline-flex items-center rounded-xl bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-800">
            {call.callerNumber}
          </span>
        </td>

        {/* Zhrnutie hovoru / Náhľad */}
        <td className="px-4 py-4 max-w-[360px]">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 truncate">
                {call.summaryTitle}
              </span>
              <span className="shrink-0 rounded-md bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                {isExpanded ? "Skryť výber" : "Zobraziť výber"}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">
              {call.transcriptSummary}
            </p>
          </div>
        </td>

        {/* Dĺžka */}
        <td className="px-4 py-4 text-center font-mono text-xs font-bold text-slate-700 whitespace-nowrap">
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
                ? "Hovor úspešne vybavený"
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

        {/* Tlačidlo zmazania (neaktívne podľa zadania) */}
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

      {/* Rozbalený detail po kliknutí na riadok: VÝBER Z HOVORU */}
      {isExpanded && (
        <tr className="bg-slate-50/90">
          <td colSpan={8} className="p-0">
            <div className="border-t border-b border-indigo-100 bg-gradient-to-b from-indigo-50/40 via-white to-slate-50/70 px-5 py-6 sm:px-8">
              <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
                {/* Ľavý stĺpec: AI Výber z hovoru + Vyextrahované údaje + Kritériá */}
                <div className="space-y-4">
                  <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-2xs space-y-4">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-100 text-indigo-700">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                            AI Výber z hovoru
                          </span>
                          <h3 className="text-base font-bold text-slate-950">
                            {call.summaryTitle}
                          </h3>
                        </div>
                      </div>

                      {/* Neaktívne tlačidlo zmazania aj v detaile */}
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

                    {/* Zhrnutie hovoru */}
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Zhrnutie konverzácie
                      </p>
                      <p className="text-sm leading-relaxed text-slate-700 bg-slate-50/80 rounded-xl p-3.5 border border-slate-100">
                        {call.transcriptSummary}
                      </p>
                    </div>

                    {/* Vyextrahované údaje z hovoru (ak sú k dispozícii) */}
                    {call.extractedFields.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                          Zachytané údaje z hovoru
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {call.extractedFields.map((field) => (
                            <div
                              key={field.id}
                              className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-2.5"
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

                    {/* Vyhodnotenie kvality hovoru */}
                    {call.evaluationItems.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                          Kontrola kvality vybavenia
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {call.evaluationItems.map((ev) => (
                            <span
                              key={ev.id}
                              title={ev.rationale}
                              className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold ${
                                ev.passed
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                  : "border-amber-200 bg-amber-50 text-amber-800"
                              }`}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              {ev.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Meta info hovoru */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                      <span>
                        Volajúci:{" "}
                        <b className="font-mono text-slate-800">{call.callerNumber}</b>
                      </span>
                      <span>
                        Trvanie:{" "}
                        <b className="text-slate-800">
                          {formatDurationVerbose(call.durationSec)}
                        </b>
                      </span>
                      <span>
                        Asistent: <b className="text-slate-800">{call.agentName}</b>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pravý stĺpec: Prepis rozhovoru (Transcript) */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-700">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-950">
                          Prepis rozhovoru (slovo po slove)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Autentický prepis konverzácie medzi klientom a AI asistentom
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onPlayToggle}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                        isCallPlaying
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                      }`}
                    >
                      {isCallPlaying ? (
                        <>
                          <Pause className="h-3.5 w-3.5 fill-current" />
                          <span>Pozastaviť audio</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Prehrať audio</span>
                        </>
                      )}
                    </button>
                  </div>

                  {call.transcript.length === 0 ? (
                    <div className="grid flex-1 place-items-center py-8 text-center text-xs text-slate-400">
                      Prepis pre tento hovor nie je k dispozícii.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1.5">
                      {call.transcript.map((turn, idx) => {
                        const isAgent = turn.role === "agent";
                        return (
                          <div
                            key={idx}
                            className={`flex items-start gap-2.5 ${
                              isAgent ? "justify-start" : "justify-end"
                            }`}
                          >
                            {isAgent && (
                              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white shadow-2xs">
                                <Bot className="h-3.5 w-3.5" />
                              </span>
                            )}

                            <div
                              className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                                isAgent
                                  ? "rounded-tl-sm bg-slate-100 text-slate-800 border border-slate-200/70"
                                  : "rounded-tr-sm bg-indigo-600 text-white shadow-2xs"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3 mb-0.5">
                                <span
                                  className={`text-[10px] font-bold uppercase tracking-wider ${
                                    isAgent ? "text-indigo-600" : "text-indigo-200"
                                  }`}
                                >
                                  {isAgent ? "AI Asistent" : "Zákazník"}
                                </span>
                                <span
                                  className={`font-mono text-[10px] ${
                                    isAgent ? "text-slate-400" : "text-indigo-200"
                                  }`}
                                >
                                  {formatSeconds(turn.timeInCallSecs)}
                                </span>
                              </div>
                              <p>{turn.message}</p>
                            </div>

                            {!isAgent && (
                              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-slate-200 text-slate-700">
                                <User className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

