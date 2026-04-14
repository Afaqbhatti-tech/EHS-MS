import { clsx } from 'clsx';
import type { Classification } from './useImport';

const config: Record<Classification, { label: string; icon: string; className: string }> = {
  new:            { label: 'New',            icon: '✦', className: 'bg-green-100 text-green-800' },
  update:         { label: 'Update',         icon: '✎', className: 'bg-blue-100 text-blue-800' },
  duplicate:      { label: 'Duplicate',      icon: '⟳', className: 'bg-gray-100 text-gray-600' },
  intra_file_dup: { label: 'File Duplicate', icon: '↕', className: 'bg-orange-100 text-orange-800' },
  conflict:       { label: 'Conflict',       icon: '⚠', className: 'bg-amber-100 text-amber-800' },
  error:          { label: 'Error',          icon: '✗', className: 'bg-red-100 text-red-800' },
};

export default function ClassificationBadge({ classification }: { classification: Classification }) {
  const c = config[classification] || config.error;
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold', c.className)}>
      <span>{c.icon}</span> {c.label}
    </span>
  );
}
