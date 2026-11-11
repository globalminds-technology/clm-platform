import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../utils/cn';

export interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
  rightAction?: React.ReactNode;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, containerClassName, label, error, helperText, id, rightAction, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined);

    return (
      <div className={cn('relative w-full', containerClassName)}>
        {label && (
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor={inputId} className="block text-xs font-bold text-slate-700">
              {label}
            </label>
            {rightAction}
          </div>
        )}
        <div className="relative flex items-center">
          <input
            {...props}
            ref={ref}
            id={inputId}
            type={showPassword ? 'text' : 'password'}
            className={cn(
              'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-11 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors',
              error && 'border-rose-300 focus:border-rose-500 bg-rose-50/30',
              className,
            )}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(prev => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            title={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 focus:text-blue-600 focus:outline-none rounded-md transition-colors"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 stroke-[2]" />
            ) : (
              <Eye className="h-4 w-4 stroke-[2]" />
            )}
          </button>
        </div>
        {error && <p className="mt-1 text-[11px] text-rose-500 font-medium">{error}</p>}
        {helperText && !error && <p className="mt-1 text-[11px] text-slate-400">{helperText}</p>}
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';

