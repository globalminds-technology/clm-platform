import * as React from 'react';
import { HelpCircle, Info } from 'lucide-react';
import { cn } from '../utils/cn';

export interface TooltipProps {
  content: React.ReactNode;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  delayMs?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className,
  delayMs = 150,
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delayMs);
  };

  const hide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 border-x-transparent border-b-transparent border-t-[5px] border-x-[5px]',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 border-x-transparent border-t-transparent border-b-[5px] border-x-[5px]',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-900 border-y-transparent border-r-transparent border-l-[5px] border-y-[5px]',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-900 border-y-transparent border-l-transparent border-r-[5px] border-y-[5px]',
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-[9999] whitespace-normal rounded-xl bg-slate-900/95 backdrop-blur-sm p-3 text-xs font-normal text-slate-100 shadow-2xl border border-slate-700/80 w-64 text-left leading-relaxed animate-in fade-in-0 zoom-in-95',
            positionClasses[position],
            className
          )}
        >
          {content}
          <span
            className={cn(
              'absolute w-0 h-0 border-solid',
              arrowClasses[position]
            )}
          />
        </div>
      )}
    </div>
  );
};

export interface InfoBubbleProps {
  title?: string;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  iconClassName?: string;
  variant?: 'help' | 'info';
}

export const InfoBubble: React.FC<InfoBubbleProps> = ({
  title,
  content,
  position = 'bottom',
  className,
  iconClassName,
  variant = 'help',
}) => {
  const IconComponent = variant === 'info' ? Info : HelpCircle;
  return (
    <Tooltip
      content={
        title ? (
          <div>
            <div className="font-bold text-white mb-0.5">{title}</div>
            <div>{content}</div>
          </div>
        ) : (
          content
        )
      }
      position={position}
      className={className}
    >
      <span className="inline-flex cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-1 align-middle">
        <IconComponent className={cn('h-3.5 w-3.5', iconClassName)} />
      </span>
    </Tooltip>
  );
};
