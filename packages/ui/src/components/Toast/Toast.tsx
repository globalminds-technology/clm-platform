import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { type ToastItem, toast } from './toast-store';

export interface ToastProps {
  item: ToastItem;
}

export function Toast({ item }: ToastProps) {

  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />,
    error: <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />,
    info: <Info className="h-4 w-4 text-blue-600 shrink-0" />,
  };

  const bgStyles = {
    success: 'bg-emerald-500/10 text-emerald-900 border-emerald-200/60',
    error: 'bg-rose-500/10 text-rose-900 border-rose-200/60',
    warning: 'bg-amber-500/10 text-amber-900 border-amber-200/60',
    info: 'bg-blue-500/10 text-blue-900 border-blue-200/60',
  };

  const iconPillStyles = {
    success: 'bg-emerald-100 text-emerald-700',
    error: 'bg-rose-100 text-rose-700',
    warning: 'bg-amber-100 text-amber-700',
    info: 'bg-blue-100 text-blue-700',
  };

  return (
    <div
      role="alert"
      className={twMerge(
        clsx(
          'pointer-events-auto flex items-start gap-3 w-full p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border shadow-lg shadow-slate-900/5 transition-all duration-300 ease-out transform translate-y-0',
          bgStyles[item.type],
        ),
      )}
    >
      <div className={twMerge(clsx('p-1.5 rounded-xl flex items-center justify-center shrink-0 mt-0.5', iconPillStyles[item.type]))}>
        {icons[item.type]}
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <div className="text-xs font-bold text-slate-900 leading-tight">
          {item.title}
        </div>
        {item.description && (
          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
            {item.description}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => toast.dismiss(item.id)}
        aria-label="Close notification"
        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 -mr-1"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
