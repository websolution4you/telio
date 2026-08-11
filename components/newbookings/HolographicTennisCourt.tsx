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
      className="group relative flex h-11 w-44 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-yellow-300/80 bg-gradient-to-r from-lime-100/90 via-yellow-100/80 to-lime-100/90 p-1.5 shadow-[0_4px_16px_rgba(234,255,102,0.3)] backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:border-yellow-400 hover:shadow-[0_6px_22px_rgba(202,238,0,0.45)] active:scale-[0.99] md:hidden sm:h-12 sm:w-56"
      title="NTC Antukový kurt (Kliknite pre zopakovanie výmeny loptičky)"
      aria-label="Antukový tenisový kurt"
    >
      {/* Light Soft Tennis-Ball Yellow Glow Background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(234,255,102,0.45),transparent_75%)]" />

      {/* Perspective Antuka Clay Court Container */}
      <div className="relative flex h-full w-full items-center justify-center px-1">
        <svg
          viewBox="0 0 200 80"
          className="h-full w-full overflow-visible drop-shadow-[0_2px_8px_rgba(180,83,9,0.22)]"
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
              <stop offset="0%" stopColor="#D95A3F" />
              <stop offset="50%" stopColor="#E26A4F" />
              <stop offset="100%" stopColor="#C44B31" />
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
            points="22,10 178,10 192,70 8,70"
            fill="url(#clay-court-grad)"
            stroke="#9A3412"
            strokeWidth="1"
            className="transition-all duration-300 group-hover:brightness-105"
          />

          {/* Outer Doubles Boundary Lines (Crisp White) */}
          <polygon
            points="24,12 176,12 189,68 11,68"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.2"
            filter="url(#clay-line-shadow)"
          />

          {/* Singles Sidelines */}
          <line x1="31" y1="12" x2="19" y2="68" stroke="#FFFFFF" strokeWidth="0.9" filter="url(#clay-line-shadow)" />
          <line x1="169" y1="12" x2="181" y2="68" stroke="#FFFFFF" strokeWidth="0.9" filter="url(#clay-line-shadow)" />

          {/* Service Baselines */}
          <line x1="56" y1="12" x2="49" y2="68" stroke="#FFFFFF" strokeWidth="0.9" filter="url(#clay-line-shadow)" />
          <line x1="144" y1="12" x2="151" y2="68" stroke="#FFFFFF" strokeWidth="0.9" filter="url(#clay-line-shadow)" />

          {/* Center Service Line */}
          <line x1="52" y1="40" x2="148" y2="40" stroke="#FFFFFF" strokeWidth="0.9" filter="url(#clay-line-shadow)" />

          {/* Center Service Marks */}
          <line x1="24" y1="40" x2="28" y2="40" stroke="#FFFFFF" strokeWidth="0.9" />
          <line x1="172" y1="40" x2="176" y2="40" stroke="#FFFFFF" strokeWidth="0.9" />

          {/* Middle Net with Posts */}
          <line x1="100" y1="6" x2="100" y2="74" stroke="#1E293B" strokeWidth="2" />
          <line x1="100" y1="12" x2="100" y2="68" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="2,1.5" />
          <circle cx="100" cy="7" r="1.5" fill="#FFFFFF" />
          <circle cx="100" cy="73" r="1.5" fill="#FFFFFF" />

          {/* --- RALLY ANIMATION LAYER (BOTH WAYS) --- */}
          {animating ? (
            <g>
              {/* Shot 1 Arc Trail (Left -> Right) */}
              <path
                d="M 28 50 Q 100 6 168 46"
                fill="none"
                stroke="url(#trail-grad-1)"
                strokeWidth="2.5"
                strokeDasharray="200"
                strokeDashoffset="200"
                className="animate-[rallyArc1_3.2s_easeInOut_forwards]"
              />

              {/* Shot 2 Return Arc Trail (Right -> Left) */}
              <path
                d="M 168 46 Q 100 10 32 48"
                fill="none"
                stroke="url(#trail-grad-2)"
                strokeWidth="2.5"
                strokeDasharray="200"
                strokeDashoffset="200"
                className="animate-[rallyArc2_3.2s_easeInOut_forwards]"
              />

              {/* Animated Tennis Ball (Rally back & forth) */}
              <g className="animate-[rallyBall_3.2s_easeInOut_forwards]">
                <circle cx="0" cy="0" r="4" fill="#CCFF00" filter="url(#ball-glow)" />
                <circle cx="0" cy="0" r="2" fill="#FFFFFF" />
              </g>

              {/* Bounce Ping 1 on Right Baseline (at 1.5s) */}
              <circle
                cx="168"
                cy="46"
                r="8"
                fill="none"
                stroke="#CCFF00"
                strokeWidth="1.5"
                className="animate-[rallyPing1_0.5s_ease-out_1.4s_forwards] opacity-0"
              />

              {/* Bounce Ping 2 on Left Baseline (at 3.0s) */}
              <circle
                cx="32"
                cy="48"
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
                cx="32"
                cy="48"
                r="5.5"
                fill="none"
                stroke="#CCFF00"
                strokeWidth="1"
                className="animate-ping opacity-35"
              />
              <circle cx="32" cy="48" r="3.8" fill="#CCFF00" filter="url(#ball-glow)" />
              <circle cx="32" cy="48" r="2" fill="#FFFFFF" />
            </g>
          )}
        </svg>
      </div>

      {/* Accent Corner Dots */}
      <div className="absolute left-1.5 top-1.5 h-1 w-1 rounded-full bg-yellow-400/80" />
      <div className="absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-yellow-400/80" />
      <div className="absolute bottom-1.5 left-1.5 h-1 w-1 rounded-full bg-yellow-400/80" />
      <div className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-yellow-500/80" />

      {/* Keyframe Animations */}
      <style jsx>{`
        @keyframes rallyArc1 {
          0% {
            stroke-dashoffset: 200;
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
            stroke-dashoffset: 200;
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
            transform: translate(28px, 50px) scale(0.8);
            opacity: 0;
          }
          8% {
            opacity: 1;
          }
          24% {
            transform: translate(100px, 8px) scale(1.3);
          }
          48% {
            transform: translate(168px, 46px) scale(1);
          }
          72% {
            transform: translate(100px, 12px) scale(1.3);
          }
          95% {
            opacity: 1;
          }
          100% {
            transform: translate(32px, 48px) scale(1);
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
            r: 14px;
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
            r: 14px;
            opacity: 0;
            stroke-width: 0.5px;
          }
        }
      `}</style>
    </div>
  );
}
