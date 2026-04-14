import { clsx } from 'clsx';
import type { ImportBatch, Classification } from './useImport';

interface Props {
  batch: ImportBatch;
  activeFilter: Classification | 'all';
  onFilterChange: (filter: Classification | 'all') => void;
}

const buckets: { key: Classification | 'all'; icon: string; label: string; countKey: keyof ImportBatch; style: string; activeStyle: string }[] = [
  { key: 'all',           icon: '',  label: 'All',         countKey: 'total_rows',          style: 'border-gray-200 text-gray-700',  activeStyle: 'bg-gray-100 ring-2 ring-gray-400' },
  { key: 'new',           icon: '✦', label: 'New',         countKey: 'new_count',           style: 'border-green-300 text-green-700', activeStyle: 'bg-green-50 ring-2 ring-green-400' },
  { key: 'update',        icon: '✎', label: 'Updates',     countKey: 'update_count',        style: 'border-blue-300 text-blue-700',   activeStyle: 'bg-blue-50 ring-2 ring-blue-400' },
  { key: 'duplicate',     icon: '⟳', label: 'Duplicates',  countKey: 'duplicate_count',     style: 'border-gray-200 text-gray-500',   activeStyle: 'bg-gray-50 ring-2 ring-gray-300' },
  { key: 'conflict',      icon: '⚠', label: 'Conflicts',   countKey: 'conflict_count',      style: 'border-amber-300 text-amber-700', activeStyle: 'bg-amber-50 ring-2 ring-amber-400' },
  { key: 'intra_file_dup',icon: '↕', label: 'File Dups',   countKey: 'intra_file_dup_count',style: 'border-orange-300 text-orange-700',activeStyle: 'bg-orange-50 ring-2 ring-orange-400' },
  { key: 'error',         icon: '✗', label: 'Errors',      countKey: 'error_count',         style: 'border-red-300 text-red-700',     activeStyle: 'bg-red-50 ring-2 ring-red-400' },
];

export default function ImportSummaryBar({ batch, activeFilter, onFilterChange }: Props) {
  return (
    <div className="flex gap-2 flex-wrap pb-3 mb-3 border-b border-gray-100">
      {buckets.map(b => {
        const count = batch[b.countKey] as number;
        if (b.key !== 'all' && count === 0) return null;
        const isActive = activeFilter === b.key;
        return (
          <button
            key={b.key}
            onClick={() => onFilterChange(b.key)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-bold transition-all cursor-pointer',
              b.style,
              isActive && b.activeStyle,
              !isActive && 'hover:opacity-80',
              b.key === 'conflict' && count > 0 && !isActive && 'animate-pulse',
            )}
          >
            {b.icon && <span>{b.icon}</span>}
            <span>{count}</span>
            <span className="font-medium">{b.label}</span>
          </button>
        );
      })}
    </div>
  );
}
