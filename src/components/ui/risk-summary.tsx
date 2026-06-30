"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ShieldAlert, ShieldCheck, ShieldQuestion, AlertTriangle } from "lucide-react";
import { AnimatedCounter } from "./confidence";

interface Detection {
  risk: string;
  approved?: boolean;
}

interface RiskSummaryProps {
  detections: Detection[];
  privacyScore: number;
  className?: string;
}

function classifyRisk(risk: string): "critical" | "high" | "medium" | "low" {
  const r = risk.toLowerCase();
  if (r.includes("critical")) return "critical";
  if (r.includes("high") || r.includes("theft") || r.includes("fraud") || r.includes("identity"))
    return "high";
  if (r.includes("medium") || r.includes("moderate") || r.includes("exposure")) return "medium";
  return "low";
}

const RISK_CONFIG = {
  critical: {
    icon: ShieldAlert,
    label: "Critical",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/20",
    fill: "bg-rose-500",
  },
  high: {
    icon: AlertTriangle,
    label: "High Risk",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
    fill: "bg-orange-500",
  },
  medium: {
    icon: ShieldQuestion,
    label: "Medium Risk",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    fill: "bg-amber-500",
  },
  low: {
    icon: ShieldCheck,
    label: "Low Risk",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    fill: "bg-emerald-500",
  },
};

export function RiskSummary({ detections, privacyScore, className = "" }: RiskSummaryProps) {
  const counts = React.useMemo(() => {
    const map = { critical: 0, high: 0, medium: 0, low: 0 };
    detections.forEach((d) => {
      map[classifyRisk(d.risk)]++;
    });
    return map;
  }, [detections]);

  const total = detections.length;
  const unapproved = detections.filter((d) => !d.approved).length;

  const overallRisk = React.useMemo(() => {
    if (privacyScore >= 90) return "low";
    if (privacyScore >= 70) return "medium";
    if (privacyScore >= 40) return "high";
    return "critical";
  }, [privacyScore]) as "critical" | "high" | "medium" | "low";

  const overallConfig = RISK_CONFIG[overallRisk];
  const OverallIcon = overallConfig.icon;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overall risk banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-3 p-3 rounded-xl border ${overallConfig.bg}`}
      >
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${overallConfig.bg}`}
        >
          <OverallIcon className={`h-5 w-5 ${overallConfig.color}`} />
        </div>
        <div className="flex-1">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
            OVERALL DOCUMENT RISK
          </span>
          <span className={`text-sm font-extrabold ${overallConfig.color}`}>
            {overallConfig.label}
          </span>
        </div>
        <span className={`text-2xl font-black font-mono ${overallConfig.color}`}>
          <AnimatedCounter value={privacyScore} suffix="%" />
        </span>
      </motion.div>

      {/* Risk breakdown cards */}
      <div className="grid grid-cols-2 gap-2">
        {(["critical", "high", "medium", "low"] as const).map((level, i) => {
          const config = RISK_CONFIG[level];
          const Icon = config.icon;
          const count = counts[level];

          return (
            <motion.div
              key={level}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`p-3 rounded-xl border text-left ${config.bg}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                <span className={`text-[10px] font-bold uppercase ${config.color}`}>
                  {config.label}
                </span>
              </div>
              <span className={`text-xl font-black ${config.color} tabular-nums`}>
                <AnimatedCounter value={count} />
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Data exposure indicator */}
      {unapproved > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <strong>{unapproved}</strong> detection{unapproved !== 1 ? "s" : ""} left visible —
            potential data exposure if document is shared unredacted.
          </span>
        </div>
      )}
    </div>
  );
}
