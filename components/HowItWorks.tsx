"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

const ICONS = [
  <svg key="phone" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.64A2 2 0 012 .99h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>,
  <svg key="ai" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
  </svg>,
  <svg key="check" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>,
];

export default function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold: 0.08 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="how-it-works" ref={sectionRef} className="relative overflow-hidden" style={{ paddingTop: "var(--sp-section-py)", paddingBottom: "var(--sp-section-py)" }}>
      <div className="absolute right-0 top-0 w-1/2 h-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 80% at 100% 50%, rgba(123,97,255,0.05) 0%, transparent 70%)" }} />

      <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 2rem" }}>

        {/* Section Header — fully centered */}
        <div
          className={`flex flex-col items-center text-center transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          style={{ marginBottom: "var(--sp-header-mb)" }}
        >
          <div
            className="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded"
            style={{ color: "var(--cyan)", background: "rgba(0,255,209,0.07)", border: "1px solid rgba(0,255,209,0.15)", marginBottom: "var(--sp-badge-mb)" }}
          >
            {t.howItWorks.badge}
          </div>
          <h2
            className="font-extrabold text-white"
            style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)", letterSpacing: "-0.03em", lineHeight: 1.1, maxWidth: "42rem" }}
          >
            {t.howItWorks.h2a}
            <br />
            <span className="text-gradient">{t.howItWorks.h2b}</span>
          </h2>
        </div>

        {/* Steps — horizontal 3-column on desktop, centered */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
          {t.howItWorks.steps.map((step, i) => (
            <div
              key={step.number}
              className={`relative flex flex-col items-center text-center transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              {/* Connector line between cards */}
              {i < 2 && (
                <div
                  className="hidden md:block absolute"
                  style={{
                    top: "2rem",
                    left: "calc(50% + 3rem)",
                    width: "calc(100% - 5rem)",
                    height: "1px",
                    background: "linear-gradient(90deg, rgba(0,255,209,0.3), rgba(123,97,255,0.3))"
                  }}
                />
              )}

              {/* Icon */}
              <div
                className="relative w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(12,12,20,0.9)", border: "1px solid var(--border)", marginBottom: "var(--sp-icon-mb)" }}
              >
                <div style={{ color: "var(--cyan)" }}>{ICONS[i]}</div>
                <div className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{ boxShadow: "0 0 24px rgba(0,255,209,0.1)" }} />
                {/* Step number overlay */}
                <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "linear-gradient(135deg, var(--cyan), #7B61FF)", color: "#050508" }}>
                  {i + 1}
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col items-center" style={{ gap: "var(--sp-item-gap)" }}>
                <div className="text-xs font-bold tracking-widest" style={{ color: "var(--text-muted)" }}>
                  {t.howItWorks.step} {step.number}
                </div>
                <h3 className="font-bold text-white" style={{ fontSize: "1.25rem", letterSpacing: "-0.02em", lineHeight: 1.3 }}>
                  {step.title}
                </h3>
                <p className="leading-relaxed text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.75, maxWidth: "20rem" }}>
                  {step.description}
                </p>
                {step.detail && (
                  <div
                    className="inline-flex items-center justify-center gap-3 text-xs px-10 py-4 rounded-full w-fit font-bold"
                    style={{ background: "rgba(0,255,209,0.05)", border: "1px solid rgba(0,255,209,0.12)", color: "var(--cyan)", marginTop: "var(--sp-item-gap)" }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--cyan)" }} />
                    {step.detail}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
