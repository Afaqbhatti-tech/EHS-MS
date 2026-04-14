import {
  Construction, Shield, Flame, AlignJustify, Settings, Scissors,
  Link, Zap, Droplets, PlusSquare, Truck, Grid3x3,
  Wrench, HardHat, Drill, Plug, Gauge, Cable, Forklift,
  Eye, Anchor, TrafficCone, ShoppingBag,
  type LucideIcon,
} from 'lucide-react';

export interface ChecklistCategoryConfig {
  key: string;
  label: string;
  fullLabel: string;
  icon: LucideIcon;
  color: string;
  lightColor: string;
  textColor: string;
  hasPlate: boolean;
  hasSWL: boolean;
  hasCert: boolean;
  inspFreqDays: number;
  description: string;
}

export const CHECKLIST_CATEGORIES: ChecklistCategoryConfig[] = [
  {
    key: 'mewp', label: 'MEWP', fullLabel: 'Mobile Elevating Work Platform',
    icon: Construction, color: '#7C3AED', lightColor: '#EDE9FE', textColor: '#5B21B6',
    hasPlate: true, hasSWL: true, hasCert: true, inspFreqDays: 7,
    description: 'Scissor lifts, boom lifts, cherry pickers',
  },
  {
    key: 'full_body_harness', label: 'Full Body Harness', fullLabel: 'Full Body Harness & Fall Arrest Equipment',
    icon: Shield, color: '#DC2626', lightColor: '#FEE2E2', textColor: '#991B1B',
    hasPlate: false, hasSWL: false, hasCert: false, inspFreqDays: 7,
    description: 'Safety harnesses, lanyards, connectors, energy absorbers, anchor devices',
  },
  {
    key: 'fire_extinguisher', label: 'Fire Extinguishers', fullLabel: 'Fire Extinguisher & Suppression Equipment',
    icon: Flame, color: '#EA580C', lightColor: '#FFF7ED', textColor: '#C2410C',
    hasPlate: false, hasSWL: false, hasCert: true, inspFreqDays: 30,
    description: 'All types of fire suppression equipment including CO2, dry powder, foam, water',
  },
  {
    key: 'ladder', label: 'Ladders', fullLabel: 'Ladders & Step Platforms',
    icon: AlignJustify, color: '#0369A1', lightColor: '#E0F2FE', textColor: '#075985',
    hasPlate: false, hasSWL: true, hasCert: false, inspFreqDays: 7,
    description: 'Step ladders, extension ladders, roof ladders, podium steps',
  },
  {
    key: 'vending_machine', label: 'Vending Machines', fullLabel: 'Vending & Dispensing Equipment',
    icon: ShoppingBag, color: '#7C3AED', lightColor: '#EDE9FE', textColor: '#5B21B6',
    hasPlate: false, hasSWL: false, hasCert: false, inspFreqDays: 30,
    description: 'Site vending machines, water dispensers, refreshment equipment',
  },
  {
    key: 'cutter', label: 'Cutters', fullLabel: 'Cutting Tools & Equipment',
    icon: Scissors, color: '#0F766E', lightColor: '#CCFBF1', textColor: '#0D9488',
    hasPlate: false, hasSWL: false, hasCert: false, inspFreqDays: 7,
    description: 'Angle grinder discs, pipe cutters, bolt cutters, cable cutters',
  },
  {
    key: 'grinder', label: 'Grinders', fullLabel: 'Angle Grinders & Bench Grinders',
    icon: Settings, color: '#B45309', lightColor: '#FEF3C7', textColor: '#92400E',
    hasPlate: false, hasSWL: false, hasCert: false, inspFreqDays: 7,
    description: 'Angle grinders, bench grinders, die grinders, surface grinders',
  },
  {
    key: 'lifting_gear', label: 'Hooks & Lifting Gear', fullLabel: 'Hooks, Shackles & Rigging Hardware',
    icon: Link, color: '#1D4ED8', lightColor: '#DBEAFE', textColor: '#1E40AF',
    hasPlate: false, hasSWL: true, hasCert: true, inspFreqDays: 7,
    description: 'Crane hooks, shackles, eye bolts, swivels, turnbuckles, rigging hardware',
  },
  {
    key: 'generator', label: 'Generators', fullLabel: 'Portable & Fixed Generators',
    icon: Zap, color: '#4F46E5', lightColor: '#EEF2FF', textColor: '#4338CA',
    hasPlate: true, hasSWL: false, hasCert: false, inspFreqDays: 7,
    description: 'Portable generators, diesel generators, standby power equipment',
  },
  {
    key: 'spill_kit', label: 'Spill Kits', fullLabel: 'Spill Response Kits & Containment',
    icon: Droplets, color: '#065F46', lightColor: '#D1FAE5', textColor: '#047857',
    hasPlate: false, hasSWL: false, hasCert: false, inspFreqDays: 30,
    description: 'Oil spill kits, chemical spill kits, absorbent materials, containment booms',
  },
  {
    key: 'first_aid_kit', label: 'First Aid Kits', fullLabel: 'First Aid Kit',
    icon: PlusSquare, color: '#BE185D', lightColor: '#FCE7F3', textColor: '#9D174D',
    hasPlate: false, hasSWL: false, hasCert: false, inspFreqDays: 30,
    description: 'First aid boxes, trauma kits, medical supplies',
  },
  {
    key: 'vehicle', label: 'Vehicles', fullLabel: 'Vehicle / Mobile Plant',
    icon: Truck, color: '#374151', lightColor: '#F3F4F6', textColor: '#1F2937',
    hasPlate: true, hasSWL: false, hasCert: true, inspFreqDays: 1,
    description: 'Site vehicles, mobile plant, forklifts',
  },
  {
    key: 'scaffold', label: 'Scaffolding', fullLabel: 'Scaffold Equipment',
    icon: Grid3x3, color: '#92400E', lightColor: '#FEF3C7', textColor: '#78350F',
    hasPlate: false, hasSWL: false, hasCert: false, inspFreqDays: 7,
    description: 'Scaffold tubes, boards, couplers, base plates',
  },
  {
    key: 'welding_equipment', label: 'Welding Equipment', fullLabel: 'Welding Machine & Accessories',
    icon: Wrench, color: '#9333EA', lightColor: '#F3E8FF', textColor: '#7E22CE',
    hasPlate: true, hasSWL: false, hasCert: true, inspFreqDays: 7,
    description: 'Arc welders, MIG/TIG machines, gas sets, welding leads',
  },
  {
    key: 'crane', label: 'Cranes', fullLabel: 'Tower & Mobile Crane',
    icon: Anchor, color: '#1E3A5F', lightColor: '#E0E7FF', textColor: '#1E3A8A',
    hasPlate: true, hasSWL: true, hasCert: true, inspFreqDays: 1,
    description: 'Tower cranes, mobile cranes, overhead cranes, hoists',
  },
  {
    key: 'power_tool', label: 'Power Tools', fullLabel: 'Handheld Power Tool',
    icon: Drill, color: '#A16207', lightColor: '#FEF9C3', textColor: '#854D0E',
    hasPlate: false, hasSWL: false, hasCert: false, inspFreqDays: 7,
    description: 'Drills, impact drivers, reciprocating saws, heat guns',
  },
  {
    key: 'forklift', label: 'Forklifts', fullLabel: 'Forklift / Telehandler',
    icon: Forklift, color: '#166534', lightColor: '#DCFCE7', textColor: '#14532D',
    hasPlate: true, hasSWL: true, hasCert: true, inspFreqDays: 1,
    description: 'Counterbalance forklifts, telehandlers, reach trucks',
  },
  {
    key: 'temporary_electrics', label: 'Temp. Electrics', fullLabel: 'Temporary Electrical Installation',
    icon: Plug, color: '#CA8A04', lightColor: '#FEF9C3', textColor: '#A16207',
    hasPlate: false, hasSWL: false, hasCert: true, inspFreqDays: 30,
    description: 'Distribution boards, RCDs, extension leads, site lighting',
  },
  {
    key: 'air_compressor', label: 'Air Compressors', fullLabel: 'Air Compressor & Pneumatic Tools',
    icon: Gauge, color: '#0891B2', lightColor: '#CFFAFE', textColor: '#0E7490',
    hasPlate: true, hasSWL: false, hasCert: true, inspFreqDays: 30,
    description: 'Air compressors, pneumatic nailers, breakers, hoses',
  },
  {
    key: 'confined_space_kit', label: 'Confined Space', fullLabel: 'Confined Space Entry Kit',
    icon: Eye, color: '#7C2D12', lightColor: '#FFF1F2', textColor: '#9F1239',
    hasPlate: false, hasSWL: false, hasCert: true, inspFreqDays: 7,
    description: 'Gas detectors, rescue tripods, ventilation fans, BA sets',
  },
  {
    key: 'ppe_station', label: 'PPE Stations', fullLabel: 'PPE Storage & Issue Point',
    icon: HardHat, color: '#EA580C', lightColor: '#FFEDD5', textColor: '#C2410C',
    hasPlate: false, hasSWL: false, hasCert: false, inspFreqDays: 30,
    description: 'Hard hats, safety glasses, hi-vis vests, gloves, boots',
  },
  {
    key: 'cable_wire_rope', label: 'Cables & Wire Ropes', fullLabel: 'Cable, Wire Rope & Accessories',
    icon: Cable, color: '#475569', lightColor: '#F1F5F9', textColor: '#334155',
    hasPlate: false, hasSWL: true, hasCert: true, inspFreqDays: 7,
    description: 'Steel wire ropes, electrical cables, winch lines, turnbuckles',
  },
  {
    key: 'traffic_management', label: 'Traffic Management', fullLabel: 'Traffic Control & Barriers',
    icon: TrafficCone, color: '#DC2626', lightColor: '#FEF2F2', textColor: '#B91C1C',
    hasPlate: false, hasSWL: false, hasCert: false, inspFreqDays: 30,
    description: 'Traffic cones, barriers, signage, speed bumps, flagging',
  },
];

export function getCategoryConfig(key: string): ChecklistCategoryConfig | undefined {
  return CHECKLIST_CATEGORIES.find(c => c.key === key);
}

export function getCategoryInspFreq(key: string): number {
  return getCategoryConfig(key)?.inspFreqDays ?? 7;
}

export function getCategoryInspLabel(key: string): string {
  const days = getCategoryInspFreq(key);
  if (days <= 1) return 'Daily';
  if (days <= 7) return 'Weekly';
  if (days <= 30) return 'Monthly';
  if (days <= 90) return 'Quarterly';
  return 'Periodic';
}

/** Categories that have structured inspection templates */
export const STRUCTURED_CATEGORIES = [
  'full_body_harness', 'fire_extinguisher', 'ladder',
  'vending_machine', 'cutter', 'grinder',
  'lifting_gear', 'generator', 'spill_kit', 'mewp',
] as const;

/** Inspection button labels per category */
export const INSPECTION_BUTTON_LABELS: Record<string, string> = {
  full_body_harness: 'Weekly Harness Check',
  fire_extinguisher: 'Monthly Inspection',
  ladder: 'Pre-Use Check',
  vending_machine: 'Monthly Inspection',
  cutter: 'Pre-Use Check',
  grinder: 'Pre-Use Check',
  lifting_gear: 'Weekly Inspection',
  generator: 'Weekly Check',
  spill_kit: 'Monthly Check',
  mewp: 'Daily Pre-Use Check',
};

/** Item sub-types per category */
export const CATEGORY_SUBTYPES: Record<string, string[]> = {
  full_body_harness: ['Full Body Harness', 'Chest Harness', 'Sit Harness', 'Positioning Belt'],
  fire_extinguisher: ['Portable', 'Wheeled', 'Automatic'],
  ladder: ['Step Ladder', 'Extension', 'Roof', 'Podium', 'Combination'],
  cutter: ['Angle Grinder', 'Pipe Cutter', 'Bolt Cutter', 'Cable Cutter', 'Tile Cutter'],
  grinder: ['Angle Grinder', 'Bench Grinder', 'Die Grinder'],
  lifting_gear: ['Crane Hook', 'Grab Hook', 'Eye Hook', 'Swivel Hook', 'Shackle', 'Eye Bolt'],
  generator: ['Portable', 'Diesel', 'Petrol', 'Standby'],
  spill_kit: ['Oil Only', 'General Purpose', 'Hazchem'],
  vending_machine: ['Food/Beverage', 'Water Dispenser', 'PPE Dispenser', 'Tool Dispenser'],
};

/** Inspection type options per category */
export const CATEGORY_INSPECTION_TYPES: Record<string, string[]> = {
  full_body_harness: ['Weekly', 'Periodic', 'Post-Fall'],
  fire_extinguisher: ['Monthly', 'Annual Service'],
  ladder: ['Pre-Use', 'Weekly', 'Post-Incident'],
  vending_machine: ['Monthly', 'Periodic'],
  cutter: ['Pre-Use', 'Weekly', 'Periodic'],
  grinder: ['Pre-Use', 'Weekly', 'Periodic'],
  lifting_gear: ['Weekly', 'Periodic', 'Third Party'],
  generator: ['Weekly', 'Periodic'],
  spill_kit: ['Monthly', 'Periodic'],
};

export const HEALTH_CONDITIONS = ['Good', 'Fair', 'Poor', 'Out of Service', 'Quarantined'] as const;
export const ITEM_STATUSES = ['Active', 'Inactive', 'Out of Service', 'Quarantined', 'Removed from Site'] as const;
export const INSPECTION_TYPES = ['Internal', 'Third Party', 'Pre-Use', 'Post-Incident', 'Periodic', 'Handover'] as const;
export const INSPECTION_RESULTS = ['Pass', 'Fail', 'Pass with Issues', 'Requires Action'] as const;
