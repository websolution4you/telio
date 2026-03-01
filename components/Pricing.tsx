"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

export default function Pricing() {
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
    <section id="pricing" ref={sectionRef} className="relative py-40 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(123,97,255,0.06) 0%, transparent 70%)" }} />

      <div className="relative" style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 2rem" }}>
        {/* Header */}
        <div
          className={`flex flex-col items-center text-center transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          style={{ marginBottom: "120px" }}
        >
          <div className="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded"
            style={{ color: "#7B61FF", background: "rgba(123,97,255,0.07)", border: "1px solid rgba(123,97,255,0.15)", marginBottom: "40px" }}>
            {t.pricing.badge}
          </div>
          <h2 className="font-extrabold text-white"
            style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "32px" }}>
            {t.pricing.h2a}
            <br />
            <span className="text-gradient">{t.pricing.h2b}</span>
          </h2>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>{t.pricing.sub}</p>
        </div>

        {/* Plans grid — equal height, proper spacing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 xl:gap-8 items-start">
          {t.pricing.plans.map((plan, i) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl p-8 xl:p-10 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{
                transitionDelay: `${i * 120}ms`,
                background: plan.highlighted
                  ? "linear-gradient(135deg, rgba(0,255,209,0.07), rgba(123,97,255,0.07))"
                  : "rgba(12,12,20,0.8)",
                border: plan.highlighted
                  ? "1px solid rgba(0,255,209,0.25)"
                  : "1px solid var(--border)",
                boxShadow: plan.highlighted
                  ? "0 0 50px rgba(0,255,209,0.08), 0 0 100px rgba(123,97,255,0.06)"
                  : "none",
                marginTop: plan.highlighted ? "-8px" : "0",
                paddingTop: plan.highlighted ? "3rem" : undefined,
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-5 py-1.5 rounded-full whitespace-nowrap"
                  style={{ background: "linear-gradient(135deg, var(--cyan), #7B61FF)", color: "#050508" }}>
                  {plan.badge}
                </div>
              )}

              {/* Plan header */}
              <div style={{ marginBottom: "60px" }}>
                <div className="text-xs font-bold tracking-widest uppercase mb-6"
                  style={{ color: plan.highlighted ? "var(--cyan)" : "var(--text-muted)" }}>
                  {plan.name}
                </div>
                <div className="flex items-end gap-1.5 mb-6">
                  <span className="font-extrabold leading-none"
                    style={{
                      fontSize: plan.price === "Custom" ? "2.2rem" : "3rem",
                      color: plan.highlighted ? "var(--cyan)" : "white", letterSpacing: "-0.04em"
                    }}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="mb-1.5 text-sm" style={{ color: "var(--text-muted)" }}>{plan.period}</span>
                  )}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {plan.description}
                </p>
              </div>

              {/* Divider */}
              <div className="mb-8 h-px w-full" style={{ background: "var(--border)" }} />

              {/* Features */}
              <ul className="flex flex-col flex-1" style={{ gap: "24px", marginBottom: "50px" }}>
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm" style={{ color: "var(--text)" }}>
                    <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        background: plan.highlighted ? "rgba(0,255,209,0.12)" : "rgba(255,255,255,0.05)",
                        border: plan.highlighted ? "1px solid rgba(0,255,209,0.3)" : "1px solid var(--border)",
                      }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3.5 6L6.5 2"
                          stroke={plan.highlighted ? "var(--cyan)" : "var(--text-muted)"}
                          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span style={{ lineHeight: 1.5 }}>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a href="#waitlist"
                className={`text-center py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${plan.highlighted ? "btn-primary" : "btn-ghost"}`}
                style={{ marginTop: "40px" }}
              >
                {plan.cta} →
              </a>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div
          className={`text-center transition-all duration-700 delay-500 ${inView ? "opacity-100" : "opacity-0"}`}
          style={{ marginTop: "100px" }}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {t.pricing.trialNote}{" "}
            <span style={{ color: "var(--text)" }}>{t.pricing.trialBold}</span>
            {t.pricing.trialEnd}
          </p>
        </div>
      </div>
    </section>
  );
}
