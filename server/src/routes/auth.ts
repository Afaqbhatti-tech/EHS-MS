import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = '7d';
const SETUP_TOKEN_EXPIRY_HOURS = 72;

function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function sanitizeUser(row: any) {
  const perms = typeof row.permissions === 'string' ? JSON.parse(row.permissions) : (row.permissions || {});
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    phone: row.phone || null,
    username: row.username || null,
    role: row.role,
    contractor: row.contractor,
    permissions: perms,
    isActive: !!row.is_active,
    lastLoginAt: row.last_login_at,
  };
}

// ─── POST /api/auth/login ─────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;
    const identifier = (email || username || '').trim();
    if (!identifier || !password) {
      res.status(400).json({ message: 'Username/email and password are required' });
      return;
    }

    // Support login by email or username
    const rows: any[] = await query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [identifier.toLowerCase(), identifier.toLowerCase()]
    );

    if (!rows.length) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const user = rows[0];

    if (!user.is_active) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    if (!user.password_hash) {
      res.status(401).json({ message: 'Password has not been set. Please use your setup link.' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Update last login
    await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    const token = signToken(user.id);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const rows: any[] = await query('SELECT * FROM users WHERE id = ?', [req.user!.id]);
    if (!rows.length) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json({ user: sanitizeUser(rows[0]) });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ─── GET /api/auth/verify-setup-token/:token ──────
router.get('/verify-setup-token/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const rows: any[] = await query(
      'SELECT id, email, full_name, password_setup_token_expiry FROM users WHERE password_setup_token = ? AND password_hash IS NULL',
      [token]
    );

    if (!rows.length) {
      res.json({ valid: false, reason: 'Invalid or already used token' });
      return;
    }

    const user = rows[0];
    if (user.password_setup_token_expiry && new Date(user.password_setup_token_expiry) < new Date()) {
      res.json({ valid: false, reason: 'Token has expired' });
      return;
    }

    res.json({ valid: true, email: user.email, name: user.full_name });
  } catch (err) {
    console.error('Verify token error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ─── POST /api/auth/setup-password ────────────────
router.post('/setup-password', async (req: Request, res: Response) => {
  try {
    const { token, password, password_confirmation } = req.body;

    if (!token || !password || !password_confirmation) {
      res.status(400).json({ message: 'Token, password, and confirmation are required' });
      return;
    }

    if (password !== password_confirmation) {
      res.status(400).json({ message: 'Passwords do not match' });
      return;
    }

    // Password rules: min 8, 1 upper, 1 lower, 1 number, 1 special
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
      res.status(400).json({
        message: 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character',
      });
      return;
    }

    const rows: any[] = await query(
      'SELECT id, password_setup_token_expiry FROM users WHERE password_setup_token = ? AND password_hash IS NULL',
      [token]
    );

    if (!rows.length) {
      res.status(400).json({ message: 'Invalid or already used token' });
      return;
    }

    const user = rows[0];
    if (user.password_setup_token_expiry && new Date(user.password_setup_token_expiry) < new Date()) {
      res.status(400).json({ message: 'Token has expired' });
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    await query(
      'UPDATE users SET password_hash = ?, password_setup_token = NULL, password_setup_token_expiry = NULL WHERE id = ?',
      [hash, user.id]
    );

    const jwtToken = signToken(user.id);
    const [updated]: any[] = await query('SELECT * FROM users WHERE id = ?', [user.id]);

    res.json({ message: 'Password set successfully', token: jwtToken, user: sanitizeUser(updated) });
  } catch (err) {
    console.error('Setup password error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ─── PUT /api/auth/profile ────────────────────────
router.put('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, phone } = req.body;
    const userId = req.user!.id;

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Name is required' });
      return;
    }

    await query(
      'UPDATE users SET full_name = ?, phone = ? WHERE id = ?',
      [name.trim(), phone?.trim() || null, userId]
    );

    const [updated]: any[] = await query('SELECT * FROM users WHERE id = ?', [userId]);
    res.json({ user: sanitizeUser(updated) });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ─── POST /api/auth/change-password ──────────────
router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const { current_password, new_password, new_password_confirmation } = req.body;
    const userId = req.user!.id;

    if (!current_password || !new_password || !new_password_confirmation) {
      res.status(400).json({ message: 'All password fields are required' });
      return;
    }

    if (new_password !== new_password_confirmation) {
      res.status(400).json({ message: 'Passwords do not match' });
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(new_password)) {
      res.status(400).json({
        message: 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character',
      });
      return;
    }

    const rows: any[] = await query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!rows.length) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) {
      res.status(400).json({ message: 'Current password is incorrect' });
      return;
    }

    const hash = await bcrypt.hash(new_password, 12);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ─── POST /api/auth/logout ────────────────────────
router.post('/logout', (_req: Request, res: Response) => {
  // JWT is stateless — client clears token. Endpoint exists for API completeness.
  res.json({ message: 'Logged out successfully' });
});

// ─── GET /api/dev/generate-setup-link (dev only) ──
router.get('/dev/generate-setup-link', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ message: 'Not found' });
    return;
  }

  const email = req.query.email as string;
  if (!email) {
    res.status(400).json({ message: 'Email query parameter required' });
    return;
  }

  const rows: any[] = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (!rows.length) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + SETUP_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await query(
    'UPDATE users SET password_setup_token = ?, password_setup_token_expiry = ? WHERE id = ?',
    [token, expiry, rows[0].id]
  );

  const baseUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const setupUrl = `${baseUrl}/setup-password?token=${token}`;

  res.json({ setupUrl, token, expiresAt: expiry.toISOString() });
});

export { router as authRouter };
