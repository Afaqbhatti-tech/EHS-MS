import React from 'react';

interface RevisionBadgeProps {
  revision: number;
  isActive?: boolean;
}

const RevisionBadge: React.FC<RevisionBadgeProps> = ({ revision, isActive = false }) => {
  const label = isActive ? `Rev. ${revision} \u2605` : `Rev. ${revision}`;

  return (
    <span
      className="revision-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 11,
        fontFamily: 'monospace',
        fontWeight: 700,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        backgroundColor: isActive ? '#16A34A' : '#F0FDF4',
        color: isActive ? '#FFFFFF' : '#15803D',
        border: isActive ? '1px solid #16A34A' : '1px solid #BBF7D0',
      }}
    >
      {label}
    </span>
  );
};

export default RevisionBadge;
