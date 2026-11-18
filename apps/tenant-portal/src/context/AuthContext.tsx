import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { type User, type Tenant, TenantStatus } from '@clm/shared-types';
import { api } from '../config/api';
import { toast } from '@clm/ui';

interface AuthContextType {
  currentUser: User | null;
  currentTenant: Tenant | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  setCurrentTenant: React.Dispatch<React.SetStateAction<Tenant | null>>;
  logout: () => void;
  checkTenantVerificationStatus: (manual?: boolean) => Promise<void>;
  isCheckingStatus: boolean;
  isAuthLoaded: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const u = localStorage.getItem('clm_tenant_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(() => {
    try {
      const o = localStorage.getItem('clm_tenant_org');
      return o ? JSON.parse(o) : null;
    } catch {
      return null;
    }
  });

  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  // Sync default headers when currentUser changes
  useEffect(() => {
    if (currentUser) {
      api.setDefaultHeaders?.({
        'x-tenant-id': currentUser.tenantId,
        'x-user-role': currentUser.role,
      });
    }
    setIsAuthLoaded(true);
  }, [currentUser]);

  const logout = useCallback(() => {
    localStorage.removeItem('clm_tenant_user');
    localStorage.removeItem('clm_tenant_org');
    localStorage.removeItem('clm_access_token');
    api.setDefaultHeaders?.({
      'x-tenant-id': '',
      'x-user-role': '',
    });
    setCurrentUser(null);
    setCurrentTenant(null);
    toast.info('Signed Out', 'You have been safely signed out.');
  }, []);

  const checkTenantVerificationStatus = useCallback(async (manual = false) => {
    if (manual) setIsCheckingStatus(true);
    try {
      const res = await api.tenants.getMyStatus();
      if (res && res.tenant) {
        setCurrentTenant(res.tenant);
        localStorage.setItem('clm_tenant_org', JSON.stringify(res.tenant));
        if (res.status === TenantStatus.ACTIVE && currentTenant?.status !== TenantStatus.ACTIVE) {
          toast.success('Account Approved!', 'Your organization has been verified and active access unlocked.');
        }
      }
    } catch {
      // Offline / error
    } finally {
      if (manual) setIsCheckingStatus(false);
    }
  }, [currentTenant?.status]);

  // Periodic polling for review status if organization is under verification
  useEffect(() => {
    if (currentTenant?.status === TenantStatus.PENDING_APPROVAL) {
      const interval = setInterval(() => {
        checkTenantVerificationStatus(false);
      }, 15000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [currentTenant?.status, checkTenantVerificationStatus]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentTenant,
        setCurrentUser,
        setCurrentTenant,
        logout,
        checkTenantVerificationStatus,
        isCheckingStatus,
        isAuthLoaded,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    try {
      const u = localStorage.getItem('clm_tenant_user');
      const o = localStorage.getItem('clm_tenant_org');
      return {
        currentUser: u ? JSON.parse(u) : null,
        currentTenant: o ? JSON.parse(o) : null,
        setCurrentUser: () => { },
        setCurrentTenant: () => { },
        logout: () => {
          localStorage.removeItem('clm_tenant_user');
          localStorage.removeItem('clm_tenant_org');
          localStorage.removeItem('clm_tenant_token');
          window.location.reload();
        },
        checkTenantVerificationStatus: async () => { },
        isCheckingStatus: false,
        isAuthLoaded: true,
      };
    } catch {
      return {
        currentUser: null,
        currentTenant: null,
        setCurrentUser: () => { },
        setCurrentTenant: () => { },
        logout: () => { },
        checkTenantVerificationStatus: async () => { },
        isCheckingStatus: false,
        isAuthLoaded: false,
      };
    }
  }
  return context;
};
