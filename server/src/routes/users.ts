import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query } from '../db/connection.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { calculateEffectivePermissions, calculateRolePermissions, syncUserPermissions } from '../utils/permissions.js';

const router = Router();
const SETUP_TOKEN_EXPIRY_HOURS = 72;

// ─── GET /api/users ─────────────────────────────
router.get('/', requireAuth, requireRole('system_admin', 'ehs_manager', 'master'), async (_req: Request, res: Response) => {
  try {
    const rows = await query(
      `SELECT id, email, username, full_name, role, contractor, permissions, is_active,
              last_login_at, created_at, updated_at,
              CASE WHEN password_hash IS NOT NULL THEN true ELSE false END as password_set
       FROM users ORDER BY created_at DESC`
    );
    const users = (rows as any[]).map(r => ({
      id: r.id,
      name: r.full_name,
      email: r.email,
      username: r.username || null,
      role: r.role,
      contractor: r.contractor,
      permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || {}),
      isActive: !!r.is_active,
      passwordSet: !!r.password_set,
      lastLoginAt: r.last_login_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    res.json({ users });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ─── GET /api/users/role-defaults/:role ─────────
router.get('/role-defaults/:role', requireAuth, requireRole('system_admin', 'ehs_manager', 'master'), async (req: Request, res: Response) => {
  try {
    const dbPerms = await calculateRolePermissions(req.params.role as string);
    res.json({ permissions: dbPerms });
  } catch {
    res.status(400).json({ message: 'Unknown role' });
  }
});

// ─── POST /api/users ────────────────────────────
router.post('/', requireAuth, requireRole('system_admin', 'ehs_manager', 'master'), async (req: Request, res: Response) => {
  try {
    const { name, email, role, contractor } = req.body;

    if (!name || !email || !role) {
      res.status(400).json({ message: 'Name, email, and role are required' });
      return;
    }

    // Validate role exists in database
    const validRoleRows: any[] = await query('SELECT slug FROM roles WHERE slug = ? AND is_active = true', [role]);
    if (!validRoleRows.length) {
      res.status(400).json({ message: 'Invalid role' });
      return;
    }

    // Check duplicate email
    const existing: any[] = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing.length) {
      res.status(409).json({ message: 'A user with this email already exists' });
      return;
    }

    const setupToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + SETUP_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
    // Get permissions from DB role_permissions table
    const permissions = await calculateRolePermissions(role);

    await query(
      `INSERT INTO users (email, full_name, role, contractor, permissions, password_setup_token, password_setup_token_expiry)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [email.toLowerCase().trim(), name, role, contractor || null, JSON.stringify(permissions), setupToken, expiry]
    );

    const [created]: any[] = await query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);

    const baseUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
    const setupUrl = `${baseUrl}/setup-password?token=${setupToken}`;

    res.status(201).json({
      user: {
        id: created.id,
        name: created.full_name,
        email: created.email,
        role: created.role,
        contractor: created.contractor,
        isActive: !!created.is_active,
      },
      setupUrl,
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ─── PUT /api/users/:id ─────────────────────────
router.put('/:id', requireAuth, requireRole('system_admin', 'ehs_manager', 'master'), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, role, contractor, isActive, permissions } = req.body;

    const existing: any[] = await query('SELECT id FROM users WHERE id = ?', [id]);
    if (!existing.length) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) { updates.push('full_name = ?'); values.push(name); }
    if (role !== undefined) { updates.push('role = ?'); values.push(role); }
    if (contractor !== undefined) { updates.push('contractor = ?'); values.push(contractor || null); }
    if (isActive !== undefined) { updates.push('is_active = ?'); values.push(isActive ? 1 : 0); }
    if (permissions !== undefined) { updates.push('permissions = ?'); values.push(JSON.stringify(permissions)); }

    if (!updates.length) {
      res.status(400).json({ message: 'No fields to update' });
      return;
    }

    values.push(id);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    // If role changed or permissions not explicitly set, recalculate effective permissions
    if (role !== undefined && permissions === undefined) {
      try { await syncUserPermissions(id); } catch { /* best effort */ }
    }

    const [updated]: any[] = await query(
      'SELECT id, email, full_name, role, contractor, permissions, is_active, last_login_at, created_at FROM users WHERE id = ?',
      [id]
    );

    res.json({
      user: {
        id: updated.id,
        name: updated.full_name,
        email: updated.email,
        role: updated.role,
        contractor: updated.contractor,
        permissions: typeof updated.permissions === 'string' ? JSON.parse(updated.permissions) : (updated.permissions || {}),
        isActive: !!updated.is_active,
        lastLoginAt: updated.last_login_at,
      },
    });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ─── POST /api/users/:id/resend-setup ───────────
router.post('/:id/resend-setup', requireAuth, requireRole('system_admin', 'ehs_manager', 'master'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rows: any[] = await query('SELECT id, email, password_hash FROM users WHERE id = ?', [id]);
    if (!rows.length) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (rows[0].password_hash) {
      res.status(400).json({ message: 'User has already set their password' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + SETUP_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await query(
      'UPDATE users SET password_setup_token = ?, password_setup_token_expiry = ? WHERE id = ?',
      [token, expiry, id]
    );

    const baseUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
    const setupUrl = `${baseUrl}/setup-password?token=${token}`;

    res.json({ setupUrl, expiresAt: expiry.toISOString() });
  } catch (err) {
    console.error('Resend setup error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export { router as usersRouter };
