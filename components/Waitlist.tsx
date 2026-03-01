"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useLang } from "@/lib/i18n";

export default function Waitlist() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [email, setEmail] = useState("");
  const [business, setBusiness] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <section id="waitlist" ref={sectionRef} className="relative overflow-hidden" style={{ paddingTop: "var(--sp-section-py)", paddingBottom: "var(--sp-section-py)" }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,255,209,0.06) 0%, rgba(123,97,255,0.04) 40%, transparent 70%)" }} />
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

      <div className="relative text-center" style={{ maxWidth: "48rem", margin: "0 auto", padding: "0 2rem" }}>
        {/* Badge */}
        <div
          className={`inline-flex items-center gap-3 px-6 py-3 rounded-full border text-xs font-medium transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          style={{ borderColor: "rgba(0,255,209,0.25)", background: "rgba(0,255,209,0.05)", color: "var(--cyan)", marginBottom: "var(--sp-badge-mb)" }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse-glow" style={{ background: "var(--cyan)" }} />
          {t.waitlist.badge}
        </div>

        {/* Headline */}
        <h2
          className={`font-extrabold text-white transition-all duration-700 delay-100 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          style={{ fontSize: "clamp(2.2rem, 5.5vw, 4rem)", letterSpacing: "-0.04em", lineHeight: 1.0, marginBottom: "var(--sp-badge-mb)" }}>
          {t.waitlist.h2a}
          <br />
          <span className="text-gradient">{t.waitlist.h2b}</span>
        </h2>

        <p
          className={`leading-relaxed transition-all duration-700 delay-200 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          style={{ color: "var(--text-muted)", fontSize: "1.1rem", lineHeight: 1.7, marginBottom: "var(--sp-header-mb)" }}>
          {t.waitlist.sub}
        </p>

        {/* Business type selector */}
        {!submitted && (
          <div
            className={`flex flex-wrap justify-center gap-2 transition-all duration-700 delay-250 ${inView ? "opacity-100" : "opacity-0"}`}
            style={{ marginBottom: "var(--sp-badge-mb)" }}
          >
            {t.waitlist.businesses.map((b) => (
              <button key={b} type="button" onClick={() => setBusiness(b)}
                className="rounded-2xl text-xs font-bold transition-all duration-200"
                style={{
                  padding: "1.25rem 2.5rem",
                  background: business === b ? "rgba(0,255,209,0.1)" : "rgba(12,12,20,0.6)",
                  border: `1px solid ${business === b ? "rgba(0,255,209,0.3)" : "var(--border)"}`,
                  color: business === b ? "var(--cyan)" : "var(--text-muted)",
                }}>
                {b}
              </button>
            ))}
          </div>
        )}

        {/* Form / Success */}
        {!submitted ? (
          <form onSubmit={handleSubmit}
            className={`flex flex-col sm:flex-row gap-3 transition-all duration-700 delay-300 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            style={{ maxWidth: "36rem", margin: "0 auto", marginBottom: "var(--sp-badge-mb)" }}>
            <input
              type="email" required
              placeholder={t.waitlist.placeholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-5 py-3.5 rounded-xl text-sm outline-none transition-all duration-200"
              style={{ background: "rgba(12,12,20,0.9)", border: "1px solid var(--border)", color: "var(--text)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,255,209,0.4)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            />
            <button type="submit" disabled={loading}
              className="btn-primary btn-xl text-sm font-bold whitespace-nowrap flex items-center justify-center gap-2">
              {loading
                ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : t.waitlist.cta}
            </button>
          </form>
        ) : (
          <div
            className={`mb-10 p-8 rounded-2xl text-center transition-all duration-500 ${inView ? "opacity-100" : "opacity-0"}`}
            style={{ maxWidth: "36rem", margin: "0 auto", background: "rgba(0,255,209,0.05)", border: "1px solid rgba(0,255,209,0.2)" }}>
            <div className="text-4xl mb-4">✓</div>
            <div className="font-semibold text-white mb-2">{t.waitlist.successTitle}</div>
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>{t.waitlist.successSub}</div>
          </div>
        )}

        {/* Trust signals */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-6 transition-all duration-700 delay-500 ${inView ? "opacity-100" : "opacity-0"}`}
          style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
          {t.waitlist.trust.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {i === 0 && <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />}
                {i === 1 && <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></>}
                {i === 2 && <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>}
              </svg>
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
