import React from 'react';

interface WasteCategoryBadgeProps {
  category: string;
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

function getColors(category: string): { bg: string; text: string } {
  switch (category?.toLowerCase()) {
    case 'hazardous':
      return { bg: '#FEE2E2', text: '#991B1B' };
    case 'recyclable':
      return { bg: '#D1FAE5', text: '#065F46' };
    case 'non-hazardous':
      return { bg: '#DBEAFE', text: '#1D4ED8' };
    default:
      return { bg: '#F3F4F6', text: '#374151' };
  }
}

export default function WasteCategoryBadge({ category }: WasteCategoryBadgeProps) {
  const { bg, text } = getColors(category);

  const style: React.CSSProperties = {
    ...baseStyle,
    backgroundColor: bg,
    color: text,
  };

  return <span style={style}>{category || 'Unknown'}</span>;
}
