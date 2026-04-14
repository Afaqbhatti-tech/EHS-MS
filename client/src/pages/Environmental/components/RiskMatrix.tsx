import React from 'react';

interface RiskMatrixProps {
  severity?: number;
  likelihood?: number;
}

function getCellColor(score: number): string {
  if (score <= 3) return '#D1FAE5';
  if (score <= 6) return '#FEF3C7';
  if (score <= 12) return '#FED7AA';
  return '#FEE2E2';
}

function getCellTextColor(score: number): string {
  if (score <= 3) return '#065F46';
  if (score <= 6) return '#92400E';
  if (score <= 12) return '#C2410C';
  return '#991B1B';
}

const tableStyle: React.CSSProperties = {
  borderCollapse: 'separate',
  borderSpacing: 0,
  borderRadius: '8px',
  overflow: 'hidden',
  fontSize: '12px',
  border: '1px solid #E5E7EB',
};

const headerCellStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontWeight: 600,
  textAlign: 'center',
  backgroundColor: '#F9FAFB',
  color: '#374151',
  borderBottom: '1px solid #E5E7EB',
  borderRight: '1px solid #E5E7EB',
  fontSize: '12px',
};

const labelCellStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontWeight: 600,
  textAlign: 'center',
  backgroundColor: '#F9FAFB',
  color: '#374151',
  borderBottom: '1px solid #E5E7EB',
  borderRight: '1px solid #E5E7EB',
  fontSize: '12px',
  whiteSpace: 'nowrap',
};

export default function RiskMatrix({ severity, likelihood }: RiskMatrixProps) {
  const severityValues = [1, 2, 3, 4];
  const likelihoodValues = [4, 3, 2, 1];

  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          <th style={{ ...headerCellStyle, borderRight: '1px solid #E5E7EB' }}>
            L / S
          </th>
          {severityValues.map((s) => (
            <th key={s} style={headerCellStyle}>
              {s}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {likelihoodValues.map((l) => (
          <tr key={l}>
            <td style={labelCellStyle}>{l}</td>
            {severityValues.map((s) => {
              const score = l * s;
              const isHighlighted = severity === s && likelihood === l;
              const cellStyle: React.CSSProperties = {
                padding: '6px 10px',
                textAlign: 'center',
                fontWeight: 600,
                fontSize: '12px',
                backgroundColor: getCellColor(score),
                color: getCellTextColor(score),
                borderBottom: '1px solid #E5E7EB',
                borderRight: '1px solid #E5E7EB',
                ...(isHighlighted
                  ? {
                      outline: '2px solid #1D4ED8',
                      outlineOffset: '-2px',
                      boxShadow: 'inset 0 0 0 1px #1D4ED8',
                    }
                  : {}),
              };
              return (
                <td key={`${l}-${s}`} style={cellStyle}>
                  {score}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
