# Production Cloud Deployment Blueprint: CLM Platform

This guide outlines the end-to-end architecture to deploy the enterprise Certificate Lifecycle Management (CLM) SaaS across production cloud providers with isolated subdomains and customer VPC integration.

---

## 1. System Topology Overview

```
                                      PUBLIC INTERNET
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
          ┌───────────────────────┐                     ┌───────────────────────┐
          │     Tenant Portal     │                     │  Super Admin Portal   │
          │  app.yourdomain.com   │                     │  admin.yourdomain.com │
          │    (Vercel / Edge)    │                     │    (Vercel / Edge)    │
          └───────────┬───────────┘                     └───────────┬───────────┘
                      │                                             │
                      └──────────────────────┬──────────────────────┘
                                             ▼ HTTPS REST API
                                 ┌───────────────────────┐
                                 │   Central API Backend │
                                 │   api.yourdomain.com  │
                                 │   (Render / Railway)  │
                                 └───────────┬───────────┘
                                             │
                        ┌────────────────────┴────────────────────┐
                        ▼                                         ▼
            ┌───────────────────────┐                 ┌───────────────────────┐
            │   PostgreSQL + RLS    │                 │   AWS ACM / Cloud CAs │
            │  Row-Level Isolation  │                 │    Direct Cloud APIs  │
            └───────────────────────┘                 └───────────────────────┘
                                             ▲
                                             │ Outbound Heartbeat (30s)
                                             │ mTLS / REST (No Inbound Ports)
                                 ┌───────────┴───────────┐
                                 │   Satellite Gateway   │
                                 │  Customer Private VPC │
                                 │    (EC2 / Linux VM)   │
                                 └───────────────────────┘
```

---

## 2. Component Split & Hosting Matrix

| Component | Repository Path | Recommended Platform | Domain / URL |
| :--- | :--- | :--- | :--- |
| **Tenant Admin Portal** | `apps/tenant-portal` | **Vercel** | `https://app.yourdomain.com` |
| **Super Admin Portal** | `apps/admin-portal` | **Vercel** | `https://admin.yourdomain.com` |
| **Central Backend API** | `apps/backend` | **Railway / Render** | `https://api.yourdomain.com` |
| **Database** | PostgreSQL 16 with RLS | **Supabase / Neon / Render Postgres** | Managed Private Connection |
| **Satellite Gateway** | `apps/gateway` | **Customer Private VPC / EC2** | Local Host (`localhost:8080`) |

---

## 3. Step-by-Step Deployment Instructions

### Step 3.1: Database (PostgreSQL with RLS)
1. Provision a PostgreSQL 16 instance on **Neon.tech** or **Render**.
2. Run database migration script:
   ```bash
   psql -h <POSTGRES_HOST> -U postgres -d <DB_NAME> -f infra/docker/init-db/01-init-rls.sql
   ```
3. Copy the secure connection string (`postgresql://postgres:...@host:5432/db`).

---

### Step 3.2: Central Backend API (`api.yourdomain.com`)
1. Create a **New Web Service** on **Render** or **Railway** pointing to your repository.
2. Configure build & start settings:
   * **Root Directory:** `.`
   * **Build Command:** `pnpm install && pnpm --filter @clm/backend build`
   * **Start Command:** `node apps/backend/dist/main.js`
3. Configure Environment Variables:
   ```env
   NODE_ENV=production
   PORT=4000
   DATABASE_URL=postgresql://...
   JWT_SECRET=production-secret-min-32-chars-long
   JWT_REFRESH_SECRET=production-refresh-secret-min-32-chars
   ENCRYPTION_MASTER_KEY=clm-master-aes256-production-key
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=bookmyevent2026@gmail.com
   SMTP_PASS=cujb rsli ihts oewf
   CORS_ORIGIN=https://app.yourdomain.com,https://admin.yourdomain.com
   ```
4. Attach Custom Domain: `api.yourdomain.com`.

---

### Step 3.3: Frontends on Vercel (`app.` and `admin.` Subdomains)

#### Project 1: Tenant Portal (`apps/tenant-portal`)
1. Import repository into Vercel.
2. Select Root Directory: `apps/tenant-portal`.
3. Framework Preset: `Vite`.
4. Environment Variables:
   ```env
   VITE_API_URL=https://api.yourdomain.com/api/v1
   ```
5. Assign Domain: `app.yourdomain.com` (or `<project>.vercel.app`).

#### Project 2: Super Admin Portal (`apps/admin-portal`)
1. Import repository into Vercel as a second project.
2. Select Root Directory: `apps/admin-portal`.
3. Framework Preset: `Vite`.
4. Environment Variables:
   ```env
   VITE_API_URL=https://api.yourdomain.com/api/v1
   ```
5. Assign Domain: `admin.yourdomain.com`.

---

### Step 3.4: Customer Satellite Gateway (Private VPC / EC2)
The Gateway is **never** deployed in your cloud. Customers install it inside their private networks:
```bash
# One-line customer install script
curl -sSL https://api.yourdomain.com/api/v1/install.sh | bash -s -- --token <TENANT_ENROLLMENT_TOKEN>
```
Or run the daemon container:
```bash
docker run -d \
  -e CLM_CONTROL_PLANE_URL=https://api.yourdomain.com/api/v1 \
  -e CLM_ENROLLMENT_TOKEN=<TOKEN> \
  -v /etc/nginx/ssl:/etc/nginx/ssl \
  clmplatform/satellite-gateway:latest
```

