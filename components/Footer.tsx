"use client";

import { useLang } from "@/lib/i18n";

export default function Footer() {
  const { t } = useLang();
  const year = new Date().getFullYear();

  const companyHrefs = ["#", "/privacy", "#", "#"];

  return (
    <footer className="relative overflow-hidden" style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--sp-section-py)", paddingBottom: "2.5rem" }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 50% 60% at 50% 0%, rgba(0,255,209,0.03) 0%, transparent 70%)" }} />

      <div className="relative" style={{ maxWidth: "80rem", margin: "0 auto", padding: "0 2rem" }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-20">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2.5" style={{ marginBottom: "32px" }}>
              <LogoMark />
              <span className="text-xl font-bold text-white" style={{ letterSpacing: "-0.02em" }}>TELIO</span>
            </div>
            <p className="text-sm leading-relaxed"
              style={{ color: "var(--text-muted)", maxWidth: "260px", lineHeight: 1.7, marginBottom: "40px" }}>
              {t.footer.tagline}
            </p>
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
              <span className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: "var(--cyan)" }} />
              &nbsp;{t.footer.status}
            </div>
          </div>

          {/* Links (formerly Company) */}
          <div>
            <ul className="flex flex-col" style={{ gap: "18px", marginTop: "4px" }}>
              {t.footer.companyLinks.map((item, i) => (
                <li key={item}>
                  <a href={companyHrefs[i]} className="text-sm transition-colors duration-200 hover:text-white"
                    style={{ color: "var(--text-muted)" }}>{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderTop: "1px solid var(--border)", marginTop: "48px", paddingTop: "48px" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {t.footer.copyright.replace("2025", String(year))}
          </p>
          <div className="flex items-center gap-4">
            <a href="mailto:hello@telio.sk" className="text-xs transition-colors duration-200 hover:text-white"
              style={{ color: "var(--text-muted)" }}>hello@telio.sk</a>
            <span style={{ color: "var(--border)" }}>·</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>telio.sk</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="7" fill="url(#footer-logo-grad)" />
      <rect x="5" y="12" width="2.5" height="4" rx="1.25" fill="rgba(5,5,8,0.9)" />
      <rect x="9" y="9" width="2.5" height="10" rx="1.25" fill="rgba(5,5,8,0.9)" />
      <rect x="13" y="6" width="2.5" height="16" rx="1.25" fill="rgba(5,5,8,0.9)" />
      <rect x="17" y="9" width="2.5" height="10" rx="1.25" fill="rgba(5,5,8,0.9)" />
      <rect x="21" y="12" width="2.5" height="4" rx="1.25" fill="rgba(5,5,8,0.9)" />
      <defs>
        <linearGradient id="footer-logo-grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00FFD1" /><stop offset="1" stopColor="#7B61FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}
