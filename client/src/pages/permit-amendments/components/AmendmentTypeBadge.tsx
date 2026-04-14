import React from 'react';

interface AmendmentTypeBadgeProps {
  type: string;
  size?: 'xs' | 'sm';
}

const SIZE_FONT: Record<string, number> = {
  xs: 10,
  sm: 11,
};

const AmendmentTypeBadge: React.FC<AmendmentTypeBadgeProps> = ({ type, size = 'sm' }) => {
  const fontSize = SIZE_FONT[size] ?? 11;

  return (
    <span
      className="amendment-type-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize,
        fontWeight: 500,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        backgroundColor: '#F3F4F6',
        color: '#374151',
        border: '1px solid #E5E7EB',
      }}
    >
      {type}
    </span>
  );
};

export default AmendmentTypeBadge;
