<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * GET /api/reports/data
     */
    public function data(Request $request): JsonResponse
    {
        $period = $request->query('period', 'daily');
        $dateStr = $request->query('date', now()->toDateString());
        $contractor = $request->query('contractor');
        $page = max(1, (int) $request->query('page', 1));
        $limit = min(100, max(1, (int) $request->query('limit', 25)));

        // Calculate date range
        $date = Carbon::parse($dateStr);
        [$startDate, $endDate] = $this->getDateRange($period, $date);

        $start = $startDate->toDateString();
        $end = $endDate->toDateString();

        // Build contractor filter
        $contractorFilter = $contractor ? $contractor : null;

        // Run all queries in parallel-ish fashion (sequential in PHP, but optimized)
        $observations = $this->getObservationStats($start, $end, $contractorFilter);
        $permits = $this->getPermitStats($start, $end, $contractorFilter);
        $incidents = $this->getIncidentStats($start, $end, $contractorFilter);
        $violations = $this->getViolationStats($start, $end, $contractorFilter);
        $manpower = $this->getManpowerStats($start, $end, $contractorFilter);
        $equipment = $this->getEquipmentStats($contractorFilter);
        $training = $this->getTrainingStats($start, $end, $contractorFilter);
        $wasteManifests = $this->getWasteStats($start, $end, $contractorFilter);
        $mockups = $this->getMockupStats($start, $end, $contractorFilter);
        $moms = $this->getMomCount($start, $end);
        $drills = $this->getDrillCount($start, $end);
        $campaigns = $this->getCampaignCount($start, $end);
        $documents = $this->getDocumentCount($start, $end);

        // Contractor breakdown
        $contractorBreakdown = $this->getContractorBreakdown($start, $end);

        // Activity feed with pagination
        $offset = ($page - 1) * $limit;
        $activities = $this->getActivityFeed($start, $end, $contractorFilter, $limit, $offset);

        // Trend data
        $trend = $this->getTrend($start, $end, $contractorFilter);

        return response()->json([
            'period' => $period,
            'startDate' => $start,
            'endDate' => $end,
            'contractor' => $contractorFilter,
            'observations' => $observations,
            'permits' => $permits,
            'incidents' => $incidents,
            'violations' => $violations,
            'manpower' => $manpower,
            'equipment' => $equipment,
            'training' => $training,
            'wasteManifests' => $wasteManifests,
            'mockups' => $mockups,
            'moms' => $moms,
            'drills' => $drills,
            'campaigns' => $campaigns,
            'documents' => $documents,
            'contractorBreakdown' => $contractorBreakdown,
            'activities' => $activities,
            'trend' => $trend,
            'page' => $page,
            'limit' => $limit,
        ]);
    }

    /**
     * GET /api/reports/contractors
     */
    public function contractors(): JsonResponse
    {
        $contractors = collect();

        $tables = [
            'observations', 'permits', 'incidents', 'violations',
            'equipment', 'manpower_records', 'waste_manifests',
        ];

        foreach ($tables as $table) {
            if (\Schema::hasColumn($table, 'contractor')) {
                $vals = DB::table($table)
                    ->whereNotNull('contractor')
                    ->where('contractor', '!=', '')
                    ->distinct()
                    ->pluck('contractor');
                $contractors = $contractors->merge($vals);
            }
        }

        return response()->json($contractors->unique()->sort()->values());
    }

    // ─── Private helpers ────────────────────────

    private function getDateRange(string $period, Carbon $date): array
    {
        return match ($period) {
            'weekly' => [$date->copy()->startOfWeek(), $date->copy()->endOfWeek()],
            'monthly' => [$date->copy()->startOfMonth(), $date->copy()->endOfMonth()],
            default => [$date->copy()->startOfDay(), $date->copy()->endOfDay()],
        };
    }

    private function getObservationStats(string $start, string $end, ?string $contractor): array
    {
        $q = DB::table('observations')
            ->whereBetween('observation_date', [$start, $end]);
        if ($contractor) $q->where('contractor', $contractor);

        $total = $q->count();
        $byStatus = (clone $q)->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')->pluck('count', 'status')->toArray();

        return ['total' => $total, 'byStatus' => $byStatus];
    }

    private function getPermitStats(string $start, string $end, ?string $contractor): array
    {
        $q = DB::table('permits')
            ->whereBetween('valid_from', [$start, $end . ' 23:59:59']);
        if ($contractor) $q->where('contractor', $contractor);

        $total = $q->count();
        $byStatus = (clone $q)->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')->pluck('count', 'status')->toArray();

        return ['total' => $total, 'byStatus' => $byStatus];
    }

    private function getIncidentStats(string $start, string $end, ?string $contractor): array
    {
        $q = DB::table('incidents')
            ->whereBetween('incident_date', [$start, $end]);
        if ($contractor) $q->where('contractor', $contractor);

        $total = $q->count();
        $bySeverity = (clone $q)->select('severity', DB::raw('COUNT(*) as count'))
            ->groupBy('severity')->pluck('count', 'severity')->toArray();

        return ['total' => $total, 'bySeverity' => $bySeverity];
    }

    private function getViolationStats(string $start, string $end, ?string $contractor): array
    {
        $q = DB::table('violations')
            ->whereBetween('violation_date', [$start, $end]);
        if ($contractor) $q->where('contractor', $contractor);

        $total = $q->count();
        $bySeverity = (clone $q)->select('severity', DB::raw('COUNT(*) as count'))
            ->groupBy('severity')->pluck('count', 'severity')->toArray();

        return ['total' => $total, 'bySeverity' => $bySeverity];
    }

    private function getManpowerStats(string $start, string $end, ?string $contractor): array
    {
        $q = DB::table('manpower_records')
            ->whereBetween('record_date', [$start, $end]);
        if ($contractor) $q->where('contractor', $contractor);

        $records = $q->count();
        $agg = (clone $q)->select(
            DB::raw('COALESCE(SUM(headcount), 0) as total_headcount'),
            DB::raw('COALESCE(SUM(man_hours), 0) as total_man_hours'),
        )->first();

        return [
            'records' => $records,
            'totalHeadcount' => (int) ($agg->total_headcount ?? 0),
            'totalManHours' => (float) ($agg->total_man_hours ?? 0),
        ];
    }

    private function getEquipmentStats(?string $contractor): array
    {
        $q = DB::table('equipment');
        if ($contractor) $q->where('contractor', $contractor);

        $total = $q->count();
        $byStatus = (clone $q)->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')->pluck('count', 'status')->toArray();

        return ['total' => $total, 'byStatus' => $byStatus];
    }

    private function getTrainingStats(string $start, string $end, ?string $contractor): array
    {
        $q = DB::table('training_records')
            ->whereBetween('training_date', [$start, $end]);
        if ($contractor) $q->where('contractor', $contractor);

        $total = $q->count();
        $byResult = (clone $q)->select('result', DB::raw('COUNT(*) as count'))
            ->groupBy('result')->pluck('count', 'result')->toArray();

        return ['total' => $total, 'byResult' => $byResult];
    }

    private function getWasteStats(string $start, string $end, ?string $contractor): array
    {
        $q = DB::table('waste_manifests')
            ->whereBetween('manifest_date', [$start, $end]);
        if ($contractor) $q->where('contractor', $contractor);

        $total = $q->count();
        $byStatus = (clone $q)->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')->pluck('count', 'status')->toArray();

        return ['total' => $total, 'byStatus' => $byStatus];
    }

    private function getMockupStats(string $start, string $end, ?string $contractor): array
    {
        $q = DB::table('mockups')
            ->whereBetween('created_at', [$start, $end . ' 23:59:59']);
        if ($contractor) $q->where('contractor', $contractor);

        $total = $q->count();
        $byStatus = (clone $q)->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')->pluck('count', 'status')->toArray();

        return ['total' => $total, 'byStatus' => $byStatus];
    }

    private function getMomCount(string $start, string $end): int
    {
        return DB::table('moms')->whereBetween('meeting_date', [$start, $end])->count();
    }

    private function getDrillCount(string $start, string $end): int
    {
        return DB::table('mock_drills')->whereBetween('drill_date', [$start, $end])->count();
    }

    private function getCampaignCount(string $start, string $end): int
    {
        return DB::table('campaigns')
            ->where('start_date', '<=', $end)
            ->where(function ($q) use ($start) {
                $q->whereNull('end_date')->orWhere('end_date', '>=', $start);
            })->count();
    }

    private function getDocumentCount(string $start, string $end): int
    {
        return DB::table('documents')
            ->whereBetween('created_at', [$start, $end . ' 23:59:59'])
            ->count();
    }

    private function getContractorBreakdown(string $start, string $end): array
    {
        $contractors = DB::table('observations')
            ->whereBetween('observation_date', [$start, $end])
            ->whereNotNull('contractor')
            ->select('contractor', DB::raw('COUNT(*) as observations'))
            ->groupBy('contractor')
            ->get()
            ->keyBy('contractor');

        $permitCounts = DB::table('permits')
            ->whereBetween('valid_from', [$start, $end . ' 23:59:59'])
            ->whereNotNull('contractor')
            ->select('contractor', DB::raw('COUNT(*) as permits'))
            ->groupBy('contractor')
            ->get()
            ->keyBy('contractor');

        $incidentCounts = DB::table('incidents')
            ->whereBetween('incident_date', [$start, $end])
            ->whereNotNull('contractor')
            ->select('contractor', DB::raw('COUNT(*) as incidents'))
            ->groupBy('contractor')
            ->get()
            ->keyBy('contractor');

        $violationCounts = DB::table('violations')
            ->whereBetween('violation_date', [$start, $end])
            ->whereNotNull('contractor')
            ->select('contractor', DB::raw('COUNT(*) as violations'))
            ->groupBy('contractor')
            ->get()
            ->keyBy('contractor');

        $manpowerCounts = DB::table('manpower_records')
            ->whereBetween('record_date', [$start, $end])
            ->whereNotNull('contractor')
            ->select('contractor', DB::raw('COALESCE(SUM(man_hours), 0) as man_hours'))
            ->groupBy('contractor')
            ->get()
            ->keyBy('contractor');

        // Merge all contractor keys
        $allContractors = collect()
            ->merge($contractors->keys())
            ->merge($permitCounts->keys())
            ->merge($incidentCounts->keys())
            ->merge($violationCounts->keys())
            ->merge($manpowerCounts->keys())
            ->unique();

        return $allContractors->map(function ($c) use ($contractors, $permitCounts, $incidentCounts, $violationCounts, $manpowerCounts) {
            return [
                'contractor' => $c,
                'observations' => (int) ($contractors[$c]->observations ?? 0),
                'permits' => (int) ($permitCounts[$c]->permits ?? 0),
                'incidents' => (int) ($incidentCounts[$c]->incidents ?? 0),
                'violations' => (int) ($violationCounts[$c]->violations ?? 0),
                'manHours' => (float) ($manpowerCounts[$c]->man_hours ?? 0),
            ];
        })->values()->toArray();
    }

    private function getActivityFeed(string $start, string $end, ?string $contractor, int $limit, int $offset): array
    {
        // Union query across multiple tables
        $queries = [];

        $obsQ = DB::table('observations')
            ->whereBetween('observation_date', [$start, $end])
            ->select(
                DB::raw("'observation' as module"),
                'ref_number',
                'observation_date as activity_date',
                'status',
                'contractor',
                'category as detail',
                'priority as severity',
            );
        if ($contractor) $obsQ->where('contractor', $contractor);
        $queries[] = $obsQ;

        $permitQ = DB::table('permits')
            ->whereBetween('valid_from', [$start, $end . ' 23:59:59'])
            ->select(
                DB::raw("'permit' as module"),
                'ref_number',
                DB::raw('DATE(valid_from) as activity_date'),
                'status',
                'contractor',
                'permit_type as detail',
                DB::raw("NULL as severity"),
            );
        if ($contractor) $permitQ->where('contractor', $contractor);
        $queries[] = $permitQ;

        $incQ = DB::table('incidents')
            ->whereBetween('incident_date', [$start, $end])
            ->select(
                DB::raw("'incident' as module"),
                'ref_number',
                'incident_date as activity_date',
                'status',
                'contractor',
                'classification as detail',
                'severity',
            );
        if ($contractor) $incQ->where('contractor', $contractor);
        $queries[] = $incQ;

        $violQ = DB::table('violations')
            ->whereBetween('violation_date', [$start, $end])
            ->select(
                DB::raw("'violation' as module"),
                'ref_number',
                'violation_date as activity_date',
                'status',
                'contractor',
                'action_type as detail',
                'severity',
            );
        if ($contractor) $violQ->where('contractor', $contractor);
        $queries[] = $violQ;

        // Build union
        $union = $queries[0];
        for ($i = 1; $i < count($queries); $i++) {
            $union = $union->unionAll($queries[$i]);
        }

        $results = DB::table(DB::raw("({$union->toSql()}) as feed"))
            ->mergeBindings($union)
            ->orderByDesc('activity_date')
            ->offset($offset)
            ->limit($limit)
            ->get();

        return $results->map(fn ($r) => (array) $r)->toArray();
    }

    private function getTrend(string $start, string $end, ?string $contractor): array
    {
        $obsQ = DB::table('observations')
            ->whereBetween('observation_date', [$start, $end])
            ->select('observation_date as d', DB::raw('COUNT(*) as c'));
        if ($contractor) $obsQ->where('contractor', $contractor);
        $obs = $obsQ->groupBy('observation_date')->pluck('c', 'd');

        $permitQ = DB::table('permits')
            ->whereBetween(DB::raw('DATE(valid_from)'), [$start, $end])
            ->select(DB::raw('DATE(valid_from) as d'), DB::raw('COUNT(*) as c'));
        if ($contractor) $permitQ->where('contractor', $contractor);
        $perm = $permitQ->groupBy('d')->pluck('c', 'd');

        $incQ = DB::table('incidents')
            ->whereBetween('incident_date', [$start, $end])
            ->select('incident_date as d', DB::raw('COUNT(*) as c'));
        if ($contractor) $incQ->where('contractor', $contractor);
        $inc = $incQ->groupBy('incident_date')->pluck('c', 'd');

        // Build daily trend
        $trend = [];
        $current = Carbon::parse($start);
        $endDate = Carbon::parse($end);

        while ($current->lte($endDate)) {
            $d = $current->toDateString();
            $trend[] = [
                'date' => $d,
                'observations' => (int) ($obs[$d] ?? 0),
                'permits' => (int) ($perm[$d] ?? 0),
                'incidents' => (int) ($inc[$d] ?? 0),
            ];
            $current->addDay();
        }

        return $trend;
    }
}
