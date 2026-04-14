import React from 'react';

interface AmendmentStatusBadgeProps {
  status: string;
  size?: 'xs' | 'sm' | 'md';
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  Draft: {
    bg: '#F3F4F6',
    text: '#374151',
    border: '#D1D5DB',
    icon: '\u270F',
  },
  Submitted: {
    bg: '#DBEAFE',
    text: '#1E40AF',
    border: '#93C5FD',
    icon: '\u{1F4E8}',
  },
  'Under Review': {
    bg: '#FFF7ED',
    text: '#C2410C',
    border: '#FDBA74',
    icon: '\u{1F50D}',
  },
  Approved: {
    bg: '#D1FAE5',
    text: '#065F46',
    border: '#6EE7B7',
    icon: '\u2705',
  },
  Rejected: {
    bg: '#FEE2E2',
    text: '#991B1B',
    border: '#FCA5A5',
    icon: '\u274C',
  },
  'Approved with Comments': {
    bg: '#FFF7ED',
    text: '#C2410C',
    border: '#FDBA74',
    icon: '\u2705',
  },
  Cancelled: {
    bg: '#F3F4F6',
    text: '#6B7280',
    border: '#D1D5DB',
    icon: '\u{1F6AB}',
  },
  Superseded: {
    bg: '#F3F4F6',
    text: '#9CA3AF',
    border: '#E5E7EB',
    icon: '\u{1F504}',
  },
};

const SIZE_FONT: Record<string, number> = {
  xs: 10,
  sm: 11,
  md: 12,
};

const AmendmentStatusBadge: React.FC<AmendmentStatusBadgeProps> = ({ status, size = 'sm' }) => {
  const config = STATUS_CONFIG[status] ?? {
    bg: '#F3F4F6',
    text: '#374151',
    border: '#D1D5DB',
    icon: '\u2022',
  };

  const fontSize = SIZE_FONT[size] ?? 11;

  return (
    <span
      className="amendment-status-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize,
        fontWeight: 600,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
      }}
    >
      <span style={{ fontSize: fontSize - 1, lineHeight: 1 }}>{config.icon}</span>
      {status}
    </span>
  );
};

export default AmendmentStatusBadge;
