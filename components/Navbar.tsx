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

  const navLinks = [
    { label: t.nav.howItWorks, href: "#how-it-works" },
    { label: t.nav.useCases, href: "#use-cases" },
    { label: t.nav.features, href: "#features" },
    { label: t.nav.pricing, href: "#pricing" },
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

          <a href="#waitlist" className="btn-primary text-sm font-semibold">
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
              className="px-8 py-4 text-xs font-bold transition-all duration-150"
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
              className="px-8 py-4 text-xs font-bold transition-all duration-150"
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

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden px-8 pb-6 pt-2"
          style={{ background: "rgba(5,5,8,0.97)", borderBottom: "1px solid var(--border)" }}>
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}
              className="block py-3.5 text-sm border-b"
              style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}
              onClick={() => setMenuOpen(false)}>
              {link.label}
            </a>
          ))}
          <a href="#waitlist"
            className="btn-primary block text-center text-sm font-semibold mt-5"
            onClick={() => setMenuOpen(false)}>
            {t.nav.cta}
          </a>
        </div>
      )}
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
