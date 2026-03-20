"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import DemoCallButton from "@/components/DemoCallButton";
import { Car, Pizza } from "lucide-react";

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeEvent, setActiveEvent] = useState(0);
  const [visible, setVisible] = useState(false);
  const { t } = useLang();

  useEffect(() => { setVisible(true); }, []);

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
          className={`font-extrabold transition-all duration-700 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          style={{ fontSize: "clamp(3rem, 8vw, 6.5rem)", letterSpacing: "-0.04em", lineHeight: 1.25, marginBottom: "4rem" }}
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
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 delay-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          style={{ marginBottom: "2rem" }}
        >
          <a href="#waitlist" className="btn-primary btn-xl w-full sm:w-auto">
            {t.hero.cta1}
          </a>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <DemoCallButton 
              businessType="taxi" 
              customLabel="Taxi Demo" 
              icon={<Car className="w-5 h-5 relative z-10" />} 
              backendUrl="https://call-agent-65sb.onrender.com"
            />
            <DemoCallButton
              businessType="pizzeria"
              customLabel="Pizzeria Demo"
              color="#FF6B35"
              icon={<Pizza className="w-5 h-5 relative z-10" />}
              backendUrl="https://call-agent-dbt6.onrender.com"
            />
          </div>
          <a href="#how-it-works" className="btn-ghost btn-xl w-full sm:w-auto">
            {t.hero.cta2}
          </a>
        </div>

        {/* Waveform widget */}
        <div
          className={`relative mx-auto transition-all duration-700 delay-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          style={{
            maxWidth: "900px", height: "130px", borderRadius: "18px",
            border: "1px solid var(--border)", background: "rgba(10,10,18,0.85)",
            backdropFilter: "blur(12px)", overflow: "hidden", marginBottom: "5rem"
          }}
        >
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
          <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: "var(--cyan)" }} />
            <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{t.hero.live}</span>
          </div>
          <div className="absolute right-6 top-1/2 -translate-y-1/2">
            <div key={activeEvent}
              className="flex items-center gap-2 text-xs px-8 py-4 rounded-xl"
              style={{ background: "rgba(0,0,0,0.5)", border: "1px solid var(--border)", animation: "fadeInUp 0.4s ease" }}
            >
              <span className="text-sm">{ev.emoji}</span>
              <span style={{ color: activeEvent % 2 === 0 ? "var(--cyan)" : "#7B61FF", fontWeight: 700 }}>{ev.text}</span>
              <span style={{ color: "var(--text-muted)" }}>{ev.time}</span>
            </div>
          </div>
        </div>

        {/* Stats pills */}
        <div
          className={`flex flex-wrap items-center justify-center gap-x-8 gap-y-3 transition-all duration-700 delay-700 ${visible ? "opacity-100" : "opacity-0"}`}
          style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}
        >
          <StatPill value="&lt; 1s" label={t.hero.statResponse} />
          <Divider />
          <StatPill value="24/7" label={t.hero.statAvail} />
          <Divider />
          <StatPill value="100%" label={t.hero.statCalls} />
          <Divider />
          <StatPill value="SK/EN" label={t.hero.statLang} />
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

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-bold text-sm" style={{ color: "var(--cyan)" }}
        dangerouslySetInnerHTML={{ __html: value }} />
      <span>{label}</span>
    </div>
  );
}

function Divider() {
  return <div className="hidden sm:block w-px h-4" style={{ background: "var(--border)" }} />;
}
