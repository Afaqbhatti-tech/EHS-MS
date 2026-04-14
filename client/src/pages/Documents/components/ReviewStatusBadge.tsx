import React from 'react';
import { getReviewStatusColor } from '../../../config/documentControlConfig';

export default function ReviewStatusBadge({ status }: { status: string }) {
  const c = getReviewStatusColor(status);
  const icons: Record<string, string> = {
    'Pending': '⏳', 'Approved': '✓', 'Approved with Comments': '✓', 'Rejected': '✗',
  };
  const labels: Record<string, string> = {
    'Pending': 'Pending', 'Approved': 'Approved', 'Approved with Comments': 'Comments', 'Rejected': 'Rejected',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {icons[status] || ''} {labels[status] || status}
    </span>
  );
}
