import { createApiClient } from '@clm/api-client';

export const api = createApiClient({
  baseUrl: (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1',
  getAuthToken: () => localStorage.getItem('clm_access_token'),
  defaultHeaders: (() => {
    const headers: Record<string, string> = {};
    try {
      const u = localStorage.getItem('clm_tenant_user');
      if (u) {
        const parsed = JSON.parse(u);
        if (parsed.role) headers['x-user-role'] = parsed.role;
        if (parsed.tenantId) headers['x-tenant-id'] = parsed.tenantId;
      }
    } catch {
      // ignore
    }
    return headers;
  })(),
});
