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
    privacy_score = int(raw.get("privacyScore", 100))
    raw_detections: list[dict] = raw.get("detections", [])

    # Map raw detections into typed DetectionRecords and locate positions
    lines = text.splitlines()
    det_records: list[DetectionRecord] = []
    for d in raw_detections:
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
