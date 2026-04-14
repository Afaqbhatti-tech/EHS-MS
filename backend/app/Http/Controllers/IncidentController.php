<?php

namespace App\Http\Controllers;

use App\Models\Incident;
use App\Models\IncidentAction;
use App\Models\IncidentEvidence;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Constants\StatusConstants;
use App\Http\Traits\ExportsData;

class IncidentController extends Controller
{
    use ExportsData;

    // ─── LIST ───────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $query = Incident::query();

        // Text search
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('incident_code', 'like', "%{$search}%")
                  ->orWhere('affected_person_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%")
                  ->orWhere('contractor_name', 'like', "%{$search}%")
                  ->orWhere('area', 'like', "%{$search}%")
                  ->orWhere('assigned_to_name', 'like', "%{$search}%")
                  ->orWhere('supervisor_name', 'like', "%{$search}%");
            });
        }

        // Filters
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($severity = $request->get('severity')) {
            $query->where('severity', $severity);
        }
        if ($type = $request->get('incident_type')) {
            $query->where('incident_type', $type);
        }
        if ($category = $request->get('incident_category')) {
            $query->where('incident_category', $category);
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
            $query->whereDate('incident_date', '>=', $from);
        }
        if ($to = $request->get('date_to')) {
            $query->whereDate('incident_date', '<=', $to);
        }
        if ($request->get('lost_time_injury') === 'true') {
            $query->where('lost_time_injury', true);
        }
        if ($request->get('near_miss') === 'true') {
            $query->where('incident_type', 'Near Miss');
        }

        // Period shortcuts
        if ($period = $request->get('period')) {
            match ($period) {
                'today' => $query->whereDate('incident_date', today()),
                'week'  => $query->whereBetween('incident_date', [now()->startOfWeek(), now()->endOfWeek()]),
                'month' => $query->whereMonth('incident_date', now()->month)->whereYear('incident_date', now()->year),
                'year'  => $query->whereYear('incident_date', now()->year),
                default => null,
            };
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortDir = $request->get('sort_dir', 'desc');
        $allowedSort = ['incident_code', 'incident_date', 'severity', 'status', 'affected_person_name', 'incident_type', 'created_at'];
        if (in_array($sortBy, $allowedSort)) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderByDesc('created_at');
        }

        $perPage = min(100, max(1, (int) $request->get('per_page', 20)));
        $paginated = $query->paginate($perPage);

        $data = collect($paginated->items())->map(fn ($i) => $this->mapToFrontend($i));

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
        $incident = Incident::with(['evidence', 'actions', 'logs'])->findOrFail($id);

        $data = $this->mapToFrontend($incident);
        $data['evidence'] = $incident->evidence->map(fn ($e) => [
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
        $data['actions'] = $incident->actions->map(fn ($a) => [
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
        $data['logs'] = $incident->logs->map(fn ($l) => [
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
            'incident_date' => 'required|date',
            'incident_type' => 'required|string|max:100',
            'description'   => 'required|string|min:10',
            'severity'      => 'required|in:Low,Medium,High,Critical',
        ]);

        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $incident = DB::transaction(function () use ($request, $user) {
                $incident = Incident::create([
                    'id'                         => Str::uuid()->toString(),
                    'incident_date'              => $request->input('incident_date'),
                    'incident_time'              => $request->input('incident_time'),
                    'location'                   => $request->input('location'),
                    'area'                       => $request->input('area'),
                    'department'                 => $request->input('department'),
                    'incident_type'              => $request->input('incident_type'),
                    'incident_category'          => $request->input('incident_category'),
                    'description'                => $request->input('description'),
                    'immediate_action'           => $request->input('immediate_action'),
                    'severity'                   => $request->input('severity'),
                    'affected_person_name'       => $request->input('affected_person_name'),
                    'employee_id'                => $request->input('employee_id'),
                    'designation'                => $request->input('designation'),
                    'contractor_name'            => $request->input('contractor_name'),
                    'contact_number'             => $request->input('contact_number'),
                    'supervisor_name'            => $request->input('supervisor_name'),
                    'injury_type'                => $request->input('injury_type'),
                    'body_part_affected'         => $request->input('body_part_affected'),
                    'medical_treatment_required' => $request->boolean('medical_treatment_required'),
                    'lost_time_injury'           => $request->boolean('lost_time_injury'),
                    'hospitalization'            => $request->boolean('hospitalization'),
                    'property_damage'            => $request->boolean('property_damage'),
                    'equipment_damage'           => $request->boolean('equipment_damage'),
                    'environmental_impact'       => $request->boolean('environmental_impact'),
                    'financial_loss'             => $request->input('financial_loss'),
                    'incident_outcome_summary'   => $request->input('incident_outcome_summary'),
                    'reported_by'                => $user->id,
                    'reported_by_name'           => $user->full_name ?? $user->email,
                    'remarks'                    => $request->input('remarks'),
                    'photos'                     => $request->input('photos', []),
                    'status'                     => StatusConstants::INCIDENT_REPORTED,
                ]);

                $incident->logActivity('created', 'Incident reported: ' . $incident->incident_code);

                // Handle evidence files
                if ($request->has('evidence_files')) {
                    foreach ($request->input('evidence_files', []) as $file) {
                        IncidentEvidence::create([
                            'id'               => Str::uuid()->toString(),
                            'incident_id'      => $incident->id,
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

                return $incident;
            });

            // Fire notifications
            NotificationService::incidentReported($incident, $user->id);

            return response()->json([
                'message'  => 'Incident reported successfully',
                'incident' => $this->mapToFrontend($incident->fresh()),
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
            'incident_date'              => 'sometimes|date',
            'incident_type'              => 'sometimes|string|max:100',
            'description'                => 'sometimes|string|min:10',
            'severity'                   => 'sometimes|in:Low,Medium,High,Critical',
            'incident_time'              => 'nullable|string|max:10',
            'location'                   => 'nullable|string|max:255',
            'area'                       => 'nullable|string|max:255',
            'department'                 => 'nullable|string|max:255',
            'incident_category'          => 'nullable|string|max:100',
            'immediate_action'           => 'nullable|string',
            'affected_person_name'       => 'nullable|string|max:255',
            'employee_id'                => 'nullable|string|max:100',
            'designation'                => 'nullable|string|max:255',
            'contractor_name'            => 'nullable|string|max:255',
            'contact_number'             => 'nullable|string|max:50',
            'supervisor_name'            => 'nullable|string|max:255',
            'injury_type'                => 'nullable|string|max:255',
            'body_part_affected'         => 'nullable|string|max:255',
            'medical_treatment_required' => 'nullable|boolean',
            'lost_time_injury'           => 'nullable|boolean',
            'hospitalization'            => 'nullable|boolean',
            'property_damage'            => 'nullable|boolean',
            'equipment_damage'           => 'nullable|boolean',
            'environmental_impact'       => 'nullable|boolean',
            'financial_loss'             => 'nullable|numeric|min:0',
            'incident_outcome_summary'   => 'nullable|string',
            'remarks'                    => 'nullable|string',
            'photos'                     => 'nullable|array',
        ]);

        try {
            $incident = Incident::findOrFail($id);

            $fields = [];
            $map = [
                'incident_date', 'incident_time', 'location', 'area', 'department',
                'incident_type', 'incident_category', 'description', 'immediate_action',
                'severity',
                'affected_person_name', 'employee_id', 'designation', 'contractor_name',
                'contact_number', 'supervisor_name',
                'injury_type', 'body_part_affected',
                'incident_outcome_summary', 'financial_loss',
                'remarks', 'photos',
            ];

            foreach ($map as $column) {
                if ($request->has($column)) {
                    $fields[$column] = $request->input($column);
                }
            }

            // Boolean fields
            $booleans = [
                'medical_treatment_required', 'lost_time_injury', 'hospitalization',
                'property_damage', 'equipment_damage', 'environmental_impact',
            ];
            foreach ($booleans as $bool) {
                if ($request->has($bool)) {
                    $fields[$bool] = $request->boolean($bool);
                }
            }

            if (!empty($fields)) {
                $incident->update($fields);
                $incident->logActivity('edited', 'Incident details updated');
            }

            return response()->json([
                'message'  => 'Incident updated successfully',
                'incident' => $this->mapToFrontend($incident->fresh()),
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
            'status' => 'required|in:Reported,Under Investigation,Action Assigned,In Progress,Resolved,Closed,Reopened,Escalated',
        ]);

        $incident = Incident::findOrFail($id);
        $oldStatus = $incident->status;
        $newStatus = $request->input('status');

        // Validate status transitions
        $allowedTransitions = [
            'Reported'            => ['In Progress', 'Under Investigation', 'Escalated'],
            'In Progress'         => ['Under Investigation', 'Escalated'],
            'Under Investigation' => ['Resolved', 'Escalated'],
            'Resolved'            => ['Closed', 'Escalated'],
            'Action Assigned'     => ['In Progress', 'Under Investigation', 'Escalated'],
            'Escalated'           => ['Under Investigation'],
            'Closed'              => ['Reopened'],
            'Reopened'            => ['Reported', 'In Progress', 'Under Investigation', 'Escalated'],
        ];

        $allowed = $allowedTransitions[$oldStatus] ?? [];
        if (!in_array($newStatus, $allowed)) {
            return response()->json([
                'message' => "Invalid status transition from '{$oldStatus}' to '{$newStatus}'.",
                'allowed' => $allowed,
            ], 422);
        }

        $fields = ['status' => $newStatus];

        if ($newStatus === StatusConstants::INCIDENT_CLOSED) {
            $user = $request->user();
            $fields['closed_by'] = $user->id;
            $fields['closed_by_name'] = $user->full_name ?? $user->email;
            $fields['closed_at'] = now();
            $fields['close_notes'] = $request->input('close_notes');
        }

        DB::transaction(function () use ($incident, $fields, $oldStatus, $newStatus) {
            $incident->update($fields);
            $incident->logActivity('status_changed', "Status changed from {$oldStatus} to {$newStatus}", $oldStatus, $newStatus);
        });

        // Fire notification (outside transaction — non-critical)
        NotificationService::incidentStatusChanged($incident, $newStatus, $request->user()->id);

        return response()->json([
            'message'  => 'Status updated',
            'incident' => $this->mapToFrontend($incident->fresh()),
        ]);
    }

    // ─── ASSIGN ─────────────────────────────────────

    public function assign(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'assigned_to_name' => 'required|string|max:255',
        ]);

        $incident = Incident::findOrFail($id);

        $incident->update([
            'assigned_to'      => $request->input('assigned_to_id'),
            'assigned_to_name' => $request->input('assigned_to_name'),
        ]);

        // Auto-advance status if still Reported
        if ($incident->status === StatusConstants::INCIDENT_REPORTED) {
            $incident->update(['status' => StatusConstants::INCIDENT_ACTION_ASSIGNED]);
            $incident->logActivity('status_changed', 'Status auto-advanced on assignment', StatusConstants::INCIDENT_REPORTED, StatusConstants::INCIDENT_ACTION_ASSIGNED);
        }

        $incident->logActivity('assigned', 'Assigned to ' . $request->input('assigned_to_name'));

        return response()->json([
            'message'  => 'Incident assigned successfully',
            'incident' => $this->mapToFrontend($incident->fresh()),
        ]);
    }

    // ─── INVESTIGATION ──────────────────────────────

    public function addInvestigation(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'root_cause' => 'required|string|min:5',
        ]);

        $incident = Incident::findOrFail($id);
        $user = $request->user();

        $incident->update([
            'investigated_by'      => $user->id,
            'investigated_by_name' => $user->full_name ?? $user->email,
            'investigation_date'   => $request->input('investigation_date', now()->toDateString()),
            'immediate_cause'      => $request->input('immediate_cause'),
            'root_cause'           => $request->input('root_cause'),
            'root_cause_category'  => $request->input('root_cause_category'),
            'ppe_used'             => $request->has('ppe_used') ? $request->boolean('ppe_used') : null,
            'procedure_followed'   => $request->has('procedure_followed') ? $request->boolean('procedure_followed') : null,
            'supervision_adequate' => $request->has('supervision_adequate') ? $request->boolean('supervision_adequate') : null,
            'training_adequate'    => $request->has('training_adequate') ? $request->boolean('training_adequate') : null,
            'witness_details'      => $request->input('witness_details'),
            'investigation_notes'  => $request->input('investigation_notes'),
        ]);

        // Auto-advance status
        $oldStatus = $incident->status;
        if (in_array($oldStatus, [StatusConstants::INCIDENT_REPORTED, StatusConstants::INCIDENT_ACTION_ASSIGNED])) {
            $incident->update(['status' => StatusConstants::INCIDENT_UNDER_INVESTIGATION]);
            $incident->logActivity('status_changed', 'Status auto-advanced on investigation', $oldStatus, StatusConstants::INCIDENT_UNDER_INVESTIGATION);
        }

        $incident->logActivity('investigation_added', 'Investigation completed — Root cause: ' . Str::limit($request->input('root_cause'), 80));

        // Handle investigation evidence
        if ($request->has('evidence_files')) {
            foreach ($request->input('evidence_files', []) as $file) {
                IncidentEvidence::create([
                    'id'               => Str::uuid()->toString(),
                    'incident_id'      => $incident->id,
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

        return response()->json([
            'message'  => 'Investigation added successfully',
            'incident' => $this->mapToFrontend($incident->fresh()),
        ]);
    }

    // ─── CORRECTIVE ACTIONS ─────────────────────────

    public function addAction(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'title'    => 'required|string|max:255',
            'due_date' => 'required|date',
        ]);

        $incident = Incident::findOrFail($id);
        $user = $request->user();

        $action = IncidentAction::create([
            'id'               => Str::uuid()->toString(),
            'incident_id'      => $incident->id,
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
        $oldStatus = $incident->status;
        if (in_array($oldStatus, [StatusConstants::INCIDENT_REPORTED, StatusConstants::INCIDENT_UNDER_INVESTIGATION])) {
            $incident->update(['status' => StatusConstants::INCIDENT_ACTION_ASSIGNED]);
            $incident->logActivity('status_changed', 'Status auto-advanced on action creation', $oldStatus, StatusConstants::INCIDENT_ACTION_ASSIGNED);
        }

        $incident->logActivity('action_added', 'Corrective action added: ' . $action->title);

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
        $incident = Incident::findOrFail($id);
        $action = IncidentAction::where('incident_id', $id)->findOrFail($actionId);

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

        $incident->logActivity(
            'action_updated',
            "Corrective action \"{$action->title}\" updated" . (isset($fields['status']) ? " — status: {$fields['status']}" : ''),
            $oldStatus,
            $fields['status'] ?? $oldStatus
        );

        // Check if all actions are completed
        $allCompleted = $incident->actions()->where('status', '!=', StatusConstants::ACTION_COMPLETED)->count() === 0
            && $incident->actions()->count() > 0;

        return response()->json([
            'message'              => 'Action updated',
            'action'               => [
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
        $incident = Incident::findOrFail($id);
        $action = IncidentAction::where('incident_id', $id)->findOrFail($actionId);

        $title = $action->title;
        $action->delete();

        $incident->logActivity('action_removed', "Corrective action removed: {$title}");

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

            // Capture metadata before move() — temp file is deleted after move
            $originalName = $file->getClientOriginalName();
            $size         = $file->getSize();
            $mimetype     = $file->getClientMimeType();

            $name = 'inc-' . time() . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
            $file->move(storage_path('app/public/incidents'), $name);

            $uploaded[] = [
                'filename'     => 'incidents/' . $name,
                'originalName' => $originalName,
                'size'         => $size,
                'mimetype'     => $mimetype,
            ];
        }

        return response()->json(['message' => 'Files uploaded', 'files' => $uploaded]);
    }

    public function uploadEvidence(Request $request, string $id): JsonResponse
    {
        $incident = Incident::findOrFail($id);
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

            // Capture metadata before move() — temp file is deleted after move
            $originalName = $file->getClientOriginalName();
            $fileSize     = $file->getSize();
            $mimeType     = $file->getClientMimeType();

            $name = 'inc-' . time() . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
            $file->move(storage_path('app/public/incidents'), $name);

            $evidence = IncidentEvidence::create([
                'id'               => Str::uuid()->toString(),
                'incident_id'      => $incident->id,
                'related_type'     => $relatedType,
                'related_id'       => $relatedId,
                'file_path'        => 'incidents/' . $name,
                'original_name'    => $originalName,
                'file_type'        => $mimeType,
                'file_size'        => $fileSize,
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

        $incident->logActivity('evidence_uploaded', count($created) . ' evidence file(s) uploaded (' . $relatedType . ')');

        return response()->json(['message' => 'Evidence uploaded', 'evidence' => $created]);
    }

    public function deleteEvidence(string $id, string $evidenceId): JsonResponse
    {
        $incident = Incident::findOrFail($id);
        $evidence = IncidentEvidence::where('incident_id', $id)->findOrFail($evidenceId);

        $name = $evidence->original_name;

        // Delete physical file
        $fullPath = storage_path('app/public/' . $evidence->file_path);
        if (file_exists($fullPath)) {
            unlink($fullPath);
        }

        $evidence->delete();
        $incident->logActivity('evidence_removed', "Evidence file removed: {$name}");

        return response()->json(['message' => 'Evidence removed']);
    }

    // ─── STATS ──────────────────────────────────────

    public function stats(Request $request): JsonResponse
    {
        $year = (int) $request->get('year', now()->year);

        $kpis = DB::selectOne("
            SELECT
                COUNT(*) as total,
                SUM(status = 'Reported') as reported,
                SUM(status = 'Under Investigation') as under_investigation,
                SUM(status = 'Action Assigned') as action_assigned,
                SUM(status = 'In Progress') as in_progress,
                SUM(status = 'Closed') as closed,
                SUM(status = 'Reopened') as reopened,
                SUM(status = 'Escalated') as escalated,
                SUM(severity = 'Critical') as critical,
                SUM(severity = 'High') as high_severity,
                SUM(incident_type = 'Near Miss') as near_misses,
                SUM(lost_time_injury = 1) as lost_time_incidents,
                SUM(medical_treatment_required = 1) as medical_treatment,
                SUM(hospitalization = 1) as hospitalizations,
                SUM(property_damage = 1) as property_damage_count,
                SUM(environmental_impact = 1) as environmental_count
            FROM incidents
            WHERE deleted_at IS NULL AND YEAR(incident_date) = ?
        ", [$year]);

        $monthly = DB::select("
            SELECT
                MONTH(incident_date) as month,
                COUNT(*) as total,
                SUM(status != 'Closed') as open_count,
                SUM(status = 'Closed') as closed,
                SUM(severity = 'High' OR severity = 'Critical') as high_severity,
                SUM(incident_type = 'Near Miss') as near_misses,
                SUM(lost_time_injury = 1) as lti
            FROM incidents
            WHERE YEAR(incident_date) = ? AND deleted_at IS NULL
            GROUP BY MONTH(incident_date)
            ORDER BY month
        ", [$year]);

        $byType = DB::select("
            SELECT incident_type as label, COUNT(*) as total
            FROM incidents
            WHERE YEAR(incident_date) = ? AND deleted_at IS NULL
            GROUP BY incident_type ORDER BY total DESC
        ", [$year]);

        $byCategory = DB::select("
            SELECT incident_category as label, COUNT(*) as total
            FROM incidents
            WHERE YEAR(incident_date) = ? AND deleted_at IS NULL AND incident_category IS NOT NULL AND incident_category != ''
            GROUP BY incident_category ORDER BY total DESC
        ", [$year]);

        $bySeverity = DB::select("
            SELECT severity as label, COUNT(*) as total
            FROM incidents
            WHERE YEAR(incident_date) = ? AND deleted_at IS NULL
            GROUP BY severity ORDER BY total DESC
        ", [$year]);

        $byLocation = DB::select("
            SELECT location as label, COUNT(*) as total
            FROM incidents
            WHERE YEAR(incident_date) = ? AND deleted_at IS NULL AND location IS NOT NULL AND location != ''
            GROUP BY location ORDER BY total DESC LIMIT 10
        ", [$year]);

        $byContractor = DB::select("
            SELECT contractor_name as label, COUNT(*) as total
            FROM incidents
            WHERE YEAR(incident_date) = ? AND deleted_at IS NULL AND contractor_name IS NOT NULL AND contractor_name != ''
            GROUP BY contractor_name ORDER BY total DESC
        ", [$year]);

        $byRootCause = DB::select("
            SELECT root_cause_category as label, COUNT(*) as total
            FROM incidents
            WHERE YEAR(incident_date) = ? AND deleted_at IS NULL AND root_cause_category IS NOT NULL AND root_cause_category != ''
            GROUP BY root_cause_category ORDER BY total DESC
        ", [$year]);

        $byInjuryType = DB::select("
            SELECT injury_type as label, COUNT(*) as total
            FROM incidents
            WHERE YEAR(incident_date) = ? AND deleted_at IS NULL AND injury_type IS NOT NULL AND injury_type != ''
            GROUP BY injury_type ORDER BY total DESC
        ", [$year]);

        $byBodyPart = DB::select("
            SELECT body_part_affected as label, COUNT(*) as total
            FROM incidents
            WHERE YEAR(incident_date) = ? AND deleted_at IS NULL AND body_part_affected IS NOT NULL AND body_part_affected != ''
            GROUP BY body_part_affected ORDER BY total DESC
        ", [$year]);

        return response()->json([
            'kpis' => [
                'total'               => (int) ($kpis->total ?? 0),
                'reported'            => (int) ($kpis->reported ?? 0),
                'under_investigation' => (int) ($kpis->under_investigation ?? 0),
                'action_assigned'     => (int) ($kpis->action_assigned ?? 0),
                'in_progress'         => (int) ($kpis->in_progress ?? 0),
                'closed'              => (int) ($kpis->closed ?? 0),
                'reopened'            => (int) ($kpis->reopened ?? 0),
                'escalated'           => (int) ($kpis->escalated ?? 0),
                'critical'            => (int) ($kpis->critical ?? 0),
                'high_severity'       => (int) ($kpis->high_severity ?? 0),
                'near_misses'         => (int) ($kpis->near_misses ?? 0),
                'lost_time_incidents' => (int) ($kpis->lost_time_incidents ?? 0),
                'medical_treatment'   => (int) ($kpis->medical_treatment ?? 0),
                'hospitalizations'    => (int) ($kpis->hospitalizations ?? 0),
                'property_damage'     => (int) ($kpis->property_damage_count ?? 0),
                'environmental'       => (int) ($kpis->environmental_count ?? 0),
            ],
            'monthly'      => array_map(fn ($r) => [
                'month'         => (int) $r->month,
                'total'         => (int) $r->total,
                'open'          => (int) ($r->open_count ?? 0),
                'closed'        => (int) ($r->closed ?? 0),
                'high_severity' => (int) ($r->high_severity ?? 0),
                'near_misses'   => (int) ($r->near_misses ?? 0),
                'lti'           => (int) ($r->lti ?? 0),
            ], $monthly),
            'byType'       => $this->mapLabelTotal($byType),
            'byCategory'   => $this->mapLabelTotal($byCategory),
            'bySeverity'   => $this->mapLabelTotal($bySeverity),
            'byLocation'   => $this->mapLabelTotal($byLocation),
            'byContractor' => $this->mapLabelTotal($byContractor),
            'byRootCause'  => $this->mapLabelTotal($byRootCause),
            'byInjuryType' => $this->mapLabelTotal($byInjuryType),
            'byBodyPart'   => $this->mapLabelTotal($byBodyPart),
        ]);
    }

    // ─── FILTER OPTIONS ─────────────────────────────

    public function filterOptions(): JsonResponse
    {
        return response()->json([
            'categories'  => Incident::distinct()->whereNotNull('incident_category')->where('incident_category', '!=', '')->pluck('incident_category'),
            'types'       => Incident::distinct()->whereNotNull('incident_type')->where('incident_type', '!=', '')->pluck('incident_type'),
            'locations'   => Incident::distinct()->whereNotNull('location')->where('location', '!=', '')->pluck('location'),
            'contractors' => Incident::distinct()->whereNotNull('contractor_name')->where('contractor_name', '!=', '')->pluck('contractor_name'),
            'severities'  => ['Low', 'Medium', 'High', 'Critical'],
            'statuses'    => ['Reported', 'Under Investigation', 'Action Assigned', 'In Progress', 'Closed', 'Reopened', 'Escalated'],
        ]);
    }

    // ─── EXPORT ─────────────────────────────────────

    public function export(Request $request)
    {
        $query = Incident::query();

        // Text search
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('incident_code', 'like', "%{$search}%")
                  ->orWhere('affected_person_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%")
                  ->orWhere('contractor_name', 'like', "%{$search}%")
                  ->orWhere('area', 'like', "%{$search}%")
                  ->orWhere('assigned_to_name', 'like', "%{$search}%")
                  ->orWhere('supervisor_name', 'like', "%{$search}%");
            });
        }

        // Filters
        if ($status = $request->get('status')) $query->where('status', $status);
        if ($severity = $request->get('severity')) $query->where('severity', $severity);
        if ($type = $request->get('incident_type')) $query->where('incident_type', $type);
        if ($category = $request->get('incident_category')) $query->where('incident_category', $category);
        if ($contractor = $request->get('contractor')) $query->where('contractor_name', $contractor);
        if ($location = $request->get('location')) $query->where('location', $location);
        if ($assignedTo = $request->get('assigned_to')) $query->where('assigned_to_name', 'like', "%{$assignedTo}%");
        if ($from = $request->get('date_from')) $query->whereDate('incident_date', '>=', $from);
        if ($to = $request->get('date_to')) $query->whereDate('incident_date', '<=', $to);
        if ($request->get('lost_time_injury') === 'true') $query->where('lost_time_injury', true);
        if ($request->get('near_miss') === 'true') $query->where('incident_type', 'Near Miss');

        // Period shortcuts
        if ($period = $request->get('period')) {
            match ($period) {
                'today' => $query->whereDate('incident_date', today()),
                'week'  => $query->whereBetween('incident_date', [now()->startOfWeek(), now()->endOfWeek()]),
                'month' => $query->whereMonth('incident_date', now()->month)->whereYear('incident_date', now()->year),
                'year'  => $query->whereYear('incident_date', now()->year),
                default => null,
            };
        }

        $records = $query->orderBy('incident_date', 'desc')->get();

        $headers = [
            'Incident ID', 'Date', 'Time', 'Location', 'Area',
            'Type', 'Category', 'Severity', 'Description',
            'Affected Person', 'Employee ID', 'Contractor',
            'Injury Type', 'Body Part', 'Medical Treatment', 'LTI',
            'Immediate Action', 'Status', 'Assigned To',
            'Root Cause', 'Root Cause Category',
            'Investigation Notes', 'Remarks',
        ];

        $rows = $records->map(fn ($i) => [
            $i->incident_code,
            $i->incident_date?->format('Y-m-d'),
            $i->incident_time,
            $i->location,
            $i->area,
            $i->incident_type,
            $i->incident_category,
            $i->severity,
            $i->description,
            $i->affected_person_name,
            $i->employee_id,
            $i->contractor_name,
            $i->injury_type,
            $i->body_part_affected,
            $i->medical_treatment_required ? 'Yes' : 'No',
            $i->lost_time_injury ? 'Yes' : 'No',
            $i->immediate_action,
            $i->status,
            $i->assigned_to_name,
            $i->root_cause,
            $i->root_cause_category,
            $i->investigation_notes,
            $i->remarks,
        ])->toArray();

        return $this->exportAs($headers, $rows, 'Incidents', $request->get('format', 'csv'));
    }

    // ─── DELETE ──────────────────────────────────────

    public function destroy(string $id): JsonResponse
    {
        try {
            $incident = Incident::findOrFail($id);
            $incident->deleted_by = Auth::user()?->full_name ?? 'System';
            $incident->save();
            $incident->delete();
            RecycleBinController::logDeleteAction('incident', $incident);

            return response()->json(['message' => 'Incident deleted']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    // ─── PRIVATE HELPERS ────────────────────────────

    private function mapToFrontend(Incident $i): array
    {
        return [
            'id'                         => $i->id,
            'incident_code'              => $i->incident_code,
            'incident_date'              => $i->incident_date?->format('Y-m-d'),
            'incident_time'              => $i->incident_time,
            'location'                   => $i->location,
            'area'                       => $i->area,
            'department'                 => $i->department,
            'incident_type'              => $i->incident_type,
            'incident_category'          => $i->incident_category,
            'description'                => $i->description,
            'immediate_action'           => $i->immediate_action,
            'severity'                   => $i->severity,
            'affected_person_name'       => $i->affected_person_name,
            'employee_id'                => $i->employee_id,
            'designation'                => $i->designation,
            'contractor_name'            => $i->contractor_name,
            'contact_number'             => $i->contact_number,
            'supervisor_name'            => $i->supervisor_name,
            'injury_type'                => $i->injury_type,
            'body_part_affected'         => $i->body_part_affected,
            'medical_treatment_required' => $i->medical_treatment_required,
            'lost_time_injury'           => $i->lost_time_injury,
            'hospitalization'            => $i->hospitalization,
            'property_damage'            => $i->property_damage,
            'equipment_damage'           => $i->equipment_damage,
            'environmental_impact'       => $i->environmental_impact,
            'financial_loss'             => $i->financial_loss,
            'incident_outcome_summary'   => $i->incident_outcome_summary,
            'reported_by'                => $i->reported_by,
            'reported_by_name'           => $i->reported_by_name,
            'assigned_to'                => $i->assigned_to,
            'assigned_to_name'           => $i->assigned_to_name,
            'investigated_by'            => $i->investigated_by,
            'investigated_by_name'       => $i->investigated_by_name,
            'investigation_date'         => $i->investigation_date?->format('Y-m-d'),
            'immediate_cause'            => $i->immediate_cause,
            'root_cause'                 => $i->root_cause,
            'root_cause_category'        => $i->root_cause_category,
            'ppe_used'                   => $i->ppe_used,
            'procedure_followed'         => $i->procedure_followed,
            'supervision_adequate'       => $i->supervision_adequate,
            'training_adequate'          => $i->training_adequate,
            'witness_details'            => $i->witness_details,
            'investigation_notes'        => $i->investigation_notes,
            'status'                     => $i->status,
            'closed_by_name'             => $i->closed_by_name,
            'closed_at'                  => $i->closed_at?->toISOString(),
            'close_notes'                => $i->close_notes,
            'remarks'                    => $i->remarks,
            'photos'                     => $i->photos ?? [],
            'created_at'                 => $i->created_at?->toISOString(),
            'updated_at'                 => $i->updated_at?->toISOString(),
        ];
    }

    private function mapLabelTotal(array $items): array
    {
        return array_map(fn ($r) => ['label' => $r->label ?? 'Unknown', 'total' => (int) $r->total], $items);
    }
}
