# Certificate Lifecycle Management (CLM): CA Integrations & Autonomous Renewal Specification

> **Document Type:** Feature Specification, Gap Analysis & Market Benchmark  
> **Target System:** CLM Platform (`clm-platform`)  
> **Status:** APPROVED FOR IMPLEMENTATION  
> **Date:** November 2026  

---

## Table of Contents
1. [Executive Summary & Core Objectives](#1-executive-summary--core-objectives)
2. [Identified Gaps in Current Implementation](#2-identified-gaps-in-current-implementation)
3. [Required Data Fields & UI Screen Specifications](#3-required-data-fields--ui-screen-specifications)
   - [3.1 Settings: CA Integrations (New Screen)](#31-settings-ca-integrations-new-screen)
   - [3.2 Settings: Extended Organization Profile (OV/EV Support)](#32-settings-extended-organization-profile-ovev-support)
   - [3.3 Certificate Enrollment / Add Modal (Refactored Option 1)](#33-certificate-enrollment--add-modal-refactored-option-1)
4. [Backend Architecture & Database Schema Additions](#4-backend-architecture--database-schema-additions)
   - [4.1 PostgreSQL Schema for `ca_integrations`](#41-postgresql-schema-for-ca_integrations)
   - [4.2 CA Driver Interface & Provider Adapters](#42-ca-driver-interface--provider-adapters)
5. [The Three Certificate Ingestion Models: Private Key & Renewal Flow](#5-the-three-certificate-ingestion-models-private-key--renewal-flow)
6. [Market Landscape & Competitor Analysis](#6-market-landscape--competitor-analysis)
   - [6.1 Major Market Players (Venafi, AppViewX, Keyfactor, DigiCert, Sectigo)](#61-major-market-players)
   - [6.2 Comparison Matrix: Existing Solutions vs. Our CLM Platform](#62-comparison-matrix)
   - [6.3 Our Strategic Competitive Advantages](#63-our-strategic-competitive-advantages)

---

## 1. Executive Summary & Core Objectives

In enterprise environments, SSL/TLS certificate outages cause millions of dollars in downtime. Modern Certificate Lifecycle Management (CLM) software exists to automate discovery, issuance, automated DNS validation, renewal, and installation across hybrid infrastructures.

To achieve **100% zero-touch autonomous renewal**, a certificate record cannot simply store domain text and hardcoded CA labels. The platform must know:
1. **Which CA** will issue the certificate (via real authenticated API keys).
2. **Which DNS Provider** will solve the DCV challenge (e.g. AWS Route53, Azure DNS, Cloudflare).
3. **Where the Private Key lives** (generated securely in CLM, inside an enrolled VPC gateway, or in cloud KMS).
4. **Where to deploy** the renewed certificate (target web server, ALB, or Kubernetes ingress).

---

## 2. Identified Gaps in Current Implementation

| Component | Current State | Target Enterprise State |
| :--- | :--- | :--- |
| **CA Accounts in Settings** | ❌ None. Only Cloud Providers exists. | Dedicated **Settings → CA Integrations** tab storing AES-256-GCM encrypted API keys for DigiCert, Sectigo, GlobalSign, and ACME EAB credentials. |
| **CA Dropdown in Add Modal** | ❌ Hardcoded static HTML `<option>` list in `App.tsx` (`lines 3930-3936`). | Dynamic dropdown querying `GET /api/v1/ca-integrations` (active tenant CAs + Let's Encrypt). |
| **Validation / DCV Selector** | ❌ Missing in Add Modal. Assumes DNS_01 without choosing the DNS account. | Dropdown in Add Modal to select connected Route53 / Azure DNS / Cloudflare zone. |
| **Target Deployment Selector** | ❌ Missing in Add Modal. Blindly picks `gateways[0]?.id`. | Radio/Dropdown to choose target Gateway daemon, AWS ALB/CloudFront, or Monitor-Only. |
| **Commercial CA Drivers** | ❌ Missing. Only ACME client (`ca-driver.service.ts`) has code. | Modular REST adapters for DigiCert CertCentral, Sectigo SCM, GlobalSign Atlas, and AWS Private CA. |
| **Organization Identity** | ⚠️ Basic signup name/email stored; no UI for Street, City, State, DUNS. | Dedicated **Settings → Organization Profile** editor to manage OV/EV subject data. |

---

## 3. Required Data Fields & UI Screen Specifications

### 3.1 Settings: CA Integrations (New Screen)
Located under **Tenant Settings → CA Integrations**:

```
+-----------------------------------------------------------------------------------+
|  CA Integrations (Public Commercial & Private PKI)                [+ Add CA Account] |
+-----------------------------------------------------------------------------------+
|  Provider       Account Name        Status       Credentials Masked     Default?   |
|  -------------------------------------------------------------------------------- |
|  Let's Encrypt  ACME Production     ACTIVE       Auto (Zero-Config)      [ YES ]   |
|  DigiCert       Corporate CertCent  ACTIVE       X-DC-DEVKEY-***94x      [ Set ]   |
|  AWS PCA        Internal VPC PKI    ACTIVE       arn:aws:acm-pca:...     [ Set ]   |
+-----------------------------------------------------------------------------------+
```

#### Fields to Collect on "Add CA Integration" Modal:
* **CA Provider:** `[ DigiCert | Sectigo | GlobalSign | AWS Private CA | HashiCorp Vault | Custom ACME / ZeroSSL ]`
* **Account Name:** Friendly label (e.g., `Production CertCentral`)
* **API Credentials:**
  * *DigiCert:* `API Key` (CertCentral Developer Key), `Container ID / Organization ID`
  * *Sectigo:* `Login / Username`, `Password / API Token`, `Customer URI`
  * *GlobalSign:* `API Key`, `API Secret`
  * *AWS Private CA:* Select connected AWS Cloud Account + `PCA ARN`
  * *ACME / ZeroSSL:* `EAB Key ID`, `EAB HMAC Key` (for commercial ACME accounts)

---

### 3.2 Settings: Extended Organization Profile (OV/EV Support)
Located under **Tenant Settings → Organization Profile**:
* **Legal Organization Name ($O$):** e.g., `Acme Global Technologies Inc.`
* **Organizational Unit / Division ($OU$):** e.g., `Infrastructure Security`
* **DUNS Number / Corporate Registry ID:** e.g., `12-345-6789`
* **Country Code ($C$):** 2-letter ISO (e.g., `US`, `IN`, `GB`)
* **State / Province ($ST$):** e.g., `California`
* **Locality / City ($L$):** e.g., `San Francisco`
* **Postal Code:** e.g., `94105`
* **Administrative Contact:** Name, Title, Work Email, Verified Phone (required for CA phone callback verification).

---

### 3.3 Certificate Enrollment / Add Modal (Refactored Option 1)
Replacing the hardcoded form with dynamic enterprise fields:

1. **Domain & Alt Names:**
   * Primary FQDN (e.g., `checkout.acme.com`)
   * Subject Alternative Names (SANs) (comma-separated or tag list)
2. **CA Account (Dynamic):**
   * Dropdown populated from active tenant CA integrations:
     * `Let's Encrypt (Automated ACME - Free)`
     * `DigiCert CertCentral (Corporate Account)`
     * `AWS Private CA (Internal PKI)`
3. **Key Algorithm & Specs:**
   * `RSA 2048`, `RSA 4096`, `ECDSA P-256`, `ECDSA P-384`
4. **Domain Control Validation (DCV) Route:**
   * `[ AWS Route53 (Primary Cloud DNS) ]`
   * `[ Azure DNS (Cloud Account: Azure-Prod) ]`
   * `[ HTTP-01 Webroot (Via Satellite Gateway) ]`
   * `[ Manual DNS Verification (Alert user with TXT token) ]`
5. **Deployment Destination (Target):**
   * `[ Satellite Gateway: us-east-prod-nginx (VPC-01) ]`
   * `[ Cloud Target: AWS Application Load Balancer ]`
   * `[ Cloud Target: CloudFront Distribution ]`
   * `[ Certificate Vault Only (Download / API pull only) ]`
6. **Autonomous Lifecycle Options:**
   * Auto-Renew Toggle: `[ Checked by default ]`
   * Renew Before Days: `30 days` (standard) / `7 days` (ephemeral)

---

## 4. Backend Architecture & Database Schema Additions

### 4.1 PostgreSQL Schema for `ca_integrations`

```sql
CREATE TABLE IF NOT EXISTS ca_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider VARCHAR(64) NOT NULL, -- 'LETS_ENCRYPT', 'DIGICERT', 'SECTIGO', 'AWS_PCA', 'VAULT'
  name VARCHAR(255) NOT NULL,
  encrypted_credentials TEXT, -- AES-256-GCM ciphertext
  encryption_iv VARCHAR(64),
  encryption_tag VARCHAR(64),
  account_email VARCHAR(255),
  external_account_binding_id VARCHAR(255),
  is_default BOOLEAN DEFAULT FALSE,
  status VARCHAR(32) DEFAULT 'ACTIVE', -- 'ACTIVE', 'REVOKED', 'ERROR'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row-Level Security
ALTER TABLE ca_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY ca_integrations_isolation ON ca_integrations
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

### 4.2 Modular CA Driver Architecture

```
                  ┌───────────────────────────────┐
                  │       CaDriverService         │
                  └──────────────┬────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   AcmeDriver     │   │  DigiCertDriver  │   │   SectigoDriver  │
│ (Let's Encrypt / │   │ (CertCentral REST│   │  (SCM REST API)  │
│    ZeroSSL)      │   │       API)       │   │                  │
└──────────────────┘   └──────────────────┘   └──────────────────┘
```

---

## 5. The Three Certificate Ingestion Models: Private Key & Renewal Flow

| Feature | Model 1: Direct Ingestion in CLM | Model 2: Cloud Import (AWS/Azure/GCP) | Model 3: Satellite Gateway (VPC) |
| :--- | :--- | :--- | :--- |
| **Ingestion Point** | CLM Tenant Portal Form | Cloud Provider API Sync (Route53/ACM/KeyVault) | Daemon installed in customer VPC |
| **Private Key Location** | Stored in CLM (AES-256-GCM encrypted in DB) | Managed inside AWS KMS / HSM (Unexportable) | Created & kept on customer server/gateway |
| **Can renew without Private Key?** | **NO** — CLM generates fresh key pair + CSR | **YES** — AWS ACM handles KMS key internally | **YES** — Gateway creates key locally, sends only CSR |
| **Domain Validation** | DNS-01 via connected cloud account | Cloud-native DNS validation (Route53) | DNS-01 via cloud API or HTTP-01 via Gateway port 80 |
| **Deployment** | Pushed to selected Gateway or Cloud ALB | Auto-bound to AWS ALB / CloudFront | Written to `/etc/ssl/` + reload command (`nginx -s reload`) |

---

## 6. Market Landscape & Competitor Analysis

### 6.1 Major Market Players

#### 1. Venafi (Acquired by CyberArk)
* **Profile:** The undisputed 800-lb enterprise gorilla in machine identity management.
* **Target Audience:** Fortune 500 banks, defense contractors, massive enterprises.
* **Strengths:** Unmatched enterprise integrations (every hardware HSM, legacy CA, Microsoft AD CS, F5 BIG-IP, Infoblox).
* **Weaknesses:** Extremely complex, millions of dollars in annual licensing, requires dedicated professional services teams to deploy and maintain on-prem orchestrators.

#### 2. AppViewX (AppViewX CERT+)
* **Profile:** High-end enterprise automation platform for certificates, keys, and ADC (Application Delivery Controllers).
* **Strengths:** Excellent multi-cloud discovery, automated zero-touch workflows, strong integrations with F5, Citrix ADC, and public CAs.
* **Weaknesses:** Heavy enterprise pricing (per-cert pricing model starting at $15k–$50k/year minimums), steep learning curve.

#### 3. Keyfactor (Command & EJBCA)
* **Profile:** Market leader combining a commercial CLM platform (Keyfactor Command) with their own open-source/enterprise PKI (EJBCA).
* **Strengths:** Native private PKI engine, extensive cloud integrations, strong developer adoption.
* **Weaknesses:** Split ecosystem between open-source EJBCA and expensive proprietary Command platform.

#### 4. CA-Native Platforms (DigiCert Trust Lifecycle Manager & Sectigo Certificate Manager)
* **Profile:** Built directly by the Certificate Authorities themselves to lock in certificate purchasing.
* **Strengths:** 1-click issuance from their own CA, pre-validated organization profiles.
* **Weaknesses:** Vendor lock-in. While they now support discovery of other CAs, they prioritize selling their own high-margin public certificates.

#### 5. Open-Source / Developer Tools (cert-manager & Smallstep)
* **cert-manager (Jetpack.io):** The defacto standard for Kubernetes clusters (ACME, Vault, self-signed). Focuses strictly on K8s; poor support for non-Kubernetes enterprise servers, legacy VMs, or AWS ALBs.
* **Smallstep:** Modern open-source CLI and lightweight step-ca for dev teams. Great for microservices and internal mesh; less oriented around commercial CA procurement or cloud marketplace billing.

---

### 6.2 Comparison Matrix

| Feature / Capability | Venafi / AppViewX | CA Platforms (DigiCert/Sectigo) | cert-manager | **Our CLM Platform (`clm-platform`)** |
| :--- | :--- | :--- | :--- | :--- |
| **Deployment Model** | Heavy On-Prem / Hybrid | Cloud SaaS | K8s In-Cluster Operator | **Lightweight SaaS Control Plane + Go Satellite Daemon** |
| **Marketplace Native (AWS/Azure/GCP)**| ❌ Complex custom contracts | ❌ Enterprise direct sales | ❌ Open source | ✅ **1-Click AWS/Azure/GCP SaaS Marketplace Ingestion & Billing** |
| **Multi-Tenancy & Isolation** | Single-tenant or custom RBAC | Multi-user per account | Namespace-based | ✅ **PostgreSQL Kernel-Level Row-Level Security (RLS)** |
| **VPC Satellite Gateway** | Complex heavy agents | Windows/Linux agents | Kubernetes pod only | ✅ **Single Go static binary (<25MB), zero runtime deps, mTLS outbound** |
| **Pricing Accessibility** | $50,000+ / year enterprise floor | $5,000+ / year enterprise contracts | Free OSS (No enterprise UI/SaaS) | ✅ **Free Community Tier (Let's Encrypt) to Paid Commercial Tier** |
| **Multi-CA Support** | Universal | Biased to own CA | ACME & Vault | ✅ **Neutral: Let's Encrypt, DigiCert, Sectigo, AWS PCA, Vault** |

---

### 6.3 Our Strategic Competitive Advantages

1. **Marketplace-First Commercial Engine:**
   Enterprises can procure our platform directly using their committed AWS/Azure/GCP cloud spend with automated tenant provisioning via marketplace webhook resolution.
2. **True Tenant Data Isolation (PostgreSQL RLS):**
   Unlike monolithic legacy tools where all customer data lives in single pooled tables without kernel-level guarantees, our SaaS strictly executes all queries with `SET LOCAL app.current_tenant_id = '...'`.
3. **Zero-Inbound Satellite Gateway Architecture:**
   The Go satellite daemon connects **outbound only** over port 443 via mutual TLS (mTLS). It requires zero open firewall ports into the customer's private VPC, making SecOps and compliance approval frictionless.
4. **Transparent Tiering (Community to Enterprise):**
   Small teams can use automated Let's Encrypt ACME with Route53 DNS validation for free, while enterprise customers plug in their DigiCert / Sectigo API tokens and deploy across hundreds of VPC gateways.

