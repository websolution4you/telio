"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import Image from "next/image";

export default function AboutUs() {
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

  const team = [
    {
      id: "kamil",
      name: t.aboutUs.kamil.name,
      role: t.aboutUs.kamil.role,
      description: t.aboutUs.kamil.description,
      linkedin: t.aboutUs.kamil.linkedin,
      image: "/team/kamil.jpg"
    },
    {
      id: "peto",
      name: t.aboutUs.peto.name,
      role: t.aboutUs.peto.role,
      description: t.aboutUs.peto.description,
      linkedin: t.aboutUs.peto.linkedin,
      image: "/team/peto.jpg"
    }
  ];

  return (
    <section id="about-us" ref={sectionRef} className="relative overflow-hidden" style={{ paddingTop: "var(--sp-section-py)", paddingBottom: "var(--sp-section-py)", background: "rgba(5,5,8,0.4)" }}>
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(circle at 50% 50%, rgba(123,97,255,0.03) 0%, transparent 70%)" }} />

      <div className="relative" style={{ maxWidth: "64rem", margin: "0 auto", padding: "0 2rem" }}>
        
        {/* Header */}
        <div 
          className={`flex flex-col items-center text-center transition-all duration-1000 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
          style={{ marginBottom: "var(--sp-header-mb)" }}
        >
          <div 
            className="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-lg"
            style={{ color: "var(--cyan)", background: "rgba(0,255,209,0.07)", border: "1px solid rgba(0,255,209,0.2)", marginBottom: "var(--sp-badge-mb)" }}
          >
            {t.aboutUs.badge}
          </div>
          <h2 
            className="font-extrabold text-white" 
            style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", letterSpacing: "-0.04em", lineHeight: 1.1 }}
          >
            {t.aboutUs.h2a} <span className="text-gradient">{t.aboutUs.h2b}</span>
          </h2>
          {t.aboutUs.intro && (
            <p 
              className="mt-8 text-lg md:text-xl font-light leading-relaxed max-w-2xl mx-auto"
              style={{ color: "var(--text-muted)", opacity: 0.8 }}
            >
              {t.aboutUs.intro}
            </p>
          )}
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
          {team.map((member, i) => (
            <div 
              key={member.id}
              className={`flex flex-col items-center text-center transition-all duration-1000 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"}`}
              style={{ transitionDelay: `${i * 200}ms` }}
            >
              {/* Profile Image with circular border */}
              <div className="relative group" style={{ marginBottom: "2rem" }}>
                <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-700" />
                <div 
                  className="relative w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden flex items-center justify-center shadow-2xl"
                  style={{ 
                    border: "2px solid rgba(0,255,209,0.3)",
                    boxShadow: "0 0 40px rgba(0,255,209,0.1)",
                    background: "#ffffff"
                  }}
                >
                  <div className="relative w-[88%] h-[88%] rounded-full overflow-hidden">
                    <Image 
                      src={member.image} 
                      alt={member.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                </div>
                {/* Decorative element */}
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse-glow" />
                </div>
              </div>

              {/* Info */}
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-white tracking-tight">{member.name}</h3>
                <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--cyan)" }}>
                  {member.role}
                </div>
                <p 
                  className="text-sm md:text-base leading-relaxed mx-auto max-w-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  {member.description}
                </p>

                {member.linkedin && (
                  <a 
                    href={member.linkedin} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full transition-all duration-300 group/link"
                    style={{ 
                      color: "var(--text-muted)", 
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.05)"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "white";
                      e.currentTarget.style.background = "rgba(0,119,181,0.1)";
                      e.currentTarget.style.borderColor = "rgba(0,119,181,0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--text-muted)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
