"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, RefreshCw, AlertCircle, CheckCircle, FileText, File } from "lucide-react";
import { uploadDocument, analyzeDocument, ApiError } from "@/services/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileIcon(ext: string) {
  if (ext === ".pdf") return <File className="h-5 w-5 text-rose-500" />;
  if (ext === ".docx") return <FileText className="h-5 w-5 text-blue-500" />;
  return <FileText className="h-5 w-5 text-muted-foreground" />;
}

function validateFile(file: File): string | null {
  const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Unsupported format '${ext}'. Please upload PDF, DOCX, or TXT.`;
  }
  if (file.size === 0) return "File is empty.";
  if (file.size > MAX_FILE_BYTES) {
    return `File too large (${formatBytes(file.size)}). Maximum is 20 MB.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Stage definitions
// ---------------------------------------------------------------------------

type StageStatus = "pending" | "loading" | "completed";

interface Stage {
  id: number;
  label: string;
  status: StageStatus;
}

const INITIAL_STAGES: Stage[] = [
  { id: 1, label: "Uploading Document", status: "pending" },
  { id: 2, label: "Extracting Text", status: "pending" },
  { id: 3, label: "Detecting PII", status: "pending" },
  { id: 4, label: "Analyzing Context", status: "pending" },
  { id: 5, label: "Generating Explanations", status: "pending" },
  { id: 6, label: "Preparing Report", status: "pending" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Sandbox() {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = React.useState(false);
  const [status, setStatus] = React.useState<"idle" | "uploading" | "analyzing" | "failed">("idle");
  const [errorMsg, setErrorMsg] = React.useState("");
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [stages, setStages] = React.useState<Stage[]>(INITIAL_STAGES);

  const isProcessing = status === "uploading" || status === "analyzing";

  // Animate analysis stages while Gemini processes
  React.useEffect(() => {
    if (status !== "analyzing") return;
    let idx = 2; // start from stage index 2 (Detecting PII)
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

  // ---------------------------------------------------------------------------
  // Drag handlers
  // ---------------------------------------------------------------------------

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    // Reset so same file can be re-uploaded
    e.target.value = "";
  };

  const triggerFileInput = () => {
    if (!isProcessing) fileInputRef.current?.click();
  };

  // ---------------------------------------------------------------------------
  // Main pipeline
  // ---------------------------------------------------------------------------

  const processFile = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setErrorMsg(validationError);
      setStatus("failed");
      return;
    }
    setErrorMsg("");
    setSelectedFile(file);
    void runPipeline(file);
  };

  const runPipeline = async (file: File) => {
    // Reset stages
    setStages([
      { id: 1, label: "Uploading Document", status: "loading" },
      { id: 2, label: "Extracting Text", status: "pending" },
      { id: 3, label: "Detecting PII", status: "pending" },
      { id: 4, label: "Analyzing Context", status: "pending" },
      { id: 5, label: "Generating Explanations", status: "pending" },
      { id: 6, label: "Preparing Report", status: "pending" },
    ]);
    setUploadProgress(0);
    setStatus("uploading");

    try {
      // Step 1: Upload with progress tracking
      const uploadData = await uploadDocument(file, (pct) => setUploadProgress(pct));

      // Mark upload + extraction complete
      setStages((prev) =>
        prev.map((s) => {
          if (s.id === 1 || s.id === 2) return { ...s, status: "completed" };
          if (s.id === 3) return { ...s, status: "loading" };
          return s;
        })
      );

      // Step 2: Analyze with Gemini
      setStatus("analyzing");
      const analysisData = await analyzeDocument(uploadData.documentId, uploadData.text);

      // Mark all stages complete
      setStages((prev) => prev.map((s) => ({ ...s, status: "completed" })));
      await new Promise((r) => setTimeout(r, 500)); // brief visual confirmation

      // Persist to localStorage for review page
      localStorage.setItem("trustlens_file_id", uploadData.documentId);
      localStorage.setItem("trustlens_filename", file.name);
      localStorage.setItem("trustlens_text", uploadData.text);
      localStorage.setItem(
        "trustlens_analysis",
        JSON.stringify({
          privacyScore: analysisData.privacyScore,
          detections: analysisData.detections,
          documentId: uploadData.documentId,
        })
      );
      localStorage.setItem("trustlens_document_id", uploadData.documentId);

      router.push("/review");
    } catch (err) {
      setStatus("failed");
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("An unexpected error occurred. Please try again.");
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

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
            {/* Drop zone */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload document. Drag and drop or click to browse files."
              aria-disabled={isProcessing}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              onKeyDown={(e) => e.key === "Enter" && triggerFileInput()}
              className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 bg-card select-none focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                dragActive
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border hover:border-muted-foreground/60"
              } ${isProcessing ? "pointer-events-none opacity-50" : ""}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt"
                onChange={handleFileInput}
                disabled={isProcessing}
                aria-hidden="true"
              />
              <Upload className="h-12 w-12 text-muted-foreground mb-4 animate-bounce" />
              <h3 className="text-lg font-bold text-foreground mb-1">
                Drag and drop your file here
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mb-2">
                Supported: PDF, DOCX, TXT — up to 20 MB
              </p>

              {/* Format badges */}
              <div className="flex gap-2 mb-4">
                {["PDF", "DOCX", "TXT"].map((fmt) => (
                  <Badge
                    key={fmt}
                    variant="outline"
                    className="text-[10px] font-semibold px-2 py-0.5"
                  >
                    {fmt}
                  </Badge>
                ))}
              </div>

              <Button type="button" variant="outline" size="sm" disabled={isProcessing}>
                Browse Files
              </Button>
            </div>

            {/* Selected file info */}
            {selectedFile && status === "failed" && (
              <div className="flex items-center gap-3 bg-secondary/40 border border-border rounded-xl p-4 max-w-md mx-auto text-left">
                {getFileIcon("." + (selectedFile.name.split(".").pop() ?? ""))}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(selectedFile.size)} ·{" "}
                    {(selectedFile.name.split(".").pop() ?? "").toUpperCase()}
                  </p>
                </div>
              </div>
            )}

            {/* Error alert */}
            {errorMsg && (
              <div
                role="alert"
                aria-live="assertive"
                className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-3 text-left max-w-md mx-auto"
              >
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        ) : (
          /* Processing panel */
          <div className="border border-border rounded-2xl p-8 bg-card space-y-6 flex flex-col items-stretch text-left max-w-md mx-auto shadow-lg">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <RefreshCw className="h-6 w-6 text-primary animate-spin" aria-hidden="true" />
              <div>
                <h3 className="text-md font-bold text-foreground">AI Privacy Workspace</h3>
                <p className="text-xs text-muted-foreground">
                  Analyzing token boundaries for sensitive descriptors.
                </p>
              </div>
            </div>

            {/* File info */}
            {selectedFile && (
              <div className="flex items-center gap-3 bg-secondary/30 rounded-xl p-3 border border-border">
                {getFileIcon("." + (selectedFile.name.split(".").pop() ?? ""))}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(selectedFile.size)} ·{" "}
                    {(selectedFile.name.split(".").pop() ?? "").toUpperCase()}
                  </p>
                </div>
              </div>
            )}

            {/* Upload progress (only during upload phase) */}
            {status === "uploading" && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground font-semibold">
                  <span>Upload Progress</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                    role="progressbar"
                    aria-valuenow={uploadProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </div>
            )}

            {/* Stage checklist */}
            <div className="space-y-3" aria-label="Processing stages">
              {stages.map((stage) => (
                <div key={stage.id} className="flex items-center justify-between text-sm">
                  <span
                    className={`font-semibold ${
                      stage.status === "pending" ? "text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {stage.label}
                  </span>
                  <div>
                    {stage.status === "completed" && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400">
                        <CheckCircle className="h-3 w-3 inline mr-1" aria-hidden="true" /> Done
                      </Badge>
                    )}
                    {stage.status === "loading" && (
                      <Badge className="bg-primary/10 text-primary border border-primary/20 animate-pulse">
                        <RefreshCw
                          className="h-3 w-3 inline mr-1 animate-spin"
                          aria-hidden="true"
                        />{" "}
                        In Progress
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

            {/* Indeterminate progress bar */}
            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full w-[60%] rounded-full animate-infinite-loading" />
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
