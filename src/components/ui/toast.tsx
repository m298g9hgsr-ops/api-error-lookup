'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Simple toast state management
type ToastVariant = 'default' | 'destructive' | 'success' | 'warning';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    
    // Auto dismiss
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, toast.duration ?? 5000);
    
    return id;
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastViewport toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Viewport component
const ToastViewport = ({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) => (
  <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 sm:max-w-[420px]">
    {toasts.map((toast) => (
      <Toast key={toast.id} {...toast} onRemove={onRemove} />
    ))}
  </div>
);

// Toast component - inline styles instead of cva
const variantStyles: Record<ToastVariant, string> = {
  default: 'border-border bg-card',
  destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
  success: 'border-success/30 bg-success/5 text-success',
  warning: 'border-warning/30 bg-warning/5 text-warning',
};

const baseToastClass = 'group pointer-events-auto relative flex w-full items-start gap-2.5 rounded-xl border bg-popover p-4 shadow-elevation-3 animate-enter data-[state=open]:animate-in data-[state=closed]:animate-out';

const Toast = React.forwardRef<
  HTMLDivElement,
  Toast & { variant?: ToastVariant; onRemove: (id: string) => void; className?: string }
>(({ className, variant = 'default', title, description, id, onRemove, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(baseToastClass, variantStyles[variant], className)}
      data-state="open"
      {...props}
    >
      <div className="flex-1 space-y-1">
        {title && <div className="text-sm font-semibold">{title}</div>}
        {description && <div className="text-sm opacity-90">{description}</div>}
      </div>
      <button
        onClick={() => onRemove(id)}
        className="absolute right-2 top-2 rounded-lg p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
});
Toast.displayName = 'Toast';

// Export hooks for convenience
export { useToast as toast };
export { ToastViewport };