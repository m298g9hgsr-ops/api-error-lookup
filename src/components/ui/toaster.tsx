'use client';

import { useToast } from '@/hooks/use-toast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 sm:max-w-[420px]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-elevation-3 animate-slide-right ${
            toast.variant === 'destructive'
              ? 'bg-destructive/10 border border-destructive/30 text-destructive'
              : toast.variant === 'success'
              ? 'bg-success/10 border border-success/30 text-success'
              : 'bg-card border border-border'
          }`}
        >
          <span className="text-sm font-medium">{toast.title}</span>
          {toast.description && <span className="text-sm opacity-90">{toast.description}</span>}
        </div>
      ))}
    </div>
  );
}