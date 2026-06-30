/**
 * TrustLens – Strongly-typed document interfaces.
 * These mirror the backend Pydantic models exactly.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type FileType = "pdf" | "docx" | "txt";

export type DocumentStatus =
  "uploaded" | "extracting" | "analyzing" | "analyzed" | "redacting" | "redacted" | "error";

export type ApprovalState = "approved" | "rejected" | "pending";

// ---------------------------------------------------------------------------
// Detection (PII item)
// ---------------------------------------------------------------------------

export interface Detection {
  id: string;
  text: string;
  type: string;
  confidence: number; // 0-100
  reason: string;
  risk: string;
  suggestedRedaction: string;
  /** Whether this detection is approved for redaction */
  approved: boolean;
  approval?: ApprovalState;
  pageNumber?: number | null;
  lineNumber?: number | null;
}

// ---------------------------------------------------------------------------
// Upload response
// ---------------------------------------------------------------------------

export interface UploadResponse {
  documentId: string;
  /** Alias kept for backward compat */
  fileId: string;
  filename: string;
  fileType: FileType;
  fileSizeBytes: number;
  pageCount: number;
  wordCount: number;
  text: string;
  status: "uploaded";
}

// ---------------------------------------------------------------------------
// Analysis response
// ---------------------------------------------------------------------------

export interface AnalysisResponse {
  documentId: string;
  privacyScore: number;
  detections: Detection[];
}

// ---------------------------------------------------------------------------
// Explain response
// ---------------------------------------------------------------------------

export interface ExplainResponse {
  whyDetected: string;
  risk: string;
  reason: string;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Why-not response
// ---------------------------------------------------------------------------

export interface WhyNotResponse {
  whyNotDetected: string;
  shouldHaveBeenDetected: boolean;
  reason: string;
}

// ---------------------------------------------------------------------------
// Review update response
// ---------------------------------------------------------------------------

export interface ReviewUpdateResponse {
  documentId: string;
  detectionId: string;
  approval: ApprovalState;
  dynamicPrivacyScore: number;
  approvedCount: number;
  rejectedCount: number;
}

// ---------------------------------------------------------------------------
// Redact response
// ---------------------------------------------------------------------------

export interface RedactResponse {
  documentId: string;
  status: "redacted";
  redactedCount: number;
  downloadUrls: {
    pdf: string;
    txt: string;
  };
}

// ---------------------------------------------------------------------------
// Risk summary
// ---------------------------------------------------------------------------

export interface RiskSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

// ---------------------------------------------------------------------------
// Privacy report
// ---------------------------------------------------------------------------

export interface PrivacyReport {
  document_id: string;
  filename: string;
  file_type: FileType;
  analysis_timestamp: string;
  page_count: number;
  word_count: number;
  privacy_score: number;
  detection_count: number;
  approved_count: number;
  rejected_count: number;
  pending_count: number;
  risk_summary: RiskSummary;
  ai_summary: string;
  detections: Array<{
    id: string;
    text: string;
    type: string;
    confidence: number;
    risk: string;
    reason: string;
    approval: ApprovalState;
    pageNumber?: number | null;
    lineNumber?: number | null;
  }>;
}

// ---------------------------------------------------------------------------
// Export request (backward compat)
// ---------------------------------------------------------------------------

export interface ExportRequest {
  fileId: string;
  filename: string;
  redactions: string[];
}
