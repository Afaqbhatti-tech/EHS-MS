import { Router, Request, Response } from 'express';
import { query } from '../db/connection.js';
import { requireAuth, requirePermission, requireMaster } from '../middleware/auth.js';
import { ALL_PERMISSIONS, syncRolePermissions, syncUserPermissions } from '../utils/permissions.js';

const router = Router();

// ─── Slug helper: convert name → slug ─────
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// ─── GET /api/roles — List all roles with permission/user counts ─────
router.get('/', requireAuth, requirePermission('can_manage_roles'), async (_req: Request, res: Response) => {
  try {
    // Join roles table with role_permissions and user counts
    const roles: any[] = await query(`
      SELECT r.id, r.slug, r.name, r.description, r.is_system, r.is_active, r.created_at,
             rp.permissions,
             (SELECT COUNT(*) FROM users u WHERE u.role = r.slug) as user_count
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role = r.slug
      WHERE r.is_active = true
      ORDER BY r.is_system DESC, r.name ASC
    `);

    const result = roles.map(r => {
      const perms = r.permissions
        ? (typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions)
        : {};
      const grantedCount = Object.values(perms).filter(Boolean).length;
      return {
        id: r.id,
        role: r.slug,
        slug: r.slug,
        name: r.name,
        label: r.name,
        description: r.description || '',
        isSystem: !!r.is_system,
        isActive: !!r.is_active,
        grantedCount,
        totalPermissions: ALL_PERMISSIONS.length,
        userCount: Number(r.user_count) || 0,
        createdAt: r.created_at,
      };
    });

    res.json({ roles: result });
  } catch (err) {
    console.error('List roles error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ─── POST /api/roles — Create a new role (MASTER only) ─────
router.post('/', requireAuth, requireMaster, async (req: Request, res: Response) => {
  try {
    const { name, slug: rawSlug, description, permissions } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ message: 'Role name is required (min 2 characters)' });
      return;
    }

    // Generate or validate slug
    const slug = rawSlug ? slugify(rawSlug) : slugify(name);
    if (!slug || slug.length < 2) {
      res.status(400).json({ message: 'Invalid slug. Must contain at least 2 alphanumeric characters.' });
      return;
    }

    // Validate slug format
    if (!/^[a-z][a-z0-9_]*$/.test(slug)) {
      res.status(400).json({ message: 'Slug must start with a letter and contain only lowercase letters, numbers, and underscores.' });
      return;
    }

    // Check uniqueness
    const existing: any[] = await query('SELECT id FROM roles WHERE slug = ?', [slug]);
    if (existing.length) {
      res.status(409).json({ message: `A role with slug "${slug}" already exists.` });
      return;
    }

    // Check name uniqueness
    const nameExists: any[] = await query('SELECT id FROM roles WHERE LOWER(name) = LOWER(?)', [name.trim()]);
    if (nameExists.length) {
      res.status(409).json({ message: `A role with name "${name.trim()}" already exists.` });
      return;
    }

    // Insert the role
    await query(
      'INSERT INTO roles (slug, name, description, is_system, is_active) VALUES (?, ?, ?, false, true)',
      [slug, name.trim(), description?.trim() || null]
    );

    // Create role_permissions entry
    const rolePerms: Record<string, boolean> = {};
    for (const p of ALL_PERMISSIONS) {
      rolePerms[p] = !!(permissions && permissions[p]);
    }
    await query(
      'INSERT INTO role_permissions (role, permissions) VALUES (?, ?)',
      [slug, JSON.stringify(rolePerms)]
    );

    // Fetch the created role
    const [created]: any[] = await query('SELECT id, slug, name, description, is_system, is_active, created_at FROM roles WHERE slug = ?', [slug]);

    res.status(201).json({
      message: 'Role created successfully',
      role: {
        id: created.id,
        slug: created.slug,
        name: created.name,
        description: created.description || '',
        isSystem: !!created.is_system,
        isActive: !!created.is_active,
        createdAt: created.created_at,
      },
    });
  } catch (err) {
    console.error('Create role error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ─── PUT /api/roles/:role — Update role info (MASTER only) ─────
router.put('/:role', requireAuth, requireMaster, async (req: Request, res: Response) => {
  try {
    const { role } = req.params;
    const { name, slug: newSlug, description } = req.body;

    // Check role exists
    const existing: any[] = await query('SELECT id, slug, is_system FROM roles WHERE slug = ?', [role]);
    if (!existing.length) {
      res.status(404).json({ message: 'Role not found' });
      return;
    }

    const isSystem = !!existing[0].is_system;
    const updates: string[] = [];
    const values: any[] = [];

    // Update name
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        res.status(400).json({ message: 'Role name must be at least 2 characters' });
        return;
      }
      // Check name uniqueness (excluding current role)
      const nameExists: any[] = await query('SELECT id FROM roles WHERE LOWER(name) = LOWER(?) AND slug != ?', [name.trim(), role]);
      if (nameExists.length) {
        res.status(409).json({ message: `A role with name "${name.trim()}" already exists.` });
        return;
      }
      updates.push('name = ?');
      values.push(name.trim());
    }

    // Update slug (only for non-system roles)
    if (newSlug !== undefined && newSlug !== role) {
      if (isSystem) {
        res.status(400).json({ message: 'Cannot change slug of a system role. This would break existing logic.' });
        return;
      }
      const cleanSlug = slugify(newSlug);
      if (!cleanSlug || cleanSlug.length < 2 || !/^[a-z][a-z0-9_]*$/.test(cleanSlug)) {
        res.status(400).json({ message: 'Invalid slug format.' });
        return;
      }
      const slugExists: any[] = await query('SELECT id FROM roles WHERE slug = ? AND slug != ?', [cleanSlug, role]);
      if (slugExists.length) {
        res.status(409).json({ message: `Slug "${cleanSlug}" is already taken.` });
        return;
      }

      // Update all references: users.role, role_permissions.role, user_permission_overrides
      await query('UPDATE users SET role = ? WHERE role = ?', [cleanSlug, role]);
      await query('UPDATE role_permissions SET role = ? WHERE role = ?', [cleanSlug, role]);

      updates.push('slug = ?');
      values.push(cleanSlug);
    }

    // Update description
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description?.trim() || null);
    }

    if (!updates.length) {
      res.status(400).json({ message: 'No fields to update' });
      return;
    }

    values.push(role);
    await query(`UPDATE roles SET ${updates.join(', ')} WHERE slug = ?`, values);

    // Fetch updated role
    const finalSlug = (newSlug && !isSystem) ? slugify(newSlug) : role;
    const [updated]: any[] = await query(
      'SELECT id, slug, name, description, is_system, is_active, created_at FROM roles WHERE slug = ?',
      [finalSlug]
    );

    res.json({
      message: 'Role updated successfully',
      role: {
        id: updated.id,
        slug: updated.slug,
        name: updated.name,
        description: updated.description || '',
        isSystem: !!updated.is_system,
        isActive: !!updated.is_active,
        createdAt: updated.created_at,
      },
    });
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ─── DELETE /api/roles/:role — Delete a role (MASTER only) ─────
router.delete('/:role', requireAuth, requireMaster, async (req: Request, res: Response) => {
  try {
    const { role } = req.params;
    const { reassignTo } = req.body;

    // Check role exists
    const existing: any[] = await query('SELECT id, slug, name, is_system FROM roles WHERE slug = ?', [role]);
    if (!existing.length) {
      res.status(404).json({ message: 'Role not found' });
      return;
    }

    // Prevent deleting system roles
    if (existing[0].is_system) {
      res.status(400).json({ message: `Cannot delete system role "${existing[0].name}". System roles are protected.` });
      return;
    }

    // Check for assigned users
    const userCount: any[] = await query('SELECT COUNT(*) as count FROM users WHERE role = ?', [role]);
    const count = Number(userCount[0].count);

    if (count > 0) {
      if (!reassignTo) {
        // Return info about affected users so frontend can ask for reassignment
        res.status(409).json({
          message: `Cannot delete role "${existing[0].name}" — ${count} user(s) are currently assigned to this role. Provide "reassignTo" to reassign them first.`,
          affectedUsers: count,
          requiresReassignment: true,
        });
        return;
      }

      // Validate reassignment target
      const targetRole: any[] = await query('SELECT slug FROM roles WHERE slug = ? AND is_active = true', [reassignTo]);
      if (!targetRole.length) {
        res.status(400).json({ message: `Target role "${reassignTo}" does not exist or is not active.` });
        return;
      }
      if (reassignTo === role) {
        res.status(400).json({ message: 'Cannot reassign users to the same role being deleted.' });
        return;
      }

      // Reassign all users
      await query('UPDATE users SET role = ? WHERE role = ?', [reassignTo, role]);

      // Recalculate permissions for reassigned users
      const reassignedUsers: any[] = await query('SELECT id FROM users WHERE role = ?', [reassignTo]);
      for (const u of reassignedUsers) {
        await syncUserPermissions(u.id);
      }
    }

    // Clean up role_permissions
    await query('DELETE FROM role_permissions WHERE role = ?', [role]);

    // Clean up user_permission_overrides for users who were in this role (should be 0 after reassignment)
    // (overrides are user-specific, they stay with the user even after role change)

    // Delete the role
    await query('DELETE FROM roles WHERE slug = ?', [role]);

    res.json({
      message: `Role "${existing[0].name}" deleted successfully${count > 0 ? `. ${count} user(s) reassigned to "${reassignTo}".` : '.'}`,
      deletedRole: role,
      reassignedUsers: count,
    });
  } catch (err) {
    console.error('Delete role error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ─── GET /api/roles/dropdown — Get all active roles (for dropdowns) ─────
router.get('/dropdown', requireAuth, async (_req: Request, res: Response) => {
  try {
    const roles: any[] = await query(
      'SELECT slug, name, description, is_system FROM roles WHERE is_active = true ORDER BY is_system DESC, name ASC'
    );
    res.json({
      roles: roles.map(r => ({
        value: r.slug,
        label: r.name,
        description: r.description || '',
        isSystem: !!r.is_system,
      })),
    });
  } catch (err) {
    console.error('List all roles error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ─── GET /api/roles/:role/permissions — Get permissions for a role ─────
router.get('/:role/permissions', requireAuth, requirePermission('can_manage_roles'), async (req: Request, res: Response) => {
  try {
    const { role } = req.params;
    const rows: any[] = await query('SELECT permissions FROM role_permissions WHERE role = ?', [role]);
    if (!rows.length) {
      res.status(404).json({ message: 'Role not found' });
      return;
    }
    const permissions = typeof rows[0].permissions === 'string' ? JSON.parse(rows[0].permissions) : rows[0].permissions;
    res.json({ role, permissions });
  } catch (err) {
    console.error('Get role permissions error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ─── PUT /api/roles/:role/permissions — Update permissions for a role ─────
router.put('/:role/permissions', requireAuth, requirePermission('can_manage_roles'), async (req: Request, res: Response) => {
  try {
    const role = req.params.role as string;
    const { permissions } = req.body;

    if (!permissions || typeof permissions !== 'object') {
      res.status(400).json({ message: 'permissions object is required' });
      return;
    }

    // Prevent changing master's role defaults (master bypasses anyway)
    if (role === 'master') {
      res.status(400).json({ message: 'Master role permissions cannot be modified' });
      return;
    }

    const existing: any[] = await query('SELECT role FROM role_permissions WHERE role = ?', [role]);
    if (!existing.length) {
      res.status(404).json({ message: 'Role not found' });
      return;
    }

    await query('UPDATE role_permissions SET permissions = ? WHERE role = ?', [JSON.stringify(permissions), role]);

    // Recalculate effective permissions for all users with this role
    await syncRolePermissions(role);

    res.json({ role, permissions, message: 'Permissions updated' });
  } catch (err) {
    console.error('Update role permissions error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ─── GET /api/roles/:role/users — List users with this role ─────
router.get('/:role/users', requireAuth, requirePermission('can_manage_roles'), async (req: Request, res: Response) => {
  try {
    const { role } = req.params;
    const users: any[] = await query(
      `SELECT u.id, u.full_name, u.email, u.username, u.is_active, u.last_login_at,
              CASE WHEN upo.user_id IS NOT NULL THEN true ELSE false END as has_overrides
       FROM users u
       LEFT JOIN user_permission_overrides upo ON u.id = upo.user_id
       WHERE u.role = ?
       ORDER BY u.full_name`,
      [role]
    );

    res.json({
      users: users.map(u => ({
        id: u.id,
        name: u.full_name,
        email: u.email,
        username: u.username,
        isActive: !!u.is_active,
        lastLoginAt: u.last_login_at,
        hasOverrides: !!u.has_overrides,
      })),
    });
  } catch (err) {
    console.error('List role users error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ─── GET /api/roles/user-overrides/:userId — Get overrides for a user ─────
router.get('/user-overrides/:userId', requireAuth, requirePermission('can_manage_roles'), async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;

    // Get user info
    const users: any[] = await query('SELECT id, full_name, email, role FROM users WHERE id = ?', [userId]);
    if (!users.length) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    const user = users[0];

    // Get role defaults
    const roleRows: any[] = await query('SELECT permissions FROM role_permissions WHERE role = ?', [user.role]);
    const roleDefaults = roleRows.length
      ? (typeof roleRows[0].permissions === 'string' ? JSON.parse(roleRows[0].permissions) : roleRows[0].permissions)
      : {};

    // Get user overrides
    const overrideRows: any[] = await query('SELECT overrides FROM user_permission_overrides WHERE user_id = ?', [userId]);
    const overrides = overrideRows.length
      ? (typeof overrideRows[0].overrides === 'string' ? JSON.parse(overrideRows[0].overrides) : overrideRows[0].overrides)
      : {};

    // Get effective
    const effective: Record<string, boolean> = { ...roleDefaults, ...overrides };

    res.json({
      user: { id: user.id, name: user.full_name, email: user.email, role: user.role },
      roleDefaults,
      overrides,
      effective,
    });
  } catch (err) {
    console.error('Get user overrides error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ─── PUT /api/roles/user-overrides/:userId — Set overrides for a user ─────
router.put('/user-overrides/:userId', requireAuth, requirePermission('can_manage_roles'), async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const { overrides } = req.body;

    if (!overrides || typeof overrides !== 'object') {
      res.status(400).json({ message: 'overrides object is required' });
      return;
    }

    const users: any[] = await query('SELECT id, role FROM users WHERE id = ?', [userId]);
    if (!users.length) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Don't allow overrides on master accounts
    if (users[0].role === 'master') {
      res.status(400).json({ message: 'Cannot override master account permissions' });
      return;
    }

    // Clean overrides: remove keys that match role defaults (no need to store them)
    const roleRows: any[] = await query('SELECT permissions FROM role_permissions WHERE role = ?', [users[0].role]);
    const roleDefaults = roleRows.length
      ? (typeof roleRows[0].permissions === 'string' ? JSON.parse(roleRows[0].permissions) : roleRows[0].permissions)
      : {};

    const cleanOverrides: Record<string, boolean> = {};
    for (const [key, val] of Object.entries(overrides)) {
      if (roleDefaults[key] !== val) {
        cleanOverrides[key] = val as boolean;
      }
    }

    const updatedBy = req.user?.id || null;

    if (Object.keys(cleanOverrides).length === 0) {
      // No overrides needed — remove the row
      await query('DELETE FROM user_permission_overrides WHERE user_id = ?', [userId]);
    } else {
      // Upsert
      const existing: any[] = await query('SELECT user_id FROM user_permission_overrides WHERE user_id = ?', [userId]);
      if (existing.length) {
        await query(
          'UPDATE user_permission_overrides SET overrides = ?, updated_by = ? WHERE user_id = ?',
          [JSON.stringify(cleanOverrides), updatedBy, userId]
        );
      } else {
        await query(
          'INSERT INTO user_permission_overrides (user_id, overrides, updated_by) VALUES (?, ?, ?)',
          [userId, JSON.stringify(cleanOverrides), updatedBy]
        );
      }
    }

    // Recalculate effective permissions
    await syncUserPermissions(userId);

    res.json({ message: 'Overrides updated', overrides: cleanOverrides });
  } catch (err) {
    console.error('Update user overrides error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ─── GET /api/roles/permissions/all — List all permission definitions ─────
router.get('/permissions/all', requireAuth, requirePermission('can_manage_roles'), (_req: Request, res: Response) => {
  res.json({ permissions: ALL_PERMISSIONS });
});

export { router as rolesRouter };
