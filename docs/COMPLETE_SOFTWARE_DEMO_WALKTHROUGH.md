# CLM Platform: Complete End-to-End Scenario & Interactive Software Demo Walkthrough

> **Document Type:** Master Interactive Walkthrough, Field-by-Field Specification & Cloud Mechanics  
> **Status:** OFFICIAL SYSTEM SPECIFICATION  
> **Target Audience:** DevOps Engineers, Security Leads, Architects & Product Teams  

---

## Table of Contents
1. [The Real-World Demo Scenario: FinTech Global Inc.](#1-the-real-world-demo-scenario-fintech-global-inc)
2. [Act 1: Tenant Onboarding & Super Admin Approval](#2-act-1-tenant-onboarding--super-admin-approval)
3. [Act 2: Cloud Account Connection & Route53 Setup](#3-act-2-cloud-account-connection--route53-setup)
4. [Act 3: Enrolling the Zero-Trust Satellite Gateway inside the VPC](#4-act-3-enrolling-the-zero-trust-satellite-gateway-inside-the-vpc)
5. [Act 4: Adding the Certificate (Field-by-Field Details)](#5-act-4-adding-the-certificate-field-by-field-details)
6. [Act 5: What Happens Behind the Scenes in AWS & CA (Under the Hood)](#6-act-5-what-happens-behind-the-scenes-in-aws--ca-under-the-hood)
7. [Act 6: Autonomous Renewal & Deployment Execution](#7-act-6-autonomous-renewal--deployment-execution)
8. [Summary Architecture & Data Flow Map](#8-summary-architecture--data-flow-map)

---

## 1. The Real-World Demo Scenario: FinTech Global Inc.

To understand the platform clearly, let us follow a complete real-world customer journey:

* **The Customer:** **FinTech Global Inc.** (A high-growth banking API provider).
* **The Target Asset:** Secure their core payment API: `api.fintechglobal.com`.
* **The Infrastructure:**
  * Runs on an internal Ubuntu EC2 instance running **NGINX** inside a private AWS VPC (`10.0.0.0/16`) with **zero inbound internet ports**.
  * The DNS apex domain `fintechglobal.com` is hosted on **AWS Route53** (Hosted Zone ID: `Z0123456789ABCDEF`).
* **The Goal:**
  * Self-serve onboard the organization into CLM.
  * Connect Route53 to automate Let's Encrypt DNS-01 verification.
  * Enroll the internal NGINX server via a Satellite Gateway.
  * Issue a real SSL certificate and configure **100% zero-touch 30-day autonomous renewal**.

---

## 2. Act 1: Tenant Onboarding & Super Admin Approval

### Screen 1: Tenant Sign-Up Portal (`http://localhost:3000`)
The prospective customer navigates to the customer portal login screen.

```
+-------------------------------------------------------------------------+
|                  CLM PLATFORM - CREATE WORKSPACE                        |
|                                                                         |
|  [ Company Name * ]      [ FinTech Global Inc.                     ]    |
|  [ Work Email *   ]      [ security@fintechglobal.com              ]    |
|  [ First Name *   ]      [ Sarah                                   ]    |
|  [ Last Name      ]      [ Jenkins                                 ]    |
|  [ Password *     ]      [ ••••••••••••••••                        ]    |
|  [ Cloud Platform ]      [ AWS Marketplace                         ]    |
|                                                                         |
|                       [ Create Organization ]                           |
+-------------------------------------------------------------------------+
```

#### Field-by-Field Details:
1. **Company Name:** `FinTech Global Inc.`  
   * *Purpose:* Sets the legal tenant name and becomes the default X.509 Certificate Subject Organization ($O$).
2. **Work Email:** `security@fintechglobal.com`  
   * *Purpose:* The root administrator account; also used as the CA contact email for expiration warnings.
3. **Password:** Minimum 8 characters.  
   * *Security:* Hashed using **Argon2id** (64MB memory cost, 3 iterations) before database insertion.
4. **Cloud Platform:** `AWS Marketplace`.  
   * *Purpose:* Identifies the billing channel.

#### System Transition:
* User clicks **"Create Organization"**.
* Backend provisions a new row in `tenants` with `status = 'PENDING_APPROVAL'` and `tier = 'COMMUNITY'`.
* The tenant dashboard opens with a security banner:  
  `"Workspace Locked: Organization is under security verification. Full certificate enrollment will unlock upon admin review."`

---

### Screen 2: Super Admin Control Plane (`http://localhost:3001`)
The platform owner (Super Admin) verifies and approves the organization.

1. Navigate to **Tenants** in the left sidebar.
2. Locate the row: `FinTech Global Inc.` (Status: `PENDING_APPROVAL`, Tier: `COMMUNITY`).
3. Click the **"Approve Tenant"** button.
4. *Behind the Scenes:* Backend issues `PATCH /api/v1/tenants/:id/status` with `status: ACTIVE`.
5. *Result:* FinTech Global refreshes their browser; all tabs (Certificates, Gateways, Settings) are now fully unlocked.

---

## 3. Act 2: Cloud Account Connection & Route53 Setup

To automate Domain Validation (DCV) without manual DNS editing, FinTech Global links their AWS Route53 account.

### Screen 3: Tenant Portal → Settings → Cloud Providers
1. Click **Settings** in the left sidebar → Select the **Cloud Providers** tab.
2. Click the **"+ Connect Cloud Account"** button.

```
+-------------------------------------------------------------------------+
|                      CONNECT CLOUD ACCOUNT                              |
|                                                                         |
|  [ Cloud Provider *  ]   [ AWS (Amazon Web Services)        ▼ ]         |
|  [ Account Label *   ]   [ AWS Route53 Production DNS         ]         |
|  [ AWS Region *      ]   [ us-east-1                        ▼ ]         |
|  [ AWS Access Key ID ]   [ AKIAIOSFODNN7EXAMPLE               ]         |
|  [ Secret Access Key ]   [ wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMP]         |
|                                                                         |
|                     [ Save & Encrypt Credentials ]                      |
+-------------------------------------------------------------------------+
```

#### Where Does FinTech Global Get These AWS Details?
* Inside their **AWS Management Console**:
  1. Open **IAM (Identity & Access Management)** $\rightarrow$ **Users** $\rightarrow$ **Create User** (e.g., `clm-route53-automation`).
  2. Attach an IAM policy granting least-privilege DNS access:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": [
             "route53:ListHostedZonesByName",
             "route53:GetChange",
             "route53:ChangeResourceRecordSets"
           ],
           "Resource": "*"
         }
       ]
     }
     ```
  3. Under **Security Credentials**, generate an **Access Key ID** and **Secret Access Key**.

#### System Transition:
* When FinTech Global clicks **"Save & Encrypt Credentials"**:
  * The backend calls `CryptoService.encryptAes256Gcm()`.
  * The Secret Access Key is transformed into ciphertext with a 96-bit initialization vector ($IV$) and auth tag ($TAG$).
  * The raw secret is **never stored in plaintext** in the database.
  * The card appears in the list: `AWS Route53 Production DNS (AKIA************PLE) - Connected`.

---

## 4. Act 3: Enrolling the Zero-Trust Satellite Gateway inside the VPC

FinTech Global's payment API server lives inside a private VPC with no public inbound IP. To install certificates automatically, they enroll a Satellite Gateway.

### Screen 4: Tenant Portal → Gateways → Enroll Satellite Gateway
1. Click **Gateways** in the left sidebar $\rightarrow$ Click **"Enroll Satellite Gateway"**.

```
+-------------------------------------------------------------------------+
|                  ENROLL SATELLITE GATEWAY DAEMON                        |
|                                                                         |
|  Zero-trust satellite daemon executing inside your VPC.                 |
|  Outbound-only communication over Port 443 (Zero open inbound ports).   |
|                                                                         |
|  [ Gateway Name *    ]   [ us-east-vpc-nginx                  ]         |
|  [ Target Server     ]   [ NGINX Web Server                 ▼ ]         |
|                                                                         |
|  Run this on your private server:                                       |
|  ┌───────────────────────────────────────────────────────────────────┐  |
|  │ curl -sSL https://clm.cloud/install.sh | bash -s --               │  |
|  │   --enroll-token gw_sec_9f81a7b2049c4e21...                       │  |
|  └───────────────────────────────────────────────────────────────────┘  |
|                                                                         |
|  (Or for local demo testing, click "Simulate Outbound Handshake")       |
+-------------------------------------------------------------------------+
```

#### What Happens on the Customer's Server:
1. The server runs the command (or `node apps/gateway/runner.js`).
2. The daemon dials **outbound** to the CLM platform over TLS (`https://clm.cloud/api/v1/gateways/ingress/handshake`).
3. It presents the single-use enrollment token.
4. The platform validates the token and exchanges it for a **mutual TLS (mTLS) client certificate**.
5. Every 30 seconds, the gateway sends a lightweight heartbeat reporting CPU, memory, and local SSL health.
6. **Result in UI:** The gateway row instantly flips from `PROVISIONING` $\rightarrow$ `ONLINE (Healthy)`.

---

## 5. Act 4: Adding the Certificate (Field-by-Field Details)

Now FinTech Global requests the SSL certificate for their payment API.

### Screen 5: Tenant Portal → Certificates → Add / Discover SSL Certificate
1. Click **Certificates** in the left sidebar $\rightarrow$ Click **"+ Add Certificate"**.
2. Select the **"Issue Managed / Private PKI"** tab.

```
+-------------------------------------------------------------------------+
|                    ADD / DISCOVER SSL CERTIFICATE                       |
|                                                                         |
|  [ PRIMARY DOMAIN *    ] [ api.fintechglobal.com                      ] |
|  [ SANS (COMMA-SEP)    ] [ api.fintechglobal.com, pay.fintechglobal.com] |
|                                                                         |
|  [ CA ISSUER *         ] [ Let's Encrypt (Automated ACME)           ▼ ] |
|  [ KEY ALGORITHM *     ] [ RSA 2048                                 ▼ ] |
|  [ VALIDATION ROUTE *  ] [ AWS Route53 (AWS Route53 Production DNS) ▼ ] |
|  [ DEPLOYMENT TARGET * ] [ Satellite Gateway: us-east-vpc-nginx     ▼ ] |
|                                                                         |
|  VALIDITY PROFILE:                                                      |
|  [ (•) 90 Days (Public CAB) ]   [ 30 Days ]   [ 7 Days ]   [ 24 Hours ] |
|                                                                         |
|  [✔] Enable Autonomous Zero-Touch Renewal (30 Days Before Expiry)       |
|                                                                         |
|                     [ Cancel ]    [ Save & Track (90 Days) ]            |
+-------------------------------------------------------------------------+
```

#### Field-by-Field Breakdown:
1. **Primary Domain:** `api.fintechglobal.com` (The Common Name $CN$).
2. **Subject Alternative Names (SANs):** `pay.fintechglobal.com` (Ensures both subdomains are covered in one certificate).
3. **CA Issuer:** `Let's Encrypt (Automated ACME)` (Free automated public CA).
4. **Key Algorithm:** `RSA 2048` (Industry standard high-compatibility public key encryption).
5. **Validation Route:** `AWS Route53 Production DNS` (The AWS account connected in Act 2).
6. **Deployment Target:** `Satellite Gateway: us-east-vpc-nginx` (The VPC server enrolled in Act 3).
7. **Autonomous Renewal:** Checked (`true`), with threshold set to `30 days`.

---

## 6. Act 5: What Happens Behind the Scenes in AWS & CA (Under the Hood)

This is the exact cryptographic and cloud sequence executed when the user clicks **"Save & Track"**:

```mermaid
sequenceDiagram
    autonumber
    actor User as DevOps User
    participant CLM as CLM Backend Core
    participant AWS as AWS Route53 API
    participant CA as Let's Encrypt (ACME)
    participant GW as Satellite Gateway (VPC)

    User->>CLM: Click "Save & Track" (api.fintechglobal.com)
    Note over CLM: 1. Generate RSA 2048 Key Pair<br/>2. Build PKCS#10 CSR with SANs
    CLM->>CA: POST /acme/new-order (api.fintechglobal.com)
    CA-->>CLM: Returns DNS-01 Challenge<br/>TXT Name: _acme-challenge.api.fintechglobal.com<br/>TXT Value: 43nf89w4yn98y24y... (keyAuth)
    
    Note over CLM: Decrypt stored AWS IAM Secret Key (AES-256-GCM)
    CLM->>AWS: ListHostedZonesByName(DNSName="fintechglobal.com.")
    AWS-->>CLM: Found Zone ID: Z0123456789ABCDEF
    
    CLM->>AWS: ChangeResourceRecordSets(Action="UPSERT", TXT="_acme-challenge...", Value="43nf89...")
    AWS-->>CLM: ChangeStatus: INSYNC (Record Live)

    CLM->>CA: POST /acme/challenge/ready (Challenge Complete)
    Note over CA: Let's Encrypt queries 8 global DNS root resolvers<br/>Verifies TXT record exists
    CA-->>CLM: Validation PASSED! Order Status: VALID

    CLM->>CA: POST /acme/finalize (Submit PKCS#10 CSR)
    CA-->>CLM: Returns Signed X.509 Certificate (.crt chain)

    CLM->>AWS: ChangeResourceRecordSets(Action="DELETE", TXT="_acme-challenge...")
    AWS-->>CLM: TXT Record Removed Cleanly

    Note over CLM: Package Certificate + Private Key<br/>Sign Dispatch Command with HMAC-SHA256
    CLM->>GW: Dispatch Deploy Command via mTLS Channel
    Note over GW: 1. Write /etc/ssl/certs/api.fintechglobal.com.crt<br/>2. Write /etc/ssl/private/api.fintechglobal.com.key<br/>3. Execute: nginx -s reload
    GW-->>CLM: ACK: Deployed Successfully (HTTP 200 OK)

    CLM-->>User: Toast Notification: Certificate Issued & Deployed (90 Days Valid)
```

---

## 7. Act 6: Autonomous Renewal & Deployment Execution

FinTech Global never has to touch this certificate again. Here is how the autonomous watchdog guarantees zero downtime:

```
Timeline: Day 0                                                Day 60 (30 Days Left)         Day 90
───────────┼─────────────────────────────────────────────────────────────┼─────────────────────┼───►
      Issued: 90 Days Validity                                 Watchdog Triggers:       Original Expiry
                                                               Auto-Renew Loop           (Already Replaced)
```

1. **Every 30 Seconds:** The CLM background scheduler (`LifecycleSchedulerService`) queries all active certificates.
2. **On Day 60 (30 Days Remaining):**
   * The scheduler detects `daysRemaining <= 30` and `autoRenew == true`.
   * It creates an audit log entry: `AuditAction.CERT_RENEW_SCHEDULED`.
3. **Execution:**
   * It automatically repeats **Act 5** (Generates a fresh key pair, posts the Route53 TXT record, gets the new certificate from Let's Encrypt, cleans up DNS, and pushes the new bundle to the satellite gateway).
4. **Zero Downtime Reload:**
   * The satellite gateway reloads NGINX gracefully (`nginx -s reload`). Existing customer connections are not dropped.
5. **Notification:**
   * The security team receives an automated email:  
     `"Notice: Certificate for api.fintechglobal.com has been automatically renewed for 90 days. Zero human intervention required."`

---

## 8. Summary Architecture & Data Flow Map

```
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                         FinTech Global Inc.                              │
  └──────────────────────────────────────────────────────────────────────────┘
           │                                                  │
           ▼ (1. Enters Domain & Route53 Account)             ▼ (2. Enrolls Gateway)
┌──────────────────────────────────────────┐      ┌─────────────────────────────┐
│          CLM SaaS Control Plane          │      │  Customer Private AWS VPC   │
│                                          │      │                             │
│  • Generates Key Pair & PKCS#10 CSR      │      │  ┌───────────────────────┐  │
│  • AES-256-GCM Vault                     │      │  │ Satellite Gateway     │  │
│  • ACME Protocol Orchestrator            │      │  │ (Go Daemon)           │  │
│  • Row-Level Security Database           │      │  └──────────┬────────────┘  │
└──────────────┬───────────────────────────┘      │             │ Writes Cert   │
               │                                  │             ▼ & Reloads     │
       ┌───────┴───────────────┐                  │  ┌───────────────────────┐  │
       ▼                       ▼                  │  │ NGINX Payment Server  │  │
┌──────────────┐       ┌───────────────┐          │  │ api.fintechglobal.com │  │
│ Let's Encrypt│       │ AWS Route53   │          │  └───────────────────────┘  │
│ Public CA    │       │ Global DNS    │          └─────────────────────────────┘
└──────────────┘       └───────────────┘                        ▲
       │                       │                                │
       └───────────────────────┼────────────────────────────────┘
                 (3. DNS-01 Verification Proof)
```

