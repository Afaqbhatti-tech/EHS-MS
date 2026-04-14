import { useEffect, useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X as XIcon } from 'lucide-react';

// ─── Types ──────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastContextValue {
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
  };
}

// ─── Context ────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}

// ─── Provider ───────────────────────────────────

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = ++nextId;
    setToasts(prev => [...prev, { id, type, message, duration }]);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg: string, d?: number) => add('success', msg, d),
    error: (msg: string, d?: number) => add('error', msg, d ?? 6000),
    warning: (msg: string, d?: number) => add('warning', msg, d),
    info: (msg: string, d?: number) => add('info', msg, d),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container — fixed top-right */}
      <div className="fixed top-4 right-4 z-[70] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Toast Item ─────────────────────────────────

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES: Record<ToastType, string> = {
  success: 'bg-success-50 border-success-200 text-success-800',
  error: 'bg-danger-50 border-danger-200 text-danger-800',
  warning: 'bg-warning-50 border-warning-200 text-warning-800',
  info: 'bg-primary-50 border-primary-200 text-primary-800',
};

const ICON_STYLES: Record<ToastType, string> = {
  success: 'text-success-500',
  error: 'text-danger-500',
  warning: 'text-warning-500',
  info: 'text-primary-500',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [exiting, setExiting] = useState(false);
  const Icon = ICONS[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => setExiting(true), toast.duration - 300);
    const remove = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => { clearTimeout(timer); clearTimeout(remove); };
  }, [toast, onDismiss]);

  return (
    <div
      className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 border rounded-lg shadow-lg transition-all duration-300 ${STYLES[toast.type]} ${
        exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0 animate-in slide-in-from-right'
      }`}
    >
      <Icon size={18} className={`shrink-0 mt-0.5 ${ICON_STYLES[toast.type]}`} />
      <p className="flex-1 text-[13px] font-medium leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors"
      >
        <XIcon size={14} />
      </button>
    </div>
  );
}
