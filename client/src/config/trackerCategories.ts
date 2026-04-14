import {
  Forklift, Maximize2, UserCheck, TrendingUp,
  Flame, Shield, AlignJustify,
  Zap, Settings, Circle, Scissors,
  type LucideIcon,
} from 'lucide-react';

export interface TrackerCategoryConfig {
  key: string;
  label: string;
  group: string;
  icon: LucideIcon;
  color: string;
  lightColor: string;
  textColor: string;
  hasPlate: boolean;
  hasSWL: boolean;
  hasTUV: boolean;
  hasCert: boolean;
  inspFreqDays: number;
  tuvFreqDays: number | null;
  templateType: string;
  description: string;
  sortOrder: number;
}

export const TRACKER_CATEGORIES: TrackerCategoryConfig[] = [
  // ── LIFTING & ELEVATED WORK
  {
    key: 'forklift', label: 'Forklifts', group: 'Lifting & Elevated Work',
    icon: Forklift, color: '#DC2626', lightColor: '#FEE2E2', textColor: '#991B1B',
    hasPlate: true, hasSWL: true, hasTUV: true, hasCert: true,
    inspFreqDays: 1, tuvFreqDays: 365, templateType: 'heavy_equipment',
    description: 'Counterbalance and reach forklifts', sortOrder: 10,
  },
  {
    key: 'scissor_lift', label: 'Scissor Lifts', group: 'Lifting & Elevated Work',
    icon: Maximize2, color: '#7C3AED', lightColor: '#EDE9FE', textColor: '#5B21B6',
    hasPlate: true, hasSWL: true, hasTUV: true, hasCert: true,
    inspFreqDays: 7, tuvFreqDays: 180, templateType: 'heavy_equipment',
    description: 'Electric and rough-terrain scissor lifts', sortOrder: 20,
  },
  {
    key: 'man_lift', label: 'Man Lifts / Man Baskets', group: 'Lifting & Elevated Work',
    icon: UserCheck, color: '#065F46', lightColor: '#D1FAE5', textColor: '#047857',
    hasPlate: true, hasSWL: true, hasTUV: true, hasCert: true,
    inspFreqDays: 7, tuvFreqDays: 180, templateType: 'heavy_equipment',
    description: 'Vertical personnel lifts and man baskets', sortOrder: 30,
  },
  {
    key: 'boom_lift', label: 'Boom Lifts / Boom Trucks', group: 'Lifting & Elevated Work',
    icon: TrendingUp, color: '#B45309', lightColor: '#FEF3C7', textColor: '#92400E',
    hasPlate: true, hasSWL: true, hasTUV: true, hasCert: true,
    inspFreqDays: 7, tuvFreqDays: 180, templateType: 'heavy_equipment',
    description: 'Articulating and straight boom lifts', sortOrder: 40,
  },

  // ── SAFETY EQUIPMENT
  {
    key: 'fire_extinguisher', label: 'Fire Extinguishers', group: 'Safety Equipment',
    icon: Flame, color: '#EA580C', lightColor: '#FFF7ED', textColor: '#C2410C',
    hasPlate: false, hasSWL: false, hasTUV: false, hasCert: true,
    inspFreqDays: 30, tuvFreqDays: null, templateType: 'fire_extinguisher',
    description: 'CO2, dry powder, foam, water extinguishers', sortOrder: 50,
  },
  {
    key: 'full_body_harness', label: 'Full Body Harnesses', group: 'Safety Equipment',
    icon: Shield, color: '#BE185D', lightColor: '#FCE7F3', textColor: '#9D174D',
    hasPlate: false, hasSWL: false, hasTUV: false, hasCert: false,
    inspFreqDays: 7, tuvFreqDays: null, templateType: 'harness',
    description: 'Safety harnesses and fall arrest equipment', sortOrder: 60,
  },
  {
    key: 'ladder', label: 'Ladders', group: 'Safety Equipment',
    icon: AlignJustify, color: '#0369A1', lightColor: '#E0F2FE', textColor: '#075985',
    hasPlate: false, hasSWL: true, hasTUV: false, hasCert: false,
    inspFreqDays: 7, tuvFreqDays: null, templateType: 'light_equipment',
    description: 'Step ladders, extension ladders, roof ladders', sortOrder: 70,
  },

  // ── POWER TOOLS
  {
    key: 'welding_machine', label: 'Welding Machines', group: 'Power Tools',
    icon: Zap, color: '#4F46E5', lightColor: '#EEF2FF', textColor: '#4338CA',
    hasPlate: false, hasSWL: false, hasTUV: false, hasCert: false,
    inspFreqDays: 7, tuvFreqDays: null, templateType: 'power_tool',
    description: 'MIG, TIG, arc welding machines', sortOrder: 80,
  },
  {
    key: 'power_tool', label: 'Power Tools', group: 'Power Tools',
    icon: Settings, color: '#374151', lightColor: '#F3F4F6', textColor: '#1F2937',
    hasPlate: false, hasSWL: false, hasTUV: false, hasCert: false,
    inspFreqDays: 7, tuvFreqDays: null, templateType: 'power_tool',
    description: 'Drills, impact drivers, jigsaws', sortOrder: 90,
  },
  {
    key: 'grinder', label: 'Grinders', group: 'Power Tools',
    icon: Circle, color: '#92400E', lightColor: '#FEF3C7', textColor: '#78350F',
    hasPlate: false, hasSWL: false, hasTUV: false, hasCert: false,
    inspFreqDays: 7, tuvFreqDays: null, templateType: 'power_tool',
    description: 'Angle grinders, bench grinders', sortOrder: 100,
  },
  {
    key: 'cutter', label: 'Cutters', group: 'Power Tools',
    icon: Scissors, color: '#0F766E', lightColor: '#CCFBF1', textColor: '#0D9488',
    hasPlate: false, hasSWL: false, hasTUV: false, hasCert: false,
    inspFreqDays: 7, tuvFreqDays: null, templateType: 'power_tool',
    description: 'Disc cutters, pipe cutters, bolt cutters', sortOrder: 110,
  },
];

export function getCategoryByKey(key: string): TrackerCategoryConfig | undefined {
  return TRACKER_CATEGORIES.find(c => c.key === key);
}

export function getCategoryGroup(group: string): TrackerCategoryConfig[] {
  return TRACKER_CATEGORIES.filter(c => c.group === group);
}

export function getCategoryTemplate(key: string): string {
  return getCategoryByKey(key)?.templateType ?? 'light_equipment';
}

export function getInspFreqLabel(key: string): string {
  const days = getCategoryByKey(key)?.inspFreqDays ?? 7;
  if (days <= 1) return 'Daily';
  if (days <= 7) return 'Weekly';
  if (days <= 30) return 'Monthly';
  if (days <= 90) return 'Quarterly';
  return 'Periodic';
}

export const TRACKER_GROUPS = [...new Set(TRACKER_CATEGORIES.map(c => c.group))];

export const TRACKER_STATUSES = ['Active', 'Inactive', 'Out of Service', 'Quarantined', 'Removed from Site', 'Under Maintenance'] as const;
export const TRACKER_CONDITIONS = ['Good', 'Fair', 'Poor', 'Out of Service', 'Quarantined'] as const;
export const TRACKER_INSPECTION_TYPES = [
  'Internal Daily', 'Internal Weekly', 'Internal Monthly',
  'Third Party / TUV', 'Pre-Use Check', 'Post-Incident',
  'Handover', 'Electrical Test', 'Certification Renewal',
] as const;
export const TRACKER_INSPECTION_RESULTS = ['Pass', 'Fail', 'Pass with Issues', 'Requires Action'] as const;
