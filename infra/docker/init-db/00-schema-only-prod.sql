-- ==============================================================================
-- CLM Platform: Production Schema-Only Migration (Tables, Rules & RLS Policies)
-- Zero Dummy / Seed Data
-- ==============================================================================

-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- 2. Create the unprivileged application runtime role (NOBYPASSRLS) if permitted
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'clm_app') THEN
    CREATE ROLE clm_app WITH LOGIN PASSWORD 'clm_app_secret' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Skipping CREATE ROLE clm_app (managed cloud environment). Using primary connection role.';
END
$$;

DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO clm_app;', current_database());
  GRANT USAGE, CREATE ON SCHEMA public TO clm_app;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping database connect grant for clm_app.';
END
$$;

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
    tracking_mode VARCHAR(50) NOT NULL DEFAULT 'MANAGED_GATEWAY',
    issuer VARCHAR(255) NOT NULL,
    serial_number VARCHAR(128) NOT NULL,
    fingerprint_sha256 VARCHAR(64) NOT NULL,
    not_before TIMESTAMPTZ NOT NULL,
    not_after TIMESTAMPTZ NOT NULL,
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    renew_before_days INT NOT NULL DEFAULT 30,
    gateway_id UUID REFERENCES gateways (id) ON DELETE SET NULL,
    ca_integration_id UUID REFERENCES ca_integrations (id) ON DELETE SET NULL,
    cloud_account_id UUID REFERENCES cloud_accounts (id) ON DELETE SET NULL,
    deployment_target_type VARCHAR(50) DEFAULT 'GATEWAY',
    revocation_reason VARCHAR(100),
    revoked_at TIMESTAMPTZ,
    last_renewed_at TIMESTAMPTZ,
    certificate_pem TEXT,
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

-- CA Integrations (Tenant-scoped encrypted Certificate Authority API credentials with AES-256-GCM)
CREATE TABLE IF NOT EXISTS ca_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    provider VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_email VARCHAR(255),
    external_account_binding_id VARCHAR(255),
    encrypted_credentials TEXT NOT NULL,
    encryption_iv VARCHAR(64) NOT NULL,
    encryption_tag VARCHAR(64) NOT NULL,
    masked_secret VARCHAR(64) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
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
CREATE OR REPLACE RULE no_update_audit_logs AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE OR REPLACE RULE no_delete_audit_logs AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

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
    'ca_integrations',
    'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);

    -- Create tenant isolation policy applying to application roles
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_policy ON %I ' ||
      'FOR ALL ' ||
      'USING (current_setting(''app.is_system'', true) = ''true'' OR tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) ' ||
      'WITH CHECK (current_setting(''app.is_system'', true) = ''true'' OR tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid);',
      t
    );
  END LOOP;
END
$$;

-- Grant permissions to clm_app role if it exists
DO $$
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO clm_app;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO clm_app;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO clm_app;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO clm_app;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping clm_app grants.';
END
$$;

