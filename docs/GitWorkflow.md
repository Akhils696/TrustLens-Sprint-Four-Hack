# Git Workflow & Commit Policies - TrustLens

This document defines the git branching strategy, commit naming regulations, merge procedures, and pull request checklist for TrustLens.

---

## 1. Branching Strategy (Trunk-Based Development)
To maintain velocity during the hackathon and ensure continuous integration, TrustLens utilizes a **Trunk-Based Development** branching workflow:

```mermaid
gitGraph
    commit id: "initial"
    commit id: "setup project"
    branch feature/pii-detector
    checkout feature/pii-detector
    commit id: "add presidio integration"
    commit id: "add regex check"
    checkout main
    merge feature/pii-detector id: "squash & merge"
    branch bugfix/tooltip-scroll
    checkout bugfix/tooltip-scroll
    commit id: "fix tooltip alignment"
    checkout main
    merge bugfix/tooltip-scroll id: "squash & merge"
```

* **Trunk (`main`)**: The single source of truth. The `main` branch must always remain in a compilable, deployable state. Direct pushes to `main` are blocked (except during early repo initialization).
* **Short-Lived Feature Branches (`feature/` or `bugfix/`)**: Created from `main` for specific requirements or bug fixes.
  * *Naming Format*: `feature/short-description` (e.g., `feature/docx-parser`) or `bugfix/short-description` (e.g., `bugfix/guest-limit-check`).
  * Branches should exist for no more than 2-3 days before being merged back to `main`.

---

## 2. Commit Naming (Conventional Commits)
All commit messages must adhere to the **Conventional Commits v1.0.0** specification.

### Commit Format
```text
<type>(<scope>): <description>

[optional body]
```

### Commit Types
* **`feat`**: A new feature (e.g., `feat(api): integrate GPT-4o explanation logic`).
* **`fix`**: A bug fix (e.g., `fix(web): resolve slider coordinate mismatch`).
* **`docs`**: Documentation changes (e.g., `docs: add user journey map`).
* **`style`**: Code style changes (formatting, missing semi-colons, no logic change).
* **`refactor`**: Code changes that neither fix a bug nor add a feature.
* **`test`**: Adding missing tests or correcting existing tests.
* **`chore`**: Maintenance tasks (e.g., updating build scripts, npm packages).

### Scope Guidelines
Scopes are optional but encouraged when working inside a monorepo:
* E.g., `feat(web): add tooltips`, `fix(api): restrict doc size`, `chore(repo): update docker config`.

---

## 3. Merge Strategy
* **Method**: **Squash and Merge**
  * *Rationale*: Compresses multiple WIP (Work-In-Progress) commits on a feature branch into a single, clean commit on `main`. This maintains a readable commit history and makes rollback operations simple.
* **Requirements for Merging**:
  * All CI test suites (jest, pytest) must pass.
  * The code must compile without errors.
  * Minimum of 1 peer approval from another engineer.

---

## 4. Pull Request Review Checklist
Reviewers must verify that incoming PRs meet the following conditions before approving:

- [ ] **Type Safety**: No instances of implicit `any` are added in TypeScript files.
- [ ] **Performance**: AI pipelines do not execute blocking sync calls (ensure use of async/await).
- [ ] **Security**: No hardcoded API secrets or private tokens (verify environment variables are used).
- [ ] **Data Residency**: The upload workflow complies with the "Zero-Retention" storage standard (ensure files are deleted upon transaction end).
- [ ] **Test Coverage**: Appropriate unit tests have been added for new parsing patterns or processing states.
- [ ] **Formatting**: The code passes formatting checks (Ruff for python, Prettier/ESLint for frontend).
