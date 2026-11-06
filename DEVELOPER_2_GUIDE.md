# Developer 2 Implementation Guide: Frontend, Portals & Design System

Welcome to the Certificate Lifecycle Management (CLM) SaaS Platform monorepo! This document is the dedicated roadmap, setup guide, and specification document for **Developer 2 (Frontend & UX Lead)**.

---

## 1. Role Overview & Domain Ownership

As Developer 2, you own the user experience, design system, and client applications.

| Area | Scope & Details |
|---|---|
| **Primary Workspaces** | • `apps/tenant-portal` (Customer DevOps & SecOps portal)<br>• `apps/admin-portal` (Platform Operator & AWS Marketplace admin portal)<br>• `packages/ui` (Shared design system components)<br>• `packages/api-client` (UI-side contract consumption) |
| **Tech Stack** | React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, shadcn/ui patterns |
| **API Integration** | Type-safe HTTP client (`@clm/api-client`) + In-memory `MockApiClient` for fast local development without backend or Docker dependencies |
| **Portals Default URLs** | • Tenant Portal: `http://localhost:3000`<br>• Admin Portal: `http://localhost:3001`<br>• Backend Swagger: `http://localhost:4000/api/docs` |

---

## 2. Quickstart: Getting Running in 2 Minutes

Developer 1 has already prepared the monorepo foundation and configured local dev scripts.

### Step 1: Install Dependencies
```bash
pnpm install
```

### Step 2: Build Shared Packages
```bash
pnpm --filter @clm/shared-types build
pnpm --filter @clm/ui build
```

### Step 3: Run the Portals
Run either portal independently in dev mode:

```bash
# Run Tenant Portal (Port 3000)
pnpm --filter tenant-portal dev

# Run Super Admin Portal (Port 3001)
pnpm --filter admin-portal dev
```

> **Tip:** You do **not** need Docker or PostgreSQL running locally to develop frontends. Both portals consume `@clm/api-client`, which features a built-in `MockApiClient` with realistic mock certificates, gateways, and tenant organizations.

---

## 3. Architecture Rules & Boundaries

Enforced by ESLint and CodeRabbit CI checks (`.coderabbit.yaml` & `docs/architecture-guide.md`):

1. **Strict Monorepo Isolation**:
   - `apps/tenant-portal` and `apps/admin-portal` must **never** import directly from `apps/backend`.
   - All backend communication must pass through `@clm/api-client` or `@clm/shared-types`.
2. **Security & Tokens**:
   - Authentication tokens (JWT refresh tokens) are handled via `httpOnly`, `SameSite=Strict`, `Secure` cookies.
   - **Never store JWT access or refresh tokens in `localStorage` or `sessionStorage`** (prevents XSS token exfiltration).
3. **No Direct HTML Injection**:
   - Never use `dangerouslySetInnerHTML`.
4. **UI Component Purity**:
   - `packages/ui` components must be presentation-only (no hardcoded API endpoints or backend dependencies).

---

## 4. UI Design System Guidelines

Both portals adhere to an enterprise, light-themed **Indigo → Blue two-color gradient** aesthetic matching AWS Marketplace SaaS standards:

### Color Palette
- **Background**: `#F4F6FB` (very light blue-gray tint)
- **Surface / Soft-Cards**: `#FFFFFF` with `rounded-[28px]`, `border border-[#EDF2F7]`, and soft elevation shadow
- **Primary Indigo / Blue Gradient**: `linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)`
- **Text Primary**: `#0F172A` (deep slate)
- **Text Secondary**: `#64748B` (slate gray)
- **Borders**: `#EDF2F7` / `#E2E8F0`

### Reusable UI Classes (in `packages/ui` & portal `index.css`)
- `.soft-card`: Elevated white card with 28px border-radius and subtle shadow.
- `.primary-gradient-btn`: Indigo → Blue gradient button with hover elevation and active scale.
- `.pill-tab-active` & `.pill-tab-inactive`: Clean filter pills for table filtering.

---

## 5. Milestone Breakdown for Developer 2

### 📌 Milestone 1: Design System & Shared Components (`packages/ui`)

You own maintaining and extending `packages/ui`:

- [x] **`Sidebar`**: Detached floating pill collapsible sidebar with:
  - Non-overlapping centered logo and expand/collapse toggle (`>`).
  - Active squircle (`44px × 44px rounded-2xl`) with gradient glow.
  - Absolute floating notification badge pips (`-top-1.5 -right-2.5`) that keep icons centered.
  - Hover tooltips when collapsed.
  - Centered user avatar capsule at the bottom.
- [x] **`TopHeader`**: Clean navbar with search input, unread notification indicator, profile capsule, and primary action button.
- [x] **`Modal`**: Dialog with backdrop blur, rounded soft-card styling, title, and close button.
- [x] **`StatusBadge`**: Pill badge with indicator dot (`healthy`, `warning`, `critical`, `default`).
- [x] **Next Components Added**:
  - `DataTable`: Interactive table with sortable columns, row selection checkboxes, and pagination.
  - `Drawer` / `Sheet`: Slide-over drawer for deep inspection of certificate chains, PEM details, and SANs.
  - `ConfirmDialog`: Reusable confirmation modal for revoking certificates or deleting tenants.

---

### 📌 Milestone 2: Tenant Customer Portal (`apps/tenant-portal`)

Target Audience: Customer DevOps, Platform, and Security Engineers.

- [x] **Master-Detail 2-Column Split View (`Certificates`)**:
  - **Left Column**: Search bar, filter tabs (`All`, `Active`, `Expiring`, `Critical`), real certificate cards with days-remaining indicators and status badges.
  - **Right Column**: Comprehensive certificate inspector showing domain, SANs, serial number, SHA-256 fingerprint, valid dates, key algorithm, issuer, and deployment targets.
- [x] **Actions Implemented**:
  - `+ Add Certificate` modal with domain, SANs, CA issuer, and algorithm selection.
  - Immediate `Renew Certificate` trigger.
  - `Delete / Revoke Certificate` with confirmation.
- [x] **Local Gateways Fleet View (`Gateways`)**:
  - Status cards for enrolled local gateway daemons (`online` / `offline`), IP, agent version, target support (`AWS_ACM`, `AWS_ALB`, `NGINX`), and last heartbeat.
  - `+ Enroll New Gateway` modal with single-use enrollment command and one-click copy button (`curl -sSL ...`).
- [x] **Activity & Audit Ledger (`Activity Logs`)**:
  - Chronological timeline of certificate renewals, gateway heartbeats, and user actions.
- [x] **Next Features for Developer 2**:
  - Add visual certificate expiry histogram / calendar view on Dashboard.
  - Add filter by Gateway target (e.g. filter certificates deployed to AWS ALB vs NGINX).
  - Add export inventory to CSV / JSON.

---

### 📌 Milestone 3: Platform Super Admin Portal (`apps/admin-portal`)

Target Audience: Platform Operators & AWS Marketplace Administrators.

- [x] **Tenant Organizations Workspace (`Organizations`)**:
  - Master list of subscriber tenant workspaces with status pills (`ACTIVE`, `TRIAL`, `SUSPENDED`).
  - Organization metadata: slug, subscription tier (`ENTERPRISE`, `AWS_MARKETPLACE_PAYGO`, `COMMUNITY`), AWS Account ID linkage, and certificate/gateway quotas.
  - Suspend/Activate organization toggle.
  - Delete organization action with confirmation.
  - `+ Add Organization` modal provisioning new subscriber tenant under Row-Level Security.
- [x] **Global Audit Ledger (`Global Audit`)**:
  - Multi-tenant compliance audit trail recording actor (`USER`, `GATEWAY`, `SYSTEM`), action, IP address, and metadata.
- [x] **AWS Marketplace View (`AWS Marketplace`)**:
  - Live linkage display for AWS Marketplace SaaS subscriptions, customer identifier resolution, and dimension metering (`active_certs_quantity`).
- [x] **Next Features for Developer 2**:
  - Usage metering chart showing certificate quantities reported to AWS Marketplace Metering Service.
  - Plan upgrade / downgrade modal.

---

## 6. Integration Checkpoints with Developer 1

| Checkpoint | Target Feature | Developer 1 Delivers (Backend) | Developer 2 Integrates (Frontend) |
|---|---|---|---|
| **Checkpoint 1** | **Authentication & Me** | `POST /api/v1/auth/login`<br>`GET /api/v1/auth/me` | Connect login page; display user profile initials and tenant name. |
| **Checkpoint 2** | **Tenant CRUD** | `GET /api/v1/tenants`<br>`POST /api/v1/tenants` | Connect `+ Add Organization` modal to live backend API. |
| **Checkpoint 3** | **Gateway Enrollment** | `POST /api/v1/gateways/enrollment-token` | Generate and display live token in `Enroll Gateway` modal. |
| **Checkpoint 4** | **Certificates Feed & Renew** | `GET /api/v1/certificates`<br>`POST /api/v1/certificates/:id/renew` | Wire master-detail list and trigger live renewal command. |

---

## 7. Git Workflow & PR Guidelines

1. **Branch Naming**:
   - Features: `feat/portal-<feature-name>` or `feat/ui-<component-name>`
   - Bugfixes: `fix/portal-<issue-name>`
2. **Pre-commit Checklist**:
   ```bash
   pnpm --filter @clm/ui build
   pnpm --filter tenant-portal build
   pnpm --filter admin-portal build
   ```
3. **Automated Reviews**:
   - CodeRabbit checks every PR against `.coderabbit.yaml`. Ensure all TypeScript strict checks pass with 0 warnings.

