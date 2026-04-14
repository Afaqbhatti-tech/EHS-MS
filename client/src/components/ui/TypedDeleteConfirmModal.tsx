import { useState, useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

interface TypedDeleteConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName?: string;
  itemType?: string;
  message?: string;
  loading?: boolean;
  permanent?: boolean;
}

export default function TypedDeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType,
  message,
  loading = false,
  permanent = false,
}: TypedDeleteConfirmModalProps) {
  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const confirmWord = permanent ? 'PERMANENT DELETE' : 'DELETE';
  const isConfirmed = typed.trim().toUpperCase() === confirmWord;

  useEffect(() => {
    if (open) {
      setTyped('');
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConfirmed && !loading) {
      onConfirm();
    }
  };

  const modalTitle = title || (permanent ? 'Permanently Delete' : 'Delete') + (itemType ? ` ${itemType}` : '');

  return (
    <Modal open={open} onClose={onClose} title={modalTitle} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Warning banner */}
        <div className={`flex items-start gap-3 p-3 rounded-lg ${permanent ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
          <AlertTriangle size={20} className={`shrink-0 mt-0.5 ${permanent ? 'text-red-500' : 'text-amber-500'}`} />
          <div className="text-[13px]">
            {permanent ? (
              <p className="text-red-800 font-medium">
                This action is <strong>irreversible</strong>. The item will be permanently removed from the system.
              </p>
            ) : (
              <p className="text-amber-800">
                This item will be moved to the <strong>Recycle Bin</strong> and can be restored later.
              </p>
            )}
          </div>
        </div>

        {/* Item info */}
        {itemName && (
          <div className="bg-surface-sunken rounded-lg px-3 py-2.5">
            {itemType && <p className="text-[11px] text-text-tertiary uppercase tracking-wider font-medium mb-0.5">{itemType}</p>}
            <p className="text-[14px] font-semibold text-text-primary">{itemName}</p>
          </div>
        )}

        {/* Custom message */}
        {message && <p className="text-[13px] text-text-secondary">{message}</p>}

        {/* Typed confirmation */}
        <div>
          <label className="block text-[13px] text-text-secondary mb-1.5">
            Type <span className="font-mono font-bold text-text-primary bg-surface-sunken px-1.5 py-0.5 rounded">{confirmWord}</span> to confirm
          </label>
          <input
            ref={inputRef}
            type="text"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={confirmWord}
            className="w-full h-10 px-3 border border-border rounded-[var(--radius-md)] text-[14px] text-text-primary
              placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400
              transition-colors duration-150"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 h-9 text-[13px] font-medium text-text-secondary bg-white border border-border
              rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors duration-150"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isConfirmed || loading}
            className="px-4 h-9 text-[13px] font-medium text-white bg-red-600 border border-red-700
              rounded-[var(--radius-md)] hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors duration-150 flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              permanent ? 'Permanently Delete' : 'Delete'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
