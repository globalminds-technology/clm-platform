import React, { useState } from 'react';
import { ShieldAlert, Mail, AlertCircle } from 'lucide-react';
import { api } from '../../../config/api';
import { PasswordInput } from '@clm/ui';
import type { AdminUser } from '../../../context/AdminAuthContext';

interface AdminLoginProps {
  onLoggedIn: (user: AdminUser) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoggedIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoggingIn(true);

    try {
      const res: any = await api.auth.login({
        email: email.trim(),
        password,
      });

      if (res?.user?.role !== 'SUPER_ADMIN') {
        setError('Access denied. This console requires an authenticated SUPER_ADMIN role.');
        return;
      }

      if (res?.tokens?.accessToken) {
        localStorage.setItem('clm_admin_access_token', res.tokens.accessToken);
      }
      localStorage.setItem('clm_admin_user', JSON.stringify(res.user));
      onLoggedIn(res.user);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Invalid Super Admin credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl soft-card border border-slate-100 p-8 shadow-xl">
        <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
          <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight">CLM SaaS Super Admin</h1>
          <p className="text-xs text-slate-500 mt-1">Multi-Tenant Platform Control Plane</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Admin Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="superadmin@clm.platform"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Master Password</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="text-xs py-2.5"
            />
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-2.5 px-4 rounded-xl primary-gradient-btn text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 transition cursor-pointer mt-2"
          >
            {isLoggingIn ? 'Authenticating Console...' : 'Sign In to Super Admin'}
          </button>
        </form>
      </div>
    </div>
  );
};
