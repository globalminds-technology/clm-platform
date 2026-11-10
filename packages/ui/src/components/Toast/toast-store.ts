import { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  duration?: number;
  createdAt: number;
}

type Listener = (toasts: ToastItem[]) => void;

class ToastStore {
  private toasts: ToastItem[] = [];
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.toasts);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  add(toast: Omit<ToastItem, 'id' | 'createdAt'>): string {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = {
      ...toast,
      id,
      duration: toast.duration ?? 4500,
      createdAt: Date.now(),
    };

    // Keep up to 5 concurrent toasts
    this.toasts = [newToast, ...this.toasts.slice(0, 4)];
    this.notify();

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, newToast.duration);
    }

    return id;
  }

  dismiss(id?: string) {
    if (id) {
      this.toasts = this.toasts.filter(t => t.id !== id);
    } else {
      this.toasts = [];
    }
    this.notify();
  }

  success(title: string, description?: string, options?: Partial<ToastItem>): string {
    return this.add({ title, description, type: 'success', ...options });
  }

  error(title: string, description?: string, options?: Partial<ToastItem>): string {
    return this.add({ title, description, type: 'error', ...options });
  }

  warning(title: string, description?: string, options?: Partial<ToastItem>): string {
    return this.add({ title, description, type: 'warning', ...options });
  }

  info(title: string, description?: string, options?: Partial<ToastItem>): string {
    return this.add({ title, description, type: 'info', ...options });
  }
}

export const toast = new ToastStore();

export function useToasts(): ToastItem[] {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toast.subscribe(setToasts);
  }, []);

  return toasts;
}

