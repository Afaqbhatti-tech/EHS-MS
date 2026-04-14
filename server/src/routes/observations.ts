import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/connection.js';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// ─── Multer config for observation media uploads ────
const uploadsDir = path.join(process.cwd(), 'uploads', 'observations');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `obs-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/3gpp',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB per file
});

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

export const observationsRouter = Router();

// ─── Helpers ────────────────────────────────────────
function generateObservationId(count: number): string {
  const year = new Date().getFullYear();
  return `OBS-${year}-${String(count).padStart(4, '0')}`;
}

// Auth middleware that also accepts ?token= query param (for export downloads)
function authFromQueryOrHeader(req: Request, res: Response, next: import('express').NextFunction): void {
  // If already authenticated via header, skip
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    requireAuth(req, res, next);
    return;
  }
  // Try token from query string (for CSV export via window.open)
  const token = req.query.token as string;
  if (!token) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
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

// ─── FILE UPLOAD ─────────────────────────────────────

// POST /api/observations/upload
observationsRouter.post('/upload', requireAuth, (req: Request, res: Response) => {
  upload.array('files', 20)(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(422).json({ message: 'File too large. Maximum 100MB per file.' });
        return;
      }
      res.status(422).json({ message: err.message });
      return;
    }
    if (err) {
      res.status(422).json({ message: err.message });
      return;
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(422).json({ message: 'No files uploaded' });
      return;
    }

    const uploaded = files.map(f => ({
      filename: `observations/${f.filename}`,
      originalName: f.originalname,
      size: f.size,
      mimetype: f.mimetype,
    }));

    res.json({ message: 'Files uploaded successfully', files: uploaded });
  });
});

// ─── STATIC routes FIRST (before /:id) ─────────────

// GET /api/observations/stats
observationsRouter.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const [kpiRows, monthlyRows, byCategoryRows, byContractorRows, byOfficerRows]: any[] = await Promise.all([
      query(`
        SELECT
          COUNT(*) as total,
          SUM(status = 'Open') as open_count,
          SUM(status = 'In Progress') as in_progress,
          SUM(status = 'Closed') as closed,
          SUM(status = 'Verified') as verified,
          SUM(status = 'Overdue') as overdue,
          SUM(status = 'Reopened') as reopened
        FROM observations
        WHERE deleted_at IS NULL
      `),
      query(`
        SELECT
          MONTH(observation_date) as month,
          COUNT(*) as total,
          SUM(status = 'Open') as open_count,
          SUM(status = 'In Progress') as in_progress,
          SUM(status = 'Closed') as closed,
          SUM(status = 'Overdue') as overdue
        FROM observations
        WHERE deleted_at IS NULL AND YEAR(observation_date) = ?
        GROUP BY MONTH(observation_date)
        ORDER BY month
      `, [year]),
      query(`
        SELECT category, COUNT(*) as total
        FROM observations
        WHERE deleted_at IS NULL AND YEAR(observation_date) = ? AND category IS NOT NULL AND category != ''
        GROUP BY category
        ORDER BY total DESC
      `, [year]),
      query(`
        SELECT contractor, COUNT(*) as total
        FROM observations
        WHERE deleted_at IS NULL AND YEAR(observation_date) = ? AND contractor IS NOT NULL AND contractor != ''
        GROUP BY contractor
        ORDER BY total DESC
      `, [year]),
      query(`
        SELECT u.full_name as officer_name, COUNT(*) as total
        FROM observations o
        LEFT JOIN users u ON o.reporting_officer_id = u.id
        WHERE o.deleted_at IS NULL AND YEAR(o.observation_date) = ?
        GROUP BY o.reporting_officer_id, u.full_name
        ORDER BY total DESC
        LIMIT 10
      `, [year]),
    ]);

    const kpis = kpiRows[0] || {};

    res.json({
      kpis: {
        total: Number(kpis.total ?? 0),
        open: Number(kpis.open_count ?? 0),
        in_progress: Number(kpis.in_progress ?? 0),
        closed: Number(kpis.closed ?? 0),
        verified: Number(kpis.verified ?? 0),
        overdue: Number(kpis.overdue ?? 0),
        reopened: Number(kpis.reopened ?? 0),
      },
      monthly: monthlyRows.map((r: any) => ({
        month: r.month,
        total: Number(r.total),
        open: Number(r.open_count ?? 0),
        in_progress: Number(r.in_progress ?? 0),
        closed: Number(r.closed ?? 0),
        overdue: Number(r.overdue ?? 0),
      })),
      byCategory: byCategoryRows.map((r: any) => ({
        category: r.category,
        total: Number(r.total),
      })),
      byContractor: byContractorRows.map((r: any) => ({
        contractor: r.contractor,
        total: Number(r.total),
      })),
      byOfficer: byOfficerRows.map((r: any) => ({
        officer_name: r.officer_name || 'Unknown',
        total: Number(r.total),
      })),
    });
  } catch (err: any) {
    console.error('Observations stats error:', err);
    res.status(500).json({ message: 'Failed to load stats', error: err.message });
  }
});

// GET /api/observations/export (supports ?token= for browser downloads)
observationsRouter.get('/export', authFromQueryOrHeader, async (req: Request, res: Response) => {
  try {
    const { status, date_from, date_to } = req.query as Record<string, string>;

    let sql = 'SELECT o.*, u.full_name as reporting_officer_name FROM observations o LEFT JOIN users u ON o.reporting_officer_id = u.id WHERE o.deleted_at IS NULL';
    const params: any[] = [];

    if (status) { sql += ' AND o.status = ?'; params.push(status); }
    if (date_from) { sql += ' AND DATE(o.observation_date) >= ?'; params.push(date_from); }
    if (date_to) { sql += ' AND DATE(o.observation_date) <= ?'; params.push(date_to); }

    sql += ' ORDER BY o.observation_date DESC';

    const rows: any[] = await query(sql, params);

    const csvHeader = 'Observation ID,Date,Area,Contractor,Category,Type,Priority,Description,Immediate Action,Responsible Supervisor,Target Date,Status,Verified By,Verified Date\n';
    const csvRows = rows.map(r =>
      [
        r.observation_id,
        r.observation_date ? format(new Date(r.observation_date), 'yyyy-MM-dd') : '',
        `"${(r.area || '').replace(/"/g, '""')}"`,
        `"${(r.contractor || '').replace(/"/g, '""')}"`,
        r.category || '',
        r.observation_type || '',
        r.priority || '',
        `"${(r.description || '').replace(/"/g, '""')}"`,
        `"${(r.immediate_action || '').replace(/"/g, '""')}"`,
        `"${(r.responsible_supervisor || '').replace(/"/g, '""')}"`,
        r.proposed_rectification_date ? format(new Date(r.proposed_rectification_date), 'yyyy-MM-dd') : '',
        r.status || '',
        r.verified_by || '',
        r.verified_date ? format(new Date(r.verified_date), 'yyyy-MM-dd') : '',
      ].join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="observations_${format(new Date(), 'yyyy-MM-dd')}.csv"`);
    res.send(csvHeader + csvRows);
  } catch (err: any) {
    console.error('Export error:', err);
    res.status(500).json({ message: 'Failed to export', error: err.message });
  }
});

// GET /api/observations/filters/options
observationsRouter.get('/filters/options', requireAuth, async (_req: Request, res: Response) => {
  try {
    const [categories, contractors, areas, types, supervisors]: any[] = await Promise.all([
      query("SELECT DISTINCT category FROM observations WHERE deleted_at IS NULL AND category IS NOT NULL AND category != '' ORDER BY category"),
      query("SELECT DISTINCT contractor FROM observations WHERE deleted_at IS NULL AND contractor IS NOT NULL AND contractor != '' ORDER BY contractor"),
      query("SELECT DISTINCT area FROM observations WHERE deleted_at IS NULL AND area IS NOT NULL AND area != '' ORDER BY area"),
      query("SELECT DISTINCT observation_type FROM observations WHERE deleted_at IS NULL AND observation_type IS NOT NULL AND observation_type != '' ORDER BY observation_type"),
      query("SELECT DISTINCT responsible_supervisor FROM observations WHERE deleted_at IS NULL AND responsible_supervisor IS NOT NULL AND responsible_supervisor != '' ORDER BY responsible_supervisor"),
    ]);

    res.json({
      categories: categories.map((r: any) => r.category),
      contractors: contractors.map((r: any) => r.contractor),
      areas: areas.map((r: any) => r.area),
      observation_types: types.map((r: any) => r.observation_type),
      supervisors: supervisors.map((r: any) => r.responsible_supervisor),
    });
  } catch (err: any) {
    console.error('Filter options error:', err);
    res.status(500).json({ message: 'Failed to load filter options' });
  }
});

// ─── LIST (root) ────────────────────────────────────
// GET /api/observations
observationsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      search, status, category, priority, contractor,
      area, observation_type, reported_by, responsible_supervisor,
      date_from, date_to, period,
      page = '1', per_page = '20',
    } = req.query as Record<string, string>;

    let sql = 'SELECT o.*, u.full_name as reporting_officer_name FROM observations o LEFT JOIN users u ON o.reporting_officer_id = u.id WHERE o.deleted_at IS NULL';
    const params: any[] = [];

    if (search) {
      sql += ' AND (o.description LIKE ? OR o.observation_id LIKE ? OR o.area LIKE ? OR o.contractor LIKE ? OR o.responsible_supervisor LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }
    if (status) { sql += ' AND o.status = ?'; params.push(status); }
    if (category) { sql += ' AND o.category = ?'; params.push(category); }
    if (priority) { sql += ' AND o.priority = ?'; params.push(priority); }
    if (contractor) { sql += ' AND o.contractor = ?'; params.push(contractor); }
    if (area) { sql += ' AND o.area LIKE ?'; params.push(`%${area}%`); }
    if (observation_type) { sql += ' AND o.observation_type = ?'; params.push(observation_type); }
    if (reported_by) { sql += ' AND (o.reporting_officer_id = ? OR u.full_name LIKE ?)'; params.push(reported_by, `%${reported_by}%`); }
    if (responsible_supervisor) { sql += ' AND o.responsible_supervisor LIKE ?'; params.push(`%${responsible_supervisor}%`); }
    if (date_from) { sql += ' AND DATE(o.observation_date) >= ?'; params.push(date_from); }
    if (date_to) { sql += ' AND DATE(o.observation_date) <= ?'; params.push(date_to); }

    if (period) {
      const now = new Date();
      switch (period) {
        case 'today':
          sql += ' AND DATE(o.observation_date) = CURDATE()';
          break;
        case 'week':
          sql += ' AND YEARWEEK(o.observation_date, 1) = YEARWEEK(CURDATE(), 1)';
          break;
        case 'month':
          sql += ' AND MONTH(o.observation_date) = ? AND YEAR(o.observation_date) = ?';
          params.push(now.getMonth() + 1, now.getFullYear());
          break;
        case 'year':
          sql += ' AND YEAR(o.observation_date) = ?';
          params.push(now.getFullYear());
          break;
      }
    }

    // Count total
    const countSql = sql.replace(/SELECT o\.\*, u\.full_name as reporting_officer_name/, 'SELECT COUNT(*) as total');
    const countRows: any[] = await query(countSql, params);
    const total = Number(countRows[0]?.total ?? 0);

    // Pagination
    const limit = Math.min(100, Math.max(1, parseInt(per_page) || 20));
    const currentPage = Math.max(1, parseInt(page) || 1);
    const offset = (currentPage - 1) * limit;

    sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows: any[] = await query(sql, params);

    // Parse JSON fields
    const data = rows.map(r => ({
      ...r,
      before_photos: typeof r.before_photos === 'string' ? JSON.parse(r.before_photos) : (r.before_photos || []),
      after_photos: typeof r.after_photos === 'string' ? JSON.parse(r.after_photos) : (r.after_photos || []),
    }));

    res.json({
      data,
      total,
      page: currentPage,
      per_page: limit,
      last_page: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error('Observations list error:', err);
    res.status(500).json({ message: 'Failed to load observations', error: err.message });
  }
});

// ─── PARAMETERIZED routes LAST ──────────────────────

// GET /api/observations/:id
observationsRouter.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const rows: any[] = await query(
      'SELECT o.*, u.full_name as reporting_officer_name FROM observations o LEFT JOIN users u ON o.reporting_officer_id = u.id WHERE o.id = ? AND o.deleted_at IS NULL',
      [req.params.id]
    );
    if (!rows.length) {
      res.status(404).json({ message: 'Observation not found' });
      return;
    }
    const obs = rows[0];
    obs.before_photos = typeof obs.before_photos === 'string' ? JSON.parse(obs.before_photos) : (obs.before_photos || []);
    obs.after_photos = typeof obs.after_photos === 'string' ? JSON.parse(obs.after_photos) : (obs.after_photos || []);
    res.json(obs);
  } catch (err: any) {
    console.error('Observation show error:', err);
    res.status(500).json({ message: 'Failed to load observation', error: err.message });
  }
});

// POST /api/observations
observationsRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      observation_date, area, contractor, category, observation_type,
      priority, description, immediate_action, responsible_supervisor,
      proposed_rectification_date, status, escalation_required,
      before_photos, after_photos,
    } = req.body;

    if (!area || !contractor || !category || !observation_type || !priority || !description) {
      res.status(422).json({ message: 'Missing required fields: area, contractor, category, observation_type, priority, description' });
      return;
    }

    // Generate observation_id
    const countRows: any[] = await query(
      'SELECT COUNT(*) as c FROM observations WHERE YEAR(created_at) = YEAR(CURDATE())'
    );
    const count = Number(countRows[0]?.c ?? 0) + 1;
    const observationId = generateObservationId(count);

    const id = uuidv4();

    await query(`
      INSERT INTO observations (
        id, observation_id, observation_date, reporting_officer_id,
        area, contractor, category, observation_type, priority,
        description, immediate_action, responsible_supervisor,
        proposed_rectification_date, status, escalation_required,
        before_photos, after_photos
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, observationId,
      observation_date || new Date(),
      req.user!.id,
      area, contractor, category, observation_type, priority,
      description, immediate_action || null, responsible_supervisor || null,
      proposed_rectification_date || null, status || 'Open',
      escalation_required ? 1 : 0,
      JSON.stringify(before_photos || []),
      JSON.stringify(after_photos || []),
    ]);

    const rows: any[] = await query(
      'SELECT o.*, u.full_name as reporting_officer_name FROM observations o LEFT JOIN users u ON o.reporting_officer_id = u.id WHERE o.id = ?',
      [id]
    );

    res.status(201).json({ message: 'Observation created successfully', observation: rows[0] });
  } catch (err: any) {
    console.error('Observation create error:', err);
    res.status(500).json({ message: 'Failed to create observation', error: err.message });
  }
});

// PUT /api/observations/:id
observationsRouter.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing: any[] = await query('SELECT id FROM observations WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!existing.length) {
      res.status(404).json({ message: 'Observation not found' });
      return;
    }

    const fields: string[] = [];
    const params: any[] = [];

    const allowedFields = [
      'observation_date', 'area', 'contractor', 'category', 'observation_type',
      'priority', 'description', 'immediate_action', 'responsible_supervisor',
      'proposed_rectification_date', 'status', 'escalation_required',
      'verified_by', 'verified_date',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'escalation_required') {
          fields.push(`${field} = ?`);
          params.push(req.body[field] ? 1 : 0);
        } else {
          fields.push(`${field} = ?`);
          params.push(req.body[field]);
        }
      }
    }

    // Handle JSON photo arrays
    if (req.body.before_photos !== undefined) {
      fields.push('before_photos = ?');
      params.push(JSON.stringify(req.body.before_photos));
    }
    if (req.body.after_photos !== undefined) {
      fields.push('after_photos = ?');
      params.push(JSON.stringify(req.body.after_photos));
    }

    if (!fields.length) {
      res.status(400).json({ message: 'No fields to update' });
      return;
    }

    params.push(id);
    await query(`UPDATE observations SET ${fields.join(', ')} WHERE id = ?`, params);

    const rows: any[] = await query(
      'SELECT o.*, u.full_name as reporting_officer_name FROM observations o LEFT JOIN users u ON o.reporting_officer_id = u.id WHERE o.id = ?',
      [id]
    );

    res.json({ message: 'Observation updated successfully', observation: rows[0] });
  } catch (err: any) {
    console.error('Observation update error:', err);
    res.status(500).json({ message: 'Failed to update observation', error: err.message });
  }
});

// PATCH /api/observations/:id/status
observationsRouter.patch('/:id/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, verified_by, verified_date } = req.body;

    if (!status) {
      res.status(422).json({ message: 'Status is required' });
      return;
    }

    const valid = ['Open', 'In Progress', 'Closed', 'Verified', 'Overdue', 'Reopened'];
    if (!valid.includes(status)) {
      res.status(422).json({ message: `Status must be one of: ${valid.join(', ')}` });
      return;
    }

    const fields: string[] = ['status = ?'];
    const params: any[] = [status];

    if (verified_by) { fields.push('verified_by = ?'); params.push(verified_by); }
    if (verified_date) { fields.push('verified_date = ?'); params.push(verified_date); }

    params.push(id);
    await query(`UPDATE observations SET ${fields.join(', ')} WHERE id = ?`, params);

    const rows: any[] = await query(
      'SELECT o.*, u.full_name as reporting_officer_name FROM observations o LEFT JOIN users u ON o.reporting_officer_id = u.id WHERE o.id = ?',
      [id]
    );

    if (!rows.length) {
      res.status(404).json({ message: 'Observation not found' });
      return;
    }

    res.json({ message: 'Status updated', observation: rows[0] });
  } catch (err: any) {
    console.error('Status update error:', err);
    res.status(500).json({ message: 'Failed to update status', error: err.message });
  }
});

// DELETE /api/observations/:id (soft delete - moves to recycle bin)
observationsRouter.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing: any[] = await query('SELECT id, ref_number, description FROM observations WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!existing.length) {
      res.status(404).json({ message: 'Observation not found' });
      return;
    }
    const obs = existing[0];
    const deletedBy = req.user?.fullName || req.user?.email || 'System';
    await query(
      'UPDATE observations SET deleted_at = NOW(), deleted_by = ? WHERE id = ?',
      [deletedBy, req.params.id]
    );
    // Create audit log entry in recycle_bin_logs for consistency with Laravel backend
    await query(
      `INSERT INTO recycle_bin_logs (action, record_type, record_id, record_name, record_code, module, performed_by, performed_by_name, created_at)
       VALUES ('deleted', 'observation', ?, ?, ?, 'Observations', ?, ?, NOW())`,
      [req.params.id, obs.description?.substring(0, 150) || '(unnamed)', obs.ref_number || null, req.user?.id || null, deletedBy]
    );
    res.json({ message: 'Deleted successfully' });
  } catch (err: any) {
    console.error('Observation delete error:', err);
    res.status(500).json({ message: 'Failed to delete observation', error: err.message });
  }
});
