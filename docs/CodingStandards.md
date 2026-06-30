# Coding Standards & Quality Policies - TrustLens

This document establishes the official coding standards, formatting guidelines, and architectural style policies for the TrustLens codebase.

---

## 1. Naming Conventions

### File & Folder Naming
* **Frontend (TypeScript/React)**:
  * Directories: lowercase dash-separated (kebab-case) (e.g., `components/interactive-studio`).
  * React Components: PascalCase matching the component name (e.g., `SplitViewWorkspace.tsx`).
  * Hooks: camelCase with `use` prefix (e.g., `useDocumentParser.ts`).
  * Utilities/Helpers: camelCase (e.g., `formatHash.ts`).
* **Backend (Python)**:
  * Packages & Modules: lowercase underscore-separated (snake_case) (e.g., `pii_detection_service.py`).
  * Directories: snake_case (e.g., `document_parsers/`).

### Code Symbol Naming
* **TypeScript**:
  * Classes & Types/Interfaces: PascalCase (e.g., `interface DocumentMetadata {}`).
  * Variables, Functions, & Instantiated Objects: camelCase (e.g., `const parsedDocument = ...`).
  * Constants: UPPER_SNAKE_CASE (e.g., `const MAX_FILE_SIZE_BYTES = 15728640;`).
* **Python**:
  * Classes: PascalCase (e.g., `class PresidioDetector:`).
  * Functions, Methods, & Variables: snake_case (e.g., `def detect_pii_entities(self, text: str) -> list:`).
  * Constants: UPPER_SNAKE_CASE (e.g., `ZERO_RETENTION_TTL_SECONDS = 900`).

---

## 2. TypeScript & React Conventions

### TypeScript Standards
* **Strict Mode**: `strict` flag must be set to `true` in `tsconfig.json`.
* **No Implicit Any**: Explicit types must be declared for all function inputs, class properties, and API responses. The `any` type is strictly forbidden; use `unknown` if the type is truly dynamic.
* **Interfaces vs Types**:
  * Use `interface` for public APIs, object definitions, and react component props (promotes extensibility).
  * Use `type` for unions, intersections, utility helper constructs, or aliases.

### React Component Guidelines
* **Functional Components**: Use arrow functions with explicit typing for functional components:
  ```typescript
  import React from 'react';

  interface TooltipProps {
    text: string;
    score: number;
    explanation: string;
  }

  export const ExplanationTooltip: React.FC<TooltipProps> = ({ text, score, explanation }) => {
    return (
      <div className="explanation-tooltip-card">
        <h4>{text}</h4>
        <span>Confidence: {score}%</span>
        <p>{explanation}</p>
      </div>
    );
  };
  ```
* **Hooks Policy**: Keep hooks focused. Extract any complex state manipulation or side effects from views into custom hooks (e.g., `useInteractiveScrubbing`).
* **State Management**:
  * Use local component state (`useState`) only for isolated UI toggles.
  * Use Zustand store slices for shared global document arrays, audit reports, and user validation statuses.

---

## 3. Python Coding Standards

### Code Quality (PEP8 & Beyond)
* **Formatter & Linter**: Code must pass validation checks by **Ruff** (configured to match PEP8 rules, with line lengths limited to 100 characters).
* **Type Hinting**: All Python function signatures must be fully type-hinted using standard typing symbols:
  ```python
  from pydantic import BaseModel

  class PiiEntity(BaseModel):
      text: str
      entity_type: str
      confidence: float
      explanation: str

  def process_text_segment(segment: str, threshold: float) -> list[PiiEntity]:
      # Business logic goes here
      return []
  ```
* **Asynchronous Programming**: Core IO-bound calls (e.g., reading files from S3, calling external OpenAI API endpoints) must use `async` / `await` syntax to prevent blocking the FastAPI event loop.

---

## 4. Git Conventions & Configuration
* **Line Endings**: Set git to handle line endings correctly across Windows and Unix platforms:
  * Windows users must set: `git config --global core.autocrlf true`
  * Mac/Linux users must set: `git config --global core.autocrlf input`
* **File Permissions**: Ensure executable files (e.g., helper bash scripts) have appropriate git permission flags set (`chmod +x`).
