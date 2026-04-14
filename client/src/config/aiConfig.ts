// AI Intelligence Module Configuration

export const QUERY_SCOPES: Record<string, string> = {
  all:           'Entire System',
  observations:  'Observations',
  permits:       'Permits',
  incidents:     'Incidents',
  violations:    'Violations',
  training:      'Training',
  campaigns:     'Campaigns',
  mom:           'Weekly MOM',
  environmental: 'Environmental',
  waste:         'Waste Manifests',
  contractors:   'Contractor Records',
  documents:     'Document Control',
  rams:          'RAMS',
  mockups:       'Mockups',
  inspections:   'Inspections',
  drills:        'Mock Drills / ERP',
};

export const INSIGHT_TYPES = [
  'Risk Pattern',
  'Compliance Alert',
  'Performance Trend',
  'Expiry Warning',
  'Training Gap',
  'Action Overdue',
  'Incident Pattern',
  'Violation Pattern',
  'Environmental Alert',
  'Document Alert',
  'Contractor Alert',
  'Waste Compliance',
] as const;

export const SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'Info'] as const;

export const RECOMMENDATION_TYPES = [
  'Launch Safety Campaign',
  'Schedule Training',
  'Review Contractor',
  'Update RAMS / Document',
  'Conduct Inspection',
  'Conduct Mock Drill',
  'Escalate to Management',
  'Issue Warning',
  'Renew Document / License',
  'Add Observation Drive',
  'Review Permit',
  'Environmental Action',
  'Other',
] as const;

export const ALERT_TYPES = [
  'Document Expiry',
  'Certificate Expiry',
  'Contract Expiry',
  'Review Overdue',
  'Repeated Violation',
  'High-Risk Incident',
  'Compliance Drop',
  'Training Expiry',
  'Overdue Action',
  'Waste Manifest Delay',
  'Contractor Suspension',
  'Mass Incident Event',
] as const;

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'Critical': return '#DC2626';
    case 'High':     return '#EA580C';
    case 'Medium':   return '#D97706';
    case 'Low':      return '#16A34A';
    case 'Info':     return '#0284C7';
    default:         return '#6B7280';
  }
}

export function getSeverityBg(severity: string): string {
  switch (severity) {
    case 'Critical': return 'rgba(220,38,38,0.1)';
    case 'High':     return 'rgba(234,88,12,0.1)';
    case 'Medium':   return 'rgba(217,119,6,0.1)';
    case 'Low':      return 'rgba(22,163,74,0.1)';
    case 'Info':     return 'rgba(2,132,199,0.1)';
    default:         return 'rgba(107,114,128,0.1)';
  }
}

export function getInsightTypeIcon(type: string): string {
  switch (type) {
    case 'Risk Pattern':       return '⚠';
    case 'Compliance Alert':   return '📋';
    case 'Performance Trend':  return '📈';
    case 'Expiry Warning':     return '⏰';
    case 'Training Gap':       return '🎓';
    case 'Action Overdue':     return '🕐';
    case 'Incident Pattern':   return '🔴';
    case 'Violation Pattern':  return '🚫';
    case 'Environmental Alert':return '🌿';
    case 'Document Alert':     return '📄';
    case 'Contractor Alert':   return '🏗';
    case 'Waste Compliance':   return '♻';
    default:                   return '💡';
  }
}
