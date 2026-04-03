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

      <div className="relative z-10 pt-32 pb-20 px-6 sm:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ marginBottom: "64px" }}>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-6" style={{ letterSpacing: "-0.04em" }}>
              {t.privacy.title}
            </h1>
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
              {t.privacy.lastUpdated}
            </p>
          </div>

          {/* Content */}
          <div className={`space-y-12 transition-all duration-700 delay-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <p className="text-lg leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {t.privacy.introduction}
            </p>

            {t.privacy.sections.map((section: any, idx: number) => (
              <section key={idx} className="space-y-6">
                <h2 className="text-2xl font-bold text-white pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                  {section.title}
                </h2>
                <p className="leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {section.content}
                </p>
                {section.subsections && (
                  <div className="grid grid-cols-1 gap-6 mt-8">
                    {section.subsections.map((sub: any, sIdx: number) => (
                      <div key={sIdx} className="p-6 rounded-2xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border)" }}>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">{sub.title}</h3>
                        <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>{sub.text}</p>
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
