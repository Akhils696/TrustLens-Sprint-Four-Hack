"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Upload, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Sandbox() {
  const router = useRouter();
  const [dragActive, setDragActive] = React.useState(false);

  const [status, setStatus] = React.useState<"idle" | "uploading" | "analyzing" | "failed">("idle");
  const [statusMessage, setStatusMessage] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState("");

  const [stages, setStages] = React.useState([
    { id: 1, label: "Uploading Document", status: "pending" as const },
    { id: 2, label: "Extracting Text", status: "pending" as const },
    { id: 3, label: "Detecting PII", status: "pending" as const },
    { id: 4, label: "Analyzing Context", status: "pending" as const },
    { id: 5, label: "Generating Explanations", status: "pending" as const },
    { id: 6, label: "Preparing Report", status: "pending" as const },
  ]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Sequential timer to progress through context analysis stages in demo UI
  React.useEffect(() => {
    if (status !== "analyzing") return;
    let idx = 2; // stage 3 index is 2
    const interval = setInterval(() => {
      setStages((prev) =>
        prev.map((s, i) => {
          if (i === idx) return { ...s, status: "completed" };
          if (i === idx + 1) return { ...s, status: "loading" };
          return s;
        })
      );
      idx++;
      if (idx >= 5) clearInterval(interval);
    }, 1200);
    return () => clearInterval(interval);
  }, [status]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (selectedFile: File) => {
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "docx", "txt"].includes(ext)) {
      setErrorMsg("Unsupported file format. Please upload a PDF, DOCX, or TXT file.");
      return;
    }
    setErrorMsg("");

    await uploadAndAnalyze(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const uploadAndAnalyze = async (targetFile: File) => {
    setStatus("uploading");
    setStages([
      { id: 1, label: "Uploading Document", status: "loading" },
      { id: 2, label: "Extracting Text", status: "pending" },
      { id: 3, label: "Detecting PII", status: "pending" },
      { id: 4, label: "Analyzing Context", status: "pending" },
      { id: 5, label: "Generating Explanations", status: "pending" },
      { id: 6, label: "Preparing Report", status: "pending" },
    ]);

    const formData = new FormData();
    formData.append("file", targetFile);

    try {
      // 1. Upload Document
      const uploadRes = await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json();
        throw new Error(errData.detail || "Failed to upload document.");
      }

      const uploadData = await uploadRes.json();
      const fileId = uploadData.fileId;
      const textContent = uploadData.text;

      // Mark upload and extraction as completed
      setStages((prev) =>
        prev.map((s) => {
          if (s.id === 1 || s.id === 2) return { ...s, status: "completed" };
          if (s.id === 3) return { ...s, status: "loading" };
          return s;
        })
      );

      // 2. Trigger PII Analysis
      setStatus("analyzing");
      const analyzeRes = await fetch("http://localhost:8000/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textContent }),
      });

      if (!analyzeRes.ok) {
        const errData = await analyzeRes.json();
        throw new Error(errData.detail || "Failed to analyze document.");
      }

      const analyzeData = await analyzeRes.json();

      // Complete all remaining stages
      setStages((prev) => prev.map((s) => ({ ...s, status: "completed" })));
      // A small delay for user confirmation
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Save credentials for the Review dashboard
      localStorage.setItem("trustlens_file_id", fileId);
      localStorage.setItem("trustlens_filename", targetFile.name);
      localStorage.setItem("trustlens_text", textContent);
      localStorage.setItem("trustlens_analysis", JSON.stringify(analyzeData));

      // Route to review interface
      router.push("/review");
    } catch (err: unknown) {
      setStatus("failed");
      const message = err instanceof Error ? err.message : "An unexpected network error occurred.";
      setErrorMsg(message);
    }
  };

  return (
    <MainLayout>
      <div className="container py-20 max-w-3xl space-y-10 text-center">
        <div className="space-y-4 max-w-xl mx-auto">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Document Upload Sandbox
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            Upload your document ephemerally. Detections and classifications occur completely in
            memory and are wiped post-session.
          </p>
        </div>

        {status === "idle" || status === "failed" ? (
          <div className="space-y-6">
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 bg-card select-none ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/60"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt"
                onChange={handleFileInput}
              />
              <Upload className="h-12 w-12 text-muted-foreground mb-4 animate-bounce" />
              <h3 className="text-lg font-bold text-foreground mb-1">
                Drag and drop your file here
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mb-4">
                Support for PDF, DOCX, or TXT formats (up to 15MB file limit).
              </p>
              <Button type="button" variant="outline" size="sm">
                Browse Files
              </Button>
            </div>

            {errorMsg && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-3 text-left max-w-md mx-auto">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="border border-border rounded-2xl p-8 bg-card space-y-6 flex flex-col items-stretch text-left max-w-md mx-auto shadow-lg">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <RefreshCw className="h-6 w-6 text-primary animate-spin" />
              <div>
                <h3 className="text-md font-bold text-foreground">AI Privacy Workspace</h3>
                <p className="text-xs text-muted-foreground">
                  Analyzing token boundaries for sensitive descriptors.
                </p>
              </div>
            </div>

            {/* Checklist of stages */}
            <div className="space-y-4">
              {stages.map((stage) => (
                <div key={stage.id} className="flex items-center justify-between text-sm">
                  <span
                    className={`font-semibold ${stage.status === "pending" ? "text-muted-foreground" : "text-foreground"}`}
                  >
                    {stage.label}
                  </span>
                  <div>
                    {stage.status === "completed" && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400">
                        <CheckCircle className="h-3 w-3 inline mr-1" /> Done
                      </Badge>
                    )}
                    {stage.status === "loading" && (
                      <Badge className="bg-primary/10 text-primary border border-primary/20 animate-pulse">
                        <RefreshCw className="h-3 w-3 inline mr-1 animate-spin" /> In Progress
                      </Badge>
                    )}
                    {stage.status === "pending" && (
                      <Badge variant="outline" className="text-muted-foreground border-dashed">
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full w-[60%] rounded-full animate-infinite-loading" />
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
