export interface MewpType {
  key: string;
  label: string;
  abbr: string;
  color: string;
  lightColor: string;
  textColor: string;
  icon: string;
  inspFreqDays: number;
  thirdPartyDays: number;
  description: string;
}

export const MEWP_TYPES: MewpType[] = [
  {
    key: 'forklift',
    label: 'Forklift',
    abbr: 'FLT',
    color: '#D97706',
    lightColor: '#FEF3C7',
    textColor: '#92400E',
    icon: 'truck',
    inspFreqDays: 1,
    thirdPartyDays: 365,
    description: 'Counterbalance and reach forklifts',
  },
  {
    key: 'scissor_lift',
    label: 'Scissor Lift',
    abbr: 'SCL',
    color: '#7C3AED',
    lightColor: '#EDE9FE',
    textColor: '#5B21B6',
    icon: 'arrow-up-down',
    inspFreqDays: 7,
    thirdPartyDays: 180,
    description: 'Electric and diesel scissor lifts',
  },
  {
    key: 'telehandler',
    label: 'Telehandler',
    abbr: 'TLH',
    color: '#0369A1',
    lightColor: '#E0F2FE',
    textColor: '#075985',
    icon: 'move-up-right',
    inspFreqDays: 1,
    thirdPartyDays: 365,
    description: 'Telescopic handlers',
  },
  {
    key: 'man_lift',
    label: 'Man Lift',
    abbr: 'MNL',
    color: '#059669',
    lightColor: '#D1FAE5',
    textColor: '#065F46',
    icon: 'person-standing',
    inspFreqDays: 7,
    thirdPartyDays: 180,
    description: 'Vertical personnel lifts',
  },
  {
    key: 'boom_lift',
    label: 'Boom Lift',
    abbr: 'BML',
    color: '#DC2626',
    lightColor: '#FEE2E2',
    textColor: '#991B1B',
    icon: 'move-diagonal',
    inspFreqDays: 7,
    thirdPartyDays: 180,
    description: 'Articulating and telescopic boom lifts',
  },
];

export function getMewpType(key: string): MewpType | undefined {
  return MEWP_TYPES.find(t => t.key === key);
}

export function getMewpTypeOptions(): { value: string; label: string }[] {
  return MEWP_TYPES.map(t => ({ value: t.key, label: t.label }));
}
