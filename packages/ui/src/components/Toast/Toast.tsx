import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { type ToastItem, toast } from './toast-store';

export interface ToastProps {
  item: ToastItem;
}

export function Toast({ item }: ToastProps) {
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />,
    error: <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />,
    info: <Info className="h-5 w-5 text-blue-600 shrink-0" />,
  };

  const borderStyles = {
    success: 'border-l-4 border-l-emerald-500',
    error: 'border-l-4 border-l-rose-500',
    warning: 'border-l-4 border-l-amber-500',
    info: 'border-l-4 border-l-blue-500',
  };

  const iconPillStyles = {
    success: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20',
    error: 'bg-rose-50 text-rose-600 ring-1 ring-rose-500/20',
    warning: 'bg-amber-50 text-amber-600 ring-1 ring-amber-500/20',
    info: 'bg-blue-50 text-blue-600 ring-1 ring-blue-500/20',
  };

  return (
    <div
      role="alert"
      className={twMerge(
        clsx(
          'pointer-events-auto flex items-start gap-3.5 w-full p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xl shadow-slate-900/15 transition-all duration-300 ease-out transform translate-y-0',
          borderStyles[item.type],
        ),
      )}
    >
      <div className={twMerge(clsx('p-2 rounded-xl flex items-center justify-center shrink-0 mt-0.5', iconPillStyles[item.type]))}>
        {icons[item.type]}
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <div className="text-sm font-bold text-slate-900 leading-snug tracking-tight">
          {item.title}
        </div>
        {item.description && (
          <div className="text-xs font-medium text-slate-600 mt-1 leading-relaxed">
            {item.description}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => toast.dismiss(item.id)}
        aria-label="Close notification"
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0 -mr-1 -mt-0.5"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

