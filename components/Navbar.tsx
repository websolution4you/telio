"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { lang, setLang, t } = useLang();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [menuOpen]);

  const navLinks = [
    { label: t.nav.howItWorks, href: "#how-it-works" },
    { label: t.nav.useCases, href: "#use-cases" },
    { label: t.nav.features, href: "#features" },
    { label: t.nav.pricing, href: "#pricing" },
    { label: "Dashboard", href: "/dashboard" },
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(5,5,8,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(24px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
      }}
    >
      <div className="h-18 flex items-center justify-between" style={{ maxWidth: "80rem", margin: "0 auto", padding: "0 2rem", height: "68px" }}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <TelioLogo />
          <span className="text-xl font-bold text-white" style={{ letterSpacing: "-0.02em" }}>
            TELIO
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm transition-colors duration-200 hover:text-white"
              style={{ color: "var(--text-muted)" }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right side: lang switcher + CTA */}
        <div className="hidden md:flex items-center gap-4">
          {/* Language switcher */}
          <div
            className="flex items-center rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--border)", background: "rgba(12,12,20,0.8)" }}
          >
            <button
              onClick={() => setLang("sk")}
              className="px-3 py-1.5 text-xs font-semibold transition-all duration-150"
              style={{
                background: lang === "sk" ? "rgba(0,255,209,0.12)" : "transparent",
                color: lang === "sk" ? "var(--cyan)" : "var(--text-muted)",
              }}
            >
              SK
            </button>
            <div className="w-px h-4" style={{ background: "var(--border)" }} />
            <button
              onClick={() => setLang("en")}
              className="px-3 py-1.5 text-xs font-semibold transition-all duration-150"
              style={{
                background: lang === "en" ? "rgba(0,255,209,0.12)" : "transparent",
                color: lang === "en" ? "var(--cyan)" : "var(--text-muted)",
              }}
            >
              EN
            </button>
          </div>

          <a href="#waitlist" className="btn-primary btn-nav font-semibold">
            {t.nav.cta}
          </a>
        </div>

        {/* Mobile: lang + hamburger */}
        <div className="md:hidden flex items-center gap-3">
          <div
            className="flex items-center rounded-md overflow-hidden"
            style={{ border: "1px solid var(--border)" }}
          >
            <button
              onClick={() => setLang("sk")}
              className="px-4 py-2 text-xs font-bold transition-all duration-150"
              style={{
                background: lang === "sk" ? "rgba(0,255,209,0.12)" : "transparent",
                color: lang === "sk" ? "var(--cyan)" : "var(--text-muted)",
              }}
            >
              SK
            </button>
            <div className="w-px h-3" style={{ background: "var(--border)" }} />
            <button
              onClick={() => setLang("en")}
              className="px-4 py-2 text-xs font-bold transition-all duration-150"
              style={{
                background: lang === "en" ? "rgba(0,255,209,0.12)" : "transparent",
                color: lang === "en" ? "var(--cyan)" : "var(--text-muted)",
              }}
            >
              EN
            </button>
          </div>
          <button
            className="flex flex-col gap-1.5 p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className="block w-5 h-px bg-white transition-all duration-200"
              style={{ transform: menuOpen ? "rotate(45deg) translate(2px, 2px)" : "none" }} />
            <span className="block w-5 h-px bg-white transition-all duration-200"
              style={{ opacity: menuOpen ? 0 : 1 }} />
            <span className="block w-5 h-px bg-white transition-all duration-200"
              style={{ transform: menuOpen ? "rotate(-45deg) translate(2px, -2px)" : "none" }} />
          </button>
        </div>
      </div>

      {/* Mobile Side Menu */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-500 ease-in-out md:hidden ${menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        {/* Backdrop overlay */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          onClick={() => setMenuOpen(false)}
        />

        {/* Side Panel */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-[85%] max-w-[320px] bg-[#050508] border-r border-white/10 shadow-[20px_0_50px_rgba(0,0,0,0.5)] transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex flex-col h-full p-8 px-6">
            {/* Menu Header with Logo */}
            <div className="flex items-center justify-between" style={{ marginBottom: "80px" }}>
              <div className="flex items-center gap-2.5">
                <TelioLogo />
                <span className="text-xl font-bold text-white tracking-tight">TELIO</span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 text-white/50 hover:text-white transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            {/* Nav Links */}
            <nav className="flex flex-col gap-6">
              {navLinks.map((link, i) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`group relative flex items-center justify-center px-6 rounded-xl transition-all duration-300 ${menuOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
                  style={{
                    color: "white",
                    transitionDelay: `${150 + i * 50}ms`,
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    height: "64px"
                  }}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="relative z-10 font-semibold tracking-tight transition-colors uppercase text-lg">{link.label}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-xl" />
                </a>
              ))}

              {/* Získať prístup Button (Matches Nav Gap) */}
              <a
                href="#waitlist"
                className="btn-primary w-full rounded-xl flex items-center justify-center font-semibold text-lg shadow-[0_0_20px_rgba(0,255,209,0.15)]"
                style={{ height: "64px" }}
                onClick={() => setMenuOpen(false)}
              >
                {t.nav.cta}
              </a>
            </nav>

            {/* Bottom Copyright */}
            <div className={`mt-auto transition-all duration-500 delay-500 ${menuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <p className="text-center text-xs text-white/20 tracking-wide uppercase font-semibold" style={{ marginTop: "80px" }}>
                © 2025 TELIO · SLOVAKIA
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function TelioLogo() {
  return (
    <svg width="30" height="30" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="7" fill="url(#logo-grad)" />
      <rect x="5" y="12" width="2.5" height="4" rx="1.25" fill="rgba(5,5,8,0.9)" />
      <rect x="9" y="9" width="2.5" height="10" rx="1.25" fill="rgba(5,5,8,0.9)" />
      <rect x="13" y="6" width="2.5" height="16" rx="1.25" fill="rgba(5,5,8,0.9)" />
      <rect x="17" y="9" width="2.5" height="10" rx="1.25" fill="rgba(5,5,8,0.9)" />
      <rect x="21" y="12" width="2.5" height="4" rx="1.25" fill="rgba(5,5,8,0.9)" />
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00FFD1" /><stop offset="1" stopColor="#7B61FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}
