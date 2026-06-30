/**
 * TrustLens – Typed API client service.
 *
 * All API calls go through this module. No scattered fetch() calls in pages.
 * Base URL is read from NEXT_PUBLIC_API_URL env var (defaults to localhost:8000).
 */

import type {
  AnalysisResponse,
  ApprovalState,
  ExplainResponse,
  PrivacyReport,
  RedactResponse,
  ReviewUpdateResponse,
  UploadResponse,
  WhyNotResponse,
} from "@/types/document";

const BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) || "http://localhost:8000";

// ---------------------------------------------------------------------------
// Generic fetch wrapper
// ---------------------------------------------------------------------------

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

/**
 * Upload a document file. Returns document metadata + extracted text.
 * Supports upload progress via XMLHttpRequest.
 */
export function uploadDocument(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE_URL}/api/upload`);

    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadResponse);
        } catch {
          reject(new ApiError(xhr.status, "Invalid JSON in upload response."));
        }
      } else {
        let detail = `HTTP ${xhr.status}`;
        try {
          const body = JSON.parse(xhr.responseText);
          detail = body.detail || detail;
        } catch {
          /* ignore */
        }
        reject(new ApiError(xhr.status, detail));
      }
    };

    xhr.onerror = () => reject(new ApiError(0, "Network error during upload."));
    xhr.ontimeout = () => reject(new ApiError(0, "Upload timed out."));
    xhr.timeout = 120_000; // 2 minutes

    xhr.send(formData);
  });
}

// ---------------------------------------------------------------------------
// Analyze
// ---------------------------------------------------------------------------

export async function analyzeDocument(documentId: string, text: string): Promise<AnalysisResponse> {
  return apiFetch<AnalysisResponse>("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_id: documentId, text }),
  });
}

// ---------------------------------------------------------------------------
// Explain
// ---------------------------------------------------------------------------

export async function explainDetection(
  selectedText: string,
  context: string
): Promise<ExplainResponse> {
  return apiFetch<ExplainResponse>("/api/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedText, context }),
  });
}

// ---------------------------------------------------------------------------
// Why-not
// ---------------------------------------------------------------------------

export async function explainWhyNot(
  selectedText: string,
  context: string
): Promise<WhyNotResponse> {
  return apiFetch<WhyNotResponse>("/api/why-not", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedText, context }),
  });
}

// ---------------------------------------------------------------------------
// Review (update approval state)
// ---------------------------------------------------------------------------

export async function updateReviewState(
  documentId: string,
  detectionId: string,
  approval: ApprovalState
): Promise<ReviewUpdateResponse> {
  return apiFetch<ReviewUpdateResponse>("/api/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_id: documentId, detection_id: detectionId, approval }),
  });
}

// ---------------------------------------------------------------------------
// Redact
// ---------------------------------------------------------------------------

export async function redactDocument(
  documentId: string,
  detectionIds?: string[]
): Promise<RedactResponse> {
  return apiFetch<RedactResponse>("/api/redact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_id: documentId, detection_ids: detectionIds ?? [] }),
  });
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

/**
 * Download the redacted document. Triggers a browser file download.
 */
export async function downloadRedacted(
  documentId: string,
  format: "pdf" | "txt" = "pdf"
): Promise<void> {
  const url = `${BASE_URL}/api/download/${documentId}?format=${format}`;
  const res = await fetch(url);
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);

  // Extract filename from Content-Disposition header
  const disposition = res.headers.get("content-disposition") || "";
  const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  const filename = match ? match[1].replace(/['"]/g, "") : `redacted.${format}`;

  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

// ---------------------------------------------------------------------------
// Privacy Report
// ---------------------------------------------------------------------------

export async function getPrivacyReport(documentId: string): Promise<PrivacyReport> {
  return apiFetch<PrivacyReport>(`/api/report/${documentId}`);
}

/**
 * Download the privacy report as a formatted JSON file.
 */
export async function downloadPrivacyReport(documentId: string, filename: string): Promise<void> {
  const report = await getPrivacyReport(documentId);
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const stem = filename.replace(/\.[^.]+$/, "");
  const a = document.createElement("a");
  a.href = url;
  a.download = `${stem}_privacy_report.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Backward-compat export (used by Sprint 2/3 review page)
// ---------------------------------------------------------------------------

export async function exportRedacted(
  fileId: string,
  filename: string,
  redactions: string[]
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId, filename, redactions }),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const stem = filename.replace(/\.[^.]+$/, "");
  const a = document.createElement("a");
  a.href = url;
  a.download = `redacted_${stem}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export { ApiError };
