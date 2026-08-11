"use client";

import React, { useEffect, useState } from "react";

export default function HolographicTennisCourt() {
  const [hasAnimated, setHasAnimated] = useState(true); // default true for SSR safety
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    try {
      const alreadyPlayed = sessionStorage.getItem("ntc_holo_court_animated");
      if (!alreadyPlayed) {
        setHasAnimated(false);
        setAnimating(true);
        const timer = setTimeout(() => {
          setAnimating(false);
          setHasAnimated(true);
          sessionStorage.setItem("ntc_holo_court_animated", "true");
        }, 2000); // 2.0s animation duration
        return () => clearTimeout(timer);
      }
    } catch {
      setHasAnimated(true);
    }
  }, []);

  const triggerReplay = () => {
    if (animating) return;
    setHasAnimated(false);
    setAnimating(true);
    setTimeout(() => {
      setAnimating(false);
      setHasAnimated(true);
    }, 2000);
  };

  return (
    <div
      onClick={triggerReplay}
      className="group relative flex h-11 w-36 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-950/85 p-1.5 shadow-[0_0_20px_rgba(6,182,212,0.18)] backdrop-blur-md transition-all duration-300 hover:border-cyan-400/60 hover:shadow-[0_0_25px_rgba(56,189,248,0.35)] sm:h-12 sm:w-56"
      title="NTC Holo-Court (Kliknite pre zopakovanie animácie)"
      aria-label="Futuristický holografický tenisový kurt"
    >
      {/* Background Holographic Glow & Grid Lines */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.18),transparent_70%)]" />
      
      {/* Holographic Scanline Texture */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] opacity-30" />

      {/* Isometric/Perspective Holographic Court Container */}
      <div className="relative flex h-full w-full items-center justify-center px-1">
        <svg
          viewBox="0 0 200 80"
          className="h-full w-full overflow-visible drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Holographic Line Glow Filter */}
            <filter id="holo-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Neon Ball Glow */}
            <filter id="ball-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Linear Gradient for Court Surface */}
            <linearGradient id="court-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0F172A" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#0369A1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0.8" />
            </linearGradient>

            {/* Ball Motion Trail Gradient */}
            <linearGradient id="trail-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#CCFF00" stopOpacity="0" />
              <stop offset="70%" stopColor="#CCFF00" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Perspective Court Floor */}
          <polygon
            points="25,12 175,12 190,68 10,68"
            fill="url(#court-grad)"
            stroke="#38BDF8"
            strokeWidth="1.2"
            strokeOpacity="0.8"
            filter="url(#holo-glow)"
          />

          {/* Outer Doubles Boundary Lines */}
          <polygon
            points="27,14 173,14 187,66 13,66"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="1"
            strokeOpacity="0.9"
          />

          {/* Singles Sidelines */}
          <line x1="33" y1="14" x2="21" y2="66" stroke="#38BDF8" strokeWidth="0.8" strokeOpacity="0.7" />
          <line x1="167" y1="14" x2="179" y2="66" stroke="#38BDF8" strokeWidth="0.8" strokeOpacity="0.7" />

          {/* Service Baselines */}
          <line x1="58" y1="14" x2="52" y2="66" stroke="#38BDF8" strokeWidth="0.8" strokeOpacity="0.7" />
          <line x1="142" y1="14" x2="148" y2="66" stroke="#38BDF8" strokeWidth="0.8" strokeOpacity="0.7" />

          {/* Center Service Line */}
          <line x1="55" y1="40" x2="145" y2="40" stroke="#38BDF8" strokeWidth="0.8" strokeOpacity="0.7" />

          {/* Middle Net with Posts */}
          <line x1="100" y1="8" x2="100" y2="72" stroke="#00FF9D" strokeWidth="1.8" filter="url(#holo-glow)" />
          {/* Net Mesh Accents */}
          <line x1="100" y1="14" x2="100" y2="66" stroke="#FFFFFF" strokeWidth="0.6" strokeDasharray="2,2" strokeOpacity="0.8" />
          <circle cx="100" cy="9" r="1.5" fill="#00FF9D" />
          <circle cx="100" cy="71" r="1.5" fill="#00FF9D" />

          {/* Center Service Mark Marks */}
          <line x1="27" y1="40" x2="31" y2="40" stroke="#38BDF8" strokeWidth="0.8" />
          <line x1="169" y1="40" x2="173" y2="40" stroke="#38BDF8" strokeWidth="0.8" />

          {/* --- ANIMATION LAYER --- */}
          {animating ? (
            <g>
              {/* Parabolic Holographic Arc Motion Trail */}
              <path
                d="M 30 50 Q 100 8 170 50"
                fill="none"
                stroke="url(#trail-grad)"
                strokeWidth="2.5"
                strokeDasharray="200"
                strokeDashoffset="200"
                className="animate-[holoArc_1.8s_easeInOut_forwards]"
                filter="url(#holo-glow)"
              />

              {/* Animated Tennis Ball moving along the parabolic path */}
              <g className="animate-[holoBall_1.8s_easeInOut_forwards]">
                <circle cx="0" cy="0" r="4" fill="#CCFF00" filter="url(#ball-glow)" />
                <circle cx="0" cy="0" r="2" fill="#FFFFFF" />
              </g>

              {/* Landing Impact Shockwave (triggers near 1.6s) */}
              <circle
                cx="170"
                cy="50"
                r="8"
                fill="none"
                stroke="#00FF9D"
                strokeWidth="1.5"
                className="animate-[holoPing_0.6s_ease-out_1.5s_forwards] opacity-0"
              />
            </g>
          ) : (
            /* Static Mode: Ambient Glowing Holographic Ball Resting on Right Baseline Court */
            <g className="transition-opacity duration-500">
              {/* Soft pulse ring under resting ball */}
              <circle
                cx="165"
                cy="48"
                r="5"
                fill="none"
                stroke="#00FF9D"
                strokeWidth="0.8"
                className="animate-ping opacity-30"
              />
              <circle cx="165" cy="48" r="3.5" fill="#CCFF00" filter="url(#ball-glow)" />
              <circle cx="165" cy="48" r="1.8" fill="#FFFFFF" />
            </g>
          )}
        </svg>
      </div>

      {/* Corner Holographic Accent Lines */}
      <div className="absolute left-1 top-1 h-1.5 w-1.5 rounded-tl border-l border-t border-cyan-400/80" />
      <div className="absolute right-1 top-1 h-1.5 w-1.5 rounded-tr border-r border-t border-cyan-400/80" />
      <div className="absolute bottom-1 left-1 h-1.5 w-1.5 rounded-bl border-b border-l border-cyan-400/80" />
      <div className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-br border-b border-r border-cyan-400/80" />

      {/* CSS Keyframe Animations Inline */}
      <style jsx>{`
        @keyframes holoArc {
          0% {
            stroke-dashoffset: 200;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        @keyframes holoBall {
          0% {
            transform: translate(30px, 50px) scale(0.7);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            transform: translate(100px, 14px) scale(1.3);
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translate(165px, 48px) scale(1);
            opacity: 1;
          }
        }
        @keyframes holoPing {
          0% {
            r: 2px;
            opacity: 1;
            stroke-width: 2px;
          }
          100% {
            r: 16px;
            opacity: 0;
            stroke-width: 0.5px;
          }
        }
      `}</style>
    </div>
  );
}
