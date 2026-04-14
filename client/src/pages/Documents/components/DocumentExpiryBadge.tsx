import React from 'react';
import { daysUntil } from '../../../config/documentControlConfig';

export default function DocumentExpiryBadge({ date, label }: { date: string | null; label?: string }) {
  if (!date) return <span className="text-xs text-neutral-400">—</span>;
  const days = daysUntil(date);
  if (days === null) return <span className="text-xs text-neutral-400">—</span>;

  if (days < 0) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">✗ Expired</span>;
  }
  if (days <= 7) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 animate-pulse">🔴 {days}d</span>;
  }
  if (days <= 30) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">⏰ {days}d</span>;
  }
  return <span className="text-xs text-neutral-500">{label || new Date(date).toLocaleDateString()}</span>;
}
