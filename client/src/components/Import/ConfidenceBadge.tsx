import { clsx } from 'clsx';
import type { Confidence } from './useImport';

const config: Record<Confidence, { label: string; className: string }> = {
  strong:   { label: 'Strong',   className: 'bg-green-50 text-green-700 border-green-200' },
  moderate: { label: 'Moderate', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  weak:     { label: 'Weak',     className: 'bg-amber-50 text-amber-700 border-amber-200' },
  none:     { label: '—',        className: 'bg-gray-50 text-gray-500 border-gray-200' },
};

export default function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const c = config[confidence] || config.none;
  return (
    <span className={clsx('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border', c.className)}>
      {c.label}
    </span>
  );
}
