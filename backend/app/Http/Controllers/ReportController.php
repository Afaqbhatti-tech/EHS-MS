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

        // Run all queries with null safety defaults
        $observations = $this->getObservationStats($start, $end, $contractorFilter) ?? ['total' => 0];
        $permits = $this->getPermitStats($start, $end, $contractorFilter) ?? ['total' => 0];
        $incidents = $this->getIncidentStats($start, $end, $contractorFilter) ?? ['total' => 0];
        $violations = $this->getViolationStats($start, $end, $contractorFilter) ?? ['total' => 0];
        $manpower = $this->getManpowerStats($start, $end, $contractorFilter) ?? ['records' => 0, 'headcount' => 0, 'manhours' => 0];
        $equipment = $this->getEquipmentStats($contractorFilter) ?? ['total' => 0];
        $training = $this->getTrainingStats($start, $end, $contractorFilter) ?? ['total' => 0];
        $wasteManifests = $this->getWasteStats($start, $end, $contractorFilter) ?? ['total' => 0];
        $mockups = $this->getMockupStats($start, $end, $contractorFilter) ?? ['total' => 0];
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

        // Build period label
        $periodLabel = match ($period) {
            'weekly' => 'Week ' . $date->isoWeek() . ' (' . Carbon::parse($start)->format('M j') . ' – ' . Carbon::parse($end)->format('M j, Y') . ')',
            'monthly' => $date->format('F Y'),
            default => $date->format('F j, Y'),
        };

        // Total records for pagination
        $totalRecords = ($observations['total'] ?? 0) + ($permits['total'] ?? 0)
            + ($incidents['total'] ?? 0) + ($violations['total'] ?? 0)
            + ($wasteManifests['total'] ?? 0) + ($mockups['total'] ?? 0);

        return response()->json([
            'period' => [
                'type'  => $period,
                'start' => $start,
                'end'   => $end,
                'label' => $periodLabel,
            ],
            'summary' => [
                'observations'   => ['total' => $observations['total'] ?? 0, 'breakdown' => $this->mapBreakdown($observations['byStatus'] ?? $observations['breakdown'] ?? [])],
                'permits'        => ['total' => $permits['total'] ?? 0, 'breakdown' => $this->mapBreakdown($permits['byStatus'] ?? $permits['breakdown'] ?? [])],
                'incidents'      => ['total' => $incidents['total'] ?? 0, 'breakdown' => $this->mapBreakdown($incidents['bySeverity'] ?? $incidents['breakdown'] ?? [])],
                'violations'     => ['total' => $violations['total'] ?? 0, 'breakdown' => $this->mapBreakdown($violations['bySeverity'] ?? $violations['breakdown'] ?? [])],
                'manpower'       => $manpower,
                'equipment'      => ['total' => $equipment['total'] ?? 0, 'breakdown' => $this->mapBreakdown($equipment['byStatus'] ?? $equipment['breakdown'] ?? [])],
                'training'       => ['total' => $training['total'] ?? 0, 'breakdown' => $this->mapBreakdown($training['byStatus'] ?? $training['breakdown'] ?? [])],
                'wasteManifests' => ['total' => $wasteManifests['total'] ?? 0, 'breakdown' => $this->mapBreakdown($wasteManifests['byStatus'] ?? $wasteManifests['breakdown'] ?? [])],
                'mockups'        => ['total' => $mockups['total'] ?? 0, 'breakdown' => $this->mapBreakdown($mockups['byStatus'] ?? $mockups['breakdown'] ?? [])],
                'moms'           => ['total' => $moms],
                'mockDrills'     => ['total' => $drills],
                'campaigns'      => ['total' => $campaigns],
                'documents'      => ['total' => $documents],
            ],
            'contractorBreakdown' => $contractorBreakdown,
            'trend' => $trend,
            'records' => [
                'data'  => $activities,
                'total' => $totalRecords,
                'page'  => $page,
                'limit' => $limit,
                'pages' => max(1, (int) ceil($totalRecords / $limit)),
            ],
        ]);
    }

    /**
     * GET /api/reports/contractors
     */
    public function contractors(): JsonResponse
    {
        $contractors = collect();

        // Tables with a 'contractor' text column
        $standardTables = ['observations', 'permits', 'equipment', 'manpower_records', 'mockups'];
        foreach ($standardTables as $table) {
            if (\Schema::hasColumn($table, 'contractor')) {
                $q = DB::table($table)
                    ->whereNotNull('contractor')
                    ->where('contractor', '!=', '');
                if (\Schema::hasColumn($table, 'deleted_at')) {
                    $q->whereNull('deleted_at');
                }
                $contractors = $contractors->merge($q->distinct()->pluck('contractor'));
            }
        }

        // Tables with 'contractor_name' column
        foreach (['incidents', 'violations'] as $table) {
            if (\Schema::hasColumn($table, 'contractor_name')) {
                $q = DB::table($table)
                    ->whereNull('deleted_at')
                    ->whereNotNull('contractor_name')
                    ->where('contractor_name', '!=', '');
                $contractors = $contractors->merge($q->distinct()->pluck('contractor_name'));
            }
        }

        return response()->json($contractors->unique()->sort()->values());
    }

    // ─── Private helpers ────────────────────────

    private function mapBreakdown(array $data): array
    {
        $result = [];
        foreach ($data as $label => $value) {
            $result[] = ['label' => (string) ($label ?: 'Unknown'), 'value' => (int) $value];
        }
        return $result;
    }

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
            ->whereNull('deleted_at')
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
            ->whereNull('deleted_at')
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
            ->whereNull('deleted_at')
            ->whereBetween('incident_date', [$start, $end]);
        if ($contractor) $q->where('contractor_name', $contractor);

        $total = $q->count();
        $bySeverity = (clone $q)->select('severity', DB::raw('COUNT(*) as count'))
            ->groupBy('severity')->pluck('count', 'severity')->toArray();

        return ['total' => $total, 'bySeverity' => $bySeverity];
    }

    private function getViolationStats(string $start, string $end, ?string $contractor): array
    {
        $q = DB::table('violations')
            ->whereNull('deleted_at')
            ->whereBetween('violation_date', [$start, $end]);
        if ($contractor) $q->where('contractor_name', $contractor);

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
            'headcount' => (int) ($agg ? ($agg->total_headcount ?? 0) : 0),
            'manhours' => (float) ($agg ? ($agg->total_man_hours ?? 0) : 0),
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
            ->whereNull('training_records.deleted_at')
            ->whereBetween('training_date', [$start, $end]);
        if ($contractor) {
            $q->join('workers', 'training_records.worker_id', '=', 'workers.id')
              ->where('workers.company', $contractor);
        }

        $total = $q->count();
        $byStatus = (clone $q)->select('training_records.status', DB::raw('COUNT(*) as count'))
            ->groupBy('training_records.status')->pluck('count', 'training_records.status')->toArray();

        return ['total' => $total, 'byStatus' => $byStatus];
    }

    private function getWasteStats(string $start, string $end, ?string $contractor): array
    {
        $q = DB::table('waste_manifests')
            ->whereNull('deleted_at')
            ->whereBetween('manifest_date', [$start, $end]);
        if ($contractor) $q->where('generator_company', $contractor);

        $total = $q->count();
        $byStatus = (clone $q)->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')->pluck('count', 'status')->toArray();

        return ['total' => $total, 'byStatus' => $byStatus];
    }

    private function getMockupStats(string $start, string $end, ?string $contractor): array
    {
        $q = DB::table('mockups')
            ->whereNull('deleted_at')
            ->whereBetween('created_at', [$start, $end . ' 23:59:59']);
        if ($contractor) $q->where('contractor', $contractor);

        $total = $q->count();
        $byStatus = (clone $q)->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')->pluck('count', 'status')->toArray();

        return ['total' => $total, 'byStatus' => $byStatus];
    }

    private function getMomCount(string $start, string $end): int
    {
        return DB::table('moms')->whereNull('deleted_at')->whereBetween('meeting_date', [$start, $end])->count();
    }

    private function getDrillCount(string $start, string $end): int
    {
        return DB::table('mock_drills')->whereNull('deleted_at')->whereBetween('planned_date', [$start, $end])->count();
    }

    private function getCampaignCount(string $start, string $end): int
    {
        return DB::table('campaigns')
            ->whereNull('deleted_at')
            ->where('start_date', '<=', $end)
            ->where(function ($q) use ($start) {
                $q->whereNull('end_date')->orWhere('end_date', '>=', $start);
            })->count();
    }

    private function getDocumentCount(string $start, string $end): int
    {
        return DB::table('dc_documents')
            ->whereNull('deleted_at')
            ->whereBetween('created_at', [$start, $end . ' 23:59:59'])
            ->count();
    }

    private function getContractorBreakdown(string $start, string $end): array
    {
        $contractors = DB::table('observations')
            ->whereNull('deleted_at')
            ->whereBetween('observation_date', [$start, $end])
            ->whereNotNull('contractor')
            ->where('contractor', '!=', '')
            ->select('contractor', DB::raw('COUNT(*) as observations'))
            ->groupBy('contractor')
            ->get()
            ->keyBy('contractor');

        $permitCounts = DB::table('permits')
            ->whereNull('deleted_at')
            ->whereBetween('valid_from', [$start, $end . ' 23:59:59'])
            ->whereNotNull('contractor')
            ->where('contractor', '!=', '')
            ->select('contractor', DB::raw('COUNT(*) as permits'))
            ->groupBy('contractor')
            ->get()
            ->keyBy('contractor');

        $incidentCounts = DB::table('incidents')
            ->whereNull('deleted_at')
            ->whereBetween('incident_date', [$start, $end])
            ->whereNotNull('contractor_name')
            ->where('contractor_name', '!=', '')
            ->select('contractor_name as contractor', DB::raw('COUNT(*) as incidents'))
            ->groupBy('contractor_name')
            ->get()
            ->keyBy('contractor');

        $violationCounts = DB::table('violations')
            ->whereNull('deleted_at')
            ->whereBetween('violation_date', [$start, $end])
            ->whereNotNull('contractor_name')
            ->where('contractor_name', '!=', '')
            ->select('contractor_name as contractor', DB::raw('COUNT(*) as violations'))
            ->groupBy('contractor_name')
            ->get()
            ->keyBy('contractor');

        $manpowerCounts = DB::table('manpower_records')
            ->whereBetween('record_date', [$start, $end])
            ->whereNotNull('contractor')
            ->where('contractor', '!=', '')
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
            ->unique()
            ->filter();

        if ($allContractors->isEmpty()) {
            return [];
        }

        return $allContractors->map(function ($c) use ($contractors, $permitCounts, $incidentCounts, $violationCounts, $manpowerCounts) {
            $obsRow = $contractors->get($c);
            $permRow = $permitCounts->get($c);
            $incRow = $incidentCounts->get($c);
            $violRow = $violationCounts->get($c);
            $mpRow = $manpowerCounts->get($c);

            return [
                'contractor' => $c,
                'observations' => (int) ($obsRow ? ($obsRow->observations ?? 0) : 0),
                'permits' => (int) ($permRow ? ($permRow->permits ?? 0) : 0),
                'incidents' => (int) ($incRow ? ($incRow->incidents ?? 0) : 0),
                'violations' => (int) ($violRow ? ($violRow->violations ?? 0) : 0),
                'manHours' => (float) ($mpRow ? ($mpRow->man_hours ?? 0) : 0),
            ];
        })->values()->toArray();
    }

    private function getActivityFeed(string $start, string $end, ?string $contractor, int $limit, int $offset): array
    {
        // Union query across multiple tables
        $queries = [];

        $obsQ = DB::table('observations')
            ->whereNull('deleted_at')
            ->whereBetween('observation_date', [$start, $end])
            ->select(
                DB::raw("'Observation' as module"),
                'ref_number as record_id',
                DB::raw('LEFT(description, 150) as title'),
                'status',
                'priority as severity',
                'contractor',
                'zone as area',
                'created_at',
            );
        if ($contractor) $obsQ->where('contractor', $contractor);
        $queries[] = $obsQ;

        $permitQ = DB::table('permits')
            ->whereNull('deleted_at')
            ->whereBetween('valid_from', [$start, $end . ' 23:59:59'])
            ->select(
                DB::raw("'Permit' as module"),
                'ref_number as record_id',
                DB::raw('LEFT(work_description, 150) as title'),
                'status',
                DB::raw("NULL as severity"),
                'contractor',
                'zone as area',
                'created_at',
            );
        if ($contractor) $permitQ->where('contractor', $contractor);
        $queries[] = $permitQ;

        $incQ = DB::table('incidents')
            ->whereNull('deleted_at')
            ->whereBetween('incident_date', [$start, $end])
            ->select(
                DB::raw("'Incident' as module"),
                'incident_code as record_id',
                DB::raw('LEFT(description, 150) as title'),
                'status',
                'severity',
                'contractor_name as contractor',
                'area',
                'created_at',
            );
        if ($contractor) $incQ->where('contractor_name', $contractor);
        $queries[] = $incQ;

        $violQ = DB::table('violations')
            ->whereNull('deleted_at')
            ->whereBetween('violation_date', [$start, $end])
            ->select(
                DB::raw("'Violation' as module"),
                'violation_code as record_id',
                DB::raw('LEFT(description, 150) as title'),
                'status',
                'severity',
                'contractor_name as contractor',
                'area',
                'created_at',
            );
        if ($contractor) $violQ->where('contractor_name', $contractor);
        $queries[] = $violQ;

        // Protect against empty queries array
        if (empty($queries)) {
            return [];
        }

        // Build union
        $union = $queries[0];
        for ($i = 1; $i < count($queries); $i++) {
            $union = $union->unionAll($queries[$i]);
        }

        try {
            $results = DB::table(DB::raw("({$union->toSql()}) as feed"))
                ->mergeBindings($union)
                ->orderByDesc('created_at')
                ->offset($offset)
                ->limit($limit)
                ->get();

            return $results->map(fn ($r) => (array) $r)->toArray();
        } catch (\Throwable $e) {
            return [];
        }
    }

    private function getTrend(string $start, string $end, ?string $contractor): array
    {
        $obsQ = DB::table('observations')
            ->whereNull('deleted_at')
            ->whereBetween('observation_date', [$start, $end])
            ->select('observation_date as d', DB::raw('COUNT(*) as c'));
        if ($contractor) $obsQ->where('contractor', $contractor);
        $obs = $obsQ->groupBy('observation_date')->pluck('c', 'd');

        $permitQ = DB::table('permits')
            ->whereNull('deleted_at')
            ->whereBetween(DB::raw('DATE(valid_from)'), [$start, $end])
            ->select(DB::raw('DATE(valid_from) as d'), DB::raw('COUNT(*) as c'));
        if ($contractor) $permitQ->where('contractor', $contractor);
        $perm = $permitQ->groupBy('d')->pluck('c', 'd');

        $incQ = DB::table('incidents')
            ->whereNull('deleted_at')
            ->whereBetween('incident_date', [$start, $end])
            ->select('incident_date as d', DB::raw('COUNT(*) as c'));
        if ($contractor) $incQ->where('contractor_name', $contractor);
        $inc = $incQ->groupBy('incident_date')->pluck('c', 'd');

        // Build daily trend
        $trend = [];
        $current = Carbon::parse($start);
        $endDate = Carbon::parse($end);

        while ($current->lte($endDate)) {
            $d = $current->toDateString();
            $trend[] = [
                'date'  => $d,
                'label' => $current->format('M j'),
                'observations' => (int) ($obs[$d] ?? 0),
                'permits' => (int) ($perm[$d] ?? 0),
                'incidents' => (int) ($inc[$d] ?? 0),
            ];
            $current->addDay();
        }

        return $trend;
    }
}
