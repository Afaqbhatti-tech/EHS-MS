<?php

namespace App\Http\Controllers;

use App\Models\MockDrill;
use App\Models\MockDrillParticipant;
use App\Services\NotificationService;
use App\Models\MockDrillResource;
use App\Models\MockDrillObservation;
use App\Models\MockDrillAction;
use App\Models\MockDrillEvaluation;
use App\Models\MockDrillEvidence;
use App\Models\MockDrillLog;
use App\Models\Erp;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Constants\StatusConstants;
use App\Http\Traits\ExportsData;

class MockDrillController extends Controller
{
    use ExportsData;

    // ─── LIST ───────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $query = MockDrill::query();

        // Text search
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('drill_code', 'like', "%{$search}%")
                  ->orWhere('conducted_by', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%");
            });
        }

        // Filters
        if ($erpId = $request->get('erp_id')) {
            $query->where('erp_id', $erpId);
        }
        if ($drillType = $request->get('drill_type')) {
            $query->where('drill_type', $drillType);
        }
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($area = $request->get('area')) {
            $query->where('area', $area);
        }
        if ($department = $request->get('department')) {
            $query->where('department', $department);
        }
        if ($from = $request->get('date_from')) {
            $query->whereDate('planned_date', '>=', $from);
        }
        if ($to = $request->get('date_to')) {
            $query->whereDate('planned_date', '<=', $to);
        }
        if ($plannedFrom = $request->get('planned_from')) {
            $query->whereDate('planned_date', '>=', $plannedFrom);
        }
        if ($plannedTo = $request->get('planned_to')) {
            $query->whereDate('planned_date', '<=', $plannedTo);
        }
        if ($request->get('overdue') === 'true') {
            $query->overdue();
        }
        if ($request->get('upcoming') === 'true') {
            $query->upcoming();
        }

        // Period shortcuts
        if ($period = $request->get('period')) {
            match ($period) {
                'today' => $query->whereDate('planned_date', today()),
                'week'  => $query->whereBetween('planned_date', [now()->startOfWeek(), now()->endOfWeek()]),
                'month' => $query->whereMonth('planned_date', now()->month)->whereYear('planned_date', now()->year),
                'year'  => $query->whereYear('planned_date', now()->year),
                default => null,
            };
        }

        $query->with(['erp:id,erp_code,title', 'createdBy:id,full_name']);

        $perPage = min(100, max(1, (int) $request->get('per_page', 20)));
        $paginated = $query->orderByDesc('created_at')->paginate($perPage);

        return response()->json([
            'data'      => $paginated->items(),
            'total'     => $paginated->total(),
            'page'      => $paginated->currentPage(),
            'per_page'  => $paginated->perPage(),
            'last_page' => $paginated->lastPage(),
        ]);
    }

    // ─── STORE ──────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title'                => 'required|string|max:255',
            'drill_type'           => 'required|string|max:100',
            'planned_date'         => 'required|date',
            'scenario_description' => 'required|string|min:10',
        ]);

        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $drill = DB::transaction(function () use ($request, $user) {
                // Generate drill_code with lock to prevent race conditions
                $year = date('Y');
                $lastCode = MockDrill::withTrashed()
                    ->whereYear('created_at', $year)
                    ->lockForUpdate()
                    ->orderByDesc('id')
                    ->value('drill_code');
                $seq = $lastCode ? (int) substr($lastCode, -4) + 1 : 1;
                $drillCode = 'DRL-' . $year . '-' . str_pad($seq, 4, '0', STR_PAD_LEFT);

                $drill = MockDrill::create([
                    'drill_code'           => $drillCode,
                    'title'                => $request->input('title'),
                    'erp_id'               => $request->input('erp_id'),
                    'drill_type'           => $request->input('drill_type'),
                    'planned_date'         => $request->input('planned_date'),
                    'planned_time'         => $request->input('planned_time'),
                    'location'             => $request->input('location'),
                    'area'                 => $request->input('area'),
                    'department'           => $request->input('department'),
                    'responsible_person'   => $request->input('responsible_person'),
                    'responsible_person_id'=> $request->input('responsible_person_id'),
                    'conducted_by'         => $request->input('conducted_by'),
                    'observed_by'          => $request->input('observed_by'),
                    'approved_by'          => $request->input('approved_by'),
                    'scenario_description' => $request->input('scenario_description'),
                    'trigger_method'       => $request->input('trigger_method'),
                    'expected_response'    => $request->input('expected_response'),
                    'frequency'            => $request->input('frequency'),
                    'notes'                => $request->input('notes'),
                    'status'               => StatusConstants::DRILL_PLANNED,
                    'created_by'           => $user->id,
                ]);

                $drill->logHistory('Drill Created');

                return $drill;
            });

            // Fire notifications
            NotificationService::drillCreated($drill, $user->id);

            return response()->json([
                'message' => 'Mock drill created successfully',
                'drill'   => $drill->fresh()->load(['erp:id,erp_code,title', 'createdBy:id,full_name']),
            ], 201);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    // ─── SHOW ───────────────────────────────────────

    public function show($id): JsonResponse
    {
        $drill = MockDrill::with([
            'erp',
            'participants',
            'resources',
            'observations.actions',
            'observations.evidence',
            'actions',
            'evaluation',
            'evidence',
            'logs',
            'createdBy:id,full_name',
        ])->findOrFail($id);

        $data = $drill->toArray();
        $data['is_overdue'] = $drill->is_overdue;
        $data['duration_formatted'] = $drill->duration_formatted;
        $data['response_time_formatted'] = $drill->response_time_formatted;

        return response()->json($data);
    }

    // ─── UPDATE ─────────────────────────────────────

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $drill = MockDrill::findOrFail($id);

            if ($drill->status === StatusConstants::DRILL_CLOSED) {
                return response()->json(['message' => 'Cannot update a closed drill'], 422);
            }

            $fields = [];
            $fillable = [
                'title', 'erp_id', 'drill_type',
                'planned_date', 'planned_time', 'location', 'area', 'department',
                'responsible_person', 'responsible_person_id', 'conducted_by', 'observed_by', 'approved_by',
                'scenario_description', 'trigger_method', 'expected_response', 'actual_response',
                'frequency', 'notes',
            ];

            foreach ($fillable as $column) {
                if ($request->has($column)) {
                    $fields[$column] = $request->input($column);
                }
            }

            $user = $request->user();
            $fields['updated_by'] = $user?->id;

            if (!empty($fields)) {
                $drill->update($fields);
                $drill->logHistory('Drill Updated');
            }

            return response()->json([
                'message' => 'Mock drill updated successfully',
                'drill'   => $drill->fresh()->load(['erp:id,erp_code,title', 'createdBy:id,full_name']),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    // ─── DELETE ──────────────────────────────────────

    public function destroy($id): JsonResponse
    {
        try {
            $drill = MockDrill::findOrFail($id);
            $drill->deleted_by = Auth::user()?->full_name ?? 'System';
            $drill->save();
            $drill->logHistory('Drill Deleted');
            $drill->delete();
            RecycleBinController::logDeleteAction('mock_drill', $drill);

            return response()->json(['message' => 'Mock drill deleted']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    // ─── CONDUCT DRILL ──────────────────────────────

    public function conductDrill(Request $request, $id): JsonResponse
    {
        $request->validate([
            'actual_start_time' => 'required|date',
        ]);

        $drill = MockDrill::findOrFail($id);

        if (!in_array($drill->status, [StatusConstants::DRILL_PLANNED, StatusConstants::DRILL_SCHEDULED])) {
            return response()->json(['message' => 'Drill must be in Planned or Scheduled status to conduct'], 422);
        }

        $oldStatus = $drill->status;

        $timingFields = [
            'actual_start_time', 'actual_end_time',
            'alarm_trigger_time', 'first_response_time',
            'evacuation_start_time', 'evacuation_complete_time',
            'muster_complete_time', 'response_complete_time',
        ];

        $fields = ['status' => StatusConstants::DRILL_CONDUCTED];
        foreach ($timingFields as $field) {
            if ($request->has($field)) {
                $fields[$field] = $request->input($field);
            }
        }

        if ($request->has('actual_response')) {
            $fields['actual_response'] = $request->input('actual_response');
        }
        if ($request->has('conducted_by')) {
            $fields['conducted_by'] = $request->input('conducted_by');
        }

        $user = $request->user();
        $fields['updated_by'] = $user->id;

        $drill->update($fields);

        $drill->logHistory('Drill Conducted', $oldStatus, 'Conducted');

        return response()->json([
            'message' => 'Drill marked as conducted',
            'drill'   => $drill->fresh()->load(['erp:id,erp_code,title', 'createdBy:id,full_name']),
        ]);
    }

    // ─── CLOSE DRILL ────────────────────────────────

    public function closeDrill(Request $request, $id): JsonResponse
    {
        $drill = MockDrill::findOrFail($id);

        if (!in_array($drill->status, [StatusConstants::DRILL_CONDUCTED, 'In Progress'])) {
            return response()->json(['message' => 'Only conducted or in-progress drills can be closed'], 422);
        }

        // Validation checks (can be overridden by admin_override)
        $adminOverride = $request->boolean('admin_override');

        if (!$adminOverride) {
            if (($drill->observation_count ?? 0) < 1) {
                return response()->json(['message' => 'Cannot close drill: at least one observation is required'], 422);
            }
            if (!$drill->evaluation) {
                return response()->json(['message' => 'Cannot close drill: evaluation must be completed'], 422);
            }
            if (($drill->open_action_count ?? 0) > 0) {
                return response()->json(['message' => 'Cannot close drill: all actions must be closed. Open actions: ' . $drill->open_action_count], 422);
            }
        }

        $user = $request->user();
        $oldStatus = $drill->status;

        $fields = [
            'status'        => StatusConstants::DRILL_CLOSED,
            'closed_at'     => now(),
            'closed_by'     => $user->id,
            'closure_notes' => $request->input('closure_notes'),
            'updated_by'    => $user->id,
        ];

        // Calculate next_drill_due if frequency is set
        if ($drill->frequency) {
            $nextDue = match ($drill->frequency) {
                'Weekly'      => now()->addWeek(),
                'Bi-Weekly'   => now()->addWeeks(2),
                'Monthly'     => now()->addMonth(),
                'Quarterly'   => now()->addMonths(3),
                'Semi-Annual' => now()->addMonths(6),
                'Annual'      => now()->addYear(),
                default       => null,
            };
            if ($nextDue) {
                $fields['next_drill_due'] = $nextDue->toDateString();
            }
        }

        $drill->update($fields);
        $drill->logHistory('Drill Closed', $oldStatus, 'Closed');

        return response()->json([
            'message' => 'Drill closed successfully',
            'drill'   => $drill->fresh()->load(['erp:id,erp_code,title', 'createdBy:id,full_name']),
        ]);
    }

    // ─── CANCEL DRILL ───────────────────────────────

    public function cancelDrill(Request $request, $id): JsonResponse
    {
        $request->validate([
            'cancellation_reason' => 'required|string|min:5',
        ]);

        $drill = MockDrill::findOrFail($id);

        if ($drill->status === StatusConstants::DRILL_CLOSED) {
            return response()->json(['message' => 'Cannot cancel a closed drill'], 422);
        }

        $oldStatus = $drill->status;
        $user = $request->user();

        $drill->update([
            'status'     => StatusConstants::DRILL_CANCELLED,
            'notes'      => $drill->notes
                ? $drill->notes . "\n\n[Cancellation] " . $request->input('cancellation_reason')
                : '[Cancellation] ' . $request->input('cancellation_reason'),
            'updated_by' => $user->id,
        ]);

        $drill->logHistory('Drill Cancelled', $oldStatus, 'Cancelled', $request->input('cancellation_reason'));

        return response()->json([
            'message' => 'Drill cancelled',
            'drill'   => $drill->fresh()->load(['erp:id,erp_code,title', 'createdBy:id,full_name']),
        ]);
    }

    // ─── PARTICIPANTS ───────────────────────────────

    public function addParticipant(Request $request, $id): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $drill = MockDrill::findOrFail($id);

        $participant = MockDrillParticipant::create([
            'mock_drill_id'        => $drill->id,
            'user_id'              => $request->input('user_id'),
            'name'                 => $request->input('name'),
            'employee_id'          => $request->input('employee_id'),
            'designation'          => $request->input('designation'),
            'department'           => $request->input('department'),
            'company'              => $request->input('company'),
            'emergency_role'       => $request->input('emergency_role'),
            'attendance_status'    => $request->input('attendance_status', 'Present'),
            'participation_status' => $request->input('participation_status', 'Active'),
            'responsibility'       => $request->input('responsibility'),
            'remarks'              => $request->input('remarks'),
        ]);

        $drill->recalculateCounts();
        $drill->logHistory('Participant Added', null, null, 'Added participant: ' . $participant->name);

        return response()->json([
            'message'     => 'Participant added',
            'participant' => $participant,
        ], 201);
    }

    public function updateParticipant(Request $request, $drillId, $participantId): JsonResponse
    {
        $drill = MockDrill::findOrFail($drillId);
        $participant = MockDrillParticipant::where('mock_drill_id', $drillId)->findOrFail($participantId);

        $fields = [];
        $fillable = [
            'user_id', 'name', 'employee_id', 'designation', 'department', 'company',
            'emergency_role', 'attendance_status', 'participation_status', 'responsibility', 'remarks',
        ];

        foreach ($fillable as $col) {
            if ($request->has($col)) {
                $fields[$col] = $request->input($col);
            }
        }

        if (!empty($fields)) {
            $participant->update($fields);
            $drill->logHistory('Participant Updated', null, null, 'Updated participant: ' . $participant->name);
        }

        return response()->json([
            'message'     => 'Participant updated',
            'participant' => $participant->fresh(),
        ]);
    }

    public function bulkAddParticipants(Request $request, $id): JsonResponse
    {
        $request->validate([
            'participants'        => 'required|array|min:1',
            'participants.*.name' => 'required|string|max:255',
        ]);

        $drill = MockDrill::findOrFail($id);
        $created = [];

        DB::transaction(function () use ($request, $drill, &$created) {
            foreach ($request->input('participants') as $p) {
                $created[] = MockDrillParticipant::create([
                    'mock_drill_id'        => $drill->id,
                    'user_id'              => $p['user_id'] ?? null,
                    'name'                 => $p['name'],
                    'employee_id'          => $p['employee_id'] ?? null,
                    'designation'          => $p['designation'] ?? null,
                    'department'           => $p['department'] ?? null,
                    'company'              => $p['company'] ?? null,
                    'emergency_role'       => $p['emergency_role'] ?? null,
                    'attendance_status'    => $p['attendance_status'] ?? 'Present',
                    'participation_status' => $p['participation_status'] ?? 'Active',
                    'responsibility'       => $p['responsibility'] ?? null,
                    'remarks'              => $p['remarks'] ?? null,
                ]);
            }
        });

        $drill->recalculateCounts();
        $drill->logHistory('Participants Bulk Added', null, null, count($created) . ' participants added');

        return response()->json([
            'message'      => count($created) . ' participants added',
            'participants' => $created,
        ], 201);
    }

    public function removeParticipant($drillId, $participantId): JsonResponse
    {
        $drill = MockDrill::findOrFail($drillId);
        $participant = MockDrillParticipant::where('mock_drill_id', $drillId)->findOrFail($participantId);

        $name = $participant->name;
        $participant->delete();

        $drill->recalculateCounts();
        $drill->logHistory('Participant Removed', null, null, 'Removed participant: ' . $name);

        return response()->json(['message' => 'Participant removed']);
    }

    // ─── RESOURCES ──────────────────────────────────

    public function addResource(Request $request, $id): JsonResponse
    {
        $request->validate([
            'equipment_name' => 'required|string|max:255',
        ]);

        $drill = MockDrill::findOrFail($id);

        $resource = MockDrillResource::create([
            'mock_drill_id'  => $drill->id,
            'equipment_name' => $request->input('equipment_name'),
            'equipment_type' => $request->input('equipment_type'),
            'quantity'        => $request->input('quantity', 1),
            'condition'       => $request->input('condition'),
            'was_available'   => $request->boolean('was_available', true),
            'was_functional'  => $request->boolean('was_functional', true),
            'remarks'         => $request->input('remarks'),
        ]);

        $drill->logHistory('Resource Added', null, null, 'Added resource: ' . $resource->equipment_name);

        return response()->json([
            'message'  => 'Resource added',
            'resource' => $resource,
        ], 201);
    }

    public function updateResource(Request $request, $drillId, $resourceId): JsonResponse
    {
        $drill = MockDrill::findOrFail($drillId);
        $resource = MockDrillResource::where('mock_drill_id', $drillId)->findOrFail($resourceId);

        $fields = [];
        $fillable = [
            'equipment_name', 'equipment_type', 'quantity', 'condition',
            'was_available', 'was_functional', 'remarks',
        ];

        foreach ($fillable as $col) {
            if ($request->has($col)) {
                if (in_array($col, ['was_available', 'was_functional'])) {
                    $fields[$col] = $request->boolean($col);
                } else {
                    $fields[$col] = $request->input($col);
                }
            }
        }

        if (!empty($fields)) {
            $resource->update($fields);
            $drill->logHistory('Resource Updated', null, null, 'Updated resource: ' . $resource->equipment_name);
        }

        return response()->json([
            'message'  => 'Resource updated',
            'resource' => $resource->fresh(),
        ]);
    }

    public function removeResource($drillId, $resourceId): JsonResponse
    {
        $drill = MockDrill::findOrFail($drillId);
        $resource = MockDrillResource::where('mock_drill_id', $drillId)->findOrFail($resourceId);

        $name = $resource->equipment_name;
        $resource->delete();

        $drill->logHistory('Resource Removed', null, null, 'Removed resource: ' . $name);

        return response()->json(['message' => 'Resource removed']);
    }

    // ─── OBSERVATIONS ───────────────────────────────

    public function addObservation(Request $request, $id): JsonResponse
    {
        $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'required|string|min:5',
        ]);

        $drill = MockDrill::findOrFail($id);
        $user = $request->user();

        $photoPaths = [];
        $evidenceCreated = [];

        // Handle photos[] multi-upload
        if ($photos = $request->file('photos')) {
            if (!is_array($photos)) {
                $photos = [$photos];
            }
            $dir = storage_path('app/public/drills/' . $drill->id . '/observations');
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            foreach ($photos as $file) {
                if (!$file || !$file->isValid()) continue;

                $originalName = $file->getClientOriginalName();
                $fileSize = $file->getSize();
                $mimeType = $file->getClientMimeType();

                $name = 'drill-' . time() . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
                $file->move($dir, $name);

                $relativePath = 'drills/' . $drill->id . '/observations/' . $name;
                $photoPaths[] = $relativePath;

                $evidenceCreated[] = [
                    'file_path'     => $relativePath,
                    'original_name' => $originalName,
                    'file_type'     => $mimeType,
                    'file_size_kb'  => round($fileSize / 1024, 2),
                ];
            }
        }

        // Handle single file upload
        if ($file = $request->file('file')) {
            if ($file->isValid()) {
                $dir = storage_path('app/public/drills/' . $drill->id . '/observations');
                if (!is_dir($dir)) {
                    mkdir($dir, 0755, true);
                }

                $originalName = $file->getClientOriginalName();
                $fileSize = $file->getSize();
                $mimeType = $file->getClientMimeType();

                $name = 'drill-' . time() . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
                $file->move($dir, $name);

                $relativePath = 'drills/' . $drill->id . '/observations/' . $name;

                $evidenceCreated[] = [
                    'file_path'     => $relativePath,
                    'original_name' => $originalName,
                    'file_type'     => $mimeType,
                    'file_size_kb'  => round($fileSize / 1024, 2),
                ];
            }
        }

        $observation = MockDrillObservation::create([
            'mock_drill_id'    => $drill->id,
            'title'            => $request->input('title'),
            'description'      => $request->input('description'),
            'observation_type' => $request->input('observation_type'),
            'category'         => $request->input('category'),
            'severity'         => $request->input('severity'),
            'reported_by'      => $user->full_name ?? $user->email,
            'reported_by_id'   => $user->id,
            'photo_paths'      => $photoPaths ?: null,
            'file_path'        => $request->input('file_path'),
            'notes'            => $request->input('notes'),
            'created_by'       => $user->id,
        ]);

        // Create MockDrillEvidence records for uploaded files
        foreach ($evidenceCreated as $ev) {
            MockDrillEvidence::create([
                'mock_drill_id'   => $drill->id,
                'linked_type'     => 'Observation',
                'linked_id'       => $observation->id,
                'file_path'       => $ev['file_path'],
                'original_name'   => $ev['original_name'],
                'file_type'       => $ev['file_type'],
                'file_size_kb'    => $ev['file_size_kb'],
                'uploaded_by'     => $user->id,
                'uploaded_by_name'=> $user->full_name ?? $user->email,
            ]);
        }

        $drill->logHistory('Observation Added', null, null, 'Added observation: ' . $observation->obs_code);

        return response()->json([
            'message'     => 'Observation added',
            'observation' => $observation->fresh()->load(['actions', 'evidence']),
        ], 201);
    }

    public function updateObservation(Request $request, $drillId, $obsId): JsonResponse
    {
        $drill = MockDrill::findOrFail($drillId);
        $observation = MockDrillObservation::where('mock_drill_id', $drillId)->findOrFail($obsId);

        $fields = [];
        $fillable = [
            'title', 'description', 'observation_type', 'category', 'severity',
            'reported_by', 'reported_by_id', 'photo_paths', 'file_path', 'notes',
        ];

        foreach ($fillable as $col) {
            if ($request->has($col)) {
                $fields[$col] = $request->input($col);
            }
        }

        if (!empty($fields)) {
            $observation->update($fields);
            $drill->logHistory('Observation Updated', null, null, 'Updated observation: ' . $observation->obs_code);
        }

        return response()->json([
            'message'     => 'Observation updated',
            'observation' => $observation->fresh()->load(['actions', 'evidence']),
        ]);
    }

    public function deleteObservation($drillId, $obsId): JsonResponse
    {
        $drill = MockDrill::findOrFail($drillId);
        $observation = MockDrillObservation::where('mock_drill_id', $drillId)->findOrFail($obsId);

        $code = $observation->obs_code;

        // Delete related actions
        MockDrillAction::where('observation_id', $observation->id)->delete();

        // Delete related evidence
        MockDrillEvidence::where('linked_type', 'Observation')
            ->where('linked_id', $observation->id)
            ->delete();

        $observation->delete();

        $drill->logHistory('Observation Deleted', null, null, 'Deleted observation: ' . $code);

        return response()->json(['message' => 'Observation removed']);
    }

    // ─── ACTIONS ────────────────────────────────────

    public function addAction(Request $request, $id): JsonResponse
    {
        $request->validate([
            'title'    => 'required|string|max:255',
            'due_date' => 'required|date',
        ]);

        $drill = MockDrill::findOrFail($id);
        $user = $request->user();

        $action = MockDrillAction::create([
            'mock_drill_id'  => $drill->id,
            'observation_id' => $request->input('observation_id'),
            'title'          => $request->input('title'),
            'description'    => $request->input('description'),
            'assigned_to'    => $request->input('assigned_to'),
            'assigned_to_id' => $request->input('assigned_to_id'),
            'due_date'       => $request->input('due_date'),
            'priority'       => $request->input('priority', 'Medium'),
            'status'         => $request->input('status', 'Open'),
            'created_by'     => $user->id,
        ]);

        $drill->logHistory('Action Added', null, null, 'Added action: ' . $action->action_code);

        return response()->json([
            'message' => 'Action added',
            'action'  => $action,
        ], 201);
    }

    public function updateAction(Request $request, $drillId, $actionId): JsonResponse
    {
        $drill = MockDrill::findOrFail($drillId);
        $action = MockDrillAction::where('mock_drill_id', $drillId)->findOrFail($actionId);

        $oldStatus = $action->status;
        $user = $request->user();

        $fields = [];
        $fillable = [
            'title', 'description', 'assigned_to', 'assigned_to_id',
            'due_date', 'priority', 'status', 'completion_notes', 'observation_id',
        ];

        foreach ($fillable as $col) {
            if ($request->has($col)) {
                $fields[$col] = $request->input($col);
            }
        }

        // Handle status change to Closed
        $newStatus = $fields['status'] ?? $oldStatus;
        if ($newStatus === StatusConstants::DRILL_ACTION_CLOSED && $oldStatus !== StatusConstants::DRILL_ACTION_CLOSED) {
            if (!$request->has('completion_notes') && !$action->completion_notes) {
                return response()->json(['message' => 'Completion notes required when closing an action'], 422);
            }
            $fields['closed_at'] = now();
            $fields['closed_by'] = $user->id;
        }

        // Handle evidence_path upload
        if ($file = $request->file('evidence_path')) {
            if ($file->isValid()) {
                $dir = storage_path('app/public/drills/' . $drillId . '/actions');
                if (!is_dir($dir)) {
                    mkdir($dir, 0755, true);
                }
                $name = 'drill-' . time() . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
                $file->move($dir, $name);
                $fields['evidence_path'] = 'drills/' . $drillId . '/actions/' . $name;
            }
        }

        $fields['updated_by'] = $user->id;

        $action->update($fields);

        $logAction = ($newStatus === StatusConstants::DRILL_ACTION_CLOSED && $oldStatus !== StatusConstants::DRILL_ACTION_CLOSED) ? 'Action Closed' : 'Action Updated';
        $drill->logHistory($logAction, $oldStatus, $newStatus, "Action {$action->action_code}: {$logAction}");

        return response()->json([
            'message' => $logAction === 'Action Closed' ? 'Action closed' : 'Action updated',
            'action'  => $action->fresh(),
        ]);
    }

    // ─── EVALUATION ─────────────────────────────────

    public function saveEvaluation(Request $request, $id): JsonResponse
    {
        $drill = MockDrill::findOrFail($id);
        $user = $request->user();

        $request->validate([
            'overall_result'            => 'required|string|in:Pass,Fail,Partial',
            'response_time_score'       => 'nullable|integer|min:0|max:10',
            'communication_score'       => 'nullable|integer|min:0|max:10',
            'team_coordination_score'   => 'nullable|integer|min:0|max:10',
            'equipment_readiness_score' => 'nullable|integer|min:0|max:10',
            'erp_compliance_score'      => 'nullable|integer|min:0|max:10',
            'participation_score'       => 'nullable|integer|min:0|max:10',
            'drill_effectiveness'       => 'nullable|string|max:500',
            'strengths'                 => 'nullable|string|max:2000',
            'weaknesses'                => 'nullable|string|max:2000',
            'recommendations'           => 'nullable|string|max:2000',
            'overall_notes'             => 'nullable|string|max:2000',
        ]);

        $evaluation = MockDrillEvaluation::updateOrCreate(
            ['mock_drill_id' => $drill->id],
            [
                'overall_result'             => $request->input('overall_result'),
                'response_time_score'        => $request->input('response_time_score'),
                'communication_score'        => $request->input('communication_score'),
                'team_coordination_score'    => $request->input('team_coordination_score'),
                'equipment_readiness_score'  => $request->input('equipment_readiness_score'),
                'erp_compliance_score'       => $request->input('erp_compliance_score'),
                'participation_score'        => $request->input('participation_score'),
                'drill_effectiveness'        => $request->input('drill_effectiveness'),
                'strengths'                  => $request->input('strengths'),
                'weaknesses'                 => $request->input('weaknesses'),
                'recommendations'            => $request->input('recommendations'),
                'overall_notes'              => $request->input('overall_notes'),
                'evaluated_by'               => $user->full_name ?? $user->email,
                'evaluated_by_id'            => $user->id,
                'evaluated_at'               => now(),
            ]
        );

        $drill->logHistory('Evaluation Saved', null, null, 'Evaluation score: ' . ($evaluation->final_score ?? 'N/A'));

        return response()->json([
            'message'    => 'Evaluation saved',
            'evaluation' => $evaluation->fresh(),
        ]);
    }

    // ─── EVIDENCE UPLOAD ────────────────────────────

    public function uploadEvidence(Request $request, $id): JsonResponse
    {
        $drill = MockDrill::findOrFail($id);
        $files = $request->file('files');

        if (!$files) {
            return response()->json(['message' => 'No files provided'], 422);
        }
        if (!is_array($files)) {
            $files = [$files];
        }

        $user = $request->user();
        $linkedType = $request->input('linked_type', 'Drill');
        $linkedId = $request->input('linked_id');
        $created = [];

        $dir = storage_path('app/public/drills/' . $drill->id . '/evidence');
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        foreach ($files as $file) {
            if (!$file || !$file->isValid()) continue;

            $originalName = $file->getClientOriginalName();
            $fileSize = $file->getSize();
            $mimeType = $file->getClientMimeType();

            $name = 'drill-' . time() . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
            $file->move($dir, $name);

            $evidence = MockDrillEvidence::create([
                'mock_drill_id'    => $drill->id,
                'linked_type'      => $linkedType,
                'linked_id'        => $linkedId,
                'file_path'        => 'drills/' . $drill->id . '/evidence/' . $name,
                'original_name'    => $originalName,
                'file_type'        => $mimeType,
                'file_size_kb'     => round($fileSize / 1024, 2),
                'uploaded_by'      => $user->id,
                'uploaded_by_name' => $user->full_name ?? $user->email,
            ]);

            $created[] = [
                'id'            => $evidence->id,
                'file_path'     => $evidence->file_path,
                'original_name' => $evidence->original_name,
                'file_type'     => $evidence->file_type,
                'file_size_kb'  => $evidence->file_size_kb,
            ];
        }

        $drill->logHistory('Evidence Uploaded', null, null, count($created) . ' file(s) uploaded (' . $linkedType . ')');

        return response()->json(['message' => 'Evidence uploaded', 'evidence' => $created]);
    }

    // ─── STATS ──────────────────────────────────────

    public function stats(): JsonResponse
    {
        $kpis = DB::selectOne("
            SELECT
                COUNT(*) as total_drills,
                SUM(status = 'Planned') as planned,
                SUM(status = 'Scheduled') as scheduled,
                SUM(status = 'Conducted') as conducted,
                SUM(status = 'Closed') as closed,
                SUM(status = 'Cancelled') as cancelled,
                SUM(status IN ('Planned', 'Scheduled') AND planned_date < CURDATE()) as overdue_drills,
                SUM(YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())) as drills_this_month,
                AVG(CASE WHEN total_response_seconds > 0 THEN total_response_seconds END) as avg_response_seconds,
                AVG(CASE WHEN evacuation_duration_seconds > 0 THEN evacuation_duration_seconds END) as avg_evacuation_seconds
            FROM mock_drills
            WHERE deleted_at IS NULL
        ");

        $erpKpis = DB::selectOne("
            SELECT
                COUNT(*) as total_erps,
                SUM(status = 'Active') as active_erps
            FROM erps
            WHERE deleted_at IS NULL
        ");

        $openActions = DB::selectOne("
            SELECT COUNT(*) as open_actions
            FROM mock_drill_actions
            WHERE status IN ('Open', 'In Progress', 'Overdue')
        ");

        $byType = DB::select("
            SELECT drill_type as label, COUNT(*) as total
            FROM mock_drills
            WHERE deleted_at IS NULL AND drill_type IS NOT NULL AND drill_type != ''
            GROUP BY drill_type ORDER BY total DESC
        ");

        $byStatus = DB::select("
            SELECT status as label, COUNT(*) as total
            FROM mock_drills
            WHERE deleted_at IS NULL
            GROUP BY status ORDER BY total DESC
        ");

        $monthlyTrend = DB::select("
            SELECT
                DATE_FORMAT(planned_date, '%Y-%m') as month,
                COUNT(*) as total,
                SUM(status = 'Conducted') as conducted,
                SUM(status = 'Closed') as closed,
                SUM(status = 'Cancelled') as cancelled
            FROM mock_drills
            WHERE deleted_at IS NULL
              AND planned_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(planned_date, '%Y-%m')
            ORDER BY month
        ");

        $commonObservations = DB::select("
            SELECT category, COUNT(*) as total
            FROM mock_drill_observations
            WHERE category IS NOT NULL AND category != ''
            GROUP BY category
            ORDER BY total DESC
            LIMIT 10
        ");

        $topOpenActions = DB::select("
            SELECT
                a.id, a.mock_drill_id as drill_id, a.action_code, a.title, a.due_date, a.priority, a.status,
                a.assigned_to as assigned_to_name, d.drill_code, d.title as drill_title
            FROM mock_drill_actions a
            JOIN mock_drills d ON d.id = a.mock_drill_id
            WHERE a.status IN ('Open', 'In Progress', 'Overdue')
            ORDER BY a.due_date ASC
            LIMIT 20
        ");

        return response()->json([
            'kpis' => [
                'total_erps'              => (int) ($erpKpis->total_erps ?? 0),
                'active_erps'             => (int) ($erpKpis->active_erps ?? 0),
                'total_drills'            => (int) ($kpis->total_drills ?? 0),
                'planned'                 => (int) ($kpis->planned ?? 0),
                'scheduled'               => (int) ($kpis->scheduled ?? 0),
                'conducted'               => (int) ($kpis->conducted ?? 0),
                'closed'                  => (int) ($kpis->closed ?? 0),
                'cancelled'               => (int) ($kpis->cancelled ?? 0),
                'overdue_drills'          => (int) ($kpis->overdue_drills ?? 0),
                'open_actions'            => (int) ($openActions->open_actions ?? 0),
                'avg_response_seconds'    => round((float) ($kpis->avg_response_seconds ?? 0), 1),
                'avg_evacuation_seconds'  => round((float) ($kpis->avg_evacuation_seconds ?? 0), 1),
                'drills_this_month'       => (int) ($kpis->drills_this_month ?? 0),
            ],
            'by_type'             => array_map(fn ($r) => ['label' => $r->label, 'total' => (int) $r->total], $byType),
            'by_status'           => array_map(fn ($r) => ['label' => $r->label, 'total' => (int) $r->total], $byStatus),
            'monthly_trend'       => array_map(fn ($r) => [
                'month'     => $r->month,
                'total'     => (int) $r->total,
                'conducted' => (int) ($r->conducted ?? 0),
                'closed'    => (int) ($r->closed ?? 0),
                'cancelled' => (int) ($r->cancelled ?? 0),
            ], $monthlyTrend),
            'common_observations' => array_map(fn ($r) => ['category' => $r->category, 'total' => (int) $r->total], $commonObservations),
            'top_open_actions'    => array_map(fn ($r) => [
                'id'               => $r->id,
                'drill_id'         => $r->drill_id,
                'action_code'      => $r->action_code,
                'title'            => $r->title,
                'due_date'         => $r->due_date,
                'priority'         => $r->priority,
                'status'           => $r->status,
                'assigned_to_name' => $r->assigned_to_name,
                'drill_code'       => $r->drill_code,
                'drill_title'      => $r->drill_title,
            ], $topOpenActions),
        ]);
    }

    // ─── PLANNER ────────────────────────────────────

    public function planner(Request $request): JsonResponse
    {
        $dateFrom = $request->get('date_from', today()->toDateString());
        $dateTo = $request->get('date_to', today()->addDays(90)->toDateString());

        $upcoming = MockDrill::select([
                'id', 'drill_code', 'title', 'drill_type', 'planned_date',
                'planned_time', 'status', 'location', 'erp_id',
            ])
            ->with(['erp:id,erp_code'])
            ->whereIn('status', ['Planned', 'Scheduled'])
            ->whereDate('planned_date', '>=', $dateFrom)
            ->whereDate('planned_date', '<=', $dateTo)
            ->orderBy('planned_date')
            ->get()
            ->map(function ($drill) {
                $arr = $drill->toArray();
                $arr['erp_code'] = $drill->erp?->erp_code;
                unset($arr['erp']);
                return $arr;
            });

        $overdue = MockDrill::select([
                'id', 'drill_code', 'title', 'drill_type', 'planned_date',
                'planned_time', 'status', 'location', 'erp_id',
            ])
            ->with(['erp:id,erp_code'])
            ->overdue()
            ->orderBy('planned_date')
            ->get()
            ->map(function ($drill) {
                $arr = $drill->toArray();
                $arr['erp_code'] = $drill->erp?->erp_code;
                unset($arr['erp']);
                return $arr;
            });

        $thisMonth = MockDrill::select([
                'id', 'drill_code', 'title', 'drill_type', 'planned_date',
                'planned_time', 'status', 'location', 'erp_id',
            ])
            ->with(['erp:id,erp_code'])
            ->whereMonth('planned_date', now()->month)
            ->whereYear('planned_date', now()->year)
            ->orderBy('planned_date')
            ->get()
            ->map(function ($drill) {
                $arr = $drill->toArray();
                $arr['erp_code'] = $drill->erp?->erp_code;
                unset($arr['erp']);
                return $arr;
            });

        return response()->json([
            'upcoming'    => $upcoming,
            'overdue'     => $overdue,
            'this_month'  => $thisMonth,
        ]);
    }

    // ─── EXPORT ─────────────────────────────────────

    public function export(Request $request)
    {
        $query = MockDrill::query()->with(['erp:id,erp_code', 'evaluation']);

        // Apply same filters as index
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('drill_code', 'like', "%{$search}%")
                  ->orWhere('conducted_by', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%");
            });
        }
        if ($erpId = $request->get('erp_id')) {
            $query->where('erp_id', $erpId);
        }
        if ($drillType = $request->get('drill_type')) {
            $query->where('drill_type', $drillType);
        }
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($area = $request->get('area')) {
            $query->where('area', $area);
        }
        if ($department = $request->get('department')) {
            $query->where('department', $department);
        }
        if ($from = $request->get('date_from')) {
            $query->whereDate('planned_date', '>=', $from);
        }
        if ($to = $request->get('date_to')) {
            $query->whereDate('planned_date', '<=', $to);
        }

        if ($period = $request->get('period')) {
            match ($period) {
                'today' => $query->whereDate('planned_date', today()),
                'week'  => $query->whereBetween('planned_date', [now()->startOfWeek(), now()->endOfWeek()]),
                'month' => $query->whereMonth('planned_date', now()->month)->whereYear('planned_date', now()->year),
                'year'  => $query->whereYear('planned_date', now()->year),
                default => null,
            };
        }

        $records = $query->orderBy('planned_date', 'desc')->get();

        $headers = [
            'Code', 'Title', 'ERP', 'Type', 'Planned Date',
            'Status', 'Participants', 'Observations', 'Actions',
            'Score', 'Duration',
        ];

        $rows = $records->map(fn ($d) => [
            $d->drill_code,
            $d->title,
            $d->erp?->erp_code ?? '',
            $d->drill_type,
            $d->planned_date?->format('Y-m-d'),
            $d->status,
            $d->participant_count ?? 0,
            $d->observation_count ?? 0,
            $d->action_count ?? 0,
            $d->evaluation?->final_score ?? '',
            $d->duration_formatted ?? '',
        ])->toArray();

        return $this->exportAs($headers, $rows, 'Mock Drills', $request->get('format', 'csv'));
    }
}
