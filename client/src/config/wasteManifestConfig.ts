// ── Waste Manifest Configuration ──────────────────────────

export const WASTE_TYPES = [
  'Used Oil', 'Chemical Waste',
  'Contaminated Rags / PPE', 'Batteries',
  'Paint / Coating Waste', 'Metal Scrap',
  'Plastic Waste', 'General Solid Waste',
  'Hazardous Waste', 'Recyclable Waste',
  'E-Waste / Electronic Waste', 'Sludge',
  'Biomedical / Medical Waste',
  'Asbestos Waste', 'Radioactive Waste',
  'Organic / Food Waste', 'Other',
] as const;

export const WASTE_CATEGORIES = [
  'Hazardous',
  'Non-Hazardous',
  'Recyclable',
  'Special Waste',
  'Inert Waste',
] as const;

export const HAZARD_CLASSIFICATIONS = [
  'Flammable',
  'Toxic / Poisonous',
  'Corrosive',
  'Reactive',
  'Infectious / Biomedical',
  'Radioactive',
  'Oxidising',
  'Environmentally Hazardous',
  'Not Hazardous',
] as const;

export const PHYSICAL_FORMS = [
  'Solid', 'Liquid', 'Sludge',
  'Gas / Vapour', 'Powder', 'Mixed',
] as const;

export const UNITS = [
  'KG', 'Tonnes', 'Litres', 'M3',
  'Drums', 'Bags', 'Containers',
  'Bins', 'Boxes', 'Pallets', 'Skips',
] as const;

export const PACKAGING_TYPES = [
  'Drum (200L)', 'Drum (20L)', 'IBC Container',
  'Tanker', 'Skip', 'Bin', 'Pallet',
  'Bag', 'Box', 'Other',
] as const;

export const TREATMENT_METHODS = [
  'Licensed Landfill',
  'Controlled Incineration',
  'Recycling / Recovery',
  'Chemical Treatment / Neutralisation',
  'Biological Treatment',
  'Physical Treatment',
  'Secure Long-Term Storage',
  'Return to Manufacturer / Supplier',
  'Energy Recovery',
  'Reuse',
  'Other',
] as const;

export const VEHICLE_TYPES = [
  'Tanker', 'Flatbed Truck', 'Tipper Truck',
  'Skip Lorry', 'Cage Truck', 'Refrigerated Truck',
  'Pickup / Van', 'Other',
] as const;

export const STATUSES = [
  'Draft',
  'Prepared',
  'Ready for Dispatch',
  'Dispatched',
  'In Transit',
  'Received',
  'Completed',
  'Cancelled',
  'Rejected',
  'Under Review',
] as const;

export const PRIORITIES = ['Normal', 'Urgent', 'Critical'] as const;

export const COMPLIANCE_STATUSES = ['Compliant', 'Non-Compliant', 'Pending', 'N/A'] as const;

export const ATTACHMENT_CATEGORIES = [
  'Waste Photo',
  'Container Label',
  'Vehicle Photo',
  'Manifest PDF',
  'Transporter License',
  'Transport Permit',
  'Weighing Slip',
  'Handover Receipt',
  'Disposal Certificate',
  'Receiving Note',
  'Compliance Document',
  'Signature / Scan',
  'Other',
] as const;

// ── Status Colors ──────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  'Draft':              { bg: '#F3F4F6', text: '#374151', label: 'Draft' },
  'Prepared':           { bg: '#EDE9FE', text: '#5B21B6', label: 'Prepared' },
  'Ready for Dispatch': { bg: '#DBEAFE', text: '#1E40AF', label: 'Ready' },
  'Dispatched':         { bg: '#FFF7ED', text: '#C2410C', label: 'Dispatched' },
  'In Transit':         { bg: '#FFF3E0', text: '#B45309', label: 'In Transit' },
  'Received':           { bg: '#D1FAE5', text: '#065F46', label: 'Received' },
  'Completed':          { bg: '#065F46', text: '#FFFFFF', label: 'Completed' },
  'Cancelled':          { bg: '#F3F4F6', text: '#6B7280', label: 'Cancelled' },
  'Rejected':           { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected' },
  'Under Review':       { bg: '#FEF3C7', text: '#92400E', label: 'Under Review' },
};

export function getStatusColor(status: string) {
  return STATUS_COLORS[status] || { bg: '#F3F4F6', text: '#374151', label: status };
}

const STATUS_ICONS: Record<string, string> = {
  'Draft':              '✏',
  'Prepared':           '📋',
  'Ready for Dispatch': '✓',
  'Dispatched':         '🚛',
  'In Transit':         '🔄',
  'Received':           '📥',
  'Completed':          '✓',
  'Cancelled':          '✗',
  'Rejected':           '✗',
  'Under Review':       '🔍',
};

export function getStatusIcon(status: string) {
  return STATUS_ICONS[status] || '●';
}

// ── Waste Category Colors ───────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  'Hazardous':      { bg: '#FEE2E2', text: '#991B1B', icon: '⚠' },
  'Non-Hazardous':  { bg: '#F3F4F6', text: '#374151', icon: '●' },
  'Recyclable':     { bg: '#D1FAE5', text: '#065F46', icon: '♻' },
  'Special Waste':  { bg: '#FEF3C7', text: '#92400E', icon: '⚡' },
  'Inert Waste':    { bg: '#DBEAFE', text: '#1E40AF', icon: '●' },
};

export function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] || { bg: '#F3F4F6', text: '#374151', icon: '●' };
}

// ── Compliance Colors ──────────────────────────────────

const COMPLIANCE_COLORS: Record<string, { bg: string; text: string }> = {
  'Compliant':     { bg: '#D1FAE5', text: '#065F46' },
  'Non-Compliant': { bg: '#FEE2E2', text: '#991B1B' },
  'Pending':       { bg: '#FEF3C7', text: '#92400E' },
  'N/A':           { bg: '#F3F4F6', text: '#6B7280' },
};

export function getComplianceColor(status: string) {
  return COMPLIANCE_COLORS[status] || { bg: '#F3F4F6', text: '#6B7280' };
}
