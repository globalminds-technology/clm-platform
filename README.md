# CLM Platform Monorepo

Enterprise Certificate Lifecycle Management SaaS for AWS, Azure, and GCP Marketplaces.

## Architecture & Tech Stack

* **Control Plane API:** NestJS (TypeScript, Fastify adapter)
* **Client Gateway Daemon:** Go (single static binary, zero runtime dependencies)
* **Frontend Portals:** Vite + React (TypeScript, Tailwind CSS, shadcn/ui)
  * `apps/tenant-portal`: Customer DevOps and Security teams
  * `apps/admin-portal`: SaaS Platform Operators
* **Database:** PostgreSQL with Row-Level Security (RLS)
* **Cache & Heartbeats:** Redis
* **Monorepo Engine:** pnpm + Turborepo
* **AI Code Quality & Security:** CodeRabbit (`.coderabbit.yaml`)

## Monorepo Layout

```text
clm-platform/
├── apps/
│   ├── backend/          # NestJS SaaS control plane
│   ├── gateway/          # Go satellite daemon
│   ├── tenant-portal/    # Customer React SPA
│   └── admin-portal/     # Platform operator React SPA
├── packages/
│   ├── api-client/       # Typed HTTP client for frontends
│   ├── proto/            # RPC / Typed contracts
│   ├── ui/               # Shared shadcn/ui components
│   ├── config/           # Shared TypeScript & ESLint configs
│   └── shared-types/     # Shared enums and constants
├── infra/
│   ├── docker/           # Local PostgreSQL RLS & Redis stack
│   └── terraform/        # Cloud infrastructure
└── docs/
    └── architecture-guide.md
```

## Getting Started

```bash
# Install all dependencies across the monorepo
pnpm install

# Run all apps in development mode
pnpm dev

# Build all packages and applications
pnpm build
```
