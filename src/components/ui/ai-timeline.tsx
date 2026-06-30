"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, Clock, Shield } from "lucide-react";

interface TimelineStep {
  id: string;
  label: string;
  status: "completed" | "active" | "pending";
  timestamp?: string;
}

interface AITimelineProps {
  steps: TimelineStep[];
  className?: string;
}

export function AITimeline({ steps, className = "" }: AITimelineProps) {
  return (
    <div className={`space-y-0 ${className}`} role="list" aria-label="AI processing timeline">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08, duration: 0.3 }}
            className="flex items-stretch gap-3"
            role="listitem"
          >
            {/* Icon + connector line */}
            <div className="flex flex-col items-center">
              <div className="flex-shrink-0">
                {step.status === "completed" ? (
                  <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  </div>
                ) : step.status === "active" ? (
                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center animate-pulse">
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
              {!isLast && (
                <div
                  className={`w-px flex-1 min-h-[20px] transition-colors duration-300 ${
                    step.status === "completed" ? "bg-emerald-500/30" : "bg-border"
                  }`}
                />
              )}
            </div>

            {/* Label */}
            <div className="pb-4 flex-1">
              <span
                className={`text-sm font-semibold block leading-7 ${
                  step.status === "completed"
                    ? "text-foreground"
                    : step.status === "active"
                      ? "text-primary"
                      : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
              {step.timestamp && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  {step.timestamp}
                </span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/** Preset timeline for the full TrustLens pipeline */
export function getDefaultTimelineSteps(
  stage: "upload" | "extract" | "analyze" | "review" | "complete"
): TimelineStep[] {
  const stages: Record<string, "completed" | "active" | "pending"> = {
    upload: "pending",
    extract: "pending",
    analyze: "pending",
    review: "pending",
    explain: "pending",
    report: "pending",
    safe: "pending",
  };

  const order = ["upload", "extract", "analyze", "review", "explain", "report", "safe"];
  const stageIndex = { upload: 0, extract: 1, analyze: 2, review: 3, complete: 6 }[stage] ?? 0;

  order.forEach((s, i) => {
    if (i < stageIndex) stages[s] = "completed";
    else if (i === stageIndex) stages[s] = "active";
  });

  if (stage === "complete") order.forEach((s) => (stages[s] = "completed"));

  const now = new Date();
  const ts = (min: number) => {
    const d = new Date(now.getTime() - min * 60000);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return [
    {
      id: "upload",
      label: "Document Uploaded",
      status: stages.upload,
      timestamp: stages.upload === "completed" ? ts(5) : undefined,
    },
    {
      id: "extract",
      label: "Text Extracted",
      status: stages.extract,
      timestamp: stages.extract === "completed" ? ts(4) : undefined,
    },
    {
      id: "analyze",
      label: "PII Detection Completed",
      status: stages.analyze,
      timestamp: stages.analyze === "completed" ? ts(3) : undefined,
    },
    {
      id: "review",
      label: "Manual Review Active",
      status: stages.review,
      timestamp: stages.review === "completed" ? ts(2) : undefined,
    },
    {
      id: "explain",
      label: "Explainability Generated",
      status: stages.explain,
      timestamp: stages.explain === "completed" ? ts(1) : undefined,
    },
    {
      id: "report",
      label: "Privacy Report Generated",
      status: stages.report,
      timestamp: stages.report === "completed" ? ts(0.5) : undefined,
    },
    {
      id: "safe",
      label: "Safe To Share",
      status: stages.safe,
      timestamp: stages.safe === "completed" ? ts(0) : undefined,
    },
  ];
}
