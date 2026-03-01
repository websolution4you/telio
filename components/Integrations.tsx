"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

const INTEGRATIONS = [
  {
    name: "OpenAI",
    description: "GPT-4o · Whisper · TTS",
    svg: <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0L4.154 14.5A4.501 4.501 0 0 1 2.34 7.896zm16.597 3.855l-5.843-3.368L15.115 7.2a.076.076 0 0 1 .071 0l4.665 2.695a4.501 4.501 0 0 1-.676 8.123v-5.682a.79.79 0 0 0-.387-.665zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.665-2.695a4.505 4.505 0 0 1 6.677 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.504 4.504 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" /></svg>,
  },
  {
    name: "Twilio",
    description: "Voice · SMS · WhatsApp",
    svg: <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm0 20.52C6.285 20.52 3.48 17.715 3.48 12S6.285 3.48 12 3.48 20.52 6.285 20.52 12 17.715 20.52 12 20.52zm2.88-10.944a2.16 2.16 0 1 0 0-4.32 2.16 2.16 0 0 0 0 4.32zm-5.76 0a2.16 2.16 0 1 0 0-4.32 2.16 2.16 0 0 0 0 4.32zm0 5.808a2.16 2.16 0 1 0 0 4.32 2.16 2.16 0 0 0 0-4.32zm5.76 0a2.16 2.16 0 1 0 0 4.32 2.16 2.16 0 0 0 0-4.32z" /></svg>,
  },
  {
    name: "Google Calendar",
    description: "Availability · Booking · Events",
    svg: <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M18.316 5.684H24v12.632h-5.684V5.684zm-12.632 0H11.4l-1.421 1.7L8.56 5.684H5.684V18.316H11.4l-1.421-1.7 1.421-1.7H5.684V5.684zM12 0L8.684 3.316H15.316L12 0zm0 24l3.316-3.316H8.684L12 24zM0 12l3.316 3.316V8.684L0 12zm24 0l-3.316-3.316v6.632L24 12z" /></svg>,
  },
  {
    name: "Google Maps",
    description: "Geocoding · Routing · ETA",
    svg: <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M12 0C7.802 0 4 3.403 4 7.602 4 11.8 7.469 16.812 12 24c4.531-7.188 8-12.2 8-16.398C20 3.403 16.199 0 12 0zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" /></svg>,
  },
  {
    name: "WhatsApp",
    description: "Driver dispatch · Notifications",
    svg: <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>,
  },
  {
    name: "Supabase",
    description: "PostgreSQL · Auth · Storage",
    svg: <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C.33 12.6.726 13.39 1.424 13.39h9.174a.444.444 0 0 1 .444.444L10.89 22.96c.015.987 1.26 1.41 1.874.638l9.263-11.653c.434-.55.038-1.34-.66-1.34h-9.174a.444.444 0 0 1-.444-.443l.15-9.126Z" /></svg>,
  },
];

export default function Integrations() {
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

  return (
    <section id="integrations" ref={sectionRef} className="relative py-24 overflow-hidden">
      <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "0 2rem" }}>
        <div
          className={`transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          style={{ textAlign: "center", marginBottom: "120px" }}
        >
          <p
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: "var(--text-muted)", marginBottom: "30px" }}
          >
            {t.integrations.sub}
          </p>
          <h2 className="font-bold text-white" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", letterSpacing: "-0.03em" }}>
            {t.integrations.h2a}
            <span className="text-gradient"> {t.integrations.h2b}</span>
          </h2>
        </div>

        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 transition-all duration-700 delay-100 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {INTEGRATIONS.map((integ, i) => (
            <div key={i}
              className="card-hover flex flex-col items-center rounded-2xl text-center"
              style={{ padding: "3rem 1.5rem", background: "rgba(12,12,20,0.7)", border: "1px solid var(--border)", transitionDelay: `${i * 60}ms`, gap: "30px" }}>
              <div style={{ color: "var(--text-muted)" }} className="opacity-60 hover:opacity-100 transition-opacity">
                {integ.svg}
              </div>
              <div>
                <div className="text-xs font-semibold text-white mb-2">{integ.name}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.65rem", lineHeight: 1.5 }}>{integ.description}</div>
              </div>
            </div>
          ))}
        </div>

        <div
          className={`text-center transition-all duration-700 delay-300 ${inView ? "opacity-100" : "opacity-0"}`}
          style={{ marginTop: "80px" }}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {t.integrations.note}{" "}
            <span style={{ color: "var(--cyan)" }}>{t.integrations.noteHighlight}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
