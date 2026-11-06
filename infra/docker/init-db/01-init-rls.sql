-- ==============================================================================
-- CLM Platform: PostgreSQL Initialization & Row-Level Security (RLS) Setup
-- Reference: docs/architecture-guide.md
-- ==============================================================================

-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE EXTENSION IF NOT EXISTS "citext";

-- 2. Create the unprivileged application runtime role (NOBYPASSRLS)
-- Superuser (postgres) runs migrations; clm_app runs runtime queries
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'clm_app') THEN
    CREATE ROLE clm_app WITH LOGIN PASSWORD 'clm_app_secret' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE clm_db TO clm_app;
GRANT USAGE, CREATE ON SCHEMA public TO clm_app;

-- 3. Core Multi-Tenant Tables

-- Tenants (System-level metadata table)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  tier VARCHAR(50) NOT NULL DEFAULT 'COMMUNITY',
  max_certificates INT NOT NULL DEFAULT 50,
  max_gateways INT NOT NULL DEFAULT 5,
  aws_account_id VARCHAR(64),
  aws_customer_identifier VARCHAR(255),
  aws_product_code VARCHAR(255),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users (Tenant-scoped)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    email CITEXT NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'DEVOPS_ENGINEER',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_user_email UNIQUE (tenant_id, email)
);

-- Gateways (Tenant-scoped satellite daemons)
CREATE TABLE IF NOT EXISTS gateways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    hostname VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    version VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OFFLINE',
    target_types_supported TEXT [] NOT NULL DEFAULT ARRAY[]::TEXT [],
    labels JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_heartbeat_at TIMESTAMPTZ,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gateway Enrollment Tokens (Single-use enrollment tokens)
CREATE TABLE IF NOT EXISTS gateway_enrollment_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    gateway_id UUID REFERENCES gateways (id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Certificates (Tenant-scoped)
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    sans TEXT [] NOT NULL DEFAULT ARRAY[]::TEXT [],
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    key_algorithm VARCHAR(50) NOT NULL DEFAULT 'RSA_2048',
    issuer VARCHAR(255) NOT NULL,
    serial_number VARCHAR(128) NOT NULL,
    fingerprint_sha256 VARCHAR(64) NOT NULL,
    not_before TIMESTAMPTZ NOT NULL,
    not_after TIMESTAMPTZ NOT NULL,
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    renew_before_days INT NOT NULL DEFAULT 30,
    gateway_id UUID REFERENCES gateways (id) ON DELETE SET NULL,
    last_renewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deploy Targets (Tenant-scoped deployment configurations)
CREATE TABLE IF NOT EXISTS deploy_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    gateway_id UUID NOT NULL REFERENCES gateways (id) ON DELETE CASCADE,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    auto_deploy BOOLEAN NOT NULL DEFAULT true,
    last_deployed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deployments (Tenant-scoped execution logs)
CREATE TABLE IF NOT EXISTS deployment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    certificate_id UUID NOT NULL REFERENCES certificates (id) ON DELETE CASCADE,
    deploy_target_id UUID NOT NULL REFERENCES deploy_targets (id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    logs TEXT [] DEFAULT ARRAY[]::TEXT [],
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Gateway Commands (Tenant-scoped typed commands to satellite daemons)
CREATE TABLE IF NOT EXISTS gateway_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    gateway_id UUID NOT NULL REFERENCES gateways (id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    payload JSONB NOT NULL,
    signature VARCHAR(512) NOT NULL,
    error_message TEXT,
    dispatched_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Logs (Append-only compliance log)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    actor_type VARCHAR(50) NOT NULL,
    actor_id VARCHAR(255) NOT NULL,
    actor_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Append-Only Enforcement for Audit Logs
CREATE
OR REPLACE RULE no_update_audit_logs AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;

CREATE
OR REPLACE RULE no_delete_audit_logs AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- 5. Row-Level Security (RLS) Setup
-- Enable and force RLS on all tenant-isolated tables

DO $$
DECLARE
  t TEXT;
  tenant_tables TEXT[] := ARRAY[
    'users',
    'gateways',
    'gateway_enrollment_tokens',
    'certificates',
    'deploy_targets',
    'deployment_records',
    'gateway_commands',
    'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);

    -- Create tenant isolation policy
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_policy ON %I ' ||
      'FOR ALL TO clm_app ' ||
      'USING (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) ' ||
      'WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid);',
      t
    );
  END LOOP;
END
$$;

-- Grant permissions to clm_app role
GRANT
SELECT, INSERT,
UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO clm_app;

GRANT USAGE,
SELECT ON ALL SEQUENCES IN SCHEMA public TO clm_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT
SELECT, INSERT,
UPDATE, DELETE ON TABLES TO clm_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE,
SELECT ON SEQUENCES TO clm_app;

-- 6. Seed Initial Data for Development & Local Testing
-- Demo Tenant: Acme Corp
INSERT INTO
    tenants (
        id,
        name,
        slug,
        status,
        tier,
        max_certificates,
        max_gateways
    )
VALUES (
        'a0000000-0000-0000-0000-000000000001',
        'Acme Global Corp',
        'acme-global',
        'ACTIVE',
        'ENTERPRISE',
        1000,
        25
    )
ON CONFLICT (slug) DO NOTHING;

-- Demo Super Admin (Platform Operator) & Tenant Admin
-- Password for demo users: "Password123!" (Argon2 / mock hash for seed)
INSERT INTO
    users (
        id,
        tenant_id,
        email,
        password_hash,
        first_name,
        last_name,
        role,
        status
    )
VALUES (
        '10000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'admin@acme.com',
        '$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHQxMjM0NTY3OA$YJ7B4M9vV5rE1pQ6wZ3x8sK2nL0mP9uX8vT1rE4wZ2o',
        'Alice',
        'Vance',
        'TENANT_ADMIN',
        'ACTIVE'
    ),
    (
        '10000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000001',
        'devops@acme.com',
        '$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHQxMjM0NTY3OA$YJ7B4M9vV5rE1pQ6wZ3x8sK2nL0mP9uX8vT1rE4wZ2o',
        'Bob',
        'Stone',
        'DEVOPS_ENGINEER',
        'ACTIVE'
    )
ON CONFLICT (tenant_id, email) DO NOTHING;

-- Demo Gateway
INSERT INTO
    gateways (
        id,
        tenant_id,
        name,
        hostname,
        ip_address,
        version,
        status,
        target_types_supported,
        last_heartbeat_at
    )
VALUES (
        '20000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'us-east-1-prod-gateway',
        'gw-prod-01.acme.internal',
        '10.0.1.15',
        '1.0.0',
        'ONLINE',
        ARRAY['AWS_ACM', 'AWS_ALB', 'NGINX'],
        NOW()
    )
ON CONFLICT (id) DO NOTHING;

-- Demo Certificate
INSERT INTO
    certificates (
        id,
        tenant_id,
        domain,
        sans,
        status,
        key_algorithm,
        issuer,
        serial_number,
        fingerprint_sha256,
        not_before,
        not_after,
        auto_renew,
        renew_before_days,
        gateway_id
    )
VALUES (
        '30000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'api.acme.com',
        ARRAY[
            'api.acme.com',
            'services.acme.com'
        ],
        'ACTIVE',
        'RSA_2048',
        'Let''s Encrypt Authority X3',
        '4a2b9c8d1e7f0a3b5c7d',
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        NOW() - INTERVAL '30 days',
        NOW() + INTERVAL '60 days',
        true,
        30,
    )
ON CONFLICT (id) DO NOTHING;