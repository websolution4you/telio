"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

export default function Stats() {
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
    <section ref={sectionRef} className="relative overflow-hidden" style={{ paddingTop: "var(--sp-section-py)", paddingBottom: "var(--sp-section-py)" }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, var(--cyan), var(--purple), transparent)", opacity: 0.35 }} />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, var(--cyan), var(--purple), transparent)", opacity: 0.35 }} />

      <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "0 2rem" }}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {t.stats.map((s, i) => (
            <div
              key={i}
              className={`text-center py-12 px-8 rounded-2xl transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: `${i * 100}ms`, background: "rgba(12,12,20,0.6)", border: "1px solid var(--border)" }}
            >
              <div className="font-extrabold mb-2 text-gradient"
                style={{ fontSize: "clamp(2.2rem, 4vw, 3.2rem)", letterSpacing: "-0.04em" }}>
                {s.value}
              </div>
              <div className="font-semibold text-white text-sm mb-2">{s.label}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
