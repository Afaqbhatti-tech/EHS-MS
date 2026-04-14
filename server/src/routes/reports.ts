import { Router, Request, Response } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { query } from '../db/connection.js';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  format, eachDayOfInterval, getISOWeek, parseISO, isValid,
} from 'date-fns';

export const reportsRouter = Router();

// All report routes require auth + report access permission
reportsRouter.use(requireAuth);
reportsRouter.use(requirePermission('can_access_kpis_reports'));

// Tables that support soft deletes (have deleted_at column)
const SOFT_DELETE_TABLES = new Set([
  'observations', 'permits', 'incidents', 'violations', 'training_records',
  'waste_manifests', 'mockups', 'moms', 'mock_drills', 'campaigns',
  'workers', 'tracker_records', 'tracker_categories', 'checklist_categories',
  'checklist_items', 'checklist_inspections', 'permit_amendments',
  'posters', 'dc_documents', 'contractors', 'erps',
  'environmental_aspects', 'environmental_risks', 'waste_records',
  'environmental_incidents', 'environmental_inspections',
  'environmental_compliance_register', 'environmental_objectives',
  'equipment_groups', 'equipment_items', 'equipment_registers', 'equipment_registry_groups',
]);

// ─── Helpers ────────────────────────────────────────
function fmtTs(d: Date): string { return format(d, 'yyyy-MM-dd HH:mm:ss'); }
function fmtDt(d: Date): string { return format(d, 'yyyy-MM-dd'); }

function dateRange(period: string, dateStr?: string) {
  const ref = dateStr ? parseISO(dateStr) : new Date();
  if (!isValid(ref)) throw new Error('Invalid date');

  let start: Date, end: Date, label: string;
  switch (period) {
    case 'weekly':
      start = startOfWeek(ref, { weekStartsOn: 1 });
      end = endOfWeek(ref, { weekStartsOn: 1 });
      label = `Week ${getISOWeek(ref)} (${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')})`;
      break;
    case 'monthly':
      start = startOfMonth(ref);
      end = endOfMonth(ref);
      label = format(ref, 'MMMM yyyy');
      break;
    default:
      start = startOfDay(ref);
      end = endOfDay(ref);
      label = format(ref, 'MMMM d, yyyy');
  }
  return { start, end, label };
}

// Count records in a table within a date range, with optional contractor filter
// Automatically excludes soft-deleted records for tables that support it
async function cnt(
  table: string, dateCol: string, s: string, e: string,
  cField?: string, cVal?: string,
): Promise<number> {
  const sd = SOFT_DELETE_TABLES.has(table) ? 'deleted_at IS NULL AND ' : '';
  let sql = `SELECT COUNT(*) as c FROM \`${table}\` WHERE ${sd}\`${dateCol}\` >= ? AND \`${dateCol}\` <= ?`;
  const p: any[] = [s, e];
  if (cField && cVal) { sql += ` AND \`${cField}\` = ?`; p.push(cVal); }
  const rows: any[] = await query(sql, p);
  return Number(rows[0]?.c ?? 0);
}

// Group by a column within a date range
// Automatically excludes soft-deleted records for tables that support it
async function grp(
  table: string, groupCol: string, dateCol: string, s: string, e: string,
  cField?: string, cVal?: string,
): Promise<{ label: string; value: number }[]> {
  const sd = SOFT_DELETE_TABLES.has(table) ? 'deleted_at IS NULL AND ' : '';
  let sql = `SELECT \`${groupCol}\` as label, COUNT(*) as value FROM \`${table}\` WHERE ${sd}\`${dateCol}\` >= ? AND \`${dateCol}\` <= ?`;
  const p: any[] = [s, e];
  if (cField && cVal) { sql += ` AND \`${cField}\` = ?`; p.push(cVal); }
  sql += ` GROUP BY \`${groupCol}\``;
  const rows: any[] = await query(sql, p);
  return rows.map(r => ({ label: String(r.label ?? 'Unknown'), value: Number(r.value) }));
}

// Daily trend counts
// Automatically excludes soft-deleted records for tables that support it
async function dailyTrend(
  table: string, dateCol: string, s: string, e: string,
  cField?: string, cVal?: string,
): Promise<Record<string, number>> {
  const sd = SOFT_DELETE_TABLES.has(table) ? 'deleted_at IS NULL AND ' : '';
  let sql = `SELECT DATE(\`${dateCol}\`) as d, COUNT(*) as c FROM \`${table}\` WHERE ${sd}\`${dateCol}\` >= ? AND \`${dateCol}\` <= ?`;
  const p: any[] = [s, e];
  if (cField && cVal) { sql += ` AND \`${cField}\` = ?`; p.push(cVal); }
  sql += ' GROUP BY d ORDER BY d';
  const rows: any[] = await query(sql, p);
  const map: Record<string, number> = {};
  for (const r of rows) map[fmtDt(new Date(r.d))] = Number(r.c);
  return map;
}

// ─── GET /api/reports/data ──────────────────────────
reportsRouter.get('/data', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || 'daily';
    const { start, end, label } = dateRange(period, req.query.date as string);
    const contractor = (req.query.contractor as string) || undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const isExport = req.query.export === 'true';

    // Export additionally requires can_export_reports
    if (isExport && req.user!.role !== 'master' && !req.user!.permissions.can_export_reports) {
      res.status(403).json({ message: 'Export permission required' });
      return;
    }

    const s = fmtTs(start);
    const e = fmtTs(end);
    const cf = contractor; // contractor filter value

    // ── Parallel queries ──────────────────────────
    const [
      obsTotal, obsStatus, obsTrend,
      permTotal, permStatus, permTrend,
      incTotal, incSeverity, incTrend,
      violTotal, violSeverity,
      manpowerAgg,
      equipTotal, equipStatus,
      trainTotal, trainResult,
      wasteTotal, wasteStatus,
      mockupTotal, mockupStatus,
      momTotal, drillTotal, campaignTotal,
      docTotal,
      contractorRows,
      detailedRows,
    ] = await Promise.all([
      // Observations
      cnt('observations', 'created_at', s, e, 'contractor', cf),
      grp('observations', 'status', 'created_at', s, e, 'contractor', cf),
      dailyTrend('observations', 'created_at', s, e, 'contractor', cf),
      // Permits
      cnt('permits', 'created_at', s, e, 'contractor', cf),
      grp('permits', 'status', 'created_at', s, e, 'contractor', cf),
      dailyTrend('permits', 'created_at', s, e, 'contractor', cf),
      // Incidents (uses contractor_name column)
      cnt('incidents', 'created_at', s, e, 'contractor_name', cf),
      grp('incidents', 'severity', 'created_at', s, e, 'contractor_name', cf),
      dailyTrend('incidents', 'created_at', s, e, 'contractor_name', cf),
      // Violations (uses contractor_name column)
      cnt('violations', 'created_at', s, e, 'contractor_name', cf),
      grp('violations', 'severity', 'created_at', s, e, 'contractor_name', cf),
      // Manpower aggregate (columns: headcount, man_hours) — no soft deletes on this table
      (async () => {
        let sql = `SELECT COUNT(*) as records, COALESCE(SUM(headcount),0) as headcount,
                   COALESCE(SUM(man_hours),0) as manhours
                   FROM manpower_records WHERE created_at >= ? AND created_at <= ?`;
        const p: any[] = [s, e];
        if (cf) { sql += ' AND contractor = ?'; p.push(cf); }
        const rows: any[] = await query(sql, p);
        const r = rows[0] || {};
        return { records: Number(r.records ?? 0), headcount: Number(r.headcount ?? 0), manhours: Number(r.manhours ?? 0) };
      })(),
      // Equipment
      cnt('equipment', 'created_at', s, e),
      grp('equipment', 'status', 'created_at', s, e),
      // Training (group by status, not result)
      cnt('training_records', 'created_at', s, e),
      grp('training_records', 'status', 'created_at', s, e),
      // Waste manifests (no contractor text column, column is "status" not "manifest_status")
      cnt('waste_manifests', 'created_at', s, e),
      grp('waste_manifests', 'status', 'created_at', s, e),
      // Mockups (column is "status" not "overall_status")
      cnt('mockups', 'created_at', s, e, 'contractor', cf),
      grp('mockups', 'status', 'created_at', s, e, 'contractor', cf),
      // MOMs, Drills, Campaigns, Documents
      cnt('moms', 'created_at', s, e),
      cnt('mock_drills', 'created_at', s, e),
      cnt('campaigns', 'created_at', s, e),
      cnt('dc_documents', 'created_at', s, e),
      // Contractor breakdown
      (async () => {
        try {
          const rows: any[] = await query(`
            SELECT t.contractor,
              COALESCE((SELECT COUNT(*) FROM observations  WHERE deleted_at IS NULL AND contractor = t.contractor AND created_at >= ? AND created_at <= ?), 0) as observations,
              COALESCE((SELECT COUNT(*) FROM permits       WHERE deleted_at IS NULL AND contractor = t.contractor AND created_at >= ? AND created_at <= ?), 0) as permits,
              COALESCE((SELECT COUNT(*) FROM incidents     WHERE deleted_at IS NULL AND contractor_name = t.contractor AND created_at >= ? AND created_at <= ?), 0) as incidents,
              COALESCE((SELECT COUNT(*) FROM violations    WHERE deleted_at IS NULL AND contractor_name = t.contractor AND created_at >= ? AND created_at <= ?), 0) as violations
            FROM (
              SELECT DISTINCT contractor FROM observations WHERE deleted_at IS NULL AND contractor IS NOT NULL AND contractor != '' AND created_at >= ? AND created_at <= ?
              UNION SELECT DISTINCT contractor FROM permits WHERE deleted_at IS NULL AND contractor IS NOT NULL AND contractor != '' AND created_at >= ? AND created_at <= ?
              UNION SELECT DISTINCT contractor_name as contractor FROM incidents WHERE deleted_at IS NULL AND contractor_name IS NOT NULL AND contractor_name != '' AND created_at >= ? AND created_at <= ?
              UNION SELECT DISTINCT contractor_name as contractor FROM violations WHERE deleted_at IS NULL AND contractor_name IS NOT NULL AND contractor_name != '' AND created_at >= ? AND created_at <= ?
            ) t ORDER BY t.contractor
          `, [s,e, s,e, s,e, s,e, s,e, s,e, s,e, s,e]);
          return rows.map((r: any) => ({
            contractor: r.contractor,
            observations: Number(r.observations),
            permits: Number(r.permits),
            incidents: Number(r.incidents),
            violations: Number(r.violations),
          }));
        } catch { return []; }
      })(),
      // Detailed records (unified activity feed)
      (async () => {
        // Each table uses its own contractor column name
        const obsFilter = cf ? 'AND contractor = ?' : '';
        const permFilter = cf ? 'AND contractor = ?' : '';
        const incFilter = cf ? 'AND contractor_name = ?' : '';
        const violFilter = cf ? 'AND contractor_name = ?' : '';
        const mockFilter = cf ? 'AND contractor = ?' : '';
        const cParams = cf ? [cf] : [];
        const limitClause = isExport ? '' : `LIMIT ${limit} OFFSET ${(page - 1) * limit}`;

        const rows: any[] = await query(`
          SELECT * FROM (
            SELECT 'Observation' as module, ref_number as record_id,
                   LEFT(description, 150) as title, status, priority as severity,
                   contractor, zone as area, created_at
            FROM observations WHERE deleted_at IS NULL AND created_at >= ? AND created_at <= ? ${obsFilter}
            UNION ALL
            SELECT 'Permit', ref_number, LEFT(work_description, 150), status, NULL,
                   contractor, zone, created_at
            FROM permits WHERE deleted_at IS NULL AND created_at >= ? AND created_at <= ? ${permFilter}
            UNION ALL
            SELECT 'Incident', incident_code, LEFT(description, 150), status, severity,
                   contractor_name as contractor, area, created_at
            FROM incidents WHERE deleted_at IS NULL AND created_at >= ? AND created_at <= ? ${incFilter}
            UNION ALL
            SELECT 'Violation', violation_code, LEFT(description, 150),
                   CONCAT(COALESCE(severity,''), ' - ', COALESCE(violation_type,'')), severity,
                   contractor_name as contractor, area, created_at
            FROM violations WHERE deleted_at IS NULL AND created_at >= ? AND created_at <= ? ${violFilter}
            UNION ALL
            SELECT 'Waste Manifest', manifest_code, LEFT(COALESCE(waste_description,''), 150),
                   status, NULL, generator_company as contractor, source_area as area, created_at
            FROM waste_manifests WHERE deleted_at IS NULL AND created_at >= ? AND created_at <= ?
            UNION ALL
            SELECT 'Mock-Up', ref_number, title, status, NULL,
                   contractor, area, created_at
            FROM mockups WHERE deleted_at IS NULL AND created_at >= ? AND created_at <= ? ${mockFilter}
          ) combined
          ORDER BY created_at DESC
          ${limitClause}
        `, [
          s, e, ...cParams,
          s, e, ...cParams,
          s, e, ...cParams,
          s, e, ...cParams,
          s, e,
          s, e, ...cParams,
        ]);
        return rows;
      })(),
    ]);

    // ── Build trend array with all dates filled ──
    const days = eachDayOfInterval({ start, end });
    const trend = days.map(d => {
      const key = fmtDt(d);
      return {
        date: key,
        label: format(d, 'MMM d'),
        observations: obsTrend[key] || 0,
        permits: permTrend[key] || 0,
        incidents: incTrend[key] || 0,
      };
    });

    const totalRecords = obsTotal + permTotal + incTotal + violTotal + wasteTotal + mockupTotal;

    res.json({
      period: { type: period, start: fmtDt(start), end: fmtDt(end), label },
      summary: {
        observations: { total: obsTotal, breakdown: obsStatus },
        permits: { total: permTotal, breakdown: permStatus },
        incidents: { total: incTotal, breakdown: incSeverity },
        violations: { total: violTotal, breakdown: violSeverity },
        manpower: manpowerAgg,
        equipment: { total: equipTotal, breakdown: equipStatus },
        training: { total: trainTotal, breakdown: trainResult },
        wasteManifests: { total: wasteTotal, breakdown: wasteStatus },
        mockups: { total: mockupTotal, breakdown: mockupStatus },
        moms: { total: momTotal },
        mockDrills: { total: drillTotal },
        campaigns: { total: campaignTotal },
        documents: { total: docTotal },
      },
      contractorBreakdown: contractorRows,
      trend,
      records: {
        data: detailedRows,
        total: totalRecords,
        page,
        limit,
        pages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (err: any) {
    console.error('Report data error:', err);
    res.status(500).json({ message: 'Failed to generate report', error: err.message });
  }
});

// ─── GET /api/reports/contractors ───────────────────
reportsRouter.get('/contractors', async (_req: Request, res: Response) => {
  try {
    const rows: any[] = await query(`
      SELECT DISTINCT contractor FROM (
        SELECT DISTINCT contractor FROM observations WHERE deleted_at IS NULL AND contractor IS NOT NULL AND contractor != ''
        UNION SELECT DISTINCT contractor FROM permits WHERE deleted_at IS NULL AND contractor IS NOT NULL AND contractor != ''
        UNION SELECT DISTINCT contractor_name as contractor FROM incidents WHERE deleted_at IS NULL AND contractor_name IS NOT NULL AND contractor_name != ''
        UNION SELECT DISTINCT contractor_name as contractor FROM violations WHERE deleted_at IS NULL AND contractor_name IS NOT NULL AND contractor_name != ''
        UNION SELECT DISTINCT contractor FROM manpower_records WHERE contractor IS NOT NULL AND contractor != ''
        UNION SELECT DISTINCT contractor FROM mockups WHERE deleted_at IS NULL AND contractor IS NOT NULL AND contractor != ''
      ) t ORDER BY contractor
    `);
    res.json(rows.map((r: any) => r.contractor));
  } catch (err: any) {
    console.error('Contractors error:', err);
    res.status(500).json({ message: 'Failed to fetch contractors' });
  }
});
