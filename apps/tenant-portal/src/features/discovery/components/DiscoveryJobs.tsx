import React from 'react';
import { Radio, RefreshCw } from 'lucide-react';
import { Badge } from '@clm/ui';
import { type DiscoveryJob } from '../types';

interface DiscoveryJobsProps {
  jobs: DiscoveryJob[];
  isScanning: boolean;
  onTriggerScan: (jobId: string) => void;
}

export const DiscoveryJobs: React.FC<DiscoveryJobsProps> = ({
  jobs,
  isScanning,
  onTriggerScan,
}) => {
  if (jobs.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs bg-[#F8FAFC] rounded-2xl border border-slate-100">
        No discovery jobs created yet. Click "Create Discovery Job" to scan your network or domains.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {jobs.map((job) => (
        <div
          key={job.id}
          className="p-5 rounded-2xl bg-[#F8FAFC] border border-slate-100 hover:border-blue-200 transition-all space-y-3"
        >
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-bold text-xs text-slate-800">{job.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-mono text-slate-500">{job.targets}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-200 text-slate-700">
                  Ports: {job.ports}
                </span>
              </div>
            </div>
            <Badge variant={job.status === 'RUNNING' ? 'warning' : 'success'}>
              {job.status}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/60">
            <span className="text-[11px]">
              Gateway: <strong>{job.gateway}</strong>
            </span>
            <span className="text-[11px]">
              Last run: {job.lastRunAt ? new Date(job.lastRunAt).toLocaleTimeString() : 'Never'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-blue-600 font-bold">
              {job.installationsFound} live certificate(s) mapped
            </span>
            <button
              type="button"
              onClick={() => onTriggerScan(job.id)}
              disabled={isScanning}
              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isScanning ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Radio className="h-3 w-3" />
              )}
              <span>Trigger Scan</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
