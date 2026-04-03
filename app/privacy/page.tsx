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

      {/* Main Content Container with Absolute Vertical Space & Flex Center */}
      <div 
        className="relative z-10 w-full flex flex-col items-center px-6 sm:px-12"
        style={{ paddingTop: '300px', paddingBottom: '300px' }}
      >
        <div 
          className="w-full flex flex-col items-start"
          style={{ maxWidth: '850px' }}
        >
          {/* Header Section */}
          <div 
            className={`transition-all duration-1000 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`} 
            style={{ marginBottom: "160px" }}
          >
            <h1 className="text-4xl sm:text-7xl font-black text-white mb-12" style={{ letterSpacing: "-0.05em", lineHeight: 1 }}>
              {t.privacy.title}
            </h1>
            <div className="h-1.5 w-32 rounded-full mb-12" style={{ background: "linear-gradient(90deg, var(--cyan), var(--purple))" }} />
            <p className="text-sm font-black uppercase tracking-[0.3em] opacity-30" style={{ color: "var(--text-muted)" }}>
              {t.privacy.lastUpdated}
            </p>
          </div>

          {/* Content Body Section */}
          <div 
            className={`w-full space-y-40 transition-all duration-1000 delay-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
          >
            <p className="text-2xl sm:text-3xl leading-[1.4] font-medium border-l-8 pl-12" style={{ color: "rgba(255,255,255,0.9)", borderColor: "var(--cyan)" }}>
              {t.privacy.introduction}
            </p>

            {t.privacy.sections.map((section: any, idx: number) => (
              <section key={idx} className="w-full" style={{ marginBottom: '140px' }}>
                <div style={{ marginBottom: "60px" }}>
                  <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tighter uppercase mb-6">
                    {section.title}
                  </h2>
                  <div className="h-px w-full opacity-40 shadow-[0_0_15px_rgba(0,255,209,0.3)]" style={{ background: "linear-gradient(90deg, var(--cyan), #7B61FF, transparent)" }} />
                </div>
                
                <div style={{ paddingLeft: '8px', marginBottom: '80px' }}>
                  <p className="text-lg sm:text-2xl leading-[1.9] tracking-normal" style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                    {section.content}
                  </p>
                </div>

                {section.subsections && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-20">
                    {section.subsections.map((sub: any, sIdx: number) => (
                      <div key={sIdx} className="p-12 rounded-[3rem] border transition-all duration-500 hover:bg-white/[0.08] hover:-translate-y-3 group backdrop-blur-md" 
                        style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border)" }}>
                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-8 transition-colors group-hover:text-white" style={{ color: "var(--cyan)" }}>{sub.title}</h3>
                        <p className="text-lg leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-muted)" }}>{sub.text}</p>
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
