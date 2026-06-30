"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Upload, RefreshCw, AlertCircle } from "lucide-react";

export default function Sandbox() {
  const router = useRouter();
  const [dragActive, setDragActive] = React.useState(false);

  const [status, setStatus] = React.useState<"idle" | "uploading" | "analyzing" | "failed">("idle");
  const [statusMessage, setStatusMessage] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Rotation text for LLM progress states
  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (status !== "analyzing") return;
    const messages = [
      "Analyzing document...",
      "Finding sensitive information...",
      "Generating explanations...",
      "Applying layout boundaries...",
    ];
    let idx = 0;
    setStatusMessage(messages[0]);
    const interval = setInterval(() => {
      idx = (idx + 1) % messages.length;
      setStatusMessage(messages[idx]);
    }, 2000);
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
    setStatusMessage("Uploading document to secure workspace...");

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
          <div className="border border-border rounded-2xl p-12 bg-card space-y-8 flex flex-col items-center max-w-md mx-auto shadow-lg animate-pulse">
            <RefreshCw className="h-10 w-10 text-primary animate-spin" />
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground">{statusMessage}</h3>
              <p className="text-xs text-muted-foreground">
                Analyzing token boundaries for sensitive descriptors. Please keep this browser
                window open.
              </p>
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
