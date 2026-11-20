import { createApiClient } from '@clm/api-client';

export const api = createApiClient({
  baseUrl: (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1',
    getAuthToken: () => localStorage.getItem('clm_admin_jwt') || localStorage.getItem('clm_admin_access_token'),
    onUnauthorized: () => {
      if (localStorage.getItem('clm_admin_jwt') || localStorage.getItem('clm_admin_access_token')) {
        localStorage.removeItem('clm_admin_jwt');
        localStorage.removeItem('clm_admin_access_token');
        localStorage.removeItem('clm_admin_user');
        window.location.reload();
      }
    },
  });
