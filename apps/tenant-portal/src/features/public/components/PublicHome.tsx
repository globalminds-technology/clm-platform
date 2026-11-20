import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Check,
  Lock,
  Cloud,
  Terminal,
  Sparkles,
  Server,
  RefreshCw,
  UserPlus,
  AlertCircle,
} from 'lucide-react';
import { SubscriptionTier } from '@clm/shared-types';
import ShapeGrid from '../../../components/ShapeGrid/ShapeGrid';

interface PublicHomeProps {
  onNavigateToAuth: (mode?: 'signin' | 'signup', tier?: SubscriptionTier) => void;
  onLoadDemoSandbox?: () => void;
}

export const PublicHome: React.FC<PublicHomeProps> = ({
  onNavigateToAuth,
}) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans selection:bg-blue-500/20 selection:text-blue-600 flex flex-col relative pt-[73px]">
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

      {/* Top Navigation Bar - Constant Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/95 border-b border-slate-200/80 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight text-slate-900">CLM Platform</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <a href="#overview" className="hover:text-blue-600 transition-colors">Overview</a>
            <a href="#marketplaces" className="hover:text-blue-600 transition-colors">Marketplaces</a>
            <a href="#comparison" className="hover:text-blue-600 transition-colors">Why CLM</a>
            <a href="#architecture" className="hover:text-blue-600 transition-colors">Pillars</a>
            <a href="#lifecycle" className="hover:text-blue-600 transition-colors">Lifecycle</a>
            <a href="#topology" className="hover:text-blue-600 transition-colors">VPC Gateway</a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">Plans</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateToAuth('signin')}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition-all cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* SECTION 1: Open Hero Section */}
      <section id="overview" className="relative z-10 px-6 pt-16 pb-20 max-w-7xl mx-auto w-full text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-black tracking-wide shadow-sm backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
            <span>AUTONOMOUS ZERO-TRUST CERTIFICATE LIFECYCLE MANAGEMENT</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.08]">
            Zero Outages. Zero Manual Renewals.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600">
              Absolute Cryptographic Governance.
            </span>
          </h1>

          <div className="max-w-2xl mx-auto my-6 p-5 sm:p-6 rounded-2xl bg-white/90 border border-slate-200 shadow-sm backdrop-blur-md">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <Lock className="h-5 w-5" />
              </div>
              <div className="text-left">
                <blockquote className="text-sm sm:text-base font-semibold text-slate-900 italic tracking-tight leading-relaxed">
                  &ldquo;Trust is verified by cryptography. Reliability is guaranteed by zero-trust automation.&rdquo;
                </blockquote>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-2 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                  <span>Enterprise Zero-Trust PKI Security Standard</span>
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
            Automate SSL/TLS certificate discovery, background ACME renewals, and zero-touch deployment across AWS ALB/ACM, Azure Key Vault, Cloudflare, and on-prem Nginx/Kubernetes clusters with multi-cloud marketplace billing.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={() => onNavigateToAuth('signin')}
              className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 shadow-sm transition-all cursor-pointer"
            >
              Sign In to Workspace
            </button>
            <button
              type="button"
              onClick={() => onNavigateToAuth('signup', SubscriptionTier.PROFESSIONAL)}
              className="primary-gradient-btn px-6 py-3.5 rounded-2xl text-xs font-bold shadow-md shadow-blue-500/25 cursor-pointer"
            >
              Start Free Trial
            </button>
          </div>

          {/* Live Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-10 max-w-3xl mx-auto">
            <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm backdrop-blur-sm text-center">
              <div className="text-2xl font-black text-slate-900">99.999%</div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Uptime SLA Guarantee</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm backdrop-blur-sm text-center">
              <div className="text-2xl font-black text-blue-600">0</div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Inbound Ports Open</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm backdrop-blur-sm text-center">
              <div className="text-2xl font-black text-emerald-600">&lt; 200ms</div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5">ACME TLS Verification</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm backdrop-blur-sm text-center">
              <div className="text-2xl font-black text-indigo-600">PostgreSQL</div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Row-Level Security</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Cloud Marketplace & Compliance Trust Bar */}
      <section id="marketplaces" className="relative z-10 py-6 px-6 max-w-7xl mx-auto w-full border-y border-slate-200/80 bg-white/60 backdrop-blur-sm my-4 rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-600">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Verified Marketplace Integrations &amp; Security Standards:
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2 text-slate-700 shadow-sm">
              <Cloud className="h-4 w-4 text-amber-500" /> AWS Marketplace PayGO
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2 text-slate-700 shadow-sm">
              <Cloud className="h-4 w-4 text-blue-500" /> Microsoft Azure Marketplace
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2 text-slate-700 shadow-sm">
              <Cloud className="h-4 w-4 text-rose-500" /> Google Cloud Partner
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2 text-slate-700 shadow-sm">
              <Cloud className="h-4 w-4 text-emerald-500" /> Zoho AppStore
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-2 text-blue-700">
              <ShieldCheck className="h-4 w-4 text-blue-600" /> 0 Open Inbound Ports
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-700">
              <Lock className="h-4 w-4 text-emerald-600" /> PostgreSQL RLS Isolation
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 3: The True Cost of Manual TLS vs Autonomous CLM */}
      <section id="comparison" className="relative z-10 py-16 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center space-y-2 mb-12">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">The Operational Shift</span>
          <h2 className="text-3xl font-black text-slate-900">Manual Spreadsheets vs Autonomous Governance</h2>
          <p className="text-xs text-slate-500 max-w-lg mx-auto">
            How modern engineering fleets eliminate certificate outages before they trigger browser security warnings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-8 rounded-[28px] bg-rose-50/70 border border-rose-200 space-y-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-rose-950">The Legacy Manual Way</h3>
                <span className="text-[11px] text-rose-600 font-medium">Unmonitored, reactive, high risk of outages</span>
              </div>
            </div>
            <ul className="text-xs text-slate-700 space-y-3 pt-2">
              <li className="flex items-start gap-2.5">
                <span className="text-rose-600 font-bold mt-0.5">&times;</span>
                <span>Spreadsheet tracking with missed calendar reminders causing catastrophic website downtime.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-600 font-bold mt-0.5">&times;</span>
                <span>Frantic 3 AM emergency renewals after users face &ldquo;Your connection is not private&rdquo; red screens.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-600 font-bold mt-0.5">&times;</span>
                <span>Open inbound firewall ports (<code>0.0.0.0/0</code>) and permanent API keys leaked across servers.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-600 font-bold mt-0.5">&times;</span>
                <span>Fragmented assets spread with zero audit trail across AWS, Azure, on-prem, and SaaS.</span>
              </li>
            </ul>
          </div>

          <div className="p-8 rounded-[28px] bg-blue-50/80 border border-blue-200 space-y-5 shadow-md shadow-blue-500/5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">The Autonomous CLM Way</h3>
                <span className="text-[11px] text-blue-600 font-medium">Continuous, automated, zero-trust cryptographic defense</span>
              </div>
            </div>
            <ul className="text-xs text-slate-700 space-y-3 pt-2">
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>24/7 background cron scheduler checks expiry daily and auto-renews 30 days before expiration.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>Zero-downtime ACME execution with automated DNS-01 and HTTP-01 challenge solvers.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>In-VPC satellite daemon with 0 open inbound ports using outbound mTLS reverse polling.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>Immutable audit ledger in PostgreSQL with tenant-isolated Row-Level Security and team RBAC.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* SECTION 4: Four Core Architectural Pillars */}
      <section id="architecture" className="relative z-10 py-16 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center space-y-2 mb-12">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Enterprise Architecture</span>
          <h2 className="text-3xl font-black text-slate-900">Four Pillars of Autonomous Security</h2>
          <p className="text-xs text-slate-500 max-w-lg mx-auto">
            Engineered for zero-trust cloud fleets, enterprise load balancers, and multi-tenant isolation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-[28px] bg-white/90 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-300 transition-all space-y-3 backdrop-blur-sm">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-sm">Zero-Trust VPC Gateways</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Lightweight agent daemons run inside your private AWS/Azure/GCP subnets. 100% outbound mTLS polling with zero open inbound firewall ports.
            </p>
          </div>

          <div className="p-6 rounded-[28px] bg-white/90 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-300 transition-all space-y-3 backdrop-blur-sm">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <RefreshCw className="h-5 w-5" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-sm">Automated ACME Engine</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Continuous 24/7 background cron monitors certificate lifecycles. Automatically renews Let&apos;s Encrypt and DigiCert certs 30 days prior to expiry.
            </p>
          </div>

          <div className="p-6 rounded-[28px] bg-white/90 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-300 transition-all space-y-3 backdrop-blur-sm">
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Server className="h-5 w-5" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-sm">Multi-Cloud Deployment</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Seamless push deployment to AWS ALB, AWS ACM, Azure Key Vault, Cloudflare, and on-prem Nginx/Kubernetes clusters with zero manual intervention.
            </p>
          </div>

          <div className="p-6 rounded-[28px] bg-white/90 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-300 transition-all space-y-3 backdrop-blur-sm">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <UserPlus className="h-5 w-5" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-sm">In-Portal Team RBAC</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Granular access control across Tenant Admin, Security Lead, DevOps Engineer, Auditor, and Viewer roles with automated SMTP credential mailer.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 5: How It Works — 4-Step Lifecycle Flow */}
      <section id="lifecycle" className="relative z-10 py-16 px-6 max-w-7xl mx-auto w-full border-t border-slate-200/80">
        <div className="text-center space-y-2 mb-12">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">End-to-End Workflow</span>
          <h2 className="text-3xl font-black text-slate-900">How CLM Automates Your TLS Lifecycle</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            From initial domain discovery to automated zero-touch deployment and renewal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-6 rounded-2xl bg-white/90 border border-slate-200 shadow-sm space-y-3 backdrop-blur-sm">
            <span className="text-xs font-black text-blue-600 uppercase tracking-wider">Step 01</span>
            <h4 className="font-extrabold text-slate-900 text-sm">Connect &amp; Discover</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Input your domains or import infrastructure endpoints. Real-time TLS discovery identifies active ciphers and expiration dates.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/90 border border-slate-200 shadow-sm space-y-3 backdrop-blur-sm">
            <span className="text-xs font-black text-blue-600 uppercase tracking-wider">Step 02</span>
            <h4 className="font-extrabold text-slate-900 text-sm">Deploy In-VPC Gateway</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Run the satellite daemon in your private AWS VPC or on-prem cluster via a 60-second Docker or binary curl command. No inbound ports open.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/90 border border-slate-200 shadow-sm space-y-3 backdrop-blur-sm">
            <span className="text-xs font-black text-blue-600 uppercase tracking-wider">Step 03</span>
            <h4 className="font-extrabold text-slate-900 text-sm">Automate ACME Issuance</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              The ACME engine solves DNS-01 and HTTP-01 challenges autonomously with Let&apos;s Encrypt and DigiCert to generate cryptographic certificates.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/90 border border-slate-200 shadow-sm space-y-3 backdrop-blur-sm">
            <span className="text-xs font-black text-blue-600 uppercase tracking-wider">Step 04</span>
            <h4 className="font-extrabold text-slate-900 text-sm">Zero-Touch Auto-Renewal</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Certificates are hot-reloaded to ALBs, ingress controllers, and Nginx reverse proxies. 30 days before expiration, auto-renewal triggers seamlessly.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 6: In-VPC Gateway Network Topology Visualizer */}
      <section id="topology" className="relative z-10 py-16 px-6 max-w-7xl mx-auto w-full border-t border-slate-200/80">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Network Topology</span>
            <h2 className="text-3xl font-black text-slate-900">Outbound-Only mTLS Reverse Architecture</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Traditional certificate deployment requires opening SSH or API ports into customer firewalls. CLM revolutionizes this with <strong>Outbound-Only Gateways</strong>:
            </p>
            <ul className="text-xs text-slate-700 space-y-2.5 pt-2">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span><strong>Zero Inbound Firewall Ports:</strong> No <code>0.0.0.0/0</code> ingress required.</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span><strong>Mutual TLS (mTLS) Ephemeral Tokens:</strong> Gateway polls control plane over port 443.</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span><strong>Local Private Network Execution:</strong> Certs deployed directly inside AWS VPC private subnets.</span>
              </li>
            </ul>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigateToAuth('signin')}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-50 shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Terminal className="h-4 w-4 text-blue-600" />
                <span>Sign In to Access Gateways</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 font-mono text-xs shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="text-slate-400 ml-2 font-bold">network-topology.log</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold">mTLS 1.3 ACTIVE</span>
            </div>

            <div className="space-y-2 text-[11px] leading-relaxed">
              <p className="text-slate-500"># Customer Private AWS VPC (10.0.0.0/16)</p>
              <p className="text-emerald-400">[VPC-Subnet] Gateway daemon started: gw-satellite-prod-01</p>
              <p className="text-slate-400">[SecurityGroup] Inbound: 0 rules (All ports closed)</p>
              <p className="text-slate-400">[SecurityGroup] Outbound: 443 to clm.internal.acme.com</p>
              <p className="text-blue-400">[Tunnel] Established reverse mTLS polling session (ID: tnl-489a2)</p>
              <p className="text-emerald-400">[Deploy] Pushing renewed TLS cert to AWS ALB (arn:aws:elasticloadbalancing:...)</p>
              <p className="text-white font-bold">[Success] ALB SSL certificate hot-reloaded with 0s downtime.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: Transparent Subscription Tiers */}
      <section id="pricing" className="relative z-10 py-16 px-6 max-w-7xl mx-auto w-full border-t border-slate-200/80">
        <div className="text-center space-y-2 mb-12">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Subscription Tiers</span>
          <h2 className="text-3xl font-black text-slate-900">Transparent, Scalable Pricing</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Super Admin can customize plan quotas and effective dates dynamically in the Admin Portal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-[28px] bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6 backdrop-blur-sm">
            <div className="space-y-4">
              <span className="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                Community Free
              </span>
              <div>
                <div className="text-3xl font-black text-slate-900">$0</div>
                <p className="text-[11px] text-slate-500">Forever free for small projects</p>
              </div>
              <ul className="text-xs text-slate-700 space-y-2 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> Up to 25 Active Certificates</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> 1 Local VPC Gateway</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> Let&apos;s Encrypt ACME</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToAuth('signup', SubscriptionTier.COMMUNITY)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
            >
              Choose Community
            </button>
          </div>

          <div className="p-6 rounded-[28px] bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6 backdrop-blur-sm">
            <div className="space-y-4">
              <span className="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Pay-as-you-GO
              </span>
              <div>
                <div className="text-3xl font-black text-slate-900">$49<span className="text-xs font-normal text-slate-500"> / mo</span></div>
                <p className="text-[11px] text-slate-500">AWS Marketplace Metered</p>
              </div>
              <ul className="text-xs text-slate-700 space-y-2 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> Up to 250 Certificates</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> 5 Local VPC Gateways</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> AWS ALB &amp; ACM Auto-Sync</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToAuth('signup', SubscriptionTier.AWS_MARKETPLACE_PAYGO)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
            >
              Choose PayGO
            </button>
          </div>

          <div className="p-6 rounded-[28px] bg-white border-2 border-blue-500 flex flex-col justify-between space-y-6 relative shadow-lg shadow-blue-500/10">
            <div className="space-y-4">
              <span className="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-blue-600 text-white shadow-sm">
                Most Popular
              </span>
              <div>
                <div className="text-3xl font-black text-slate-900">$199<span className="text-xs font-normal text-slate-500"> / mo</span></div>
                <p className="text-[11px] text-slate-500">Professional Multi-Cloud</p>
              </div>
              <ul className="text-xs text-slate-700 space-y-2 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> Up to 1,000 Certificates</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> 25 Local VPC Gateways</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> Full In-Portal Team RBAC</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> DigiCert &amp; Private CA</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToAuth('signup', SubscriptionTier.PROFESSIONAL)}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/25 cursor-pointer"
            >
              Start Free Trial
            </button>
          </div>

          <div className="p-6 rounded-[28px] bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6 backdrop-blur-sm">
            <div className="space-y-4">
              <span className="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                Enterprise
              </span>
              <div>
                <div className="text-3xl font-black text-slate-900">Custom</div>
                <p className="text-[11px] text-slate-500">Fleet &amp; Dedicated HSM</p>
              </div>
              <ul className="text-xs text-slate-700 space-y-2 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> Unlimited Certificates</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> Unlimited Fleet Gateways</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" /> Dedicated Key Vault &amp; SLA</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToAuth('signup', SubscriptionTier.ENTERPRISE)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
            >
              Choose Enterprise
            </button>
          </div>
        </div>
      </section>

      {/* Public Footer */}
      <footer className="relative z-10 mt-auto border-t border-slate-200/80 py-8 px-6 text-center text-xs text-slate-500 bg-white/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <span>&copy; 2026 CLM Platform Inc. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
