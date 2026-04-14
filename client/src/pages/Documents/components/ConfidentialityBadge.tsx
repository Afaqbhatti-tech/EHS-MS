import React from 'react';

const styles: Record<string, { bg: string; text: string; icon: string }> = {
  'Public': { bg: 'bg-green-100', text: 'text-green-700', icon: '🌐' },
  'Internal': { bg: 'bg-blue-100', text: 'text-blue-700', icon: '🔒' },
  'Restricted': { bg: 'bg-amber-100', text: 'text-amber-700', icon: '🔐' },
  'Confidential': { bg: 'bg-red-100', text: 'text-red-700', icon: '⛔' },
  'Top Secret': { bg: 'bg-red-200', text: 'text-red-900', icon: '⛔' },
};

export default function ConfidentialityBadge({ level, large }: { level: string; large?: boolean }) {
  const s = styles[level] || styles['Internal'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${s.bg} ${s.text} ${large ? 'text-sm' : 'text-xs'}`}>
      {s.icon} {level}
    </span>
  );
}
