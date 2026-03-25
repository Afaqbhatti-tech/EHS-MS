export const ROLES = [
  { value: 'master', label: 'Master' },
  { value: 'system_admin', label: 'System Administrator' },
  { value: 'ehs_manager', label: 'EHS Manager' },
  { value: 'safety_officer', label: 'Safety Officer' },
  { value: 'officer', label: 'Officer' },
  { value: 'site_engineer', label: 'Site Engineer' },
  { value: 'contractor_hse', label: 'Contractor HSE Rep' },
  { value: 'client_consultant', label: 'Client / Consultant' },
  { value: 'client', label: 'Client' },
  { value: 'viewer_management', label: 'Viewer / Management' },
  { value: 'lead', label: 'Lead' },
  { value: 'office', label: 'Office' },
];

// Maps routes to the permission flag that controls sidebar visibility
export const ROUTE_PERMISSION_MAP: Record<string, string> = {
  '/dashboard': '*',
  '/ai-intelligence': 'can_access_ai_intelligence',
  '/observations': 'can_access_observations',
  '/observation-analytics': 'can_access_observations',
  '/permits': 'can_access_permits',
  '/manpower': 'can_access_manpower',
  '/checklists': 'can_access_checklists',
  '/mockup-register': 'can_access_mockup_register',
  '/weekly-mom': 'can_access_weekly_mom',
  '/training-matrix': 'can_access_training',
  '/equipment': 'can_access_equipment',
  '/violations': 'can_access_violations',
  '/incidents': 'can_access_incidents',
  '/incident-analytics': 'can_access_incidents',
  '/mock-drills': 'can_access_mock_drills',
  '/permits/calendar': 'can_access_permit_calendar',
  '/permit-amendments': 'can_access_permit_amendments',
  '/document-control': 'can_access_documents',
  '/rams-board': 'can_access_rams',
  '/campaigns': 'can_access_campaigns',
  '/poster-generator': 'can_access_poster_generator',
  '/environmental': 'can_access_environmental',
  '/environmental/waste-manifests': 'can_access_waste_manifests',
  '/environmental/contractor-records': 'can_access_contractor_records',
  '/kpis-reports': 'can_access_kpis_reports',
  '/reports': 'can_access_kpis_reports',
  '/admin/users': 'can_manage_users',
  '/admin/roles': 'can_manage_roles',
};

// Permission groups for the Role Management UI
export const PERMISSION_GROUPS = [
  {
    label: 'Module Access — Overview',
    perms: ['can_access_ai_intelligence'],
  },
  {
    label: 'Module Access — Daily Operations',
    perms: ['can_access_observations', 'can_access_permits', 'can_access_manpower', 'can_access_checklists'],
  },
  {
    label: 'Module Access — Procedures & Meetings',
    perms: ['can_access_mockup_register', 'can_access_weekly_mom'],
  },
  {
    label: 'Module Access — People & Assets',
    perms: ['can_access_training', 'can_access_equipment', 'can_access_violations'],
  },
  {
    label: 'Module Access — Incidents & Emergency',
    perms: ['can_access_incidents', 'can_access_mock_drills'],
  },
  {
    label: 'Module Access — Permits',
    perms: ['can_access_permit_calendar', 'can_access_permit_amendments'],
  },
  {
    label: 'Module Access — Documents',
    perms: ['can_access_documents', 'can_access_rams', 'can_access_campaigns', 'can_access_poster_generator'],
  },
  {
    label: 'Module Access — Environmental',
    perms: ['can_access_environmental', 'can_access_waste_manifests', 'can_access_contractor_records'],
  },
  {
    label: 'Module Access — Analytics & Admin',
    perms: ['can_access_kpis_reports', 'can_manage_users', 'can_manage_roles'],
  },
  {
    label: 'Feature — Observations',
    perms: ['can_create_observation', 'can_verify_observation', 'can_close_observation'],
  },
  {
    label: 'Feature — Incidents & Violations',
    perms: ['can_create_incident', 'can_investigate_incident', 'can_issue_warning'],
  },
  {
    label: 'Feature — Permits',
    perms: ['can_record_permit', 'can_approve_permit'],
  },
  {
    label: 'Feature — Equipment & Training',
    perms: ['can_inspect_equipment', 'can_manage_training'],
  },
  {
    label: 'Feature — Operations',
    perms: ['can_manage_manpower', 'can_manage_drills', 'can_manage_campaigns'],
  },
  {
    label: 'Feature — Documents & AI',
    perms: ['can_upload_documents', 'can_upload_rams', 'can_approve_rams', 'can_generate_ai_ra', 'can_review_ai_drafts'],
  },
  {
    label: 'Feature — Reporting & Dashboard',
    perms: ['can_export_reports', 'can_manage_posters', 'can_view_management_dashboard'],
  },
];

export function formatPermLabel(perm: string): string {
  return perm
    .replace(/^can_(access_|manage_)?/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
