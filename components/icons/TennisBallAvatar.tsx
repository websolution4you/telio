import React, { useId } from "react";

export function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type TennisBallAvatarProps = {
  name: string;
  className?: string;
  textSize?: string;
};

export function TennisBallAvatar({
  name,
  className = "h-9 w-9",
  textSize = "text-xs",
}: TennisBallAvatarProps) {
  const initials = getInitials(name);
  const reactId = useId().replace(/:/g, "_");
  const gradId = `tennisBallGrad_${reactId}`;

  return (
    <div
      className={`relative shrink-0 select-none overflow-hidden rounded-full bg-[#d2f500] shadow-[0_3px_10px_rgba(0,0,0,0.15)] ${className}`}
    >
      {/* Tennis Ball SVG Background & Seams */}
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <radialGradient id={gradId} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#f7ff57" />
            <stop offset="60%" stopColor="#d2f500" />
            <stop offset="100%" stopColor="#9ec200" />
          </radialGradient>
        </defs>

        {/* Ball Base Circle */}
        <circle cx="18" cy="18" r="17.5" fill={`url(#${gradId})`} />

        {/* White Seams of Tennis Ball */}
        <path
          d="M 5,5 C 13,11 13,25 5,31"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path
          d="M 31,5 C 23,11 23,25 31,31"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.9"
        />
      </svg>

      {/* User Initials overlay */}
      <div className="relative z-10 flex h-full w-full items-center justify-center">
        <span
          className={`font-black tracking-tighter text-slate-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)] ${textSize}`}
          style={{ fontFamily: "var(--font-poppins), system-ui, sans-serif" }}
        >
          {initials}
        </span>
      </div>
    </div>
  );
}

export default TennisBallAvatar;
