import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '@clm/ui';
import { api } from '../config/api';

export interface AdminUser {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  setAdminUser: React.Dispatch<React.SetStateAction<AdminUser | null>>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem('clm_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const token = localStorage.getItem('clm_admin_jwt') || localStorage.getItem('clm_admin_access_token');
    if (token) {
      api.auth.me()
        .then((res: any) => {
          if (res?.user && res.user.role === 'SUPER_ADMIN') {
            setAdminUser(res.user);
            localStorage.setItem('clm_admin_user', JSON.stringify(res.user));
          } else if (res?.user && res.user.role !== 'SUPER_ADMIN') {
            logout();
          }
        })
        .catch(() => {
          logout();
        });
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('clm_admin_user');
    localStorage.removeItem('clm_admin_jwt');
    localStorage.removeItem('clm_admin_access_token');
    setAdminUser(null);
    toast.info('Signed Out', 'Platform Administrator session terminated.');
  };

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        setAdminUser,
        logout,
        isAuthenticated: !!adminUser,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    try {
      const saved = localStorage.getItem('clm_admin_user');
      const u = saved ? JSON.parse(saved) : null;
      return {
        adminUser: u,
        setAdminUser: () => { },
        logout: () => {
          localStorage.removeItem('clm_admin_user');
          localStorage.removeItem('clm_admin_jwt');
          localStorage.removeItem('clm_admin_access_token');
          window.location.reload();
        },
        isAuthenticated: !!u,
      };
    } catch {
      return {
        adminUser: null,
        setAdminUser: () => { },
        logout: () => { },
        isAuthenticated: false,
      };
    }
  }
  return context;
};
