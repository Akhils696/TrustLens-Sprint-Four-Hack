"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CircularProgress } from "@/components/ui/progress";
import {
  CheckCircle,
  XCircle,
  HelpCircle,
  Download,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from "lucide-react";

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

export default function Review() {
  const router = useRouter();
  const [fileId, setFileId] = React.useState("");
  const [filename, setFilename] = React.useState("");
  const [text, setText] = React.useState("");
  const [detections, setDetections] = React.useState<Detection[]>([]);
  const [privacyScore, setPrivacyScore] = React.useState(100);

  // Selected state for explaining
  const [selectedDet, setSelectedDet] = React.useState<Detection | null>(null);
  const [explainLoading, setExplainLoading] = React.useState(false);
  const [explainResult, setExplainResult] = React.useState<ExplainResult | null>(null);

  // Why-not state
  const [whyNotText, setWhyNotText] = React.useState("");
  const [whyNotLoading, setWhyNotLoading] = React.useState(false);
  const [whyNotResult, setWhyNotResult] = React.useState<WhyNotResult | null>(null);

  // Export state
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const cachedId = localStorage.getItem("trustlens_file_id") || "";
    const cachedName = localStorage.getItem("trustlens_filename") || "";
    const cachedText = localStorage.getItem("trustlens_text") || "";
    const cachedAnalysis = localStorage.getItem("trustlens_analysis");

    if (!cachedId || !cachedAnalysis) {
      router.push("/sandbox");
      return;
    }

    setFileId(cachedId);
    setFilename(cachedName);
    setText(cachedText);

    try {
      const parsed = JSON.parse(cachedAnalysis);
      setPrivacyScore(parsed.privacyScore);
      // Initialize detections as approved by default
      const dets = (parsed.detections || []).map((d: Detection) => ({
        ...d,
        approved: true,
      }));
      setDetections(dets);
    } catch {
      router.push("/sandbox");
    }
  }, [router]);

  // Recalculate security score based on active approved redactions
  const activeRedactions = detections.filter((d) => d.approved);
  const rejectedRedactions = detections.filter((d) => !d.approved);

  // Calculate dynamic security score: score increases back to 100 as risks are approved
  // Dynamically recalculate safety metric score showing safe-to-share index compliance
  const dynamicScore = React.useMemo(() => {
    if (detections.length === 0) return 100;
    const approvedRatio = activeRedactions.length / detections.length;
    return Math.round(privacyScore + (100 - privacyScore) * approvedRatio);
  }, [detections, activeRedactions, privacyScore]);

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

  // Triggers Gemini API explain endpoint to calculate confidence logs for the selected token
  const handleSelectDetection = async (det: Detection) => {
    setSelectedDet(det);
    setWhyNotResult(null);
    setExplainLoading(true);
    setExplainResult(null);

    try {
      // Find context (150 chars surrounding the text)
      const startIdx = Math.max(0, text.indexOf(det.text) - 100);
      const endIdx = Math.min(text.length, text.indexOf(det.text) + det.text.length + 100);
      const contextSnippet = text.substring(startIdx, endIdx);

      const res = await fetch("http://localhost:8000/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedText: det.text,
          context: contextSnippet,
        }),
      });

      if (!res.ok) throw new Error("Failed to load explanation.");
      const data = await res.json();
      setExplainResult(data);
    } catch {
      setExplainResult({
        whyDetected: "Failed to generate explanation. Check model connectivity.",
        risk: "N/A",
        reason: "Network response issue",
        confidence: 0,
      });
    } finally {
      setExplainLoading(false);
    }
  };

  const handleWhyNotQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whyNotText.trim()) return;

    setSelectedDet(null);
    setWhyNotLoading(true);
    setWhyNotResult(null);

    try {
      const idx = text.toLowerCase().indexOf(whyNotText.toLowerCase());
      const startIdx = Math.max(0, idx - 100);
      const endIdx = Math.min(text.length, idx + whyNotText.length + 100);
      const contextSnippet = idx !== -1 ? text.substring(startIdx, endIdx) : text.substring(0, 300);

      const res = await fetch("http://localhost:8000/api/why-not", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedText: whyNotText,
          context: contextSnippet,
        }),
      });

      if (!res.ok) throw new Error("Failed to load why-not explanation.");
      const data = await res.json();
      setWhyNotResult(data);
    } catch {
      setWhyNotResult({
        whyNotDetected: "Failed to query model logic.",
        shouldHaveBeenDetected: false,
        reason: "Network response issue",
      });
    } finally {
      setWhyNotLoading(false);
    }
  };

  const toggleApproval = (id: string) => {
    setDetections((prev) => prev.map((d) => (d.id === id ? { ...d, approved: !d.approved } : d)));
    // If updating selected item
    if (selectedDet && selectedDet.id === id) {
      setSelectedDet((prev) => (prev ? { ...prev, approved: !prev.approved } : null));
    }
  };

  const handleDocumentMouseUp = () => {
    if (typeof window === "undefined") return;
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : "";
    if (selectedText && selectedText.length > 1 && selectedText.length < 100) {
      setWhyNotText(selectedText);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const redactionTexts = activeRedactions.map((d) => d.text);
      const res = await fetch("http://localhost:8000/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          filename,
          redactions: redactionTexts,
        }),
      });

      if (!res.ok) throw new Error("Failed to export redacted document.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `redacted_${filename.split(".")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      alert("Export failed. Please check backend server status.");
    } finally {
      setExporting(false);
    }
  };

  // Render text with highlight marks
  const renderDocumentViewer = () => {
    if (!text) return null;
    if (activeRedactions.length === 0) return <p className="whitespace-pre-wrap">{text}</p>;

    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = activeRedactions
      .map((d) => escapeRegExp(d.text))
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .join("|");

    if (!pattern) return <p className="whitespace-pre-wrap">{text}</p>;

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
                onClick={() => handleSelectDetection(match)}
                className="bg-rose-500/25 hover:bg-rose-500/35 border-b-2 border-rose-500 text-foreground cursor-pointer rounded px-1 transition-all select-none mx-0.5"
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
  };

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
            <Button
              onClick={handleExport}
              disabled={exporting}
              rightIcon={<Download className="h-4 w-4" />}
            >
              {exporting ? "Exporting..." : "Download Redacted PDF"}
            </Button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Document Panel */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="min-h-[500px] max-h-[700px] overflow-y-auto bg-card border-border">
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
                {renderDocumentViewer()}
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
                      className="w-full text-sm bg-secondary/50 border border-border rounded-lg h-9 px-3 outline-none text-foreground"
                    />
                  </div>
                  <Button type="submit" size="sm" className="mt-5" disabled={whyNotLoading}>
                    {whyNotLoading ? "Auditing..." : "Audit Omission"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Explainability & Compliance Panel */}
          <div className="lg:col-span-5 space-y-6">
            {/* Safe to Share Card & Privacy Dashboard */}
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
                      <span>{dynamicScore}% Security</span>
                      <Badge className={riskClassification.color}>{riskClassification.label}</Badge>
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Document PII scanning and redaction metrics active.
                    </p>
                  </div>
                </div>

                {/* Grid summary cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/40 border border-border/60 p-3 rounded-xl text-left space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                      Total PII Found
                    </span>
                    <p className="text-lg font-bold text-foreground">{detections.length}</p>
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl text-left space-y-1">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">
                      Approved
                    </span>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {activeRedactions.length}
                    </p>
                  </div>
                  <div className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl text-left space-y-1">
                    <span className="text-[10px] text-rose-500 uppercase font-semibold">
                      Rejected
                    </span>
                    <p className="text-lg font-bold text-rose-500">{rejectedRedactions.length}</p>
                  </div>
                  <div className="bg-violet-500/5 border border-violet-500/10 p-3 rounded-xl text-left space-y-1">
                    <span className="text-[10px] text-violet-500 uppercase font-semibold">
                      Pending Review
                    </span>
                    <p className="text-lg font-bold text-violet-500">0</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Selected PII Explanation Panel */}
            <AnimatePresence mode="wait">
              {selectedDet ? (
                <motion.div
                  key={`selected-${selectedDet.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
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
                        </CardTitle>
                      </div>
                      <Badge variant="destructive">{selectedDet.type}</Badge>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
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
                            Approve Visible
                          </Button>
                        </div>
                      </div>

                      {/* Gemini Explanations block */}
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
                                DETECTION SUMMARY
                              </span>
                              <p>{explainResult.whyDetected}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs text-muted-foreground block font-semibold">
                                LOGICAL REASONING
                              </span>
                              <p>{explainResult.reason}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                              <div>
                                <span className="text-xs text-muted-foreground block font-semibold">
                                  LEAKAGE RISK LEVEL
                                </span>
                                <Badge className={getRiskColor(explainResult.risk)}>
                                  {explainResult.risk}
                                </Badge>
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground block font-semibold">
                                  CONFIDENCE
                                </span>
                                <span className="text-xs font-bold text-foreground">
                                  {explainResult.confidence}% Match
                                </span>
                              </div>
                            </div>
                            <div className="pt-2 border-t border-border space-y-1">
                              <span className="text-xs text-muted-foreground block font-semibold">
                                SUGGESTED REDACTION
                              </span>
                              <span className="font-mono bg-secondary px-2 py-0.5 rounded text-xs text-foreground font-semibold">
                                {selectedDet.suggestedRedaction}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No logs calculated.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : whyNotResult ? (
                <motion.div
                  key="why-not-panel"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="bg-card text-left border-violet-500/20 shadow-lg">
                    <CardHeader className="border-b border-border py-4">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        OMISSION AUDIT LOG
                      </span>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span>Omission Analysis:</span>
                        <span className="font-mono bg-violet-500/10 text-violet-500 px-2 py-0.5 rounded text-sm">
                          {whyNotText}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4 text-sm leading-relaxed">
                      <div className="flex items-center gap-2 text-primary font-bold text-sm">
                        <Sparkles className="h-4 w-4 text-violet-500" />
                        <span>Gemini Omission Explanation</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground block font-semibold">
                          REASON LEFT VISIBLE
                        </span>
                        <p>{whyNotResult.whyNotDetected}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground block font-semibold">
                          CRITERIA CHECK
                        </span>
                        <p>{whyNotResult.reason}</p>
                      </div>
                      {whyNotResult.shouldHaveBeenDetected && (
                        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-3 rounded-lg flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block text-xs uppercase">
                              Warning: False Negative
                            </span>
                            <span className="text-xs">
                              Gemini flags that this item matches PII criteria and should have been
                              redacted.
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="help-panel"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="bg-card text-center p-8 border-border shadow-md">
                    <HelpCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-foreground mb-1">No Item Selected</h4>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Click on any highlighted PII token in the document page to review AI
                      confidence, risks, and logical logs.
                    </p>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
