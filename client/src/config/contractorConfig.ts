// ── Contractor Records Configuration ──────────────────────────

export const COMPANY_TYPES = [
  'Civil Contractor',
  'Mechanical Contractor',
  'Electrical Contractor',
  'Plumbing Contractor',
  'Fire Fighting Contractor',
  'Lifting Contractor',
  'Scaffolding Contractor',
  'Housekeeping Contractor',
  'Waste Contractor',
  'Safety Services Contractor',
  'General Contractor',
  'Vendor / Supplier',
  'Transport Contractor',
  'Fit-Out Contractor',
  'Rail / Infrastructure Contractor',
  'Other',
] as const;

export const SCOPES_OF_WORK = [
  'Civil Works',
  'Mechanical Works',
  'Electrical Works',
  'Plumbing',
  'Scaffolding',
  'Lifting Operations',
  'Welding & Fabrication',
  'Driving / Logistics',
  'Waste Disposal',
  'Housekeeping',
  'Maintenance',
  'Emergency Support',
  'Rail / Track Works',
  'Fit-Out',
  'Fire Protection',
  'HVAC',
  'Other',
] as const;

export const DOCUMENT_TYPES = [
  'Trade License',
  'Company Registration Certificate',
  'Tax / VAT Certificate',
  'Public Liability Insurance',
  'Workers Compensation Insurance',
  'Vehicle Insurance',
  'Equipment Insurance',
  'Safety Certification',
  'Environmental Permit',
  'Transport Permit',
  'Waste Disposal Authorization',
  'ISO Certification',
  'Contract Agreement',
  'Bank Guarantee',
  'Performance Bond',
  'Other Approval',
] as const;

export const CONTACT_ROLES = [
  'Primary Contact',
  'Site Supervisor',
  'HSE / Safety Representative',
  'Project Manager',
  'Operations Manager',
  'Emergency Contact',
  'Finance / Commercial',
  'HR Representative',
  'Other',
] as const;

export const CONTRACTOR_STATUSES = [
  'Draft',
  'Under Review',
  'Approved',
  'Active',
  'Inactive',
  'Suspended',
  'Expired',
  'Rejected',
  'Blacklisted',
] as const;

export const COMPLIANCE_STATUSES = [
  'Compliant',
  'Partially Compliant',
  'Non-Compliant',
  'Under Review',
  'Suspended',
] as const;

export const DOCUMENT_STATUSES = [
  'Valid',
  'Expiring Soon',
  'Expired',
  'Under Review',
  'Rejected',
] as const;

export function getStatusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case 'Draft':        return { bg: '#F3F4F6', text: '#374151' };
    case 'Under Review': return { bg: '#DBEAFE', text: '#1E40AF' };
    case 'Approved':     return { bg: '#EDE9FE', text: '#5B21B6' };
    case 'Active':       return { bg: '#D1FAE5', text: '#065F46' };
    case 'Inactive':     return { bg: '#F3F4F6', text: '#6B7280' };
    case 'Suspended':    return { bg: '#FEF3C7', text: '#92400E' };
    case 'Expired':      return { bg: '#FEE2E2', text: '#991B1B' };
    case 'Rejected':     return { bg: '#FEE2E2', text: '#991B1B' };
    case 'Blacklisted':  return { bg: '#111827', text: '#FFFFFF' };
    default:             return { bg: '#F3F4F6', text: '#374151' };
  }
}

export function getComplianceColor(status: string): { bg: string; text: string } {
  switch (status) {
    case 'Compliant':           return { bg: '#D1FAE5', text: '#065F46' };
    case 'Partially Compliant': return { bg: '#FEF3C7', text: '#92400E' };
    case 'Non-Compliant':       return { bg: '#FEE2E2', text: '#991B1B' };
    case 'Under Review':        return { bg: '#DBEAFE', text: '#1E40AF' };
    case 'Suspended':           return { bg: '#FEE2E2', text: '#991B1B' };
    default:                    return { bg: '#F3F4F6', text: '#374151' };
  }
}

export function getDocumentStatusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case 'Valid':          return { bg: '#D1FAE5', text: '#065F46' };
    case 'Expiring Soon':  return { bg: '#FEF3C7', text: '#92400E' };
    case 'Expired':        return { bg: '#FEE2E2', text: '#991B1B' };
    case 'Under Review':   return { bg: '#DBEAFE', text: '#1E40AF' };
    case 'Rejected':       return { bg: '#FEE2E2', text: '#991B1B' };
    default:               return { bg: '#F3F4F6', text: '#374151' };
  }
}

export function isExpiringSoon(date: string | null): boolean {
  if (!date) return false;
  const expiry = new Date(date);
  const now = new Date();
  const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 && diff <= 30;
}

export function isExpired(date: string | null): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}
