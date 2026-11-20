import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Role, type User, type Tenant, TenantStatus } from '@clm/shared-types';
import { api } from '../config/api';
import { toast } from '@clm/ui';

export type TenantAction =
  | 'addCert'
  | 'deploy'
  | 'revoke'
  | 'enrollGateway'
  | 'manageTeam'
  | 'manageSettings'
  | 'managePolicy'
  | 'viewAudit'
  | 'viewCompliance'
  | 'viewGateways'
  | 'viewDiscovery';

interface AuthContextType {
  currentUser: User | null;
  currentTenant: Tenant | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  setCurrentTenant: React.Dispatch<React.SetStateAction<Tenant | null>>;
  logout: () => void;
  checkTenantVerificationStatus: (manual?: boolean) => Promise<void>;
  isCheckingStatus: boolean;
  isAuthLoaded: boolean;
  can: (action: TenantAction) => boolean;
  isRole: (...roles: Role[]) => boolean;
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

  // Validate token & hydrate from /auth/me on mount
  useEffect(() => {
    const token = localStorage.getItem('clm_tenant_jwt') || localStorage.getItem('clm_access_token');
    if (token) {
      api.auth.me()
        .then((res: any) => {
          if (res?.user) {
            setCurrentUser(res.user);
            localStorage.setItem('clm_tenant_user', JSON.stringify(res.user));
          }
          if (res?.tenant) {
            setCurrentTenant(res.tenant);
            localStorage.setItem('clm_tenant_org', JSON.stringify(res.tenant));
          }
        })
        .catch((err: any) => {
          if (err?.status === 401 || err?.statusCode === 401) {
            // Token strictly invalid or expired
            localStorage.removeItem('clm_tenant_jwt');
            localStorage.removeItem('clm_access_token');
            localStorage.removeItem('clm_tenant_user');
            localStorage.removeItem('clm_tenant_org');
            setCurrentUser(null);
            setCurrentTenant(null);
          }
        })
        .finally(() => {
          setIsAuthLoaded(true);
        });
    } else {
      setIsAuthLoaded(true);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('clm_tenant_user');
    localStorage.removeItem('clm_tenant_org');
    localStorage.removeItem('clm_tenant_jwt');
    localStorage.removeItem('clm_access_token');
    setCurrentUser(null);
    setCurrentTenant(null);
    toast.info('Signed Out', 'You have been safely signed out.');
  }, []);

  const can = useCallback(
    (action: TenantAction): boolean => {
      if (!currentUser?.role) return false;
      const r = currentUser.role;
      switch (action) {
        case 'addCert':
          return [Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.SECURITY_LEAD, Role.DEVOPS_ENGINEER].includes(r);
        case 'deploy':
          return [Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER].includes(r);
        case 'revoke':
          return [Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.SECURITY_LEAD].includes(r);
        case 'enrollGateway':
          return [Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.DEVOPS_ENGINEER].includes(r);
        case 'manageTeam':
          return [Role.SUPER_ADMIN, Role.TENANT_ADMIN].includes(r);
        case 'manageSettings':
          return [Role.SUPER_ADMIN, Role.TENANT_ADMIN].includes(r);
        case 'managePolicy':
          return [Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.SECURITY_LEAD].includes(r);
        case 'viewAudit':
          return [Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.SECURITY_LEAD, Role.AUDITOR].includes(r);
        case 'viewCompliance':
          return [Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.SECURITY_LEAD, Role.AUDITOR].includes(r);
        case 'viewGateways':
          return [Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.SECURITY_LEAD, Role.DEVOPS_ENGINEER].includes(r);
        case 'viewDiscovery':
          return [Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.SECURITY_LEAD, Role.DEVOPS_ENGINEER].includes(r);
        default:
          return false;
      }
    },
    [currentUser?.role],
  );

  const isRole = useCallback(
    (...roles: Role[]): boolean => {
      return Boolean(currentUser && roles.includes(currentUser.role));
    },
    [currentUser],
  );

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
        can,
        isRole,
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
          localStorage.removeItem('clm_tenant_jwt');
          localStorage.removeItem('clm_access_token');
          window.location.reload();
        },
        checkTenantVerificationStatus: async () => { },
        isCheckingStatus: false,
        isAuthLoaded: true,
        can: () => false,
        isRole: () => false,
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
        can: () => false,
        isRole: () => false,
      };
    }
  }
  return context;
};
