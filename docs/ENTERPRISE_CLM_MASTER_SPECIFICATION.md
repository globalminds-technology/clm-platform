# Enterprise Certificate Lifecycle Management (CLM)
## Master Architecture, Regulatory Compliance & End-to-End Technical Specification

> **Document Version:** 2.0.0 (Enterprise Gold Standard)  
> **Target System:** CLM Platform (`clm-platform`)  
> **Status:** OFFICIAL SYSTEM SPECIFICATION & IMPLEMENTATION MASTER PLAN  
> **Date:** November 2026  
> **Applicable Sectors:** FinTech / Banking, Healthcare / MedTech, Cloud SaaS, Defense & Public Infrastructure  

---

## Table of Contents
1. [Executive Summary & High-Level Architectural Vision](#1-executive-summary--high-level-architectural-vision)
2. [Global Regulatory & Industry Compliance Framework](#2-global-regulatory--industry-compliance-framework)
   - [2.1 Healthcare: HIPAA / HITECH Compliance](#21-healthcare-hipaa--hitech-compliance)
   - [2.2 FinTech & Banking: PCI-DSS v4.0 Standard](#22-fintech--banking-pci-dss-v40-standard)
   - [2.3 Enterprise Security: ISO/IEC 27001:2022 & ISO 27701](#23-enterprise-security-isoiec-270012022--iso-27701)
   - [2.4 Hardening & Security Standards: CIS Benchmarks](#24-hardening--security-standards-cis-benchmarks)
   - [2.5 Federal & Cryptographic Standards: NIST SP 800-52/57 & FIPS 140-3](#25-federal--cryptographic-standards-nist-sp-800-5257--fips-140-3)
   - [2.6 CA/Browser Forum (CABF) Baseline Requirements](#26-cabrowser-forum-cabf-baseline-requirements)
3. [Comprehensive Gap Analysis & Codebase Delta Audit](#3-comprehensive-gap-analysis--codebase-delta-audit)
   - [3.1 What Recent Pull Requests Added](#31-what-recent-pull-requests-added)
   - [3.2 Critical Remaining Architectural & Functional Gaps](#32-critical-remaining-architectural--functional-gaps)
4. [System Architecture & Cryptographic Engine](#4-system-architecture--cryptographic-engine)
   - [4.1 PostgreSQL Kernel-Level Row-Level Security (RLS)](#41-postgresql-kernel-level-row-level-security-rls)
   - [4.2 AES-256-GCM Envelope Encryption & Key Management](#42-aes-256-gcm-envelope-encryption--key-management)
   - [4.3 Zero-Trust Satellite Gateway Protocol (Outbound-Only mTLS)](#43-zero-trust-satellite-gateway-protocol-outbound-only-mtls)
5. [Page-by-Page & Field-by-Field Complete UI/UX Specification](#5-page-by-page--field-by-field-complete-uiux-specification)
   - [Screen 1: Tenant Workspace Registration & Onboarding](#screen-1-tenant-workspace-registration--onboarding)
   - [Screen 2: Super Admin Platform Control Plane](#screen-2-super-admin-platform-control-plane)
   - [Screen 3: Tenant Settings → Organization Legal Profile (OV/EV)](#screen-3-tenant-settings--organization-legal-profile-ovev)
   - [Screen 4: Tenant Settings → CA Integrations (Public & Private PKI)](#screen-4-tenant-settings--ca-integrations-public--private-pki)
   - [Screen 5: Tenant Settings → Cloud DNS Accounts (DCV Solvers)](#screen-5-tenant-settings--cloud-dns-accounts-dcv-solvers)
   - [Screen 6: Gateways → Satellite Gateway Enrollment & Daemon](#screen-6-gateways--satellite-gateway-enrollment--daemon)
   - [Screen 7: Certificates → Dynamic Add / Enroll Modal](#screen-7-certificates--dynamic-add--enroll-modal)
   - [Screen 8: Satellite Gateway Local Console & Webhook Dispatch](#screen-8-satellite-gateway-local-console--webhook-dispatch)
6. [End-to-End Real-World Customer Journey (The FinTech / HealthTech Story)](#6-end-to-end-real-world-customer-journey-the-fintech--healthtech-story)
   - [Act 1: Tenant Registration & Admin Approval](#act-1-tenant-registration--admin-approval)
   - [Act 2: Organization Identity & CA Account Linking](#act-2-organization-identity--ca-account-linking)
   - [Act 3: Route53 Cloud DNS Provider Enrollment](#act-3-route53-cloud-dns-provider-enrollment)
   - [Act 4: Zero-Trust Gateway Deployment in VPC](#act-4-zero-trust-gateway-deployment-in-vpc)
   - [Act 5: Certificate Issuance & Automated DNS-01 Verification](#act-5-certificate-issuance--automated-dns-01-verification)
   - [Act 6: Autonomous 30-Day Watchdog & Graceful NGINX Reload](#act-6-autonomous-30-day-watchdog--graceful-nginx-reload)
7. [Step-by-Step Implementation Roadmap](#7-step-by-step-implementation-roadmap)

---

## 1. Executive Summary & High-Level Architectural Vision

Modern enterprise computing spans multi-cloud environments (AWS, Azure, GCP), hybrid on-premises data centers, private Kubernetes clusters, and sovereign VPC networks. In these environments, **expired digital certificates cause severe outages**, resulting in millions of dollars in financial losses, degraded brand reputation, and severe regulatory non-compliance penalties.

The **CLM Platform (`clm-platform`)** is engineered as a next-generation machine identity management and autonomous certificate lifecycle management system. It pairs a **central multi-tenant SaaS control plane** with **zero-trust, outbound-only satellite gateway daemons**, delivering 100% automated certificate discovery, issuance, validation, deployment, and autonomous renewal.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            CLM SAAS CONTROL PLANE                                │
│                                                                                  │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌──────────────────────┐  │
│  │ Multi-Tenant Identity │  │  AES-256-GCM Vault    │  │ PostgreSQL Kernel    │  │
│  │ & Super Admin RBAC    │  │  Envelope Encryption  │  │ Row-Level Security   │  │
│  └───────────────────────┘  └───────────────────────┘  └──────────────────────┘  │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌──────────────────────┐  │
│  │ CA Driver Orchestrator│  │  Cloud DNS Adapters   │  │ 30-Day Autonomous    │  │
│  │ (ACME/DigiCert/Sect)  │  │ (Route53/Azure/GCP)   │  │ Lifecycle Watchdog   │  │
│  └───────────────────────┘  └───────────────────────┘  └──────────────────────┘  │
└──────────────────────────┬───────────────────────────────────────┬───────────────┘
                           │ Outbound-Only mTLS                    │
                           │ Handshake (Port 443)                  │ Cloud APIs
                           ▼                                       ▼
             ┌──────────────────────────┐               ┌─────────────────────┐
             │ CUSTOMER PRIVATE VPC     │               │ PUBLIC CAs & DNS    │
             │                          │               │                     │
             │  ┌────────────────────┐  │               │ • Let's Encrypt     │
             │  │ Satellite Gateway  │  │               │ • DigiCert          │
             │  │ Daemon (Go / Node) │  │               │ • Sectigo           │
             │  └─────────┬──────────┘  │               │ • AWS Route53       │
             │            │ Writes Cert │               │ • Azure DNS         │
             │            ▼ & Reloads   │               │ • GCP Cloud DNS     │
             │  ┌────────────────────┐  │               └─────────────────────┘
             │  │ NGINX / ALB Target │  │
             │  │ Zero Downtime SIGHUP  │
             │  └────────────────────┘  │
             └──────────────────────────┘
```

---

## 2. Global Regulatory & Industry Compliance Framework

To operate in regulated enterprise environments, the CLM platform must adhere strictly to international compliance mandates. Every line of backend and frontend code must conform to the following standards:

### 2.1 Healthcare: HIPAA / HITECH Compliance
* **Regulatory Context:** The **Health Insurance Portability and Accountability Act (HIPAA)** Security Rule mandates the protection of Electronic Protected Health Information (ePHI).
* **Technical Mandates for CLM:**
  1. **§ 164.312(e)(1) Transmission Security:** All data in transit (APIs, web portals, satellite heartbeats, and CA communications) must be encrypted using modern cipher suites (**TLS 1.2 or TLS 1.3** exclusively). Legacy SSL v3, TLS 1.0, and TLS 1.1 are strictly forbidden.
  2. **Zero-Downtime Guarantee:** Medical telemetry, hospital APIs, and electronic health record (EHR) integrations cannot afford certificate expiration outages. The **30-day autonomous renewal watchdog** serves as a vital safeguard preventing hospital system blackouts.
  3. **§ 164.312(b) Audit Controls:** Every certificate generation, private key access, deployment action, and administrative configuration must be recorded in an immutable append-only audit trail (`audit_logs` table) recording actor identity, source IP, timestamp, and cryptographic fingerprint.

### 2.2 FinTech & Banking: PCI-DSS v4.0 Standard
* **Regulatory Context:** The **Payment Card Industry Data Security Standard (PCI-DSS) v4.0** governs entities handling credit card transactions and cardholder data (CHD).
* **Technical Mandates for CLM:**
  1. **Requirement 4.2:** Strong cryptography must protect cardholder data during transmission over open, public networks.
  2. **Requirement 8.3 & 8.4:** Strong multi-factor authentication and credential hygiene. Cloud access keys and CA tokens must never be logged or exposed in plaintext. Credentials stored in the database must use **AES-256-GCM** authenticated envelope encryption with 96-bit initialization vectors.
  3. **Requirement 10.2:** Automated audit logs must capture all administrative actions, changes to cryptographic keys, and credential additions.
  4. **Requirement 12.3.3:** Organizations must maintain an accurate, up-to-date inventory of all authorized cryptographic keys and certificates, including algorithms, key lengths, expiration dates, and assigned domain names.

### 2.3 Enterprise Security: ISO/IEC 27001:2022 & ISO 27701
* **Control A.8.24 (Use of Cryptography):** Mandates an end-to-end cryptographic lifecycle policy covering generation, storage, renewal, and retirement of certificates and keys. Private keys stored within the platform must be encrypted at rest, and keys generated at the edge must be protected with strict Unix file permissions (`0600`).
* **Control A.8.20 (Network Security):** External access to private customer VPCs is prohibited. The platform's **outbound-only satellite architecture** adheres to this control by avoiding any open inbound firewall ports.
* **Control A.8.9 (Configuration Management):** The system enforces standardized cryptographic configurations (RSA 2048/4096 or ECDSA P-256/P-384) to eliminate deprecated algorithms like SHA-1 or MD5.

### 2.4 Hardening & Security Standards: CIS Benchmarks
* **CIS PostgreSQL Benchmark:**
  - All database connections must mandate SSL/TLS (`sslmode=require`).
  - Kernel-level **Row-Level Security (RLS)** must be enforced (`ALTER TABLE ... FORCE ROW LEVEL SECURITY`) to guarantee multi-tenant cryptographic isolation even in the event of an application-level SQL error.
* **CIS Linux & Web Server (NGINX/Apache) Benchmark:**
  - Private key files must be owned by `root` or the dedicated service account with permissions restricted to `chmod 0600`.
  - Web servers must disable insecure ciphers, mandating Forward Secrecy (PFS) via ECDHE key exchange.

### 2.5 Federal & Cryptographic Standards: NIST SP 800-52/57 & FIPS 140-3
* **NIST SP 800-52 Rev. 2:** Guidelines for the selection, configuration, and use of Transport Layer Security implementations in federal systems. Requires modern ephemeral Diffie-Hellman algorithms and curve definitions (NIST P-256, P-384).
* **NIST SP 800-57 Part 1 Rev. 5:** Recommendations for Key Management. Enforces appropriate key lengths: RSA keys must have a minimum modulus size of **2048 bits** (with 4096 recommended for high security), and elliptic curve keys must be at least **256 bits**.
* **FIPS 140-3 Validation:** Cryptographic operations in the backend leverage Node.js and Go cryptographic modules compiled against standard FIPS-compliant primitives.

### 2.6 CA/Browser Forum (CABF) Baseline Requirements
* **Maximum Validity Periods:** Publicly trusted certificates are capped at **398 days**, with industry momentum moving toward **90-day** maximum lifespans. Our platform defaults to 90-day lifespans with autonomous renewal at 30 days.
* **Automated Domain Control Validation (DCV):** Adheres strictly to **DNS-01** (RFC 8555 Section 8.4) via automated Route53/Azure/GCP TXT record management, and **HTTP-01** via the Satellite Gateway webroot.

---

## 3. Comprehensive Gap Analysis & Codebase Delta Audit

### 3.1 What Recent Pull Requests Added
A recent merge to `main` introduced the following enhancements:
1. **`TenantOrganizationMetadata` Interface in `packages/shared-types`:**
   Added fields for `organizationName`, `department`, `country` (2-letter ISO), `state`, `locality`, `contactEmail`, `defaultKeyAlgorithm`, `defaultCaProvider`, and `defaultChallengeType`.
2. **"Edit Organization Profile" Modal in `apps/tenant-portal/src/App.tsx`:**
   Added a UI modal in the General Settings tab allowing tenant administrators to update Legal Organization Name ($O$), Country Code ($C$), Department ($OU$), State ($ST$), and Locality ($L$), persisting directly to `tenants.settings.orgMetadata`.
3. **Registration Flow Updates:**
   Extended the registration form with optional inputs for Country, State, Locality, and Department.

### 3.2 Critical Remaining Architectural & Functional Gaps

| # | Subsystem | Current State | Required Enterprise State | Priority |
| :- | :--- | :--- | :--- | :--- |
| **1** | **CA Integrations Database Table** | ❌ Missing. No dedicated table exists. | Create `ca_integrations` table in PostgreSQL with RLS, foreign keys to `tenants(id)`, and AES-256-GCM encrypted credential fields. | **P0 (Immediate)** |
| **2** | **CA Integrations Backend API** | ❌ Missing. No CRUD endpoints exist. | Implement `CaIntegrationsModule` in NestJS (`ca-integrations.service.ts`, `repository.ts`, `controller.ts`) supporting `GET`, `POST`, `DELETE`, and `PATCH /:id/default`. | **P0 (Immediate)** |
| **3** | **Settings → CA Integrations UI** | ❌ Missing. Settings only has "General", "Cloud Providers", and "Team". | Dedicated tab in Tenant Settings to add, list, mask, and manage Let's Encrypt EAB, DigiCert, Sectigo, and AWS PCA accounts. | **P0 (Immediate)** |
| **4** | **Add Certificate Modal Dynamic Fields** | ❌ Hardcoded `<option>` elements in `App.tsx` (`lines 3930-3936`); defaults to `gateways[0]`. | Dynamically load tenant's connected CAs, populate Cloud DNS Provider selector (Route53/Azure/GCP), and allow selecting deployment targets. | **P1 (Core UX)** |
| **5** | **Commercial CA Drivers** | ⚠️ Only Let's Encrypt ACME driver is written. | Build modular REST drivers for **DigiCert CertCentral** and **Sectigo SCM**, handling asynchronous order polling and DCV validation tokens. | **P1 (Enterprise)** |
| **6** | **Cloud DNS Live Updates** | ⚠️ Azure DNS & GCP Cloud DNS are logging stubs (`ca-driver.service.ts` lines 192–213). | Integrate `@azure/arm-dns` and `@google-cloud/dns` SDKs to create and delete live `_acme-challenge` TXT records. | **P1 (Multi-Cloud)** |
| **7** | **Autonomous Renewal Watchdog** | ⚠️ `LifecycleSchedulerService` executes an SQL `UPDATE` on dates without calling CA drivers or gateways. | Connect scheduler to trigger full renewal workflow: generate key $\rightarrow$ execute DNS-01 $\rightarrow$ issue certificate $\rightarrow$ dispatch mTLS payload to Gateway $\rightarrow$ reload server. | **P0 (Core USP)** |

---

## 4. System Architecture & Cryptographic Engine

### 4.1 PostgreSQL Kernel-Level Row-Level Security (RLS)
Unlike typical SaaS platforms that rely purely on application-level filtering (`WHERE tenant_id = ?`), this platform implements **PostgreSQL Row-Level Security**. Every transaction sets a session variable:
```sql
SET LOCAL app.current_tenant_id = 'tenant-uuid-here';
```
The database engine evaluates every `SELECT`, `INSERT`, `UPDATE`, and `DELETE` at the kernel level:
```sql
CREATE POLICY tenant_isolation_policy ON ca_integrations
FOR ALL TO clm_app
USING (current_setting('app.is_system', true) = 'true' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
WITH CHECK (current_setting('app.is_system', true) = 'true' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
```
Even in the event of an application-level SQL injection attempt, **cross-tenant data leakage is cryptographically and logically impossible**.

### 4.2 AES-256-GCM Envelope Encryption & Key Management
All sensitive credentials (DigiCert API keys, Sectigo passwords, AWS IAM Secret Keys, ACME EAB HMACs) are encrypted before reaching the database:
* **Algorithm:** AES-256 in Galois/Counter Mode (**AES-256-GCM**).
* **Initialization Vector ($IV$):** 96-bit cryptographically secure pseudorandom number generated per operation using Node.js `crypto.randomBytes(12)`.
* **Authentication Tag ($TAG$):** 128-bit authentication tag validating ciphertext integrity and preventing tampering.
* **Storage Format:** Stored across three dedicated database columns: `encrypted_credentials` (base64/hex ciphertext), `encryption_iv`, and `encryption_tag`.
* **Secret Masking:** Plaintext secrets are never returned over the API. A `masked_secret` preview (e.g., `AKIA••••••••7X9A` or `X-DC-••••••••4F2B`) is generated upon creation and returned for display purposes.

### 4.3 Zero-Trust Satellite Gateway Protocol (Outbound-Only mTLS)
The Satellite Gateway is deployed inside the customer's private network (AWS VPC, on-prem VMware, or bare-metal):
* **No Open Inbound Ports:** The gateway initiates all connections **outbound** over HTTPS/mTLS (port 443). Firewalls can block all incoming traffic.
* **Mutual TLS (mTLS) Authentication:** During enrollment, a single-use token is exchanged for an X.509 client certificate signed by the platform's internal CA.
* **Command Lease & Dispatch:** Every 30 seconds, the gateway transmits a heartbeat and claims pending deployment commands. Commands are cryptographically signed with HMAC-SHA256.
* **Zero Downtime Graceful Reload:** Upon receiving a renewed certificate bundle, the daemon writes the `.crt` and `.key` files to `/etc/ssl/` and executes a graceful service reload (`nginx -s reload` or `systemctl reload apache2`), preserving in-flight HTTP connections.

---

## 5. Page-by-Page & Field-by-Field Complete UI/UX Specification

### Screen 1: Tenant Workspace Registration & Onboarding
* **Route:** `/register` or `/auth?mode=signup`
* **Purpose:** Initial onboarding of enterprise tenant organization and root administrator.

| Field Label | Input Type | Validation Rules | Database Destination | Description & Security Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Company Legal Name** | Text Input | Required, 2–100 chars | `tenants.name` & `tenants.settings.orgMetadata.organizationName` | Sets organization name; forms the X.509 Certificate Subject Organization ($O$). |
| **Workspace URL Slug** | Text Input | Required, lowercase alphanumeric + hyphens | `tenants.slug` | Unique vanity subdomain and multi-tenant identifier. |
| **Administrator Work Email** | Email Input | Required, valid corporate email format | `users.email` | Primary root administrator login and CA contact address. |
| **First Name** | Text Input | Required, 1–50 chars | `users.first_name` | Administrator display identity. |
| **Last Name** | Text Input | Optional, 1–50 chars | `users.last_name` | Administrator display identity. |
| **Password** | Password Input | Min 8 chars, 1 uppercase, 1 digit, 1 special char | `users.password_hash` (Argon2id) | Hashed using **Argon2id** (64MB memory cost, 3 iterations) before insertion. |
| **Cloud Marketplace Channel**| Dropdown | `DIRECT`, `AWS_MARKETPLACE`, `AZURE_MARKETPLACE` | `tenants.marketplace_provider` | Designates billing and procurement channel. |
| **Country Code (C)** | Text Input | Required, 2 uppercase letters (ISO 3166-1) | `tenants.settings.orgMetadata.country` | X.509 Certificate Subject Country ($C$). Defaults to `US`. |
| **State / Province (ST)** | Text Input | Optional, 2–64 chars | `tenants.settings.orgMetadata.state` | X.509 Certificate Subject State ($ST$). |
| **City / Locality (L)** | Text Input | Optional, 2–64 chars | `tenants.settings.orgMetadata.locality` | X.509 Certificate Subject Locality ($L$). |
| **Department / Unit (OU)** | Text Input | Optional, 2–64 chars | `tenants.settings.orgMetadata.department` | X.509 Organizational Unit ($OU$). Defaults to `SecOps`. |

---

### Screen 2: Super Admin Platform Control Plane
* **Route:** `http://localhost:3001` (Super Admin Portal)
* **Purpose:** Verification and approval of newly registered organizations.

| Field / Action | Component | Impacted Database Fields | System Transition & Effect |
| :--- | :--- | :--- | :--- |
| **Tenant List Table** | Data Table | Reads `tenants` join `users` | Displays Company Name, Slug, Tier, Status, Created Date, and Admin Email. |
| **Status Filter** | Pill Selector | Filters by `status` | Filters table by `PENDING_APPROVAL`, `ACTIVE`, `SUSPENDED`. |
| **"Approve Organization"** | Action Button | `tenants.status = 'ACTIVE'`, `tenants.updated_at = NOW()` | Backend issues `PATCH /api/v1/tenants/:id/status`. Unlocks customer tenant portal. |
| **"Reject Organization"** | Action Button | `tenants.status = 'REJECTED'` | Deactivates workspace; prevents login. |

---

### Screen 3: Tenant Settings → Organization Legal Profile (OV/EV)
* **Route:** `/settings?tab=general` → "Edit Organization Profile"
* **Purpose:** Manages verified legal identity required for Organization Validated (OV) and Extended Validation (EV) commercial certificates.

| Field Label | Input Type | Validation Rules | Storage Location | Cryptographic Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Legal Company Name ($O$)** | Text Input | Required, max 255 chars | `tenants.name` & `orgMetadata.organizationName` | Injected into CSR Subject: `/O=Legal Entity Name/`. |
| **Department / Division ($OU$)**| Text Input | Optional, max 100 chars | `orgMetadata.department` | Injected into CSR Subject: `/OU=Security Engineering/`. |
| **Country Code ($C$)** | Text Input | Required, exactly 2 letters | `orgMetadata.country` | Injected into CSR Subject: `/C=US/`. |
| **State / Province ($ST$)** | Text Input | Optional, max 100 chars | `orgMetadata.state` | Injected into CSR Subject: `/ST=California/`. |
| **City / Locality ($L$)** | Text Input | Optional, max 100 chars | `orgMetadata.locality` | Injected into CSR Subject: `/L=San Francisco/`. |
| **DUNS / Registry Number** | Text Input | Optional, numeric/hyphen | `orgMetadata.dunsNumber` | Transmitted to DigiCert/Sectigo API for corporate identity verification. |
| **Corporate Callback Phone** | Phone Input | Optional, E.164 format | `orgMetadata.callbackPhone` | Used by public CAs for mandatory out-of-band phone verification. |

---

### Screen 4: Tenant Settings → CA Integrations (Public & Private PKI)
* **Route:** `/settings?tab=ca-integrations` *(New Screen)*
* **Purpose:** Securely manages tenant credentials for commercial CAs and private PKIs.

| Field Label | Provider Applicability | Validation Rules | Storage Destination | Encryption / Security |
| :--- | :--- | :--- | :--- | :--- |
| **CA Provider Type** | All | `LETS_ENCRYPT`, `DIGICERT`, `SECTIGO`, `AWS_PCA`, `VAULT` | `ca_integrations.provider` | Determines backend driver adapter. |
| **Account Friendly Name** | All | Required, 2–100 chars | `ca_integrations.name` | Display label (e.g., `Production DigiCert`). |
| **CertCentral API Key** | DigiCert | Required for DigiCert | `ca_integrations.encrypted_credentials` | AES-256-GCM ciphertext. Masked as `X-DC-••••94x`. |
| **Container / Division ID** | DigiCert | Required for DigiCert | Inside encrypted JSON | Identifies corporate billing container. |
| **SCM Username / Login** | Sectigo | Required for Sectigo | Inside encrypted JSON | Authenticates with Sectigo REST API. |
| **SCM API Password / Token**| Sectigo | Required for Sectigo | Inside encrypted JSON | AES-256-GCM ciphertext. |
| **Customer URI / Code** | Sectigo | Required for Sectigo | Inside encrypted JSON | Multi-tenant customer routing parameter. |
| **EAB Key ID (MAC Key ID)** | Let's Encrypt / ZeroSSL| Optional for ACME | `ca_integrations.external_account_binding_id` | Identifies commercial ACME account. |
| **EAB HMAC Key** | Let's Encrypt / ZeroSSL| Optional for ACME | `ca_integrations.encrypted_credentials` | Cryptographic secret for signing ACME registration requests. |
| **AWS Private CA ARN** | AWS Private CA | Valid AWS ARN | Inside encrypted JSON | Identifies the PCA resource. |
| **Default CA Toggle** | All | Boolean | `ca_integrations.is_default` | When checked, pre-selects this CA in enrollment forms. |

---

### Screen 5: Tenant Settings → Cloud DNS Accounts (DCV Solvers)
* **Route:** `/settings?tab=cloud-accounts`
* **Purpose:** Stores cloud credentials for automated DNS-01 challenge completion.

| Field Label | Cloud Provider | Validation Rules | Storage Destination | Encryption / Security |
| :--- | :--- | :--- | :--- | :--- |
| **Cloud Provider** | All | `AWS`, `AZURE`, `GCP` | `cloud_accounts.provider` | Directs DNS driver selection. |
| **Account Name / Label** | All | Required, 2–100 chars | `cloud_accounts.name` | Display label (e.g., `Route53 Corporate Apex`). |
| **AWS Access Key ID** | AWS | Required for AWS Key Auth | `cloud_accounts.masked_secret` | Stored masked (e.g., `AKIA••••••••EXAMPLE`). |
| **AWS Secret Access Key** | AWS | Required for AWS Key Auth | `cloud_accounts.encrypted_credentials` | AES-256-GCM ciphertext with IV & Tag. |
| **AWS IAM Role ARN** | AWS | Required for IAM Role Auth | `cloud_accounts.aws_role_arn` | Cross-account STS `AssumeRole` target. |
| **Azure Tenant ID** | Azure | Valid GUID | `cloud_accounts.azure_tenant_id` | Identifies Azure Active Directory tenant. |
| **Azure Client ID** | Azure | Valid GUID | `cloud_accounts.azure_client_id` | Service Principal App ID. |
| **Azure Client Secret** | Azure | Required for Azure | `cloud_accounts.encrypted_credentials` | AES-256-GCM ciphertext. |
| **GCP Service Account JSON**| GCP | Valid JSON object | `cloud_accounts.encrypted_credentials` | Encrypted service account credentials. |

---

### Screen 6: Gateways → Satellite Gateway Enrollment & Daemon
* **Route:** `/gateways` → "Enroll Satellite Gateway"
* **Purpose:** Enrolls a secure daemon in the customer's private network for zero-trust certificate installation.

| Element / Field | Type | Data / Parameter | Lifecycle Behavior |
| :--- | :--- | :--- | :--- |
| **Gateway Name** | Text Input | e.g., `us-east-prod-nginx` | Sets human-readable gateway hostname record. |
| **Target Server Type** | Dropdown | `NGINX`, `APACHE`, `POSTGRES`, `AWS_ALB`, `DOCKER` | Designates local deployment payload type. |
| **Single-Use Enrollment Token**| Generated String | e.g., `gw_sec_9f81a7b2...` | Has a 24-hour expiration window; hashed with Argon2id. |
| **One-Line Install Script** | Shell Snippet | `curl -sSL https://clm.cloud/install.sh \| bash -s -- --enroll-token <token>` | Downloads daemon, executes mTLS exchange, configures systemd. |
| **Simulate Handshake Button** | Action Button | Local Demo Mode | Triggers mock enrollment for staging environments. |

---

### Screen 7: Certificates → Dynamic Add / Enroll Modal
* **Route:** `/certificates` → "+ Add Certificate"
* **Purpose:** Core certificate enrollment interface with dynamic CA, DNS, and deployment targets.

| Field Label | Input Type | Options / Source | Target DB Field | Description & Workflow |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Domain (CN)** | Text Input | e.g., `api.fintechglobal.com` | `certificates.domain` | Common Name ($CN$) for certificate subject. |
| **Subject Alternative Names (SANs)**| Text / Tag Input| Comma-separated domains | `certificates.sans` (PostgreSQL `TEXT[]`) | Extended domains covered by certificate. |
| **CA Issuer (Dynamic)** | Dropdown | Populated from active `ca_integrations` | `certificates.issuer` & `ca_integration_id` | Dynamically selects CA account. |
| **Key Algorithm** | Dropdown | `RSA_2048`, `RSA_4096`, `ECDSA_P256`, `ECDSA_P384` | `certificates.key_algorithm` | Cryptographic algorithm for keypair generation. |
| **Validation Route (DCV)** | Dropdown | Connected Cloud DNS Accounts | Injected into order payload | Selects Route53/Azure/GCP account for DNS-01 TXT record. |
| **Deployment Destination** | Dropdown | Enrolled Gateways / Cloud ALBs | `certificates.gateway_id` | Specifies target server to receive renewed certificates. |
| **Validity Profile** | Radio Group | `90 Days`, `30 Days`, `7 Days`, `24 Hours` | Determines `not_after` calculation | Enforces certificate lifespan policy. |
| **Autonomous Renewal Toggle**| Checkbox | Checked by default (`true`) | `certificates.auto_renew` | Activates background renewal watchdog. |
| **Renewal Threshold** | Number Input | Default: `30 days` before expiry | `certificates.renew_before_days` | Watchdog trigger window. |

---

### Screen 8: Satellite Gateway Local Console & Webhook Dispatch
* **Route:** `http://localhost:8080` (Hosted locally by the Satellite Gateway)
* **Purpose:** Edge management interface providing visibility into local certificate installations, system resources, and command history.

| Dashboard Card | Data Displayed | Update Frequency | Source |
| :--- | :--- | :--- | :--- |
| **Gateway Status** | `ONLINE (Healthy)` badge with green pulse | Real-time | Local daemon loop. |
| **Gateway UUID** | e.g., `89c3aa16-2ca8-49f7-8090-7cc054c2b17b` | Static | Configuration file (`satellite.yaml`). |
| **Control Plane Endpoint** | `https://clm.cloud/api/v1` | Static | Gateway bootstrap parameter. |
| **Last Beacon ACK** | Timestamp (e.g., `11:42:15 AM`) | Every 30 seconds | Response from `/ingress/gateway/heartbeat`. |
| **Installed Certificates Table**| Domain, Issuer, Validity Days, Key Specs | On-demand / After reload | Scans `/etc/ssl/certs/`. |
| **Immediate Beacon Button** | Interactive Action | User click | Forces an immediate outbound heartbeat and command pull. |

---

## 6. End-to-End Real-World Customer Journey (The FinTech / HealthTech Story)

To illustrate the platform's operational workflow, consider **FinTech Global Inc.**, a regulated banking and healthcare payment API provider securing their mission-critical endpoint: `api.fintechglobal.com`.

### The Infrastructure:
* **The Endpoint:** `api.fintechglobal.com` (Serves banking APIs and HIPAA-regulated payment logs).
* **The Server:** Ubuntu 24.04 LTS instance running NGINX inside a private AWS VPC (`10.0.0.0/16`) with **zero inbound internet ports**.
* **The DNS Provider:** **AWS Route53** managing apex domain `fintechglobal.com`.
* **The CA:** Corporate **DigiCert CertCentral** account for public trust, with fallback to **Let's Encrypt**.

---

### Act 1: Tenant Registration & Admin Approval
1. FinTech Global's Security Architect navigates to `https://clm.cloud/register`.
2. Completes the form with Company Name (`FinTech Global Inc.`), Work Email (`security@fintechglobal.com`), and Administrator Password.
3. Selects `US` for Country and `SecOps` for Department.
4. Clicks **"Create Organization"**. The backend inserts a tenant record with status `PENDING_APPROVAL`.
5. The CLM Super Admin opens the Control Plane (`http://localhost:3001`), verifies FinTech Global's business credentials, and clicks **"Approve Organization"**.
6. FinTech Global's portal unlocks instantly.

---

### Act 2: Organization Identity & CA Account Linking
1. FinTech Global opens **Tenant Settings → Organization Profile**:
   * Legal Name: `FinTech Global Inc.`
   * Department: `Financial Infrastructure Security`
   * Country: `US`, State: `California`, Locality: `San Francisco`
   * DUNS Number: `08-123-4567`
   * Callback Phone: `+1-415-555-0199`
2. Navigates to **Settings → CA Integrations**:
   * Clicks **"+ Add CA Integration"**.
   * Provider: `DigiCert CertCentral`.
   * Account Name: `Corporate CertCentral Master`.
   * API Key: Enters developer key `X-DC-DEVKEY-89417284910248`.
   * Clicks **"Save & Encrypt Credentials"**.
   * Backend encrypts the API key with AES-256-GCM and stores the ciphertext alongside IV and Tag in `ca_integrations`.

---

### Act 3: Route53 Cloud DNS Provider Enrollment
1. Navigates to **Settings → Cloud Providers**:
   * Clicks **"+ Connect Cloud Account"**.
   * Provider: `AWS (Amazon Web Services)`.
   * Name: `FinTech Route53 Production`.
   * Region: `us-east-1`.
   * Enters least-privilege IAM credentials (`AKIAIOSFODNN7EXAMPLE` and Secret Key).
   * Clicks **"Save & Encrypt"**. Stored securely with AES-256-GCM.

---

### Act 4: Zero-Trust Gateway Deployment in VPC
1. Navigates to **Gateways** → Clicks **"Enroll Satellite Gateway"**.
2. Names the gateway `us-east-vpc-nginx` and selects target `NGINX`.
3. Copies the one-line installer command containing the single-use enrollment token:
   ```bash
   curl -sSL https://clm.cloud/install.sh | sudo bash -s -- --enroll-token gw_sec_8f91a7b2049c4e21
   ```
4. Executes the command on the internal NGINX server via AWS SSM Session Manager.
5. The gateway initializes, dials outbound over TLS port 443, exchanges its token for an mTLS client certificate, and emits its first heartbeat.
6. The CLM dashboard updates status to **`ONLINE (Healthy)`**.

---

### Act 5: Certificate Issuance & Automated DNS-01 Verification
1. FinTech Global opens **Certificates** → Clicks **"+ Add Certificate"**.
2. Enters:
   * **Primary Domain:** `api.fintechglobal.com`
   * **SANs:** `pay.fintechglobal.com`
   * **CA Issuer:** Selects `DigiCert CertCentral (Corporate CertCentral Master)`.
   * **Key Algorithm:** `RSA 2048`.
   * **Validation Route:** `AWS Route53 (FinTech Route53 Production)`.
   * **Deployment Destination:** `Satellite Gateway: us-east-vpc-nginx`.
   * **Autonomous Renewal:** Checked (`true`), 30-day window.
3. Clicks **"Save & Track"**.

#### Under the Hood Cryptographic Sequence:
```mermaid
sequenceDiagram
    autonumber
    actor DevOps as FinTech DevOps
    participant SaaS as CLM SaaS Control Plane
    participant AWS as AWS Route53 API
    participant CA as DigiCert API / Let's Encrypt
    participant GW as Satellite Gateway (Private VPC)

    DevOps->>SaaS: Click "Save & Track" (api.fintechglobal.com)
    Note over SaaS: 1. Generate RSA 2048 Key Pair<br/>2. Inject OV Org Profile into CSR<br/>3. Decrypt stored DigiCert API Key (AES-256-GCM)
    SaaS->>CA: POST /order/certificate (CSR + Domain)
    CA-->>SaaS: Returns Order ID + DNS-01 Token<br/>TXT: _acme-challenge.api.fintechglobal.com
    
    Note over SaaS: Decrypt stored AWS IAM Secret Key (AES-256-GCM)
    SaaS->>AWS: Route53: ChangeResourceRecordSets(UPSERT TXT)
    AWS-->>SaaS: Record In Sync (Global DNS Propagated)
    
    SaaS->>CA: Submit Challenge Ready Proof
    Note over CA: CA resolves TXT record globally.<br/>Verifies Domain Control (DCV PASSED).
    CA-->>SaaS: Order Approved! Returns Signed X.509 Certificate Chain

    SaaS->>AWS: Route53: ChangeResourceRecordSets(DELETE TXT)
    Note over SaaS: Encrypt Certificate & Key Bundle<br/>Sign Dispatch Command (HMAC-SHA256)
    
    GW->>SaaS: Outbound Heartbeat Poll (Port 443 mTLS)
    SaaS-->>GW: Delivers Signed DEPLOY_CERT Command
    Note over GW: 1. Verify HMAC Signature<br/>2. Write /etc/ssl/certs/api.fintechglobal.com.crt<br/>3. Write /etc/ssl/private/api.fintechglobal.com.key<br/>4. Execute: nginx -s reload (Zero Downtime)
    GW->>SaaS: POST /ingress/gateway/command-ack (SUCCESS)
    SaaS-->>DevOps: UI Banner: Certificate Issued & Deployed (Active - 90 Days)
```

---

### Act 6: Autonomous 30-Day Watchdog & Graceful NGINX Reload
FinTech Global requires zero ongoing human maintenance:
1. **Continuous Monitoring:** Every 30 seconds, `LifecycleSchedulerService` evaluates certificate expiration dates.
2. **Day 60 (30 Days Remaining):**
   * The scheduler detects `daysRemaining <= 30` and `autoRenew == true`.
   * Logs audit event: `AuditAction.CERT_RENEW_SCHEDULED`.
3. **Automated Issuance Cycle:**
   * Generates a fresh RSA 2048 keypair and CSR.
   * Places DNS-01 TXT record in Route53, orders renewed certificate from DigiCert, and cleans up the DNS record.
4. **Zero-Downtime Deployment:**
   * Delivers renewed certificate payload to `us-east-vpc-nginx` over mTLS.
   * Gateway writes new files to `/etc/ssl/` and reloads NGINX (`nginx -s reload`). Existing HTTP connections remain uninterrupted.
5. **Security Notification:**
   * Automated email sent to `security@fintechglobal.com`:  
     `"Notice: Certificate for api.fintechglobal.com was autonomously renewed for 90 days. Zero human intervention was required."`

---

## 7. Step-by-Step Implementation Roadmap

```
Step 1: CA Integrations Module (PostgreSQL Schema, AES-256-GCM, NestJS CRUD, Settings UI)
   │
   ▼
Step 2: Dynamic Certificate Enrollment Modal (Dynamic CAs, Cloud DNS & Target Selectors)
   │
   ▼
Step 3: Organization Profile CSR Injection (Integrate merged Org Profile with PKCS#10 CSR)
   │
   ▼
Step 4: Commercial CA REST Drivers (DigiCert & Sectigo) & Live Azure/GCP Cloud DNS Updates
   │
   ▼
Step 5: End-to-End Autonomous Renewal Loop (Scheduler + DNS-01 + mTLS Gateway Deployment)
```

### Next Immediate Action:
Proceed with **Step 1: CA Integrations Module**:
1. Run SQL migration to create `ca_integrations` table with PostgreSQL Row-Level Security.
2. Implement `CaIntegrationsRepository`, `CaIntegrationsService`, and `CaIntegrationsController` in NestJS.
3. Expose API client methods in `packages/api-client`.
4. Build the "CA Integrations" tab in Tenant Portal Settings with credential encryption and secret masking.

