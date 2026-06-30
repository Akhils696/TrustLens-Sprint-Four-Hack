# Monorepo Folder Structure - TrustLens

This document details the scalable monorepo structure designed for TrustLens. It uses a modern monorepo layout (e.g., Turborepo/npm workspaces format) to manage frontend applications, API microservices, and shared configuration files in a unified codebase.

---

## 1. Project Directory Layout

```text
trustlens/
├── .github/                  # CI/CD Workflows (GitHub Actions)
│   └── workflows/
│       ├── test-frontend.yml  # Unit testing & Lint check for React
│       └── test-backend.yml   # Unit testing & Lint check for Python
├── apps/                     # High-level executable applications
│   ├── web/                  # Next.js 14 Frontend Application
│   │   ├── public/           # Static assets, fonts, icons
│   │   └── src/
│   │       ├── app/          # App Router (pages, layout, routing)
│   │       ├── components/   # Reusable UI elements (studio, common)
│   │       ├── hooks/        # Custom React hooks (useAuth, useStudio)
│   │       ├── stores/       # Zustand State Management stores
│   │       └── utils/        # Frontend parsing and network helpers
│   └── api/                  # FastAPI Backend Service
│       ├── app/
│       │   ├── core/         # Security, environment, and logger configs
│       │   ├── models/       # Pydantic Schemas (request/response schemas)
│       │   ├── services/     # MS Presidio & GPT-4o wrappers
│       │   └── views/        # API Routers (endpoints for upload, review)
│       ├── tests/            # pytest cases
│       ├── Dockerfile        # Container layout for Backend
│       └── requirements.txt  # Python requirements
├── packages/                 # Shared modules and configurations
│   ├── ui/                   # Shared UI Component library
│   ├── typescript-config/    # Shared TypeScript compiler policies
│   ├── eslint-config/        # Shared ESLint rules
│   └── types/                # Unified TypeScript type models
├── docs/                     # Product Foundation & Architecture docs (Sprint 0)
│   ├── Architecture.md
│   ├── CodingStandards.md
│   ├── FeaturePriority.md
│   ├── FunctionalRequirements.md
│   ├── GitWorkflow.md
│   ├── InformationArchitecture.md
│   ├── NonFunctionalRequirements.md
│   ├── ProblemStatement.md
│   ├── ProductVision.md
│   ├── TechStack.md
│   └── UserPersona.md
├── .gitignore                # Git files pattern exclusions
├── README.md                 # Project root README.md
├── package.json              # Monorepo workspace package management config
├── turbo.json                # Turborepo task pipeline automation config
└── LICENSE                   # MIT License
```

---

## 2. Directory Design Rationale
* **`apps/` Separation**: Separating `apps/web` (Next.js) from `apps/api` (FastAPI) ensures that frontend developers and AI engineers can work in parallel without merge conflicts. Each directory contains its own package settings, local environment files, and test files.
* **`packages/` Modularity**: Reusable configurations (like ESLint settings, tsconfig files, and Tailwind layouts) are placed inside shared workspaces. If we create a browser extension or admin portal in the future, they will import directly from these packages, preventing configuration drift.
* **Unified `docs/` Root**: All documentation remains at the root level, making it accessible to team members, product managers, and external security compliance auditors.
