"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

const ICONS = [
  <svg key="0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>,
  <svg key="1" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  <svg key="2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  <svg key="3" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
];

const COLORS = ["#7B61FF", "var(--cyan)", "#7B61FF", "#25D366"];

export default function Features() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold: 0.04 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="features" ref={sectionRef} className="relative grid-bg overflow-hidden" style={{ paddingTop: "var(--sp-section-py)", paddingBottom: "var(--sp-section-py)" }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,255,209,0.04) 0%, transparent 70%)" }} />

      <div className="relative" style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 2rem" }}>

        {/* Section Header — centered */}
        <div
          className={`flex flex-col items-center text-center transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          style={{ marginBottom: "var(--sp-header-mb)" }}
        >
          <div
            className="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded"
            style={{ color: "var(--cyan)", background: "rgba(0,255,209,0.07)", border: "1px solid rgba(0,255,209,0.15)", marginBottom: "var(--sp-badge-mb)" }}
          >
            {t.features.badge}
          </div>
          <h2
            className="font-extrabold text-white"
            style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "var(--sp-badge-mb)" }}
          >
            {t.features.h2a}
            <br />
            <span className="text-gradient">{t.features.h2b}</span>
          </h2>
          {t.features.sub && (
            <p style={{ color: "var(--text-muted)", lineHeight: 1.8, fontSize: "1.05rem", maxWidth: "32rem" }}>
              {t.features.sub}
            </p>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {t.features.items.map((f, i) => (
            <div
              key={i}
              className={`card-hover relative rounded-2xl flex flex-col items-center text-center transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ padding: "var(--sp-card-p)", transitionDelay: `${i * 60}ms`, background: "rgba(12,12,20,0.8)", border: "1px solid var(--border)" }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(0,255,209,0.07)", border: "1px solid rgba(0,255,209,0.12)", color: COLORS[i], marginBottom: "var(--sp-icon-mb)" }}
              >
                {ICONS[i]}
              </div>
              <div className="flex flex-col items-center flex-1" style={{ gap: "var(--sp-item-gap)" }}>
                <h3 className="font-semibold text-white leading-snug" style={{ fontSize: "1.1rem" }}>
                  {f.title}
                </h3>
                <p className="text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.75 }}>
                  {f.description}
                </p>
              </div>
              {f.badge ? (
                <div
                  className="text-xs px-8 py-3.5 rounded-full font-bold tracking-wide w-fit"
                  style={{ background: "rgba(0,0,0,0.4)", color: COLORS[i], border: `1px solid ${COLORS[i]}22`, marginTop: "var(--sp-badge-mb)" }}
                >
                  {f.badge}
                </div>
              ) : null}
              <div className="absolute top-0 right-0 w-12 h-12 rounded-tr-2xl pointer-events-none overflow-hidden">
                <div className="absolute -top-6 -right-6 w-12 h-12 rounded-full opacity-15"
                  style={{ background: COLORS[i] }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
