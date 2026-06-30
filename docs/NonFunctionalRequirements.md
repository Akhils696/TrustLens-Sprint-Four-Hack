# Non-Functional Requirements - TrustLens

This document details the quality attributes, security standards, and operational constraints for the TrustLens platform.

---

## 1. Performance (NFR-PERF)
* **Processing Latency**:
  * Documents up to 5MB must be parsed, analyzed for PII, and have explanation structures generated in under 3.0 seconds.
  * Documents up to 15MB must be processed in under 8.0 seconds.
* **UI Responsiveness**:
  * The frontend application must achieve a LightHouse Performance score of $\ge 90/100$.
  * Interactivity latency (time-to-first-paint upon hover/click on a token in the Review workspace) must be under 50ms to ensure a smooth, fluid user experience.
* **Concurrent Throughput**:
  * The backend API layer must handle up to 100 concurrent document upload requests without degradation in processing latency.

---

## 2. Accessibility (NFR-ACCESS)
* **Compliance Standard**:
  * The application must comply with Web Content Accessibility Guidelines (WCAG) 2.1 Level AA.
* **Keyboard Navigation**:
  * All interactive controls (buttons, entity tags, input fields, sliders) must be focusable and fully operable via standard keyboard controls (Tab, Enter, Space, Arrow keys).
* **Screen Reader Support**:
  * All visual components must contain appropriate ARIA attributes (`aria-label`, `aria-describedby`, `role="tooltip"`, `role="dialog"`).
* **Visual Contrast**:
  * Color contrast ratios for text and key interactive boundaries must exceed 4.5:1. Redacted state colors must be distinguishable under common forms of color blindness (e.g., deuteranopia).

---

## 3. Security (NFR-SEC)
* **Data Encryption**:
  * **In Transit**: All client-server communications must use TLS 1.3 encryption.
  * **At Rest**: Any ephemeral server-side storage (e.g., cached parsed texts) must be encrypted using AES-256 with key management handled by AWS KMS.
* **Data Retention & Privacy Policy (Zero Retention)**:
  * Ephemeral server storage files must be physically wiped (overwritten and deleted) immediately after the redacted file and audit report are compiled and returned to the client, or upon session termination.
  * User credentials and profiles (for authenticated mode) must be stored in Auth0 / AWS Cognito, avoiding native password storage in our databases.
* **Security Auditing**:
  * Mitigate against standard OWASP Top 10 vulnerabilities (such as SQL Injection, XSS, CSRF, and broken access controls).
  * API endpoints must implement rate-limiting of 60 requests per minute per IP address to prevent Denial of Service (DoS) attacks.

---

## 4. Maintainability (NFR-MAINT)
* **Code Architecture**:
  * Codebase must adhere to Clean Architecture principles, ensuring domain business logic is decoupled from external libraries (e.g., Presidio, FastAPI, React).
  * Enforce strict type safety with TypeScript on the frontend (no `any` type allowed) and Python type hints on the backend (enforced via Ruff and Mypy).
* **Testing Coverage**:
  * Maintain a minimum of 80% unit test coverage for core business logic, including PII parsing logic, explanation assembly builders, and metadata extraction helper functions.
* **Continuous Integration**:
  * Automatic build checks, linters (ESLint, Ruff), and formatters (Prettier, Black) must run on every Git pull request.

---

## 5. Scalability (NFR-SCALE)
* **Stateless Architecture**:
  * The API server must remain stateless. Session states must be stored client-side in secure cookies or JWTs. This enables horizontal scaling.
* **Auto-Scaling**:
  * The backend compute resources (AWS ECS Fargate containers) must auto-scale based on CPU utilization ($\ge 70\%$) or active socket request queues.
* **AI Engine Offloading**:
  * Heavy NLP detection tasks must be run asynchronously, or offloaded to a scalable model-serving worker pool, keeping the API gateway responsive.

---

## 6. Reliability (NFR-RELI)
* **Availability**:
  * The application must target a 99.9% uptime availability, excluding planned maintenance windows.
* **Graceful Degradation**:
  * If the AI Explanation Engine is temporarily unreachable, the system must degrade gracefully: it must still perform pattern-based regex PII detection locally in the client and inform the user that semantic explanation is temporarily offline.
* **Error Logs & Monitoring**:
  * All errors must be logged using structured JSON logs sent to a central logging tool (e.g., AWS CloudWatch or Sentry) with sensitive data (PII) strictly scrubbed out of error logs.
