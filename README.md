# CLM Platform Monorepo

Enterprise Certificate Lifecycle Management SaaS for AWS, Azure, and GCP Marketplaces.

---

## Architecture & Tech Stack

* **Control Plane API:** NestJS (TypeScript, Fastify adapter)
* **Client Gateway Daemon:** Go (single static binary, zero runtime dependencies) + Node.js cross-platform runner
* **Frontend Portals:** Vite + React (TypeScript, Tailwind CSS, shadcn/ui)
  * `apps/tenant-portal`: Customer DevOps and Security teams
  * `apps/admin-portal`: SaaS Platform Operators & AWS Marketplace administrators
* **Database:** PostgreSQL 16 with Row-Level Security (RLS)
* **Cache & Heartbeats:** Redis 7
* **Monorepo Engine:** pnpm + Turborepo
* **AI Code Quality & Security:** CodeRabbit (`.coderabbit.yaml`)

---

## Developer Guides & Documentation

* **[DEVELOPER_2_GUIDE.md](DEVELOPER_2_GUIDE.md)**: Dedicated implementation guide for Developer 2 (Frontend, Portals & Design System).
* **[DEVELOPMENT_SPLIT_PLAN.md](DEVELOPMENT_SPLIT_PLAN.md)**: Two-developer implementation split, architectural ownership, and integration checkpoints.
* **[docs/architecture-guide.md](docs/architecture-guide.md)**: Clean architecture boundaries, security rules, and coding standards.
* **[docs/database-er-diagram.html](docs/database-er-diagram.html)**: Interactive Database ER Diagram viewer with 1-click **Download SVG**, **Download PNG**, and **Print to PDF**.
* **[docs/database-er-diagram.md](docs/database-er-diagram.md)**: Entity-Relationship schema with table specifications, keys, and RLS policies.

---

## Monorepo Layout

```text
clm-platform/
├── apps/
│   ├── backend/          # NestJS SaaS control plane
│   ├── gateway/          # Go satellite daemon + runner.js
│   ├── tenant-portal/    # Customer React SPA (Port 3000)
│   └── admin-portal/     # Platform operator React SPA (Port 3001)
├── packages/
│   ├── api-client/       # Typed HTTP client for frontends + MockApiClient
│   ├── proto/            # RPC / Typed contracts
│   ├── ui/               # Shared design system (Sidebar, TopHeader, Modal, StatusBadge)
│   ├── config/           # Shared TypeScript & ESLint configs
│   └── shared-types/     # Shared enums and models (Role, CertStatus, Tenant, etc.)
├── infra/
│   ├── docker/           # Local PostgreSQL 16 RLS & Redis 7 stack
│   └── terraform/        # Cloud infrastructure
└── docs/
    ├── architecture-guide.md
    ├── database-er-diagram.md
    └── database-er-diagram.html
```

---

## Getting Started: Running the Application

### Option 1: Quickstart (Infrastructure + All Portals)

From the project root (`d:\personal\clm-platform`):

```bash
# 1. Start PostgreSQL 16 & Redis 7 (or pnpm docker:reset if starting fresh)
pnpm docker:up

# 2. Start all services concurrently (Backend + Tenant Portal + Admin Portal)
pnpm dev
```

> **Note on PostgreSQL Database Authentication:**
> If you see `password authentication failed for user "clm_app"`, it means an older Docker volume already existed before the initialization script was mounted. Simply run:
> ```bash
> pnpm docker:reset
> ```
> This wipes the stale volume and automatically executes `infra/docker/init-db/01-init-rls.sql` to configure the unprivileged `clm_app` role with Row-Level Security (RLS).

---

### Option 2: Run Individual Components Separately

Open separate terminal tabs from the project root (`d:\personal\clm-platform`):

#### 1. Start Local Database (PostgreSQL 16 & Redis 7)
```bash
pnpm docker:up
# Or if re-initializing from scratch:
pnpm docker:reset
```

#### 2. Start Backend Control Plane API (Port 4000)
```bash
pnpm --filter @clm/backend dev
```
*(Or run the production build: `pnpm --filter @clm/backend start`)*

#### 3. Start Tenant Customer Portal (Port 3000)
```bash
pnpm --filter tenant-portal dev
```

#### 4. Start Platform Super Admin Portal (Port 3001)
```bash
pnpm --filter admin-portal dev
```

#### 5. Start Satellite Gateway Daemon (Optional)
```bash
node apps/gateway/runner.js
```

---

## Application Access URLs

| Application / Service | URL | Description |
|---|---|---|
| **Tenant Customer Portal** | [http://localhost:3000](http://localhost:3000) | DevOps/SecOps certificate management, master-detail view, & gateway fleet |
| **Platform Super Admin Portal** | [http://localhost:3001](http://localhost:3001) | Multi-tenant organization CRUD under RLS, global audit, & AWS Marketplace |
| **Backend API & Swagger Docs** | [http://localhost:4000/api/docs](http://localhost:4000/api/docs) | Interactive OpenAPI REST documentation |
| **API Health Readiness Probe** | [http://localhost:4000/api/v1/health/readiness](http://localhost:4000/api/v1/health/readiness) | System readiness probe |
| **Database ER Diagram Viewer** | [docs/database-er-diagram.html](docs/database-er-diagram.html) | Interactive vector diagram viewer with SVG/PNG download |
