# TrustLens 🔍 — Product Writeup

TrustLens is a production-grade, AI-powered document anonymization and PII detection assistant built to solve the "black box" trust gap in automated compliance. By making every PII redaction transparent, explainable, and verifiable, TrustLens empowers risk analysts to scrub documents with absolute confidence before sharing them with external AI tools.

---

## 🎯 Core Value Proposition

* **Transparent Redactions**: Inspect match confidence, risk level, and explanations for every identified token.
* **Omission Auditing**: Select any unhighlighted text to run a "Why Not This" query and dynamically append false negatives to the redaction pipeline.
* **Zero-Retention Pipeline**: Document uploads are processed ephemerally completely in-memory and permanently purged after downloads are served.

---

## ⚙️ Technical Architecture

TrustLens is built on a modern decoupled architecture:
* **Frontend**: Next.js 15 (React 19) client dashboard using Tailwind CSS and Framer Motion.
* **Backend**: FastAPI (Python 3.11) exposing secure REST endpoints.
* **AI Engine**: Google Gemini 2.5 Flash (`google-genai` SDK) utilizing structured schemas.
* **Sanitization**: Native PDF coordinate masking via PyMuPDF and run-based replacements for DOCX/TXT.

---

## 🛠️ Critical Bug Fixes & Stability

To prepare TrustLens for production release, the following critical issues were resolved:

1. **Clean Downloads (UUID Fix)**: Configured backend `Content-Disposition` headers and enabled exposed headers in CORS so files download with their original name (e.g. `contract_redacted.pdf`) rather than internal UUIDs.
2. **Zero-Retention File Cleanup**: Integrated FastAPI `BackgroundTasks` to automatically delete redacted temporary files immediately after being streamed to the user.
3. **Hydration Mismatches Resolved**: Deferred state checks from `localStorage` in `review/page.tsx` until after mount to match the server-rendered HTML.
4. **React 19 Console Warnings Cleaned**: Replaced `next-themes` with a custom React Context theme provider, injecting the initial script inside `<head>` in `layout.tsx` to prevent theme flashing without triggering console script errors.
