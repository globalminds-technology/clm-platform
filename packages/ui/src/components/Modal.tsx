import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  className,
}) => {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={cn(
          'w-full bg-white rounded-[28px] border border-slate-100 shadow-[0_20px_50px_rgba(15,23,42,0.12)] p-6 space-y-5 transform transition-all',
          maxWidthClasses[maxWidth],
          className,
        )}
      >
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">{title}</h3>
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
};

