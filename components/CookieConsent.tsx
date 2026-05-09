"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/lib/i18n";
import { Cookie, X } from "lucide-react";
import Link from "next/link";

export default function CookieConsent() {
  const { t } = useLang();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // We use a small delay to make it feel more organic
    const consent = localStorage.getItem("telio-cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("telio-cookie-consent", "accepted");
    setIsVisible(false);
  };

  const declineCookies = () => {
    localStorage.setItem("telio-cookie-consent", "declined");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="fixed bottom-6 right-6 z-[100] max-w-sm w-[calc(100vw-3rem)] sm:w-full"
        >
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/90 backdrop-blur-xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            {/* Glow effect */}
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-[var(--cyan)]/10 blur-3xl pointer-events-none" />
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-[var(--purple)]/5 blur-3xl pointer-events-none" />
            
            <div className="relative flex items-start gap-4">
              <div className="flex-shrink-0 mt-1 p-2.5 rounded-xl bg-gradient-to-br from-[var(--cyan)]/20 to-[var(--purple)]/20 border border-[var(--cyan)]/20">
                <Cookie className="w-5 h-5 text-[var(--cyan)]" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-[var(--text)]">
                    {t.cookies.title}
                  </h3>
                  <button 
                    onClick={() => setIsVisible(false)}
                    className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors p-1 -mr-2"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6">
                  {t.cookies.text}
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={acceptCookies}
                    className="btn-primary px-6 py-2.5 text-sm font-bold w-full sm:w-auto cursor-pointer"
                  >
                    {t.cookies.accept}
                  </button>
                  <button
                    onClick={declineCookies}
                    className="btn-ghost px-6 py-2.5 text-sm font-medium w-full sm:w-auto cursor-pointer"
                  >
                    {t.cookies.decline}
                  </button>
                </div>
                
                <div className="mt-5 flex items-center justify-center sm:justify-start">
                  <Link 
                    href="/privacy" 
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--cyan)] transition-colors flex items-center gap-1 group"
                  >
                    <span className="underline underline-offset-4">{t.cookies.more}</span>
                    <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
