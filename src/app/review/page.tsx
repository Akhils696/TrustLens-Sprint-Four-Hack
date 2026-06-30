/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CircularProgress } from "@/components/ui/progress";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { AITimeline, getDefaultTimelineSteps } from "@/components/ui/ai-timeline";
import { ConfidenceBar, ConfidencePill, AnimatedCounter } from "@/components/ui/confidence";
import { PIIInsights } from "@/components/ui/pii-insights";
import { RiskSummary } from "@/components/ui/risk-summary";
import { DownloadCenter } from "@/components/ui/download-center";
import {
  updateReviewState,
  redactDocument as apiRedactDocument,
  downloadRedacted,
  downloadPrivacyReport,
  explainDetection as apiExplainDetection,
  explainWhyNot as apiExplainWhyNot,
  ApiError,
} from "@/services/api";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Clock,
  History,
  Shield,
  Eye,
  EyeOff,
  Settings,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Detection {
  id: string;
  text: string;
  type: string;
  confidence: number;
  reason: string;
  risk: string;
  suggestedRedaction: string;
  approved?: boolean;
}

interface ExplainResult {
  whyDetected: string;
  risk: string;
  reason: string;
  confidence: number;
}

interface WhyNotResult {
  whyNotDetected: string;
  shouldHaveBeenDetected: boolean;
  reason: string;
}

interface ReviewAction {
  detectionId: string;
  detectionText: string;
  action: "approved" | "rejected";
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getRiskColor = (risk: string) => {
  const r = risk.toLowerCase();
  if (r.includes("high") || r.includes("critical") || r.includes("theft")) {
    return "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400";
  }
  if (r.includes("medium") || r.includes("moderate") || r.includes("exposure")) {
    return "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400";
  }
  return "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400";
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Review() {
  const router = useRouter();

  const [mounted, setMounted] = React.useState(false);
  const [fileId, setFileId] = React.useState("");
  const [documentId, setDocumentId] = React.useState("");
  const [filename, setFilename] = React.useState("");
  const [text, setText] = React.useState("");
  const [detections, setDetections] = React.useState<Detection[]>([]);
  const [privacyScore, setPrivacyScore] = React.useState(100);

  // Explainability
  const [selectedDet, setSelectedDet] = React.useState<Detection | null>(null);
  const [explainLoading, setExplainLoading] = React.useState(false);
  const [explainResult, setExplainResult] = React.useState<ExplainResult | null>(null);

  // Why-not
  const [whyNotText, setWhyNotText] = React.useState("");
  const [whyNotLoading, setWhyNotLoading] = React.useState(false);
  const [whyNotResult, setWhyNotResult] = React.useState<WhyNotResult | null>(null);

  // Export
  const [exportError, setExportError] = React.useState("");
  const [showCompletion, setShowCompletion] = React.useState(false);

  // Sprint 5: Review history
  const [reviewHistory, setReviewHistory] = React.useState<ReviewAction[]>([]);

  // Sprint 5: Sidebar tab
  const [sidebarTab, setSidebarTab] = React.useState<
    "explain" | "insights" | "timeline" | "history" | "settings"
  >("explain");

  // Configurable Privacy Settings
  const [confidenceThreshold, setConfidenceThreshold] = React.useState<"high" | "medium" | "low">(
    "low"
  );
  const [autoRedact, setAutoRedact] = React.useState(true);
  const [showConfidence, setShowConfidence] = React.useState(true);
  const [highlightColors, setHighlightColors] = React.useState<"rose" | "violet" | "amber">("rose");

  React.useEffect(() => {
    setMounted(true);

    const cachedId = localStorage.getItem("trustlens_file_id");
    const cachedAnalysis = localStorage.getItem("trustlens_analysis");

    if (!cachedId || !cachedAnalysis) {
      router.push("/sandbox");
      return;
    }

    const cachedDocId = localStorage.getItem("trustlens_document_id") || cachedId || "";
    const cachedFilename = localStorage.getItem("trustlens_filename") || "";
    const cachedText = localStorage.getItem("trustlens_text") || "";

    setFileId(cachedId);
    setDocumentId(cachedDocId);
    setFilename(cachedFilename);
    setText(cachedText);

    try {
      const parsed = JSON.parse(cachedAnalysis);
      setDetections(
        (parsed.detections || []).map((d: Detection) => ({
          ...d,
          approved: d.approved !== false,
        }))
      );
      setPrivacyScore(parsed.privacyScore ?? 100);
    } catch {
      // ignore
    }
  }, [router]);

  // Apply Confidence Threshold to filter detections
  const filteredDetections = React.useMemo(() => {
    return detections.filter((d) => {
      const thresholdMap = { high: 85, medium: 65, low: 0 };
      const minConfidence = thresholdMap[confidenceThreshold];
      return (d.confidence || 0) >= minConfidence;
    });
  }, [detections, confidenceThreshold]);

  // Derived state
  // ---------------------------------------------------------------------------

  const activeRedactions = filteredDetections.filter((d) => d.approved);
  const rejectedRedactions = filteredDetections.filter((d) => !d.approved);

  const dynamicScore = React.useMemo(() => {
    if (filteredDetections.length === 0) return 100;
    const approvedRatio = activeRedactions.length / filteredDetections.length;
    return Math.round(privacyScore + (100 - privacyScore) * approvedRatio);
  }, [filteredDetections, activeRedactions, privacyScore]);

  const riskClassification = React.useMemo(() => {
    if (dynamicScore >= 90)
      return {
        label: "Low Risk",
        color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
      };
    if (dynamicScore >= 70)
      return {
        label: "Medium Risk",
        color: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
      };
    return {
      label: "High Risk",
      color: "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400",
    };
  }, [dynamicScore]);

  const avgConfidence = React.useMemo(() => {
    if (filteredDetections.length === 0) return 0;
    const sum = filteredDetections.reduce((acc, curr) => acc + (curr.confidence || 0), 0);
    return Math.round(sum / filteredDetections.length);
  }, [filteredDetections]);

  const timelineSteps = React.useMemo(
    () => getDefaultTimelineSteps(showCompletion ? "complete" : "review"),
    [showCompletion]
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSelectDetection = React.useCallback(
    async (det: Detection) => {
      setSelectedDet(det);
      setSidebarTab("explain");
      setWhyNotResult(null);
      setExplainLoading(true);
      setExplainResult(null);

      try {
        const startIdx = Math.max(0, text.indexOf(det.text) - 100);
        const endIdx = Math.min(text.length, text.indexOf(det.text) + det.text.length + 100);
        const contextSnippet = text.substring(startIdx, endIdx);
        const result = await apiExplainDetection(det.text, contextSnippet);
        setExplainResult(result);
      } catch {
        setExplainResult(null);
      } finally {
        setExplainLoading(false);
      }
    },
    [text]
  );

  const handleWhyNotQuery = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const query = whyNotText.trim();
      if (!query) return;

      setSelectedDet(null);
      setSidebarTab("explain");
      setWhyNotLoading(true);
      setWhyNotResult(null);
      setExplainResult(null);

      try {
        const startIdx = Math.max(0, text.indexOf(query) - 100);
        const endIdx = Math.min(text.length, text.indexOf(query) + query.length + 100);
        const contextSnippet = text.substring(startIdx, endIdx) || text.slice(0, 300);
        const result = await apiExplainWhyNot(query, contextSnippet);
        setWhyNotResult(result);
      } catch {
        setWhyNotResult(null);
      } finally {
        setWhyNotLoading(false);
      }
    },
    [text, whyNotText]
  );

  const toggleApproval = React.useCallback(
    (id: string) => {
      const det = detections.find((d) => d.id === id);
      if (!det) return;

      const newApproval = det.approved ? false : true;
      setDetections((prev) => prev.map((d) => (d.id === id ? { ...d, approved: newApproval } : d)));
      if (selectedDet && selectedDet.id === id) {
        setSelectedDet((prev) => (prev ? { ...prev, approved: newApproval } : null));
      }

      // Track review history
      setReviewHistory((prev) => [
        {
          detectionId: id,
          detectionText: det.text,
          action: newApproval ? "approved" : "rejected",
          timestamp: new Date(),
        },
        ...prev,
      ]);

      // Sync with backend
      if (documentId) {
        updateReviewState(documentId, id, newApproval ? "approved" : "rejected").catch(() => {});
      }
    },
    [selectedDet, documentId, detections]
  );

  const handleDocumentMouseUp = () => {
    if (typeof window === "undefined") return;
    const selection = window.getSelection();
    const selected = selection?.toString().trim();
    if (selected && selected.length > 1) {
      setWhyNotText(selected);
    }
  };

  // ---------------------------------------------------------------------------
  // Export handlers
  // ---------------------------------------------------------------------------

  const performRedaction = React.useCallback(async () => {
    if (documentId) {
      const approvedIds = activeRedactions.map((d) => d.id);
      await apiRedactDocument(documentId, approvedIds);
    } else {
      const redactionTexts = activeRedactions.map((d) => d.text);
      const res = await fetch("http://localhost:8000/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, filename, redactions: redactionTexts }),
      });
      if (!res.ok) throw new Error("Export failed.");
    }
  }, [activeRedactions, documentId, fileId, filename]);

  const handleDownloadPDF = React.useCallback(async () => {
    await performRedaction();
    if (documentId) {
      await downloadRedacted(documentId, "pdf");
    }
  }, [performRedaction, documentId]);

  const handleDownloadTXT = React.useCallback(async () => {
    await performRedaction();
    if (documentId) {
      await downloadRedacted(documentId, "txt");
    }
  }, [performRedaction, documentId]);

  const handleDownloadReport = React.useCallback(async () => {
    if (!documentId) return;
    await downloadPrivacyReport(documentId, filename);
  }, [documentId, filename]);

  // ---------------------------------------------------------------------------
  // Render document viewer (memoized)
  // ---------------------------------------------------------------------------

  const renderDocumentViewer = React.useMemo(() => {
    if (!text) return null;
    if (activeRedactions.length === 0)
      return (
        <p className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">{text}</p>
      );

    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = activeRedactions
      .map((d) => escapeRegExp(d.text))
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .join("|");

    if (!pattern)
      return (
        <p className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">{text}</p>
      );

    const regex = new RegExp(`(${pattern})`, "gi");
    const parts = text.split(regex);

    return (
      <p className="whitespace-pre-wrap leading-relaxed text-sm text-foreground/90">
        {parts.map((part, index) => {
          const match = activeRedactions.find((d) => d.text.toLowerCase() === part.toLowerCase());
          if (match) {
            return (
              <mark
                key={index}
                role="button"
                tabIndex={0}
                aria-label={`PII detected: ${match.type} — ${part}. Click to inspect.`}
                onClick={() => handleSelectDetection(match)}
                onKeyDown={(e) => e.key === "Enter" && handleSelectDetection(match)}
                className={`border-b-2 text-foreground cursor-pointer rounded px-1 transition-all select-none mx-0.5 focus:outline-none focus:ring-2 ${
                  highlightColors === "rose"
                    ? "bg-rose-500/25 hover:bg-rose-500/35 border-rose-500 focus:ring-rose-500/50"
                    : highlightColors === "violet"
                      ? "bg-violet-500/25 hover:bg-violet-500/35 border-violet-500 focus:ring-violet-500/50"
                      : "bg-amber-500/25 hover:bg-amber-500/35 border-amber-500 focus:ring-amber-500/50"
                }`}
                title={`Click to inspect ${match.type}`}
              >
                {part}
              </mark>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </p>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, activeRedactions, highlightColors]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!mounted) {
    return (
      <MainLayout>
        <div className="container py-8 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-border pb-6 gap-4 animate-pulse">
            <div className="text-left">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Verify Document
              </span>
              <div className="h-8 w-48 bg-muted rounded mt-2" />
            </div>
            <div className="h-10 w-32 bg-muted rounded" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 h-96 bg-muted rounded-lg animate-pulse" />
            <div className="h-96 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8 space-y-6">
        {/* Header bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-border pb-6 gap-4">
          <div className="text-left">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Verify Document
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">{filename}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.push("/sandbox")}>
              Upload Another
            </Button>
            {!showCompletion && (
              <Button
                onClick={() => setShowCompletion(true)}
                rightIcon={<CheckCircle className="h-4 w-4" />}
              >
                Verify & Complete Audit
              </Button>
            )}
          </div>
        </div>

        {/* Main content */}
        <AnimatePresence mode="wait">
          {showCompletion ? (
            /* ============================================================
               COMPLETION SCREEN (Sprint 5: enhanced Safe-to-Share Report)
               ============================================================ */
            <motion.div
              key="completion-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="max-w-4xl mx-auto space-y-8 py-8"
            >
              {/* Success hero */}
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-500/10 text-emerald-500 border-2 border-emerald-500/20 shadow-xl shadow-emerald-500/10 animate-pulse-glow"
                >
                  <Shield className="w-12 h-12" />
                </motion.div>
                <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                  Verification Complete
                </h2>
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-5 py-2 rounded-full text-sm font-extrabold tracking-wide uppercase shadow-lg shadow-emerald-500/5">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>SAFE TO SHARE</span>
                </div>
                <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                  AI and manual verification are complete. The document is fully redacted and ready
                  for secure distribution.
                </p>
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-card border-border/80 shadow-md">
                  <CardContent className="p-5 text-center space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                      Privacy Score
                    </span>
                    <p className="text-3xl font-black text-emerald-500">
                      <AnimatedCounter value={dynamicScore} suffix="%" />
                    </p>
                    <Badge className={riskClassification.color}>{riskClassification.label}</Badge>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border/80 shadow-md">
                  <CardContent className="p-5 text-center space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                      Total PII Audited
                    </span>
                    <p className="text-3xl font-black text-foreground">
                      <AnimatedCounter value={detections.length} />
                    </p>
                    <span className="text-xs text-muted-foreground font-medium">
                      {activeRedactions.length} redacted / {rejectedRedactions.length} visible
                    </span>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border/80 shadow-md">
                  <CardContent className="p-5 text-center space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                      AI Confidence
                    </span>
                    <p className="text-3xl font-black text-violet-500 font-mono">
                      <AnimatedCounter value={avgConfidence} suffix="%" />
                    </p>
                    <ConfidenceBar value={avgConfidence} showPercent={false} size="sm" />
                  </CardContent>
                </Card>

                <Card className="bg-card border-border/80 shadow-md">
                  <CardContent className="p-5 text-center space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                      Manual Reviews
                    </span>
                    <p className="text-3xl font-black text-foreground">
                      <AnimatedCounter value={reviewHistory.length} />
                    </p>
                    <span className="text-xs text-muted-foreground font-medium">
                      decisions logged
                    </span>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline + Download Center */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-4">
                      AI DECISION TIMELINE
                    </span>
                    <AITimeline steps={timelineSteps} />
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <DownloadCenter
                      documentId={documentId}
                      filename={filename}
                      onDownloadRedactedPDF={handleDownloadPDF}
                      onDownloadRedactedTXT={handleDownloadTXT}
                      onDownloadReportJSON={handleDownloadReport}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 flex-wrap">
                <Button variant="outline" onClick={() => setShowCompletion(false)}>
                  Return to Review
                </Button>
                <Button variant="outline" onClick={() => router.push("/sandbox")}>
                  Analyze Another Document
                </Button>
              </div>

              {/* Export error */}
              {exportError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-start gap-3 text-left"
                >
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-xs uppercase mb-1">Export Failed</span>
                    <span>{exportError}</span>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            /* ============================================================
               EDITOR DASHBOARD
               ============================================================ */
            <motion.div
              key="editor-dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* ===== Document Panel (left 7 cols) ===== */}
              <div className="lg:col-span-7 space-y-6">
                <Card
                  className="min-h-[500px] max-h-[700px] overflow-y-auto bg-card border-border"
                  aria-label="Document source viewer"
                >
                  <CardHeader className="border-b border-border bg-secondary/20 py-3">
                    <CardTitle className="text-sm font-bold text-muted-foreground flex items-center justify-between">
                      <span>DOCUMENT SOURCE VIEWER</span>
                      <Badge variant="outline">{filename.split(".").pop()?.toUpperCase()}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent
                    className="p-6 text-left font-mono select-text"
                    onMouseUp={handleDocumentMouseUp}
                  >
                    {detections.length === 0 && text ? (
                      <EmptyState
                        title="No PII Detected"
                        description="Gemini found no personally identifiable information in this document. It appears safe to share as-is."
                        actionLabel="Analyze Another"
                        onAction={() => router.push("/sandbox")}
                        className="border-emerald-500/20 bg-emerald-500/5"
                      />
                    ) : (
                      renderDocumentViewer
                    )}
                  </CardContent>
                </Card>

                {/* Why-not query form */}
                <Card className="bg-card">
                  <CardContent className="p-4">
                    <form onSubmit={handleWhyNotQuery} className="flex gap-2 items-center">
                      <div className="flex-1 text-left">
                        <span className="text-xs text-muted-foreground block mb-1 font-semibold">
                          VERIFY UNHIGHLIGHTED TEXT
                        </span>
                        <input
                          type="text"
                          placeholder="Type a word or select visible text to audit omission..."
                          value={whyNotText}
                          onChange={(e) => setWhyNotText(e.target.value)}
                          className="w-full text-sm bg-secondary/50 border border-border rounded-lg h-9 px-3 outline-none text-foreground focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <Button type="submit" size="sm" className="mt-5" disabled={whyNotLoading}>
                        {whyNotLoading ? "Auditing..." : "Audit Omission"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* ===== Right Panel (5 cols) ===== */}
              <div className="lg:col-span-5 space-y-6">
                {/* Privacy Dashboard Card */}
                <Card className="border-border bg-card shadow-lg relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                  <CardContent className="p-6 space-y-6">
                    <div className="flex items-center gap-6">
                      <div className="relative flex items-center justify-center">
                        <CircularProgress value={dynamicScore} size={80} strokeWidth={7} showText />
                      </div>
                      <div className="flex-1 text-left space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          PRIVACY RISK DASHBOARD
                        </span>
                        <h4 className="font-extrabold text-xl text-foreground flex items-center gap-2">
                          <span>
                            <AnimatedCounter value={dynamicScore} suffix="%" /> Security
                          </span>
                          <Badge className={riskClassification.color}>
                            {riskClassification.label}
                          </Badge>
                        </h4>
                        <ConfidenceBar value={avgConfidence} label="AI Confidence" size="sm" />
                      </div>
                    </div>

                    {/* Summary grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-secondary/40 border border-border/60 p-3 rounded-xl text-left space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Total PII
                        </span>
                        <p className="text-lg font-bold text-foreground">
                          <AnimatedCounter value={detections.length} />
                        </p>
                      </div>
                      <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl text-left space-y-1">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold flex items-center gap-1">
                          <EyeOff className="h-3 w-3" /> Redacted
                        </span>
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          <AnimatedCounter value={activeRedactions.length} />
                        </p>
                      </div>
                      <div className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl text-left space-y-1">
                        <span className="text-[10px] text-rose-500 uppercase font-semibold flex items-center gap-1">
                          <Eye className="h-3 w-3" /> Visible
                        </span>
                        <p className="text-lg font-bold text-rose-500">
                          <AnimatedCounter value={rejectedRedactions.length} />
                        </p>
                      </div>
                      <div className="bg-violet-500/5 border border-violet-500/10 p-3 rounded-xl text-left space-y-1">
                        <span className="text-[10px] text-violet-500 uppercase font-semibold flex items-center gap-1">
                          <History className="h-3 w-3" /> Reviews
                        </span>
                        <p className="text-lg font-bold text-violet-500">
                          <AnimatedCounter value={reviewHistory.length} />
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabbed sidebar */}
                <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl border border-border flex-wrap sm:flex-nowrap">
                  {[
                    { id: "explain" as const, label: "Explain", icon: Sparkles },
                    { id: "insights" as const, label: "Insights", icon: Shield },
                    { id: "timeline" as const, label: "Timeline", icon: Clock },
                    { id: "history" as const, label: "History", icon: History },
                    { id: "settings" as const, label: "Settings", icon: Settings },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setSidebarTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                          sidebarTab === tab.id
                            ? "bg-card text-foreground shadow-sm border border-border"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        aria-pressed={sidebarTab === tab.id}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence mode="wait">
                  {/* ===== TAB: Explain ===== */}
                  {sidebarTab === "explain" && (
                    <motion.div
                      key="tab-explain"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      {selectedDet ? (
                        <Card className="bg-card text-left border-primary/20 shadow-lg">
                          <CardHeader className="border-b border-border flex flex-row items-center justify-between py-4">
                            <div className="space-y-1">
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                PII Detected Flag
                              </span>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <span className="font-mono bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded text-sm">
                                  {selectedDet.text}
                                </span>
                                {showConfidence && (
                                  <ConfidencePill value={selectedDet.confidence} />
                                )}
                              </CardTitle>
                            </div>
                            <Badge variant="destructive">{selectedDet.type}</Badge>
                          </CardHeader>
                          <CardContent className="p-6 space-y-5">
                            {/* Approval toggle */}
                            <div className="flex items-center justify-between bg-secondary/30 p-3 rounded-lg border border-border">
                              <span className="text-sm font-semibold">Redact this item?</span>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant={selectedDet.approved ? "destructive" : "outline"}
                                  onClick={() => toggleApproval(selectedDet.id)}
                                  leftIcon={<XCircle className="h-3.5 w-3.5" />}
                                >
                                  Redact
                                </Button>
                                <Button
                                  size="sm"
                                  variant={!selectedDet.approved ? "primary" : "outline"}
                                  onClick={() => toggleApproval(selectedDet.id)}
                                  leftIcon={<CheckCircle className="h-3.5 w-3.5" />}
                                >
                                  Keep Visible
                                </Button>
                              </div>
                            </div>

                            {/* Explanations */}
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                                <Sparkles className="h-4 w-4 text-violet-500" />
                                <span>Gemini Explainability Log</span>
                              </div>

                              {explainLoading ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                                  <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                                  <span>Querying explanation...</span>
                                </div>
                              ) : explainResult ? (
                                <div className="space-y-4 text-sm leading-relaxed">
                                  <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground block font-semibold">
                                      WHY DETECTED
                                    </span>
                                    <p>{explainResult.whyDetected}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground block font-semibold">
                                      LOGICAL REASONING
                                    </span>
                                    <p>{explainResult.reason}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground block font-semibold">
                                      POSSIBLE CONSEQUENCES
                                    </span>
                                    <p className="text-rose-600 dark:text-rose-400">
                                      {explainResult.risk}
                                    </p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                                    <div>
                                      <span className="text-xs text-muted-foreground block font-semibold mb-1">
                                        RISK LEVEL
                                      </span>
                                      <Badge className={getRiskColor(explainResult.risk)}>
                                        {explainResult.risk}
                                      </Badge>
                                    </div>
                                    <div>
                                      <span className="text-xs text-muted-foreground block font-semibold mb-1">
                                        CONFIDENCE
                                      </span>
                                      <ConfidenceBar
                                        value={explainResult.confidence}
                                        showPercent={true}
                                        size="sm"
                                      />
                                    </div>
                                  </div>
                                  <div className="pt-2 border-t border-border space-y-1">
                                    <span className="text-xs text-muted-foreground block font-semibold">
                                      SUGGESTED ACTION
                                    </span>
                                    <span className="font-mono bg-secondary px-2 py-0.5 rounded text-xs text-foreground font-semibold">
                                      {selectedDet.suggestedRedaction}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  Click a detection to query AI explanation.
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ) : whyNotResult ? (
                        <Card className="bg-card text-left border-violet-500/20 shadow-lg">
                          <CardHeader className="border-b border-border py-4">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                              OMISSION AUDIT
                            </span>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <span>Analysis:</span>
                              <span className="font-mono bg-violet-500/10 text-violet-500 px-2 py-0.5 rounded text-sm">
                                {whyNotText}
                              </span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-6 space-y-4 text-sm leading-relaxed">
                            <div className="space-y-1">
                              <span className="text-xs text-muted-foreground block font-semibold">
                                REASON LEFT VISIBLE
                              </span>
                              <p>{whyNotResult.whyNotDetected}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs text-muted-foreground block font-semibold">
                                RECOMMENDATION
                              </span>
                              <p>{whyNotResult.reason}</p>
                            </div>
                            {whyNotResult.shouldHaveBeenDetected && (
                              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-3 rounded-lg flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold block text-xs uppercase">
                                    ⚠ Potentially Missed PII
                                  </span>
                                  <span className="text-xs">
                                    Gemini flags this item may match PII criteria.
                                  </span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ) : detections.length > 0 ? (
                        <EmptyState
                          title="Select a PII Token"
                          description="Click any highlighted token in the document to view AI confidence, risk level, and logical reasoning."
                          className="min-h-[200px]"
                        />
                      ) : (
                        <ErrorState
                          title="No Detections"
                          description="No PII was detected. The document may be safe, or analysis failed."
                          retryLabel="Re-upload"
                          onRetry={() => router.push("/sandbox")}
                        />
                      )}
                    </motion.div>
                  )}

                  {/* ===== TAB: Insights ===== */}
                  {sidebarTab === "insights" && (
                    <motion.div
                      key="tab-insights"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <Card className="bg-card border-border">
                        <CardContent className="p-6">
                          <PIIInsights detections={detections} />
                        </CardContent>
                      </Card>
                      <Card className="bg-card border-border">
                        <CardContent className="p-6">
                          <RiskSummary detections={detections} privacyScore={dynamicScore} />
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* ===== TAB: Timeline ===== */}
                  {sidebarTab === "timeline" && (
                    <motion.div
                      key="tab-timeline"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="bg-card border-border">
                        <CardContent className="p-6">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-4">
                            AI PROCESSING TIMELINE
                          </span>
                          <AITimeline steps={timelineSteps} />
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* ===== TAB: History ===== */}
                  {sidebarTab === "history" && (
                    <motion.div
                      key="tab-history"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="bg-card border-border">
                        <CardContent className="p-6">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-4">
                            REVIEW HISTORY
                          </span>
                          {reviewHistory.length === 0 ? (
                            <EmptyState
                              title="No Reviews Yet"
                              description="Approve or reject detections to build your review history."
                              className="min-h-[150px]"
                            />
                          ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                              {reviewHistory.map((item, idx) => (
                                <motion.div
                                  key={`${item.detectionId}-${idx}`}
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.03 }}
                                  className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 border border-border text-sm"
                                >
                                  {item.action === "approved" ? (
                                    <EyeOff className="h-4 w-4 text-emerald-500 shrink-0" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-rose-500 shrink-0" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <span className="font-mono text-xs truncate block text-foreground">
                                      {item.detectionText}
                                    </span>
                                  </div>
                                  <Badge
                                    className={
                                      item.action === "approved"
                                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                                        : "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400"
                                    }
                                  >
                                    {item.action === "approved" ? "Redact" : "Visible"}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                    {item.timestamp.toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                    })}
                                  </span>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* ===== TAB: Settings ===== */}
                  {sidebarTab === "settings" && (
                    <motion.div
                      key="tab-settings"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="bg-card border-border shadow-lg">
                        <CardContent className="p-6 space-y-6 text-left">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                            PRIVACY CONTROLS & SETTINGS
                          </span>

                          {/* Confidence Threshold */}
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-foreground block">
                              AI CONFIDENCE THRESHOLD
                            </label>
                            <p className="text-[11px] text-muted-foreground">
                              Only highlight matches meeting the minimum AI certainty.
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                              {(["low", "medium", "high"] as const).map((level) => (
                                <button
                                  key={level}
                                  type="button"
                                  onClick={() => setConfidenceThreshold(level)}
                                  className={`text-xs font-semibold py-2 px-3 rounded-lg border transition-all uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                                    confidenceThreshold === level
                                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                      : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  {level}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Highlight Colors Selection */}
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-foreground block">
                              HIGHLIGHT COLOR THEME
                            </label>
                            <p className="text-[11px] text-muted-foreground">
                              Choose the marker color for active redactions in the source viewer.
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                              {(["rose", "violet", "amber"] as const).map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => setHighlightColors(color)}
                                  className={`text-xs font-semibold py-2 px-3 rounded-lg border transition-all capitalize flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                                    highlightColors === color
                                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                      : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  <span
                                    className={`w-2.5 h-2.5 rounded-full ${
                                      color === "rose"
                                        ? "bg-rose-500"
                                        : color === "violet"
                                          ? "bg-violet-500"
                                          : "bg-amber-500"
                                    }`}
                                  />
                                  {color}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Show Confidence badge toggle */}
                          <div className="flex items-center justify-between border-t border-border pt-4">
                            <div className="space-y-0.5">
                              <label className="text-xs font-bold text-foreground block">
                                SHOW CONFIDENCE PILLS
                              </label>
                              <span className="text-[11px] text-muted-foreground block">
                                Display AI confidence percentages next to tokens.
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowConfidence((p) => !p)}
                              className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                                showConfidence ? "bg-primary" : "bg-secondary-foreground/20"
                              }`}
                              role="switch"
                              aria-checked={showConfidence}
                            >
                              <span
                                className={`w-4 h-4 rounded-full bg-card absolute top-1 transition-all ${
                                  showConfidence ? "left-6" : "left-1"
                                }`}
                              />
                            </button>
                          </div>

                          {/* Bulk Actions */}
                          <div className="border-t border-border pt-4 space-y-2">
                            <label className="text-xs font-bold text-foreground block">
                              BULK EDIT OPERATIONS
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-[11px]"
                                onClick={() => {
                                  setDetections((prev) =>
                                    prev.map((d) => ({ ...d, approved: true }))
                                  );
                                  setReviewHistory((prev) => [
                                    {
                                      detectionId: "bulk-approve",
                                      detectionText: "Bulk Redact All",
                                      action: "approved",
                                      timestamp: new Date(),
                                    },
                                    ...prev,
                                  ]);
                                }}
                              >
                                Redact All
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-[11px]"
                                onClick={() => {
                                  setDetections((prev) =>
                                    prev.map((d) => ({ ...d, approved: false }))
                                  );
                                  setReviewHistory((prev) => [
                                    {
                                      detectionId: "bulk-reject",
                                      detectionText: "Bulk Keep Visible All",
                                      action: "rejected",
                                      timestamp: new Date(),
                                    },
                                    ...prev,
                                  ]);
                                }}
                              >
                                Keep All Visible
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  );
}
