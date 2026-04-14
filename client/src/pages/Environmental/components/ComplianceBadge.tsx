import React from 'react';

interface ComplianceBadgeProps {
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

function getColors(status: string): { bg: string; text: string } {
  switch (status?.toLowerCase()) {
    case 'compliant':
      return { bg: '#D1FAE5', text: '#065F46' };
    case 'non-compliant':
      return { bg: '#FEE2E2', text: '#991B1B' };
    case 'pending review':
      return { bg: '#DBEAFE', text: '#1D4ED8' };
    case 'expired':
      return { bg: '#FEE2E2', text: '#991B1B' };
    case 'under action':
      return { bg: '#FFF7ED', text: '#C2410C' };
    case 'partially compliant':
      return { bg: '#FEF3C7', text: '#92400E' };
    default:
      return { bg: '#F3F4F6', text: '#374151' };
  }
}

export default function ComplianceBadge({ status }: ComplianceBadgeProps) {
  const { bg, text } = getColors(status);

  const style: React.CSSProperties = {
    ...baseStyle,
    backgroundColor: bg,
    color: text,
  };

  return <span style={style}>{status || 'Unknown'}</span>;
}
