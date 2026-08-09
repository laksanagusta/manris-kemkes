"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { levelToFillColor } from "@/lib/risk";
import type { RiskLevel } from "@/types/risk";

export interface RiskRatingSliderProps {
  value: number;
  onChange: (value: number) => void;
  getLevel: (value: number) => RiskLevel;
  labels?: Record<number, string>;
  disabled?: boolean;
}

export function RiskRatingSlider({
  value,
  onChange,
  getLevel,
  labels,
  disabled,
}: RiskRatingSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);

  const measure = useCallback(() => {
    const btn = buttonRefs.current[value - 1];
    if (!btn || !containerRef.current) return;
    const cr = containerRef.current.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    setIndicator({ left: br.left - cr.left, width: br.width });
  }, [value]);

  useEffect(() => {
    measure();
    if (!mounted) setMounted(true);
  }, [measure, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measure, mounted]);

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "pointer-events-none absolute top-0 z-10 h-10 rounded-lg motion-reduce:transition-none",
          mounted && "transition-all duration-300 ease-out",
        )}
        style={{
          left: indicator.left,
          width: indicator.width,
          backgroundColor: levelToFillColor(getLevel(value)),
        }}
      />

      <div className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((val) => (
          <Tooltip key={val}>
            <TooltipTrigger asChild>
              <button
                ref={(el) => {
                  buttonRefs.current[val - 1] = el;
                }}
                type="button"
                disabled={disabled}
                onClick={() => onChange(val)}
                className={cn(
                  "relative z-20 h-10 rounded-lg border text-sm font-semibold transition-all duration-200 motion-reduce:transition-none",
                  val === value
                    ? "border-transparent text-white shadow-sm"
                    : "border-border/50 bg-muted/30 text-foreground hover:bg-muted/50",
                  disabled && "cursor-not-allowed opacity-70",
                )}
              >
                {val}
              </button>
            </TooltipTrigger>
            {labels?.[val] && (
              <TooltipContent side="top" className="text-xs">
                {labels[val]}
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
