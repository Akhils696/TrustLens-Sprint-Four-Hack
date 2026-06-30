"use client";

import * as React from "react";
import { motion } from "framer-motion";

interface ConfidenceBarProps {
  value: number; // 0-100
  label?: string;
  showPercent?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getConfidenceColor(value: number): {
  bg: string;
  fill: string;
  text: string;
  label: string;
} {
  if (value >= 85)
    return {
      bg: "bg-emerald-500/10",
      fill: "bg-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
      label: "Very High Confidence",
    };
  if (value >= 65)
    return {
      bg: "bg-amber-500/10",
      fill: "bg-amber-500",
      text: "text-amber-600 dark:text-amber-400",
      label: "Moderate Confidence",
    };
  return {
    bg: "bg-rose-500/10",
    fill: "bg-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    label: "Low Confidence",
  };
}

export function ConfidenceBar({
  value,
  label,
  showPercent = true,
  size = "md",
  className = "",
}: ConfidenceBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const colors = getConfidenceColor(clamped);
  const heights = { sm: "h-1.5", md: "h-2.5", lg: "h-3.5" };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="font-semibold text-muted-foreground">{label}</span>}
          {showPercent && <span className={`font-bold font-mono ${colors.text}`}>{clamped}%</span>}
        </div>
      )}
      <div className={`w-full ${colors.bg} rounded-full overflow-hidden ${heights[size]}`}>
        <motion.div
          className={`${heights[size]} ${colors.fill} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      {showPercent && (
        <span className={`text-[10px] font-semibold ${colors.text}`}>{colors.label}</span>
      )}
    </div>
  );
}

/** Inline confidence pill (compact) */
export function ConfidencePill({ value, className = "" }: { value: number; className?: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  const colors = getConfidenceColor(clamped);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${colors.bg} ${colors.text} border-current/10 ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors.fill}`} />
      {clamped}%
    </span>
  );
}

/** Animated counter that counts up from 0 to value */
export function AnimatedCounter({
  value,
  suffix = "",
  className = "",
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const [display, setDisplay] = React.useState(0);
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const duration = 800;
    const start = performance.now();
    const initial = 0;

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(initial + (value - initial) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {display}
      {suffix}
    </span>
  );
}

export { getConfidenceColor };
