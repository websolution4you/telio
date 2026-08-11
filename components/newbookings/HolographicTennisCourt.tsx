"use client";

import React, { useEffect, useState } from "react";

export default function HolographicTennisCourt() {
  const [hasAnimated, setHasAnimated] = useState(true);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    try {
      const alreadyPlayed = sessionStorage.getItem("ntc_rally_court_animated");
      if (!alreadyPlayed) {
        setHasAnimated(false);
        setAnimating(true);
        const timer = setTimeout(() => {
          setAnimating(false);
          setHasAnimated(true);
          sessionStorage.setItem("ntc_rally_court_animated", "true");
        }, 3200);
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
    }, 3200);
  };

  return (
    /* HIDDEN ON DESKTOP (md:hidden) - VISIBLE ONLY ON MOBILE / APP VIEW */
    <div
      onClick={triggerReplay}
      className="group relative flex h-11 w-48 cursor-pointer items-center justify-center overflow-visible bg-transparent p-0 transition-transform duration-300 hover:scale-[1.04] active:scale-95 md:hidden sm:h-12 sm:w-64 lg:w-72"
      title="NTC Antukový kurt (Kliknite pre zopakovanie výmeny loptičky)"
      aria-label="Antukový tenisový kurt"
    >
      {/* Soft Borderless Neon-Yellow Aura Glow */}
      <div className="pointer-events-none absolute -inset-3 rounded-full bg-gradient-to-r from-[#CCFF00]/0 via-[#CCFF00]/30 to-[#CCFF00]/0 blur-xl transition-opacity duration-300 group-hover:opacity-100" />

      {/* Pure Floating Perspective Antuka Clay Court Container */}
      <div className="relative flex h-full w-full items-center justify-center">
        <svg
          viewBox="0 0 240 75"
          className="h-full w-full overflow-visible drop-shadow-[0_4px_12px_rgba(180,83,9,0.28)]"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Soft Shadow Filter for Lines */}
            <filter id="clay-line-shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#7C2D12" floodOpacity="0.4" />
            </filter>

            {/* Neon Ball Glow */}
            <filter id="ball-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Terracotta Antuka Clay Court Surface Gradient */}
            <linearGradient id="clay-court-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#DC5B40" />
              <stop offset="50%" stopColor="#E66B50" />
              <stop offset="100%" stopColor="#C74C32" />
            </linearGradient>

            {/* Ball Motion Trail Gradient 1 (Left -> Right) */}
            <linearGradient id="trail-grad-1" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#CCFF00" stopOpacity="0" />
              <stop offset="70%" stopColor="#EAB308" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#CCFF00" stopOpacity="1" />
            </linearGradient>

            {/* Ball Motion Trail Gradient 2 (Right -> Left Return) */}
            <linearGradient id="trail-grad-2" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor="#CCFF00" stopOpacity="0" />
              <stop offset="70%" stopColor="#EAB308" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#CCFF00" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Perspective Clay Court Floor */}
          <polygon
            points="18,8 222,8 236,67 4,67"
            fill="url(#clay-court-grad)"
            stroke="#9A3412"
            strokeWidth="1"
            className="transition-all duration-300 group-hover:brightness-105"
          />

          {/* Outer Doubles Boundary Lines (Crisp White) */}
          <polygon
            points="20,10 220,10 233,65 7,65"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.2"
            filter="url(#clay-line-shadow)"
          />

          {/* Singles Sidelines */}
          <line x1="28" y1="10" x2="16" y2="65" stroke="#FFFFFF" strokeWidth="0.9" filter="url(#clay-line-shadow)" />
          <line x1="212" y1="10" x2="224" y2="65" stroke="#FFFFFF" strokeWidth="0.9" filter="url(#clay-line-shadow)" />

          {/* Service Baselines */}
          <line x1="62" y1="10" x2="54" y2="65" stroke="#FFFFFF" strokeWidth="0.9" filter="url(#clay-line-shadow)" />
          <line x1="178" y1="10" x2="186" y2="65" stroke="#FFFFFF" strokeWidth="0.9" filter="url(#clay-line-shadow)" />

          {/* Center Service Line */}
          <line x1="58" y1="37.5" x2="182" y2="37.5" stroke="#FFFFFF" strokeWidth="0.9" filter="url(#clay-line-shadow)" />

          {/* Center Service Marks */}
          <line x1="20" y1="37.5" x2="24" y2="37.5" stroke="#FFFFFF" strokeWidth="0.9" />
          <line x1="216" y1="37.5" x2="220" y2="37.5" stroke="#FFFFFF" strokeWidth="0.9" />

          {/* Middle Net with Posts */}
          <line x1="120" y1="5" x2="120" y2="71" stroke="#0F172A" strokeWidth="2.2" />
          <line x1="120" y1="10" x2="120" y2="65" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="2,1.5" />
          <circle cx="120" cy="6" r="1.5" fill="#FFFFFF" />
          <circle cx="120" cy="70" r="1.5" fill="#FFFFFF" />

          {/* --- RALLY ANIMATION LAYER (BOTH WAYS) --- */}
          {animating ? (
            <g>
              {/* Shot 1 Arc Trail (Left -> Right) */}
              <path
                d="M 24 48 Q 120 4 216 44"
                fill="none"
                stroke="url(#trail-grad-1)"
                strokeWidth="2.5"
                strokeDasharray="240"
                strokeDashoffset="240"
                className="animate-[rallyArc1_3.2s_easeInOut_forwards]"
              />

              {/* Shot 2 Return Arc Trail (Right -> Left) */}
              <path
                d="M 216 44 Q 120 8 28 46"
                fill="none"
                stroke="url(#trail-grad-2)"
                strokeWidth="2.5"
                strokeDasharray="240"
                strokeDashoffset="240"
                className="animate-[rallyArc2_3.2s_easeInOut_forwards]"
              />

              {/* Animated Tennis Ball (Rally back & forth) */}
              <g className="animate-[rallyBall_3.2s_easeInOut_forwards]">
                <circle cx="0" cy="0" r="4.2" fill="#CCFF00" filter="url(#ball-glow)" />
                <circle cx="0" cy="0" r="2.2" fill="#FFFFFF" />
              </g>

              {/* Bounce Ping 1 on Right Baseline (at 1.5s) */}
              <circle
                cx="216"
                cy="44"
                r="8"
                fill="none"
                stroke="#CCFF00"
                strokeWidth="1.5"
                className="animate-[rallyPing1_0.5s_ease-out_1.4s_forwards] opacity-0"
              />

              {/* Bounce Ping 2 on Left Baseline (at 3.0s) */}
              <circle
                cx="28"
                cy="46"
                r="8"
                fill="none"
                stroke="#CCFF00"
                strokeWidth="1.5"
                className="animate-[rallyPing2_0.5s_ease-out_2.9s_forwards] opacity-0"
              />
            </g>
          ) : (
            /* Static Mode: Tennis Ball Resting on Left Court Baseline */
            <g className="transition-opacity duration-500">
              <circle
                cx="28"
                cy="46"
                r="5.5"
                fill="none"
                stroke="#CCFF00"
                strokeWidth="1"
                className="animate-ping opacity-35"
              />
              <circle cx="28" cy="46" r="3.8" fill="#CCFF00" filter="url(#ball-glow)" />
              <circle cx="28" cy="46" r="2" fill="#FFFFFF" />
            </g>
          )}
        </svg>
      </div>

      {/* Keyframe Animations */}
      <style jsx>{`
        @keyframes rallyArc1 {
          0% {
            stroke-dashoffset: 240;
            opacity: 1;
          }
          45% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          58% {
            opacity: 0;
          }
          100% {
            opacity: 0;
          }
        }
        @keyframes rallyArc2 {
          0%,
          48% {
            stroke-dashoffset: 240;
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          92% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
        @keyframes rallyBall {
          0% {
            transform: translate(24px, 48px) scale(0.8);
            opacity: 0;
          }
          8% {
            opacity: 1;
          }
          24% {
            transform: translate(120px, 6px) scale(1.35);
          }
          48% {
            transform: translate(216px, 44px) scale(1);
          }
          72% {
            transform: translate(120px, 10px) scale(1.35);
          }
          95% {
            opacity: 1;
          }
          100% {
            transform: translate(28px, 46px) scale(1);
            opacity: 1;
          }
        }
        @keyframes rallyPing1 {
          0% {
            r: 2px;
            opacity: 1;
            stroke-width: 2px;
          }
          100% {
            r: 15px;
            opacity: 0;
            stroke-width: 0.5px;
          }
        }
        @keyframes rallyPing2 {
          0% {
            r: 2px;
            opacity: 1;
            stroke-width: 2px;
          }
          100% {
            r: 15px;
            opacity: 0;
            stroke-width: 0.5px;
          }
        }
      `}</style>
    </div>
  );
}
