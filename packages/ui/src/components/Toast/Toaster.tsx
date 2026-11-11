import { useToasts } from './toast-store';
import { Toast } from './Toast';

export interface ToasterProps {
  position?: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-left';
}

export function Toaster({ position = 'top-right' }: ToasterProps) {
  const toasts = useToasts();

  if (toasts.length === 0) return null;

  const positionClasses = {
    'top-right': 'top-4 right-4 items-end',
    'top-center': 'top-4 left-1/2 -translate-x-1/2 items-center',
    'bottom-right': 'bottom-4 right-4 items-end',
    'bottom-left': 'bottom-4 left-4 items-start',
  };

  return (
    <div
      aria-live="polite"
      className={`fixed z-[9999] pointer-events-none flex flex-col gap-3 max-w-md w-full px-4 sm:px-0 transition-all duration-300 ${positionClasses[position]}`}
    >
      {toasts.map(item => (
        <Toast key={item.id} item={item} />
      ))}
    </div>
  );
}
