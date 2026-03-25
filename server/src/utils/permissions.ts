import { query } from '../db/connection.js';

// ─── All permission flags ────────────────────────
export const ALL_PERMISSIONS = [
  // Module Access
  'can_access_ai_intelligence',
  'can_access_observations', 'can_access_permits', 'can_access_manpower', 'can_access_checklists',
  'can_access_mockup_register', 'can_access_weekly_mom',
  'can_access_training', 'can_access_equipment', 'can_access_violations',
  'can_access_incidents', 'can_access_mock_drills',
  'can_access_permit_calendar', 'can_access_permit_amendments',
  'can_access_documents', 'can_access_campaigns', 'can_access_poster_generator',
  'can_access_environmental', 'can_access_waste_manifests', 'can_access_contractor_records',
  'can_access_kpis_reports',
  'can_manage_users', 'can_manage_roles',
  // Feature Permissions
  'can_create_observation', 'can_verify_observation', 'can_close_observation',
  'can_create_incident', 'can_investigate_incident', 'can_issue_warning',
  'can_record_permit', 'can_approve_permit',
  'can_inspect_equipment', 'can_manage_training',
  'can_manage_manpower', 'can_manage_drills', 'can_manage_campaigns',
  'can_upload_documents', 'can_approve_rams', 'can_generate_ai_ra', 'can_review_ai_drafts',
  'can_export_reports', 'can_manage_posters', 'can_view_management_dashboard',
];

// ─── Calculate effective permissions for a user ─────
export async function calculateEffectivePermissions(userId: string): Promise<Record<string, boolean>> {
  // Get user's role
  const users: any[] = await query('SELECT role FROM users WHERE id = ?', [userId]);
  if (!users.length) return {};
  const role = users[0].role;

  // Master bypasses everything
  if (role === 'master') {
    const all: Record<string, boolean> = {};
    for (const p of ALL_PERMISSIONS) all[p] = true;
    return all;
  }

  // Get role defaults from role_permissions table
  const roleRows: any[] = await query('SELECT permissions FROM role_permissions WHERE role = ?', [role]);
  const roleDefaults: Record<string, boolean> = roleRows.length
    ? (typeof roleRows[0].permissions === 'string' ? JSON.parse(roleRows[0].permissions) : roleRows[0].permissions)
    : {};

  // Get user-specific overrides
  const overrideRows: any[] = await query('SELECT overrides FROM user_permission_overrides WHERE user_id = ?', [userId]);
  const overrides: Record<string, boolean> = overrideRows.length
    ? (typeof overrideRows[0].overrides === 'string' ? JSON.parse(overrideRows[0].overrides) : overrideRows[0].overrides)
    : {};

  // Merge: role defaults + user overrides (overrides take precedence)
  const effective: Record<string, boolean> = { ...roleDefaults, ...overrides };
  return effective;
}

// ─── Calculate effective permissions from role name (no user) ─────
export async function calculateRolePermissions(role: string): Promise<Record<string, boolean>> {
  if (role === 'master') {
    const all: Record<string, boolean> = {};
    for (const p of ALL_PERMISSIONS) all[p] = true;
    return all;
  }

  const roleRows: any[] = await query('SELECT permissions FROM role_permissions WHERE role = ?', [role]);
  return roleRows.length
    ? (typeof roleRows[0].permissions === 'string' ? JSON.parse(roleRows[0].permissions) : roleRows[0].permissions)
    : {};
}

// ─── Sync a single user's effective permissions to users.permissions ─────
export async function syncUserPermissions(userId: string): Promise<void> {
  const effective = await calculateEffectivePermissions(userId);
  await query('UPDATE users SET permissions = ? WHERE id = ?', [JSON.stringify(effective), userId]);
}

// ─── Sync all users of a given role ─────
export async function syncRolePermissions(role: string): Promise<void> {
  const users: any[] = await query('SELECT id FROM users WHERE role = ?', [role]);
  for (const u of users) {
    await syncUserPermissions(u.id);
  }
}

// ─── Sync ALL users ─────
export async function syncAllPermissions(): Promise<void> {
  const users: any[] = await query('SELECT id FROM users');
  for (const u of users) {
    await syncUserPermissions(u.id);
  }
}
