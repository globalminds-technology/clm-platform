import * as React from 'react';
import { cn } from '../utils/cn';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'healthy' | 'warning' | 'critical' | 'default';
  label: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant = 'healthy',
  label,
  className,
  ...props
}) => {
  const variantStyles = {
    healthy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    critical: 'bg-rose-50 text-rose-600 border-rose-200',
    default: 'bg-slate-50 text-slate-700 border-slate-200',
  };

  const dotStyles = {
    healthy: 'bg-emerald-500',
    warning: 'bg-amber-500',
    critical: 'bg-rose-500',
    default: 'bg-slate-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotStyles[variant])} />
      <span>{label}</span>
    </span>
  );
};

