"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

export default function AboutTelio() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section 
      id="about-telio"
      ref={sectionRef}
      className={`relative overflow-hidden transition-colors duration-1000`}
      style={{ 
        paddingTop: "var(--sp-section-py)", 
        paddingBottom: "var(--sp-section-py)",
        background: "var(--bg)"
      }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(123,97,255,0.03) 0%, transparent 70%)" }} />

      <div className="relative z-10" style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 2rem" }}>
        <div className="flex flex-col items-center text-center">
          
          {/* Badge */}
          <div
            className={`inline-block text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            style={{ 
              color: "var(--purple)", 
              background: "rgba(123,97,255,0.07)", 
              border: "1px solid rgba(123,97,255,0.15)", 
              marginBottom: "var(--sp-badge-mb)" 
            }}
          >
            {t.aboutTelio.badge}
          </div>

          {/* Title */}
          <h2
            className={`font-extrabold text-white transition-all duration-700 delay-100 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            style={{ 
              fontSize: "clamp(2rem, 5vw, 3.5rem)", 
              letterSpacing: "-0.03em", 
              lineHeight: 1.1, 
              marginBottom: "var(--sp-badge-mb)",
              maxWidth: "40rem"
            }}
          >
            {t.aboutTelio.title}
          </h2>

          {/* Body Text */}
          <p
            className={`transition-all duration-700 delay-300 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            style={{ 
              color: "var(--text-muted)", 
              fontSize: "clamp(1rem, 1.2vw, 1.15rem)", 
              lineHeight: 1.7, 
              maxWidth: "54rem",
              fontWeight: 400
            }}
          >
            {t.aboutTelio.text}
          </p>

        </div>
      </div>
    </section>
  );
}
