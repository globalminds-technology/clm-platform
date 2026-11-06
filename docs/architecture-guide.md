# CLM Platform: Monorepo Clean Architecture, Coding Rules and Security Guide

Build reference for the Certificate Lifecycle Management SaaS.

**Stack:** NestJS (control plane) · Go (satellite gateway) · Vite + React (two portals) · PostgreSQL with RLS · Redis · Protobuf / Typed contract.

---

## 1. Monorepo Layout

```
clm-platform/
├── apps/
│   ├── backend/                 # NestJS control plane (API + gateway ingress)
│   ├── gateway/                 # Go satellite daemon
│   ├── tenant-portal/           # Vite + React (customer DevOps/Security teams)
│   └── admin-portal/            # Vite + React (us, platform operators)
│
├── packages/
│   ├── api-client/              # ALL frontend endpoint calls (generated + http client)
│   ├── proto/                   # protobuf contract (backend <-> gateway)
│   ├── ui/                      # shared shadcn/ui components
│   ├── config/                  # shared eslint, tsconfig, prettier
│   └── shared-types/            # shared enums and constants (roles, statuses)
│
├── infra/
│   ├── terraform/               # cloud infrastructure
│   └── docker/                  # Dockerfiles, compose for local dev
│
├── docs/
│   ├── adr/                     # architecture decision records
│   ├── threat-model.md
│   └── runbooks/
│
├── .github/workflows/           # CI/CD
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── README.md
```

### Boundaries (enforce with lint rules)

| From | May import | Must NOT import |
|---|---|---|
| `apps/*-portal` | `packages/*` | `apps/backend` code |
| `apps/backend` | `packages/shared-types`, `packages/proto` | any frontend code |
| `apps/gateway` | `packages/proto` (generated Go code) | backend code |
| `packages/ui` | nothing app-specific | `api-client` |

Backend and frontends connect **only** through `packages/api-client` (HTTP) and gateway and backend connect **only** through `packages/proto`.

---

## 2. Backend (NestJS): `apps/backend/src`

### Request flow

```
Request -> Controller -> Service (use case) -> Repository -> Database
              |               |                    |
          route only     business logic       queries only
```

### Folder structure

```
src/
├── main.ts                              # bootstrap, security middleware, swagger
├── app.module.ts
│
├── modules/                             # ONE FOLDER PER FEATURE
│   ├── certificates/
│   ├── tenants/
│   ├── users/
│   ├── gateways/                        # enrollment, heartbeat, fleet status
│   ├── commands/                        # typed, signed commands to gateways
│   ├── renewals/                        # workflows, approvals, rollback
│   ├── discovery/
│   ├── billing/                         # marketplace provider abstraction
│   ├── audit/
│   └── notifications/
│
├── gateway-ingress/                     # mTLS endpoint the Go gateways connect to
│
├── shared/                              # cross-cutting, NO business logic
│   ├── auth/                            # guards, @Roles, @CurrentUser, @CurrentTenant
│   ├── tenancy/                         # tenant context, RLS transaction helper
│   ├── crypto/                          # KMS envelope encryption, signing, hashing
│   ├── database/                        # connection, migrations, seed
│   ├── config/                          # validated env config (fail on startup)
│   ├── errors/                          # global exception filter, error codes
│   ├── logging/                         # structured logger, redaction
│   ├── queue/                           # pg-boss / Temporal setup
│   └── health/                          # liveness and readiness endpoints
│
└── migrations/                          # SQL migrations (versioned)
```

### Layer rules (backend)

| Layer | Allowed | Not allowed |
|---|---|---|
| **Controller** | Route path, guards, DTO validation, call ONE service method, return result | DB queries, business `if`s, AWS/KMS calls, try/catch for business errors |
| **Service** | Business rules, orchestration, calling repositories and other services | `req`/`res` objects, raw SQL |
| **Repository** | Queries, transactions, mapping rows to entities | Business decisions, calling other modules' repositories |
| **DTO** | Shape and validation of input and output | Logic |
| **Entity** | Table definition and types | Logic that calls outside services |

---

## 3. Frontend (Vite + React): `apps/tenant-portal/src` and `apps/admin-portal/src`

### Request flow

```
Page -> Hook -> API function (packages/api-client) -> HTTP client -> Backend
```

### Layer rules (frontend)

| Layer | Allowed | Not allowed |
|---|---|---|
| **Page** | Compose feature components, read route params | Endpoint URLs, `fetch`/`axios`, business logic |
| **Component** | Render UI, call hooks, emit events | API calls directly, endpoint strings |
| **Hook** | Call API functions, manage query/mutation state | JSX |
| **API function** (`api-client`) | The only place that knows endpoint URLs | UI, React imports |
| **shared/** | Generic helpers | Feature-specific logic |

---

## 4. Gateway (Go): `apps/gateway`

- Outbound-only HTTPS 443. No inbound ports, no listening server.
- Private keys generated locally; keys NEVER sent to the control plane.
- Local policy allowlist overrides remote commands.
- Commands are typed and signed by the control plane.
- Every deploy target implements: `Deploy`, `Verify`, `Rollback`.

---

## 5. Security & Multi-Tenancy

- **PostgreSQL Row-Level Security (RLS)** on every tenant table.
- App DB role has no `BYPASSRLS`.
- Tenant context set per transaction: `SET LOCAL app.tenant_id = '...'`.
- Append-only audit log.
- Customer cloud access uses AWS IAM Instance Roles / Workload Identity (no long-lived cloud keys stored in DB).

