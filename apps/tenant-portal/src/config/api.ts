import { createApiClient } from '@clm/api-client';

export const API_BASE_URL: string =
  (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1';

export const api = createApiClient({
  baseUrl: API_BASE_URL,
      getAuthToken: () => localStorage.getItem('clm_tenant_jwt') || localStorage.getItem('clm_access_token'),
        onUnauthorized: () => {
          if (localStorage.getItem('clm_tenant_jwt') || localStorage.getItem('clm_access_token')) {
            localStorage.removeItem('clm_tenant_jwt');
            localStorage.removeItem('clm_access_token');
            localStorage.removeItem('clm_tenant_user');
            localStorage.removeItem('clm_tenant_org');
            window.location.reload();
          }
},
});
