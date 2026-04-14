<?php

namespace App\Http\Controllers;

use App\Models\TrainingRecord;
use App\Models\TrainingLog;
use App\Models\TrainingTopic;
use App\Models\ProfessionTrainingRequirement;
use App\Models\Worker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Carbon\Carbon;
use App\Http\Traits\ExportsData;

class TrainingController extends Controller
{
    use ExportsData;

    // ── TRAINING TOPICS ───────────────────────────────────

    public function topics(): JsonResponse
    {
        $topics = TrainingTopic::active()
            ->orderBy('sort_order')
            ->orderBy('category')
            ->orderBy('label')
            ->get();

        return response()->json($topics);
    }

    // ── FILTER OPTIONS ────────────────────────────────────

    public function filterOptions(): JsonResponse
    {
        $professions = Worker::where('status', 'Active')
            ->distinct()
            ->whereNotNull('profession')
            ->where('profession', '!=', '')
            ->pluck('profession');

        $companies = Worker::where('status', 'Active')
            ->distinct()
            ->whereNotNull('company')
            ->where('company', '!=', '')
            ->pluck('company');

        $topics = TrainingTopic::active()
            ->orderBy('sort_order')
            ->get(['key', 'label', 'category']);

        $trainers = TrainingRecord::distinct()
            ->whereNotNull('trainer_name')
            ->where('trainer_name', '!=', '')
            ->pluck('trainer_name');

        $locations = TrainingRecord::distinct()
            ->whereNotNull('training_location')
            ->where('training_location', '!=', '')
            ->pluck('training_location');

        $providers = TrainingRecord::distinct()
            ->whereNotNull('training_provider')
            ->where('training_provider', '!=', '')
            ->pluck('training_provider');

        return response()->json([
            'professions' => $professions,
            'companies' => $companies,
            'topics' => $topics,
            'trainers' => $trainers,
            'locations' => $locations,
            'providers' => $providers,
        ]);
    }

    // ── WORKER SEARCH ─────────────────────────────────────

    public function searchWorkers(Request $request): JsonResponse
    {
        $query = Worker::query()->where('status', 'Active');

        if ($s = $request->get('q')) {
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhere('worker_id', 'like', "%{$s}%")
                    ->orWhere('employee_number', 'like', "%{$s}%");
            });
        }

        if ($prof = $request->get('profession')) {
            $query->where('profession', $prof);
        }

        if ($company = $request->get('company')) {
            $query->where('company', $company);
        }

        $workers = $query
            ->select(['id', 'worker_id', 'name', 'profession', 'company', 'department', 'induction_status', 'status'])
            ->limit(50)
            ->get();

        $workerIds = $workers->pluck('id');
        $trainingStats = TrainingRecord::whereIn('worker_id', $workerIds)
            ->selectRaw('
                worker_id,
                COUNT(*) as total,
                SUM(status = "Valid") as valid_count,
                SUM(status = "Expired") as expired_count,
                SUM(status = "Expiring Soon") as expiring_count
            ')
            ->groupBy('worker_id')
            ->get()
            ->keyBy('worker_id');

        $workers = $workers->map(function ($worker) use ($trainingStats) {
            $records = $trainingStats->get($worker->id);

            return [
                'id' => $worker->id,
                'worker_id' => $worker->worker_id,
                'name' => $worker->name,
                'profession' => $worker->profession,
                'company' => $worker->company,
                'department' => $worker->department,
                'induction_status' => $worker->induction_status,
                'training_count' => (int) ($records->total ?? 0),
                'valid_count' => (int) ($records->valid_count ?? 0),
                'expired_count' => (int) ($records->expired_count ?? 0),
                'expiring_count' => (int) ($records->expiring_count ?? 0),
            ];
        });

        return response()->json($workers);
    }

    // ── TRAINING RECORDS LIST ─────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $query = TrainingRecord::with([
            'worker:id,worker_id,name,profession,company,department',
            'topic:id,key,label,category,color,light_color',
        ]);

        $this->applyFilters($query, $request);

        $sortBy = $request->get('sort_by', 'training_date');
        $sortDir = $request->get('sort_dir', 'desc');
        $allowed = ['training_date', 'expiry_date', 'next_training_date', 'status', 'record_id', 'created_at'];
        if (in_array($sortBy, $allowed)) {
            $query->orderBy($sortBy, $sortDir);
        }

        $perPage = min(100, max(1, (int) $request->get('per_page', 25)));
        $paginated = $query->paginate($perPage);

        $data = collect($paginated->items())->map(fn($r) => $this->mapToFrontend($r));

        return response()->json([
            'data' => $data,
            'total' => $paginated->total(),
            'page' => $paginated->currentPage(),
            'per_page' => $paginated->perPage(),
            'last_page' => $paginated->lastPage(),
        ]);
    }

    // ── SINGLE RECORD ─────────────────────────────────────

    public function show(string $id): JsonResponse
    {
        $record = TrainingRecord::with(['worker', 'topic', 'logs'])->findOrFail($id);
        return response()->json($this->mapToFrontend($record, true));
    }

    // ── CREATE SINGLE RECORD ──────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'worker_id' => 'required|exists:workers,id',
            'training_topic_key' => 'required|string|max:100',
            'training_date' => 'required|date',
            'expiry_date' => 'nullable|date',
            'next_training_date' => 'nullable|date',
            'training_duration' => 'nullable|string|max:100',
            'trainer_name' => 'nullable|string|max:255',
            'training_provider' => 'nullable|string|max:255',
            'training_location' => 'nullable|string|max:255',
            'certificate_number' => 'nullable|string|max:200',
            'result_status' => 'nullable|in:Completed,Passed,Failed,Attended,Absent,N/A',
            'notes' => 'nullable|string',
            'verified_by' => 'nullable|string|max:255',
        ]);

        try {
            return DB::transaction(function () use ($request) {
                $data = $request->only([
                    'worker_id', 'training_topic_key', 'training_date',
                    'expiry_date', 'next_training_date', 'training_duration',
                    'trainer_name', 'training_provider', 'training_location',
                    'certificate_number', 'result_status', 'notes', 'verified_by',
                ]);

                // Resolve topic_id from key
                $topic = TrainingTopic::where('key', $data['training_topic_key'])->first();
                if ($topic) {
                    $data['training_topic_id'] = $topic->id;
                }

                $data['created_by'] = Auth::id();
                $data['updated_by'] = Auth::id();

                // Handle file upload
                if ($request->hasFile('certificate_file')) {
                    $file = $request->file('certificate_file');
                    $path = $file->store('training-certificates', 'public');
                    $data['certificate_file_path'] = $path;
                    $data['certificate_file_name'] = $file->getClientOriginalName();
                }

                $record = TrainingRecord::create($data);
                $record->load(['worker', 'topic']);

                // Audit log
                $record->logActivity('created', "Training record {$record->record_id} created", null, null, [
                    'worker_name' => $record->worker?->name,
                    'topic' => $record->topic?->label ?? $record->training_topic_key,
                    'training_date' => $data['training_date'],
                ]);

                return response()->json([
                    'message' => 'Training record created',
                    'record' => $this->mapToFrontend($record),
                ], 201);
            });
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed: ' . $e->getMessage()], 500);
        }
    }

    // ── UPDATE RECORD ─────────────────────────────────────

    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $record = TrainingRecord::findOrFail($id);

            $request->validate([
                'training_topic_key' => 'sometimes|string|max:100',
                'training_date' => 'sometimes|date',
                'expiry_date' => 'nullable|date',
                'next_training_date' => 'nullable|date',
                'training_duration' => 'nullable|string|max:100',
                'trainer_name' => 'nullable|string|max:255',
                'training_provider' => 'nullable|string|max:255',
                'training_location' => 'nullable|string|max:255',
                'certificate_number' => 'nullable|string|max:200',
                'result_status' => 'nullable|in:Completed,Passed,Failed,Attended,Absent,N/A',
                'notes' => 'nullable|string',
                'verified_by' => 'nullable|string|max:255',
            ]);

            return DB::transaction(function () use ($request, $record) {
                $oldValues = $record->only([
                    'training_topic_key', 'training_date', 'expiry_date',
                    'next_training_date', 'training_duration',
                    'trainer_name', 'training_provider', 'training_location',
                    'certificate_number', 'result_status', 'notes', 'verified_by',
                ]);

                $data = $request->only([
                    'training_topic_key', 'training_date', 'expiry_date',
                    'next_training_date', 'training_duration',
                    'trainer_name', 'training_provider', 'training_location',
                    'certificate_number', 'result_status', 'notes', 'verified_by',
                ]);

                $data['updated_by'] = Auth::id();

                if (isset($data['training_topic_key'])) {
                    $topic = TrainingTopic::where('key', $data['training_topic_key'])->first();
                    if ($topic) {
                        $data['training_topic_id'] = $topic->id;
                    }
                }

                // Handle file upload
                if ($request->hasFile('certificate_file')) {
                    // Delete old file
                    if ($record->certificate_file_path) {
                        Storage::disk('public')->delete($record->certificate_file_path);
                    }
                    $file = $request->file('certificate_file');
                    $path = $file->store('training-certificates', 'public');
                    $data['certificate_file_path'] = $path;
                    $data['certificate_file_name'] = $file->getClientOriginalName();
                }

                $record->update($data);

                // Build change summary
                $changes = [];
                foreach ($data as $key => $newVal) {
                    $oldVal = $oldValues[$key] ?? null;
                    if ($oldVal instanceof \Carbon\Carbon) $oldVal = $oldVal->format('Y-m-d');
                    if ($newVal != $oldVal && $key !== 'updated_by') {
                        $changes[$key] = ['old' => $oldVal, 'new' => $newVal];
                    }
                }

                $record->logActivity(
                    'updated',
                    "Training record {$record->record_id} updated",
                    json_encode(array_map(fn($c) => $c['old'], $changes)),
                    json_encode(array_map(fn($c) => $c['new'], $changes)),
                    ['changed_fields' => array_keys($changes)]
                );

                $record->load(['worker', 'topic']);

                return response()->json([
                    'message' => 'Training record updated',
                    'record' => $this->mapToFrontend($record->fresh(['worker', 'topic'])),
                ]);
            });
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    // ── DELETE RECORD ─────────────────────────────────────

    public function destroy(string $id): JsonResponse
    {
        try {
            $record = TrainingRecord::findOrFail($id);

            $user = Auth::user();
            $record->deleted_by = $user?->full_name ?? $user?->email ?? 'System';
            $record->save();

            $record->logActivity('deleted', "Training record {$record->record_id} deleted", null, null, [
                'worker_name' => $record->worker?->name,
                'topic' => $record->training_topic_key,
            ]);

            $record->delete();
            RecycleBinController::logDeleteAction('training_record', $record);
            return response()->json(['message' => 'Training record deleted']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    // ── DUPLICATE CHECK ───────────────────────────────────

    public function checkDuplicate(Request $request): JsonResponse
    {
        $request->validate([
            'worker_id' => 'required|string',
            'training_topic_key' => 'required|string',
            'training_date' => 'required|date',
        ]);

        $existing = TrainingRecord::where('worker_id', $request->worker_id)
            ->where('training_topic_key', $request->training_topic_key)
            ->where('training_date', $request->training_date)
            ->first();

        $hasValidRecord = TrainingRecord::where('worker_id', $request->worker_id)
            ->where('training_topic_key', $request->training_topic_key)
            ->where('status', 'Valid')
            ->exists();

        return response()->json([
            'is_exact_duplicate' => (bool) $existing,
            'existing_record_id' => $existing?->record_id,
            'has_valid_record' => $hasValidRecord,
        ]);
    }

    // ── BULK ASSIGNMENT ───────────────────────────────────

    public function bulkAssign(Request $request): JsonResponse
    {
        $request->validate([
            'worker_ids' => 'required|array|min:1|max:200',
            'worker_ids.*' => 'required|exists:workers,id',
            'training_topic_key' => 'required|string|max:100',
            'training_date' => 'required|date',
            'expiry_date' => 'nullable|date',
            'next_training_date' => 'nullable|date',
            'training_duration' => 'nullable|string|max:100',
            'trainer_name' => 'nullable|string|max:255',
            'training_provider' => 'nullable|string|max:255',
            'training_location' => 'nullable|string|max:255',
            'result_status' => 'nullable|in:Completed,Passed,Failed,Attended,Absent,N/A',
            'notes' => 'nullable|string',
            'skip_valid' => 'nullable|boolean',
        ]);

        $topic = TrainingTopic::where('key', $request->training_topic_key)->first();
        $bulkId = 'BULK-' . now()->format('Y-m-d') . '-' . strtoupper(Str::random(6));
        $skipValid = $request->boolean('skip_valid', true);

        $created = [];
        $skipped = [];
        $errors = [];

        foreach ($request->worker_ids as $workerId) {
            try {
                // Skip workers who already have a valid record for this topic
                if ($skipValid) {
                    $hasValid = TrainingRecord::where('worker_id', $workerId)
                        ->where('training_topic_key', $request->training_topic_key)
                        ->where('status', 'Valid')
                        ->exists();

                    if ($hasValid) {
                        $worker = Worker::find($workerId);
                        $skipped[] = [
                            'worker_id' => $workerId,
                            'worker_name' => $worker?->name ?? 'Unknown',
                            'worker_code' => $worker?->worker_id ?? '',
                            'reason' => 'Already has valid training record',
                        ];
                        continue;
                    }
                }

                $record = TrainingRecord::create([
                    'worker_id' => $workerId,
                    'training_topic_key' => $request->training_topic_key,
                    'training_topic_id' => $topic?->id,
                    'training_date' => $request->training_date,
                    'expiry_date' => $request->expiry_date,
                    'next_training_date' => $request->next_training_date,
                    'training_duration' => $request->training_duration,
                    'trainer_name' => $request->trainer_name,
                    'training_provider' => $request->training_provider,
                    'training_location' => $request->training_location,
                    'result_status' => $request->result_status ?? 'Completed',
                    'notes' => $request->notes,
                    'is_bulk_assignment' => true,
                    'bulk_assignment_id' => $bulkId,
                    'created_by' => Auth::id(),
                    'updated_by' => Auth::id(),
                ]);
                $created[] = $record->id;
            } catch (\Exception $e) {
                $errors[] = [
                    'worker_id' => $workerId,
                    'error' => $e->getMessage(),
                ];
            }
        }

        // Log bulk assignment action
        TrainingLog::create([
            'id' => Str::uuid()->toString(),
            'training_record_id' => null,
            'record_code' => $bulkId,
            'action_type' => 'bulk_assigned',
            'description' => count($created) . ' training records created via bulk assignment',
            'metadata' => [
                'bulk_id' => $bulkId,
                'topic' => $request->training_topic_key,
                'created_count' => count($created),
                'skipped_count' => count($skipped),
                'error_count' => count($errors),
            ],
            'user_id' => Auth::id(),
            'user_name' => Auth::user()?->full_name ?? Auth::user()?->email ?? 'System',
        ]);

        return response()->json([
            'message' => count($created) . ' training records created',
            'bulk_id' => $bulkId,
            'created_count' => count($created),
            'skipped_count' => count($skipped),
            'skipped' => $skipped,
            'error_count' => count($errors),
            'errors' => $errors,
        ], 201);
    }

    // ── BULK PREVIEW ─────────────────────────────────────

    public function bulkPreview(Request $request): JsonResponse
    {
        $request->validate([
            'worker_ids' => 'required|array|min:1|max:200',
            'worker_ids.*' => 'required|exists:workers,id',
            'training_topic_key' => 'required|string|max:100',
        ]);

        $topicKey = $request->training_topic_key;
        $workers = Worker::whereIn('id', $request->worker_ids)
            ->select(['id', 'worker_id', 'name', 'profession', 'company'])
            ->get();

        $eligible = [];
        $alreadyValid = [];

        foreach ($workers as $worker) {
            $hasValid = TrainingRecord::where('worker_id', $worker->id)
                ->where('training_topic_key', $topicKey)
                ->where('status', 'Valid')
                ->exists();

            $entry = [
                'id' => $worker->id,
                'worker_id' => $worker->worker_id,
                'name' => $worker->name,
                'profession' => $worker->profession,
                'company' => $worker->company,
            ];

            if ($hasValid) {
                $alreadyValid[] = $entry;
            } else {
                $eligible[] = $entry;
            }
        }

        return response()->json([
            'total_selected' => count($request->worker_ids),
            'eligible_count' => count($eligible),
            'already_valid_count' => count($alreadyValid),
            'eligible' => $eligible,
            'already_valid' => $alreadyValid,
        ]);
    }

    // ── STATS ─────────────────────────────────────────────

    public function stats(Request $request): JsonResponse
    {
        $year = (int) $request->get('year', now()->year);

        $kpis = DB::selectOne("
            SELECT
                COUNT(*) as total_records,
                SUM(status = 'Valid') as valid,
                SUM(status = 'Expired') as expired,
                SUM(status = 'Expiring Soon') as expiring_soon,
                COUNT(DISTINCT worker_id) as workers_trained
            FROM training_records
            WHERE deleted_at IS NULL
        ");

        $thisMonth = DB::selectOne("
            SELECT COUNT(*) as count
            FROM training_records
            WHERE MONTH(training_date) = ? AND YEAR(training_date) = ? AND deleted_at IS NULL
        ", [now()->month, now()->year]);

        // Calculate pending count from trade requirements
        $pendingCount = $this->calculatePendingCount();

        // Total active workers
        $totalWorkers = Worker::where('status', 'Active')->count();

        $byTopic = DB::select("
            SELECT
                tr.training_topic_key,
                COALESCE(tt.label, tr.training_topic_key) as topic_label,
                tt.color as topic_color,
                tt.light_color as topic_light_color,
                COUNT(*) as total,
                SUM(tr.status = 'Valid') as valid,
                SUM(tr.status = 'Expired') as expired,
                SUM(tr.status = 'Expiring Soon') as expiring
            FROM training_records tr
            LEFT JOIN training_topics tt ON tr.training_topic_key = tt.key
            WHERE tr.deleted_at IS NULL
            GROUP BY tr.training_topic_key, tt.label, tt.color, tt.light_color
            ORDER BY total DESC
        ");

        $monthly = DB::select("
            SELECT MONTH(training_date) as month, COUNT(*) as total
            FROM training_records
            WHERE YEAR(training_date) = ? AND deleted_at IS NULL
            GROUP BY MONTH(training_date)
            ORDER BY month
        ", [$year]);

        $byProfession = DB::select("
            SELECT w.profession, COUNT(*) as total,
                SUM(tr.status = 'Valid') as valid_count,
                SUM(tr.status = 'Expired') as expired_count
            FROM training_records tr
            JOIN workers w ON tr.worker_id = w.id
            WHERE w.profession IS NOT NULL AND w.profession != '' AND tr.deleted_at IS NULL
            GROUP BY w.profession
            ORDER BY total DESC
        ");

        $expiringSoon = TrainingRecord::with('worker:id,worker_id,name,profession')
            ->whereNull('deleted_at')
            ->where('status', 'Valid')
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '>=', now()->toDateString())
            ->where('expiry_date', '<=', now()->addDays(30)->toDateString())
            ->orderBy('expiry_date')
            ->limit(10)
            ->get()
            ->map(fn($r) => [
                'id' => $r->id,
                'record_id' => $r->record_id,
                'worker_name' => $r->worker?->name,
                'worker_id_no' => $r->worker?->worker_id,
                'topic' => $r->training_topic_key,
                'expiry_date' => $r->expiry_date?->format('Y-m-d'),
                'days_left' => $r->days_until_expiry,
            ]);

        return response()->json([
            'kpis' => [
                'total_records' => (int) ($kpis->total_records ?? 0),
                'valid' => (int) ($kpis->valid ?? 0),
                'expired' => (int) ($kpis->expired ?? 0),
                'expiring_soon' => (int) ($kpis->expiring_soon ?? 0),
                'pending' => $pendingCount,
                'workers_trained' => (int) ($kpis->workers_trained ?? 0),
                'total_workers' => $totalWorkers,
                'this_month' => (int) ($thisMonth->count ?? 0),
            ],
            'byTopic' => array_map(fn($r) => [
                'training_topic_key' => $r->training_topic_key,
                'topic_label' => $r->topic_label,
                'topic_color' => $r->topic_color,
                'topic_light_color' => $r->topic_light_color,
                'total' => (int) $r->total,
                'valid' => (int) ($r->valid ?? 0),
                'expired' => (int) ($r->expired ?? 0),
                'expiring' => (int) ($r->expiring ?? 0),
            ], $byTopic),
            'monthly' => array_map(fn($r) => [
                'month' => (int) $r->month,
                'total' => (int) $r->total,
            ], $monthly),
            'byProfession' => array_map(fn($r) => [
                'profession' => $r->profession,
                'total' => (int) $r->total,
                'valid' => (int) ($r->valid_count ?? 0),
                'expired' => (int) ($r->expired_count ?? 0),
            ], $byProfession),
            'expiringSoon' => $expiringSoon,
        ]);
    }

    // ── COMPLIANCE MATRIX ─────────────────────────────────

    public function complianceMatrix(Request $request): JsonResponse
    {
        $profession = $request->get('profession');
        $search = $request->get('search');

        // Get all requirements, optionally filtered by profession
        $reqQuery = ProfessionTrainingRequirement::query();
        if ($profession) {
            $reqQuery->where('profession', $profession);
        }
        $requirements = $reqQuery->get();

        if ($requirements->isEmpty()) {
            return response()->json([
                'workers' => [],
                'topics' => [],
                'requirements_count' => 0,
            ]);
        }

        // Get unique professions from requirements
        $professions = $requirements->pluck('profession')->unique()->values();
        $topicKeys = $requirements->pluck('training_topic_key')->unique()->values();

        // Get active workers of those professions
        $workerQuery = Worker::where('status', 'Active')
            ->whereIn('profession', $professions);
        if ($search) {
            $workerQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('worker_id', 'like', "%{$search}%");
            });
        }
        $workers = $workerQuery->select(['id', 'worker_id', 'name', 'profession', 'company'])->get();

        // Get valid training records for these workers + topics
        $validRecords = TrainingRecord::whereIn('worker_id', $workers->pluck('id'))
            ->whereIn('training_topic_key', $topicKeys)
            ->where('status', 'Valid')
            ->get()
            ->groupBy('worker_id');

        // Get topic labels
        $topicLabels = TrainingTopic::whereIn('key', $topicKeys)->pluck('label', 'key');

        // Build matrix
        $matrix = $workers->map(function ($worker) use ($requirements, $validRecords, $topicLabels) {
            $workerReqs = $requirements->where('profession', $worker->profession);
            $workerValid = $validRecords->get($worker->id, collect());

            $topicStatuses = [];
            $validCount = 0;
            $pendingCount = 0;
            $expiredCount = 0;

            foreach ($workerReqs as $req) {
                $record = $workerValid->where('training_topic_key', $req->training_topic_key)->first();
                if ($record) {
                    $topicStatuses[$req->training_topic_key] = [
                        'status' => $record->status,
                        'expiry_date' => $record->expiry_date?->format('Y-m-d'),
                        'record_id' => $record->record_id,
                    ];
                    if ($record->status === 'Valid' || $record->status === 'Expiring Soon') {
                        $validCount++;
                    } else {
                        $expiredCount++;
                    }
                } else {
                    $topicStatuses[$req->training_topic_key] = [
                        'status' => 'Pending',
                        'expiry_date' => null,
                        'record_id' => null,
                    ];
                    $pendingCount++;
                }
            }

            $total = $workerReqs->count();

            return [
                'id' => $worker->id,
                'worker_id' => $worker->worker_id,
                'name' => $worker->name,
                'profession' => $worker->profession,
                'company' => $worker->company,
                'required_count' => $total,
                'valid_count' => $validCount,
                'pending_count' => $pendingCount,
                'expired_count' => $expiredCount,
                'compliance_pct' => $total > 0 ? round(($validCount / $total) * 100) : 100,
                'topics' => $topicStatuses,
            ];
        });

        // Build topics list for column headers
        $topicsList = $topicKeys->map(fn($key) => [
            'key' => $key,
            'label' => $topicLabels[$key] ?? $key,
        ])->values();

        return response()->json([
            'workers' => $matrix->values(),
            'topics' => $topicsList,
            'requirements_count' => $requirements->count(),
        ]);
    }

    // ── WORKER TRAINING SUMMARY ───────────────────────────

    public function workerSummary(string $workerId): JsonResponse
    {
        $worker = Worker::findOrFail($workerId);

        $records = TrainingRecord::where('worker_id', $worker->id)
            ->with('topic')
            ->orderBy('training_date', 'desc')
            ->get()
            ->map(function ($r) {
                return [
                    'id' => $r->id,
                    'record_id' => $r->record_id,
                    'training_topic_key' => $r->training_topic_key,
                    'topic_label' => $r->topic?->label ?? $r->training_topic_key,
                    'topic_color' => $r->topic?->color,
                    'topic_light_color' => $r->topic?->light_color,
                    'training_date' => $r->training_date?->format('Y-m-d'),
                    'expiry_date' => $r->expiry_date?->format('Y-m-d'),
                    'next_training_date' => $r->next_training_date?->format('Y-m-d'),
                    'training_duration' => $r->training_duration,
                    'training_provider' => $r->training_provider,
                    'result_status' => $r->result_status,
                    'status' => $r->status,
                    'days_until_expiry' => $r->days_until_expiry,
                    'trainer_name' => $r->trainer_name,
                    'certificate_number' => $r->certificate_number,
                    'certificate_url' => $r->certificate_url,
                    'notes' => $r->notes,
                ];
            });

        // Get required topics for this worker's profession
        $requiredTopics = [];
        if ($worker->profession) {
            $reqs = ProfessionTrainingRequirement::where('profession', $worker->profession)->get();
            foreach ($reqs as $req) {
                $hasValid = $records->where('training_topic_key', $req->training_topic_key)
                    ->whereIn('status', ['Valid', 'Expiring Soon'])
                    ->isNotEmpty();
                $topic = TrainingTopic::where('key', $req->training_topic_key)->first();
                $requiredTopics[] = [
                    'training_topic_key' => $req->training_topic_key,
                    'topic_label' => $topic?->label ?? $req->training_topic_key,
                    'is_mandatory' => $req->is_mandatory,
                    'status' => $hasValid ? 'Valid' : 'Pending',
                ];
            }
        }

        $summary = [
            'total' => $records->count(),
            'valid' => $records->where('status', 'Valid')->count(),
            'expired' => $records->where('status', 'Expired')->count(),
            'expiring_soon' => $records->where('status', 'Expiring Soon')->count(),
            'pending' => collect($requiredTopics)->where('status', 'Pending')->count(),
        ];

        return response()->json([
            'worker' => [
                'id' => $worker->id,
                'worker_id' => $worker->worker_id,
                'name' => $worker->name,
                'profession' => $worker->profession,
            ],
            'summary' => $summary,
            'records' => $records,
            'required_topics' => $requiredTopics,
        ]);
    }

    // ── TRADE REQUIREMENTS CRUD ──────────────────────────

    public function requirements(Request $request): JsonResponse
    {
        $query = ProfessionTrainingRequirement::query();

        if ($profession = $request->get('profession')) {
            $query->where('profession', $profession);
        }

        $requirements = $query->orderBy('profession')
            ->orderBy('training_topic_key')
            ->get()
            ->map(function ($req) {
                $topic = TrainingTopic::where('key', $req->training_topic_key)->first();
                return [
                    'id' => $req->id,
                    'profession' => $req->profession,
                    'training_topic_key' => $req->training_topic_key,
                    'topic_label' => $topic?->label ?? $req->training_topic_key,
                    'topic_category' => $topic?->category,
                    'is_mandatory' => $req->is_mandatory,
                    'notes' => $req->notes,
                    'created_at' => $req->created_at?->toISOString(),
                ];
            });

        // Group by profession
        $grouped = $requirements->groupBy('profession');

        return response()->json([
            'data' => $requirements,
            'grouped' => $grouped,
        ]);
    }

    public function storeRequirement(Request $request): JsonResponse
    {
        $request->validate([
            'profession' => 'required|string|max:150',
            'training_topic_key' => 'required|string|max:100',
            'is_mandatory' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        // Check for existing mapping
        $exists = ProfessionTrainingRequirement::where('profession', $request->profession)
            ->where('training_topic_key', $request->training_topic_key)
            ->exists();

        if ($exists) {
            return response()->json([
                'error' => 'This training requirement already exists for the selected profession',
            ], 422);
        }

        $topic = TrainingTopic::where('key', $request->training_topic_key)->first();

        $req = ProfessionTrainingRequirement::create([
            'profession' => $request->profession,
            'training_topic_key' => $request->training_topic_key,
            'training_topic_id' => $topic?->id,
            'is_mandatory' => $request->boolean('is_mandatory', true),
            'notes' => $request->notes,
            'created_by' => Auth::id(),
        ]);

        // Audit log
        TrainingLog::create([
            'id' => Str::uuid()->toString(),
            'action_type' => 'requirement_created',
            'description' => "Training requirement added: {$request->profession} → " . ($topic?->label ?? $request->training_topic_key),
            'metadata' => [
                'profession' => $request->profession,
                'topic' => $request->training_topic_key,
            ],
            'user_id' => Auth::id(),
            'user_name' => Auth::user()?->full_name ?? Auth::user()?->email ?? 'System',
        ]);

        return response()->json([
            'message' => 'Training requirement created',
            'requirement' => $req,
        ], 201);
    }

    public function destroyRequirement(string $id): JsonResponse
    {
        $req = ProfessionTrainingRequirement::findOrFail($id);

        TrainingLog::create([
            'id' => Str::uuid()->toString(),
            'action_type' => 'requirement_deleted',
            'description' => "Training requirement removed: {$req->profession} → {$req->training_topic_key}",
            'metadata' => [
                'profession' => $req->profession,
                'topic' => $req->training_topic_key,
            ],
            'user_id' => Auth::id(),
            'user_name' => Auth::user()?->full_name ?? Auth::user()?->email ?? 'System',
        ]);

        $req->delete();
        return response()->json(['message' => 'Training requirement removed']);
    }

    // ── UPLOAD CERTIFICATE ────────────────────────────────

    public function uploadCertificate(Request $request, string $id): JsonResponse
    {
        $record = TrainingRecord::findOrFail($id);

        $request->validate([
            'file' => 'required|file|max:10240|mimes:pdf,jpg,jpeg,png,doc,docx',
        ]);

        // Delete old file
        if ($record->certificate_file_path) {
            Storage::disk('public')->delete($record->certificate_file_path);
        }

        $file = $request->file('file');
        $path = $file->store('training-certificates', 'public');

        $record->update([
            'certificate_file_path' => $path,
            'certificate_file_name' => $file->getClientOriginalName(),
            'updated_by' => Auth::id(),
        ]);

        $record->logActivity('attachment_added', "Certificate uploaded: {$file->getClientOriginalName()}");

        return response()->json([
            'message' => 'Certificate uploaded',
            'certificate_url' => asset('storage/' . $path),
            'certificate_file_name' => $file->getClientOriginalName(),
        ]);
    }

    public function removeCertificate(string $id): JsonResponse
    {
        $record = TrainingRecord::findOrFail($id);

        if ($record->certificate_file_path) {
            Storage::disk('public')->delete($record->certificate_file_path);
            $oldName = $record->certificate_file_name;
            $record->update([
                'certificate_file_path' => null,
                'certificate_file_name' => null,
                'updated_by' => Auth::id(),
            ]);
            $record->logActivity('attachment_removed', "Certificate removed: {$oldName}");
        }

        return response()->json(['message' => 'Certificate removed']);
    }

    // ── AUDIT LOGS ────────────────────────────────────────

    public function auditLogs(Request $request): JsonResponse
    {
        $query = TrainingLog::query()->orderByDesc('created_at');

        if ($recordId = $request->get('training_record_id')) {
            $query->where('training_record_id', $recordId);
        }
        if ($action = $request->get('action_type')) {
            $query->where('action_type', $action);
        }

        $perPage = min(100, max(1, (int) $request->get('per_page', 50)));
        $paginated = $query->paginate($perPage);

        return response()->json([
            'data' => $paginated->items(),
            'total' => $paginated->total(),
            'page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
        ]);
    }

    // ── EXPORT ────────────────────────────────────────────

    public function export(Request $request)
    {
        $query = TrainingRecord::with([
            'worker:id,worker_id,name,profession,company,department',
            'topic:id,key,label,category',
        ]);

        $this->applyFilters($query, $request);

        $records = $query->orderBy('training_date', 'desc')->get();

        $headers = [
            'Record ID', 'Worker ID', 'Worker Name',
            'Profession', 'Company', 'Department',
            'Training Topic', 'Category',
            'Training Date', 'Expiry Date', 'Next Training Date',
            'Duration', 'Status', 'Result', 'Days Until Expiry',
            'Trainer', 'Provider', 'Location', 'Certificate No.',
            'Has Certificate File', 'Bulk Assignment', 'Notes', 'Created By', 'Created',
        ];

        $rows = $records->map(fn($r) => [
            $r->record_id,
            $r->worker?->worker_id,
            $r->worker?->name,
            $r->worker?->profession,
            $r->worker?->company,
            $r->worker?->department,
            $r->topic?->label ?? $r->training_topic_key,
            $r->topic?->category,
            $r->training_date?->format('Y-m-d'),
            $r->expiry_date?->format('Y-m-d'),
            $r->next_training_date?->format('Y-m-d'),
            $r->training_duration,
            $r->status,
            $r->result_status,
            $r->days_until_expiry,
            $r->trainer_name,
            $r->training_provider,
            $r->training_location,
            $r->certificate_number,
            $r->certificate_file_path ? 'Yes' : 'No',
            $r->is_bulk_assignment ? 'Yes' : 'No',
            $r->notes,
            $r->created_by,
            $r->created_at?->format('Y-m-d H:i'),
        ])->all();

        return $this->exportAs($headers, $rows, 'Training Records', $request->get('format', 'csv'));
    }

    // ── REFRESH STATUSES ──────────────────────────────────

    public function refreshStatuses(): JsonResponse
    {
        $updated = 0;
        TrainingRecord::whereNotNull('expiry_date')
            ->chunk(200, function ($records) use (&$updated) {
                foreach ($records as $record) {
                    $newStatus = $record->calculateStatus();
                    if ($record->status !== $newStatus) {
                        $record->update(['status' => $newStatus]);
                        $updated++;
                    }
                }
            });

        return response()->json(['message' => "{$updated} records refreshed"]);
    }

    // ── Private helpers ────────────────────────────

    private function applyFilters($query, Request $request): void
    {
        if ($workerId = $request->get('worker_id')) {
            $query->where('worker_id', $workerId);
        }

        if ($s = $request->get('search')) {
            $query->where(function ($q) use ($s) {
                $q->where('record_id', 'like', "%{$s}%")
                    ->orWhere('certificate_number', 'like', "%{$s}%")
                    ->orWhere('trainer_name', 'like', "%{$s}%")
                    ->orWhereHas('worker', function ($wq) use ($s) {
                        $wq->where('name', 'like', "%{$s}%")
                            ->orWhere('worker_id', 'like', "%{$s}%");
                    });
            });
        }

        if ($topic = $request->get('training_topic_key')) {
            $query->where('training_topic_key', $topic);
        }

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        if ($resultStatus = $request->get('result_status')) {
            $query->where('result_status', $resultStatus);
        }

        if ($profession = $request->get('profession')) {
            $query->whereHas('worker', function ($q) use ($profession) {
                $q->where('profession', $profession);
            });
        }

        if ($company = $request->get('company')) {
            $query->whereHas('worker', function ($q) use ($company) {
                $q->where('company', $company);
            });
        }

        if ($from = $request->get('date_from')) {
            $query->where('training_date', '>=', $from);
        }
        if ($to = $request->get('date_to')) {
            $query->where('training_date', '<=', $to);
        }

        if ($period = $request->get('period')) {
            $query->period($period);
        }

        if ($request->get('expiring_soon')) {
            $query->expiringSoon(30);
        }
        if ($request->get('expired')) {
            $query->expired();
        }
    }

    private function calculatePendingCount(): int
    {
        $requirements = ProfessionTrainingRequirement::all();
        if ($requirements->isEmpty()) {
            return 0;
        }

        $pending = 0;
        $grouped = $requirements->groupBy('profession');

        foreach ($grouped as $profession => $reqs) {
            $workers = Worker::where('status', 'Active')
                ->where('profession', $profession)
                ->pluck('id');

            foreach ($workers as $workerId) {
                foreach ($reqs as $req) {
                    $hasValid = TrainingRecord::where('worker_id', $workerId)
                        ->where('training_topic_key', $req->training_topic_key)
                        ->where('status', 'Valid')
                        ->exists();

                    if (!$hasValid) {
                        $pending++;
                    }
                }
            }
        }

        return $pending;
    }

    private function mapToFrontend(TrainingRecord $r, bool $includeAuditLogs = false): array
    {
        $data = [
            'id' => $r->id,
            'record_id' => $r->record_id,
            'worker_id' => $r->worker_id,
            'worker' => $r->worker ? [
                'id' => $r->worker->id,
                'worker_id' => $r->worker->worker_id,
                'name' => $r->worker->name,
                'profession' => $r->worker->profession,
                'company' => $r->worker->company,
                'department' => $r->worker->department,
            ] : null,
            'training_topic_key' => $r->training_topic_key,
            'topic' => $r->topic ? [
                'id' => $r->topic->id,
                'key' => $r->topic->key,
                'label' => $r->topic->label,
                'category' => $r->topic->category,
                'color' => $r->topic->color,
                'light_color' => $r->topic->light_color,
            ] : null,
            'topic_label' => $r->topic?->label ?? $r->training_topic_key,
            'training_date' => $r->training_date?->format('Y-m-d'),
            'expiry_date' => $r->expiry_date?->format('Y-m-d'),
            'next_training_date' => $r->next_training_date?->format('Y-m-d'),
            'training_duration' => $r->training_duration,
            'status' => $r->status,
            'result_status' => $r->result_status,
            'days_until_expiry' => $r->days_until_expiry,
            'trainer_name' => $r->trainer_name,
            'training_provider' => $r->training_provider,
            'training_location' => $r->training_location,
            'certificate_number' => $r->certificate_number,
            'certificate_url' => $r->certificate_url,
            'certificate_file_name' => $r->certificate_file_name,
            'is_bulk_assignment' => $r->is_bulk_assignment,
            'bulk_assignment_id' => $r->bulk_assignment_id,
            'notes' => $r->notes,
            'verified_by' => $r->verified_by,
            'verified_at' => $r->verified_at?->toISOString(),
            'created_at' => $r->created_at?->toISOString(),
            'updated_at' => $r->updated_at?->toISOString(),
        ];

        if ($includeAuditLogs && $r->relationLoaded('logs')) {
            $data['audit_logs'] = $r->logs->map(fn($log) => [
                'id' => $log->id,
                'action_type' => $log->action_type,
                'description' => $log->description,
                'user_name' => $log->user_name,
                'created_at' => $log->created_at?->toISOString(),
                'metadata' => $log->metadata,
            ]);
        }

        return $data;
    }
}
