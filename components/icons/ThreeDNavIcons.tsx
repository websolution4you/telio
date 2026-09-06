"use client";

import { useId } from "react";

/**
 * 3D Avatar Head Icon for "Používatelia"
 * Sleek isometric/dimensional stylized avatar head & shoulders with glossy lighting.
 */
export function ThreeDUserAvatarIcon({ className = "h-7 w-7" }: { className?: string }) {
  const id = useId().replace(/:/g, "_");

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Ambient glow */}
        <filter id={`glow_${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#06b6d4" floodOpacity="0.35" />
        </filter>

        {/* Head Sphere 3D Gradient */}
        <radialGradient
          id={`headGrad_${id}`}
          cx="38%"
          cy="32%"
          r="65%"
          fx="35%"
          fy="30%"
        >
          <stop offset="0%" stopColor="#cffafe" />
          <stop offset="25%" stopColor="#38bdf8" />
          <stop offset="70%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </radialGradient>

        {/* Shoulders 3D Gradient */}
        <linearGradient id={`torsoGrad_${id}`} x1="12" y1="28" x2="36" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#075985" />
        </linearGradient>

        {/* Top Torso Bevel Highlight */}
        <linearGradient id={`torsoBevel_${id}`} x1="14" y1="28" x2="34" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
        </linearGradient>

        {/* Hair/Cap 3D Accent */}
        <linearGradient id={`hairGrad_${id}`} x1="14" y1="8" x2="34" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
      </defs>

      {/* Floating Ambient Shadow */}
      <ellipse cx="24" cy="43" rx="14" ry="3.5" fill="#0f172a" fillOpacity="0.18" />

      {/* 3D Shoulders / Torso */}
      <g filter={`url(#glow_${id})`}>
        <path
          d="M10 40C10 33.3726 15.3726 28 22 28H26C32.6274 28 38 33.3726 38 40V41C38 41.5523 37.5523 42 37 42H11C10.4477 42 10 41.5523 10 41V40Z"
          fill={`url(#torsoGrad_${id})`}
        />
        {/* Torso Top Highlight */}
        <path
          d="M12 39C12 34 16.5 29.5 22.5 29.5H25.5C31.5 29.5 36 34 36 39"
          stroke={`url(#torsoBevel_${id})`}
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* 3D Head Sphere */}
        <circle cx="24" cy="18" r="10" fill={`url(#headGrad_${id})`} />

        {/* Specular Highlight on Head */}
        <ellipse cx="21" cy="14" rx="3.5" ry="2.2" transform="rotate(-25 21 14)" fill="#ffffff" fillOpacity="0.75" />
        <circle cx="20" cy="13" r="1" fill="#ffffff" fillOpacity="0.9" />

        {/* Neck collar cutout / shadow */}
        <path
          d="M20.5 25.5C22 27 26 27 27.5 25.5"
          stroke="#075985"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

/**
 * 3D Chart / Graph Icon for "Štatistiky"
 * Isometric tiered 3D bars with glowing facets and upward trend arrow.
 */
export function ThreeDChartIcon({ className = "h-7 w-7" }: { className?: string }) {
  const id = useId().replace(/:/g, "_");

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Ambient glow */}
        <filter id={`glow_${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#6366f1" floodOpacity="0.4" />
        </filter>

        {/* Bar 1 (Left - Indigo) */}
        <linearGradient id={`b1_front_${id}`} x1="8" y1="24" x2="16" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id={`b1_top_${id}`} x1="8" y1="21" x2="16" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e0e7ff" />
          <stop offset="100%" stopColor="#a5b4fc" />
        </linearGradient>
        <linearGradient id={`b1_side_${id}`} x1="16" y1="22" x2="20" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4338ca" />
          <stop offset="100%" stopColor="#312e81" />
        </linearGradient>

        {/* Bar 2 (Middle - Violet/Purple) */}
        <linearGradient id={`b2_front_${id}`} x1="19" y1="17" x2="27" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <linearGradient id={`b2_top_${id}`} x1="19" y1="13" x2="27" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f3e8ff" />
          <stop offset="100%" stopColor="#d8b4fe" />
        </linearGradient>
        <linearGradient id={`b2_side_${id}`} x1="27" y1="15" x2="31" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6d28d9" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>

        {/* Bar 3 (Right - Cyan/Teal Leader) */}
        <linearGradient id={`b3_front_${id}`} x1="30" y1="10" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id={`b3_top_${id}`} x1="30" y1="6" x2="38" y2="11" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#7dd3fc" />
        </linearGradient>
        <linearGradient id={`b3_side_${id}`} x1="38" y1="8" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0369a1" />
          <stop offset="100%" stopColor="#0c4a6e" />
        </linearGradient>

        {/* Upward Trend Arrow Gradient */}
        <linearGradient id={`arrowGrad_${id}`} x1="8" y1="28" x2="42" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>

      {/* Ground Shadow */}
      <ellipse cx="24" cy="42" rx="16" ry="3.5" fill="#0f172a" fillOpacity="0.18" />

      <g filter={`url(#glow_${id})`}>
        {/* === Bar 1 (Left - Lower) === */}
        {/* Front Face */}
        <path d="M8 25L15 22V39L8 41V25Z" fill={`url(#b1_front_${id})`} />
        {/* Side Face */}
        <path d="M15 22L19 24V40L15 39V22Z" fill={`url(#b1_side_${id})`} />
        {/* Top Face */}
        <path d="M8 25L12 23L19 24L15 22L8 25Z" fill={`url(#b1_top_${id})`} />

        {/* === Bar 2 (Middle - Medium) === */}
        {/* Front Face */}
        <path d="M19 17L26 14V39L19 41V17Z" fill={`url(#b2_front_${id})`} />
        {/* Side Face */}
        <path d="M26 14L30 16V40L26 39V14Z" fill={`url(#b2_side_${id})`} />
        {/* Top Face */}
        <path d="M19 17L23 15L30 16L26 14L19 17Z" fill={`url(#b2_top_${id})`} />

        {/* === Bar 3 (Right - Highest Peak) === */}
        {/* Front Face */}
        <path d="M30 10L37 7V39L30 41V10Z" fill={`url(#b3_front_${id})`} />
        {/* Side Face */}
        <path d="M37 7L41 9V40L37 39V7Z" fill={`url(#b3_side_${id})`} />
        {/* Top Face */}
        <path d="M30 10L34 8L41 9L37 7L30 10Z" fill={`url(#b3_top_${id})`} />

        {/* Dynamic Upward Trend Line with Arrow */}
        <path
          d="M7 26C14 23 23 16 39 8"
          stroke={`url(#arrowGrad_${id})`}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Arrowhead */}
        <path
          d="M34 7L40 7.5L38.5 13.5"
          stroke={`url(#arrowGrad_${id})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/**
 * 3D Settings / Gears Icon for "Nastavenia"
 * Rich isometric 3D dual interlocking cogwheel with metallic violet/magenta sheen.
 */
export function ThreeDSettingsIcon({ className = "h-7 w-7" }: { className?: string }) {
  const id = useId().replace(/:/g, "_");

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Ambient glow */}
        <filter id={`glow_${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#8b5cf6" floodOpacity="0.4" />
        </filter>

        {/* Main Gear 3D Gradient */}
        <radialGradient id={`gearMain_${id}`} cx="40%" cy="35%" r="65%" fx="35%" fy="30%">
          <stop offset="0%" stopColor="#ddd6fe" />
          <stop offset="25%" stopColor="#a855f7" />
          <stop offset="70%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#5b21b6" />
        </radialGradient>

        {/* Secondary Smaller Gear Gradient */}
        <radialGradient id={`gearSmall_${id}`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="40%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#c2410c" />
        </radialGradient>

        {/* Center Hole Depth */}
        <linearGradient id={`holeGrad_${id}`} x1="20" y1="20" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#312e81" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </linearGradient>

        {/* Gear Rim Highlight */}
        <linearGradient id={`gearRim_${id}`} x1="10" y1="10" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Ground Shadow */}
      <ellipse cx="24" cy="42" rx="14" ry="3.5" fill="#0f172a" fillOpacity="0.18" />

      <g filter={`url(#glow_${id})`}>
        {/* Secondary Back Gear (Orange / Copper Accent) */}
        <g transform="translate(10, 0)">
          <path
            d="M24 16C24 15.4 24.4 15 25 15H27C27.6 15 28 15.4 28 16V17.2C28.7 17.5 29.4 18 30 18.5L31 17.7C31.5 17.3 32.2 17.4 32.6 17.9L34 19.3C34.4 19.7 34.4 20.4 34 20.9L33.2 21.8C33.7 22.4 34.1 23.1 34.4 23.9H35.6C36.2 23.9 36.6 24.3 36.6 24.9V26.9C36.6 27.5 36.2 27.9 35.6 27.9H34.4C34.1 28.7 33.7 29.4 33.2 30L34 30.9C34.4 31.4 34.4 32.1 34 32.5L32.6 33.9C32.2 34.4 31.5 34.5 31 34.1L30 33.3C29.4 33.8 28.7 34.3 28 34.6V35.8C28 36.4 27.6 36.8 27 36.8H25C24.4 36.8 24 36.4 24 35.8V34.6C23.3 34.3 22.6 33.8 22 33.3L21 34.1C20.5 34.5 19.8 34.4 19.4 33.9L18 32.5C17.6 32.1 17.6 31.4 18 30.9L18.8 30C18.3 29.4 17.9 28.7 17.6 27.9H16.4C15.8 27.9 15.4 27.5 15.4 26.9V24.9C15.4 24.3 15.8 23.9 16.4 23.9H17.6C17.9 23.1 18.3 22.4 18.8 21.8L18 20.9C17.6 20.4 17.6 19.7 18 19.3L19.4 17.9C19.8 17.4 20.5 17.3 21 17.7L22 18.5C22.6 18 23.3 17.5 24 17.2V16Z"
            fill={`url(#gearSmall_${id})`}
            opacity="0.85"
          />
          <circle cx="26" cy="26" r="4.5" fill="#431407" />
        </g>

        {/* Primary Foreground 3D Gear (Violet / Electric Fuchsia) */}
        {/* Extruded Base / Depth */}
        <circle cx="21" cy="24" r="14" fill="#4c1d95" />

        {/* 8-Tooth Gear Path */}
        <path
          d="M19 9C19 8.44772 19.4477 8 20 8H22C22.5523 8 23 8.44772 23 9V10.5C24.1 10.8 25.1 11.3 26 12L27.2 11C27.6 10.6 28.3 10.7 28.7 11.2L30.2 12.7C30.6 13.1 30.6 13.8 30.2 14.2L29.1 15.3C29.7 16.2 30.2 17.2 30.5 18.3H32C32.5523 18.3 33 18.7477 33 19.3V21.3C33 21.8523 32.5523 22.3 32 22.3H30.5C30.2 23.4 29.7 24.4 29.1 25.3L30.2 26.4C30.6 26.8 30.6 27.5 30.2 27.9L28.7 29.4C28.3 29.9 27.6 30 27.2 29.6L26 28.6C25.1 29.3 24.1 29.8 23 30.1V31.6C23 32.1523 22.5523 32.6 22 32.6H20C19.4477 32.6 19 32.1523 19 31.6V30.1C17.9 29.8 16.9 29.3 16 28.6L14.8 29.6C14.4 30 13.7 29.9 13.3 29.4L11.8 27.9C11.4 27.5 11.4 26.8 11.8 26.4L12.9 25.3C12.3 24.4 11.8 23.4 11.5 22.3H10C9.44772 22.3 9 21.8523 9 21.3V19.3C9 18.7477 9.44772 18.3 10 18.3H11.5C11.8 17.2 12.3 16.2 12.9 15.3L11.8 14.2C11.4 13.8 11.4 13.1 11.8 12.7L13.3 11.2C13.7 10.7 14.4 10.6 14.8 11L16 12C16.9 11.3 17.9 10.8 19 10.5V9Z"
          fill={`url(#gearMain_${id})`}
        />

        {/* Specular Edge Highlight */}
        <circle cx="21" cy="20.3" r="10.5" stroke={`url(#gearRim_${id})`} strokeWidth="1.2" fill="none" />

        {/* Central Core Hole with Deep Shadow */}
        <circle cx="21" cy="20.3" r="5" fill={`url(#holeGrad_${id})`} />
        {/* Inner Glowing Center Axle Pin */}
        <circle cx="21" cy="20.3" r="2.2" fill="#38bdf8" />
        <circle cx="20.3" cy="19.6" r="0.8" fill="#ffffff" />
      </g>
    </svg>
  );
}
