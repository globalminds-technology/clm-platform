# Global Platform Overview: Detailed Business Flows & User Instructions

Welcome to the complete, non-technical guide to the **Enterprise Certificate Lifecycle Management (CLM) Platform**. This document explains what the platform does, how every feature works in plain language, and provides **step-by-step instructions** for every business workflow across both portals.

---

## 1. The Big Picture: What Problem Do We Solve?n

Every modern website, mobile app, and internal company system relies on **digital security certificates (SSL/TLS)** to keep customer data encrypted and prove the site is authentic.

* **The Problem:** Companies manage dozens or thousands of these certificates across different cloud providers, public websites, and private servers. If just **one** certificate expires unnoticed, websites go down, customers see scary security warnings, apps stop working, and businesses lose revenue and trust.
* **Our Solution:** A single, centralized **Command Center** where companies can automatically find all their certificates, monitor when they are about to expire, get early warning alerts, and renew/install them automatically before any outage happens.

---

## 2. Platform Structure: Two Portals, One Ecosystem

The platform is divided into two separate web portals so the SaaS provider and the customer companies stay cleanly separated:

| Portal | Who Uses It? | What It Does |
| :--- | :--- | :--- |
| **Super Admin Portal** | **Platform Owners (You)** | Oversees the entire SaaS business: reviews and approves new company registrations, monitors overall platform health, and tracks how many certificates and servers each customer is managing. |
| **Tenant Admin Portal** | **Customer Companies** | A private workspace for each individual company (e.g., *Alpha Corp*, *Acme Global*) to manage their own certificates, connect their cloud accounts, monitor private servers, manage team access, and receive alerts. |

> **Complete Company Privacy:** Every customer company has its own locked, isolated workspace. One company can never see another company's domains, certificates, servers, or logs.

---

## 3. End-to-End Business Lifecycle Overview

```
[1. Company Signs Up] ──► [2. Super Admin Approves] ──► [3. Discover & Add Certificates]
                                                                       │
                                                                       ▼
[6. Audit & Compliance] ◄── [5. Renew & Deploy] ◄── [4. 24/7 Watchdog & Email Alerts]
```

---

## 4. Detailed Business Flows & Step-by-Step Instructions

### Flow 1: Company Onboarding & Approval

**Business Purpose:** Ensures only verified organizations can access the platform and register servers.

**How It Works:**
1. A new customer company fills out the sign-up form with their organization name and administrator email.
2. Their workspace is created in a **Pending Approval** state—meaning they can view the dashboard, but sensitive actions (like enrolling servers or issuing certificates) stay locked until verified.
3. The **Super Admin** reviews the new company and activates it.

**Step-by-Step Instructions:**
1. **Customer:** Open the **Tenant Portal** $\rightarrow$ Click **Create Organization** $\rightarrow$ Enter Company Name, Admin Email, and Password $\rightarrow$ Submit.
2. **Platform Owner:** Open the **Super Admin Portal** $\rightarrow$ Go to the **Tenants** list $\rightarrow$ Locate the newly registered company marked **Pending Approval**.
3. Click **Approve Tenant**.
4. **Customer:** Refresh the Tenant Portal—the workspace is now fully unlocked and ready to use.

---

### Flow 2: Live Website Discovery & Monitoring (External Websites)

**Business Purpose:** Instantly track public websites (e.g., company marketing sites, Vercel/Netlify apps, external vendor portals) without needing server access.

**How It Works:**
* The platform visits the website just like a web browser, inspects its real security padlock, and records the exact expiration date, issuer, and encryption strength.
* Because an external website (like `github.com` or `ashokbabu.vercel.app`) is managed by a third party, **our platform blocks fake manual renewals** so your records always match reality.

**Step-by-Step Instructions:**
1. In the **Tenant Portal**, stay on the **Certificates** tab and click **+ Add Certificate** (top right).
2. Keep the first tab selected: **Live TLS Discovery (Real Period)**.
3. Type the domain name (for example: `ashokbabu.vercel.app` or `github.com`) with port `443`.
4. Click **Probe TLS**.
5. Review the live details pulled directly from the website (Issuer, Algorithm, Valid From/To, Days Remaining).
6. Click **Import & Track Real Expiry**.
7. **To Check for Updates Later:** Select the certificate from the list and click **Re-Probe Live**. If the hosting provider (e.g., Vercel) renewed the certificate, the platform automatically updates to the new real expiry date.

---

### Flow 3: Issuing Internal / Custom Certificates (Private PKI)

**Business Purpose:** Generate and manage internal certificates for company microservices, test environments, or private apps with flexible lifetimes.

**How It Works:**
* Administrators choose how long the certificate should remain valid (`24 Hours`, `7 Days`, `30 Days`, or `90 Days`).
* These certificates are managed directly by our platform, meaning the automated Watchdog can renew them automatically before they expire.

**Step-by-Step Instructions:**
1. Click **+ Add Certificate** (top right).
2. Switch to the second tab: **+ Issue New Certificate**.
3. Enter the **Domain / Common Name** (e.g., `internal-billing.alphacorp.local`).
4. Select the **Validity Profile** (`24 Hours`, `7 Days`, `30 Days`, or `90 Days`), **Key Algorithm** (`RSA 2048` or `ECDSA P-256`), and **Validation Method**.
5. Click **Issue Certificate**.
6. **To Download Files for Manual Server Setup:** Select the certificate in the list and click **PEM Bundle** at the top right of the detail card to download the ready-to-use `.pem` certificate file.

---

### Flow 4: Cloud Provider Integration & Sync (AWS ACM)

**Business Purpose:** Automatically bring all SSL certificates stored in Amazon Web Services (AWS) into one central view without manual data entry.

**How It Works:**
* Your AWS Access Key and Secret Key are locked using bank-grade encryption (**AES-256-GCM**) as soon as you save them.
* When you sync, the platform connects directly to your AWS region, reads all live certificates in AWS Certificate Manager (ACM), and tags them with an **AWS Cloud** badge.

**Step-by-Step Instructions:**
1. Go to **Settings** (left sidebar) $\rightarrow$ Click the **Cloud Providers** sub-tab.
2. Click **+ Connect Cloud Account**.
3. Choose **AWS (Amazon Web Services)**, give it a clear name (e.g., `AWS Production`), select the exact **Region** where your certificates live (e.g., `us-east-1`), and enter your **IAM Access Key ID** and **Secret Access Key**.
4. Click **Save & Encrypt Credentials**.
5. On your new AWS card, click **Test Connection** to verify access, then click **Sync ACM**.
6. Go back to the **Certificates** tab—all certificates from your AWS account now appear automatically with the **AWS Cloud** badge and real expiry dates.

---

### Flow 5: Zero-Trust Satellite Gateway (For Private Company Servers)

**Business Purpose:** Securely monitor and deploy certificates onto private internal servers (inside a company VPC or data center) **without opening any incoming firewall ports**.

**How It Works:**
```
  Central CLM Cloud                          Customer Private Server (Locked Firewall)
 ┌─────────────────┐                        ┌─────────────────────────────────────────┐
 │                 │   1. Outbound Check-In │  ┌───────────────────────────────────┐  │
 │   CLM Backend   │ ◄──────────────────────┼──┤  Satellite Gateway Agent          │  │
 │                 │   (Every 30 seconds)   │  │  • Reports CPU, RAM, Health       │  │
 │                 │                        │  │  • Pulls new renewal jobs         │  │
 │                 │   2. Sends New Certs   │  │  • Installs cert & reloads server │  │
 │                 │ ───────────────────────┼─►└───────────────────────────────────┘  │
 └─────────────────┘                        └─────────────────────────────────────────┘
```
* Instead of our cloud trying to break into a locked company network, the Satellite Gateway sits *inside* the private server and checks *outward* every 30 seconds.
* If the server stops checking in for more than 90 seconds, the platform automatically marks it **OFFLINE** so engineers know immediately.

**Step-by-Step Instructions:**

* **Option A: Instant UI Handshake (Fastest for Demo & Testing)**
  1. Go to the **Gateways** tab in the left sidebar.
  2. Click **Enroll Satellite Gateway** (top right).
  3. On the **Quick Handshake** tab, click **Simulate Outbound Handshake**.
  4. The new gateway immediately appears as **ONLINE (Healthy)** with its internal IP address.

* **Option B: Running the Live Gateway Agent on a Server / Local Machine**
  1. Open a terminal in the project folder and start the Gateway agent:
     `node apps/gateway/runner.js`
  2. The agent begins sending live heartbeats every 30 seconds with CPU and RAM usage.
  3. Refresh the **Gateways** tab in the Tenant Portal to see the gateway turn **ONLINE**.
  4. Open the Gateway's own built-in local console in your browser (`http://localhost:8080`) to view locally discovered certificates, trigger an immediate check-in (**Send Immediate Beacon**), or scan local endpoints.

---

### Flow 6: Automated Watchdog & Renewal Flow

**Business Purpose:** Eliminates human forgetfulness by continuously checking every certificate and server in the background.

**How It Works:**
* Every **30 seconds**, the platform's Watchdog automatically checks:
  1. **Certificate Expiry:** Any eligible managed certificate within **30 days** of expiring is automatically renewed and logged. *(External third-party monitored websites are never faked—they alert your team instead).*
  2. **Gateway Health:** Any Satellite Gateway that hasn't checked in for **90+ seconds** is marked **OFFLINE**.

**Step-by-Step Instructions (On-Demand Check):**
* You don't need to do anything for the 30-second loop to run.
* However, if you want to trigger an immediate audit during a demo, navigate to **Alerts** and review the live status or click **Sync DB** on the top bar to refresh the latest automated updates.

---

### Flow 7: Security Alerts & Email Notification Flow

**Business Purpose:** Ensures DevOps and security teams receive early email warnings well before any certificate expires.

**How It Works:**
* The **Alerts** tab automatically groups certificates by urgency (`Critical ≤ 7 days`, `Expiring Soon ≤ 30 days`).
* Administrators define their preferred warning threshold and primary email address, and can verify email delivery in one click.

**Step-by-Step Instructions:**
1. Click **Alerts** in the left sidebar.
2. Under **Notification Policy & Routing**, verify or update the **Primary Alert Email Recipient** (e.g., `pashokbabu.38@gmail.com`).
3. Choose the **Urgency Threshold** (`7 Days`, `14 Days`, or `30 Days`).
4. Click **Save Notification Policy**.
5. Click **Send Test Alert via SMTP** (top right of the Alerts header) to immediately dispatch a live email to the recipient inbox and confirm mail delivery is working.

---

### Flow 8: Team Management & Role-Based Access

**Business Purpose:** Gives every team member the exact permissions they need—nothing more, nothing less.

**Available Roles:**
* **Tenant Admin:** Full control over organization settings, cloud credentials, and team invitations.
* **Security Lead:** Can issue, renew, and revoke certificates.
* **DevOps Engineer:** Can enroll gateways, connect deployment targets, and deploy certificates.
* **Auditor:** Read-only access to inspect certificates and download compliance logs.
* **Read-Only:** Can view dashboards without making any changes.

**Step-by-Step Instructions:**
1. Go to **Settings** $\rightarrow$ Click the **Team** sub-tab.
2. Click **+ Invite Member**.
3. Enter the colleague's **Full Name**, **Email**, and select their **Role**.
4. Click **Send Invitation**—they immediately appear in the active team roster with their assigned permissions.

---

### Flow 9: Audit Logs, Filtering & Compliance Exports

**Business Purpose:** Provides complete accountability for security audits (SOC 2, ISO 27001) and quick troubleshooting.

**Step-by-Step Instructions:**
1. **View History:** Click **Activity Logs** in the left sidebar to see a chronological timeline of every action (certificate additions, probes, cloud syncs, gateway enrollments, and renewals).
2. **Filter Inventory:** On the **Certificates** tab, use the **Target & Export** card (top right) to filter by **AWS ACM**, **AWS ALB**, or **NGINX**, or use the search bar to find any domain or issuer.
3. **Export Reports:** Click **CSV** (for Excel/spreadsheets) or **JSON** on the **Target & Export** card to instantly download your full certificate ledger.

---

### Flow 10: Commercial / Paid CA Renewal Flow *(Planned Enhancement)*

**Business Purpose:** Paid commercial certificates (such as DigiCert, Sectigo, or GlobalSign) cost money per renewal, so they must **never** auto-renew silently without budget approval.

**Planned Business Flow:**
1. When a paid commercial certificate comes within **30 days** of expiry, automatic renewal is **paused** and the certificate is placed in a **Pending Commercial Review** queue.
2. Finance or DevOps opens the review list showing itemized renewal prices (e.g., *DigiCert TLS — \$199/yr*).
3. Users can choose **Review & Renew Single** or **Approve & Renew All**.
4. A simulated corporate checkout modal accepts a **Corporate Card** or **Purchase Order (PO)**, generates an invoice receipt, updates clear budget & savings statistics, and completes the renewal.

---

## 5. Summary Value for Customers

| Without Our CLM Platform | With Our CLM Platform |
| :--- | :--- |
| Certificates tracked in messy spreadsheets | One unified dashboard for Cloud, Web, and Private servers |
| Surprise website outages when certs expire | Automatic 30-day renewals & early email warnings |
| Dangerous open firewall ports to push updates | Zero-trust Satellite Gateway using safe outbound check-ins |
| No record of who changed what | Complete, exportable Activity Logs for every action |
| Scattered AWS, Vercel, and internal tools | Real-time live probing + AWS sync in one place |
