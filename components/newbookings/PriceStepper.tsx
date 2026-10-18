"use client";

import React, { useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  className?: string;
};

export default function PriceStepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  unit = "€",
  className = "",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStep = (direction: 1 | -1, multiplier: number = 1) => {
    const currentVal = Number(value) || 0;
    const delta = step * direction * multiplier;
    const nextVal = Math.max(min, Math.min(max, currentVal + delta));
    onChange(nextVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const mult = e.shiftKey ? 5 : 1;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      handleStep(1, mult);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      handleStep(-1, mult);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (document.activeElement === inputRef.current) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleStep(1);
      } else if (e.deltaY > 0) {
        handleStep(-1);
      }
    }
  };

  return (
    <div
      onWheel={handleWheel}
      className={`relative inline-flex items-center rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-slate-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition group ${className}`}
      title="Zadajte sumu alebo použite šípky ↑ / ↓ na klávesnici"
    >
      <input
        ref={inputRef}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value === 0 ? 0 : value || ""}
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          onChange(isNaN(val) ? 0 : Math.max(min, Math.min(max, val)));
        }}
        onKeyDown={handleKeyDown}
        className="w-12 py-1.5 pl-2 text-center font-extrabold text-sm text-slate-900 outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="text-xs font-bold text-slate-400 pr-1.5 select-none">{unit}</span>

      {/* Custom Stepper Buttons */}
      <div className="flex flex-col border-l border-slate-100 bg-slate-50/80 rounded-r-xl overflow-hidden shrink-0">
        <button
          type="button"
          tabIndex={-1}
          onClick={() => handleStep(1)}
          className="h-3.5 w-4.5 flex items-center justify-center text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 transition cursor-pointer"
          title={`Zvýšiť o ${step} ${unit} (alebo šípka hore ↑)`}
        >
          <ChevronUp className="h-2.5 w-2.5" />
        </button>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => handleStep(-1)}
          className="h-3.5 w-4.5 flex items-center justify-center text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 transition cursor-pointer border-t border-slate-100"
          title={`Znížiť o ${step} ${unit} (alebo šípka dole ↓)`}
        >
          <ChevronDown className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );
}
