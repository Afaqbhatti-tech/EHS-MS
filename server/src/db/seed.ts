import bcrypt from 'bcryptjs';
import { query, pool } from './connection.js';
import { calculateRolePermissions } from '../utils/permissions.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const SEED_USERS = [
  // ── Original EHS-OS accounts ──
  {
    full_name: 'System Admin',
    email: 'admin@ehsos.kaec',
    username: null,
    password: 'Admin@123456',
    role: 'system_admin',
    contractor: null,
  },
  {
    full_name: 'Ahmed Siddiqui',
    email: 'ahmed.siddiqui@ehsos.kaec',
    username: null,
    password: 'Manager@123456',
    role: 'ehs_manager',
    contractor: null,
  },
  {
    full_name: 'Test Officer',
    email: 'officer@ehsos.kaec',
    username: null,
    password: 'Officer@123456',
    role: 'safety_officer',
    contractor: 'FFT Direct',
  },
  {
    full_name: 'CCCC HSE Rep',
    email: 'hse@cccc.kaec',
    username: null,
    password: 'Contractor@123456',
    role: 'contractor_hse',
    contractor: 'CCCC',
  },
  // ── Multi-level test accounts ──
  {
    full_name: 'Master Account',
    email: 'master@example.com',
    username: 'master',
    password: 'master',
    role: 'master',
    contractor: null,
  },
  {
    full_name: 'Officer Account',
    email: 'officer@example.com',
    username: 'officer',
    password: 'officer',
    role: 'officer',
    contractor: 'FFT Direct',
  },
  {
    full_name: 'Lead Account',
    email: 'lead@example.com',
    username: 'lead',
    password: 'lead',
    role: 'lead',
    contractor: null,
  },
  {
    full_name: 'Client Account',
    email: 'client@example.com',
    username: 'client',
    password: 'client',
    role: 'client',
    contractor: null,
  },
  {
    full_name: 'Office Account',
    email: 'office@example.com',
    username: 'office',
    password: 'office',
    role: 'office',
    contractor: null,
  },
];

async function seed() {
  console.log('Seeding users...');

  for (const user of SEED_USERS) {
    // Check by email OR username to prevent duplicates
    const existing: any[] = user.username
      ? await query('SELECT id FROM users WHERE email = ? OR username = ?', [user.email, user.username])
      : await query('SELECT id FROM users WHERE email = ?', [user.email]);

    if (existing.length) {
      console.log(`  ✓ ${user.username || user.email} already exists — skipped`);
      continue;
    }

    const hash = await bcrypt.hash(user.password, 12);
    const permissions = await calculateRolePermissions(user.role);

    await query(
      `INSERT INTO users (email, username, full_name, password_hash, role, contractor, permissions)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.email, user.username, user.full_name, hash, user.role, user.contractor, JSON.stringify(permissions)]
    );

    console.log(`  ✓ ${user.username || user.email} created (${user.role})`);
  }

  console.log('Seeding complete.');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
