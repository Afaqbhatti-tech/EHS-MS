import React from 'react';

export default function RevisionBadge({ revision, isActive, isSuperseded }: { revision: string; isActive?: boolean; isSuperseded?: boolean }) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold';
  if (isActive) return <span className={`${base} bg-green-100 text-green-800 border border-green-300`}>{revision}</span>;
  if (isSuperseded) return <span className={`${base} bg-neutral-100 text-neutral-400 line-through border border-neutral-200`}>{revision}</span>;
  return <span className={`${base} bg-neutral-50 text-neutral-600 border border-dashed border-neutral-300`}>{revision}</span>;
}
