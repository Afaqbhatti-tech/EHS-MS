<?php

namespace App\Http\Controllers;

use App\Models\Worker;
use App\Models\WorkerDailyHours;
use App\Models\Profession;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Http\Controllers\RecycleBinController;
use App\Http\Traits\ExportsData;

class WorkerController extends Controller
{
    use ExportsData;
    public function index(Request $request): JsonResponse
    {
        $query = Worker::query();

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('worker_id', 'like', "%{$search}%")
                  ->orWhere('employee_number', 'like', "%{$search}%")
                  ->orWhere('profession', 'like', "%{$search}%")
                  ->orWhere('company', 'like', "%{$search}%")
                  ->orWhere('department', 'like', "%{$search}%")
                  ->orWhere('iqama_number', 'like', "%{$search}%")
                  ->orWhere('id_number', 'like', "%{$search}%");
            });
        }

        if ($v = $request->get('profession')) $query->where('profession', $v);
        if ($v = $request->get('induction_status')) $query->where('induction_status', $v);
        if ($v = $request->get('status')) $query->where('status', $v);
        if ($v = $request->get('company')) $query->where('company', 'like', "%{$v}%");
        if ($v = $request->get('department')) $query->where('department', $v);
        if ($from = $request->get('joined_from')) $query->whereDate('joining_date', '>=', $from);
        if ($to = $request->get('joined_to')) $query->whereDate('joining_date', '<=', $to);

        if ($period = $request->get('period')) {
            match ($period) {
                'today' => $query->whereDate('joining_date', today()),
                'week' => $query->whereBetween('joining_date', [now()->startOfWeek(), now()->endOfWeek()]),
                'month' => $query->whereMonth('joining_date', now()->month)->whereYear('joining_date', now()->year),
                'year' => $query->whereYear('joining_date', now()->year),
                default => null,
            };
        }

        // Legacy ID review filter: workers with id_number populated, iqama_number empty
        if ($request->get('legacy_review') === '1') {
            $query->whereNotNull('id_number')
                  ->where('id_number', '!=', '')
                  ->where(function ($q) {
                      $q->whereNull('iqama_number')->orWhere('iqama_number', '');
                  });
        }

        $sortBy = $request->get('sort_by', 'created_at');
        $sortDir = strtolower($request->get('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';
        $allowed = ['name', 'joining_date', 'profession', 'induction_status', 'status', 'created_at', 'company'];
        if (in_array($sortBy, $allowed)) {
            $query->orderBy($sortBy, $sortDir);
        }

        $perPage = min(500, max(1, (int) $request->get('per_page', 25)));
        $paginated = $query->paginate($perPage);

        $data = collect($paginated->items())->map(fn ($w) => $this->mapToFrontend($w));

        return response()->json([
            'data' => $data,
            'total' => $paginated->total(),
            'page' => $paginated->currentPage(),
            'per_page' => $paginated->perPage(),
            'last_page' => $paginated->lastPage(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'employee_number' => 'nullable|string|max:100|unique:workers,employee_number',
            'profession' => 'nullable|string|max:150',
            'department' => 'nullable|string|max:150',
            'company' => 'nullable|string|max:200',
            'nationality' => 'nullable|string|max:100',
            'joining_date' => 'nullable|date',
            'demobilization_date' => 'nullable|date',
            'induction_status' => 'nullable|in:Done,Not Done,Pending',
            'induction_date' => 'nullable|date',
            'induction_by' => 'nullable|string|max:255',
            'status' => 'nullable|in:Active,Inactive,Demobilised,Suspended',
            'id_number' => 'nullable|string|max:100',
            'iqama_number' => 'nullable|string|max:20',
            'contact_number' => 'nullable|string|max:50',
            'emergency_contact' => 'nullable|string|max:255',
            'remarks' => 'nullable|string',
        ]);

        $year = now()->year;
        $count = Worker::withTrashed()->whereYear('created_at', $year)->count() + 1;
        $refNumber = 'WRK-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

        $worker = Worker::create(array_merge($validated, [
            'id' => Str::uuid()->toString(),
            'worker_id' => $refNumber,
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
        ]));

        return response()->json([
            'message' => 'Worker added successfully',
            'worker' => $this->mapToFrontend($worker),
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $worker = Worker::findOrFail($id);

        $hoursStats = DB::selectOne("
            SELECT
                COUNT(*) as total_days_recorded,
                COALESCE(SUM(hours_worked), 0) as total_hours,
                COALESCE(SUM(overtime_hours), 0) as total_overtime,
                SUM(attendance_status = 'Present') as days_present,
                SUM(attendance_status = 'Absent') as days_absent
            FROM worker_daily_hours
            WHERE worker_id = ?
        ", [$worker->id]);

        $mapped = $this->mapToFrontend($worker);
        $mapped['hours_stats'] = [
            'total_days_recorded' => (int) ($hoursStats->total_days_recorded ?? 0),
            'total_hours' => round((float) ($hoursStats->total_hours ?? 0), 2),
            'total_overtime' => round((float) ($hoursStats->total_overtime ?? 0), 2),
            'days_present' => (int) ($hoursStats->days_present ?? 0),
            'days_absent' => (int) ($hoursStats->days_absent ?? 0),
        ];

        return response()->json($mapped);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $worker = Worker::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'employee_number' => 'nullable|string|max:100|unique:workers,employee_number,' . $worker->id,
            'profession' => 'nullable|string|max:150',
            'department' => 'nullable|string|max:150',
            'company' => 'nullable|string|max:200',
            'nationality' => 'nullable|string|max:100',
            'joining_date' => 'nullable|date',
            'demobilization_date' => 'nullable|date',
            'induction_status' => 'nullable|in:Done,Not Done,Pending',
            'induction_date' => 'nullable|date',
            'induction_by' => 'nullable|string|max:255',
            'status' => 'nullable|in:Active,Inactive,Demobilised,Suspended',
            'id_number' => 'nullable|string|max:100',
            'iqama_number' => 'nullable|string|max:20',
            'contact_number' => 'nullable|string|max:50',
            'emergency_contact' => 'nullable|string|max:255',
            'remarks' => 'nullable|string',
        ]);

        $validated['updated_by'] = $request->user()?->id;
        $worker->update($validated);

        return response()->json([
            'message' => 'Worker updated successfully',
            'worker' => $this->mapToFrontend($worker->fresh()),
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $worker = Worker::findOrFail($id);
        $worker->deleted_by = Auth::user()?->full_name ?? Auth::user()?->email ?? 'System';
        $worker->save();
        $worker->delete();

        // Cascade soft-delete training records
        $cascaded = RecycleBinController::cascadeSoftDelete('worker', $worker);
        RecycleBinController::logDeleteAction('worker', $worker, null, $cascaded);

        $childCount = count($cascaded);
        $message = 'Worker removed successfully';
        if ($childCount > 0) {
            $message .= " (including {$childCount} training " . ($childCount === 1 ? 'record' : 'records') . ')';
        }
        return response()->json(['message' => $message]);
    }

    public function stats(Request $request): JsonResponse
    {
        $year = (int) $request->get('year', now()->year);

        $kpis = DB::selectOne("
            SELECT
                COUNT(*) as total,
                SUM(status = 'Active') as active,
                SUM(status = 'Inactive') as inactive,
                SUM(status = 'Demobilised') as demobilised,
                SUM(status = 'Suspended') as suspended,
                SUM(induction_status = 'Done') as inducted,
                SUM(induction_status = 'Not Done') as not_inducted,
                SUM(induction_status = 'Pending') as pending_induction
            FROM workers WHERE deleted_at IS NULL
        ");

        $total = (int) ($kpis->total ?? 0);
        $inducted = (int) ($kpis->inducted ?? 0);
        $inductionRate = $total > 0 ? round(($inducted / $total) * 100, 1) : 0;

        $legacyReviewCount = (int) Worker::whereNotNull('id_number')
            ->where('id_number', '!=', '')
            ->where(function ($q) {
                $q->whereNull('iqama_number')->orWhere('iqama_number', '');
            })
            ->count();

        $byProfession = DB::select("
            SELECT profession, COUNT(*) as total,
                   SUM(induction_status = 'Done') as inducted
            FROM workers
            WHERE deleted_at IS NULL AND profession IS NOT NULL AND profession != ''
            GROUP BY profession ORDER BY total DESC
        ");

        $byCompany = DB::select("
            SELECT company, COUNT(*) as total
            FROM workers
            WHERE deleted_at IS NULL AND company IS NOT NULL AND company != ''
            GROUP BY company ORDER BY total DESC
        ");

        $monthlyJoinings = DB::select("
            SELECT MONTH(joining_date) as month, COUNT(*) as total
            FROM workers
            WHERE deleted_at IS NULL AND YEAR(joining_date) = ? AND joining_date IS NOT NULL
            GROUP BY MONTH(joining_date) ORDER BY month
        ", [$year]);

        $inductionBreakdown = DB::select("
            SELECT induction_status, COUNT(*) as total
            FROM workers WHERE deleted_at IS NULL
            GROUP BY induction_status
        ");

        $monthStart = now()->startOfMonth()->toDateString();
        $monthEnd = now()->endOfMonth()->toDateString();

        $hoursThisMonth = DB::selectOne("
            SELECT
                COALESCE(SUM(hours_worked), 0) as total_regular,
                COALESCE(SUM(overtime_hours), 0) as total_overtime,
                COUNT(DISTINCT worker_id) as workers_recorded
            FROM worker_daily_hours
            WHERE work_date BETWEEN ? AND ?
        ", [$monthStart, $monthEnd]);

        return response()->json([
            'kpis' => [
                'total' => $total,
                'active' => (int) ($kpis->active ?? 0),
                'inducted' => $inducted,
                'not_inducted' => (int) ($kpis->not_inducted ?? 0),
                'demobilised' => (int) ($kpis->demobilised ?? 0),
                'induction_rate' => $inductionRate,
                'legacy_review_count' => $legacyReviewCount,
            ],
            'byProfession' => array_map(fn ($r) => [
                'profession' => $r->profession,
                'total' => (int) $r->total,
                'inducted' => (int) ($r->inducted ?? 0),
            ], $byProfession),
            'byCompany' => array_map(fn ($r) => [
                'company' => $r->company,
                'total' => (int) $r->total,
            ], $byCompany),
            'monthlyJoinings' => array_map(fn ($r) => [
                'month' => (int) $r->month,
                'total' => (int) $r->total,
            ], $monthlyJoinings),
            'inductionBreakdown' => array_map(fn ($r) => [
                'induction_status' => $r->induction_status,
                'total' => (int) $r->total,
            ], $inductionBreakdown),
            'hoursThisMonth' => [
                'total_regular' => round((float) ($hoursThisMonth->total_regular ?? 0), 2),
                'total_overtime' => round((float) ($hoursThisMonth->total_overtime ?? 0), 2),
                'workers_recorded' => (int) ($hoursThisMonth->workers_recorded ?? 0),
            ],
        ]);
    }

    public function export(Request $request)
    {
        $query = Worker::query();

        if ($v = $request->get('profession')) $query->where('profession', $v);
        if ($v = $request->get('induction_status')) $query->where('induction_status', $v);
        if ($v = $request->get('status')) $query->where('status', $v);
        if ($from = $request->get('joined_from')) $query->whereDate('joining_date', '>=', $from);
        if ($to = $request->get('joined_to')) $query->whereDate('joining_date', '<=', $to);

        if ($request->get('legacy_review') === '1') {
            $query->whereNotNull('id_number')
                  ->where('id_number', '!=', '')
                  ->where(function ($q) {
                      $q->whereNull('iqama_number')->orWhere('iqama_number', '');
                  });
        }

        $workers = $query->orderBy('name')->get();

        $headers = [
            'Worker ID', 'Name', 'Employee No.', 'ID / Passport No.', 'Iqama Number', 'Profession',
            'Department', 'Company', 'Nationality',
            'Joining Date', 'Demob Date', 'Induction Status',
            'Induction Date', 'Inducted By', 'Status',
            'Contact', 'Remarks', 'Created',
        ];

        $rows = $workers->map(fn ($w) => [
            $w->worker_id, $w->name, $w->employee_number, $w->id_number, $w->iqama_number,
            $w->profession, $w->department, $w->company,
            $w->nationality,
            $w->joining_date?->format('Y-m-d'),
            $w->demobilization_date?->format('Y-m-d'),
            $w->induction_status,
            $w->induction_date?->format('Y-m-d'),
            $w->induction_by, $w->status,
            $w->contact_number, $w->remarks,
            $w->created_at?->format('Y-m-d H:i'),
        ])->toArray();

        return $this->exportAs($headers, $rows, 'Manpower', $request->get('format', 'csv'));
    }

    public function filterOptions(): JsonResponse
    {
        $seededProfessions = Profession::where('is_active', true)
            ->orderBy('sort_order')->orderBy('name')
            ->pluck('name');

        $inUseProfessions = Worker::whereNotNull('profession')
            ->where('profession', '!=', '')
            ->distinct()->pluck('profession');

        $professions = $seededProfessions->merge($inUseProfessions)->unique()->sort()->values();

        return response()->json([
            'professions' => $professions,
            'companies' => Worker::distinct()->whereNotNull('company')->where('company', '!=', '')->pluck('company'),
            'departments' => Worker::distinct()->whereNotNull('department')->where('department', '!=', '')->pluck('department'),
            'nationalities' => Worker::distinct()->whereNotNull('nationality')->where('nationality', '!=', '')->pluck('nationality'),
        ]);
    }

    /**
     * List legacy review candidates: workers with id_number populated but iqama_number empty.
     */
    public function legacyReviewCandidates(Request $request): JsonResponse
    {
        $query = Worker::query()
            ->whereNotNull('id_number')
            ->where('id_number', '!=', '')
            ->where(function ($q) {
                $q->whereNull('iqama_number')->orWhere('iqama_number', '');
            });

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('worker_id', 'like', "%{$search}%")
                  ->orWhere('employee_number', 'like', "%{$search}%")
                  ->orWhere('id_number', 'like', "%{$search}%")
                  ->orWhere('company', 'like', "%{$search}%");
            });
        }

        if ($v = $request->get('status')) $query->where('status', $v);
        if ($v = $request->get('company')) $query->where('company', 'like', "%{$v}%");

        $sortBy = $request->get('sort_by', 'created_at');
        $sortDir = strtolower($request->get('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';
        $allowed = ['name', 'created_at', 'company', 'id_number'];
        if (in_array($sortBy, $allowed)) {
            $query->orderBy($sortBy, $sortDir);
        }

        $perPage = min(500, max(1, (int) $request->get('per_page', 25)));
        $paginated = $query->paginate($perPage);

        $data = collect($paginated->items())->map(function ($w) {
            $mapped = $this->mapToFrontend($w);
            $mapped['id_number_pattern_hint'] = $this->getPatternHint($w->id_number);
            return $mapped;
        });

        return response()->json([
            'data' => $data,
            'total' => $paginated->total(),
            'page' => $paginated->currentPage(),
            'per_page' => $paginated->perPage(),
            'last_page' => $paginated->lastPage(),
        ]);
    }

    /**
     * Manually migrate id_number to iqama_number for a specific worker.
     * Safety: only allowed when iqama_number is currently empty.
     */
    public function migrateIqama(Request $request, string $id): JsonResponse
    {
        $worker = Worker::findOrFail($id);

        // Safety check: iqama_number must be empty
        if (!empty($worker->iqama_number)) {
            return response()->json([
                'message' => 'Cannot migrate: worker already has an Iqama number. Manual edit required if you need to change it.',
            ], 422);
        }

        // Safety check: id_number must have a value
        if (empty($worker->id_number)) {
            return response()->json([
                'message' => 'Cannot migrate: worker has no ID / Passport number to migrate.',
            ], 422);
        }

        $validated = $request->validate([
            'action' => 'required|in:copy_to_iqama,move_to_iqama',
        ]);

        $originalIdNumber = $worker->id_number;
        $worker->iqama_number = $originalIdNumber;

        if ($validated['action'] === 'move_to_iqama') {
            $worker->id_number = null;
        }

        $worker->updated_by = $request->user()?->id;
        $worker->save();

        $actionLabel = $validated['action'] === 'move_to_iqama' ? 'moved' : 'copied';

        return response()->json([
            'message' => "ID value successfully {$actionLabel} to Iqama Number for {$worker->name}.",
            'worker' => $this->mapToFrontend($worker->fresh()),
        ]);
    }

    /**
     * Provide a non-authoritative pattern hint for review aid.
     * This is informational only — never used for automatic decisions.
     */
    private function getPatternHint(?string $value): string
    {
        if (empty($value)) return 'empty';
        $digits = preg_replace('/\D/', '', $value);
        $len = strlen($digits);
        if ($len === 10 && in_array($digits[0], ['1', '2'])) {
            return 'Looks like Iqama format (10 digits, starts with 1 or 2)';
        }
        if ($len >= 6 && $len <= 9) {
            return 'Possible passport number (' . $len . ' digits)';
        }
        if ($len > 10) {
            return 'Long number (' . $len . ' digits)';
        }
        if ($len < 6 && $len > 0) {
            return 'Short number (' . $len . ' digits)';
        }
        if (preg_match('/[A-Za-z]/', $value)) {
            return 'Contains letters — likely passport or national ID';
        }
        return 'Unknown format';
    }

    private function mapToFrontend(Worker $w): array
    {
        $daysOnSite = 0;
        if ($w->joining_date) {
            $end = $w->demobilization_date ?? now();
            $daysOnSite = (int) $w->joining_date->diffInDays($end);
        }

        return [
            'id' => $w->id,
            'worker_id' => $w->worker_id,
            'name' => $w->name,
            'employee_number' => $w->employee_number,
            'profession' => $w->profession,
            'department' => $w->department,
            'company' => $w->company,
            'nationality' => $w->nationality,
            'joining_date' => $w->joining_date?->format('Y-m-d'),
            'demobilization_date' => $w->demobilization_date?->format('Y-m-d'),
            'induction_status' => $w->induction_status,
            'induction_date' => $w->induction_date?->format('Y-m-d'),
            'induction_by' => $w->induction_by,
            'status' => $w->status,
            'id_number' => $w->id_number,
            'iqama_number' => $w->iqama_number,
            'contact_number' => $w->contact_number,
            'emergency_contact' => $w->emergency_contact,
            'remarks' => $w->remarks,
            'days_on_site' => $daysOnSite,
            'training_profile_id' => $w->training_profile_id,
            'created_by' => $w->created_by,
            'updated_by' => $w->updated_by,
            'created_at' => $w->created_at?->toISOString(),
            'updated_at' => $w->updated_at?->toISOString(),
        ];
    }
}
