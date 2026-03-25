import { query, pool } from './connection.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

// ─── Helper: build a permissions object with only specified keys as true ─────
function makePerms(trueKeys: string[]): Record<string, boolean> {
  const ALL = [
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
    'can_create_observation', 'can_verify_observation', 'can_close_observation',
    'can_create_incident', 'can_investigate_incident', 'can_issue_warning',
    'can_record_permit', 'can_approve_permit',
    'can_inspect_equipment', 'can_manage_training',
    'can_manage_manpower', 'can_manage_drills', 'can_manage_campaigns',
    'can_upload_documents', 'can_approve_rams', 'can_generate_ai_ra', 'can_review_ai_drafts',
    'can_export_reports', 'can_manage_posters', 'can_view_management_dashboard',
  ];
  const result: Record<string, boolean> = {};
  for (const p of ALL) result[p] = trueKeys.includes(p);
  return result;
}

// ─── Full-access keys (all except can_manage_roles) ─────
const FULL_MODULE = [
  'can_access_ai_intelligence', 'can_access_observations', 'can_access_permits',
  'can_access_manpower', 'can_access_checklists', 'can_access_mockup_register',
  'can_access_weekly_mom', 'can_access_training', 'can_access_equipment',
  'can_access_violations', 'can_access_incidents', 'can_access_mock_drills',
  'can_access_permit_calendar', 'can_access_permit_amendments', 'can_access_documents',
  'can_access_campaigns', 'can_access_poster_generator', 'can_access_environmental',
  'can_access_waste_manifests', 'can_access_contractor_records', 'can_access_kpis_reports',
  'can_manage_users',
];

const FULL_FEATURES = [
  'can_create_observation', 'can_verify_observation', 'can_close_observation',
  'can_create_incident', 'can_investigate_incident', 'can_issue_warning',
  'can_record_permit', 'can_approve_permit', 'can_inspect_equipment',
  'can_manage_training', 'can_manage_manpower', 'can_manage_drills',
  'can_manage_campaigns', 'can_upload_documents', 'can_approve_rams',
  'can_generate_ai_ra', 'can_review_ai_drafts', 'can_export_reports',
  'can_manage_posters', 'can_view_management_dashboard',
];

// ─── Role default permission definitions ─────
const ROLE_DEFAULTS: Record<string, Record<string, boolean>> = {
  master: makePerms([...FULL_MODULE, 'can_manage_roles', ...FULL_FEATURES]),

  system_admin: makePerms([...FULL_MODULE, ...FULL_FEATURES]),

  ehs_manager: makePerms([...FULL_MODULE, ...FULL_FEATURES]),

  safety_officer: makePerms([
    // Module access
    'can_access_observations', 'can_access_permits', 'can_access_manpower', 'can_access_checklists',
    'can_access_mockup_register', 'can_access_weekly_mom',
    'can_access_training', 'can_access_equipment', 'can_access_violations',
    'can_access_incidents', 'can_access_mock_drills',
    'can_access_permit_calendar', 'can_access_permit_amendments',
    'can_access_documents',
    'can_access_environmental', 'can_access_waste_manifests', 'can_access_contractor_records',
    // Feature permissions
    'can_create_observation', 'can_verify_observation', 'can_close_observation',
    'can_create_incident', 'can_issue_warning',
    'can_record_permit', 'can_inspect_equipment',
    'can_manage_training', 'can_manage_manpower', 'can_manage_drills',
    'can_upload_documents', 'can_export_reports',
  ]),

  officer: makePerms([
    // Module access (same as safety_officer)
    'can_access_observations', 'can_access_permits', 'can_access_manpower', 'can_access_checklists',
    'can_access_mockup_register', 'can_access_weekly_mom',
    'can_access_training', 'can_access_equipment', 'can_access_violations',
    'can_access_incidents', 'can_access_mock_drills',
    'can_access_permit_calendar', 'can_access_permit_amendments',
    'can_access_documents',
    'can_access_environmental', 'can_access_waste_manifests', 'can_access_contractor_records',
    // Feature permissions
    'can_create_observation', 'can_verify_observation', 'can_close_observation',
    'can_create_incident', 'can_issue_warning',
    'can_record_permit', 'can_inspect_equipment',
    'can_manage_training', 'can_manage_manpower', 'can_manage_drills',
    'can_upload_documents', 'can_export_reports',
  ]),

  site_engineer: makePerms([
    'can_access_observations', 'can_access_permits',
    'can_access_mockup_register', 'can_access_permit_calendar',
    'can_access_documents',
    'can_create_observation', 'can_record_permit', 'can_upload_documents',
  ]),

  contractor_hse: makePerms([
    'can_access_observations', 'can_access_permits', 'can_access_manpower',
    'can_access_training', 'can_access_equipment', 'can_access_incidents',
    'can_access_documents',
    'can_create_observation', 'can_create_incident', 'can_record_permit',
    'can_inspect_equipment', 'can_manage_training', 'can_manage_manpower',
    'can_upload_documents',
  ]),

  client_consultant: makePerms([
    'can_access_documents', 'can_access_environmental', 'can_access_kpis_reports',
    'can_review_ai_drafts', 'can_export_reports', 'can_view_management_dashboard',
  ]),

  viewer_management: makePerms([
    'can_access_environmental', 'can_access_kpis_reports',
    'can_export_reports', 'can_view_management_dashboard',
  ]),

  lead: makePerms([
    'can_access_observations', 'can_access_permits',
    'can_access_mockup_register', 'can_access_permit_calendar',
    'can_access_documents',
    'can_create_observation', 'can_record_permit', 'can_upload_documents',
  ]),

  client: makePerms([
    'can_access_documents', 'can_access_environmental', 'can_access_kpis_reports',
    'can_review_ai_drafts', 'can_export_reports', 'can_view_management_dashboard',
  ]),

  office: makePerms([
    // Module access (wide internal access)
    'can_access_observations', 'can_access_permits', 'can_access_manpower', 'can_access_checklists',
    'can_access_mockup_register', 'can_access_weekly_mom',
    'can_access_training', 'can_access_equipment', 'can_access_violations',
    'can_access_incidents', 'can_access_mock_drills',
    'can_access_permit_calendar', 'can_access_permit_amendments',
    'can_access_documents', 'can_access_campaigns', 'can_access_poster_generator',
    'can_access_environmental', 'can_access_waste_manifests', 'can_access_contractor_records',
    'can_access_kpis_reports',
    // Feature permissions
    'can_create_observation', 'can_verify_observation', 'can_close_observation',
    'can_create_incident', 'can_investigate_incident', 'can_issue_warning',
    'can_record_permit', 'can_approve_permit', 'can_inspect_equipment',
    'can_manage_training', 'can_manage_manpower', 'can_manage_drills',
    'can_manage_campaigns', 'can_upload_documents',
    'can_review_ai_drafts', 'can_export_reports', 'can_manage_posters',
    'can_view_management_dashboard',
  ]),
};

async function migrate() {
  console.log('Creating permission tables...');

  // 1. Create role_permissions table
  await query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role VARCHAR(50) PRIMARY KEY,
      permissions JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
  console.log('  role_permissions table ready');

  // 2. Create user_permission_overrides table
  await query(`
    CREATE TABLE IF NOT EXISTS user_permission_overrides (
      user_id CHAR(36) PRIMARY KEY,
      overrides JSON NOT NULL,
      updated_by CHAR(36) NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);
  console.log('  user_permission_overrides table ready');

  // 3. Seed role_permissions
  console.log('Seeding role permissions...');
  for (const [role, perms] of Object.entries(ROLE_DEFAULTS)) {
    const existing: any[] = await query('SELECT role FROM role_permissions WHERE role = ?', [role]);
    if (existing.length) {
      console.log(`  ${role} already seeded — skipped`);
      continue;
    }
    await query(
      'INSERT INTO role_permissions (role, permissions) VALUES (?, ?)',
      [role, JSON.stringify(perms)]
    );
    console.log(`  ${role} seeded`);
  }

  // 4. Recalculate all users' effective permissions
  console.log('Recalculating user permissions...');
  const users: any[] = await query('SELECT id, role FROM users');

  for (const user of users) {
    const roleRows: any[] = await query('SELECT permissions FROM role_permissions WHERE role = ?', [user.role]);
    const rolePerms = roleRows.length
      ? (typeof roleRows[0].permissions === 'string' ? JSON.parse(roleRows[0].permissions) : roleRows[0].permissions)
      : {};

    const overrideRows: any[] = await query('SELECT overrides FROM user_permission_overrides WHERE user_id = ?', [user.id]);
    const overrides = overrideRows.length
      ? (typeof overrideRows[0].overrides === 'string' ? JSON.parse(overrideRows[0].overrides) : overrideRows[0].overrides)
      : {};

    // Master gets all true
    let effective: Record<string, boolean>;
    if (user.role === 'master') {
      effective = {};
      const ALL = Object.keys(ROLE_DEFAULTS.master);
      for (const p of ALL) effective[p] = true;
    } else {
      effective = { ...rolePerms, ...overrides };
    }

    await query('UPDATE users SET permissions = ? WHERE id = ?', [JSON.stringify(effective), user.id]);
    console.log(`  Updated ${user.id} (${user.role})`);
  }

  console.log('Permission migration complete.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
