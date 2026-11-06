import * as React from 'react';
import { cn } from '../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'secondary';
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', children, ...props }) => {
  const variantStyles = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/80',
    success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20',
    destructive: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20',
    outline: 'text-foreground border border-input',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

