export interface PermitTypeConfig {
  key: string;
  label: string;
  abbr: string;
  color: string;
  lightColor: string;
  textColor: string;
  description: string;
}

export const PERMIT_TYPES: PermitTypeConfig[] = [
  {
    key: 'work_at_height',
    label: 'Work at Height',
    abbr: 'WAH',
    color: '#7C3AED',
    lightColor: '#EDE9FE',
    textColor: '#5B21B6',
    description: 'Work performed at elevated locations',
  },
  {
    key: 'hot_work',
    label: 'Hot Work',
    abbr: 'HW',
    color: '#DC2626',
    lightColor: '#FEE2E2',
    textColor: '#991B1B',
    description: 'Welding, cutting, grinding, open flame',
  },
  {
    key: 'confined_space',
    label: 'Confined Space',
    abbr: 'CS',
    color: '#92400E',
    lightColor: '#FEF3C7',
    textColor: '#78350F',
    description: 'Entry into confined or enclosed spaces',
  },
  {
    key: 'line_break',
    label: 'Line Break',
    abbr: 'LB',
    color: '#0369A1',
    lightColor: '#E0F2FE',
    textColor: '#075985',
    description: 'Breaking into pressurized lines or pipes',
  },
  {
    key: 'excavation',
    label: 'Excavation',
    abbr: 'EXC',
    color: '#1D4ED8',
    lightColor: '#DBEAFE',
    textColor: '#1E40AF',
    description: 'Digging, trenching, or excavation work',
  },
  {
    key: 'lifting',
    label: 'Lifting',
    abbr: 'LFT',
    color: '#B45309',
    lightColor: '#FEF3C7',
    textColor: '#92400E',
    description: 'Crane lifts, rigging, heavy lifting',
  },
  {
    key: 'general',
    label: 'General Permit',
    abbr: 'GEN',
    color: '#065F46',
    lightColor: '#D1FAE5',
    textColor: '#064E3B',
    description: 'General work permit for standard activities',
  },
];

export const getPermitType = (key: string): PermitTypeConfig | undefined =>
  PERMIT_TYPES.find(t => t.key === key);

export const getPermitTypeOptions = () =>
  PERMIT_TYPES.map(t => ({ value: t.key, label: t.label }));

export const PERMIT_STATUSES = ['Draft', 'Active', 'Expired', 'Closed', 'Cancelled'] as const;
export type PermitStatus = typeof PERMIT_STATUSES[number];
