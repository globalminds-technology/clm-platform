# CLM Platform Database Entity-Relationship (ER) Diagram

This document contains the official database entity-relationship schema for the **Certificate Lifecycle Management (CLM) SaaS Platform**, backed by PostgreSQL 16 with Row-Level Security (RLS) isolation.

---

## 1. Visual Entity-Relationship Diagram

```mermaid
erDiagram
    TENANTS ||--o{ USERS : "provisions (1:N)"
    TENANTS ||--o{ GATEWAYS : "registers (1:N)"
    TENANTS ||--o{ GATEWAY_ENROLLMENT_TOKENS : "issues (1:N)"
    GATEWAYS ||--o{ GATEWAY_ENROLLMENT_TOKENS : "authenticated_by (1:1)"
    TENANTS ||--o{ CERTIFICATES : "manages (1:N)"
    GATEWAYS ||--o{ CERTIFICATES : "monitors (0..1:N)"
    TENANTS ||--o{ DEPLOY_TARGETS : "configures (1:N)"
    GATEWAYS ||--o{ DEPLOY_TARGETS : "routes_to (1:N)"
    CERTIFICATES ||--o{ DEPLOYMENT_RECORDS : "history_of (1:N)"
    DEPLOY_TARGETS ||--o{ DEPLOYMENT_RECORDS : "applied_to (1:N)"
    GATEWAYS ||--o{ GATEWAY_COMMANDS : "executes (1:N)"
    TENANTS ||--o{ AUDIT_LOGS : "records (1:N)"

    TENANTS {
        uuid id PK "gen_random_uuid()"
        varchar name "Organization name"
        varchar slug UK "URL and workspace identifier"
        varchar status "ACTIVE | TRIAL | SUSPENDED"
        varchar tier "COMMUNITY | ENTERPRISE | AWS_MARKETPLACE_PAYGO"
        int max_certificates "Quota limit"
        int max_gateways "Quota limit"
        varchar aws_account_id "AWS Marketplace 12-digit ID"
        varchar aws_customer_identifier "AWS Marketplace customer ID"
        varchar aws_product_code "AWS Marketplace SaaS code"
        jsonb settings "Custom policies and webhook config"
        timestamptz created_at
        timestamptz updated_at
    }

    USERS {
        uuid id PK "gen_random_uuid()"
        uuid tenant_id FK "REFERENCES tenants(id)"
        citext email "Case-insensitive unique per tenant"
        varchar password_hash "Argon2id (OWASP 64MB, 3 iterations)"
        varchar first_name
        varchar last_name
        varchar role "SUPER_ADMIN | TENANT_ADMIN | DEVOPS_ENGINEER | AUDITOR"
        varchar status "ACTIVE | SUSPENDED | INVITED"
        timestamptz last_login_at
        timestamptz created_at
        timestamptz updated_at
    }

    GATEWAYS {
        uuid id PK "gen_random_uuid()"
        uuid tenant_id FK "REFERENCES tenants(id)"
        varchar name "Descriptive daemon name"
        varchar hostname "VPC or host machine FQDN"
        varchar ip_address "Host internal/private IP"
        varchar version "Daemon binary version"
        varchar status "ONLINE | OFFLINE | ENROLLING | DEGRADED"
        text_array target_types_supported "AWS_ACM, AWS_ALB, NGINX, IIS, etc."
        jsonb labels "Environment tags, telemetry metrics"
        timestamptz last_heartbeat_at "Updated on periodic beacon"
        timestamptz enrolled_at
        timestamptz created_at
        timestamptz updated_at
    }

    GATEWAY_ENROLLMENT_TOKENS {
        uuid id PK "gen_random_uuid()"
        uuid tenant_id FK "REFERENCES tenants(id)"
        uuid gateway_id FK "REFERENCES gateways(id)"
        varchar token_hash UK "HMAC-SHA256 signature hash"
        timestamptz expires_at "24-hour expiration window"
        timestamptz used_at "Single-use enforcement timestamp"
        timestamptz created_at
    }

    CERTIFICATES {
        uuid id PK "gen_random_uuid()"
        uuid tenant_id FK "REFERENCES tenants(id)"
        varchar domain "Primary FQDN"
        text_array sans "Subject Alternative Names"
        varchar status "ACTIVE | EXPIRING_SOON | EXPIRED | REVOKED"
        varchar key_algorithm "RSA_2048 | RSA_4096 | ECDSA_P256 | ECDSA_P384"
        varchar issuer "CA issuer common name"
        varchar serial_number "X.509 serial hex"
        varchar fingerprint_sha256 "64-char SHA-256 fingerprint"
        timestamptz not_before "Valid from"
        timestamptz not_after "Valid until"
        boolean auto_renew "Automated renewal flag"
        int renew_before_days "Default 30 days before expiry"
        uuid gateway_id FK "REFERENCES gateways(id) (optional)"
        timestamptz last_renewed_at
        timestamptz created_at
        timestamptz updated_at
    }

    DEPLOY_TARGETS {
        uuid id PK "gen_random_uuid()"
        uuid tenant_id FK "REFERENCES tenants(id)"
        varchar name "e.g. Prod API Load Balancer"
        varchar target_type "AWS_ACM | AWS_ALB | NGINX | APACHE | IIS"
        uuid gateway_id FK "REFERENCES gateways(id)"
        jsonb config "Target path, ARN, or port bindings"
        boolean auto_deploy "Deploy certificate upon issuance"
        timestamptz last_deployed_at
        timestamptz created_at
        timestamptz updated_at
    }

    DEPLOYMENT_RECORDS {
        uuid id PK "gen_random_uuid()"
        uuid tenant_id FK "REFERENCES tenants(id)"
        uuid certificate_id FK "REFERENCES certificates(id)"
        uuid deploy_target_id FK "REFERENCES deploy_targets(id)"
        varchar action "INSTALL | RENEW | REMOVE"
        varchar status "PENDING | IN_PROGRESS | SUCCESS | FAILED"
        text error_message "Failure diagnostics"
        text_array logs "Deployment step output logs"
        timestamptz executed_at
        timestamptz completed_at
    }

    GATEWAY_COMMANDS {
        uuid id PK "gen_random_uuid()"
        uuid tenant_id FK "REFERENCES tenants(id)"
        uuid gateway_id FK "REFERENCES gateways(id)"
        varchar type "DISCOVER | DEPLOY | RENEW"
        varchar status "PENDING | DISPATCHED | COMPLETED | FAILED"
        jsonb payload "Command-specific parameters"
        varchar signature "HMAC payload signature"
        text error_message
        timestamptz dispatched_at
        timestamptz completed_at
        timestamptz created_at
    }

    AUDIT_LOGS {
        uuid id PK "gen_random_uuid()"
        uuid tenant_id FK "REFERENCES tenants(id)"
        varchar actor_type "USER | GATEWAY | SYSTEM"
        varchar actor_id "User UUID or Gateway UUID"
        varchar actor_email "Actor user email if applicable"
        varchar action "e.g. CERT_RENEWED, TENANT_CREATED"
        varchar resource_type "CERTIFICATE | GATEWAY | TENANT | USER"
        varchar resource_id "Impacted entity UUID"
        jsonb metadata "Event payload & change diff"
        varchar ip_address "Client IP address"
        text user_agent "HTTP User-Agent"
        timestamptz created_at "Immutable timestamp"
    }
```

---

## 2. Table Specifications & Security Policies

| Table Name | Partitioning / Scope | Primary Key | Foreign Keys | Key Security Constraints |
|---|---|---|---|---|
| `tenants` | Global Root Entity | `id (UUID)` | None | Unique `slug`, subscription tier & quota tracking |
| `users` | Tenant Scoped | `id (UUID)` | `tenant_id -> tenants(id)` | Argon2id password hash, RLS isolated, unique `(tenant_id, email)` |
| `gateways` | Tenant Scoped | `id (UUID)` | `tenant_id -> tenants(id)` | RLS isolated, mTLS / token authenticated, heartbeat tracked |
| `gateway_enrollment_tokens` | Tenant Scoped | `id (UUID)` | `tenant_id -> tenants(id)`, `gateway_id -> gateways(id)` | Single-use (`used_at IS NULL`), 24h expiration, HMAC-SHA256 hashed |
| `certificates` | Tenant Scoped | `id (UUID)` | `tenant_id -> tenants(id)`, `gateway_id -> gateways(id)` | RLS isolated, SHA-256 fingerprint, automatic renewal policy |
| `deploy_targets` | Tenant Scoped | `id (UUID)` | `tenant_id -> tenants(id)`, `gateway_id -> gateways(id)` | RLS isolated, target configurations (AWS ALB, ACM, NGINX) |
| `deployment_records` | Tenant Scoped | `id (UUID)` | `certificate_id`, `deploy_target_id` | RLS isolated, execution logs, failure diagnostics |
| `gateway_commands` | Tenant Scoped | `id (UUID)` | `tenant_id -> tenants(id)`, `gateway_id -> gateways(id)` | RLS isolated, HMAC signed command payloads, execution state machine |
| `audit_logs` | Tenant Scoped | `id (UUID)` | `tenant_id -> tenants(id)` | **Append-only enforced** (`no_update_audit_logs`, `no_delete_audit_logs`), RLS isolated |

