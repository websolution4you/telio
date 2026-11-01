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

const SLOVAK_SUMMARIES_BY_ID: Record<string, string> = {
  conv_7101m43bahj5f9xsmhr8pphmaqey:
    "Zákazník si telefonicky rezervoval tenisový kurt v hale na piatok od 17:00 do 18:30. Asistent overil dostupnosť v systéme a úspešne potvrdil rezerváciu kurtu 2.",
  conv_1701m5y8gwqpfza8baj1qknya7cx:
    "Volajúci si rezervoval bedmintonový kurt na sobotu v čase 10:00 – 11:00. Asistent skontroloval voľnú kapacitu v rezervačnom systéme a potvrdil rezerváciu kurtu 3.",
  conv_5401m3s5jh2zfadt513tbk380maa:
    "Volajúci požiadal o presun sobotňajšej rezervácie antukového kurtu z 10:00 na 14:00 kvôli počasiu. Asistent overil obsadenosť antukových dvorcov a úspešne presunul rezerváciu na kurt 1.",
  conv_9001m2qfc9a6fhprnktw4k14rk89:
    "Zákazník požiadal o rezerváciu bedmintonového kurtu. Asistent overil voľné kapacity, potvrdil termín a úspešne vytvoril rezerváciu v systéme.",
};

const getSlovakSummary = (call: DemoCallItem) => {
  if (SLOVAK_SUMMARIES_BY_ID[call.id]) {
    return SLOVAK_SUMMARIES_BY_ID[call.id];
  }
  const text = call.transcriptSummary || "";
  if (/\b(the user|the caller|requested|booking|court|confirmed)\b/i.test(text)) {
    return text
      .replace(/The user requested to book a badminton court/gi, "Používateľ požiadal o rezerváciu bedmintonového kurtu")
      .replace(/The user requested to book a tennis court/gi, "Používateľ požiadal o rezerváciu tenisového kurtu")
      .replace(/The user requested to book a squash court/gi, "Používateľ požiadal o rezerváciu squash kurtu")
      .replace(/for one hour on Sunday, November 1st, at 3 PM/gi, "na jednu hodinu v nedeľu 1. novembra o 15:00")
      .replace(/The agent confirmed availability, suggested court (\d+), and after the user's confirmation, successfully created the booking\./gi, "Asistent overil dostupnosť, navrhol kurt $1 a po potvrdení rezerváciu úspešne vytvoril.")
      .replace(/The call ended with the booking confirmation\./gi, "Hovor bol ukončený potvrdením rezervácie.");
  }
  return text || "Rezervácia športoviska bola úspešne vybavená.";
};

const getSlovakTitle = (call: DemoCallItem) => {
  if (call.id === "conv_7101m43bahj5f9xsmhr8pphmaqey") return "Rezervácia tenisového kurtu (Indoor)";
  if (call.id === "conv_1701m5y8gwqpfza8baj1qknya7cx") return "Rezervácia bedmintonového kurtu";
  if (call.id === "conv_5401m3s5jh2zfadt513tbk380maa") return "Tenisová rezervácia NTC";
  if (call.id === "conv_9001m2qfc9a6fhprnktw4k14rk89") return "Rezervácia bedmintonového kurtu";
  const title = call.summaryTitle || "";
  if (/badminton court booking/i.test(title)) return "Rezervácia bedmintonového kurtu";
  if (/ntc services booking/i.test(title)) return "Rezervácia služieb NTC";
  if (/tennis court booking/i.test(title)) return "Rezervácia tenisového kurtu";
  if (/squash court booking/i.test(title)) return "Rezervácia squash kurtu";
  return title || "Rezervácia kurtu NTC";
};

function TelioLogo() {
  return (
    <svg width="30" height="30" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="7" fill="url(#demo-logo-grad)" />
      <rect x="5" y="12" width="2.5" height="4" rx="1.25" fill="rgba(5,5,8,0.9)" />
      <rect x="9" y="9" width="2.5" height="10" rx="1.25" fill="rgba(5,5,8,0.9)" />
      <rect x="13" y="6" width="2.5" height="16" rx="1.25" fill="rgba(5,5,8,0.9)" />
      <rect x="17" y="9" width="2.5" height="10" rx="1.25" fill="rgba(5,5,8,0.9)" />
      <rect x="21" y="12" width="2.5" height="4" rx="1.25" fill="rgba(5,5,8,0.9)" />
      <defs>
        <linearGradient id="demo-logo-grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00FFD1" />
          <stop offset="1" stopColor="#7B61FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function ClientDemoDashboard() {
  const [calls, setCalls] = useState<DemoCallItem[]>([]);
  const [planStats, setPlanStats] = useState<DemoPlanStats | null>(null);
  const selectedPlanMinutes = 300;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Rozbalený riadok ("výber z hovoru")
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

  const filteredCalls = calls;

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

      {/* Originálna Telio Hlavička z homepage */}
      <header
        className="relative isolate z-40 border-b border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.3)] text-white"
        style={{
          background: "rgba(5,5,8,0.95)",
        }}
      >
        <div className="mx-auto flex min-h-[64px] max-w-[1440px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 group flex-shrink-0 transition hover:opacity-90"
            title="TELIO"
          >
            <TelioLogo />
            <span
              className="text-xl font-bold text-white tracking-tight"
              style={{ letterSpacing: "-0.02em" }}
            >
              TELIO
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-6 sm:space-y-8">
        {/* Nadpis stránky */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Prehľad paušálu a hovorov
          </h1>
        </div>

        {/* SEKCIA 1: PAUŠÁL A KĽÚČOVÉ METRIKY */}
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

          {/* 5 Kľúčových kariet paušálu */}
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
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-950">
              História hovorov NTC asistenta
            </h2>

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
              <table className="w-full min-w-[680px] text-left text-sm border-collapse">
                <thead className="border-b border-slate-200/90 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="w-10 px-3 py-3.5 text-center"></th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Čas hovoru</th>
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

        {/* SEKCIA 3: JEDNODUCHÁ ANALYTIKA HOVOROV */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Kedy klienti volajú (3 bary pod sebou) */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)] space-y-5">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-950">
                Kedy zákazníci volajú
              </h3>
            </div>

            <div className="space-y-4 pt-1">
              {/* Doobeda */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Doobeda (08:00 – 12:00)</span>
                  <span className="font-bold text-slate-900">
                    45 % <span className="font-normal text-slate-400 font-mono">(18 hovorov)</span>
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/60">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                    style={{ width: "45%" }}
                  />
                </div>
              </div>

              {/* Poobede */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Poobede (12:00 – 17:00)</span>
                  <span className="font-bold text-slate-900">
                    35 % <span className="font-normal text-slate-400 font-mono">(14 hovorov)</span>
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/60">
                  <div
                    className="h-full rounded-full bg-cyan-600 transition-all duration-500"
                    style={{ width: "35%" }}
                  />
                </div>
              </div>

              {/* Mimo pracovnej doby */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Mimo prac. doby (večer & ráno)</span>
                  <span className="font-bold text-slate-900">
                    20 % <span className="font-normal text-slate-400 font-mono">(8 hovorov)</span>
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/60">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: "20%" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Úspešnosť zberu údajov (7 kľúčových parametrov) */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)] space-y-5">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-950">
                Úspešnosť zberu údajov z hovoru
              </h3>
            </div>

            {/* Hlavné KPI */}
            <div className="border-b border-slate-100 pb-3">
              <strong className="text-3xl font-extrabold tracking-tight text-slate-950">
                96 %
              </strong>
            </div>

            {/* Zoznam 7 parametrov s jemne sivou výplňou */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { label: "1. Meno zákazníka", pct: 100 },
                { label: "2. Šport / Služba", pct: 100 },
                { label: "3. Dátum a čas", pct: 100 },
                { label: "4. Kurt / Športovisko", pct: 98 },
                { label: "5. Počet hráčov", pct: 95 },
                { label: "6. Požičanie výstroja", pct: 92 },
                { label: "7. Doplňujúca poznámka", pct: 88 },
              ].map((item) => (
                <div
                  key={item.label}
                  className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-2.5"
                >
                  {/* Celá dlaždica vyplnená sivou podľa percent */}
                  <div
                    className="absolute inset-y-0 left-0 bg-slate-200/90 transition-all duration-500 pointer-events-none"
                    style={{ width: `${item.pct}%` }}
                  />
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-slate-700 font-medium">{item.label}</span>
                    <span className="font-bold text-slate-900">{item.pct} %</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
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

        {/* Zhrnutie hovoru */}
        <td className="px-4 py-4 max-w-[420px]">
          <span className="font-semibold text-slate-900 truncate block">
            {getSlovakTitle(call)}
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

      {/* Rozbalený detail po kliknutí na riadok – spojené riadky pod sebou bez zbytočných nadpisov */}
      {isExpanded && (
        <tr className="bg-slate-50/60">
          <td colSpan={7} className="px-4 py-4 sm:px-6">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
              {/* Horná lišta detailu: len neaktívne tlačidlo zmazania bez duplikovaného nadpisu */}
              <div className="flex items-center justify-end">
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

              {/* Zhrnutie konverzácie */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Zhrnutie konverzácie
                </p>
                <p className="text-sm leading-relaxed text-slate-700 bg-slate-50/80 rounded-xl p-3.5 border border-slate-100">
                  {getSlovakSummary(call)}
                </p>
              </div>

              {/* Údaje spojené do jednej dlaždice v riadkoch pod sebou (kurt, termín, šport, zákazník) */}
              {call.extractedFields.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Zachytené údaje z hovoru
                  </p>
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-1 divide-y divide-slate-200/60">
                    {call.extractedFields.map((field) => (
                      <div
                        key={field.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 gap-1 sm:gap-4 text-xs sm:text-sm"
                      >
                        <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px] sm:text-xs">
                          {field.label}
                        </span>
                        <span className="font-bold text-slate-900">
                          {field.value}
                        </span>
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
