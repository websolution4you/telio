"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/lib/i18n";
import { Cookie } from "lucide-react";
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

    const saveConsent = (consent: "accepted" | "declined") => {
    localStorage.setItem("telio-cookie-consent", consent);
    window.dispatchEvent(new Event("telio-cookie-consent-changed"));
    setIsVisible(false);
  };

  const acceptCookies = () => saveConsent("accepted");
  const declineCookies = () => saveConsent("declined");

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-0 left-0 right-0 z-[100] w-full"
        >
          <div className="relative overflow-hidden border-t border-[var(--border)] bg-[var(--bg-card)]/95 backdrop-blur-xl py-5 px-4 md:px-8 shadow-[0_-10px_50px_rgba(0,0,0,0.5)]">
            {/* Glow effects for premium look */}
            <div className="absolute -top-10 left-1/4 h-24 w-96 rounded-full bg-[var(--cyan)]/10 blur-3xl pointer-events-none" />
            <div className="absolute -top-10 right-1/4 h-24 w-96 rounded-full bg-[var(--purple)]/5 blur-3xl pointer-events-none" />
            
            <div className="relative max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Text Description & Icon */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <Cookie className="w-5 h-5 text-[var(--cyan)] shrink-0" />
                  <h3 className="text-sm md:text-base font-bold text-[var(--text)] tracking-tight">
                    {t.cookies.title}
                  </h3>
                </div>
                <p className="text-xs md:text-sm text-[var(--text-muted)] leading-relaxed">
                  {t.cookies.text}{" "}
                  <Link 
                    href="/privacy" 
                    className="text-[var(--cyan)] hover:text-white underline underline-offset-4 transition-colors font-medium inline-flex items-center gap-0.5 ml-1"
                  >
                    {t.cookies.more}
                    <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
                  </Link>
                </p>
              </div>
              
              {/* Buttons: Accept & Decline side-by-side */}
              <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
                <button
                  onClick={declineCookies}
                  className="btn-ghost py-2.5 px-5 text-sm font-semibold flex-1 md:flex-none justify-center cursor-pointer transition-all hover:bg-white/5 active:scale-[0.99] whitespace-nowrap"
                >
                  {t.cookies.decline}
                </button>
                <button
                  onClick={acceptCookies}
                  className="btn-primary py-2.5 px-5 text-sm font-bold flex-1 md:flex-none justify-center cursor-pointer transition-all active:scale-[0.99] whitespace-nowrap"
                >
                  {t.cookies.accept}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
