# TrustLens 🔍 — AI-Powered Verifiable PII Redaction Assistant

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-blue?style=flat-square&logo=google-gemini)](https://deepmind.google/technologies/gemini/)
[![PyMuPDF](https://img.shields.io/badge/PDF%20Redaction-PyMuPDF-ff6f00?style=flat-square)](https://pymupdf.readthedocs.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

> **"Privacy you can verify. Instead of asking users to trust AI, we prove that the document is safe."**

TrustLens is a production-grade, AI-powered document anonymization and PII detection assistant built to solve the "black box" trust gap in automated compliance. Designed for compliance officers, risk analysts, and security-conscious professionals, TrustLens makes every PII redaction decision transparent, explainable, and verifiable.

![TrustLens Hero](public/hero.png)

---

## 📖 Table of Contents
1. [🌟 Project Vision & Core Features](#-project-vision--core-features)
2. [⚙️ System Architecture & Workflow](#%EF%B8%8F-system-architecture--workflow)
3. [📂 Folder Structure](#-folder-structure)
4. [💻 Technology Stack](#-technology-stack)
5. [🚀 Local Environment Setup](#-local-environment-setup)
6. [🔌 API Documentation](#-api-documentation)
7. [🛠️ Production-Ready Bug Fixes (Sprint 7 & 8)](#%EF%B8%8F-production-ready-bug-fixes-sprint-7--8)

---

## 🌟 Project Vision & Core Features

### The Problem
Automated document anonymizers operate as black boxes. When a file is scrubbed, users are presented with a redacted output without any explanation of *why* specific information was hidden, or *why other text was left visible*. Because of this lack of transparency, compliance officers must manually check every single word, rendering automation obsolete.

### Our Solution
TrustLens establishes **Trust & Explainability** as first-class citizens. By integrating secure, modern document parsers with advanced Gemini LLM semantic reasoning, we provide:
* **Interactive Highlight Mapping**: Real-time visual synchronization of detected PII.
* **Explainability Logs**: Click any redacted token to inspect *why* it was classified as PII, along with match confidence, risk level, and suggestions.
* **Omission Audits ("Why Not This")**: Select any unhighlighted text and ask the AI why it was left visible. If the AI made a mistake, instantly "Mark as Sensitive" to add it to the redaction pipeline.
* **Configurable Privacy Settings**: Adjust confidence thresholds dynamically, swap highlight visual themes, and toggle auto-redaction rules.
* **Compliance Privacy Reports**: Generate and download complete audit reports (JSON/PDF) listing all identified PII risk metrics.

![TrustLens Features](public/features.png)

---

## ⚙️ System Architecture & Workflow

TrustLens is designed following clean architecture guidelines. Data is processed ephemerally completely in-memory and deleted post-session.

```mermaid
graph TD
    UI[Next.js Frontend] <-->|REST API| API[FastAPI Backend]
    API <-->|google-genai SDK| Gemini[Gemini 2.5 Flash]
    API --> Parsers[PyMuPDF / python-docx Parsers]
    API --> Redactor[PyMuPDF Redaction Engine]
```

### The 5-Step Process
![TrustLens Workflow Steps](public/workflow.png)

### Enterprise-Grade Security Guarantees
![TrustLens Security Guarantees](public/security.png)

---

## 📂 Folder Structure

The repository is organized as a clean, unified workspace containing the Next.js frontend and the FastAPI Python backend:

```text
TrustLens/
├── backend/                  # FastAPI Backend API Server
│   ├── main.py               # API Routing and Controller Endpoints
│   ├── gemini_client.py      # Gemini 2.5 Flash SDK Integration Client
│   ├── parsers.py            # PDF/DOCX/TXT Parsers (size/mime/encryption checks)
│   ├── redactor.py           # Native PDF / Document Redaction Engine
│   ├── models.py             # Pydantic v2 schemas and records
│   ├── session_store.py      # Ephemeral thread-safe session store
│   └── requirements.txt      # Python backend dependencies
├── src/                      # Next.js Frontend Application
│   ├── app/                  # App Router pages (sandbox, review)
│   ├── components/           # Reusable UI & Layout Components
│   ├── services/             # API client layer (api.ts)
│   └── types/                # Unified TypeScript interfaces
├── docs/                     # Sprint documentation and diagrams
└── package.json              # Monorepo configuration
```

---

## 💻 Technology Stack

* **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion, Lucide React.
* **Backend**: FastAPI, Python 3.11, Pydantic v2, Uvicorn.
* **AI Layer**: Gemini 2.5 Flash (`google-genai` SDK).
* **Document Processing**: PyMuPDF (fitz), python-docx.

---

## 🚀 Local Environment Setup

### Prerequisites
* Node.js v18+ & npm v10+
* Python 3.11+

### Step-by-Step Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Akhils696/TrustLens-Sprint-Four-Hack.git
   cd TrustLens-Sprint-Four-Hack
   ```

2. **Frontend Setup**:
   Install dependencies and run the Next.js development server from the monorepo root:
   ```bash
   npm install
   npm run dev
   ```
   *The frontend will run at `http://localhost:3000`.*

3. **Backend Setup**:
   Create a virtual environment and launch the FastAPI server from the `backend/` folder:
   ```bash
   cd backend
   python -m venv venv
   
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   
   # On macOS/Linux:
   source venv/bin/activate

   pip install -r requirements.txt
   python -m uvicorn main:app --reload --port 8000
   ```
   *The API will run at `http://localhost:8000`. You can inspect endpoints at `http://localhost:8000/docs`.*

4. **Environment Variables Configuration**:
   Create a `.env` file in the `backend/` folder:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

### Uploading & Analyzing Documents
The upload sandbox tracks text extraction and processing stages in real-time:
![TrustLens Workspace Upload](public/upload_workspace.png)

---

## 🔌 API Documentation

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/upload` | `POST` | Upload and validate documents (PDF/DOCX/TXT), returns extracted text. |
| `/api/analyze` | `POST` | Triggers Gemini PII detection and returns confidence & risk levels. |
| `/api/explain` | `POST` | Generates AI semantic explainability reasoning for a specific token. |
| `/api/why-not` | `POST` | Resolves false negatives by explaining why a visible word was omitted. |
| `/api/review` | `POST` | Syncs manual user approval/rejection state back to the session. |
| `/api/redact` | `POST` | Generates permanent redacted document paths. |
| `/api/download/{id}` | `GET` | Serves the redacted PDF or TXT document download. |
| `/api/report/{id}` | `GET` | Returns the complete compliance privacy report JSON. |
| `/api/health` | `GET` | Checks backend engine health status. |

---

## 🛠️ Production-Ready Bug Fixes (Sprint 7 & 8)

For the final version release, we polished the codebase and solved several production bugs:
* **UUID Download Fix**: Configured header parameters (`Content-Disposition` and exposed headers via CORS) so files download with their original filename (e.g., `contract_redacted.pdf`) rather than internal server UUID filenames.
* **Auto-Cleanup Background Tasks**: Leveraged FastAPI `BackgroundTasks` to delete temporary redacted files immediately after being served, guaranteeing zero user-data retention on disk.
* **Navigation Flow Controls**: Disallowed browser redirections to raw API nodes, ensuring that all UI buttons retain focus inside the Next.js single-page application.
* **React 19 Console Warnings Fixed**: Rewrote the `ThemeProvider` to use local client state and native React Context, moving blocking FOUC-prevention scripts directly into the root `<head>` in `layout.tsx` to eliminate dynamic script injection warnings.
* **Hydration Mismatch Errors Cleared**: Updated state hooks on the review page to defer reading client-side data (`localStorage` values) until the client mounting cycle is complete, resolving all server-to-client mismatch checks.
