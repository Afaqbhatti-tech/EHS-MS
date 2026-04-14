import React from 'react';

interface EnvStatusBadgeProps {
  status: string;
}

const baseStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '2px 10px',
  borderRadius: '9999px',
  fontSize: '12px',
  fontWeight: 600,
  lineHeight: '20px',
  whiteSpace: 'nowrap',
};

const BLUE_STATUSES = [
  'active', 'open', 'reported', 'planned',
];

const AMBER_STATUSES = [
  'under review', 'under investigation', 'in progress', 'in storage',
  'pending collection', 'pending', 'warning',
];

const GREEN_STATUSES = [
  'controlled', 'compliant', 'achieved', 'collected',
  'closed', 'completed', 'recycled', 'disposed',
];

const RED_STATUSES = [
  'overdue', 'non-compliant', 'critical', 'expired',
  'reopened', 'action required', 'delayed',
];

const INDIGO_STATUSES = [
  'action assigned',
];

function getColors(status: string): { bg: string; text: string } {
  const normalized = status?.toLowerCase() ?? '';

  if (BLUE_STATUSES.includes(normalized)) {
    return { bg: '#DBEAFE', text: '#1D4ED8' };
  }
  if (AMBER_STATUSES.includes(normalized)) {
    return { bg: '#FEF3C7', text: '#92400E' };
  }
  if (GREEN_STATUSES.includes(normalized)) {
    return { bg: '#D1FAE5', text: '#065F46' };
  }
  if (RED_STATUSES.includes(normalized)) {
    return { bg: '#FEE2E2', text: '#991B1B' };
  }
  if (INDIGO_STATUSES.includes(normalized)) {
    return { bg: '#E0E7FF', text: '#3730A3' };
  }
  return { bg: '#F3F4F6', text: '#374151' };
}

export default function EnvStatusBadge({ status }: EnvStatusBadgeProps) {
  const { bg, text } = getColors(status);

  const style: React.CSSProperties = {
    ...baseStyle,
    backgroundColor: bg,
    color: text,
  };

  return <span style={style}>{status || 'Unknown'}</span>;
}
