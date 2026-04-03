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

      {/* Main Content Container with Massive Vertical Spacing */}
      <div className="relative z-10 w-full pt-80 pb-64 px-6 sm:px-10 flex flex-col items-center">
        <div className="w-full max-w-2xl lg:max-w-3xl">
          {/* Header with extreme margin */}
          <div className={`transition-all duration-1000 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`} style={{ marginBottom: "140px" }}>
            <h1 className="text-4xl sm:text-7xl font-black text-white mb-12" style={{ letterSpacing: "-0.05em", lineHeight: 1.05 }}>
              {t.privacy.title}
            </h1>
            <div className="h-1.5 w-32 rounded-full mb-12" style={{ background: "linear-gradient(90deg, var(--cyan), var(--purple))" }} />
            <p className="text-sm font-bold uppercase tracking-[0.25em] opacity-40" style={{ color: "var(--text-muted)" }}>
              {t.privacy.lastUpdated}
            </p>
          </div>

          {/* Content Body with expanded spacing */}
          <div className={`space-y-32 transition-all duration-1000 delay-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <p className="text-xl sm:text-2xl leading-relaxed font-semibold italic border-l-4 pl-8" style={{ color: "rgba(255,255,255,0.85)", borderColor: "var(--cyan)" }}>
              {t.privacy.introduction}
            </p>

            {t.privacy.sections.map((section: any, idx: number) => (
              <section key={idx} className="space-y-16">
                <div className="space-y-8">
                  <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight uppercase">
                    {section.title}
                  </h2>
                  <div className="h-px w-full opacity-30" style={{ background: "linear-gradient(90deg, var(--cyan), #7B61FF, transparent)" }} />
                </div>
                
                <p className="text-lg sm:text-xl leading-[1.8] tracking-wide" style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                  {section.content}
                </p>

                {section.subsections && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16">
                    {section.subsections.map((sub: any, sIdx: number) => (
                      <div key={sIdx} className="p-10 rounded-[2.5rem] border transition-all duration-500 hover:bg-white/[0.06] hover:-translate-y-2 group" 
                        style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--border)" }}>
                        <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-6 transition-colors group-hover:text-white" style={{ color: "var(--cyan)" }}>{sub.title}</h3>
                        <p className="text-base leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-muted)" }}>{sub.text}</p>
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
