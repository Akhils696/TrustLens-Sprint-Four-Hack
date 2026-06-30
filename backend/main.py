"""
TrustLens – FastAPI Backend

Endpoints:
  POST /api/upload           — upload, validate, extract, store DocumentRecord
  POST /api/analyze          — run Gemini PII analysis, store detections
  POST /api/explain          — explain a specific detection
  POST /api/why-not          — explain why text was not detected
  POST /api/review           — update approval state for a detection
  POST /api/redact           — run redaction engine, store output paths
  GET  /api/download/{id}    — download redacted file (pdf or txt)
  GET  /api/report/{id}      — generate and return privacy report JSON
  GET  /api/health           — health check
"""
from __future__ import annotations

import json
import os
import re
import shutil
import uuid
from datetime import datetime
from typing import Literal

from fastapi import FastAPI, File, HTTPException, Query, Request, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from gemini_client import (
    analyze_text_for_pii,
    explain_detection,
    explain_why_not,
    generate_ai_summary,
)
from models import (
    ApprovalState,
    DetectionRecord,
    DocumentRecord,
    DocumentStatus,
    FileType,
    PrivacyReport,
    ReviewUpdate,
    RiskLevel,
    RiskSummary,
)
from parsers import extract_text_from_file
from redactor import redact_document
from session_store import store

load_dotenv()

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title="TrustLens API", version="4.0.0")

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
ALLOWED_MIMES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    # Some browsers send these for DOCX/PDF
    "application/octet-stream",
    "application/msword",
}
MAX_FILE_BYTES = 20 * 1024 * 1024  # 20 MB

PII_PATTERN_RULES = [
    {
        "type": "Email Address",
        "pattern": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
        "confidence": 99,
        "risk": "High - direct contact identifier exposure",
        "suggested": "[REDACTED_EMAIL]",
    },
    {
        "type": "Phone Number",
        "pattern": r"(?<!\d)(?:\+\d{1,3}[\s.-]?)?(?:\d{5}[\s.-]?\d{5}|\d{3}[\s.-]?\d{3}[\s.-]?\d{4}|\d{10})(?!\d)",
        "confidence": 92,
        "risk": "High - direct contact identifier exposure",
        "suggested": "[REDACTED_PHONE]",
    },
    {
        "type": "Aadhaar Number",
        "pattern": r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",
        "confidence": 98,
        "risk": "Critical - government identity number exposure",
        "suggested": "[REDACTED_AADHAAR]",
    },
    {
        "type": "PAN Number",
        "pattern": r"\b[A-Z]{5}\d{4}[A-Z]\b",
        "confidence": 97,
        "risk": "Critical - tax identity number exposure",
        "suggested": "[REDACTED_PAN]",
    },
    {
        "type": "IFSC Code",
        "pattern": r"\b[A-Z]{4}0[A-Z0-9]{6}\b",
        "confidence": 96,
        "risk": "High - banking identifier exposure",
        "suggested": "[REDACTED_IFSC]",
    },
    {
        "type": "Credit / Debit Card Number",
        "pattern": r"\b(?:\d[ -]*?){13,19}\b",
        "confidence": 90,
        "risk": "Critical - payment card exposure",
        "suggested": "[REDACTED_CARD]",
    },
    {
        "type": "IP Address",
        "pattern": r"\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b",
        "confidence": 95,
        "risk": "Medium - network identifier exposure",
        "suggested": "[REDACTED_IP]",
    },
    {
        "type": "Social Security Number",
        "pattern": r"\b\d{3}-\d{2}-\d{4}\b",
        "confidence": 97,
        "risk": "Critical - government identity number exposure",
        "suggested": "[REDACTED_SSN]",
    },
    {
        "type": "Passport Number",
        "pattern": r"\b[A-Z][0-9]{7}\b",
        "confidence": 88,
        "risk": "High - travel identity document exposure",
        "suggested": "[REDACTED_PASSPORT]",
    },
    {
        "type": "Vehicle Number",
        "pattern": r"\b[A-Z]{2}[\s-]?\d{1,2}[\s-]?[A-Z]{1,3}[\s-]?\d{4}\b",
        "confidence": 90,
        "risk": "Medium - vehicle registration identifier exposure",
        "suggested": "[REDACTED_VEHICLE]",
    },
]

LABELED_PII_RULES = [
    {
        "type": "Name",
        "labels": r"(?:full\s+name|customer\s+name|client\s+name|patient\s+name|employee\s+name|name)",
        "confidence": 88,
        "risk": "High - personal name exposure",
        "suggested": "[REDACTED_NAME]",
    },
    {
        "type": "Address",
        "labels": r"(?:address|residential\s+address|billing\s+address|shipping\s+address)",
        "confidence": 86,
        "risk": "High - physical location exposure",
        "suggested": "[REDACTED_ADDRESS]",
    },
    {
        "type": "Date of Birth",
        "labels": r"(?:dob|date\s+of\s+birth|birth\s+date)",
        "confidence": 92,
        "risk": "High - birth date identity attribute exposure",
        "suggested": "[REDACTED_DOB]",
    },
    {
        "type": "Employee ID",
        "labels": r"(?:employee\s+id|emp\s+id|staff\s+id|user\s+id|customer\s+id|client\s+id|account\s+id)",
        "confidence": 84,
        "risk": "Medium - internal identity reference exposure",
        "suggested": "[REDACTED_ID]",
    },
    {
        "type": "Bank Account Number",
        "labels": r"(?:account\s+number|bank\s+account|acct\s+no|a/c\s+no)",
        "confidence": 92,
        "risk": "Critical - banking account exposure",
        "suggested": "[REDACTED_BANK_ACCOUNT]",
    },
    {
        "type": "Institution",
        "labels": r"(?:college|university|school|institute|institution|department|employer|company|organization|organisation)",
        "confidence": 82,
        "risk": "Medium - institution or campus affiliation exposure",
        "suggested": "[REDACTED_INSTITUTION]",
    },
    {
        "type": "Location",
        "labels": r"(?:location|city|hometown|hostel|campus|branch|office|landmark|place|venue)",
        "confidence": 82,
        "risk": "Medium - location or place exposure",
        "suggested": "[REDACTED_LOCATION]",
    },
    {
        "type": "Student ID",
        "labels": r"(?:student\s+id|roll\s+no|roll\s+number|registration\s+no|registration\s+number|admission\s+no|admission\s+number|enrollment\s+no|enrollment\s+number)",
        "confidence": 88,
        "risk": "High - academic identity reference exposure",
        "suggested": "[REDACTED_STUDENT_ID]",
    },
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": f"Internal server error: {str(exc)}"})


# ---------------------------------------------------------------------------
# Request/response models
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    document_id: str
    text: str  # kept for backward compat; prefer document_id lookup


class ExplainRequest(BaseModel):
    selectedText: str
    context: str


class WhyNotRequest(BaseModel):
    selectedText: str
    context: str


class RedactRequest(BaseModel):
    document_id: str
    # approved detection IDs to redact (if empty, uses all approved in session)
    detection_ids: list[str] = []


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "documents_in_session": store.count(),
        "timestamp": datetime.utcnow().isoformat(),
    }


# ---------------------------------------------------------------------------
# POST /api/upload
# ---------------------------------------------------------------------------

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Upload a document: validate → store → extract text → save DocumentRecord.
    Returns document metadata + extracted text for the frontend.
    """
    # Ephemeral self-cleaning of old files in UPLOAD_DIR
    try:
        import time
        now = time.time()
        for f in os.listdir(UPLOAD_DIR):
            fpath = os.path.join(UPLOAD_DIR, f)
            if os.path.isfile(fpath) and os.stat(fpath).st_mtime < now - 600:
                os.remove(fpath)
    except Exception:
        pass

    filename = file.filename or "document.txt"
    ext = os.path.splitext(filename)[1].lower()

    # Extension check
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Please upload PDF, DOCX, or TXT.",
        )

    # Read content for size check
    content = await file.read()
    file_size = len(content)

    if file_size == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if file_size > MAX_FILE_BYTES:
        mb = file_size / (1024 * 1024)
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({mb:.1f} MB). Maximum is 20 MB.",
        )

    # Store on disk
    document_id = str(uuid.uuid4())
    stored_filename = f"{document_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, stored_filename)

    try:
        with open(file_path, "wb") as buf:
            buf.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Extract text
    try:
        result = extract_text_from_file(file_path, filename)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {str(e)}")

    # Build and store DocumentRecord
    file_type_map = {".pdf": FileType.PDF, ".docx": FileType.DOCX, ".txt": FileType.TXT}
    record = DocumentRecord(
        document_id=document_id,
        filename=filename,
        file_type=file_type_map[ext],
        file_size_bytes=file_size,
        status=DocumentStatus.UPLOADED,
        extracted_text=result.text,
        page_count=result.page_count,
        word_count=result.word_count,
        original_path=file_path,
    )
    store.save(record)

    return {
        "documentId": document_id,
        "fileId": document_id,           # backward compat
        "filename": filename,
        "fileType": ext.lstrip("."),
        "fileSizeBytes": file_size,
        "pageCount": result.page_count,
        "wordCount": result.word_count,
        "text": result.text,
        "status": "uploaded",
    }


# ---------------------------------------------------------------------------
# POST /api/analyze
# ---------------------------------------------------------------------------

@app.post("/api/analyze")
async def analyze_document(req: AnalyzeRequest):
    """Run Gemini PII analysis. Stores results in session."""
    text = req.text.strip()
    if not text:
        return {"privacyScore": 100, "detections": [], "documentId": req.document_id}

    # Update status if record exists
    record = store.get(req.document_id)
    if record:
        record.status = DocumentStatus.ANALYZING
        store.save(record)

    raw = analyze_text_for_pii(text)
    raw_detections: list[dict] = raw.get("detections", [])
    pattern_detections = _detect_pattern_pii(text)
    merged_detections = _merge_detections(raw_detections, pattern_detections)
    privacy_score = min(
        int(raw.get("privacyScore", 100)),
        _score_from_detections(merged_detections),
    )

    # Map raw detections into typed DetectionRecords and locate positions
    lines = text.splitlines()
    det_records: list[DetectionRecord] = []
    for d in merged_detections:
        det_text = d.get("text", "")
        page_num, line_num = _locate_text(det_text, text, lines)
        rec = DetectionRecord(
            id=d.get("id", f"det-{uuid.uuid4().hex[:8]}"),
            text=det_text,
            type=d.get("type", "Unknown"),
            confidence=int(d.get("confidence", 50)),
            reason=d.get("reason", ""),
            risk=d.get("risk", ""),
            suggestedRedaction=d.get("suggestedRedaction", "[REDACTED]"),
            approval=ApprovalState.APPROVED,
            page_number=page_num,
            line_number=line_num,
        )
        det_records.append(rec)

    # Update session record
    if record:
        record.privacy_score = privacy_score
        record.detections = det_records
        record.status = DocumentStatus.ANALYZED
        store.save(record)

    return {
        "documentId": req.document_id,
        "privacyScore": privacy_score,
        "detections": [
            {
                "id": dr.id,
                "text": dr.text,
                "type": dr.type,
                "confidence": dr.confidence,
                "reason": dr.reason,
                "risk": dr.risk,
                "suggestedRedaction": dr.suggested_redaction,
                "approved": dr.approval == ApprovalState.APPROVED,
                "pageNumber": dr.page_number,
                "lineNumber": dr.line_number,
            }
            for dr in det_records
        ],
    }


# ---------------------------------------------------------------------------
# POST /api/explain
# ---------------------------------------------------------------------------

@app.post("/api/explain")
async def explain_pii(req: ExplainRequest):
    if not req.selectedText.strip():
        raise HTTPException(status_code=400, detail="selectedText cannot be empty.")
    return explain_detection(req.selectedText, req.context)


# ---------------------------------------------------------------------------
# POST /api/why-not
# ---------------------------------------------------------------------------

@app.post("/api/why-not")
async def explain_why_not_visible(req: WhyNotRequest):
    if not req.selectedText.strip():
        raise HTTPException(status_code=400, detail="selectedText cannot be empty.")
    return explain_why_not(req.selectedText, req.context)


# ---------------------------------------------------------------------------
# POST /api/review
# ---------------------------------------------------------------------------

@app.post("/api/review")
async def update_review_state(update: ReviewUpdate):
    """Update the approval state of a single detection in the session."""
    try:
        record = store.get_or_raise(update.document_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Document not found in session.")

    detection = next((d for d in record.detections if d.id == update.detection_id), None)
    if detection is None:
        raise HTTPException(status_code=404, detail=f"Detection '{update.detection_id}' not found.")

    detection.approval = update.approval
    store.save(record)

    # Recalculate dynamic privacy score
    approved_count = sum(1 for d in record.detections if d.approval == ApprovalState.APPROVED)
    total = len(record.detections)
    if total > 0:
        ratio = approved_count / total
        dynamic_score = round(record.privacy_score + (100 - record.privacy_score) * ratio)
    else:
        dynamic_score = 100

    return {
        "documentId": update.document_id,
        "detectionId": update.detection_id,
        "approval": update.approval,
        "dynamicPrivacyScore": dynamic_score,
        "approvedCount": approved_count,
        "rejectedCount": total - approved_count,
    }


# ---------------------------------------------------------------------------
# POST /api/redact
# ---------------------------------------------------------------------------

@app.post("/api/redact")
async def redact_document_endpoint(req: RedactRequest):
    """Run redaction engine on approved detections. Stores output paths."""
    try:
        record = store.get_or_raise(req.document_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Document not found in session.")

    if not record.original_path or not os.path.exists(record.original_path):
        raise HTTPException(status_code=404, detail="Original file not found on disk.")

    record.status = DocumentStatus.REDACTING
    store.save(record)

    # Determine which texts to redact
    if req.detection_ids:
        approved = [d for d in record.detections if d.id in req.detection_ids]
    else:
        approved = [d for d in record.detections if d.approval == ApprovalState.APPROVED]

    redaction_texts = [d.text for d in approved if d.text.strip()]

    try:
        paths = redact_document(record.original_path, record.filename, redaction_texts)
    except HTTPException:
        record.status = DocumentStatus.ERROR
        store.save(record)
        raise

    record.redacted_path = paths.get("pdf", "")
    record.status = DocumentStatus.REDACTED
    store.save(record)

    return {
        "documentId": req.document_id,
        "status": "redacted",
        "redactedCount": len(approved),
        "downloadUrls": {
            "pdf": f"/api/download/{req.document_id}?format=pdf",
            "txt": f"/api/download/{req.document_id}?format=txt",
        },
    }


# ---------------------------------------------------------------------------
# POST /api/export  (backward compat with Sprint 2/3 frontend)
# ---------------------------------------------------------------------------

class ExportRequest(BaseModel):
    fileId: str
    filename: str
    redactions: list[str]


@app.post("/api/export")
async def export_redacted_document(req: ExportRequest):
    """Backward-compatible export endpoint. Runs redaction and returns PDF."""
    ext = os.path.splitext(req.filename)[1].lower()
    stored_filename = f"{req.fileId}{ext}"
    file_path = os.path.join(UPLOAD_DIR, stored_filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Original document not found. Please upload again.")

    paths = redact_document(file_path, req.filename, req.redactions)
    pdf_path = paths.get("pdf", "")

    if not pdf_path or not os.path.exists(pdf_path):
        raise HTTPException(status_code=500, detail="Redacted PDF was not generated.")

    export_name = f"redacted_{os.path.splitext(req.filename)[0]}.pdf"
    return FileResponse(pdf_path, media_type="application/pdf", filename=export_name)


# ---------------------------------------------------------------------------
# GET /api/download/{documentId}
# ---------------------------------------------------------------------------

def cleanup_temp_file(path: str):
    if os.path.exists(path):
        try:
            os.remove(path)
        except Exception:
            pass


@app.get("/api/download/{document_id}")
async def download_redacted(
    document_id: str,
    background_tasks: BackgroundTasks,
    format: Literal["pdf", "txt"] = Query(default="pdf"),
):
    """Serve the redacted document in the requested format and clean it up afterwards."""
    try:
        record = store.get_or_raise(document_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Document not found in session.")

    if record.status != DocumentStatus.REDACTED:
        raise HTTPException(
            status_code=409,
            detail="Document has not been redacted yet. Call POST /api/redact first.",
        )

    base_path = record.original_path
    stem = os.path.splitext(record.filename)[0]

    if format == "pdf":
        out_path = base_path + ".redacted.pdf"
        media_type = "application/pdf"
        dl_name = f"{stem}_redacted.pdf"
    else:
        out_path = base_path + ".redacted.txt"
        media_type = "text/plain"
        dl_name = f"{stem}_redacted.txt"

    if not os.path.exists(out_path):
        raise HTTPException(status_code=404, detail=f"Redacted {format.upper()} file not found on disk.")

    background_tasks.add_task(cleanup_temp_file, out_path)

    # Explicit headers ensure browser compatibility and clean filename parsing
    headers = {
        "Content-Disposition": f'attachment; filename="{dl_name}"',
        "Access-Control-Expose-Headers": "Content-Disposition"
    }

    return FileResponse(out_path, media_type=media_type, headers=headers)


# ---------------------------------------------------------------------------
# GET /api/report/{documentId}
# ---------------------------------------------------------------------------

@app.get("/api/report/{document_id}")
async def get_privacy_report(document_id: str):
    """Generate and return a full privacy report as JSON."""
    try:
        record = store.get_or_raise(document_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Document not found in session.")

    detections = record.detections
    approved = [d for d in detections if d.approval == ApprovalState.APPROVED]
    rejected = [d for d in detections if d.approval == ApprovalState.REJECTED]
    pending = [d for d in detections if d.approval == ApprovalState.PENDING]

    risk_summary = _build_risk_summary(detections)

    # Dynamic score
    total = len(detections)
    if total > 0:
        ratio = len(approved) / total
        dynamic_score = round(record.privacy_score + (100 - record.privacy_score) * ratio)
    else:
        dynamic_score = 100

    ai_summary = generate_ai_summary(
        filename=record.filename,
        score=dynamic_score,
        detection_count=total,
        approved=len(approved),
    )

    report = PrivacyReport(
        document_id=document_id,
        filename=record.filename,
        file_type=record.file_type.value,
        analysis_timestamp=record.upload_time.isoformat(),
        page_count=record.page_count,
        word_count=record.word_count,
        privacy_score=dynamic_score,
        detection_count=total,
        approved_count=len(approved),
        rejected_count=len(rejected),
        pending_count=len(pending),
        risk_summary=risk_summary,
        ai_summary=ai_summary,
        detections=[
            {
                "id": d.id,
                "text": d.text,
                "type": d.type,
                "confidence": d.confidence,
                "risk": d.risk,
                "reason": d.reason,
                "approval": d.approval.value,
                "pageNumber": d.page_number,
                "lineNumber": d.line_number,
            }
            for d in detections
        ],
    )

    return report.model_dump()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _locate_text(phrase: str, full_text: str, lines: list[str]) -> tuple[int | None, int | None]:
    """Try to find the page number and line number of a phrase."""
    if not phrase:
        return None, None

    # Line number (1-indexed)
    for i, line in enumerate(lines, start=1):
        if phrase in line:
            return _estimate_page(i, lines), i

    return None, None


def _estimate_page(line_num: int, lines: list[str]) -> int:
    """Estimate page number by counting [Page N] markers before the line."""
    page = 1
    page_pattern = re.compile(r"^\[Page (\d+)\]$")
    for i, line in enumerate(lines):
        if i >= line_num - 1:
            break
        m = page_pattern.match(line.strip())
        if m:
            page = int(m.group(1))
    return page


def _detect_pattern_pii(text: str) -> list[dict]:
    """Catch structured PII that should not depend only on model recall."""
    detections: list[dict] = []
    seen_spans: set[tuple[int, int]] = set()
    priority = {
        "Aadhaar Number": 0,
        "PAN Number": 0,
        "Social Security Number": 0,
        "Credit / Debit Card Number": 1,
        "Bank Account Number": 1,
        "IFSC Code": 1,
        "Phone Number": 2,
    }

    for rule in sorted(PII_PATTERN_RULES, key=lambda item: priority.get(item["type"], 3)):
        for match in re.finditer(rule["pattern"], text, flags=re.IGNORECASE):
            value = match.group(0).strip()
            if not _is_valid_pattern_match(rule["type"], value):
                continue
            span = match.span()
            if span in seen_spans:
                continue
            seen_spans.add(span)
            detections.append(_pattern_detection(rule, value, len(detections) + 1))

    for rule in LABELED_PII_RULES:
        pattern = rf"\b{rule['labels']}\b\s*(?:[:#-]|\bis\b)?\s*([^\n\r,;|]{{2,80}})"
        for match in re.finditer(pattern, text, flags=re.IGNORECASE):
            value = _clean_labeled_value(match.group(1))
            if not value:
                continue
            span = match.span(1)
            if span in seen_spans:
                continue
            seen_spans.add(span)
            detections.append(_pattern_detection(rule, value, len(detections) + 1))

    return detections


def _pattern_detection(rule: dict, value: str, index: int) -> dict:
    return {
        "id": f"pattern-{index}",
        "text": value,
        "type": rule["type"],
        "confidence": rule["confidence"],
        "reason": f"Matched a local high-recall {rule['type']} detector.",
        "risk": rule["risk"],
        "suggestedRedaction": rule["suggested"],
    }


def _clean_labeled_value(value: str) -> str:
    value = value.strip(" \t:-#")
    value = re.split(
        r"\s{2,}|\b(?:phone|email|address|dob|date of birth|pan|aadhaar|account|ifsc|college|university|school|location|city|student id|roll no)\b\s*[:#-]",
        value,
        maxsplit=1,
        flags=re.IGNORECASE,
    )[0]
    return value.strip(" \t.,;:-#")


def _is_valid_pattern_match(entity_type: str, value: str) -> bool:
    digits = re.sub(r"\D", "", value)

    if entity_type == "Phone Number":
        return 10 <= len(digits) <= 15
    if entity_type == "Aadhaar Number":
        return len(digits) == 12
    if entity_type == "Credit / Debit Card Number":
        return 13 <= len(digits) <= 19 and _passes_luhn(digits)
    if entity_type == "Passport Number":
        return bool(re.search(r"\d", value))

    return len(value.strip()) >= 3


def _passes_luhn(number: str) -> bool:
    total = 0
    double = False
    for digit in reversed(number):
        n = int(digit)
        if double:
            n *= 2
            if n > 9:
                n -= 9
        total += n
        double = not double
    return total % 10 == 0


def _merge_detections(ai_detections: list[dict], pattern_detections: list[dict]) -> list[dict]:
    merged: list[dict] = []
    seen: set[str] = set()

    for detection in [*ai_detections, *pattern_detections]:
        text_value = str(detection.get("text", "")).strip()
        if not text_value:
            continue
        key = _normalize_detection_text(text_value)
        if key in seen:
            continue
        seen.add(key)
        merged.append({**detection, "text": text_value})

    return merged


def _normalize_detection_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def _score_from_detections(detections: list[dict]) -> int:
    if not detections:
        return 100

    risk_points = 0
    for detection in detections:
        risk = str(detection.get("risk", "")).lower()
        entity_type = str(detection.get("type", "")).lower()
        if "critical" in risk or any(t in entity_type for t in ("aadhaar", "pan", "ssn", "card", "bank")):
            risk_points += 18
        elif "high" in risk or any(t in entity_type for t in ("email", "phone", "address", "passport", "birth", "student")):
            risk_points += 12
        elif "medium" in risk or any(t in entity_type for t in ("institution", "location", "college", "university", "school", "campus")):
            risk_points += 7
        else:
            risk_points += 4

    return max(5, 100 - min(risk_points, 95))


def _build_risk_summary(detections: list[DetectionRecord]) -> RiskSummary:
    summary = RiskSummary()
    for d in detections:
        risk_lower = d.risk.lower()
        if "critical" in risk_lower:
            summary.critical += 1
        elif "high" in risk_lower or "theft" in risk_lower or "fraud" in risk_lower:
            summary.high += 1
        elif "medium" in risk_lower or "moderate" in risk_lower or "exposure" in risk_lower:
            summary.medium += 1
        else:
            summary.low += 1
    return summary
