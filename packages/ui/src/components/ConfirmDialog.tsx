import * as React from 'react';
import { AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { cn } from '../utils/cn';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  const iconConfig = {
    danger: {
      icon: AlertCircle,
      bg: 'bg-rose-50 text-rose-600 border-rose-100',
      btnClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200/50 shadow-md',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-amber-50 text-amber-600 border-amber-100',
      btnClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200/50 shadow-md',
    },
    info: {
      icon: Info,
      bg: 'bg-blue-50 text-blue-600 border-blue-100',
      btnClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200/50 shadow-md',
    },
  }[variant];

  const Icon = iconConfig.icon;

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch {
      // error handled by caller
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center border',
              iconConfig.bg,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <p className="text-xs text-slate-600 leading-relaxed pt-1">{description}</p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            {cancelLabel}
          </Button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 disabled:opacity-50',
              iconConfig.btnClass,
            )}
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

