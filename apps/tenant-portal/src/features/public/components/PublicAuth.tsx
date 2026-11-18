import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building,
  Layers,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  KeyRound,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  CloudMarketplace,
  SubscriptionTier,
  type User,
  type Tenant,
} from '@clm/shared-types';
import { Toaster, toast, PasswordInput } from '@clm/ui';
import ShapeGrid from '../../../components/ShapeGrid/ShapeGrid';
import { api } from '../../../config/api';

interface PublicAuthProps {
  onBackToHome: () => void;
  onAuthenticated: (user: User, tenant: Tenant) => void;
  initialMode?: 'signin' | 'signup' | 'forgot' | 'reset';
}

export const PublicAuth: React.FC<PublicAuthProps> = ({
  onBackToHome,
  onAuthenticated,
  initialMode = 'signup',
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>(initialMode);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authOrgName, setAuthOrgName] = useState('');
  const [authFirstName, setAuthFirstName] = useState('');
  const [authLastName, setAuthLastName] = useState('');
  const [authCountry, setAuthCountry] = useState('US');
  const [authState, setAuthState] = useState('');
  const [authLocality, setAuthLocality] = useState('');
  const [authDepartment, setAuthDepartment] = useState('SecOps');
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [authTier, setAuthTier] = useState<SubscriptionTier>(SubscriptionTier.PROFESSIONAL);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [emailCheckStatus, setEmailCheckStatus] = useState<{
    checking: boolean;
    exists: boolean;
    message?: string;
  }>({ checking: false, exists: false });

  // Password Reset Specific State
  const [resetToken, setResetToken] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetDevCodeHint, setResetDevCodeHint] = useState<string | null>(null);
  const [loginErrorHint, setLoginErrorHint] = useState(false);

  // Debounced check email uniqueness on registration
  useEffect(() => {
    if (authMode !== 'signup') {
      setEmailCheckStatus({ checking: false, exists: false });
      return;
    }
    const cleanEmail = authEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setEmailCheckStatus({ checking: false, exists: false });
      return;
    }

    const timer = setTimeout(async () => {
      setEmailCheckStatus({ checking: true, exists: false });
      try {
        const res = await api.auth.checkEmail(cleanEmail);
        setEmailCheckStatus({
          checking: false,
          exists: res.exists,
          message: res.message,
        });
      } catch {
        setEmailCheckStatus({ checking: false, exists: false });
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [authEmail, authMode]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAuth(true);

    try {
      if (authMode === 'signin') {
        const res = await api.auth.login({
          email: authEmail,
          password: authPassword,
        });

        localStorage.setItem('clm_tenant_user', JSON.stringify(res.user));
        if (res.tokens?.accessToken) {
          localStorage.setItem('clm_access_token', res.tokens.accessToken);
        }
        api.setDefaultHeaders?.({
          'x-tenant-id': res.user.tenantId,
          'x-user-role': res.user.role,
        });

        let loadedTenant: Tenant | null = null;
        try {
          const statusRes = await api.tenants.getMyStatus();
          if (statusRes && statusRes.tenant) {
            loadedTenant = statusRes.tenant;
          }
        } catch {
          try {
            const orgRes = await api.tenants.getById(res.user.tenantId);
            if (orgRes) loadedTenant = orgRes;
          } catch (err) {
            console.warn('Could not load tenant details from database', err);
          }
        }

        if (loadedTenant) {
          localStorage.setItem('clm_tenant_org', JSON.stringify(loadedTenant));
          onAuthenticated(res.user, loadedTenant);
        }
        toast.success('Welcome Back', `Logged in as ${res.user.email}`);
        setLoginErrorHint(false);
      } else {
        const res = await api.auth.registerTenant({
          organizationName: authOrgName,
          adminEmail: authEmail,
          password: authPassword,
          adminFirstName: authFirstName || 'Admin',
          adminLastName: authLastName || '',
          marketplaceProvider: CloudMarketplace.DIRECT,
          country: authCountry.trim().toUpperCase(),
          state: authState.trim(),
          locality: authLocality.trim(),
          department: authDepartment.trim(),
        });

        localStorage.setItem('clm_tenant_user', JSON.stringify(res.user));
        localStorage.setItem('clm_tenant_org', JSON.stringify(res.tenant));
        if (res.tokens?.accessToken) {
          localStorage.setItem('clm_access_token', res.tokens.accessToken);
        }
        api.setDefaultHeaders?.({
          'x-tenant-id': res.tenant.id,
          'x-user-role': res.user.role,
        });

        onAuthenticated(res.user, res.tenant);
        toast.success(
          'Organization Created',
          'Welcome to CLM! Your account is submitted for security verification.'
        );
        setLoginErrorHint(false);
      }
    } catch (err: any) {
      if (
        authMode === 'signin' &&
        (err.status === 401 ||
          err.statusCode === 401 ||
          err.message?.toLowerCase().includes('invalid email or password'))
      ) {
        setLoginErrorHint(true);
      }
      toast.error('Authentication Failed', err.message || 'Please check your inputs and try again.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim()) {
      toast.error('Email Required', 'Please enter your account email.');
      return;
    }
    setIsSubmittingAuth(true);
    setResetDevCodeHint(null);
    try {
      const res = await api.auth.forgotPassword({ email: authEmail.trim() });
      toast.success(
        'Reset Code Dispatched',
        'Check your inbox for your single-use 6-digit verification code.'
      );
      if (res.devCode) {
        setResetDevCodeHint(res.devCode);
      }
      setAuthMode('reset');
    } catch (err: any) {
      toast.error('Request Failed', err.message || 'Could not process password reset request.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken.trim()) {
      toast.error('Token Required', 'Please enter the 6-digit verification code.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      toast.error('Passwords Do Not Match', 'New password and confirmation must match exactly.');
      return;
    }
    if (resetNewPassword.length < 8) {
      toast.error('Weak Password', 'New password must be at least 8 characters long.');
      return;
    }

    setIsSubmittingAuth(true);
    try {
      const res = await api.auth.resetPassword({
        email: authEmail.trim(),
        token: resetToken.trim(),
        newPassword: resetNewPassword,
      });

      toast.success('Password Updated', res.message || 'Your password has been securely reset. Please sign in with your new password.');
      setAuthPassword(resetNewPassword);
      setAuthMode('signin');
    } catch (err: any) {
      toast.error('Reset Failed', err.message || 'Verification token is invalid or expired.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleLoadDemoSandbox = async () => {
    setIsSubmittingAuth(true);
    try {
      const res = await api.auth.login({
        email: 'alex@fintechglobal.com',
        password: 'Password123!',
      });
      localStorage.setItem('clm_tenant_user', JSON.stringify(res.user));
      if (res.tokens?.accessToken) {
        localStorage.setItem('clm_access_token', res.tokens.accessToken);
      }
      api.setDefaultHeaders?.({
        'x-tenant-id': res.user.tenantId,
        'x-user-role': res.user.role,
      });

      let loadedTenant: Tenant | null = null;
      try {
        const statusRes = await api.tenants.getMyStatus();
        if (statusRes && statusRes.tenant) loadedTenant = statusRes.tenant;
      } catch {
        const orgRes = await api.tenants.getById(res.user.tenantId);
        if (orgRes) loadedTenant = orgRes;
      }

      if (loadedTenant) {
        localStorage.setItem('clm_tenant_org', JSON.stringify(loadedTenant));
        onAuthenticated(res.user, loadedTenant);
      }
      toast.success('Sandbox Loaded', 'Connected to demonstration organization.');
    } catch {
      toast.info('Sandbox Sign-in', 'Pre-filling demo credentials.');
      setAuthMode('signin');
      setAuthEmail('alex@fintechglobal.com');
      setAuthPassword('Password123!');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans selection:bg-blue-500/20 selection:text-blue-600 flex flex-col justify-between relative overflow-x-hidden">
      <Toaster position="top-right" />

      {/* Full-Page Clean Light Square Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#F8FAFC]">
        <ShapeGrid
          shape="square"
          direction="diagonal"
          lineColor="#E2E8F0"
          lineWidth={1}
          cellSize={40}
          speed={0.15}
          cursorEffect={false}
          clickCascade={false}
          glow={0}
          twinkle={0}
          fade={0}
          backgroundColor="#F8FAFC"
          className="w-full h-full"
        />
      </div>

      {/* Auth Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/85 border-b border-slate-200/80 px-6 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Platform Overview</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="font-black text-sm tracking-tight text-slate-900 hidden sm:inline">
              CLM Platform
            </span>
          </div>

          <button
            type="button"
            onClick={handleLoadDemoSandbox}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-bold transition-all cursor-pointer"
          >
            <Sparkles className="h-3 w-3" />
            <span>Demo Sandbox</span>
          </button>
        </div>
      </header>

      {/* Dedicated Auth Form Card */}
      <main className="flex-1 flex items-center justify-center p-6 py-12 relative z-10">
        <div className="w-full max-w-2xl bg-white/95 border border-slate-200/90 rounded-[32px] p-8 sm:p-10 shadow-xl backdrop-blur-xl">
          <div className="flex border-b border-slate-200 pb-4 mb-8 items-center justify-between">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setLoginErrorHint(false);
                  setAuthMode('signup');
                }}
                className={`text-sm font-extrabold pb-2 transition-all relative cursor-pointer ${
                  authMode === 'signup'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Register New Organization
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginErrorHint(false);
                  setAuthMode('signin');
                }}
                className={`text-sm font-extrabold pb-2 transition-all relative cursor-pointer ${
                  authMode === 'signin'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In to Workspace
              </button>
              {(authMode === 'forgot' || authMode === 'reset') && (
                <span className="text-sm font-extrabold pb-2 text-blue-600 border-b-2 border-blue-600 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Reset Password</span>
                </span>
              )}
            </div>

            <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
              {authMode === 'signup'
                ? 'Step 1 of 2'
                : authMode === 'signin'
                ? 'Direct Access'
                : 'Account Recovery'}
            </span>
          </div>

          {authMode === 'signup' && (
            <form onSubmit={handleAuthSubmit} className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    {signupStep === 1
                      ? '1. Account & Company Profile'
                      : '2. Legal Location & CSR Defaults'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {signupStep === 1
                      ? 'Set up your administrator credentials and company identity.'
                      : 'Official location details for X.509 Certificate Signing Requests (CSR).'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                      signupStep === 1
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {signupStep === 1 ? '1' : <Check className="h-3.5 w-3.5" />}
                  </div>
                  <div className="w-6 h-0.5 bg-slate-200" />
                  <div
                    className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                      signupStep === 2
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    2
                  </div>
                </div>
              </div>

              {signupStep === 1 ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-blue-600" />
                      <span>Company Name *</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Corporation"
                      value={authOrgName}
                      onChange={(e) => setAuthOrgName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Work Email *</label>
                      {emailCheckStatus.checking && (
                        <span className="text-[10px] text-blue-500 font-semibold animate-pulse">
                          Checking availability...
                        </span>
                      )}
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="alex@acme.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-colors ${
                        emailCheckStatus.exists
                          ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500 focus:bg-white text-rose-900'
                          : 'border-slate-200 focus:border-blue-500 focus:bg-white'
                      }`}
                    />
                    {emailCheckStatus.exists && (
                      <div className="flex items-start gap-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] leading-tight">
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                        <div>
                          <span className="font-bold">Email already registered: </span>
                          <span>
                            An account with this email already exists. Each email can only register one
                            organization.{' '}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode('signin');
                              setLoginErrorHint(false);
                            }}
                            className="font-bold underline text-rose-800 hover:text-rose-950 ml-1 inline-block cursor-pointer"
                          >
                            Sign in instead &rarr;
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">First Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Alex"
                        value={authFirstName}
                        onChange={(e) => setAuthFirstName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Last Name (Optional)</label>
                      <input
                        type="text"
                        placeholder="Vance"
                        value={authLastName}
                        onChange={(e) => setAuthLastName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <PasswordInput
                      label="Password *"
                      required
                      placeholder="••••••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      helperText="Minimum 8 characters (Argon2id password hashing protected)"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-blue-600" />
                        <span>Plan Tier</span>
                      </span>
                    </label>
                    <select
                      value={authTier}
                      onChange={(e) => setAuthTier(e.target.value as SubscriptionTier)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                    >
                      <option value={SubscriptionTier.COMMUNITY}>
                        Community Free (50 Certs, 2 Gateways)
                      </option>
                      <option value={SubscriptionTier.AWS_MARKETPLACE_PAYGO}>
                        Pay-as-you-GO (250 Certs, 10 Gateways)
                      </option>
                      <option value={SubscriptionTier.PROFESSIONAL}>
                        Professional (500 Certs, 15 Gateways)
                      </option>
                      <option value={SubscriptionTier.ENTERPRISE}>
                        Enterprise Dedicated (1,000+ Certs, 25 Gateways)
                      </option>
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={emailCheckStatus.exists || emailCheckStatus.checking}
                    onClick={() => {
                      if (
                        !authOrgName.trim() ||
                        !authEmail.trim() ||
                        !authFirstName.trim() ||
                        !authPassword.trim()
                      ) {
                        toast.error(
                          'Missing Required Fields',
                          'Please complete company name, email, name, and password.'
                        );
                        return;
                      }
                      if (emailCheckStatus.exists) {
                        toast.error(
                          'Email Already Registered',
                          'A single email cannot register multiple organizations. Please sign in instead.'
                        );
                        return;
                      }
                      setSignupStep(2);
                    }}
                    className={`w-full py-3.5 rounded-2xl text-xs font-extrabold text-white shadow-xl flex items-center justify-center gap-2 transition-all ${
                      emailCheckStatus.exists || emailCheckStatus.checking
                        ? 'bg-slate-400 cursor-not-allowed opacity-60'
                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25 hover:scale-[1.01] cursor-pointer'
                    }`}
                  >
                    <span>Continue to Step 2: Location &amp; CSR Details</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200/80 text-xs text-blue-800 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-blue-600" />
                      <span>Zero-Hardcode Guarantee</span>
                    </div>
                    <p className="text-[11px] text-blue-700 leading-relaxed">
                      These fields are stored directly in your PostgreSQL database record and used as
                      Distinguished Name (DN) attributes for all certificate issuance and automated
                      renewals.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Country Code (C) *</label>
                      <input
                        type="text"
                        required
                        maxLength={2}
                        placeholder="e.g. US, IN, GB"
                        value={authCountry}
                        onChange={(e) => setAuthCountry(e.target.value.toUpperCase())}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-blue-500 focus:bg-white transition-colors uppercase"
                      />
                      <span className="text-[10px] text-slate-400">2-letter ISO country code</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Department / Unit (OU) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. SecOps, DevOps, IT"
                        value={authDepartment}
                        onChange={(e) => setAuthDepartment(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                      />
                      <span className="text-[10px] text-slate-400">Organizational Unit</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">State / Province (ST) *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. California, Karnataka"
                        value={authState}
                        onChange={(e) => setAuthState(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">City / Locality (L) *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. San Francisco, Bengaluru"
                        value={authLocality}
                        onChange={(e) => setAuthLocality(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSignupStep(1)}
                      className="px-4 py-3 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmittingAuth || emailCheckStatus.exists}
                      className={`flex-1 py-3.5 rounded-2xl text-xs font-extrabold text-white shadow-xl flex items-center justify-center gap-2 transition-all ${
                        isSubmittingAuth || emailCheckStatus.exists
                          ? 'bg-slate-400 cursor-not-allowed opacity-60'
                          : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25 hover:scale-[1.01] cursor-pointer'
                      }`}
                    >
                      {isSubmittingAuth ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Provisioning Tenant Workspace in PostgreSQL...</span>
                        </>
                      ) : (
                        <>
                          <span>Complete Registration &amp; Submit for Verification</span>
                          <Check className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}

          {authMode === 'signin' && (
            <form onSubmit={handleAuthSubmit} className="space-y-6">
              <div>
                <h3 className="text-xl font-black text-slate-900">Sign In to Your Workspace</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your administrator credentials or invited team member password.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="devops@acme.com"
                    value={authEmail}
                    onChange={(e) => {
                      setAuthEmail(e.target.value);
                      if (loginErrorHint) setLoginErrorHint(false);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <PasswordInput
                    label="Password *"
                    rightAction={
                      <button
                        type="button"
                        onClick={() => {
                          setLoginErrorHint(false);
                          setAuthMode('forgot');
                        }}
                        className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline font-semibold cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    }
                    required
                    placeholder="••••••••••••"
                    value={authPassword}
                    onChange={(e) => {
                      setAuthPassword(e.target.value);
                      if (loginErrorHint) setLoginErrorHint(false);
                    }}
                  />
                </div>
              </div>

              {loginErrorHint && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3 shadow-xs">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <p className="font-bold text-xs">Invalid Email or Password (401)</p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      The credentials entered do not match our database records. If you forgot your password, you can reset it immediately:
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginErrorHint(false);
                          setAuthMode('forgot');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                      >
                        <KeyRound className="h-3 w-3" />
                        <span>Reset Password Now &rarr;</span>
                      </button>
                      <span className="text-[11px] text-amber-700">
                        Demo Default: <code>Password123!</code>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                <strong>Invited Team Members:</strong> If your organization admin invited you, use the credentials delivered to your corporate inbox via SMTP mailer.
              </div>

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full py-3.5 rounded-2xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] cursor-pointer disabled:opacity-50"
              >
                {isSubmittingAuth ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {authMode === 'forgot' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setLoginErrorHint(false);
                    setAuthMode('signin');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 mb-3 font-semibold cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Sign In</span>
                </button>
                <h3 className="text-xl font-black text-slate-900">Reset Your Password</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your account work email and we will dispatch a secure 6-digit verification code.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Account Work Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="devops@acme.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full py-3.5 rounded-2xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] cursor-pointer disabled:opacity-50"
              >
                {isSubmittingAuth ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Sending Verification Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send 6-Digit Verification Code</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {authMode === 'reset' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-6">
              <div>
                <button
                  type="button"
                  onClick={() => setAuthMode('forgot')}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 mb-3 font-semibold cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Change Email / Resend Code</span>
                </button>
                <h3 className="text-xl font-black text-slate-900">Create New Password</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter the 6-digit verification code sent to <strong className="text-slate-900">{authEmail}</strong> and your new password.
                </p>
              </div>

              {resetDevCodeHint && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[11px] text-blue-700 uppercase tracking-wider">Dev Console Code</p>
                    <p className="text-xs font-mono font-bold mt-0.5">{resetDevCodeHint}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResetToken(resetDevCodeHint)}
                    className="px-2.5 py-1 text-[11px] font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Auto-Fill Code
                  </button>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">6-Digit Verification Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value.trim())}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono tracking-widest text-center text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <PasswordInput
                    label="New Password *"
                    required
                    placeholder="••••••••••••"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    helperText="Minimum 8 characters"
                  />
                </div>

                <div className="space-y-1.5">
                  <PasswordInput
                    label="Confirm New Password *"
                    required
                    placeholder="••••••••••••"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full py-3.5 rounded-2xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] cursor-pointer disabled:opacity-50"
              >
                {isSubmittingAuth ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Reset Password &amp; Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200/80 py-6 px-6 text-center text-xs text-slate-500 relative z-10 bg-white/70 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span>&copy; 2026 CLM Platform Inc.</span>
        </div>
      </footer>
    </div>
  );
};
