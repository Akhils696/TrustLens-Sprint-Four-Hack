# Feature Priority Matrix (MoSCoW) - TrustLens

This matrix defines the priority of features for TrustLens, aligning our scope with the timeline constraints of the hackathon.

---

## 1. MoSCoW Prioritization Table

| Priority | Feature / Module | Detail | Rationale | Target Release |
| :--- | :--- | :--- | :--- | :--- |
| **Must Have** | Guest Mode | Interactive preview sandbox requiring no login credentials. | Crucial for immediate testing and low-friction user onboarding. | Sprint 1 (Core) |
| **Must Have** | Multi-Format Upload | Parsing support for PDF, DOCX, and TXT files. | Core ingestion requirement representing standard business documents. | Sprint 1 (Core) |
| **Must Have** | Core PII Detection | Identification of SSNs, Credit Cards, Names, Emails, and Addresses. | The minimum viable set of entities required to prove redaction utility. | Sprint 1 (Core) |
| **Must Have** | Interactive Review Workspace | Side-by-side split screen showing original and redacted formats. | Key UI workspace for document verification. | Sprint 1 (Core) |
| **Must Have** | Explanation Tooltips | Explanations showing why an entity was redacted or left visible. | Main product differentiator (Trust & Explainability). | Sprint 1 (Core) |
| **Must Have** | Manual Action Triggers | Buttons to Approve, Reject, or Edit entity classifications. | Essential controls for user-guided compliance adjustments. | Sprint 1 (Core) |
| **Must Have** | Document Safety Score | Dynamic calculator of document compliance from 0-100%. | Concrete visual validation proving safety before sharing. | Sprint 1 (Core) |
| **Must Have** | Core Export | Export of redacted PDFs and tagged TXT documents. | Essential final output format. | Sprint 1 (Core) |
| **Should Have** | Safe-to-Share Audit Report | Detailed PDF report listing the step-by-step history of redactions. | Required for Marcus' internal company compliance records. | Sprint 2 (Polish) |
| **Should Have** | Authenticated Profile | Secure login via Auth0 or AWS Cognito with MFA support. | Necessary for long-term document history tracking. | Sprint 2 (Polish) |
| **Should Have** | Custom Confidence Slider | Live threshold slider (0-100%) to filter automatic redactions. | Essential configuration to manage false positives dynamically. | Sprint 2 (Polish) |
| **Should Have** | Custom Entity Regex | Ability to add custom regex filters (e.g., custom company ID patterns). | Provides core flexibility for varied team needs. | Sprint 2 (Polish) |
| **Could Have** | Document History Logs | Central registry dashboard of all previously scrubbed files. | Good to have for administrative audit management. | Future Release |
| **Could Have** | Interactive OCR Parsing | Text extraction from scanned image PDFs and PNG receipts. | Highly useful but resource-heavy and slow for a hackathon. | Future Release |
| **Could Have** | Local Container Deployment | Ability to deploy the core engine as a Docker container on-premise. | Solves enterprise data residency concerns. | Future Release |
| **Could Have** | Browser Extension | Overlay intercepting copy-paste events to ChatGPT. | Extends productivity, but secondary to the core app workspace. | Future Release |

---

## 2. Priority Logic & Tradeoffs
* **Focus on Trust**: Explanations and Interactive reviews are placed strictly in **Must Have** because without them, TrustLens behaves exactly like standard black-box redactors, failing the core mission of explainability.
* **Scope Control**: Scanned PDF OCR and local deployments are marked as **Could Have** to prevent scope creep during Sprints 1 and 2, keeping the team focused on finalizing a high-performance web app.
