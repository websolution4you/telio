import React from "react";

export function TennisPlayerIcon({ className = "h-4 w-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Tennis Ball */}
      <circle cx="19.5" cy="3.5" r="1.2" />

      {/* Tennis Racket Rim & Handle */}
      <path
        d="M17.8 2.2c1.4 0.7 2.1 2.2 1.5 3.6-.6 1.4-2.2 2.1-3.6 1.5-.7-.3-1.2-.9-1.5-1.6l-2.6 3.1-.9-.8 2.7-3.2c-.1-.8.2-1.7.8-2.2 1.0-.8 2.4-.9 3.6-.4zm-2.4 1.7c-.5.6-.4 1.4.1 1.9.6.5 1.4.4 1.9-.1.5-.6.4-1.4-.1-1.9-.5-.5-1.4-.4-1.9.1z"
      />

      {/* Tennis Player Head */}
      <circle cx="8" cy="6.5" r="1.9" />

      {/* Tennis Player Silhouette (Body, Motion Arms & Legs) */}
      <path
        d="M9.6 9.2c-.7-.4-1.6-.4-2.3 0L4.5 11.2c-.6.4-.8 1.2-.4 1.8.4.6 1.2.8 1.8.4l1.8-1.2-.8 4.2-2.8 4.1c-.5.6-.3 1.5.3 2 .6.5 1.5.3 2-.3l3-4.5 2.6 4.4c.4.6 1.2.9 1.9.5.6-.4.9-1.2.5-1.9l-2.9-5 .4-3.9 2.5-2.2-1.1-1.2-3.3.9z"
      />
    </svg>
  );
}

export default TennisPlayerIcon;
