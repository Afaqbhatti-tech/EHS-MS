import React from 'react';

interface AmendmentCategoryBadgeProps {
  category: 'Minor' | 'Major';
}

const CATEGORY_CONFIG = {
  Minor: {
    bg: '#DBEAFE',
    text: '#1E40AF',
    label: 'Minor Amendment',
  },
  Major: {
    bg: '#FEE2E2',
    text: '#991B1B',
    label: '\u26A0 Major Amendment',
  },
} as const;

const pulseKeyframes = `
@keyframes majorPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.75; }
}
`;

const AmendmentCategoryBadge: React.FC<AmendmentCategoryBadgeProps> = ({ category }) => {
  const config = CATEGORY_CONFIG[category];
  const isMajor = category === 'Major';

  return (
    <>
      {isMajor && <style>{pulseKeyframes}</style>}
      <span
        className={`amendment-category-badge${isMajor ? ' major-pulse' : ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          borderRadius: 9999,
          fontSize: 11,
          fontWeight: 600,
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
          backgroundColor: config.bg,
          color: config.text,
          animation: isMajor ? 'majorPulse 2s ease-in-out infinite' : undefined,
        }}
      >
        {config.label}
      </span>
    </>
  );
};

export default AmendmentCategoryBadge;
