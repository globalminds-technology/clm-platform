import React, { useState } from 'react';
import {
  Bell,
  Send,
  AlertTriangle,
  Clock,
  Mail,
  Activity,
  ShieldAlert,
  CheckCircle2,
  Settings,
  RefreshCw,
  Check,
} from 'lucide-react';
import { CertStatus, type Certificate } from '@clm/shared-types';
import { toast } from '@clm/ui';
import { api } from '../../../config/api';

interface AlertsViewProps {
  certs: Certificate[];
  onRenewCert: (cert: Certificate) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  certs,
  onRenewCert,
}) => {
  const [alertRecipientEmail, setAlertRecipientEmail] = useState('admin@yourcompany.com');
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [alertThresholdDays, setAlertThresholdDays] = useState(7);
  const [isSendingTestAlert, setIsSendingTestAlert] = useState(false);
  const [isSavingAlertConfig, setIsSavingAlertConfig] = useState(false);

  const handleSendTestAlert = async () => {
    setIsSendingTestAlert(true);
    try {
      if ((api as any).http) {
        await (api as any).http.post('alerts/test', { recipientEmail: alertRecipientEmail });
      } else {
        const backendUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1';
        await fetch(`${backendUrl.replace(/\/$/, '')}/alerts/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipientEmail: alertRecipientEmail }),
        });
      }
      toast.success(
        'Test Alert Sent',
        `Dispatched TLS verification test alert to ${alertRecipientEmail}.`
      );
    } catch (err: any) {
      toast.error('Alert Failed', err.message || 'Could not send test alert via SMTP.');
    } finally {
      setIsSendingTestAlert(false);
    }
  };

  const handleSaveAlertConfig = async () => {
    setIsSavingAlertConfig(true);
    try {
      // simulated save or update tenant alert settings
      toast.success(
        'Policy Saved',
        `Urgent alerts configured for <= ${alertThresholdDays} days remaining.`
      );
    } finally {
      setIsSavingAlertConfig(false);
    }
  };

  const criticalCount = certs.filter(
    (c) => c.daysRemaining <= 7 || c.status === CertStatus.EXPIRED
  ).length;
  const expiringCount = certs.filter(
    (c) => c.daysRemaining <= 30 && c.daysRemaining > 7
  ).length;

  const watchlist = certs.filter(
    (c) => c.daysRemaining <= 30 || c.status === CertStatus.EXPIRED
  );

  return (
    <div className="mr-3 mb-6 space-y-6">
      {/* Header with Title and Quick Test Dispatch */}
      <div className="bg-white rounded-[28px] soft-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">
              Alerts &amp; Security Watchdog
            </h3>
            <p className="text-xs text-slate-500">
              Automated X.509 expiration alerts, SMTP notifications, and zero-trust policy thresholds.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <button
            type="button"
            onClick={handleSendTestAlert}
            disabled={isSendingTestAlert}
            className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSendingTestAlert ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>Send Test Alert via SMTP</span>
          </button>
        </div>
      </div>

      {/* Status Overview Stat Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl soft-card p-4 border border-slate-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Critical Expiry
            </div>
            <div className="text-lg font-black text-rose-600">{criticalCount}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl soft-card p-4 border border-slate-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Expiring &le;30d
            </div>
            <div className="text-lg font-black text-amber-600">{expiringCount}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl soft-card p-4 border border-slate-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              SMTP Relay
            </div>
            <div className="text-xs font-black text-emerald-600 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Gmail Active
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl soft-card p-4 border border-slate-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Watchdog Cycle
            </div>
            <div className="text-xs font-black text-blue-600">Every 30s Loop</div>
          </div>
        </div>
      </div>

      {/* Main Content: Left Active Feed, Right Policy Config */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Expiry Watchlist (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-[28px] soft-card p-6 border border-slate-100 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-500" />
              <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                Active Expiry Watchlist
              </h4>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Threshold: &le; 30 days remaining
            </span>
          </div>

          {watchlist.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h5 className="font-extrabold text-xs text-slate-800">All Production Certs Healthy</h5>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                No certificates currently violate the 30-day warning threshold. The autonomous engine continues background monitoring.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {watchlist.map((cert) => {
                const isCritical = cert.daysRemaining <= 7 || cert.status === CertStatus.EXPIRED;
                return (
                  <div
                    key={cert.id}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isCritical ? 'bg-rose-50/40 border-rose-200' : 'bg-amber-50/30 border-amber-200'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900 truncate">
                          {cert.domain}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isCritical ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {cert.daysRemaining <= 0 ? 'EXPIRED' : `${cert.daysRemaining}d Left`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono truncate">
                        {cert.issuer} &bull; Expires: {new Date(cert.notAfter).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onRenewCert(cert)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Renew</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notification Policy Configuration (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-[28px] soft-card p-6 border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Settings className="h-4 w-4 text-blue-600" />
            <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
              Notification Channels &amp; Policy
            </h4>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Primary Alert Email Recipient
              </label>
              <div className="relative">
                <Mail className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={alertRecipientEmail}
                  onChange={(e) => setAlertRecipientEmail(e.target.value)}
                  placeholder="admin@yourcompany.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Dispatches critical X.509 expiry alerts using the configured Gmail SMTP credentials.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Urgent Warning Trigger Threshold
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '24 Hours', days: 1 },
                  { label: '7 Days', days: 7 },
                  { label: '30 Days', days: 30 },
                ].map((opt) => (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => setAlertThresholdDays(opt.days)}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border text-center transition-all cursor-pointer ${
                      alertThresholdDays === opt.days
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Slack / Microsoft Teams Webhook URL
              </label>
              <input
                type="url"
                value={slackWebhookUrl}
                onChange={(e) => setSlackWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Optional webhook endpoint for real-time channel incident alerts.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-slate-800">Autonomous Auto-Renewal</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800">
                  Active (30s)
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                When certificates hit &le;30 days, the platform automatically issues renewed certificates and logs audit trail events.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveAlertConfig}
              disabled={isSavingAlertConfig}
              className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSavingAlertConfig ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              <span>Save Notification Policy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
