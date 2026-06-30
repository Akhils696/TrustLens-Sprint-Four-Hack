"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Download, FileText, FileJson, File, Loader2 } from "lucide-react";
import { Button } from "./button";

interface DownloadItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  format: string;
  action: () => Promise<void>;
}

interface DownloadCenterProps {
  documentId: string;
  filename: string;
  onDownloadRedactedPDF: () => Promise<void>;
  onDownloadRedactedTXT: () => Promise<void>;
  onDownloadReportJSON: () => Promise<void>;
  onDownloadSummaryTXT?: () => Promise<void>;
  className?: string;
}

export function DownloadCenter({
  documentId,
  filename,
  onDownloadRedactedPDF,
  onDownloadRedactedTXT,
  onDownloadReportJSON,
  onDownloadSummaryTXT,
  className = "",
}: DownloadCenterProps) {
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");

  const items: DownloadItem[] = React.useMemo(
    () => [
      {
        id: "redacted-pdf",
        label: "Redacted PDF",
        description: "Document with PII permanently removed",
        icon: File,
        format: "PDF",
        action: onDownloadRedactedPDF,
      },
      {
        id: "redacted-txt",
        label: "Redacted Text",
        description: "Plain text with [REDACTED] markers",
        icon: FileText,
        format: "TXT",
        action: onDownloadRedactedTXT,
      },
      {
        id: "report-json",
        label: "Privacy Report",
        description: "Full analysis with AI summary",
        icon: FileJson,
        format: "JSON",
        action: onDownloadReportJSON,
      },
      ...(onDownloadSummaryTXT
        ? [
            {
              id: "summary-txt",
              label: "Analysis Summary",
              description: "Human-readable audit summary",
              icon: FileText,
              format: "TXT",
              action: onDownloadSummaryTXT,
            },
          ]
        : []),
    ],
    [onDownloadRedactedPDF, onDownloadRedactedTXT, onDownloadReportJSON, onDownloadSummaryTXT]
  );

  const handleDownload = async (item: DownloadItem) => {
    setDownloading(item.id);
    setError("");
    try {
      await item.action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
        DOWNLOAD CENTER
      </span>

      <div className="space-y-2">
        {items.map((item, index) => {
          const Icon = item.icon;
          const isLoading = downloading === item.id;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
            >
              <button
                onClick={() => handleDownload(item)}
                disabled={downloading !== null}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-secondary/40 transition-all text-left group disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                aria-label={`Download ${item.label} as ${item.format}`}
              >
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center border border-border group-hover:bg-primary/10 transition-colors">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-foreground block">{item.label}</span>
                  <span className="text-[11px] text-muted-foreground">{item.description}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-md border border-border">
                    {item.format}
                  </span>
                  <Download className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
    </div>
  );
}
