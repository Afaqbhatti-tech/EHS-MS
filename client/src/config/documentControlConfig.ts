export const DOCUMENT_TYPES = [
  'HSE Plan',
  'Risk Assessment (RA)',
  'HIRA / JSA',
  'RAMS',
  'Method of Statement (MOS)',
  'Emergency Response Plan (ERP)',
  'Lift Plan',
  'Rescue Plan',
  'Environmental Management Plan',
  'Inspection Checklist',
  'Audit Report',
  'Weekly Report',
  'Monthly Report',
  'Incident Investigation Report',
  'Mock Drill Report',
  'Training Record / Matrix',
  'Campaign Report',
  'Permit to Work (PTW)',
  'Toolbox Talk (TBT)',
  'Standard Operating Procedure (SOP)',
  'Work Instruction',
  'Technical Specification',
  'Drawing / Blueprint',
  'Legal / Regulatory Document',
  'Contract / Agreement',
  'Certificate',
  'Other',
];

export const DOCUMENT_CATEGORIES = [
  'Safety & Health',
  'Environmental',
  'Operational',
  'Technical',
  'Legal / Compliance',
  'Training',
  'Management',
  'Communication',
  'Engineering',
  'Quality',
  'Emergency',
  'Other',
];

export const STATUSES = [
  'Draft',
  'Under Review',
  'Approved',
  'Approved with Comments',
  'Rejected',
  'Active',
  'Superseded',
  'Obsolete',
  'Archived',
];

export const REVIEW_STATUSES = ['Pending', 'Approved', 'Approved with Comments', 'Rejected'];
export const APPROVAL_STATUSES = ['Pending', 'Approved', 'Approved with Comments', 'Rejected'];

export const CONFIDENTIALITY_LEVELS = ['Public', 'Internal', 'Restricted', 'Confidential', 'Top Secret'];

export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export const LANGUAGES = ['English', 'Arabic', 'English & Arabic', 'Other'];

export const LINKED_MODULES = [
  { value: 'rams', label: 'RAMS' },
  { value: 'permit', label: 'Permit' },
  { value: 'mockup', label: 'Mock-Up' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'incident', label: 'Incident' },
  { value: 'violation', label: 'Violation' },
  { value: 'training', label: 'Training' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'mom', label: 'MOM' },
  { value: 'drill', label: 'Mock Drill' },
  { value: 'environmental_incident', label: 'Environmental Incident' },
  { value: 'waste_manifest', label: 'Waste Manifest' },
  { value: 'contractor', label: 'Contractor' },
];

export function getStatusColor(status: string): { bg: string; text: string; border: string; dot: string; pulse?: boolean } {
  const map: Record<string, { bg: string; text: string; border: string; dot: string; pulse?: boolean }> = {
    'Draft': { bg: 'bg-neutral-100', text: 'text-neutral-700', border: 'border-neutral-300', dot: 'bg-neutral-400' },
    'Under Review': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', dot: 'bg-blue-500' },
    'Approved': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', dot: 'bg-purple-500' },
    'Approved with Comments': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', dot: 'bg-amber-500' },
    'Rejected': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500' },
    'Active': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', dot: 'bg-green-500', pulse: true },
    'Superseded': { bg: 'bg-neutral-100', text: 'text-neutral-500', border: 'border-neutral-300', dot: 'bg-neutral-400' },
    'Obsolete': { bg: 'bg-neutral-200', text: 'text-neutral-600', border: 'border-neutral-400', dot: 'bg-neutral-500' },
    'Archived': { bg: 'bg-neutral-100', text: 'text-neutral-500', border: 'border-neutral-300', dot: 'bg-neutral-400' },
  };
  return map[status] || map['Draft'];
}

export function getReviewStatusColor(status: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    'Pending': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'Approved': { bg: 'bg-green-100', text: 'text-green-700' },
    'Approved with Comments': { bg: 'bg-amber-100', text: 'text-amber-700' },
    'Rejected': { bg: 'bg-red-100', text: 'text-red-700' },
  };
  return map[status] || map['Pending'];
}

export function isExpiringSoon(date: string | null): boolean {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 30;
}

export function isOverdueReview(date: string | null): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

export function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
