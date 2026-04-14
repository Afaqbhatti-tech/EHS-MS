import React from 'react';

interface RiskLevelBadgeProps {
  level: string;
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

function getColors(level: string): { bg: string; text: string } {
  switch (level?.toLowerCase()) {
    case 'low':
      return { bg: '#D1FAE5', text: '#065F46' };
    case 'medium':
      return { bg: '#FFF7ED', text: '#C2410C' };
    case 'high':
      return { bg: '#FEE2E2', text: '#991B1B' };
    case 'critical':
      return { bg: '#991B1B', text: '#FFFFFF' };
    default:
      return { bg: '#F3F4F6', text: '#374151' };
  }
}

export default function RiskLevelBadge({ level }: RiskLevelBadgeProps) {
  const { bg, text } = getColors(level);
  const isCritical = level?.toLowerCase() === 'critical';

  const style: React.CSSProperties = {
    ...baseStyle,
    backgroundColor: bg,
    color: text,
    ...(isCritical ? { animation: 'pulse 2s ease-in-out infinite' } : {}),
  };

  return (
    <>
      {isCritical && (
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }`}</style>
      )}
      <span style={style}>{level || 'Unknown'}</span>
    </>
  );
}
