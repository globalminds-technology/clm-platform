# Local Infrastructure (Docker Compose)

Provides containerized PostgreSQL 16 and Redis 7 for local development of the CLM Platform.

## Quick Start

1. Start all containers in the background:
   ```bash
   docker compose up -d
   ```

2. Check container status and health:
   ```bash
   docker compose ps
   ```

3. View real-time logs:
   ```bash
   docker compose logs -f
   ```

4. Stop containers:
   ```bash
   docker compose down
   ```

5. Reset data volumes (destructive clean):
   ```bash
   docker compose down -v
   ```

---

## Database Architecture & Row-Level Security (RLS)

- **Database Name:** `clm_db`
- **Superuser:** `postgres` / `postgres` (Runs schema migrations only)
- **Application Role:** `clm_app` / `clm_app_secret` (`NOBYPASSRLS`)

### How RLS Works at Runtime:
Every NestJS database transaction sets the active tenant context before executing queries:

```sql
BEGIN;
SET LOCAL app.tenant_id = 'a0000000-0000-0000-0000-000000000001';
SELECT * FROM certificates; -- Only returns certificates belonging to Acme Corp!
COMMIT;
```

If a query executes without setting `app.tenant_id`, the RLS policy evaluates to false and returns 0 rows, completely preventing cross-tenant data leaks.

