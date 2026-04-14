import {
  Package, Forklift, Maximize2, UserCheck, TrendingUp,
  Flame, Shield, AlignJustify, Zap, Settings, Circle, Scissors,
  Construction, Link, Droplets, PlusSquare, Truck, Grid3x3,
  Wrench, HardHat, Drill, Plug, Gauge, Cable, Eye, Anchor,
  TrafficCone, ShoppingBag, Hammer, Cog, Box, Layers, Target,
  Warehouse, Cpu, Radio, Thermometer, Wind, Lightbulb, Ruler,
  Mountain, Shovel, Pipette, Siren, BellRing, Hexagon,
  type LucideIcon,
} from 'lucide-react';

/**
 * Maps icon name strings (stored in DB) to Lucide React icon components.
 * Used by both Tracker and Checklist modules for dynamic icon rendering.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  // Core equipment icons
  Package, Forklift, Maximize2, UserCheck, TrendingUp,
  Flame, Shield, AlignJustify, Zap, Settings, Circle, Scissors,
  Construction, Link, Droplets, PlusSquare, Truck, Grid3x3,
  Wrench, HardHat, Drill, Plug, Gauge, Cable, Eye, Anchor,
  TrafficCone, ShoppingBag,
  // Additional icons for user-created categories
  Hammer, Cog, Box, Layers, Target, Warehouse, Cpu, Radio,
  Thermometer, Wind, Lightbulb, Ruler, Mountain, Shovel,
  Pipette, Siren, BellRing, Hexagon,
};

/** Resolve an icon name string to a Lucide component. Falls back to Package. */
export function getIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Package;
  return ICON_MAP[name] || Package;
}

/** List of available icon names for the icon picker UI */
export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

/** Predefined color presets for category creation */
export const COLOR_PRESETS = [
  { color: '#DC2626', light: '#FEE2E2', text: '#991B1B', label: 'Red' },
  { color: '#EA580C', light: '#FFF7ED', text: '#C2410C', label: 'Orange' },
  { color: '#B45309', light: '#FEF3C7', text: '#92400E', label: 'Amber' },
  { color: '#CA8A04', light: '#FEF9C3', text: '#A16207', label: 'Yellow' },
  { color: '#16A34A', light: '#DCFCE7', text: '#15803D', label: 'Green' },
  { color: '#065F46', light: '#D1FAE5', text: '#047857', label: 'Emerald' },
  { color: '#0F766E', light: '#CCFBF1', text: '#0D9488', label: 'Teal' },
  { color: '#0891B2', light: '#CFFAFE', text: '#0E7490', label: 'Cyan' },
  { color: '#0369A1', light: '#E0F2FE', text: '#075985', label: 'Sky' },
  { color: '#1D4ED8', light: '#DBEAFE', text: '#1E40AF', label: 'Blue' },
  { color: '#4F46E5', light: '#EEF2FF', text: '#4338CA', label: 'Indigo' },
  { color: '#7C3AED', light: '#EDE9FE', text: '#5B21B6', label: 'Violet' },
  { color: '#9333EA', light: '#F3E8FF', text: '#7E22CE', label: 'Purple' },
  { color: '#BE185D', light: '#FCE7F3', text: '#9D174D', label: 'Pink' },
  { color: '#374151', light: '#F3F4F6', text: '#1F2937', label: 'Gray' },
  { color: '#1E3A5F', light: '#E0E7FF', text: '#1E3A8A', label: 'Navy' },
];

export const TEMPLATE_TYPES = [
  { value: 'heavy_equipment', label: 'Heavy Equipment', description: 'Plate, SWL, TUV, certificates' },
  { value: 'fire_extinguisher', label: 'Fire Extinguisher', description: 'Weight, type, civil defense tag' },
  { value: 'harness', label: 'Harness / Fall Arrest', description: 'Manufacture/retirement dates, drop arrest' },
  { value: 'light_equipment', label: 'Light Equipment', description: 'SWL, code colour' },
  { value: 'power_tool', label: 'Power Tool', description: 'Voltage, electrical test dates' },
];

export const INSPECTION_FREQ_OPTIONS = [
  { value: 1, label: 'Daily' },
  { value: 7, label: 'Weekly' },
  { value: 14, label: 'Bi-weekly' },
  { value: 30, label: 'Monthly' },
  { value: 90, label: 'Quarterly' },
  { value: 180, label: 'Semi-annual' },
  { value: 365, label: 'Annual' },
];
