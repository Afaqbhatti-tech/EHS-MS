import React from 'react';
import { getStatusColor } from '../../../config/documentControlConfig';

export default function DocumentStatusBadge({ status }: { status: string }) {
  const c = getStatusColor(status);
  const labels: Record<string, string> = {
    'Draft': 'Draft', 'Under Review': 'Under Review', 'Approved': 'Approved',
    'Approved with Comments': 'Approved*', 'Rejected': 'Rejected',
    'Active': 'Active', 'Superseded': 'Superseded',
    'Obsolete': 'Obsolete', 'Archived': 'Archived',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text} border ${c.border}`}
      style={status === 'Superseded' ? { opacity: 0.7 } : undefined}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${c.pulse ? 'animate-pulse' : ''}`} />
      {labels[status] || status}
    </span>
  );
}
