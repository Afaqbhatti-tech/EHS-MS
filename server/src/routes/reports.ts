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
async function cnt(
  table: string, dateCol: string, s: string, e: string,
  cField?: string, cVal?: string,
): Promise<number> {
  let sql = `SELECT COUNT(*) as c FROM \`${table}\` WHERE \`${dateCol}\` >= ? AND \`${dateCol}\` <= ?`;
  const p: any[] = [s, e];
  if (cField && cVal) { sql += ` AND \`${cField}\` = ?`; p.push(cVal); }
  const rows: any[] = await query(sql, p);
  return Number(rows[0]?.c ?? 0);
}

// Group by a column within a date range
async function grp(
  table: string, groupCol: string, dateCol: string, s: string, e: string,
  cField?: string, cVal?: string,
): Promise<{ label: string; value: number }[]> {
  let sql = `SELECT \`${groupCol}\` as label, COUNT(*) as value FROM \`${table}\` WHERE \`${dateCol}\` >= ? AND \`${dateCol}\` <= ?`;
  const p: any[] = [s, e];
  if (cField && cVal) { sql += ` AND \`${cField}\` = ?`; p.push(cVal); }
  sql += ` GROUP BY \`${groupCol}\``;
  const rows: any[] = await query(sql, p);
  return rows.map(r => ({ label: String(r.label ?? 'Unknown'), value: Number(r.value) }));
}

// Daily trend counts
async function dailyTrend(
  table: string, dateCol: string, s: string, e: string,
  cField?: string, cVal?: string,
): Promise<Record<string, number>> {
  let sql = `SELECT DATE(\`${dateCol}\`) as d, COUNT(*) as c FROM \`${table}\` WHERE \`${dateCol}\` >= ? AND \`${dateCol}\` <= ?`;
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
      // Incidents
      cnt('incidents', 'created_at', s, e, 'contractor', cf),
      grp('incidents', 'severity', 'created_at', s, e, 'contractor', cf),
      dailyTrend('incidents', 'created_at', s, e, 'contractor', cf),
      // Violations
      cnt('violations', 'created_at', s, e, 'contractor', cf),
      grp('violations', 'severity', 'created_at', s, e, 'contractor', cf),
      // Manpower aggregate
      (async () => {
        let sql = `SELECT COUNT(*) as records, COALESCE(SUM(total_headcount),0) as headcount,
                   COALESCE(SUM(total_manhours),0) as manhours
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
      // Training
      cnt('training_records', 'created_at', s, e),
      grp('training_records', 'result', 'created_at', s, e),
      // Waste manifests
      cnt('waste_manifests', 'created_at', s, e, 'contractor', cf),
      grp('waste_manifests', 'manifest_status', 'created_at', s, e, 'contractor', cf),
      // Mockups
      cnt('mockups', 'created_at', s, e, 'contractor', cf),
      grp('mockups', 'overall_status', 'created_at', s, e, 'contractor', cf),
      // MOMs, Drills, Campaigns, Documents
      cnt('moms', 'created_at', s, e),
      cnt('mock_drills', 'created_at', s, e),
      cnt('campaigns', 'created_at', s, e),
      cnt('documents', 'created_at', s, e),
      // Contractor breakdown
      (async () => {
        try {
          const rows: any[] = await query(`
            SELECT t.contractor,
              COALESCE((SELECT COUNT(*) FROM observations  WHERE contractor = t.contractor AND created_at >= ? AND created_at <= ?), 0) as observations,
              COALESCE((SELECT COUNT(*) FROM permits       WHERE contractor = t.contractor AND created_at >= ? AND created_at <= ?), 0) as permits,
              COALESCE((SELECT COUNT(*) FROM incidents     WHERE contractor = t.contractor AND created_at >= ? AND created_at <= ?), 0) as incidents,
              COALESCE((SELECT COUNT(*) FROM violations    WHERE contractor = t.contractor AND created_at >= ? AND created_at <= ?), 0) as violations
            FROM (
              SELECT DISTINCT contractor FROM observations WHERE contractor IS NOT NULL AND contractor != '' AND created_at >= ? AND created_at <= ?
              UNION SELECT DISTINCT contractor FROM permits WHERE contractor IS NOT NULL AND contractor != '' AND created_at >= ? AND created_at <= ?
              UNION SELECT DISTINCT contractor FROM incidents WHERE contractor IS NOT NULL AND contractor != '' AND created_at >= ? AND created_at <= ?
              UNION SELECT DISTINCT contractor FROM violations WHERE contractor IS NOT NULL AND contractor != '' AND created_at >= ? AND created_at <= ?
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
        const cFilter = cf ? 'AND contractor = ?' : '';
        const cParams = cf ? [cf] : [];
        const limitClause = isExport ? '' : `LIMIT ${limit} OFFSET ${(page - 1) * limit}`;

        const rows: any[] = await query(`
          SELECT * FROM (
            SELECT 'Observation' as module, observation_id as record_id,
                   LEFT(description, 150) as title, status, priority as severity,
                   contractor, area, created_at
            FROM observations WHERE created_at >= ? AND created_at <= ? ${cFilter}
            UNION ALL
            SELECT 'Permit', permit_id, LEFT(work_description, 150), status, NULL,
                   contractor, zone, created_at
            FROM permits WHERE created_at >= ? AND created_at <= ? ${cFilter}
            UNION ALL
            SELECT 'Incident', incident_id, LEFT(description, 150), status, severity,
                   contractor, area, created_at
            FROM incidents WHERE created_at >= ? AND created_at <= ? ${cFilter}
            UNION ALL
            SELECT 'Violation', violation_id, LEFT(description, 150),
                   CONCAT(COALESCE(severity,''), ' - ', COALESCE(action_type,'')), severity,
                   contractor, area, created_at
            FROM violations WHERE created_at >= ? AND created_at <= ? ${cFilter}
            UNION ALL
            SELECT 'Waste Manifest', manifest_id, LEFT(COALESCE(waste_description,''), 150),
                   manifest_status, NULL, contractor, area, created_at
            FROM waste_manifests WHERE created_at >= ? AND created_at <= ? ${cFilter}
            UNION ALL
            SELECT 'Mock-Up', mockup_id, title, overall_status, NULL,
                   contractor, area, created_at
            FROM mockups WHERE created_at >= ? AND created_at <= ? ${cFilter}
          ) combined
          ORDER BY created_at DESC
          ${limitClause}
        `, [
          s, e, ...cParams,
          s, e, ...cParams,
          s, e, ...cParams,
          s, e, ...cParams,
          s, e, ...cParams,
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
        SELECT DISTINCT contractor FROM observations WHERE contractor IS NOT NULL AND contractor != ''
        UNION SELECT DISTINCT contractor FROM permits WHERE contractor IS NOT NULL AND contractor != ''
        UNION SELECT DISTINCT contractor FROM incidents WHERE contractor IS NOT NULL AND contractor != ''
        UNION SELECT DISTINCT contractor FROM violations WHERE contractor IS NOT NULL AND contractor != ''
        UNION SELECT DISTINCT contractor FROM manpower_records WHERE contractor IS NOT NULL AND contractor != ''
        UNION SELECT DISTINCT contractor FROM waste_manifests WHERE contractor IS NOT NULL AND contractor != ''
        UNION SELECT DISTINCT contractor FROM mockups WHERE contractor IS NOT NULL AND contractor != ''
      ) t ORDER BY contractor
    `);
    res.json(rows.map((r: any) => r.contractor));
  } catch (err: any) {
    console.error('Contractors error:', err);
    res.status(500).json({ message: 'Failed to fetch contractors' });
  }
});
