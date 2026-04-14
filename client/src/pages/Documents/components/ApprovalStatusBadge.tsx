import React from 'react';
import { getReviewStatusColor } from '../../../config/documentControlConfig';

export default function ApprovalStatusBadge({ status }: { status: string }) {
  const c = getReviewStatusColor(status);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {status === 'Approved' ? '✓' : status === 'Rejected' ? '✗' : status === 'Approved with Comments' ? '✓' : '⏳'} {status === 'Approved with Comments' ? 'Comments' : status}
    </span>
  );
}
