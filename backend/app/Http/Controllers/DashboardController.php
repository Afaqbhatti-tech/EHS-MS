<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DashboardController extends Controller
{
    private array $tableCache = [];

    private function tableExists(string $table): bool
    {
        if (!isset($this->tableCache[$table])) {
            $this->tableCache[$table] = Schema::hasTable($table);
        }
        return $this->tableCache[$table];
    }

    /**
     * GET /api/dashboard
     * Returns aggregated dashboard data filtered by user permissions.
     * Supports both module-level AND granular data-level visibility.
     */
    public function index(): JsonResponse
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $permissions = is_array($user->permissions) ? $user->permissions : (json_decode($user->permissions ?? '{}', true) ?? []);
        $isMaster = $user->isMaster();

        // Validate query parameters
        $period = request()->query('period');
        if ($period !== null && !in_array($period, ['day', 'week', 'month', 'quarter', 'year'], true)) {
            return response()->json(['error' => 'Invalid period parameter'], 422);
        }

        $date = request()->query('date');
        if ($date !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return response()->json(['error' => 'Invalid date parameter, expected YYYY-MM-DD'], 422);
        }

        $contractor = request()->query('contractor');
        if ($contractor !== null && !is_numeric($contractor)) {
            return response()->json(['error' => 'Invalid contractor parameter, expected numeric ID'], 422);
        }

        try {
            $today = Carbon::today();
            $monthStart = $today->copy()->startOfMonth()->toDateString();
            $monthEnd = $today->copy()->endOfMonth()->toDateString();

            return response()->json([
                'greeting' => $this->getGreeting(),
                'stats' => $this->getStats($monthStart, $monthEnd, $permissions, $isMaster),
                'monthlyTrend' => $this->canSee($permissions, $isMaster, 'data_dashboard_safety_chart')
                    ? $this->getMonthlyTrend($permissions, $isMaster)
                    : [],
                'recentActivity' => $this->canSee($permissions, $isMaster, 'data_dashboard_recent_activity')
                    ? $this->getRecentActivity($permissions, $isMaster)
                    : [],
                'complianceScores' => $this->canSee($permissions, $isMaster, 'data_dashboard_compliance_scorecard')
                    ? $this->getComplianceScores($monthStart, $monthEnd, $permissions, $isMaster)
                    : [],
                'aiInsights' => $this->canSee($permissions, $isMaster, 'data_dashboard_ai_insights')
                    ? $this->getAiInsights($monthStart, $monthEnd, $permissions, $isMaster)
                    : [],
                'sparkTrends' => $this->getSparkTrends($permissions, $isMaster),
                // Tell the frontend which dashboard sections are visible
                'visibleSections' => $this->getVisibleSections($permissions, $isMaster),
            ]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'error' => 'Failed to load dashboard data',
                'greeting' => $this->getGreeting(),
                'stats' => [],
                'monthlyTrend' => [],
                'recentActivity' => [],
                'complianceScores' => [],
                'aiInsights' => [],
                'sparkTrends' => [],
                'visibleSections' => [],
            ], 500);
        }
    }

    /**
     * Check both module-level AND data-level visibility.
     */
    private function canSee(array $permissions, bool $isMaster, string $dataFlag, ?string $moduleFlag = null): bool
    {
        if ($isMaster) return true;
        // If a module flag is specified, check it first
        if ($moduleFlag && empty($permissions[$moduleFlag])) return false;
        // Check granular data-level visibility
        return !empty($permissions[$dataFlag]);
    }

    private function hasPerm(array $permissions, bool $isMaster, string $flag): bool
    {
        if ($isMaster) return true;
        return !empty($permissions[$flag]);
    }

    /**
     * Returns which dashboard sections should be visible for the current user.
     */
    private function getVisibleSections(array $permissions, bool $isMaster): array
    {
        $sections = [
            'incident_free_days' => $this->canSee($permissions, $isMaster, 'data_dashboard_incident_free_days'),
            'man_hours' => $this->canSee($permissions, $isMaster, 'data_dashboard_man_hours', 'can_access_manpower'),
            'active_permits' => $this->canSee($permissions, $isMaster, 'data_dashboard_active_permits', 'can_access_permits'),
            'open_observations' => $this->canSee($permissions, $isMaster, 'data_dashboard_open_observations', 'can_access_observations'),
            'pending_amendments' => $this->canSee($permissions, $isMaster, 'data_dashboard_pending_amendments', 'can_access_permit_amendments'),
            'mom_open_actions' => $this->canSee($permissions, $isMaster, 'data_dashboard_mom_open_actions', 'can_access_weekly_mom'),
            'mockup_pending' => $this->canSee($permissions, $isMaster, 'data_dashboard_mockup_pending', 'can_access_mockup_register'),
            'open_violations' => $this->canSee($permissions, $isMaster, 'data_dashboard_open_violations', 'can_access_violations'),
            'env_manifests' => $this->canSee($permissions, $isMaster, 'data_dashboard_env_manifests', 'can_access_environmental'),
            'safety_chart' => $this->canSee($permissions, $isMaster, 'data_dashboard_safety_chart'),
            'quick_operations' => $this->canSee($permissions, $isMaster, 'data_dashboard_quick_operations'),
            'recent_activity' => $this->canSee($permissions, $isMaster, 'data_dashboard_recent_activity'),
            'ai_insights' => $this->canSee($permissions, $isMaster, 'data_dashboard_ai_insights'),
            'compliance_scorecard' => $this->canSee($permissions, $isMaster, 'data_dashboard_compliance_scorecard'),
        ];

        return $sections;
    }

    private function getGreeting(): string
    {
        $hour = (int) now()->format('H');
        if ($hour < 12) return 'Good morning';
        if ($hour < 17) return 'Good afternoon';
        return 'Good evening';
    }

    private function getStats(string $start, string $end, array $permissions, bool $isMaster): array
    {
        $stats = [];

        // Incident-free days — gated by data_dashboard_incident_free_days
        if ($this->canSee($permissions, $isMaster, 'data_dashboard_incident_free_days') && $this->tableExists('incidents')) {
            $lastIncident = DB::table('incidents')->whereNull('deleted_at')->max('incident_date');
            if ($lastIncident !== null) {
                $parsedLastIncident = rescue(fn () => Carbon::parse($lastIncident), null, false);
                $incidentFreeDays = $parsedLastIncident
                    ? (int) $parsedLastIncident->diffInDays(Carbon::today())
                    : 0;
            } else {
                $projectStart = DB::table('users')->min('created_at');
                if ($projectStart !== null) {
                    $parsedProjectStart = rescue(fn () => Carbon::parse($projectStart), null, false);
                    $incidentFreeDays = $parsedProjectStart
                        ? (int) $parsedProjectStart->diffInDays(Carbon::today())
                        : 0;
                } else {
                    $incidentFreeDays = 0;
                }
            }

            $lastMonthIncident = DB::table('incidents')
                ->whereNull('deleted_at')
                ->where('incident_date', '<', Carbon::today()->subMonth()->toDateString())
                ->max('incident_date');
            if ($lastMonthIncident !== null) {
                $parsedLastMonth = rescue(fn () => Carbon::parse($lastMonthIncident), null, false);
                $lastMonthStreak = $parsedLastMonth
                    ? (int) $parsedLastMonth->diffInDays(Carbon::today()->subMonth())
                    : 0;
            } else {
                $lastMonthStreak = 0;
            }
            $streakDiff = $lastMonthStreak > 0
                ? round((($incidentFreeDays - $lastMonthStreak) / max($lastMonthStreak, 1)) * 100)
                : 0;

            $stats[] = ['key' => 'incident_free_days', 'label' => 'Incident-Free Days', 'value' => $incidentFreeDays, 'trend' => ['value' => abs($streakDiff) . '%', 'up' => $streakDiff >= 0], 'color' => 'success'];
        }

        // Man-hours MTD — source of truth: workers table + worker_daily_hours
        if ($this->canSee($permissions, $isMaster, 'data_dashboard_man_hours', 'can_access_manpower') && $this->tableExists('workers')) {
            $totalHours = 0;
            if ($this->tableExists('worker_daily_hours')) {
                $hoursAgg = DB::table('worker_daily_hours')
                    ->join('workers', 'worker_daily_hours.worker_id', '=', 'workers.id')
                    ->whereNull('workers.deleted_at')
                    ->whereBetween('worker_daily_hours.work_date', [$start, $end])
                    ->select(DB::raw('COALESCE(SUM(worker_daily_hours.hours_worked + worker_daily_hours.overtime_hours), 0) as total_hours'))
                    ->first();
                $totalHours = (float) ($hoursAgg->total_hours ?? 0);
            }
            $activeWorkers = (int) DB::table('workers')
                ->whereNull('deleted_at')
                ->where('status', 'Active')
                ->count();
            $stats[] = ['key' => 'man_hours', 'label' => 'Man-Hours MTD', 'value' => number_format($totalHours), 'sub' => number_format($activeWorkers) . ' workers active', 'color' => 'primary'];
        }

        // Active permits
        if ($this->canSee($permissions, $isMaster, 'data_dashboard_active_permits', 'can_access_permits')) {
            $activePermits = DB::table('permits')
                ->where('status', 'Active')
                ->whereNull('deleted_at')
                ->count();
            $lastMonthActive = DB::table('permits')
                ->where('status', 'Active')
                ->whereNull('deleted_at')
                ->where('created_at', '<', Carbon::today()->subMonth()->toDateString())
                ->count();
            $permitDiff = $activePermits - $lastMonthActive;
            $stats[] = ['key' => 'active_permits', 'label' => 'Active Permits', 'value' => $activePermits, 'trend' => ['value' => (string) abs($permitDiff), 'up' => $permitDiff >= 0], 'color' => 'info'];
        }

        // Open observations
        if ($this->canSee($permissions, $isMaster, 'data_dashboard_open_observations', 'can_access_observations')) {
            $openObs = DB::table('observations')
                ->whereNull('deleted_at')
                ->where('status', 'Open')
                ->count();
            $overdueObs = DB::table('observations')
                ->whereNull('deleted_at')
                ->where('status', 'Open')
                ->where('observation_date', '<', Carbon::today()->subDays(7)->toDateString())
                ->count();
            $stats[] = ['key' => 'open_observations', 'label' => 'Open Observations', 'value' => $openObs, 'sub' => $overdueObs . ' overdue', 'color' => 'warning'];
        }

        // Pending amendments
        if ($this->canSee($permissions, $isMaster, 'data_dashboard_pending_amendments', 'can_access_permit_amendments')) {
            $pendingAmendments = DB::table('permit_amendments')
                ->whereNull('deleted_at')
                ->where('status', 'Pending')
                ->count();
            $stats[] = ['key' => 'pending_amendments', 'label' => 'Pending Amendments', 'value' => $pendingAmendments, 'color' => 'warning'];
        }

        // Open MOM actions
        if ($this->canSee($permissions, $isMaster, 'data_dashboard_mom_open_actions', 'can_access_weekly_mom')) {
            $openMomActions = 0;
            if ($this->tableExists('mom_points')) {
                $openMomActions = DB::table('mom_points')
                    ->join('moms', 'mom_points.mom_id', '=', 'moms.id')
                    ->whereNull('moms.deleted_at')
                    ->whereIn('mom_points.status', ['Open', 'In Progress', 'Pending', 'Blocked'])
                    ->count();
            }
            $stats[] = ['key' => 'open_mom_actions', 'label' => 'MOM Open Actions', 'value' => $openMomActions, 'color' => 'danger'];
        }

        // Mock-ups pending review
        if ($this->canSee($permissions, $isMaster, 'data_dashboard_mockup_pending', 'can_access_mockup_register')) {
            $pendingMockups = DB::table('mockups')
                ->where('approval_status', 'Submitted for Review')
                ->whereNull('deleted_at')
                ->count();
            $stats[] = ['key' => 'pending_mockups', 'label' => 'Mock-Up Pending', 'value' => $pendingMockups, 'color' => 'info'];
        }

        // Open violations
        if ($this->canSee($permissions, $isMaster, 'data_dashboard_open_violations', 'can_access_violations')) {
            $openViolations = 0;
            $criticalViolations = 0;
            if ($this->tableExists('violations')) {
                $openViolations = DB::table('violations')
                    ->whereNull('deleted_at')
                    ->whereNotIn('status', ['Closed'])
                    ->count();
                $criticalViolations = DB::table('violations')
                    ->whereNull('deleted_at')
                    ->whereNotIn('status', ['Closed'])
                    ->where('severity', 'Critical')
                    ->count();
            }
            $stats[] = ['key' => 'open_violations', 'label' => 'Open Violations', 'value' => $openViolations, 'sub' => $criticalViolations . ' critical', 'color' => 'danger'];
        }

        // Environmental manifests this month
        if ($this->canSee($permissions, $isMaster, 'data_dashboard_env_manifests', 'can_access_environmental')) {
            $envManifests = DB::table('waste_manifests')
                ->whereNull('deleted_at')
                ->whereBetween('manifest_date', [$start, $end])
                ->count();
            $stats[] = ['key' => 'env_manifests', 'label' => 'Env. Manifests', 'value' => $envManifests, 'color' => 'success'];
        }

        return $stats;
    }

    private function getMonthlyTrend(array $permissions, bool $isMaster): array
    {
        $canSeeObs = $this->hasPerm($permissions, $isMaster, 'can_access_observations');
        $canSeePermits = $this->hasPerm($permissions, $isMaster, 'can_access_permits');

        if (!$canSeeObs && !$canSeePermits) {
            return [];
        }

        $rangeStart = Carbon::today()->subMonths(6)->startOfMonth()->toDateString();
        $rangeEnd = Carbon::today()->endOfMonth()->toDateString();

        $obsByMonth = [];
        if ($canSeeObs) {
            $obsByMonth = DB::table('observations')
                ->whereBetween('observation_date', [$rangeStart, $rangeEnd])
                ->whereNull('deleted_at')
                ->selectRaw("DATE_FORMAT(observation_date, '%Y-%m') as ym, COUNT(*) as cnt")
                ->groupBy('ym')
                ->pluck('cnt', 'ym')
                ->toArray();
        }

        $permitsByMonth = [];
        if ($canSeePermits) {
            $permitsByMonth = DB::table('permits')
                ->whereNull('deleted_at')
                ->whereBetween('valid_from', [$rangeStart, $rangeEnd . ' 23:59:59'])
                ->selectRaw("DATE_FORMAT(valid_from, '%Y-%m') as ym, COUNT(*) as cnt")
                ->groupBy('ym')
                ->pluck('cnt', 'ym')
                ->toArray();
        }

        $months = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subMonths($i);
            $ym = $date->format('Y-m');
            $months[] = [
                'month' => $date->format('M'),
                'observations' => $obsByMonth[$ym] ?? 0,
                'permits' => $permitsByMonth[$ym] ?? 0,
            ];
        }

        return $months;
    }

    private function getRecentActivity(array $permissions, bool $isMaster): array
    {
        $activities = collect();

        if ($this->hasPerm($permissions, $isMaster, 'can_access_observations')) {
            $obs = DB::table('observations')
                ->whereNull('deleted_at')
                ->orderByDesc('created_at')
                ->limit(3)
                ->select('ref_number', 'status', 'category', 'created_at')
                ->get()
                ->map(fn ($r) => [
                    'type' => 'observation',
                    'text' => 'Observation ' . ($r->ref_number ?? 'N/A') . ' — ' . ($r->category ?? 'N/A'),
                    'status' => $r->status ?? 'Unknown',
                    'time' => $r->created_at ? Carbon::parse($r->created_at)->diffForHumans() : 'Unknown',
                    'timestamp' => $r->created_at,
                ]);
            $activities = $activities->merge($obs);
        }

        if ($this->hasPerm($permissions, $isMaster, 'can_access_permits')) {
            $permits = DB::table('permits')
                ->whereNull('deleted_at')
                ->orderByDesc('created_at')
                ->limit(3)
                ->select('ref_number', 'status', 'permit_type', 'created_at')
                ->get()
                ->map(fn ($r) => [
                    'type' => 'permit',
                    'text' => 'Permit ' . ($r->ref_number ?? 'N/A') . ' (' . ($r->permit_type ?? 'N/A') . ') ' . ($r->status ?? ''),
                    'status' => $r->status ?? 'Unknown',
                    'time' => $r->created_at ? Carbon::parse($r->created_at)->diffForHumans() : 'Unknown',
                    'timestamp' => $r->created_at,
                ]);
            $activities = $activities->merge($permits);
        }

        if ($this->hasPerm($permissions, $isMaster, 'can_access_violations') && $this->tableExists('violations')) {
            $violations = DB::table('violations')
                ->whereNull('deleted_at')
                ->orderByDesc('created_at')
                ->limit(3)
                ->select('violation_code', 'status', 'violation_category', 'severity', 'created_at')
                ->get()
                ->map(fn ($r) => [
                    'type' => 'violation',
                    'text' => 'Violation ' . ($r->violation_code ?? 'N/A') . ' — ' . ($r->violation_category ?? 'N/A') . ' (' . ($r->severity ?? 'N/A') . ')',
                    'status' => $r->status ?? 'Unknown',
                    'time' => $r->created_at ? Carbon::parse($r->created_at)->diffForHumans() : 'Unknown',
                    'timestamp' => $r->created_at,
                ]);
            $activities = $activities->merge($violations);
        }

        if ($this->hasPerm($permissions, $isMaster, 'can_access_incidents') && $this->tableExists('incidents')) {
            $incidents = DB::table('incidents')
                ->whereNull('deleted_at')
                ->orderByDesc('created_at')
                ->limit(2)
                ->select('incident_code', 'status', 'incident_type', 'created_at')
                ->get()
                ->map(fn ($r) => [
                    'type' => 'incident',
                    'text' => 'Incident ' . ($r->incident_code ?? 'N/A') . ' — ' . ($r->incident_type ?? 'N/A'),
                    'status' => $r->status ?? 'Unknown',
                    'time' => $r->created_at ? Carbon::parse($r->created_at)->diffForHumans() : 'Unknown',
                    'timestamp' => $r->created_at,
                ]);
            $activities = $activities->merge($incidents);
        }

        return $activities
            ->sortByDesc('timestamp')
            ->take(5)
            ->values()
            ->map(function ($a) {
                unset($a['timestamp']);
                return $a;
            })
            ->toArray();
    }

    private function getComplianceScores(string $start, string $end, array $permissions, bool $isMaster): array
    {
        $scores = [];

        if ($this->hasPerm($permissions, $isMaster, 'can_access_observations')) {
            $totalObs = DB::table('observations')->whereNull('deleted_at')->whereBetween('observation_date', [$start, $end])->count();
            $closedObs = DB::table('observations')->whereNull('deleted_at')->whereBetween('observation_date', [$start, $end])->whereIn('status', ['Closed', 'Verified'])->count();
            $obsRate = $totalObs > 0 ? round(($closedObs / $totalObs) * 100) : 0;
            $scores[] = ['label' => 'Observation Close-out Rate', 'value' => $obsRate, 'target' => 90];
        }

        if ($this->hasPerm($permissions, $isMaster, 'can_access_permits')) {
            $totalPermits = DB::table('permits')->whereNull('deleted_at')->whereBetween('valid_from', [$start, $end . ' 23:59:59'])->count();
            $approvedPermits = DB::table('permits')->whereNull('deleted_at')->whereBetween('valid_from', [$start, $end . ' 23:59:59'])->whereIn('status', ['Active', 'Closed'])->count();
            $permitRate = $totalPermits > 0 ? round(($approvedPermits / $totalPermits) * 100) : 0;
            $scores[] = ['label' => 'Permit Compliance', 'value' => $permitRate, 'target' => 95];
        }

        if ($this->hasPerm($permissions, $isMaster, 'can_access_training')) {
            $totalTraining = DB::table('training_records')->whereNull('deleted_at')->whereBetween('training_date', [$start, $end])->count();
            $validTraining = DB::table('training_records')->whereNull('deleted_at')->whereBetween('training_date', [$start, $end])->where('status', 'Valid')->count();
            $trainingRate = $totalTraining > 0 ? round(($validTraining / $totalTraining) * 100) : 0;
            $scores[] = ['label' => 'Training Coverage', 'value' => $trainingRate, 'target' => 85];
        }

        if ($this->hasPerm($permissions, $isMaster, 'can_access_environmental')) {
            $totalWaste = DB::table('waste_manifests')->whereNull('deleted_at')->whereBetween('manifest_date', [$start, $end])->count();
            $compliantWaste = DB::table('waste_manifests')->whereNull('deleted_at')->whereBetween('manifest_date', [$start, $end])->where('status', 'Completed')->count();
            $envRate = $totalWaste > 0 ? round(($compliantWaste / $totalWaste) * 100) : 0;
            $scores[] = ['label' => 'Environmental Compliance', 'value' => $envRate, 'target' => 85];
        }

        return $scores;
    }

    private function getAiInsights(string $start, string $end, array $permissions, bool $isMaster): array
    {
        $insights = [];

        if ($this->hasPerm($permissions, $isMaster, 'can_access_observations')) {
            $overdueObs = DB::table('observations')
                ->whereNull('deleted_at')
                ->where('status', 'Open')
                ->where('observation_date', '<', Carbon::today()->subDays(7)->toDateString())
                ->count();
            if ($overdueObs > 0) {
                $insights[] = [
                    'text' => "{$overdueObs} observation(s) overdue beyond 7 days — escalation recommended",
                    'severity' => $overdueObs >= 5 ? 'danger' : 'warning',
                ];
            }

            $topZone = DB::table('observations')
                ->whereNull('deleted_at')
                ->whereBetween('observation_date', [$start, $end])
                ->whereNotNull('zone')
                ->where('zone', '!=', '')
                ->select('zone', DB::raw('COUNT(*) as cnt'))
                ->groupBy('zone')
                ->orderByDesc('cnt')
                ->first();
            if ($topZone !== null && ($topZone->cnt ?? 0) >= 5) {
                $insights[] = [
                    'text' => 'Zone ' . ($topZone->zone ?? 'Unknown') . ' has the highest observation count this month (' . ($topZone->cnt ?? 0) . ' observations)',
                    'severity' => 'warning',
                ];
            }
        }

        if ($this->hasPerm($permissions, $isMaster, 'can_access_permits')) {
            $totalPermits = DB::table('permits')->whereNull('deleted_at')->whereBetween('valid_from', [$start, $end . ' 23:59:59'])->count();
            $approvedPermits = DB::table('permits')->whereNull('deleted_at')->whereBetween('valid_from', [$start, $end . ' 23:59:59'])->whereIn('status', ['Active', 'Closed'])->count();
            $permitRate = $totalPermits > 0 ? round(($approvedPermits / $totalPermits) * 100) : 0;
            if ($permitRate >= 90) {
                $insights[] = ['text' => "Permit compliance is at {$permitRate}% this month", 'severity' => 'success'];
            } elseif ($totalPermits > 0 && $permitRate < 80) {
                $insights[] = ['text' => "Permit compliance at {$permitRate}% — below target, review pending permits", 'severity' => 'danger'];
            }
        }

        if ($this->hasPerm($permissions, $isMaster, 'can_access_training')) {
            $expiringSoon = DB::table('training_records')
                ->whereNull('deleted_at')
                ->where('status', 'Expiring Soon')
                ->count();
            if ($expiringSoon > 0) {
                $insights[] = ['text' => "{$expiringSoon} training certification(s) expiring soon — schedule renewals", 'severity' => $expiringSoon >= 10 ? 'danger' : 'warning'];
            }
        }

        if ($this->hasPerm($permissions, $isMaster, 'can_access_equipment') && $this->tableExists('tracker_records')) {
            $overdueEquip = DB::table('tracker_records')
                ->whereNull('deleted_at')
                ->where('is_overdue', true)
                ->count();
            if ($overdueEquip > 0) {
                $insights[] = ['text' => "{$overdueEquip} equipment item(s) overdue for inspection", 'severity' => $overdueEquip >= 5 ? 'danger' : 'warning'];
            }
        }

        if ($this->hasPerm($permissions, $isMaster, 'can_access_weekly_mom') && $this->tableExists('mom_points')) {
            $staleActions = DB::table('mom_points')
                ->join('moms', 'mom_points.mom_id', '=', 'moms.id')
                ->whereNull('moms.deleted_at')
                ->whereIn('mom_points.status', ['Open', 'In Progress'])
                ->where('mom_points.due_date', '<', Carbon::today()->toDateString())
                ->count();
            if ($staleActions > 0) {
                $insights[] = ['text' => "{$staleActions} MOM action(s) are past their due date", 'severity' => $staleActions >= 5 ? 'danger' : 'warning'];
            }
        }

        if (empty($insights)) {
            $insights[] = ['text' => 'All systems are running within normal parameters', 'severity' => 'success'];
        }

        return array_slice($insights, 0, 4);
    }

    private function getSparkTrends(array $permissions, bool $isMaster): array
    {
        $trends = [];

        $rangeStart = Carbon::today()->subWeeks(6)->startOfWeek()->toDateString();
        $rangeEnd = Carbon::today()->endOfWeek()->toDateString();

        $weekIndex = [];
        for ($i = 6; $i >= 0; $i--) {
            $ws = Carbon::today()->subWeeks($i)->startOfWeek();
            $weekIndex[$ws->format('Y-W')] = 6 - $i;
        }

        if ($this->hasPerm($permissions, $isMaster, 'can_access_observations')) {
            $data = array_fill(0, 7, 0);
            $rows = DB::table('observations')
                ->whereNull('deleted_at')
                ->whereBetween('observation_date', [$rangeStart, $rangeEnd])
                ->selectRaw("CONCAT(YEAR(observation_date), '-', LPAD(WEEK(observation_date, 1), 2, '0')) as yw, COUNT(*) as cnt")
                ->groupBy('yw')
                ->pluck('cnt', 'yw');
            foreach ($rows as $yw => $cnt) {
                if (isset($weekIndex[$yw])) $data[$weekIndex[$yw]] = $cnt;
            }
            $trends['open_observations'] = $this->normalizeSparkData($data);
        }

        if ($this->hasPerm($permissions, $isMaster, 'can_access_permits')) {
            $data = array_fill(0, 7, 0);
            $rows = DB::table('permits')
                ->whereNull('deleted_at')
                ->whereBetween('valid_from', [$rangeStart, $rangeEnd . ' 23:59:59'])
                ->selectRaw("CONCAT(YEAR(valid_from), '-', LPAD(WEEK(valid_from, 1), 2, '0')) as yw, COUNT(*) as cnt")
                ->groupBy('yw')
                ->pluck('cnt', 'yw');
            foreach ($rows as $yw => $cnt) {
                if (isset($weekIndex[$yw])) $data[$weekIndex[$yw]] = $cnt;
            }
            $trends['active_permits'] = $this->normalizeSparkData($data);
        }

        if ($this->hasPerm($permissions, $isMaster, 'can_access_weekly_mom') && $this->tableExists('mom_points')) {
            $data = [];
            for ($i = 6; $i >= 0; $i--) {
                $weekEnd = Carbon::today()->subWeeks($i)->endOfWeek()->toDateString();
                $data[] = DB::table('mom_points')
                    ->join('moms', 'mom_points.mom_id', '=', 'moms.id')
                    ->whereNull('moms.deleted_at')
                    ->whereIn('mom_points.status', ['Open', 'In Progress', 'Pending', 'Blocked'])
                    ->where('mom_points.created_at', '<=', $weekEnd)
                    ->count();
            }
            $trends['open_mom_actions'] = $this->normalizeSparkData($data);
        }

        if ($this->hasPerm($permissions, $isMaster, 'can_access_mockup_register')) {
            $data = [];
            for ($i = 6; $i >= 0; $i--) {
                $weekEnd = Carbon::today()->subWeeks($i)->endOfWeek()->toDateString();
                $data[] = DB::table('mockups')
                    ->whereNull('deleted_at')
                    ->where('approval_status', 'Submitted for Review')
                    ->where('created_at', '<=', $weekEnd)
                    ->count();
            }
            $trends['pending_mockups'] = $this->normalizeSparkData($data);
        }

        return $trends;
    }

    private function normalizeSparkData(array $data): array
    {
        if (empty($data)) {
            return [];
        }
        $maxVal = max(1, max($data));
        return array_map(fn($v) => (int) round(($v / $maxVal) * 100), $data);
    }
}
