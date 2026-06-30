# Functional Requirements - TrustLens

This document details the complete functional specifications of the TrustLens system. The requirements are structured to address every user interaction and system response.

---

## 1. Authentication (FR-AUTH)

### FR-AUTH-1: Secure User Registration
* **Description**: Users must be able to create a secure account.
* **Input**: Email address, password (minimum 12 characters, including 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character).
* **Validation**: Email verification link must be sent and clicked before account activation.
* **Security**: Support multi-factor authentication (MFA) via TOTP (e.g., Google Authenticator).

### FR-AUTH-2: Secure Login/Logout
* **Description**: Users must be able to log in securely using credentials or federated SSO.
* **Security Flow**: Upon successful authentication, the system issues a short-lived JSON Web Token (JWT) (15-minute expiration) and a secure, HttpOnly, SameSite=Strict refresh token.
* **Session Management**: Session automatically terminates after 15 minutes of inactivity.

---

## 2. Guest Mode (FR-GUEST)

### FR-GUEST-1: Access Without Credentials
* **Description**: Users can access a limited sandbox environment without creating an account.
* **Session Lifetime**: All data is strictly kept in-memory or ephemeral browser state. Navigating away or closing the tab terminates the session.
* **Limits**: 
  * Maximum document upload size of 1.0 MB (compared to 15.0 MB for authenticated users).
  * Up to 3 documents processed per hour.
  * PDF and DOCX exports are disabled (only raw TXT export allowed).
* **UI Banner**: A persistent warning banner must state: *"You are in Guest Mode. Document processing is ephemeral and files will be lost upon session termination."*

---

## 3. Document Upload (FR-UPLOAD)

### FR-UPLOAD-1: Supported Formats & Parsing
The system must parse, extract text, and preserve layout structures for the following formats:
* **PDF (Portable Document Format)**:
  * Extract raw text strings while maintaining horizontal and vertical bounding boxes for each token.
  * support multi-column layouts and tables.
  * Reject scanned image PDFs unless OCR is explicitly active (OCR is out of scope for Sprint 0).
* **DOCX (Microsoft Word Document)**:
  * Parse OpenXML structures to extract text blocks, paragraphs, and list items sequentially.
* **TXT (Plain Text File)**:
  * Read raw UTF-8 encoded text directly.

### FR-UPLOAD-2: Upload Restrictions
* **Size Limits**: Max 15MB for authenticated users, 1MB for guests.
* **Validation**: Reject files with invalid extensions or MIME types not matching file signatures (magic bytes).

---

## 4. PII Detection (FR-DETECT)

### FR-DETECT-1: Standard PII Entity Types
The system must identify the following entity classes:
* **Direct Identifiers**: Full Name, Date of Birth, Driver's License Number, Passport Number.
* **Contact Information**: Email Address, Phone Number, Mailing Address.
* **Financial Data**: Credit Card Number (PAN), Bank Account Number, SWIFT/BIC codes.
* **Government Identifiers**: Social Security Number (SSN), Taxpayer Identification Number (TIN).

### FR-DETECT-2: Contextual PII Detection
* **Description**: The detection engine must analyze surrounding tokens to distinguish PII from generic terms (e.g., checking if the name "John" refers to a person or "John Deere" refers to an organization).
* **Entity Customization**: Authenticated users can toggled detection rules on/off per document run.

---

## 5. Explanation Generation (FR-EXPLAIN)

### FR-EXPLAIN-1: Explanation Engine
For every single token categorized by the system (whether flagged for redaction or left visible), the system must generate a human-readable, context-aware explanation.
* **Flagged/Redacted Explanations**: E.g., *"Flagged as Name: token matches the name structure and is directly preceded by title 'Compliance Manager'."*
* **Visible/Non-Redacted Explanations**: E.g., *"Left visible: token represents a generic company department ('Sales'), not a private individual or proprietary entity."*

### FR-EXPLAIN-2: Natural Language Explanations
* Explanations must be generated using structured templates coupled with LLM contextual analysis, ensuring they read naturally to Marcus.

---

## 6. Confidence Scores (FR-CONF)

### FR-CONF-1: Token Confidence Score
* **Description**: The system must assign a confidence score between 0% and 100% to each detected entity.
* **Calculation Factors**: The score is determined by:
  * Pattern matching strength (Regex matching score).
  * NLP Model prediction confidence (ML probability).
  * Contextual keywords weight (proximity to keywords like "SSN:", "Born on:", "Visa").

### FR-CONF-2: Threshold Controls
* **Description**: Users can adjust the minimum confidence threshold via a slider in the review workspace.
* **Behavior**: If the threshold is set to 75%, only entities detected with $\ge 75\%$ confidence are auto-redacted. Lower confidence detections will be flagged as "For Review" without automatic redaction.

---

## 7. Document Review (FR-REVIEW)

### FR-REVIEW-1: Interactive Workspace
* **Description**: A split-pane UI displaying the Original Document (left/top) and Redacted Document (right/bottom) with real-time highlighting.
* **Interactive Tooltips**: Hovering or clicking on any highlighted token must open a modal showing:
  * Entity Type (e.g., SSN).
  * Confidence Score (e.g., 94%).
  * AI-generated Explanation of the decision.
  * Quick-action buttons (Approve, Reject, Edit).

### FR-REVIEW-2: Review Status Controls
* **Approve Redaction**: Confirms the redaction. The token remains blacked out.
* **Reject Redaction**: Unmasks the token. The text becomes visible in the redacted view, and the classification status is updated to "User Excluded."
* **Edit Entity**: Allows the user to manually change the classified entity type (e.g., changing from "Full Name" to "Street Address") via a dropdown list.

---

## 8. Verification (FR-VERIFY)

### FR-VERIFY-1: Safe-to-Share Validation
* **Description**: Before exporting, the user must run a final verification sweep.
* **Verification Engine**: The system scans the final state of the document for any remaining PII patterns and generates a checklist showing:
  * Total PII entities detected.
  * Count of approved redactions.
  * Count of rejected redactions (user-overridden).
  * System safety confirmation code.

---

## 9. Safe-to-Share Report (FR-REPORT)

### FR-REPORT-1: Report Generation
* **Description**: A comprehensive audit report created upon document export.
* **Contents**:
  * Document metadata (filename, upload time, reviewer name).
  * Cryptographic hash (SHA-256) of the original and final redacted files.
  * Audit Trail: Table listing every detected PII entity, its original text, its final state (Redacted or Unmasked), the system explanation, and the user's action (Approved, Rejected, or Edited).

---

## 10. Export (FR-EXPORT)

### FR-EXPORT-1: Multi-Format Export
* **Description**: Users can download the final output in the following forms:
  * **Redacted PDF**: Text elements replaced with solid black rectangular bars matching the layout dimensions exactly.
  * **Masked DOCX**: Replaces flagged text with entity tags (e.g., `[REDACTED_SSN]`) while maintaining original styling.
  * **Plain Text TXT**: Output document containing text with tags (e.g., `[REDACTED_NAME]`) in UTF-8 format.
