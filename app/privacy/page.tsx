"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLang } from "@/lib/i18n";
import { useEffect, useState } from "react";

export default function PrivacyPage() {
  const { t } = useLang();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <main style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Navbar />
      
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full" 
          style={{ background: "radial-gradient(circle, rgba(0,255,209,0.05) 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full" 
          style={{ background: "radial-gradient(circle, rgba(123,97,255,0.05) 0%, transparent 70%)", filter: "blur(80px)" }} />
      </div>

      <div className="relative z-10 pt-48 pb-32 px-6 sm:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ marginBottom: "80px" }}>
            <h1 className="text-4xl sm:text-6xl font-extrabold text-white mb-8" style={{ letterSpacing: "-0.04em", lineHeight: 1.1 }}>
              {t.privacy.title}
            </h1>
            <div className="h-1 w-20 rounded-full mb-8" style={{ background: "linear-gradient(90deg, var(--cyan), #7B61FF)" }} />
            <p className="text-sm font-medium uppercase tracking-widest opacity-60" style={{ color: "var(--text-muted)" }}>
              {t.privacy.lastUpdated}
            </p>
          </div>

          {/* Content */}
          <div className={`space-y-16 transition-all duration-700 delay-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <p className="text-xl leading-relaxed font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
              {t.privacy.introduction}
            </p>

            {t.privacy.sections.map((section: any, idx: number) => (
              <section key={idx} className="space-y-8">
                <div className="space-y-4">
                  <h2 className="text-3xl font-bold text-white tracking-tight">
                    {section.title}
                  </h2>
                  <div className="h-px w-full" style={{ background: "linear-gradient(90deg, var(--border), transparent)" }} />
                </div>
                
                <p className="text-lg leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {section.content}
                </p>

                {section.subsections && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                    {section.subsections.map((sub: any, sIdx: number) => (
                      <div key={sIdx} className="p-6 rounded-2xl border transition-colors hover:bg-white/[0.04]" 
                        style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border)" }}>
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-3" style={{ color: "var(--cyan)" }}>{sub.title}</h3>
                        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{sub.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
