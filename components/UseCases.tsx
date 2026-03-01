"use client";

import { useState, useEffect, useRef } from "react";
import { useLang } from "@/lib/i18n";

export default function UseCases() {
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold: 0.05 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  // Reset active tab when language changes
  useEffect(() => { setActive(0); }, [t]);

  const cases = t.useCases.cases;
  const current = cases[active];

  return (
    <section id="use-cases" ref={sectionRef} className="relative overflow-hidden" style={{ paddingTop: "var(--sp-section-py)", paddingBottom: "var(--sp-section-py)" }}>
      <div className="absolute left-0 top-0 w-1/2 h-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 80% at 0% 50%, rgba(0,255,209,0.04) 0%, transparent 70%)" }} />

      <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 2rem" }}>

        {/* Section Header — centered */}
        <div
          className={`flex flex-col items-center text-center transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          style={{ marginBottom: "var(--sp-header-mb)" }}
        >
          <div
            className="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded"
            style={{ color: "#7B61FF", background: "rgba(123,97,255,0.07)", border: "1px solid rgba(123,97,255,0.15)", marginBottom: "var(--sp-badge-mb)" }}
          >
            {t.useCases.badge}
          </div>
          <h2
            className="font-extrabold text-white"
            style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)", letterSpacing: "-0.03em", lineHeight: 1.1, maxWidth: "42rem" }}
          >
            {t.useCases.h2a}
            <br />
            <span className="text-gradient">{t.useCases.h2b}</span>
          </h2>
        </div>

        {/* Tabs — centered */}
        <div
          className={`flex flex-wrap justify-center gap-3 transition-all duration-700 delay-100 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          style={{ marginBottom: "var(--sp-header-mb)" }}
        >
          {cases.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setActive(i)}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: active === i ? "rgba(0,255,209,0.08)" : "rgba(12,12,20,0.8)",
                border: `1px solid ${active === i ? "rgba(0,255,209,0.3)" : "var(--border)"}`,
                color: active === i ? "var(--cyan)" : "var(--text-muted)",
              }}
            >
              <span>{c.emoji}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        {/* Content panel */}
        <div
          key={`${active}-${t.useCases.badge}`}
          className={`grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20 transition-all duration-500 ${inView ? "opacity-100" : "opacity-0"}`}
          style={{ animation: "fadeInUp 0.35s ease" }}
        >
          {/* Left — text */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left justify-center py-6">
            <div
              className="w-20 h-20 flex items-center justify-center rounded-2xl"
              style={{ background: "rgba(12,12,20,0.8)", border: "1px solid var(--border)", fontSize: "2.2rem", marginBottom: "var(--sp-badge-mb)" }}
            >
              {current.emoji}
            </div>
            <h3
              className="font-bold text-white"
              style={{ fontSize: "1.75rem", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: "var(--sp-badge-mb)" }}
            >
              {current.title}
            </h3>
            <p
              className="leading-relaxed"
              style={{ color: "var(--text-muted)", fontSize: "1.05rem", lineHeight: 1.75, marginBottom: "var(--sp-badge-mb)" }}
            >
              {current.description}
            </p>
            <ul className="flex flex-col" style={{ gap: "var(--sp-item-gap)" }}>
              {current.features.map((f, i) => (
                <li key={i} className="flex items-start gap-4 text-sm" style={{ color: "var(--text)" }}>
                  <span
                    className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,255,209,0.1)", border: "1px solid rgba(0,255,209,0.3)" }}
                  >
                    <svg width="9" height="9" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4L3.5 6L6.5 2" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span style={{ lineHeight: 1.65 }}>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — mock call */}
          <div
            className="rounded-2xl flex flex-col gap-2"
            style={{
              padding: "clamp(2rem, 5vw, 3.5rem) clamp(1.5rem, 4vw, 3rem)",
              background: "rgba(8,8,14,0.9)",
              border: "1px solid var(--border)",
              backdropFilter: "blur(20px)"
            }}
          >
            <div className="flex items-center gap-2" style={{ marginBottom: "var(--sp-badge-mb)", paddingBottom: "var(--sp-item-gap)", borderBottom: "1px solid var(--border)" }}>
              <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: "var(--cyan)" }} />
              <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                {t.useCases.liveLabel}
              </span>
            </div>
            {current.callSample.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`} style={{ marginBottom: "var(--sp-item-gap)" }}>
                {msg.role === "ai" && (
                  <div className="flex items-start gap-3" style={{ maxWidth: "20rem" }}>
                    <div
                      className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
                      style={{ background: "linear-gradient(135deg, var(--cyan), #7B61FF)", color: "#050508" }}
                    >T</div>
                    <div
                      className="px-4 py-3 rounded-2xl rounded-tl-none text-sm"
                      style={{ background: "rgba(0,255,209,0.07)", border: "1px solid rgba(0,255,209,0.12)", color: "var(--text)", lineHeight: 1.6 }}
                    >
                      {msg.text}
                    </div>
                  </div>
                )}
                {msg.role === "caller" && (
                  <div
                    className="px-4 py-3 rounded-2xl rounded-tr-none text-sm"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-muted)", lineHeight: 1.6 }}
                  >
                    {msg.text}
                  </div>
                )}
              </div>
            ))}
            <div className="flex items-center gap-2.5" style={{ marginTop: "var(--sp-badge-mb)", paddingTop: "var(--sp-item-gap)", borderTop: "1px solid var(--border)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t.useCases.actionLine}</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
