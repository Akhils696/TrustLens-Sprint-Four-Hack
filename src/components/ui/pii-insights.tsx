"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Car,
  Fingerprint,
  Building2,
  Hash,
  Globe,
} from "lucide-react";
import { AnimatedCounter } from "./confidence";

interface Detection {
  type: string;
  approved?: boolean;
}

interface PIIInsightsProps {
  detections: Detection[];
  className?: string;
}

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  names: { icon: User, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  emails: { icon: Mail, color: "text-violet-500 bg-violet-500/10 border-violet-500/20" },
  "phone numbers": {
    icon: Phone,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  addresses: { icon: MapPin, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  "government ids": { icon: Fingerprint, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
  banking: { icon: Building2, color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" },
  cards: { icon: CreditCard, color: "text-pink-500 bg-pink-500/10 border-pink-500/20" },
  "vehicle numbers": { icon: Car, color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
  "ip addresses": { icon: Globe, color: "text-teal-500 bg-teal-500/10 border-teal-500/20" },
  other: { icon: Hash, color: "text-slate-500 bg-slate-500/10 border-slate-500/20" },
};

function categorize(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("name")) return "names";
  if (t.includes("email")) return "emails";
  if (t.includes("phone")) return "phone numbers";
  if (t.includes("address") && !t.includes("ip")) return "addresses";
  if (
    t.includes("aadhaar") ||
    t.includes("pan") ||
    t.includes("passport") ||
    t.includes("driving") ||
    t.includes("ssn")
  )
    return "government ids";
  if (t.includes("bank") || t.includes("ifsc") || t.includes("account")) return "banking";
  if (t.includes("card") || t.includes("credit") || t.includes("debit")) return "cards";
  if (t.includes("vehicle") || t.includes("plate") || t.includes("license plate"))
    return "vehicle numbers";
  if (t.includes("ip")) return "ip addresses";
  return "other";
}

export function PIIInsights({ detections, className = "" }: PIIInsightsProps) {
  const categories = React.useMemo(() => {
    const map: Record<string, number> = {};
    detections.forEach((d) => {
      const cat = categorize(d.type);
      map[cat] = (map[cat] || 0) + 1;
    });
    // Sort by count descending
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  }, [detections]);

  const total = detections.length;

  if (total === 0) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
          PII BY CATEGORY
        </span>
        <span className="text-xs font-bold text-foreground">
          <AnimatedCounter value={total} /> Total
        </span>
      </div>

      {/* Category bars */}
      <div className="space-y-3">
        {categories.map(([cat, count], index) => {
          const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
          const Icon = config.icon;
          const percent = Math.round((count / total) * 100);

          return (
            <motion.div
              key={cat}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.06, duration: 0.3 }}
              className="space-y-1"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center border ${config.color}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-semibold text-foreground capitalize">{cat}</span>
                </div>
                <span className="font-bold text-muted-foreground tabular-nums">{count}</span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${config.color.split(" ")[0].replace("text-", "bg-")}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.6, delay: index * 0.08, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Mini pie chart (CSS only) */}
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <div className="relative w-12 h-12">
          <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
            {
              categories.reduce<{ elements: React.ReactNode[]; offset: number }>(
                (acc, [cat, count], i) => {
                  const percent = (count / total) * 100;
                  const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
                  // Extract the actual color
                  const colorClass = config.color.split(" ")[0];
                  const colorMap: Record<string, string> = {
                    "text-blue-500": "#3b82f6",
                    "text-violet-500": "#8b5cf6",
                    "text-emerald-500": "#10b981",
                    "text-amber-500": "#f59e0b",
                    "text-rose-500": "#f43f5e",
                    "text-cyan-500": "#06b6d4",
                    "text-pink-500": "#ec4899",
                    "text-orange-500": "#f97316",
                    "text-teal-500": "#14b8a6",
                    "text-slate-500": "#64748b",
                  };
                  acc.elements.push(
                    <circle
                      key={cat}
                      cx="18"
                      cy="18"
                      r="15.91549431"
                      fill="transparent"
                      stroke={colorMap[colorClass] || "#64748b"}
                      strokeWidth="3"
                      strokeDasharray={`${percent} ${100 - percent}`}
                      strokeDashoffset={`${-acc.offset}`}
                    />
                  );
                  acc.offset += percent;
                  return acc;
                },
                { elements: [], offset: 0 }
              ).elements
            }
          </svg>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {categories.slice(0, 4).map(([cat, count]) => {
            const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
            return (
              <span key={cat} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span
                  className={`w-2 h-2 rounded-full ${config.color.split(" ")[0].replace("text-", "bg-")}`}
                />
                <span className="capitalize">{cat}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
