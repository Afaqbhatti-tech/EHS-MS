<?php

namespace App\Http\Controllers;

use App\Models\Violation;
use App\Models\ViolationAction;
use App\Models\ViolationEvidence;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Constants\StatusConstants;
use App\Http\Traits\ExportsData;

class ViolationController extends Controller
{
    use ExportsData;

    // ─── LIST ───────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $query = Violation::query();

        // Text search
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('violation_code', 'like', "%{$search}%")
                  ->orWhere('violator_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%")
                  ->orWhere('contractor_name', 'like', "%{$search}%")
                  ->orWhere('area', 'like', "%{$search}%")
                  ->orWhere('assigned_to_name', 'like', "%{$search}%");
            });
        }

        // Filters
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($severity = $request->get('severity')) {
            $query->where('severity', $severity);
        }
        if ($type = $request->get('violation_type')) {
            $query->where('violation_type', $type);
        }
        if ($category = $request->get('violation_category')) {
            $query->where('violation_category', $category);
        }
        if ($contractor = $request->get('contractor')) {
            $query->where('contractor_name', $contractor);
        }
        if ($location = $request->get('location')) {
            $query->where('location', $location);
        }
        if ($assignedTo = $request->get('assigned_to')) {
            $query->where('assigned_to_name', 'like', "%{$assignedTo}%");
        }
        if ($from = $request->get('date_from')) {
            $query->whereDate('violation_date', '>=', $from);
        }
        if ($to = $request->get('date_to')) {
            $query->whereDate('violation_date', '<=', $to);
        }

        // Period shortcuts
        if ($period = $request->get('period')) {
            match ($period) {
                'today' => $query->whereDate('violation_date', today()),
                'week'  => $query->whereBetween('violation_date', [now()->startOfWeek(), now()->endOfWeek()]),
                'month' => $query->whereMonth('violation_date', now()->month)->whereYear('violation_date', now()->year),
                'year'  => $query->whereYear('violation_date', now()->year),
                default => null,
            };
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortDir = $request->get('sort_dir', 'desc');
        $allowedSort = ['violation_code', 'violation_date', 'severity', 'status', 'violator_name', 'created_at'];
        if (in_array($sortBy, $allowedSort)) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderByDesc('created_at');
        }

        $perPage = min(100, max(1, (int) $request->get('per_page', 20)));
        $paginated = $query->paginate($perPage);

        $data = collect($paginated->items())->map(fn ($v) => $this->mapToFrontend($v));

        return response()->json([
            'data'      => $data,
            'total'     => $paginated->total(),
            'page'      => $paginated->currentPage(),
            'per_page'  => $paginated->perPage(),
            'last_page' => $paginated->lastPage(),
        ]);
    }

    // ─── SHOW ───────────────────────────────────────

    public function show(string $id): JsonResponse
    {
        $violation = Violation::with(['evidence', 'actions', 'logs'])->findOrFail($id);

        $data = $this->mapToFrontend($violation);
        $data['evidence'] = $violation->evidence->map(fn ($e) => [
            'id'            => $e->id,
            'related_type'  => $e->related_type,
            'related_id'    => $e->related_id,
            'file_path'     => $e->file_path,
            'original_name' => $e->original_name,
            'file_type'     => $e->file_type,
            'file_size'     => $e->file_size,
            'uploaded_by'   => $e->uploaded_by_name,
            'created_at'    => $e->created_at?->toISOString(),
        ]);
        $data['actions'] = $violation->actions->map(fn ($a) => [
            'id'               => $a->id,
            'title'            => $a->title,
            'description'      => $a->description,
            'assigned_to'      => $a->assigned_to,
            'assigned_to_name' => $a->assigned_to_name,
            'due_date'         => $a->due_date?->format('Y-m-d'),
            'priority'         => $a->priority,
            'status'           => $a->status,
            'completion_notes' => $a->completion_notes,
            'completed_at'     => $a->completed_at?->toISOString(),
            'completed_by'     => $a->completed_by_name,
            'created_at'       => $a->created_at?->toISOString(),
        ]);
        $data['logs'] = $violation->logs->map(fn ($l) => [
            'id'          => $l->id,
            'action_type' => $l->action_type,
            'description' => $l->description,
            'old_value'   => $l->old_value,
            'new_value'   => $l->new_value,
            'metadata'    => $l->metadata,
            'user_name'   => $l->user_name,
            'created_at'  => $l->created_at?->toISOString(),
        ]);

        return response()->json($data);
    }

    // ─── CREATE ─────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'violation_date'     => 'required|date',
            'violator_name'      => 'required|string|max:255',
            'violation_type'     => 'required|in:Routine,Situational,Exceptional',
            'violation_category' => 'required|string|max:100',
            'description'        => 'required|string|min:10',
            'severity'           => 'required|in:Low,Medium,High,Critical',
        ]);

        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $violation = DB::transaction(function () use ($request, $user) {
                $violation = Violation::create([
                    'id'                     => Str::uuid()->toString(),
                    'violation_date'         => $request->input('violation_date'),
                    'violation_time'         => $request->input('violation_time'),
                    'location'               => $request->input('location'),
                    'area'                   => $request->input('area'),
                    'department'             => $request->input('department'),
                    'violator_name'          => $request->input('violator_name'),
                    'employee_id'            => $request->input('employee_id'),
                    'designation'            => $request->input('designation'),
                    'contractor_name'        => $request->input('contractor_name'),
                    'violation_type'         => $request->input('violation_type'),
                    'violation_category'     => $request->input('violation_category'),
                    'description'            => $request->input('description'),
                    'violated_rule'          => $request->input('violated_rule'),
                    'hazard_description'     => $request->input('hazard_description'),
                    'severity'               => $request->input('severity'),
                    'immediate_action'       => $request->input('immediate_action'),
                    'immediate_action_notes' => $request->input('immediate_action_notes'),
                    'reported_by'            => $user->id,
                    'reported_by_name'       => $user->full_name ?? $user->email,
                    'remarks'                => $request->input('remarks'),
                    'photos'                 => $request->input('photos', []),
                    'status'                 => StatusConstants::VIOLATION_OPEN,
                ]);

                $violation->logActivity('created', 'Violation reported: ' . $violation->violation_code);

                // Handle evidence files
                if ($request->has('evidence_files')) {
                    foreach ($request->input('evidence_files', []) as $file) {
                        ViolationEvidence::create([
                            'id'               => Str::uuid()->toString(),
                            'violation_id'     => $violation->id,
                            'related_type'     => 'report',
                            'file_path'        => $file['filename'] ?? $file['file_path'] ?? '',
                            'original_name'    => $file['originalName'] ?? $file['original_name'] ?? '',
                            'file_type'        => $file['mimetype'] ?? $file['file_type'] ?? '',
                            'file_size'        => $file['size'] ?? $file['file_size'] ?? 0,
                            'uploaded_by'      => $user->id,
                            'uploaded_by_name' => $user->full_name ?? $user->email,
                        ]);
                    }
                }

                return $violation;
            });

            // Fire notifications
            NotificationService::violationReported($violation, $user->id);

            return response()->json([
                'message'   => 'Violation reported successfully',
                'violation' => $this->mapToFrontend($violation->fresh()),
            ], 201);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    // ─── UPDATE ─────────────────────────────────────

    public function update(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'violation_date'     => 'sometimes|date',
            'violator_name'      => 'sometimes|string|max:255',
            'violation_type'     => 'sometimes|in:Routine,Situational,Exceptional',
            'violation_category' => 'sometimes|string|max:100',
            'description'        => 'sometimes|string|min:10',
            'severity'           => 'sometimes|in:Low,Medium,High,Critical',
            'violation_time'     => 'nullable|string|max:10',
            'location'           => 'nullable|string|max:255',
            'area'               => 'nullable|string|max:255',
            'department'         => 'nullable|string|max:255',
            'employee_id'        => 'nullable|string|max:100',
            'designation'        => 'nullable|string|max:255',
            'contractor_name'    => 'nullable|string|max:255',
            'violated_rule'      => 'nullable|string',
            'hazard_description' => 'nullable|string',
            'immediate_action'   => 'nullable|string',
            'immediate_action_notes' => 'nullable|string',
            'remarks'            => 'nullable|string',
            'photos'             => 'nullable|array',
        ]);

        try {
            $violation = Violation::findOrFail($id);

            $fields = [];
            $map = [
                'violation_date'         => 'violation_date',
                'violation_time'         => 'violation_time',
                'location'               => 'location',
                'area'                   => 'area',
                'department'             => 'department',
                'violator_name'          => 'violator_name',
                'employee_id'            => 'employee_id',
                'designation'            => 'designation',
                'contractor_name'        => 'contractor_name',
                'violation_type'         => 'violation_type',
                'violation_category'     => 'violation_category',
                'description'            => 'description',
                'violated_rule'          => 'violated_rule',
                'hazard_description'     => 'hazard_description',
                'severity'               => 'severity',
                'immediate_action'       => 'immediate_action',
                'immediate_action_notes' => 'immediate_action_notes',
                'remarks'                => 'remarks',
                'photos'                 => 'photos',
            ];

            foreach ($map as $input => $column) {
                if ($request->has($input)) {
                    $fields[$column] = $request->input($input);
                }
            }

            if (!empty($fields)) {
                $violation->update($fields);
                $violation->logActivity('edited', 'Violation details updated');
            }

            return response()->json([
                'message'   => 'Violation updated successfully',
                'violation' => $this->mapToFrontend($violation->fresh()),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    // ─── STATUS CHANGE ──────────────────────────────

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:Open,Under Investigation,Action Assigned,In Progress,Resolved,Closed,Reopened,Escalated',
        ]);

        $violation = Violation::findOrFail($id);
        $oldStatus = $violation->status;
        $newStatus = $request->input('status');

        // Validate status transitions
        $allowedTransitions = [
            'Open'                => ['In Progress', 'Under Investigation', 'Escalated'],
            'In Progress'         => ['Under Investigation', 'Escalated'],
            'Under Investigation' => ['Resolved', 'Escalated'],
            'Resolved'            => ['Closed', 'Escalated'],
            'Action Assigned'     => ['In Progress', 'Under Investigation', 'Escalated'],
            'Escalated'           => ['Under Investigation'],
            'Closed'              => ['Reopened'],
            'Reopened'            => ['Open', 'In Progress', 'Under Investigation', 'Escalated'],
        ];

        $allowed = $allowedTransitions[$oldStatus] ?? [];
        if (!in_array($newStatus, $allowed)) {
            return response()->json([
                'message' => "Invalid status transition from '{$oldStatus}' to '{$newStatus}'.",
                'allowed' => $allowed,
            ], 422);
        }

        $fields = ['status' => $newStatus];

        if ($newStatus === StatusConstants::VIOLATION_CLOSED) {
            $user = $request->user();
            $fields['closed_by'] = $user->id;
            $fields['closed_by_name'] = $user->full_name ?? $user->email;
            $fields['closed_at'] = now();
            $fields['close_notes'] = $request->input('close_notes');
        }

        DB::transaction(function () use ($violation, $fields, $oldStatus, $newStatus, $request) {
            $violation->update($fields);
            $violation->logActivity('status_changed', "Status changed from {$oldStatus} to {$newStatus}", $oldStatus, $newStatus);
        });

        // Fire notification (outside transaction — non-critical)
        NotificationService::violationStatusChanged($violation, $newStatus, $request->user()->id);

        return response()->json([
            'message'   => 'Status updated',
            'violation' => $this->mapToFrontend($violation->fresh()),
        ]);
    }

    // ─── ASSIGN ─────────────────────────────────────

    public function assign(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'assigned_to_name' => 'required|string|max:255',
        ]);

        $violation = Violation::findOrFail($id);

        $violation->update([
            'assigned_to'      => $request->input('assigned_to_id'),
            'assigned_to_name' => $request->input('assigned_to_name'),
        ]);

        // Auto-advance status if still Open
        if ($violation->status === StatusConstants::VIOLATION_OPEN) {
            $violation->update(['status' => StatusConstants::VIOLATION_ACTION_ASSIGNED]);
            $violation->logActivity('status_changed', 'Status auto-advanced on assignment', StatusConstants::VIOLATION_OPEN, StatusConstants::VIOLATION_ACTION_ASSIGNED);
        }

        $violation->logActivity('assigned', 'Assigned to ' . $request->input('assigned_to_name'));

        return response()->json([
            'message'   => 'Violation assigned successfully',
            'violation' => $this->mapToFrontend($violation->fresh()),
        ]);
    }

    // ─── INVESTIGATION ──────────────────────────────

    public function addInvestigation(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'root_cause' => 'required|string|min:5',
        ]);

        $violation = Violation::findOrFail($id);
        $user = $request->user();

        DB::transaction(function () use ($request, $violation, $user) {
            $violation->update([
                'investigated_by'      => $user->id,
                'investigated_by_name' => $user->full_name ?? $user->email,
                'investigation_date'   => $request->input('investigation_date', now()->toDateString()),
                'root_cause'           => $request->input('root_cause'),
                'root_cause_category'  => $request->input('root_cause_category'),
                'intentional'          => $request->boolean('intentional'),
                'system_failure'       => $request->boolean('system_failure'),
                'investigation_notes'  => $request->input('investigation_notes'),
            ]);

            // Auto-advance status
            $oldStatus = $violation->status;
            if (in_array($oldStatus, [StatusConstants::VIOLATION_OPEN, StatusConstants::VIOLATION_ACTION_ASSIGNED])) {
                $violation->update(['status' => StatusConstants::VIOLATION_UNDER_INVESTIGATION]);
                $violation->logActivity('status_changed', 'Status auto-advanced on investigation', $oldStatus, StatusConstants::VIOLATION_UNDER_INVESTIGATION);
            }

            $violation->logActivity('investigation_added', 'Investigation completed — Root cause: ' . Str::limit($request->input('root_cause'), 80));

            // Handle investigation evidence
            if ($request->has('evidence_files')) {
                foreach ($request->input('evidence_files', []) as $file) {
                    ViolationEvidence::create([
                        'id'               => Str::uuid()->toString(),
                        'violation_id'     => $violation->id,
                        'related_type'     => 'investigation',
                        'file_path'        => $file['filename'] ?? $file['file_path'] ?? '',
                        'original_name'    => $file['originalName'] ?? $file['original_name'] ?? '',
                        'file_type'        => $file['mimetype'] ?? $file['file_type'] ?? '',
                        'file_size'        => $file['size'] ?? $file['file_size'] ?? 0,
                        'uploaded_by'      => $user->id,
                        'uploaded_by_name' => $user->full_name ?? $user->email,
                    ]);
                }
            }
        });

        return response()->json([
            'message'   => 'Investigation added successfully',
            'violation' => $this->mapToFrontend($violation->fresh()),
        ]);
    }

    // ─── CORRECTIVE ACTIONS ─────────────────────────

    public function addAction(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'title'    => 'required|string|max:255',
            'due_date' => 'required|date',
        ]);

        $violation = Violation::findOrFail($id);
        $user = $request->user();

        $action = ViolationAction::create([
            'id'               => Str::uuid()->toString(),
            'violation_id'     => $violation->id,
            'title'            => $request->input('title'),
            'description'      => $request->input('description'),
            'assigned_to'      => $request->input('assigned_to_id'),
            'assigned_to_name' => $request->input('assigned_to_name'),
            'due_date'         => $request->input('due_date'),
            'priority'         => $request->input('priority', 'Medium'),
            'status'           => StatusConstants::ACTION_PENDING,
            'created_by'       => $user->id,
        ]);

        // Auto-advance status
        $oldStatus = $violation->status;
        if (in_array($oldStatus, [StatusConstants::VIOLATION_OPEN, StatusConstants::VIOLATION_UNDER_INVESTIGATION])) {
            $violation->update(['status' => StatusConstants::VIOLATION_ACTION_ASSIGNED]);
            $violation->logActivity('status_changed', 'Status auto-advanced on action creation', $oldStatus, StatusConstants::VIOLATION_ACTION_ASSIGNED);
        }

        $violation->logActivity('action_added', 'Corrective action added: ' . $action->title);

        return response()->json([
            'message' => 'Corrective action added',
            'action'  => [
                'id'               => $action->id,
                'title'            => $action->title,
                'description'      => $action->description,
                'assigned_to_name' => $action->assigned_to_name,
                'due_date'         => $action->due_date?->format('Y-m-d'),
                'priority'         => $action->priority,
                'status'           => $action->status,
                'created_at'       => $action->created_at?->toISOString(),
            ],
        ], 201);
    }

    public function updateAction(Request $request, string $id, string $actionId): JsonResponse
    {
        $violation = Violation::findOrFail($id);
        $action = ViolationAction::where('violation_id', $id)->findOrFail($actionId);

        $oldStatus = $action->status;

        $fields = [];
        foreach (['title', 'description', 'assigned_to_name', 'due_date', 'priority', 'status', 'completion_notes'] as $field) {
            if ($request->has($field)) {
                $fields[$field] = $request->input($field);
            }
        }
        if ($request->has('assigned_to_id')) {
            $fields['assigned_to'] = $request->input('assigned_to_id');
        }

        // Handle completion
        if (($fields['status'] ?? null) === StatusConstants::ACTION_COMPLETED && $oldStatus !== StatusConstants::ACTION_COMPLETED) {
            $user = $request->user();
            $fields['completed_at'] = now();
            $fields['completed_by'] = $user->id;
            $fields['completed_by_name'] = $user->full_name ?? $user->email;
        }

        $action->update($fields);

        $violation->logActivity(
            'action_updated',
            "Corrective action \"{$action->title}\" updated" . (isset($fields['status']) ? " — status: {$fields['status']}" : ''),
            $oldStatus,
            $fields['status'] ?? $oldStatus
        );

        // Check if all actions are completed to auto-suggest closure
        $allCompleted = $violation->actions()->where('status', '!=', StatusConstants::ACTION_COMPLETED)->count() === 0
            && $violation->actions()->count() > 0;

        return response()->json([
            'message'        => 'Action updated',
            'action'         => [
                'id'               => $action->id,
                'title'            => $action->title,
                'description'      => $action->description,
                'assigned_to_name' => $action->assigned_to_name,
                'due_date'         => $action->due_date?->format('Y-m-d'),
                'priority'         => $action->priority,
                'status'           => $action->status,
                'completion_notes' => $action->completion_notes,
                'completed_at'     => $action->completed_at?->toISOString(),
                'completed_by'     => $action->completed_by_name,
                'created_at'       => $action->created_at?->toISOString(),
            ],
            'all_actions_completed' => $allCompleted,
        ]);
    }

    public function deleteAction(string $id, string $actionId): JsonResponse
    {
        $violation = Violation::findOrFail($id);
        $action = ViolationAction::where('violation_id', $id)->findOrFail($actionId);

        $title = $action->title;
        $action->delete();

        $violation->logActivity('action_removed', "Corrective action removed: {$title}");

        return response()->json(['message' => 'Action removed']);
    }

    // ─── FILE UPLOAD ────────────────────────────────

    public function upload(Request $request): JsonResponse
    {
        $files = $request->file('files');
        if (!$files) {
            return response()->json(['message' => 'No files provided'], 422);
        }
        if (!is_array($files)) {
            $files = [$files];
        }

        $uploaded = [];
        foreach ($files as $file) {
            if (!$file || !$file->isValid()) continue;

            $originalName = $file->getClientOriginalName();
            $size         = $file->getSize();
            $mimetype     = $file->getClientMimeType();

            $name = 'vio-' . time() . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
            $file->move(storage_path('app/public/violations'), $name);

            $uploaded[] = [
                'filename'     => 'violations/' . $name,
                'originalName' => $originalName,
                'size'         => $size,
                'mimetype'     => $mimetype,
            ];
        }

        return response()->json(['message' => 'Files uploaded', 'files' => $uploaded]);
    }

    public function uploadEvidence(Request $request, string $id): JsonResponse
    {
        $violation = Violation::findOrFail($id);
        $files = $request->file('files');
        if (!$files) {
            return response()->json(['message' => 'No files provided'], 422);
        }
        if (!is_array($files)) {
            $files = [$files];
        }

        $user = $request->user();
        $relatedType = $request->input('related_type', 'report');
        $relatedId = $request->input('related_id');
        $created = [];

        foreach ($files as $file) {
            if (!$file || !$file->isValid()) continue;

            $name = 'vio-' . time() . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
            $file->move(storage_path('app/public/violations'), $name);

            $evidence = ViolationEvidence::create([
                'id'               => Str::uuid()->toString(),
                'violation_id'     => $violation->id,
                'related_type'     => $relatedType,
                'related_id'       => $relatedId,
                'file_path'        => 'violations/' . $name,
                'original_name'    => $file->getClientOriginalName(),
                'file_type'        => $file->getClientMimeType(),
                'file_size'        => $file->getSize(),
                'uploaded_by'      => $user->id,
                'uploaded_by_name' => $user->full_name ?? $user->email,
            ]);

            $created[] = [
                'id'            => $evidence->id,
                'file_path'     => $evidence->file_path,
                'original_name' => $evidence->original_name,
                'file_type'     => $evidence->file_type,
                'file_size'     => $evidence->file_size,
            ];
        }

        $violation->logActivity('evidence_uploaded', count($created) . ' evidence file(s) uploaded (' . $relatedType . ')');

        return response()->json(['message' => 'Evidence uploaded', 'evidence' => $created]);
    }

    public function deleteEvidence(string $id, string $evidenceId): JsonResponse
    {
        $violation = Violation::findOrFail($id);
        $evidence = ViolationEvidence::where('violation_id', $id)->findOrFail($evidenceId);

        $name = $evidence->original_name;

        // Delete physical file
        $fullPath = storage_path('app/public/' . $evidence->file_path);
        if (file_exists($fullPath)) {
            unlink($fullPath);
        }

        $evidence->delete();
        $violation->logActivity('evidence_removed', "Evidence file removed: {$name}");

        return response()->json(['message' => 'Evidence removed']);
    }

    // ─── STATS ──────────────────────────────────────

    public function stats(Request $request): JsonResponse
    {
        $year = (int) $request->get('year', now()->year);

        $kpis = DB::selectOne("
            SELECT
                COUNT(*) as total,
                SUM(status = 'Open') as open_count,
                SUM(status = 'Under Investigation') as under_investigation,
                SUM(status = 'Action Assigned') as action_assigned,
                SUM(status = 'In Progress') as in_progress,
                SUM(status = 'Closed') as closed,
                SUM(status = 'Reopened') as reopened,
                SUM(status = 'Escalated') as escalated,
                SUM(severity = 'Critical') as critical,
                SUM(severity = 'High') as high_severity
            FROM violations
            WHERE deleted_at IS NULL AND YEAR(violation_date) = ?
        ", [$year]);

        $monthly = DB::select("
            SELECT
                MONTH(violation_date) as month,
                COUNT(*) as total,
                SUM(status = 'Open') as open_count,
                SUM(status = 'Closed') as closed,
                SUM(severity = 'High' OR severity = 'Critical') as high_severity
            FROM violations
            WHERE YEAR(violation_date) = ? AND deleted_at IS NULL
            GROUP BY MONTH(violation_date)
            ORDER BY month
        ", [$year]);

        $byType = DB::select("
            SELECT violation_type as label, COUNT(*) as total
            FROM violations
            WHERE YEAR(violation_date) = ? AND deleted_at IS NULL
            GROUP BY violation_type ORDER BY total DESC
        ", [$year]);

        $byCategory = DB::select("
            SELECT violation_category as label, COUNT(*) as total
            FROM violations
            WHERE YEAR(violation_date) = ? AND deleted_at IS NULL AND violation_category IS NOT NULL
            GROUP BY violation_category ORDER BY total DESC
        ", [$year]);

        $bySeverity = DB::select("
            SELECT severity as label, COUNT(*) as total
            FROM violations
            WHERE YEAR(violation_date) = ? AND deleted_at IS NULL
            GROUP BY severity ORDER BY total DESC
        ", [$year]);

        $byLocation = DB::select("
            SELECT location as label, COUNT(*) as total
            FROM violations
            WHERE YEAR(violation_date) = ? AND deleted_at IS NULL AND location IS NOT NULL AND location != ''
            GROUP BY location ORDER BY total DESC LIMIT 10
        ", [$year]);

        $byContractor = DB::select("
            SELECT contractor_name as label, COUNT(*) as total
            FROM violations
            WHERE YEAR(violation_date) = ? AND deleted_at IS NULL AND contractor_name IS NOT NULL AND contractor_name != ''
            GROUP BY contractor_name ORDER BY total DESC
        ", [$year]);

        $byRootCause = DB::select("
            SELECT root_cause_category as label, COUNT(*) as total
            FROM violations
            WHERE YEAR(violation_date) = ? AND deleted_at IS NULL AND root_cause_category IS NOT NULL AND root_cause_category != ''
            GROUP BY root_cause_category ORDER BY total DESC
        ", [$year]);

        // Repeat violators
        $repeatViolators = DB::select("
            SELECT violator_name, contractor_name, COUNT(*) as total
            FROM violations
            WHERE YEAR(violation_date) = ? AND deleted_at IS NULL
            GROUP BY violator_name, contractor_name
            HAVING total > 1
            ORDER BY total DESC LIMIT 10
        ", [$year]);

        return response()->json([
            'kpis' => [
                'total'               => (int) ($kpis->total ?? 0),
                'open'                => (int) ($kpis->open_count ?? 0),
                'under_investigation' => (int) ($kpis->under_investigation ?? 0),
                'action_assigned'     => (int) ($kpis->action_assigned ?? 0),
                'in_progress'         => (int) ($kpis->in_progress ?? 0),
                'closed'              => (int) ($kpis->closed ?? 0),
                'reopened'            => (int) ($kpis->reopened ?? 0),
                'escalated'           => (int) ($kpis->escalated ?? 0),
                'critical'            => (int) ($kpis->critical ?? 0),
                'high_severity'       => (int) ($kpis->high_severity ?? 0),
            ],
            'monthly'         => array_map(fn ($r) => [
                'month'         => (int) $r->month,
                'total'         => (int) $r->total,
                'open'          => (int) ($r->open_count ?? 0),
                'closed'        => (int) ($r->closed ?? 0),
                'high_severity' => (int) ($r->high_severity ?? 0),
            ], $monthly),
            'byType'          => $this->mapLabelTotal($byType),
            'byCategory'      => $this->mapLabelTotal($byCategory),
            'bySeverity'      => $this->mapLabelTotal($bySeverity),
            'byLocation'      => $this->mapLabelTotal($byLocation),
            'byContractor'    => $this->mapLabelTotal($byContractor),
            'byRootCause'     => $this->mapLabelTotal($byRootCause),
            'repeatViolators' => array_map(fn ($r) => [
                'violator_name'   => $r->violator_name,
                'contractor_name' => $r->contractor_name,
                'total'           => (int) $r->total,
            ], $repeatViolators),
        ]);
    }

    // ─── FILTER OPTIONS ─────────────────────────────

    public function filterOptions(): JsonResponse
    {
        // Merge contractors from violations, observations, permits, mockups, and users
        $contractors = collect()
            ->merge(Violation::distinct()->whereNotNull('contractor_name')->where('contractor_name', '!=', '')->pluck('contractor_name'))
            ->merge(DB::table('observations')->distinct()->whereNotNull('contractor')->where('contractor', '!=', '')->pluck('contractor'))
            ->merge(DB::table('permits')->distinct()->whereNotNull('contractor')->where('contractor', '!=', '')->pluck('contractor'))
            ->merge(DB::table('mockups')->distinct()->whereNull('deleted_at')->whereNotNull('contractor')->where('contractor', '!=', '')->pluck('contractor'))
            ->merge(DB::table('users')->distinct()->whereNotNull('contractor')->where('contractor', '!=', '')->pluck('contractor'))
            ->unique()
            ->sort()
            ->values();

        return response()->json([
            'categories'  => Violation::distinct()->whereNotNull('violation_category')->where('violation_category', '!=', '')->pluck('violation_category'),
            'types'       => Violation::distinct()->whereNotNull('violation_type')->where('violation_type', '!=', '')->pluck('violation_type'),
            'locations'   => Violation::distinct()->whereNotNull('location')->where('location', '!=', '')->pluck('location'),
            'contractors' => $contractors,
            'severities'  => ['Low', 'Medium', 'High', 'Critical'],
            'statuses'    => ['Open', 'Under Investigation', 'Action Assigned', 'In Progress', 'Closed', 'Reopened', 'Escalated'],
        ]);
    }

    // ─── EXPORT ─────────────────────────────────────

    public function export(Request $request)
    {
        $query = Violation::query();

        // Text search
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('violation_code', 'like', "%{$search}%")
                  ->orWhere('violator_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%")
                  ->orWhere('contractor_name', 'like', "%{$search}%")
                  ->orWhere('area', 'like', "%{$search}%")
                  ->orWhere('assigned_to_name', 'like', "%{$search}%");
            });
        }

        // Filters
        if ($status = $request->get('status')) $query->where('status', $status);
        if ($severity = $request->get('severity')) $query->where('severity', $severity);
        if ($type = $request->get('violation_type')) $query->where('violation_type', $type);
        if ($category = $request->get('violation_category')) $query->where('violation_category', $category);
        if ($contractor = $request->get('contractor')) $query->where('contractor_name', $contractor);
        if ($location = $request->get('location')) $query->where('location', $location);
        if ($assignedTo = $request->get('assigned_to')) $query->where('assigned_to_name', 'like', "%{$assignedTo}%");
        if ($from = $request->get('date_from')) $query->whereDate('violation_date', '>=', $from);
        if ($to = $request->get('date_to')) $query->whereDate('violation_date', '<=', $to);

        // Period shortcuts
        if ($period = $request->get('period')) {
            match ($period) {
                'today' => $query->whereDate('violation_date', today()),
                'week'  => $query->whereBetween('violation_date', [now()->startOfWeek(), now()->endOfWeek()]),
                'month' => $query->whereMonth('violation_date', now()->month)->whereYear('violation_date', now()->year),
                'year'  => $query->whereYear('violation_date', now()->year),
                default => null,
            };
        }

        $records = $query->orderBy('violation_date', 'desc')->get();

        $headers = [
            'Violation ID', 'Date', 'Time', 'Location', 'Area',
            'Violator Name', 'Employee ID', 'Contractor',
            'Type', 'Category', 'Severity', 'Description',
            'Violated Rule', 'Hazard', 'Immediate Action',
            'Status', 'Assigned To', 'Root Cause', 'Root Cause Category',
            'Investigation Notes', 'Remarks',
        ];

        $rows = $records->map(fn ($v) => [
            $v->violation_code,
            $v->violation_date?->format('Y-m-d'),
            $v->violation_time,
            $v->location,
            $v->area,
            $v->violator_name,
            $v->employee_id,
            $v->contractor_name,
            $v->violation_type,
            $v->violation_category,
            $v->severity,
            $v->description,
            $v->violated_rule,
            $v->hazard_description,
            $v->immediate_action,
            $v->status,
            $v->assigned_to_name,
            $v->root_cause,
            $v->root_cause_category,
            $v->investigation_notes,
            $v->remarks,
        ])->toArray();

        return $this->exportAs($headers, $rows, 'Violations', $request->get('format', 'csv'));
    }

    // ─── DELETE ──────────────────────────────────────

    public function destroy(string $id): JsonResponse
    {
        try {
            $violation = Violation::findOrFail($id);
            $violation->deleted_by = Auth::user()?->full_name ?? 'System';
            $violation->save();
            $violation->delete();
            RecycleBinController::logDeleteAction('violation', $violation);

            return response()->json(['message' => 'Violation deleted']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    // ─── PRIVATE HELPERS ────────────────────────────

    private function mapToFrontend(Violation $v): array
    {
        return [
            'id'                     => $v->id,
            'violation_code'         => $v->violation_code,
            'violation_date'         => $v->violation_date?->format('Y-m-d'),
            'violation_time'         => $v->violation_time,
            'location'               => $v->location,
            'area'                   => $v->area,
            'department'             => $v->department,
            'violator_name'          => $v->violator_name,
            'employee_id'            => $v->employee_id,
            'designation'            => $v->designation,
            'contractor_name'        => $v->contractor_name,
            'violation_type'         => $v->violation_type,
            'violation_category'     => $v->violation_category,
            'description'            => $v->description,
            'violated_rule'          => $v->violated_rule,
            'hazard_description'     => $v->hazard_description,
            'severity'               => $v->severity,
            'immediate_action'       => $v->immediate_action,
            'immediate_action_notes' => $v->immediate_action_notes,
            'reported_by'            => $v->reported_by,
            'reported_by_name'       => $v->reported_by_name,
            'assigned_to'            => $v->assigned_to,
            'assigned_to_name'       => $v->assigned_to_name,
            'investigated_by'        => $v->investigated_by,
            'investigated_by_name'   => $v->investigated_by_name,
            'investigation_date'     => $v->investigation_date?->format('Y-m-d'),
            'root_cause'             => $v->root_cause,
            'root_cause_category'    => $v->root_cause_category,
            'intentional'            => $v->intentional,
            'system_failure'         => $v->system_failure,
            'investigation_notes'    => $v->investigation_notes,
            'status'                 => $v->status,
            'closed_by_name'         => $v->closed_by_name,
            'closed_at'              => $v->closed_at?->toISOString(),
            'close_notes'            => $v->close_notes,
            'remarks'                => $v->remarks,
            'photos'                 => $v->photos ?? [],
            'created_at'             => $v->created_at?->toISOString(),
            'updated_at'             => $v->updated_at?->toISOString(),
        ];
    }

    private function mapLabelTotal(array $items): array
    {
        return array_map(fn ($r) => ['label' => $r->label ?? 'Unknown', 'total' => (int) $r->total], $items);
    }
}
