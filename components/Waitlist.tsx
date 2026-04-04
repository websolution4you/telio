"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useLang } from "@/lib/i18n";
import { sendContactFormAction } from "@/app/actions/contact";

export default function Waitlist() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [business, setBusiness] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
    if (!email || !name || !business) {
      setError("Meno, email a oblasť podnikania sú povinné.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const result = await sendContactFormAction({
        name,
        email,
        phone,
        business,
        message
      });
      
      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error || "Chyba pri odosielaní.");
      }
    } catch (err) {
      setError("Nepodarilo sa spojiť so serverom.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="waitlist" ref={sectionRef} className="relative overflow-hidden" style={{ paddingTop: "var(--sp-section-py)", paddingBottom: "var(--sp-section-py)" }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,255,209,0.06) 0%, rgba(123,97,255,0.04) 40%, transparent 70%)" }} />
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

      <div className="relative text-center" style={{ maxWidth: "48rem", margin: "0 auto", padding: "0 2rem" }}>
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



        {/* Form / Success */}
        {!submitted ? (
          <form onSubmit={handleSubmit}
            className={`flex flex-col gap-4 transition-all duration-700 delay-300 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            style={{ maxWidth: "36rem", margin: "0 auto", marginBottom: "var(--sp-badge-mb)", width: "100%" }}>
            
            {/* Input Group */}
            <div className="flex flex-col gap-3">
              <div className="relative w-full">
                <select
                  required
                  value={business}
                  onChange={(e) => setBusiness(e.target.value)}
                  className="input-xl outline-none transition-all duration-200 appearance-none"
                  style={{
                    background: "rgba(12,12,20,0.9)",
                    border: "1px solid var(--border)",
                    color: business ? "var(--text)" : "var(--text-muted)",
                    width: "100%",
                    height: "56px",
                    padding: "0 1.5rem",
                    borderRadius: "12px",
                    cursor: "pointer",
                    appearance: "none"
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,255,209,0.4)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                >
                  <option value="" disabled>{t.waitlist.businessLabel}</option>
                  {t.waitlist.businesses.map((b) => (
                    <option key={b} value={b} style={{ background: "#0a0a12", color: "#fff" }}>{b}</option>
                  ))}
                </select>
                <div 
                  className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}
                >
                  ▼
                </div>
              </div>
              <input
                type="text" required
                placeholder={t.waitlist.nameLabel}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-xl outline-none transition-all duration-200"
                style={{
                  background: "rgba(12,12,20,0.9)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  width: "100%",
                  height: "56px",
                  padding: "0 1.5rem",
                  borderRadius: "12px"
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,255,209,0.4)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="email" required
                  placeholder={t.waitlist.emailLabel}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-xl outline-none transition-all duration-200"
                  style={{
                    background: "rgba(12,12,20,0.9)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    width: "100%",
                    height: "56px",
                    padding: "0 1.5rem",
                    borderRadius: "12px"
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,255,209,0.4)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
                <input
                  type="tel"
                  placeholder={t.waitlist.phoneLabel}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-xl outline-none transition-all duration-200"
                  style={{
                    background: "rgba(12,12,20,0.9)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    width: "100%",
                    height: "56px",
                    padding: "0 1.5rem",
                    borderRadius: "12px"
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,255,209,0.4)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </div>

              <textarea
                placeholder={t.waitlist.messagePlaceholder}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="outline-none transition-all duration-200"
                style={{
                  background: "rgba(12,12,20,0.9)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  width: "100%",
                  minHeight: "120px",
                  padding: "1rem 1.5rem",
                  borderRadius: "12px",
                  resize: "vertical"
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,255,209,0.4)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm animate-shake">{error}</p>
            )}

            <button type="submit" disabled={loading}
              className="btn-primary btn-xl w-full text-sm font-bold whitespace-nowrap flex items-center justify-center gap-2"
              style={{ height: "64px", minHeight: "64px", flexShrink: 0, cursor: "pointer" }}>
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
