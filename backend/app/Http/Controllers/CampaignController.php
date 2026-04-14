<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\CampaignActivity;
use App\Services\NotificationService;
use App\Models\CampaignParticipant;
use App\Models\CampaignEvidence;
use App\Models\CampaignAction;
use App\Models\CampaignResult;
use App\Models\CampaignLog;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Constants\StatusConstants;
use App\Http\Traits\ExportsData;

class CampaignController extends Controller
{
    use ExportsData;

    // ─── LIST ────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $query = Campaign::query();

        // Text search
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('campaign_code', 'like', "%{$search}%")
                  ->orWhere('owner_name', 'like', "%{$search}%")
                  ->orWhere('conducted_by', 'like', "%{$search}%")
                  ->orWhere('topic', 'like', "%{$search}%");
            });
        }

        // Filters
        if ($type = $request->get('campaign_type')) {
            $query->where('campaign_type', $type);
        }
        if ($topic = $request->get('topic')) {
            $query->where('topic', $topic);
        }
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($site = $request->get('site')) {
            $query->where('site', 'like', "%{$site}%");
        }
        if ($area = $request->get('area')) {
            $query->where('area', 'like', "%{$area}%");
        }
        if ($zone = $request->get('zone')) {
            $query->where('zone', 'like', "%{$zone}%");
        }
        if ($department = $request->get('department')) {
            $query->where('department', 'like', "%{$department}%");
        }
        if ($contractor = $request->get('contractor_name')) {
            $query->where('contractor_name', 'like', "%{$contractor}%");
        }
        if ($ownerId = $request->get('owner_id')) {
            $query->where('owner_id', $ownerId);
        }
        if ($from = $request->get('date_from')) {
            $query->whereDate('start_date', '>=', $from);
        }
        if ($to = $request->get('date_to')) {
            $query->whereDate('start_date', '<=', $to);
        }
        if ($endFrom = $request->get('end_from')) {
            $query->whereDate('end_date', '>=', $endFrom);
        }
        if ($endTo = $request->get('end_to')) {
            $query->whereDate('end_date', '<=', $endTo);
        }
        if ($request->get('active_now') === 'true') {
            $query->where('start_date', '<=', today())->where('end_date', '>=', today());
        }
        if ($request->get('has_open_actions') === 'true') {
            $query->where('open_action_count', '>', 0);
        }

        // Period shortcuts
        if ($period = $request->get('period')) {
            match ($period) {
                'week'  => $query->whereBetween('start_date', [now()->startOfWeek(), now()->endOfWeek()]),
                'month' => $query->whereMonth('start_date', now()->month)->whereYear('start_date', now()->year),
                'year'  => $query->whereYear('start_date', now()->year),
                default => null,
            };
        }

        $query->with(['owner:id,full_name', 'createdBy:id,full_name']);

        // Sort
        $sortBy = $request->get('sort_by', 'start_date');
        $sortDir = $request->get('sort_dir', 'desc');
        $allowedSorts = ['start_date', 'end_date', 'title', 'participant_count', 'action_count', 'status', 'created_at'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderByDesc('start_date');
        }

        $perPage = min(500, max(1, (int) $request->get('per_page', 20)));
        $paginated = $query->paginate($perPage);

        return response()->json([
            'data'      => $paginated->items(),
            'total'     => $paginated->total(),
            'page'      => $paginated->currentPage(),
            'per_page'  => $paginated->perPage(),
            'last_page' => $paginated->lastPage(),
        ]);
    }

    // ─── STORE ───────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title'                => 'required|string|max:500',
            'campaign_type'        => 'required|string|max:200',
            'topic'                => 'required|string|max:200',
            'start_date'           => 'required|date',
            'end_date'             => 'required|date|after_or_equal:start_date',
            'frequency'            => 'nullable|in:One-Time,Weekly,Monthly,Quarterly,Annual',
            'owner_name'           => 'nullable|string|max:255',
            'owner_id'             => 'nullable|exists:users,id',
            'conducted_by'         => 'nullable|string|max:255',
            'approved_by'          => 'nullable|string|max:255',
            'site'                 => 'nullable|string|max:255',
            'project'              => 'nullable|string|max:255',
            'area'                 => 'nullable|string|max:200',
            'zone'                 => 'nullable|string|max:200',
            'department'           => 'nullable|string|max:200',
            'contractor_name'      => 'nullable|string|max:200',
            'target_audience'      => 'nullable|string',
            'expected_participants' => 'nullable|integer|min:0',
            'description'          => 'nullable|string',
            'objective'            => 'nullable|string',
            'notes'                => 'nullable|string',
        ]);

        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $campaign = DB::transaction(function () use ($request, $user) {
                // Generate campaign_code with lock to prevent race conditions
                $year = date('Y');
                $lastCode = Campaign::withTrashed()
                    ->whereYear('created_at', $year)
                    ->lockForUpdate()
                    ->orderByDesc('id')
                    ->value('campaign_code');
                $seq = $lastCode ? (int) substr($lastCode, -4) + 1 : 1;
                $campaignCode = 'CMP-' . $year . '-' . str_pad($seq, 4, '0', STR_PAD_LEFT);

                $campaign = Campaign::create([
                    'campaign_code'        => $campaignCode,
                    'title'                => $request->input('title'),
                    'campaign_type'        => $request->input('campaign_type'),
                    'topic'                => $request->input('topic'),
                    'start_date'           => $request->input('start_date'),
                    'end_date'             => $request->input('end_date'),
                    'frequency'            => $request->input('frequency', 'One-Time'),
                    'owner_name'           => $request->input('owner_name'),
                    'owner_id'             => $request->input('owner_id'),
                    'conducted_by'         => $request->input('conducted_by'),
                    'approved_by'          => $request->input('approved_by'),
                    'approved_by_id'       => $request->input('approved_by_id'),
                    'site'                 => $request->input('site'),
                    'project'              => $request->input('project'),
                    'area'                 => $request->input('area'),
                    'zone'                 => $request->input('zone'),
                    'department'           => $request->input('department'),
                    'contractor_name'      => $request->input('contractor_name'),
                    'target_audience'      => $request->input('target_audience'),
                    'expected_participants' => $request->input('expected_participants'),
                    'description'          => $request->input('description'),
                    'objective'            => $request->input('objective'),
                    'notes'                => $request->input('notes'),
                    'status'               => StatusConstants::CAMPAIGN_DRAFT,
                    'created_by'           => $user->id,
                    'updated_by'           => $user->id,
                ]);

                $campaign->logHistory('Campaign Created');

                return $campaign;
            });

            // Fire notifications
            NotificationService::campaignCreated($campaign, $user->id);

            return response()->json([
                'message'  => 'Campaign created successfully',
                'campaign' => $campaign->fresh()->load(['owner:id,full_name', 'createdBy:id,full_name']),
            ], 201);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    // ─── SHOW ────────────────────────────────────────

    public function show($id): JsonResponse
    {
        $campaign = Campaign::with([
            'activities' => fn ($q) => $q->orderBy('activity_date'),
            'participants.activity',
            'evidence',
            'actions.assignedToUser:id,full_name',
            'result',
            'logs.performer:id,full_name',
            'owner:id,full_name',
            'createdBy:id,full_name',
        ])->findOrFail($id);

        $data = $campaign->toArray();
        $data['is_active'] = $campaign->is_active;
        $data['is_overdue'] = $campaign->is_overdue;
        $data['duration_formatted'] = $campaign->duration_formatted;

        return response()->json($data);
    }

    // ─── UPDATE ──────────────────────────────────────

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $campaign = Campaign::findOrFail($id);

            if (in_array($campaign->status, [StatusConstants::CAMPAIGN_CLOSED, StatusConstants::CAMPAIGN_CANCELLED])) {
                return response()->json(['message' => 'Cannot update a closed or cancelled campaign'], 422);
            }

            $request->validate([
                'title'                => 'sometimes|required|string|max:500',
                'campaign_type'        => 'sometimes|required|string|max:200',
                'topic'                => 'sometimes|required|string|max:200',
                'start_date'           => 'sometimes|required|date',
                'end_date'             => 'sometimes|required|date|after_or_equal:start_date',
                'frequency'            => 'nullable|in:One-Time,Weekly,Monthly,Quarterly,Annual',
                'owner_name'           => 'nullable|string|max:255',
                'owner_id'             => 'nullable|exists:users,id',
                'conducted_by'         => 'nullable|string|max:255',
                'approved_by'          => 'nullable|string|max:255',
                'site'                 => 'nullable|string|max:255',
                'project'              => 'nullable|string|max:255',
                'area'                 => 'nullable|string|max:200',
                'zone'                 => 'nullable|string|max:200',
                'department'           => 'nullable|string|max:200',
                'contractor_name'      => 'nullable|string|max:200',
                'target_audience'      => 'nullable|string',
                'expected_participants' => 'nullable|integer|min:0',
                'description'          => 'nullable|string',
                'objective'            => 'nullable|string',
                'notes'                => 'nullable|string',
            ]);

            $fillable = [
                'title', 'campaign_type', 'topic', 'start_date', 'end_date', 'frequency',
                'owner_name', 'owner_id', 'conducted_by', 'approved_by', 'approved_by_id',
                'site', 'project', 'area', 'zone', 'department', 'contractor_name',
                'target_audience', 'expected_participants', 'description', 'objective', 'notes',
            ];

            $fields = [];
            foreach ($fillable as $column) {
                if ($request->has($column)) {
                    $fields[$column] = $request->input($column);
                }
            }

            $user = $request->user();
            $fields['updated_by'] = $user?->id;

            if (!empty($fields)) {
                $campaign->update($fields);
                $campaign->logHistory('Campaign Updated');
            }

            return response()->json([
                'message'  => 'Campaign updated successfully',
                'campaign' => $campaign->fresh()->load(['owner:id,full_name', 'createdBy:id,full_name']),
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
            $campaign = Campaign::findOrFail($id);

            if (!in_array($campaign->status, [StatusConstants::CAMPAIGN_DRAFT, StatusConstants::CAMPAIGN_CANCELLED])) {
                return response()->json(['message' => 'Only Draft or Cancelled campaigns can be deleted'], 422);
            }

            $campaign->deleted_by = Auth::user()?->full_name ?? 'System';
            $campaign->save();
            $campaign->logHistory('Campaign Deleted');
            $campaign->delete();
            RecycleBinController::logDeleteAction('campaign', $campaign);

            return response()->json(['message' => 'Campaign deleted']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    // ─── STATUS CHANGE ──────────────────────────────

    public function changeStatus(Request $request, $id): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:Draft,Planned,Active,Completed,Closed,Cancelled',
        ]);

        $campaign = Campaign::findOrFail($id);
        $newStatus = $request->input('status');
        $oldStatus = $campaign->status;

        // Guard transitions
        $allowed = match ($newStatus) {
            StatusConstants::CAMPAIGN_ACTIVE    => in_array($oldStatus, [StatusConstants::CAMPAIGN_DRAFT, StatusConstants::CAMPAIGN_PLANNED]),
            StatusConstants::CAMPAIGN_COMPLETED => $oldStatus === StatusConstants::CAMPAIGN_ACTIVE,
            StatusConstants::CAMPAIGN_CLOSED    => $oldStatus === StatusConstants::CAMPAIGN_COMPLETED,
            StatusConstants::CAMPAIGN_CANCELLED => in_array($oldStatus, [StatusConstants::CAMPAIGN_DRAFT, StatusConstants::CAMPAIGN_PLANNED, StatusConstants::CAMPAIGN_ACTIVE]),
            StatusConstants::CAMPAIGN_PLANNED   => $oldStatus === StatusConstants::CAMPAIGN_DRAFT,
            default     => false,
        };

        if (!$allowed) {
            return response()->json(['message' => "Cannot transition from {$oldStatus} to {$newStatus}"], 422);
        }

        $campaign->update([
            'status'     => $newStatus,
            'updated_by' => $request->user()->id,
        ]);

        $campaign->logHistory('Status Changed', $oldStatus, $newStatus);

        return response()->json([
            'message'  => 'Status updated',
            'campaign' => $campaign->fresh()->load(['owner:id,full_name', 'createdBy:id,full_name']),
        ]);
    }

    // ─── ACTIVITIES ─────────────────────────────────

    public function addActivity(Request $request, $id): JsonResponse
    {
        $request->validate([
            'title'            => 'required|string|max:500',
            'activity_type'    => 'required|string|max:200',
            'activity_date'    => 'required|date',
            'activity_time'    => 'nullable|date_format:H:i',
            'location'         => 'nullable|string|max:255',
            'conducted_by'     => 'nullable|string|max:255',
            'attendance_count' => 'nullable|integer|min:0',
            'description'      => 'nullable|string',
            'status'           => 'nullable|in:Planned,Conducted,Cancelled,Rescheduled',
            'notes'            => 'nullable|string',
        ]);

        $campaign = Campaign::findOrFail($id);

        $activity = CampaignActivity::create([
            'campaign_id'      => $campaign->id,
            'title'            => $request->input('title'),
            'activity_type'    => $request->input('activity_type'),
            'activity_date'    => $request->input('activity_date'),
            'activity_time'    => $request->input('activity_time'),
            'location'         => $request->input('location'),
            'conducted_by'     => $request->input('conducted_by'),
            'attendance_count' => $request->input('attendance_count', 0),
            'description'      => $request->input('description'),
            'status'           => $request->input('status', 'Planned'),
            'notes'            => $request->input('notes'),
            'created_by'       => $request->user()->id,
        ]);

        $campaign->logHistory('Activity Added', null, null, 'Added activity: ' . $activity->activity_code);

        return response()->json([
            'message'  => 'Activity added',
            'activity' => $activity,
        ], 201);
    }

    public function updateActivity(Request $request, $id, $activityId): JsonResponse
    {
        $campaign = Campaign::findOrFail($id);
        $activity = CampaignActivity::where('campaign_id', $id)->findOrFail($activityId);

        $request->validate([
            'title'            => 'sometimes|required|string|max:500',
            'activity_type'    => 'nullable|string|max:200',
            'activity_date'    => 'nullable|date',
            'activity_time'    => 'nullable|date_format:H:i',
            'location'         => 'nullable|string|max:255',
            'conducted_by'     => 'nullable|string|max:255',
            'attendance_count' => 'nullable|integer|min:0',
            'description'      => 'nullable|string',
            'status'           => 'nullable|in:Planned,Conducted,Cancelled,Rescheduled',
            'notes'            => 'nullable|string',
        ]);

        $fields = [];
        $fillable = ['title', 'activity_type', 'activity_date', 'activity_time', 'location', 'conducted_by', 'attendance_count', 'description', 'status', 'notes'];

        foreach ($fillable as $col) {
            if ($request->has($col)) {
                $fields[$col] = $request->input($col);
            }
        }

        // If marking as conducted without attendance_count, count participants
        $newStatus = $fields['status'] ?? $activity->status;
        if ($newStatus === 'Conducted' && !isset($fields['attendance_count']) && !$activity->attendance_count) {
            $fields['attendance_count'] = $activity->participants()->count();
        }

        if (!empty($fields)) {
            $activity->update($fields);
            $logAction = ($newStatus === 'Conducted' && $activity->getOriginal('status') !== 'Conducted')
                ? 'Activity Conducted' : 'Activity Updated';
            $campaign->logHistory($logAction, null, null, $logAction . ': ' . $activity->activity_code);
        }

        return response()->json([
            'message'  => 'Activity updated',
            'activity' => $activity->fresh(),
        ]);
    }

    public function deleteActivity($id, $activityId): JsonResponse
    {
        $campaign = Campaign::findOrFail($id);
        $activity = CampaignActivity::where('campaign_id', $id)->findOrFail($activityId);

        $code = $activity->activity_code;
        $activity->delete();

        $campaign->recalculateCounts();
        $campaign->logHistory('Activity Deleted', null, null, 'Deleted activity: ' . $code);

        return response()->json(['message' => 'Activity removed']);
    }

    // ─── PARTICIPANTS ───────────────────────────────

    public function addParticipant(Request $request, $id): JsonResponse
    {
        $request->validate([
            'participant_name'   => 'required|string|max:255',
            'activity_id'       => 'nullable|exists:campaign_activities,id',
            'user_id'           => 'nullable|exists:users,id',
            'employee_id'       => 'nullable|string|max:100',
            'designation'       => 'nullable|string|max:200',
            'department'        => 'nullable|string|max:200',
            'company'           => 'nullable|string|max:200',
            'attendance_status' => 'nullable|in:Present,Absent,Late,Excused',
            'participation_type' => 'nullable|in:Attendee,Speaker,Organizer,Supervisor,Observer',
            'remarks'           => 'nullable|string',
        ]);

        $campaign = Campaign::findOrFail($id);

        $participant = CampaignParticipant::create([
            'campaign_id'        => $campaign->id,
            'activity_id'        => $request->input('activity_id'),
            'user_id'            => $request->input('user_id'),
            'participant_name'   => $request->input('participant_name'),
            'employee_id'        => $request->input('employee_id'),
            'designation'        => $request->input('designation'),
            'department'         => $request->input('department'),
            'company'            => $request->input('company'),
            'attendance_status'  => $request->input('attendance_status', 'Present'),
            'participation_type' => $request->input('participation_type', 'Attendee'),
            'remarks'            => $request->input('remarks'),
        ]);

        $campaign->logHistory('Participant Added', null, null, 'Added participant: ' . $participant->participant_name);

        return response()->json([
            'message'     => 'Participant added',
            'participant' => $participant,
        ], 201);
    }

    public function bulkAddParticipants(Request $request, $id): JsonResponse
    {
        $request->validate([
            'participants'                    => 'required|array|min:1',
            'participants.*.participant_name' => 'required|string|max:255',
        ]);

        $campaign = Campaign::findOrFail($id);
        $created = [];

        DB::transaction(function () use ($request, $campaign, &$created) {
            $activityId = $request->input('activity_id');
            foreach ($request->input('participants') as $p) {
                $created[] = CampaignParticipant::create([
                    'campaign_id'        => $campaign->id,
                    'activity_id'        => $activityId ?? ($p['activity_id'] ?? null),
                    'user_id'            => $p['user_id'] ?? null,
                    'participant_name'   => $p['participant_name'],
                    'employee_id'        => $p['employee_id'] ?? null,
                    'designation'        => $p['designation'] ?? null,
                    'department'         => $p['department'] ?? null,
                    'company'            => $p['company'] ?? null,
                    'attendance_status'  => $p['attendance_status'] ?? 'Present',
                    'participation_type' => $p['participation_type'] ?? 'Attendee',
                    'remarks'            => $p['remarks'] ?? null,
                ]);
            }
        });

        $campaign->logHistory('Participants Bulk Added', null, null, count($created) . ' participants added');

        return response()->json([
            'message'      => count($created) . ' participants added',
            'participants' => $created,
        ], 201);
    }

    public function removeParticipant($id, $participantId): JsonResponse
    {
        $campaign = Campaign::findOrFail($id);
        $participant = CampaignParticipant::where('campaign_id', $id)->findOrFail($participantId);

        $name = $participant->participant_name;
        $participant->delete();

        $campaign->logHistory('Participant Removed', null, null, 'Removed participant: ' . $name);

        return response()->json(['message' => 'Participant removed']);
    }

    // ─── EVIDENCE ───────────────────────────────────

    public function uploadEvidence(Request $request, $id): JsonResponse
    {
        $campaign = Campaign::findOrFail($id);

        $files = $request->file('evidence');
        if (!$files) {
            return response()->json(['message' => 'No files provided'], 422);
        }
        if (!is_array($files)) {
            $files = [$files];
        }

        $user = $request->user();
        $activityId = $request->input('activity_id');
        $category = $request->input('evidence_category');
        $categories = $request->input('evidence_categories', []);
        $caption = $request->input('caption');
        $created = [];

        $dir = storage_path('app/public/campaigns/' . $campaign->id . '/evidence');
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        foreach ($files as $index => $file) {
            if (!$file || !$file->isValid()) continue;

            $originalName = $file->getClientOriginalName();
            $fileSize = $file->getSize();
            $ext = strtolower($file->getClientOriginalExtension());

            $name = 'cmp-' . time() . '-' . Str::random(6) . '.' . $ext;
            $file->move($dir, $name);

            $evidence = CampaignEvidence::create([
                'campaign_id'       => $campaign->id,
                'activity_id'       => $activityId,
                'file_path'         => 'campaigns/' . $campaign->id . '/evidence/' . $name,
                'original_name'     => $originalName,
                'file_type'         => $ext,
                'file_size_kb'      => (int) round($fileSize / 1024),
                'evidence_category' => $categories[$index] ?? $category,
                'caption'           => $caption,
                'uploaded_by'       => $user->id,
                'uploaded_by_name'  => $user->full_name ?? $user->email,
            ]);

            $created[] = array_merge($evidence->toArray(), ['url' => $evidence->url]);
        }

        $campaign->logHistory('Evidence Uploaded', null, null, count($created) . ' file(s) uploaded');

        return response()->json([
            'message'  => 'Evidence uploaded',
            'evidence' => $created,
        ]);
    }

    public function removeEvidence($id, $evidenceId): JsonResponse
    {
        $campaign = Campaign::findOrFail($id);
        $evidence = CampaignEvidence::where('campaign_id', $id)->findOrFail($evidenceId);

        Storage::disk('public')->delete($evidence->file_path);
        $evidence->delete();

        $campaign->logHistory('Evidence Removed', null, null, 'Removed: ' . $evidence->original_name);

        return response()->json(['message' => 'Evidence removed']);
    }

    // ─── ACTIONS ────────────────────────────────────

    public function addAction(Request $request, $id): JsonResponse
    {
        $request->validate([
            'title'          => 'required|string|max:500',
            'description'    => 'nullable|string',
            'assigned_to'    => 'nullable|string|max:255',
            'assigned_to_id' => 'nullable|exists:users,id',
            'due_date'       => 'nullable|date',
            'priority'       => 'nullable|in:Low,Medium,High,Critical',
        ]);

        $campaign = Campaign::findOrFail($id);
        $user = $request->user();

        $action = CampaignAction::create([
            'campaign_id'    => $campaign->id,
            'title'          => $request->input('title'),
            'description'    => $request->input('description'),
            'assigned_to'    => $request->input('assigned_to'),
            'assigned_to_id' => $request->input('assigned_to_id'),
            'due_date'       => $request->input('due_date'),
            'priority'       => $request->input('priority', 'Medium'),
            'status'         => StatusConstants::CAMPAIGN_ACTION_OPEN,
            'created_by'     => $user->id,
        ]);

        $campaign->logHistory('Action Added', null, null, 'Added action: ' . $action->action_code);

        return response()->json([
            'message' => 'Action added',
            'action'  => $action,
        ], 201);
    }

    public function updateAction(Request $request, $id, $actionId): JsonResponse
    {
        $campaign = Campaign::findOrFail($id);
        $action = CampaignAction::where('campaign_id', $id)->findOrFail($actionId);

        $oldStatus = $action->status;
        $user = $request->user();

        $fields = [];
        $fillable = ['title', 'description', 'assigned_to', 'assigned_to_id', 'due_date', 'priority', 'status', 'completion_notes'];

        foreach ($fillable as $col) {
            if ($request->has($col)) {
                $fields[$col] = $request->input($col);
            }
        }

        // Handle status change to Completed
        $newStatus = $fields['status'] ?? $oldStatus;
        if ($newStatus === StatusConstants::CAMPAIGN_ACTION_COMPLETED && $oldStatus !== StatusConstants::CAMPAIGN_ACTION_COMPLETED) {
            if (!$request->has('completion_notes') && !$action->completion_notes) {
                return response()->json(['message' => 'Completion notes required when closing an action'], 422);
            }
            $fields['closed_at'] = now();
            $fields['closed_by'] = $user->id;
        }

        // Handle evidence upload
        if ($file = $request->file('evidence_path')) {
            if ($file->isValid()) {
                $dir = storage_path('app/public/campaigns/' . $id . '/actions');
                if (!is_dir($dir)) {
                    mkdir($dir, 0755, true);
                }
                $name = 'cmp-act-' . time() . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
                $file->move($dir, $name);
                $fields['evidence_path'] = 'campaigns/' . $id . '/actions/' . $name;
            }
        }

        $fields['updated_by'] = $user->id;

        $action->update($fields);

        $logAction = ($newStatus === StatusConstants::CAMPAIGN_ACTION_COMPLETED && $oldStatus !== StatusConstants::CAMPAIGN_ACTION_COMPLETED) ? 'Action Closed' : 'Action Updated';
        $campaign->logHistory($logAction, $oldStatus, $newStatus, "Action {$action->action_code}: {$logAction}");

        return response()->json([
            'message' => $logAction === 'Action Closed' ? 'Action closed' : 'Action updated',
            'action'  => $action->fresh(),
        ]);
    }

    // ─── RESULTS ────────────────────────────────────

    public function saveResult(Request $request, $id): JsonResponse
    {
        $campaign = Campaign::findOrFail($id);
        $user = $request->user();

        $request->validate([
            'total_activities_conducted' => 'nullable|integer|min:0',
            'total_participants'         => 'nullable|integer|min:0',
            'participation_rate'         => 'nullable|numeric|min:0|max:100',
            'areas_covered'              => 'nullable|integer|min:0',
            'sessions_delivered'         => 'nullable|integer|min:0',
            'observations_raised'        => 'nullable|integer|min:0',
            'violations_before'          => 'nullable|integer|min:0',
            'violations_after'           => 'nullable|integer|min:0',
            'incidents_before'           => 'nullable|integer|min:0',
            'incidents_after'            => 'nullable|integer|min:0',
            'actions_created'            => 'nullable|integer|min:0',
            'actions_closed'             => 'nullable|integer|min:0',
            'effectiveness_rating'       => 'nullable|in:Successful,Partially Successful,Needs Improvement,Not Effective',
            'outcome_summary'            => 'nullable|string',
            'lessons_learned'            => 'nullable|string',
            'recommendations'            => 'nullable|string',
            'next_steps'                 => 'nullable|string',
        ]);

        $result = CampaignResult::updateOrCreate(
            ['campaign_id' => $campaign->id],
            array_merge($request->only([
                'total_activities_conducted', 'total_participants', 'participation_rate',
                'areas_covered', 'sessions_delivered', 'observations_raised',
                'violations_before', 'violations_after', 'incidents_before', 'incidents_after',
                'actions_created', 'actions_closed', 'effectiveness_rating',
                'outcome_summary', 'lessons_learned', 'recommendations', 'next_steps',
            ]), [
                'evaluated_by'    => $user->full_name ?? $user->email,
                'evaluated_by_id' => $user->id,
                'evaluated_at'    => now(),
            ])
        );

        $campaign->logHistory('Results Saved', null, null, 'Effectiveness: ' . ($result->effectiveness_rating ?? 'N/A'));

        return response()->json([
            'message' => 'Results saved',
            'result'  => $result->fresh(),
        ]);
    }

    // ─── STATS ──────────────────────────────────────

    public function stats(Request $request): JsonResponse
    {
        try {
        $year = (int) $request->get('year', now()->year);

        $kpis = DB::selectOne("
            SELECT
                COUNT(*) as total_campaigns,
                SUM(status = 'Active') as active_count,
                SUM(status = 'Planned') as planned_count,
                SUM(status = 'Completed') as completed_count,
                SUM(status = 'Cancelled') as cancelled_count,
                SUM(YEAR(created_at) = ? AND MONTH(created_at) = MONTH(CURDATE())) as campaigns_this_month
            FROM campaigns
            WHERE deleted_at IS NULL
        ", [$year]);

        $participantsThisMonth = DB::selectOne("
            SELECT COUNT(*) as cnt
            FROM campaign_participants cp
            JOIN campaigns c ON c.id = cp.campaign_id
            WHERE c.deleted_at IS NULL
              AND YEAR(cp.created_at) = ? AND MONTH(cp.created_at) = MONTH(CURDATE())
        ", [$year]);

        $activitiesConducted = DB::selectOne("
            SELECT COUNT(*) as cnt
            FROM campaign_activities ca
            JOIN campaigns c ON c.id = ca.campaign_id
            WHERE c.deleted_at IS NULL AND ca.status = 'Conducted'
              AND YEAR(ca.activity_date) = ?
        ", [$year]);

        $openActions = DB::selectOne("
            SELECT COUNT(*) as cnt
            FROM campaign_actions ca
            JOIN campaigns c ON c.id = ca.campaign_id
            WHERE c.deleted_at IS NULL AND ca.status IN ('Open', 'In Progress', 'Overdue')
        ");

        $byType = DB::select("
            SELECT campaign_type as label, COUNT(*) as total
            FROM campaigns
            WHERE deleted_at IS NULL AND YEAR(start_date) = ?
            GROUP BY campaign_type ORDER BY total DESC
        ", [$year]);

        $byTopic = DB::select("
            SELECT topic as label, COUNT(*) as total
            FROM campaigns
            WHERE deleted_at IS NULL AND YEAR(start_date) = ?
            GROUP BY topic ORDER BY total DESC
        ", [$year]);

        $byStatus = DB::select("
            SELECT status as label, COUNT(*) as total
            FROM campaigns
            WHERE deleted_at IS NULL
            GROUP BY status ORDER BY total DESC
        ");

        $monthlyTrend = DB::select("
            SELECT
                DATE_FORMAT(c.start_date, '%Y-%m') as month,
                COUNT(DISTINCT c.id) as campaigns_started,
                COUNT(cp.id) as participants
            FROM campaigns c
            LEFT JOIN campaign_participants cp ON cp.campaign_id = c.id
            WHERE c.deleted_at IS NULL
              AND c.start_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(c.start_date, '%Y-%m')
            ORDER BY month
        ");

        $effectivenessDistribution = DB::select("
            SELECT effectiveness_rating as rating, COUNT(*) as total
            FROM campaign_results
            WHERE effectiveness_rating IS NOT NULL
            GROUP BY effectiveness_rating
        ");

        $topParticipation = DB::select("
            SELECT c.id, c.campaign_code, c.title, c.participant_count
            FROM campaigns c
            WHERE c.deleted_at IS NULL AND c.participant_count > 0
            ORDER BY c.participant_count DESC
            LIMIT 5
        ");

        $openActionsList = DB::select("
            SELECT
                ca.id, ca.action_code, ca.title, ca.due_date, ca.priority, ca.status,
                ca.assigned_to, c.campaign_code, c.title as campaign_title, c.id as campaign_id
            FROM campaign_actions ca
            JOIN campaigns c ON c.id = ca.campaign_id
            WHERE c.deleted_at IS NULL AND ca.status IN ('Open', 'In Progress', 'Overdue')
            ORDER BY ca.due_date ASC
            LIMIT 10
        ");

        return response()->json([
            'kpis' => [
                'total_campaigns'        => (int) ($kpis->total_campaigns ?? 0),
                'active_now'             => (int) ($kpis->active_count ?? 0),
                'planned'                => (int) ($kpis->planned_count ?? 0),
                'completed'              => (int) ($kpis->completed_count ?? 0),
                'cancelled'              => (int) ($kpis->cancelled_count ?? 0),
                'participants_this_month' => (int) ($participantsThisMonth->cnt ?? 0),
                'activities_conducted'   => (int) ($activitiesConducted->cnt ?? 0),
                'open_actions'           => (int) ($openActions->cnt ?? 0),
                'campaigns_this_month'   => (int) ($kpis->campaigns_this_month ?? 0),
            ],
            'by_type'                     => array_map(fn ($r) => ['label' => $r->label, 'total' => (int) $r->total], $byType),
            'by_topic'                    => array_map(fn ($r) => ['label' => $r->label, 'total' => (int) $r->total], $byTopic),
            'by_status'                   => array_map(fn ($r) => ['label' => $r->label, 'total' => (int) $r->total], $byStatus),
            'monthly_trend'               => array_map(fn ($r) => [
                'month'             => $r->month,
                'campaigns_started' => (int) $r->campaigns_started,
                'participants'      => (int) $r->participants,
            ], $monthlyTrend),
            'effectiveness_distribution'  => array_map(fn ($r) => ['rating' => $r->rating, 'total' => (int) $r->total], $effectivenessDistribution),
            'top_participation'           => array_map(fn ($r) => [
                'id'                => $r->id,
                'campaign_code'     => $r->campaign_code,
                'title'             => $r->title,
                'participant_count' => (int) $r->participant_count,
            ], $topParticipation),
            'open_actions_list'           => array_map(fn ($r) => [
                'id'              => $r->id,
                'action_code'     => $r->action_code,
                'title'           => $r->title,
                'due_date'        => $r->due_date,
                'priority'        => $r->priority,
                'status'          => $r->status,
                'assigned_to'     => $r->assigned_to,
                'campaign_code'   => $r->campaign_code,
                'campaign_title'  => $r->campaign_title,
                'campaign_id'     => $r->campaign_id,
            ], $openActionsList),
        ]);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to load campaign stats', 'message' => $e->getMessage()], 500);
        }
    }

    // ─── EXPORT ─────────────────────────────────────

    public function export(Request $request)
    {
        $query = Campaign::query();

        if ($type = $request->get('campaign_type')) {
            $query->where('campaign_type', $type);
        }
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($from = $request->get('date_from')) {
            $query->whereDate('start_date', '>=', $from);
        }
        if ($to = $request->get('date_to')) {
            $query->whereDate('start_date', '<=', $to);
        }

        $records = $query->with('result')->orderByDesc('start_date')->get();

        $headers = [
            'Campaign Code', 'Title', 'Type', 'Topic', 'Status',
            'Start Date', 'End Date', 'Duration Days',
            'Owner', 'Site', 'Area', 'Zone', 'Department', 'Contractor',
            'Expected Participants', 'Actual Participants',
            'Activities Count', 'Evidence Count',
            'Open Actions', 'Total Actions',
            'Effectiveness Rating', 'Outcome Summary',
        ];

        $rows = $records->map(fn ($c) => [
            $c->campaign_code,
            $c->title,
            $c->campaign_type,
            $c->topic,
            $c->status,
            $c->start_date?->format('Y-m-d'),
            $c->end_date?->format('Y-m-d'),
            $c->duration_days,
            $c->owner_name,
            $c->site,
            $c->area,
            $c->zone,
            $c->department,
            $c->contractor_name,
            $c->expected_participants,
            $c->participant_count,
            $c->activity_count,
            $c->evidence_count,
            $c->open_action_count,
            $c->action_count,
            $c->result?->effectiveness_rating,
            $c->result?->outcome_summary,
        ])->toArray();

        return $this->exportAs($headers, $rows, 'Campaigns', $request->get('format', 'csv'));
    }
}
