"use client";

import React, { useEffect, useState } from "react";

export default function HolographicTennisCourt() {
  const [hasAnimated, setHasAnimated] = useState(true);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    try {
      const alreadyPlayed = sessionStorage.getItem("ntc_clay_court_animated");
      if (!alreadyPlayed) {
        setHasAnimated(false);
        setAnimating(true);
        const timer = setTimeout(() => {
          setAnimating(false);
          setHasAnimated(true);
          sessionStorage.setItem("ntc_clay_court_animated", "true");
        }, 2000);
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
      className="group relative flex h-11 w-44 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-orange-200/80 bg-gradient-to-r from-orange-50/90 via-amber-50/70 to-orange-50/90 p-1.5 shadow-[0_4px_16px_rgba(249,115,22,0.12)] backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:border-orange-300 hover:shadow-[0_6px_22px_rgba(249,115,22,0.22)] active:scale-[0.99] sm:h-12 sm:w-64 lg:w-72"
      title="NTC Antukový kurt (Kliknite pre zopakovanie animácie loptičky)"
      aria-label="Antukový tenisový kurt"
    >
      {/* Light Soft Orange Glow Background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.18),transparent_75%)]" />

      {/* Perspective Antuka Clay Court Container */}
      <div className="relative flex h-full w-full items-center justify-center px-1">
        <svg
          viewBox="0 0 200 80"
          className="h-full w-full overflow-visible drop-shadow-[0_2px_8px_rgba(194,65,12,0.25)]"
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

            {/* Motion Trail Gradient */}
            <linearGradient id="trail-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#CCFF00" stopOpacity="0" />
              <stop offset="60%" stopColor="#CCFF00" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#F97316" stopOpacity="1" />
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

          {/* --- ANIMATION LAYER --- */}
          {animating ? (
            <g>
              {/* Parabolic Holographic Arc Motion Trail */}
              <path
                d="M 28 50 Q 100 6 172 48"
                fill="none"
                stroke="url(#trail-grad)"
                strokeWidth="2.5"
                strokeDasharray="200"
                strokeDashoffset="200"
                className="animate-[holoArc_1.8s_easeInOut_forwards]"
              />

              {/* Animated Yellow Tennis Ball moving along the parabolic path */}
              <g className="animate-[holoBall_1.8s_easeInOut_forwards]">
                <circle cx="0" cy="0" r="4.2" fill="#CCFF00" filter="url(#ball-glow)" />
                <circle cx="0" cy="0" r="2.2" fill="#FFFFFF" />
              </g>

              {/* Landing Impact Shockwave (triggers near 1.5s) */}
              <circle
                cx="172"
                cy="48"
                r="8"
                fill="none"
                stroke="#F97316"
                strokeWidth="1.5"
                className="animate-[holoPing_0.6s_ease-out_1.5s_forwards] opacity-0"
              />
            </g>
          ) : (
            /* Static Mode: Classic Tennis Ball Resting on Right Baseline Court */
            <g className="transition-opacity duration-500">
              {/* Soft ambient pulse ring under resting ball */}
              <circle
                cx="168"
                cy="46"
                r="5.5"
                fill="none"
                stroke="#F97316"
                strokeWidth="1"
                className="animate-ping opacity-35"
              />
              <circle cx="168" cy="46" r="3.8" fill="#CCFF00" filter="url(#ball-glow)" />
              <circle cx="168" cy="46" r="2" fill="#FFFFFF" />
            </g>
          )}
        </svg>
      </div>

      {/* Subtle Corner Accent Dots */}
      <div className="absolute left-1.5 top-1.5 h-1 w-1 rounded-full bg-orange-300/80" />
      <div className="absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-orange-300/80" />
      <div className="absolute bottom-1.5 left-1.5 h-1 w-1 rounded-full bg-orange-300/80" />
      <div className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-orange-400/80" />

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
            transform: translate(28px, 50px) scale(0.7);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            transform: translate(100px, 12px) scale(1.3);
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translate(168px, 46px) scale(1);
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
