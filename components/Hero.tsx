"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import DemoCallButton from "@/components/DemoCallButton";
import { Headset, Pizza, ChevronDown, Calendar } from "lucide-react";

function ToothIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7 3C5.5 3 4.5 4.5 4.5 6C4.5 8.5 6 9.5 6 12C6 15 4 19 4 20C4 21 5 21.5 6 21C7.5 20.25 8.5 19 10 19C11.5 19 12 20 12 20C12 20 12.5 19 14 19C15.5 19 16.5 20.25 18 21C19 21.5 20 21 20 20C20 19 18 15 18 12C18 9.5 19.5 8.5 19.5 6C19.5 4.5 18.5 3 17 3C14 3 13 5.5 12 5.5C11 5.5 10 3 7 3Z" />
    </svg>
  );
}

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [activeEvent, setActiveEvent] = useState(0);
  const [visible, setVisible] = useState(false);
  const [selectedCase, setSelectedCase] = useState("taxi");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { lang, t } = useLang();

  useEffect(() => { setVisible(true); }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveEvent((prev) => (prev + 1) % t.hero.events.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [t.hero.events.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);
      const bars = 90;
      const barWidth = w / bars;
      for (let i = 0; i < bars; i++) {
        const x = i * barWidth + barWidth / 2;
        const t2 = time * 0.03;
        const freq1 = Math.sin(i * 0.18 + t2) * 0.5;
        const freq2 = Math.sin(i * 0.07 + t2 * 1.3) * 0.3;
        const freq3 = Math.sin(i * 0.32 + t2 * 0.7) * 0.2;
        const amplitude = (freq1 + freq2 + freq3) * h * 0.38 + h * 0.08;
        const barH = Math.max(4, Math.abs(amplitude));
        const progress = i / bars;
        const r = Math.round(0 + 123 * progress);
        const g = Math.round(255 + (97 - 255) * progress);
        const b = Math.round(209 + (255 - 209) * progress);
        const alpha = 0.25 + Math.abs(freq1 + freq2) * 0.75;
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        const bw = barWidth * 0.52;
        ctx.beginPath();
        ctx.roundRect(x - bw / 2, h / 2 - barH / 2, bw, barH, 99);
        ctx.fill();
      }
      time++;
      animationId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animationId); window.removeEventListener("resize", resize); };
  }, []);

  const ev = t.hero.events[activeEvent];

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center grid-bg overflow-hidden"
      style={{ paddingTop: "68px", paddingBottom: "var(--sp-section-py)" }}
    >
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 75% 55% at 50% 50%, rgba(0,255,209,0.07) 0%, transparent 70%)" }} />
      <div className="absolute pointer-events-none"
        style={{
          top: "-120px", left: "50%", transform: "translateX(-50%)", width: "700px", height: "500px",
          background: "radial-gradient(ellipse, rgba(123,97,255,0.11) 0%, transparent 70%)", filter: "blur(50px)"
        }} />

      <div className="relative z-10 w-full text-center" style={{ maxWidth: "64rem", margin: "0 auto", padding: "0 2rem" }}>
        {/* Badge */}
        <div
          className={`inline-flex items-center gap-4 rounded-full border text-xs font-bold tracking-wide transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          style={{
            padding: "1.25rem 2.5rem",
            borderColor: "rgba(0,255,209,0.25)",
            background: "rgba(0,255,209,0.05)",
            color: "var(--cyan)",
            marginBottom: "4rem"
          }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: "var(--cyan)" }} />
          {t.hero.badge}
        </div>

        {/* Headline */}
        <h1
          className={`font-semibold transition-all duration-700 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          style={{ fontFamily: "var(--font-poppins), sans-serif", fontSize: "clamp(3rem, 8vw, 6.5rem)", letterSpacing: "-0.04em", lineHeight: 1.25, marginBottom: "4rem" }}
        >
          <span className="text-white">{t.hero.h1a}</span>
          <br />
          <span className="text-gradient">{t.hero.h1b}</span>
        </h1>

        {/* Subheadline */}
        <p
          className={`mx-auto text-center transition-all duration-700 delay-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          style={{ maxWidth: "894px", fontSize: "clamp(1rem, 1.8vw, 1.2rem)", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "4rem", textAlign: "center" }}
        >
          {t.hero.sub}
        </p>

        {/* CTAs */}
        <div
          className={`flex flex-col items-center justify-center transition-all duration-700 delay-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"} relative z-20`}
          style={{ marginBottom: "2rem" }}
        >
          <div className="flex flex-col md:flex-row gap-12 w-full md:w-auto items-start justify-center">
            {/* Pizza Demo / Skúšobný hovor */}
            <div className="flex flex-col gap-5 w-full max-w-[340px] md:w-[340px] items-center">
              <div className="w-full rounded-xl border border-white/10 bg-[#11111e]/90 p-4 shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
                <div className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold text-white">
                  <Headset className="h-4 w-4 text-cyan-400" />
                  <span>{lang === "sk" ? "Ukážka hovoru s Teliom" : "Sample call with Telio"}</span>
                </div>
                <audio
                  className="h-10 w-full"
                  controls
                  preload="metadata"
                  src="/audio/telio-ukazka-hovoru.mp3"
                >
                  {lang === "sk"
                    ? "Váš prehliadač nepodporuje prehrávanie audia."
                    : "Your browser does not support audio playback."}
                </audio>
              </div>

              {/* Dropdown for calling cases */}
              <div className="relative w-full animate-fadeInUp" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-[#11111e]/90 hover:bg-[#161626]/90 border border-white/10 hover:border-white/20 transition-all text-sm text-white cursor-pointer shadow-[0_4px_25px_rgba(0,0,0,0.4)] relative"
                  style={{ height: "52px", padding: "0 2.5rem" }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {selectedCase === "pizza" && <Pizza className="w-4.5 h-4.5 text-[#FF6B35] shrink-0" />}
                    {selectedCase === "clinic" && <ToothIcon className="w-4.5 h-4.5 text-[#00D4FF] shrink-0" />}
                    {selectedCase === "taxi" && <Calendar className="w-4.5 h-4.5 text-[#7B61FF] shrink-0" />}
                    <span className="font-semibold tracking-tight truncate">
                      {selectedCase === "pizza" && (lang === "sk" ? "Telio pre pizzeriu" : "Telio for pizzeria")}
                      {selectedCase === "clinic" && (lang === "sk" ? "Telio pre stomatologickú kliniku" : "Telio for dental clinic")}
                      {selectedCase === "taxi" && (lang === "sk" ? "Rezervácia kurtov" : "Court Booking")}
                    </span>
                  </div>
                  <ChevronDown className={`w-4.5 h-4.5 text-white/50 shrink-0 transition-transform duration-250 ${dropdownOpen ? "rotate-180 text-white" : ""} absolute right-4 top-1/2 -translate-y-1/2`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute left-0 right-0 mt-2 z-[9999] rounded-xl bg-[#0c0c16]/98 border border-white/15 backdrop-blur-2xl shadow-[0_15px_40px_rgba(0,0,0,0.6)] overflow-hidden p-1 flex flex-col gap-0.5">
                    <button
                      onClick={() => {
                        setSelectedCase("taxi");
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 rounded-lg text-left text-sm hover:bg-white/10 transition-colors cursor-pointer ${
                        selectedCase === "taxi" ? "text-white bg-white/8 font-semibold" : "text-white/70"
                      }`}
                      style={{ padding: "0.75rem 1rem" }}
                    >
                      <Calendar className="w-4.5 h-4.5 text-[#7B61FF] shrink-0" />
                      <span className="truncate">{lang === "sk" ? "Rezervácia kurtov" : "Court Booking"}</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCase("pizza");
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 rounded-lg text-left text-sm hover:bg-white/10 transition-colors cursor-pointer ${
                        selectedCase === "pizza" ? "text-white bg-white/8 font-semibold" : "text-white/70"
                      }`}
                      style={{ padding: "0.75rem 1rem" }}
                    >
                      <Pizza className="w-4.5 h-4.5 text-[#FF6B35] shrink-0" />
                      <span className="truncate">{lang === "sk" ? "Telio pre pizzeriu" : "Telio for pizzeria"}</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCase("clinic");
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 rounded-lg text-left text-sm hover:bg-white/10 transition-colors cursor-pointer ${
                        selectedCase === "clinic" ? "text-white bg-white/8 font-semibold" : "text-white/70"
                      }`}
                      style={{ padding: "0.75rem 1rem" }}
                    >
                      <ToothIcon className="w-4.5 h-4.5 text-[#00D4FF] shrink-0" />
                      <span className="truncate">{lang === "sk" ? "Telio pre stomatologickú kliniku" : "Telio for dental clinic"}</span>
                    </button>
                  </div>
                )}
              </div>

              <DemoCallButton
                businessType={selectedCase}
                backendUrl="https://hlasovyasistent-652999054235.europe-west3.run.app"
                customLabel={lang === "sk" ? "Skúšobný hovor" : "Test Call"}
                color={
                  selectedCase === "pizza"
                    ? "#FF6B35"
                    : selectedCase === "clinic"
                    ? "#00D4FF"
                    : "#7B61FF"
                }
                icon={
                  selectedCase === "pizza" ? (
                    <Pizza className="w-5 h-5 relative z-10" />
                  ) : selectedCase === "clinic" ? (
                    <ToothIcon className="w-5 h-5 relative z-10" />
                  ) : (
                    <Calendar className="w-5 h-5 relative z-10" />
                  )
                }
              />
              <span className="text-xs font-medium px-1 text-center" style={{ color: "var(--text-muted)", opacity: 0.9 }}>
                {lang === "sk" ? "Vyskúšajte úplne zadarmo nášho hlasového asistenta Telio" : "Try our Telio voice assistant completely for free"}
              </span>
            </div>
          </div>
        </div>

        {/* Waveform widget */}
        <div
          className={`relative mx-auto transition-all duration-700 delay-500 h-[190px] sm:h-[130px] ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          style={{
            maxWidth: "900px", borderRadius: "18px",
            border: "1px solid var(--border)", background: "rgba(10,10,18,0.85)",
            backdropFilter: "blur(12px)", overflow: "hidden", marginBottom: "5rem"
          }}
        >
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
          <div className="absolute left-4 top-4 sm:top-1/2 sm:-translate-y-1/2 sm:left-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: "var(--cyan)" }} />
            <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{t.hero.live}</span>
          </div>
          <div className="absolute left-4 right-4 bottom-4 sm:top-1/2 sm:-translate-y-1/2 sm:right-6 sm:left-auto sm:bottom-auto">
            <div key={activeEvent}
              className="flex items-center justify-center sm:justify-start gap-2 text-xs px-6 sm:px-8 py-3 sm:py-4 rounded-xl"
              style={{ background: "rgba(0,0,0,0.5)", border: "1px solid var(--border)", animation: "fadeInUp 0.4s ease" }}
            >
              <span className="text-sm">{ev.emoji}</span>
              <span style={{ color: activeEvent % 2 === 0 ? "var(--cyan)" : "#7B61FF", fontWeight: 700 }}>{ev.text}</span>
              <span style={{ color: "var(--text-muted)" }}>{ev.time}</span>
            </div>
          </div>
        </div>

      </div>



      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
