import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'max-w-[400px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
};

export default function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        className={clsx(
          'relative bg-white rounded-none sm:rounded-[var(--radius-lg)] shadow-xl w-full sm:mx-4 max-h-[100dvh] sm:max-h-[90vh] flex flex-col',
          'animate-in fade-in zoom-in-[0.97] duration-200 ease-out',
          'sm:w-auto sm:min-w-[min(90vw,400px)]',
          sizeStyles[size],
        )}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[18px] sm:text-[20px] font-semibold text-text-primary truncate">{title}</h2>
              {subtitle && <p className="text-[12px] sm:text-[13px] text-text-secondary mt-0.5 line-clamp-2">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:bg-surface-sunken hover:text-text-secondary transition-colors duration-150 shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-border flex items-center justify-end gap-2 sm:gap-3 shrink-0 safe-bottom">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
