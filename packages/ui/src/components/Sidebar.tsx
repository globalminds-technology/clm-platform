import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  active?: boolean;
  onClick: () => void;
}

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  brandName: string;
  brandIcon: React.ReactNode;
  items: SidebarNavItem[];
  user?: {
    name: string;
    role: string;
    initials: string;
  };
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  brandName,
  brandIcon,
  items,
  user,
  className,
}) => {
  return (
    <aside
      className={cn(
        'h-[calc(100vh-24px)] sticky top-3 flex flex-col justify-between bg-white rounded-[28px] border border-slate-100 shadow-[0_10px_30px_-4px_rgba(15,23,42,0.04)] transition-all duration-300 ease-in-out shrink-0 z-30 select-none',
        isCollapsed ? 'w-[72px] p-2.5' : 'w-64 p-3.5',
        className,
      )}
    >
      <div>
        {/* =================================================================== */}
        {/* Top Header & Collapse Toggle                                        */}
        {/* =================================================================== */}
        {isCollapsed ? (
          <div className="flex flex-col items-center pb-3.5 mb-3 border-b border-slate-100 gap-2">
            {/* Centered Brand Icon */}
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              {brandIcon}
            </div>

            {/* Centered Expand Button */}
            <button
              onClick={onToggleCollapse}
              className="h-6 w-6 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center border border-slate-200 transition-colors shadow-xs"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        ) : (
                <div className="flex items-center justify-between gap-2 pb-4 mb-3 border-b border-slate-100 px-1 min-h-[48px]">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="h-10 w-10 shrink-0 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 overflow-hidden">
                      {brandIcon}
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <h1
                        className="font-extrabold text-[15px] leading-snug tracking-tight text-[#0F172A] line-clamp-2 break-words"
                        title={brandName}
                      >
                        {brandName}
                      </h1>
                    </div>
                  </div>

                {/* Collapse Button */}
                <button
                  onClick={onToggleCollapse}
                  className="h-8 w-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center border border-slate-200 transition-colors shadow-xs shrink-0"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
        )}

              {/* =================================================================== */}
              {/* Navigation Items (Perfect Center Alignment & Squircles)              */}
              {/* =================================================================== */}
              <nav className="space-y-1">
                {items.map(item => {
                  return (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      title={isCollapsed ? item.label : undefined}
                      className={cn(
                        'transition-all duration-200 relative group flex items-center',
                        isCollapsed
                          ? 'w-11 h-11 mx-auto justify-center rounded-2xl p-0'
                          : 'w-full py-2.5 px-3.5 justify-between rounded-2xl text-sm font-semibold',
                        item.active
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
                      )}
                    >
                      {/* Icon wrapper with optional absolute pip badge */}
                      <div className="relative flex items-center justify-center shrink-0">
                        <span className="h-5 w-5 flex items-center justify-center">{item.icon}</span>

                        {/* Collapsed Absolute Badge Pip */}
                        {isCollapsed && item.badge !== undefined && (
                          <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs border border-white">
                            {item.badge}
                          </span>
                        )}
                      </div>

                      {/* Expanded Label and Pill Badge */}
                      {!isCollapsed && (
                        <div className="flex items-center justify-between flex-1 min-w-0 ml-3">
                          <span className="truncate">{item.label}</span>
                          {item.badge !== undefined && (
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ml-2',
                                item.active ? 'bg-white/20 text-white' : 'bg-blue-600 text-white',
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Collapsed Hover Tooltip */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#0F172A] text-white text-xs font-medium rounded-xl shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                          {item.label} {item.badge !== undefined && `(${item.badge})`}
                        </div>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* =================================================================== */}
            {/* User Capsule at Bottom (Centered Squircle/Circle in Collapsed Mode)  */}
            {/* =================================================================== */}
            {user && (
              <div className="pt-3 border-t border-slate-100">
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-2xl',
                    isCollapsed ? 'justify-center p-0' : 'p-1.5',
                  )}
                >
                  <div className="h-9 w-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {user.initials}
                  </div>
                  {!isCollapsed && (
                    <div className="min-w-0 flex-1 text-left">
                      <div className="text-xs font-bold text-[#0F172A] truncate">{user.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{user.role}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        );
};
