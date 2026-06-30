"""
TrustLens – Strongly-typed document models (Pydantic v2).
All data lives in-memory via session_store; no database involved.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class FileType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"


class DocumentStatus(str, Enum):
    UPLOADED = "uploaded"
    EXTRACTING = "extracting"
    ANALYZING = "analyzing"
    ANALYZED = "analyzed"
    REDACTING = "redacting"
    REDACTED = "redacted"
    ERROR = "error"


class ApprovalState(str, Enum):
    APPROVED = "approved"   # will be redacted
    REJECTED = "rejected"   # left visible intentionally
    PENDING = "pending"     # not yet reviewed


class RiskLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# ---------------------------------------------------------------------------
# Detection (PII item)
# ---------------------------------------------------------------------------

class DetectionRecord(BaseModel):
    id: str = Field(default_factory=lambda: f"det-{uuid.uuid4().hex[:8]}")
    text: str
    type: str
    confidence: int = Field(ge=0, le=100)
    reason: str
    risk: str
    suggested_redaction: str = Field(alias="suggestedRedaction", default="[REDACTED]")
    approval: ApprovalState = ApprovalState.APPROVED
    # Location metadata
    page_number: Optional[int] = None
    line_number: Optional[int] = None

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Extract result (returned from parsers)
# ---------------------------------------------------------------------------

class ExtractResult(BaseModel):
    text: str
    page_count: int = 1
    word_count: int = 0
    char_count: int = 0


# ---------------------------------------------------------------------------
# Document record (stored in session)
# ---------------------------------------------------------------------------

class DocumentRecord(BaseModel):
    document_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    file_type: FileType
    file_size_bytes: int
    upload_time: datetime = Field(default_factory=datetime.utcnow)
    status: DocumentStatus = DocumentStatus.UPLOADED

    # Extracted content
    extracted_text: str = ""
    page_count: int = 1
    word_count: int = 0

    # Analysis results
    privacy_score: int = 100
    detections: list[DetectionRecord] = []

    # Paths to generated files
    original_path: str = ""
    redacted_path: str = ""

    # Error tracking
    error_message: str = ""


# ---------------------------------------------------------------------------
# Review update request (from frontend)
# ---------------------------------------------------------------------------

class ReviewUpdate(BaseModel):
    document_id: str
    detection_id: str
    approval: ApprovalState


# ---------------------------------------------------------------------------
# Privacy report
# ---------------------------------------------------------------------------

class RiskSummary(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class PrivacyReport(BaseModel):
    document_id: str
    filename: str
    file_type: str
    analysis_timestamp: str
    page_count: int
    word_count: int
    privacy_score: int
    detection_count: int
    approved_count: int
    rejected_count: int
    pending_count: int
    risk_summary: RiskSummary
    ai_summary: str
    detections: list[dict]
