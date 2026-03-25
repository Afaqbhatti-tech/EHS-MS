<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DashboardController extends Controller
{
    /**
     * GET /api/dashboard
     * Returns aggregated dashboard data for the overview page.
     */
    public function index(): JsonResponse
    {
        $today = Carbon::today();
        $monthStart = $today->copy()->startOfMonth()->toDateString();
        $monthEnd = $today->copy()->endOfMonth()->toDateString();
        $todayStr = $today->toDateString();

        return response()->json([
            'greeting' => $this->getGreeting(),
            'stats' => $this->getStats($monthStart, $monthEnd),
            'monthlyTrend' => $this->getMonthlyTrend(),
            'recentActivity' => $this->getRecentActivity(),
            'complianceScores' => $this->getComplianceScores($monthStart, $monthEnd),
        ]);
    }

    private function getGreeting(): string
    {
        $hour = (int) now()->format('H');
        if ($hour < 12) return 'Good morning';
        if ($hour < 17) return 'Good afternoon';
        return 'Good evening';
    }

    private function getStats(string $start, string $end): array
    {
        // Incident-free days
        $lastIncident = DB::table('incidents')->max('incident_date');
        $incidentFreeDays = $lastIncident
            ? Carbon::parse($lastIncident)->diffInDays(Carbon::today())
            : 0;

        // Man-hours MTD
        $manpower = DB::table('manpower_records')
            ->whereBetween('record_date', [$start, $end])
            ->select(
                DB::raw('COALESCE(SUM(man_hours), 0) as total_hours'),
                DB::raw('COALESCE(SUM(headcount), 0) as total_workers')
            )->first();

        // Active permits
        $activePermits = DB::table('permits')
            ->where('status', 'active')
            ->count();

        // Open observations
        $openObs = DB::table('observations')
            ->where('status', 'open')
            ->count();
        $overdueObs = DB::table('observations')
            ->where('status', 'open')
            ->where('observation_date', '<', Carbon::today()->subDays(7)->toDateString())
            ->count();

        // Pending amendments
        $pendingAmendments = DB::table('permit_amendments')
            ->where('status', 'pending')
            ->count();

        // Open MOM actions
        $openMomActions = 0;
        if (Schema::hasTable('moms')) {
            $openMomActions = DB::table('moms')
                ->where('status', '!=', 'closed')
                ->count();
        }

        // Mock-ups pending
        $pendingMockups = DB::table('mockups')
            ->where('status', 'pending')
            ->count();

        // Environmental manifests this month
        $envManifests = DB::table('waste_manifests')
            ->whereBetween('manifest_date', [$start, $end])
            ->count();

        return [
            ['key' => 'incident_free_days', 'label' => 'Incident-Free Days', 'value' => $incidentFreeDays, 'trend' => ['value' => '12%', 'up' => true], 'color' => 'success'],
            ['key' => 'man_hours', 'label' => 'Man-Hours MTD', 'value' => number_format((float) ($manpower->total_hours ?? 0)), 'sub' => number_format((int) ($manpower->total_workers ?? 0)) . ' workers active', 'color' => 'primary'],
            ['key' => 'active_permits', 'label' => 'Active Permits', 'value' => $activePermits, 'trend' => ['value' => '3', 'up' => true], 'color' => 'info'],
            ['key' => 'open_observations', 'label' => 'Open Observations', 'value' => $openObs, 'sub' => $overdueObs . ' overdue', 'color' => 'warning'],
            ['key' => 'pending_amendments', 'label' => 'Pending Amendments', 'value' => $pendingAmendments, 'color' => 'warning'],
            ['key' => 'open_mom_actions', 'label' => 'MOM Open Actions', 'value' => $openMomActions, 'color' => 'danger'],
            ['key' => 'pending_mockups', 'label' => 'Mock-Up Pending', 'value' => $pendingMockups, 'color' => 'info'],
            ['key' => 'env_manifests', 'label' => 'Env. Manifests', 'value' => $envManifests, 'color' => 'success'],
        ];
    }

    private function getMonthlyTrend(): array
    {
        $months = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subMonths($i);
            $start = $date->copy()->startOfMonth()->toDateString();
            $end = $date->copy()->endOfMonth()->toDateString();

            $observations = DB::table('observations')
                ->whereBetween('observation_date', [$start, $end])
                ->count();

            $permits = DB::table('permits')
                ->whereBetween('valid_from', [$start, $end . ' 23:59:59'])
                ->count();

            $months[] = [
                'month' => $date->format('M'),
                'observations' => $observations,
                'permits' => $permits,
            ];
        }

        return $months;
    }

    private function getRecentActivity(): array
    {
        $activities = collect();

        // Recent observations
        $obs = DB::table('observations')
            ->orderByDesc('created_at')
            ->limit(3)
            ->select('ref_number', 'status', 'category', 'created_at')
            ->get()
            ->map(fn ($r) => [
                'type' => 'observation',
                'text' => "Observation {$r->ref_number} — {$r->category}",
                'status' => $r->status,
                'time' => Carbon::parse($r->created_at)->diffForHumans(),
                'timestamp' => $r->created_at,
            ]);
        $activities = $activities->merge($obs);

        // Recent permits
        $permits = DB::table('permits')
            ->orderByDesc('created_at')
            ->limit(3)
            ->select('ref_number', 'status', 'permit_type', 'created_at')
            ->get()
            ->map(fn ($r) => [
                'type' => 'permit',
                'text' => "Permit {$r->ref_number} ({$r->permit_type}) {$r->status}",
                'status' => $r->status,
                'time' => Carbon::parse($r->created_at)->diffForHumans(),
                'timestamp' => $r->created_at,
            ]);
        $activities = $activities->merge($permits);

        // Recent incidents
        $incidents = DB::table('incidents')
            ->orderByDesc('created_at')
            ->limit(2)
            ->select('ref_number', 'status', 'classification', 'created_at')
            ->get()
            ->map(fn ($r) => [
                'type' => 'incident',
                'text' => "Incident {$r->ref_number} — {$r->classification}",
                'status' => $r->status,
                'time' => Carbon::parse($r->created_at)->diffForHumans(),
                'timestamp' => $r->created_at,
            ]);
        $activities = $activities->merge($incidents);

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

    private function getComplianceScores(string $start, string $end): array
    {
        // Observation close-out rate
        $totalObs = DB::table('observations')->whereBetween('observation_date', [$start, $end])->count();
        $closedObs = DB::table('observations')->whereBetween('observation_date', [$start, $end])->where('status', 'closed')->count();
        $obsRate = $totalObs > 0 ? round(($closedObs / $totalObs) * 100) : 0;

        // Permit compliance
        $totalPermits = DB::table('permits')->whereBetween('valid_from', [$start, $end . ' 23:59:59'])->count();
        $approvedPermits = DB::table('permits')->whereBetween('valid_from', [$start, $end . ' 23:59:59'])->whereIn('status', ['active', 'approved', 'closed'])->count();
        $permitRate = $totalPermits > 0 ? round(($approvedPermits / $totalPermits) * 100) : 0;

        // Training coverage
        $totalTraining = DB::table('training_records')->whereBetween('training_date', [$start, $end])->count();
        $passedTraining = DB::table('training_records')->whereBetween('training_date', [$start, $end])->where('result', 'pass')->count();
        $trainingRate = $totalTraining > 0 ? round(($passedTraining / $totalTraining) * 100) : 0;

        // Environmental compliance
        $totalWaste = DB::table('waste_manifests')->whereBetween('manifest_date', [$start, $end])->count();
        $compliantWaste = DB::table('waste_manifests')->whereBetween('manifest_date', [$start, $end])->where('status', 'completed')->count();
        $envRate = $totalWaste > 0 ? round(($compliantWaste / $totalWaste) * 100) : 0;

        return [
            ['label' => 'Observation Close-out Rate', 'value' => $obsRate, 'target' => 90],
            ['label' => 'Permit Compliance', 'value' => $permitRate, 'target' => 95],
            ['label' => 'Training Coverage', 'value' => $trainingRate, 'target' => 85],
            ['label' => 'Environmental Compliance', 'value' => $envRate, 'target' => 85],
        ];
    }
}
