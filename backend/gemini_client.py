"""
TrustLens – Gemini API client (google-genai SDK).

Features:
- Uses latest google.genai SDK (not deprecated google.generativeai)
- Timeout handling (60s per request)
- Retry once on JSON parse failure
- Text truncation for very large documents (~50k chars)
- Structured JSON output
"""
from __future__ import annotations

import json
import os
import time

from google import genai
from google.genai import types as genai_types
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()

_MAX_TEXT_CHARS = 50_000  # ~12k tokens — safely within Gemini Flash limits
_MODEL = "gemini-2.5-flash"

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Warning: GEMINI_API_KEY is not set. Gemini endpoints will fail.")


def _get_client() -> genai.Client:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is missing. Set it in backend/.env.",
        )
    return genai.Client(api_key=key)


def _call_with_retry(prompt: str, max_retries: int = 2) -> dict:
    """
    Call Gemini and parse JSON. Retries once on parse failure.
    """
    client = _get_client()
    last_error: Exception | None = None

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=_MODEL,
                contents=prompt,
                config=genai_types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                    http_options=genai_types.HttpOptions(timeout=60000),
                ),
            )
            raw = response.text.strip() if response.text else ""
            # Strip potential markdown fences
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[-1]
                raw = raw.rsplit("```", 1)[0]
            return json.loads(raw)
        except json.JSONDecodeError as e:
            last_error = e
            if attempt < max_retries - 1:
                time.sleep(1)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")

    raise HTTPException(
        status_code=502,
        detail=f"Gemini returned invalid JSON after {max_retries} attempts: {str(last_error)}",
    )


def _truncate(text: str) -> str:
    if len(text) > _MAX_TEXT_CHARS:
        return text[:_MAX_TEXT_CHARS] + "\n\n[... document truncated for analysis ...]"
    return text


# ---------------------------------------------------------------------------
# PII Analysis
# ---------------------------------------------------------------------------

def analyze_text_for_pii(text: str) -> dict:
    truncated = _truncate(text)

    prompt = f"""You are a strict data privacy auditor. Analyze the following document and detect ALL Personally Identifiable Information (PII).

Use high recall. If a text fragment can help identify, contact, locate, authenticate, financially expose, or uniquely link a person, organization, account, device, transaction, campus, workplace, or institution, include it as a detection. When uncertain, include the item with lower confidence instead of omitting it.

Detect these redactable categories:
- Names (persons)
- Phone Numbers
- Emails
- Addresses (physical)
- Locations (cities, localities, landmarks, branches, office locations, hometowns, hostels, campuses)
- Colleges, universities, schools, institutes, departments, employers, and organization names when tied to a person or private document context
- Aadhaar (Indian UID)
- PAN (Indian Tax ID)
- Passport details
- Driving License details
- Bank Account numbers
- IFSC codes
- Credit / Debit Card numbers
- Employee IDs
- Vehicle Numbers (plates)
- IP Addresses
- Dates of Birth
- Social Security Numbers
- Student IDs, roll numbers, registration numbers, admission numbers, and enrollment numbers
- Usernames, handles, profile URLs, ticket IDs, case IDs, and internal identifiers

Do not limit yourself to regex-style identifiers. Use context. For example, redact college names and locations when they reveal where someone studies, works, lives, visited, or can be found.

Calculate a 'privacyScore' (0-100):
- 100 = zero PII, completely safe
- 0 = saturated with critical PII

Output ONLY valid JSON. No markdown fences, no comments.

Schema:
{{
  "privacyScore": <integer 0-100>,
  "detections": [
    {{
      "id": "det-<unique_integer>",
      "text": "<exact text fragment from document>",
      "type": "<PII category>",
      "confidence": <integer 0-100>,
      "reason": "<why this was flagged>",
      "risk": "<leakage risk description>",
      "suggestedRedaction": "[REDACTED_<TYPE>_<INDEX>]"
    }}
  ]
}}

Document:
{truncated}"""

    return _call_with_retry(prompt)


# ---------------------------------------------------------------------------
# Explain a specific detection
# ---------------------------------------------------------------------------

def explain_detection(selected_text: str, context: str) -> dict:
    prompt = f"""You are a data privacy auditor. Explain why the following text was flagged as PII.

Selected Text: "{selected_text}"
Surrounding Context: "{context}"

Output ONLY valid JSON:
{{
  "whyDetected": "<why it qualifies as PII>",
  "risk": "<leakage risk>",
  "reason": "<logical reasoning>",
  "confidence": <integer 0-100>
}}"""

    return _call_with_retry(prompt)


# ---------------------------------------------------------------------------
# Explain why text was NOT detected
# ---------------------------------------------------------------------------

def explain_why_not(selected_text: str, context: str) -> dict:
    prompt = f"""You are a data privacy auditor. A user is asking why the following text was NOT flagged as PII.

Selected Text: "{selected_text}"
Surrounding Context: "{context}"

Output ONLY valid JSON:
{{
  "whyNotDetected": "<why it was left visible>",
  "shouldHaveBeenDetected": <true or false>,
  "reason": "<logical explanation>"
}}"""

    return _call_with_retry(prompt)


# ---------------------------------------------------------------------------
# Generate AI summary for the privacy report
# ---------------------------------------------------------------------------

def generate_ai_summary(filename: str, score: int, detection_count: int, approved: int) -> str:
    client = _get_client()
    prompt = f"""You are a privacy compliance officer writing a brief audit summary.

Document: {filename}
Privacy Score: {score}/100
Total PII Detections: {detection_count}
Approved for Redaction: {approved}
Left Visible: {detection_count - approved}

Write a 2-3 sentence professional summary of the document's privacy posture and recommended action.
Output ONLY the summary text, no JSON, no markdown."""

    try:
        response = client.models.generate_content(
            model=_MODEL,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                temperature=0.3,
                http_options=genai_types.HttpOptions(timeout=30000),
            ),
        )
        return (response.text or "").strip()
    except Exception:
        return (
            f"Document '{filename}' has a privacy score of {score}/100 with "
            f"{detection_count} PII detections identified. "
            f"{approved} items have been approved for redaction."
        )
