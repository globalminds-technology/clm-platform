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

-- Password Reset Tokens (System-wide recovery verification codes)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email CITEXT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens (email);


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

-- Cloud Accounts (Tenant-scoped encrypted cloud provider credentials with AES-256-GCM)
CREATE TABLE IF NOT EXISTS cloud_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    auth_type VARCHAR(50) NOT NULL DEFAULT 'ACCESS_KEY',
    status VARCHAR(50) NOT NULL DEFAULT 'CONNECTED',
    region VARCHAR(64),
    aws_account_id VARCHAR(64),
    aws_role_arn VARCHAR(255),
    azure_tenant_id VARCHAR(255),
    azure_client_id VARCHAR(255),
    gcp_project_id VARCHAR(255),
    encrypted_credentials TEXT NOT NULL,
    encryption_iv VARCHAR(64) NOT NULL,
    encryption_tag VARCHAR(64) NOT NULL,
    masked_secret VARCHAR(64) NOT NULL,
    last_sync_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
    'cloud_accounts',
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
      'USING (current_setting(''app.is_system'', true) = ''true'' OR tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) ' ||
      'WITH CHECK (current_setting(''app.is_system'', true) = ''true'' OR tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid);',
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
        '$argon2id$v=19$m=65536,t=3,p=4$6HjL+7JfsReqtNVEejxDYA$Lz/iape+CZYS7eUjt5rXQ+qwvBukbFG57AXboUAZegc',
        'Alice',
        'Vance',
        'TENANT_ADMIN',
        'ACTIVE'
    ),
    (
        '10000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000001',
        'devops@acme.com',
        '$argon2id$v=19$m=65536,t=3,p=4$6HjL+7JfsReqtNVEejxDYA$Lz/iape+CZYS7eUjt5rXQ+qwvBukbFG57AXboUAZegc',
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
VALUES 
    (
        '30000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'payments.example.com',
        ARRAY['payments.example.com', 'www.payments.example.com'],
        'ACTIVE',
        'RSA_2048',
        'DigiCert TLS RSA CA',
        '4a2b9c8d1e7f0a3b5c7d',
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        NOW() - INTERVAL '30 days',
        NOW() + INTERVAL '6 days',
        true,
        30,
        '20000000-0000-0000-0000-000000000001'
    ),
    (
        '30000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000001',
        'api.example.com',
        ARRAY['api.example.com'],
        'EXPIRING_SOON',
        'RSA_2048',
        'Sectigo RSA DV',
        '7b8c9d0e1f2a3b4c5d6e',
        '1234c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        NOW() - INTERVAL '350 days',
        NOW() + INTERVAL '14 days',
        true,
        30,
        '20000000-0000-0000-0000-000000000001'
    ),
    (
        '30000000-0000-0000-0000-000000000003',
        'a0000000-0000-0000-0000-000000000001',
        'auth.example.com',
        ARRAY['auth.example.com', 'sso.example.com'],
        'ACTIVE',
        'ECDSA_P256',
        'Let''s Encrypt R3',
        '9f8e7d6c5b4a3b2c1d',
        'abcd44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        NOW() - INTERVAL '45 days',
        NOW() + INTERVAL '45 days',
        true,
        30,
        '20000000-0000-0000-0000-000000000001'
    ),
    (
        '30000000-0000-0000-0000-000000000004',
        'a0000000-0000-0000-0000-000000000001',
        'admin.example.com',
        ARRAY['admin.example.com'],
        'ACTIVE',
        'RSA_2048',
        'DigiCert TLS RSA CA',
        '3c4d5e6f7a8b9c0d1e',
        '5544c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        NOW() - INTERVAL '15 days',
        NOW() + INTERVAL '120 days',
        true,
        30,
        '20000000-0000-0000-0000-000000000001'
    ),
    (
        '30000000-0000-0000-0000-000000000005',
        'a0000000-0000-0000-0000-000000000001',
        'app.example.com',
        ARRAY['app.example.com'],
        'ACTIVE',
        'ECDSA_P384',
        'GlobalSign RSA OV',
        '8a7b6c5d4e3f2a1b0c',
        '7766c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        NOW() - INTERVAL '40 days',
        NOW() + INTERVAL '140 days',
        true,
        30,
        '20000000-0000-0000-0000-000000000001'
    ),
    (
        '30000000-0000-0000-0000-000000000006',
        'a0000000-0000-0000-0000-000000000001',
        'static.example.com',
        ARRAY['static.example.com'],
        'EXPIRED',
        'RSA_2048',
        'Let''s Encrypt R3',
        '1f2e3d4c5b6a7b8c9d',
        '9988c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        NOW() - INTERVAL '400 days',
        NOW() - INTERVAL '5 days',
        false,
        30,
        '20000000-0000-0000-0000-000000000001'
    )
ON CONFLICT (id) DO NOTHING;
