import { query, pool } from './connection.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

// ─── Default system roles (seeded, cannot be deleted) ─────
const SYSTEM_ROLES = [
  { slug: 'master', name: 'Master', description: 'Full super-admin access. Bypasses all permission checks.', is_system: true },
  { slug: 'system_admin', name: 'System Administrator', description: 'System-level administrator with broad access.', is_system: true },
  { slug: 'ehs_manager', name: 'EHS Manager', description: 'EHS department manager with full operational access.', is_system: true },
  { slug: 'safety_officer', name: 'Safety Officer', description: 'Field safety officer with inspection and enforcement access.', is_system: true },
  { slug: 'officer', name: 'Officer', description: 'General officer role with operational access.', is_system: true },
  { slug: 'site_engineer', name: 'Site Engineer', description: 'Site-level engineer with limited access.', is_system: true },
  { slug: 'contractor_hse', name: 'Contractor HSE Rep', description: 'Contractor HSE representative with contractor-scoped access.', is_system: true },
  { slug: 'client_consultant', name: 'Client / Consultant', description: 'External client or consultant with read-focused access.', is_system: true },
  { slug: 'client', name: 'Client', description: 'Client role with read-focused access.', is_system: true },
  { slug: 'viewer_management', name: 'Viewer / Management', description: 'Management viewer with reporting and dashboard access.', is_system: true },
  { slug: 'lead', name: 'Lead', description: 'Team lead with basic operational access.', is_system: true },
  { slug: 'office', name: 'Office', description: 'Office staff with broad internal access.', is_system: true },
];

async function migrate() {
  console.log('=== Dynamic Roles Migration ===\n');

  // 1. Create roles table
  console.log('1. Creating roles table...');
  await query(`
    CREATE TABLE IF NOT EXISTS roles (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      slug VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      is_system BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
  console.log('   roles table ready.');

  // 2. Seed system roles
  console.log('\n2. Seeding system roles...');
  for (const role of SYSTEM_ROLES) {
    const existing: any[] = await query('SELECT id FROM roles WHERE slug = ?', [role.slug]);
    if (existing.length) {
      // Update name/description if changed, but keep is_system
      await query(
        'UPDATE roles SET name = ?, description = ?, is_system = ? WHERE slug = ?',
        [role.name, role.description, role.is_system, role.slug]
      );
      console.log(`   ${role.slug} — updated`);
    } else {
      await query(
        'INSERT INTO roles (slug, name, description, is_system, is_active) VALUES (?, ?, ?, ?, true)',
        [role.slug, role.name, role.description, role.is_system]
      );
      console.log(`   ${role.slug} — seeded`);
    }
  }

  // 3. Ensure role_permissions rows exist for all roles in the roles table
  console.log('\n3. Ensuring role_permissions entries exist for all roles...');
  const allRoles: any[] = await query('SELECT slug FROM roles');
  for (const r of allRoles) {
    const rpExists: any[] = await query('SELECT role FROM role_permissions WHERE role = ?', [r.slug]);
    if (!rpExists.length) {
      // Insert empty permissions — admin can configure later
      const emptyPerms: Record<string, boolean> = {};
      await query(
        'INSERT INTO role_permissions (role, permissions) VALUES (?, ?)',
        [r.slug, JSON.stringify(emptyPerms)]
      );
      console.log(`   ${r.slug} — created empty role_permissions entry`);
    } else {
      console.log(`   ${r.slug} — role_permissions already exists`);
    }
  }

  // 4. Remove CHECK constraint on users.role if it exists (allow dynamic roles)
  console.log('\n4. Removing CHECK constraint on users.role (if exists)...');
  try {
    // MySQL 8.0.16+ stores CHECK constraints in information_schema
    const constraints: any[] = await query(`
      SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND CONSTRAINT_TYPE = 'CHECK'
    `);
    for (const c of constraints) {
      // Only drop role-related CHECK constraints
      try {
        const checkDef: any[] = await query(`
          SELECT CHECK_CLAUSE FROM information_schema.CHECK_CONSTRAINTS
          WHERE CONSTRAINT_SCHEMA = DATABASE()
            AND CONSTRAINT_NAME = ?
        `, [c.CONSTRAINT_NAME]);
        const clause = checkDef[0]?.CHECK_CLAUSE || '';
        if (clause.toLowerCase().includes('role')) {
          await query(`ALTER TABLE users DROP CHECK ${c.CONSTRAINT_NAME}`);
          console.log(`   Dropped CHECK constraint: ${c.CONSTRAINT_NAME}`);
        }
      } catch (err: any) {
        console.log(`   Could not drop ${c.CONSTRAINT_NAME}: ${err.message}`);
      }
    }
  } catch (err: any) {
    console.log(`   CHECK constraint removal skipped: ${err.message}`);
  }

  console.log('\n=== Dynamic Roles Migration Complete ===');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
