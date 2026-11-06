import * as React from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';

export interface TopHeaderProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  unreadNotifications?: boolean;
  userInitials?: string;
  actionButton?: React.ReactNode;
  className?: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  icon,
  title,
  subtitle,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  unreadNotifications = false,
  userInitials = 'AD',
  actionButton,
  className,
}) => {
  return (
    <header className={cn('h-16 flex items-center justify-between mb-4 pr-3 shrink-0', className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="h-10 w-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-blue-600 shadow-xs">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-[#0F172A]">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onSearchChange && (
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={e => onSearchChange(e.target.value)}
              className="w-72 pl-9 pr-4 py-2 bg-white rounded-full text-xs border border-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-600 shadow-xs"
            />
          </div>
        )}

        <button
          className="h-9 w-9 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 relative shadow-xs"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadNotifications && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-600" />
          )}
        </button>

        <div className="flex items-center gap-2 pl-1 pr-2 py-1 bg-white rounded-full border border-slate-100 shadow-xs cursor-pointer">
          <div className="h-7 w-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
            {userInitials}
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </div>

        {actionButton}
      </div>
    </header>
  );
};

