import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db/connection.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

export interface AuthUser {
  id: string;
  email: string;
  username: string | null;
  fullName: string;
  role: string;
  contractor: string | null;
  permissions: Record<string, boolean>;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    // Fetch user from DB to ensure they still exist and are active
    query('SELECT id, email, username, full_name, role, contractor, permissions, is_active FROM users WHERE id = ?', [payload.userId])
      .then((rows: any[]) => {
        if (!rows.length || !rows[0].is_active) {
          res.status(401).json({ message: 'Authentication required' });
          return;
        }
        const row = rows[0];
        req.user = {
          id: row.id,
          email: row.email,
          username: row.username,
          fullName: row.full_name,
          role: row.role,
          contractor: row.contractor,
          permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : (row.permissions || {}),
        };
        next();
      })
      .catch(() => {
        res.status(500).json({ message: 'Internal server error' });
      });
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export function requireMaster(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  if (req.user.role !== 'master') {
    res.status(403).json({ message: 'Master access required' });
    return;
  }
  next();
}

export function requirePermission(flag: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }
    // Master bypasses all permission checks
    if (req.user.role === 'master') {
      next();
      return;
    }
    if (!req.user.permissions[flag]) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
