import React, { useState } from 'react';
import { Cpu, RefreshCw, Zap, Server, Database, CheckCircle2, Play } from 'lucide-react';
import { InfoBubble, toast } from '@clm/ui';
import { api } from '../../../config/api';

export const PlatformHealthView: React.FC = () => {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [lastEvaluatedAt, setLastEvaluatedAt] = useState<string>('Continuous Cron (Every 1 hr)');
  const [evalResult, setEvalResult] = useState<string | null>(null);

  const handleForceEvaluation = async () => {
    setIsEvaluating(true);
    setEvalResult(null);
    try {
      const stats = await api.scheduler.evaluateNow();
      setLastEvaluatedAt(new Date().toLocaleTimeString());
      setEvalResult(`Autonomous engine evaluated: ${stats.autoRenewedCerts || 0} certificates auto-renewed, ${stats.offlineGateways || 0} offline gateways detected.`);
      toast.success(
        'Autonomous Engine Evaluated',
        `Background watchdog executed: ${stats.autoRenewedCerts || 0} certificates renewed.`
      );
    } catch (err: any) {
      toast.error('Evaluation Failed', err.message || 'Could not trigger scheduler evaluation.');
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="space-y-6 pr-3 pb-8">
      {/* Top Banner: Engine Status & Force Execution */}
      <div className="bg-white rounded-[24px] soft-card p-6 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">
                Autonomous Renewal Daemon
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Running
              </span>
              <InfoBubble
                title="Platform Autonomous Engine"
                content="Background NestJS cron service continuously auditing all tenant certificates. When a certificate enters the 30-day window, the engine autonomously calls CA APIs, generates new keys, and dispatches signed certificates to satellite gateways."
              />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Watchdog cron: <span className="font-mono text-slate-700 font-bold">@hourly</span> • Last evaluation: {lastEvaluatedAt}
            </p>
          </div>
        </div>

        <button
          onClick={handleForceEvaluation}
          disabled={isEvaluating}
          className="primary-gradient-btn px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
        >
          {isEvaluating ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4 fill-white" />
          )}
          <span>{isEvaluating ? 'Evaluating Entire Fleet...' : 'Trigger Global Renewal Sweep'}</span>
        </button>
      </div>

      {evalResult && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
          <span>{evalResult}</span>
        </div>
      )}

      {/* Grid: 3 Core Subsystem Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Scheduler Daemon Health */}
        <div className="bg-white rounded-[24px] soft-card p-6 border border-slate-100 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Cpu className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-black text-[#0F172A]">Watchdog Engine</h4>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Node.js / NestJS</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500">Scheduler Interval</span>
              <span className="font-bold text-slate-800 font-mono">1 Hour (Cron)</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500">Renew Before Window</span>
              <span className="font-bold text-slate-800 font-mono">30 Days</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500">Active CA Drivers</span>
              <span className="font-bold text-emerald-600">ACME, Vault, DigiCert, Sectigo</span>
            </div>
          </div>
        </div>

        {/* 2. Gateway mTLS Broker */}
        <div className="bg-white rounded-[24px] soft-card p-6 border border-slate-100 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Server className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-black text-[#0F172A]">Gateway Daemon Broker</h4>
            </div>
            <span className="text-[10px] font-mono text-slate-400">mTLS / TLS 1.3</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500">Tunnel Protocol</span>
              <span className="font-bold text-slate-800 font-mono">Outbound HTTPS / mTLS</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500">Heartbeat Interval</span>
              <span className="font-bold text-slate-800 font-mono">30 Seconds</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500">Zero-Trust Authentication</span>
              <span className="font-bold text-emerald-600">HMAC-SHA256 Token</span>
            </div>
          </div>
        </div>

        {/* 3. Database RLS & Connection Pool */}
        <div className="bg-white rounded-[24px] soft-card p-6 border border-slate-100 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Database className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-black text-[#0F172A]">PostgreSQL Multi-Tenancy</h4>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Postgres 16</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500">Isolation Layer</span>
              <span className="font-bold text-emerald-600">Row-Level Security (RLS)</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500">Tenant Context Binding</span>
              <span className="font-bold text-slate-800 font-mono">SET LOCAL app.current_tenant</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500">Connection Pool</span>
              <span className="font-bold text-slate-800 font-mono">Prisma / PgBouncer</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
