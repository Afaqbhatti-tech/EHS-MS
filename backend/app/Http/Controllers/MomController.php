<?php

namespace App\Http\Controllers;

use App\Models\Mom;
use App\Models\MomPoint;
use App\Services\NotificationService;
use App\Models\MomPointPhoto;
use App\Models\MomPointUpdate;
use App\Services\Import\DocumentParserService;
use App\Services\Import\DocumentAnalyzerService;
use App\Services\Import\StatusNormalizer;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Services\AiService;
use App\Constants\StatusConstants;
use App\Http\Traits\ExportsData;

class MomController extends Controller
{
    use ExportsData;

    /**
     * GET /api/mom
     */
    public function index(Request $request): JsonResponse
    {
        $query = Mom::query()->withCount('points');

        // Text search
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('mom_code', 'like', "%{$search}%")
                  ->orWhere('ref_number', 'like', "%{$search}%")
                  ->orWhere('chaired_by', 'like', "%{$search}%")
                  ->orWhere('client_name', 'like', "%{$search}%");
            });
        }

        if ($year = $request->get('year')) {
            $query->where('year', (int) $year);
        }
        if ($week = $request->get('week_number')) {
            $query->where('week_number', (int) $week);
        }
        if ($type = $request->get('meeting_type')) {
            $query->where('meeting_type', $type);
        }
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($request->get('has_open_points')) {
            $query->where('open_points', '>', 0);
        }
        if ($request->get('has_overdue')) {
            $query->where('overdue_points', '>', 0);
        }
        if ($from = $request->get('date_from')) {
            $query->whereDate('meeting_date', '>=', $from);
        }
        if ($to = $request->get('date_to')) {
            $query->whereDate('meeting_date', '<=', $to);
        }

        // Period shortcuts
        if ($period = $request->get('period')) {
            match ($period) {
                'week' => $query->whereBetween('meeting_date', [
                    now()->startOfWeek(), now()->endOfWeek(),
                ]),
                'month' => $query->whereMonth('meeting_date', now()->month)
                                 ->whereYear('meeting_date', now()->year),
                'year' => $query->whereYear('meeting_date', now()->year),
                default => null,
            };
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'meeting_date');
        $sortDir = $request->get('sort_dir', 'desc');
        $allowedSorts = ['meeting_date', 'week_number', 'total_points', 'open_points', 'created_at'];
        if (!in_array($sortBy, $allowedSorts)) $sortBy = 'meeting_date';
        if (!in_array($sortDir, ['asc', 'desc'])) $sortDir = 'desc';

        $perPage = min(100, max(1, (int) $request->get('per_page', 20)));
        $paginated = $query->orderBy($sortBy, $sortDir)->paginate($perPage);

        $data = collect($paginated->items())->map(fn(Mom $m) => $this->mapMomToList($m));

        return response()->json([
            'data'      => $data,
            'total'     => $paginated->total(),
            'page'      => $paginated->currentPage(),
            'per_page'  => $paginated->perPage(),
            'last_page' => $paginated->lastPage(),
        ]);
    }

    /**
     * POST /api/mom
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title'               => 'required|string|max:500',
            'meeting_date'        => 'required|date',
            'week_number'         => 'required|integer|min:1|max:53',
            'year'                => 'required|integer',
            'meeting_type'        => 'nullable|string|max:100',
            'meeting_time'        => 'nullable|date_format:H:i',
            'meeting_location'    => 'nullable|string|max:255',
            'chaired_by'          => 'nullable|string|max:255',
            'minutes_prepared_by' => 'nullable|string|max:255',
            'site_project'        => 'nullable|string|max:255',
            'client_name'         => 'nullable|string|max:255',
            'attendees'           => 'nullable|array',
            'attendees.*.name'    => 'required_with:attendees|string',
            'attendees.*.company' => 'nullable|string',
            'attendees.*.role'    => 'nullable|string',
            'summary'             => 'nullable|string',
            'previous_mom_id'     => 'nullable|string|exists:moms,id',
            'notes'               => 'nullable|string',
            'document_path'       => 'nullable|string|max:1000',
            'document_name'       => 'nullable|string|max:500',
            'ai_analysis_id'      => 'nullable|integer|exists:ai_document_analyses,id',
            'action_items'              => 'nullable|array',
            'action_items.*.title'      => 'required_with:action_items|string|max:500',
            'action_items.*.description'=> 'nullable|string',
            'action_items.*.status'     => 'nullable|string|in:Open,In Progress,Resolved,Closed,Pending,Blocked,Deferred,Carried Forward',
            'action_items.*.priority'   => 'nullable|in:Low,Medium,High,Critical',
            'action_items.*.assigned_to'=> 'nullable|string|max:255',
            'action_items.*.due_date'   => 'nullable|date',
            'action_items.*.category'   => 'nullable|string|max:50',
            'action_items.*.remarks'    => 'nullable|string',
        ]);

        // Check unique week/year
        $exists = Mom::where('week_number', $request->input('week_number'))
            ->where('year', $request->input('year'))
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'A MOM for Week ' . $request->input('week_number') . ' of ' . $request->input('year') . ' already exists',
            ], 422);
        }

        try {
            $mom = DB::transaction(function () use ($request) {
                $mom = Mom::create([
                    'title'               => $request->input('title'),
                    'meeting_date'        => $request->input('meeting_date'),
                    'week_number'         => $request->input('week_number'),
                    'year'                => $request->input('year'),
                    'meeting_type'        => $request->input('meeting_type', 'Weekly HSE Meeting'),
                    'meeting_time'        => $request->input('meeting_time'),
                    'meeting_location'    => $request->input('meeting_location'),
                    'location'            => $request->input('meeting_location'),
                    'chaired_by'          => $request->input('chaired_by'),
                    'minutes_prepared_by' => $request->input('minutes_prepared_by'),
                    'site_project'        => $request->input('site_project'),
                    'client_name'         => $request->input('client_name'),
                    'attendees'           => $request->input('attendees'),
                    'summary'             => $request->input('summary'),
                    'previous_mom_id'     => $request->input('previous_mom_id'),
                    'notes'               => $request->input('notes'),
                    'attachments'         => $request->input('attachments', []),
                    'status'              => StatusConstants::MOM_OPEN,
                    'created_by'          => $request->user()?->id,
                    'updated_by'          => $request->user()?->id,
                    'recorded_by'         => $request->user()?->id,
                    'document_path'       => $request->input('document_path'),
                    'document_name'       => $request->input('document_name'),
                    'ai_analysis_id'      => $request->input('ai_analysis_id'),
                    'ai_analysed'         => $request->input('ai_analysis_id') ? 1 : 0,
                ]);

                // Auto-create MomPoints from action_items (AI-extracted or manually added)
                $actionItems = $request->input('action_items', []);
                if (is_array($actionItems) && count($actionItems) > 0) {
                    $pointNumber = 0;
                    foreach ($actionItems as $item) {
                        if (empty($item['title'])) continue;
                        $pointNumber++;

                        $status = $this->normalizePointStatus($item['status'] ?? 'Open');
                        $priority = $this->normalizePointPriority($item['priority'] ?? 'Medium');

                        $point = MomPoint::create([
                            'mom_id'       => $mom->id,
                            'point_number' => $pointNumber,
                            'title'        => $item['title'],
                            'description'  => $item['description'] ?? null,
                            'category'     => $item['category'] ?? 'Action Required',
                            'assigned_to'  => $item['assigned_to'] ?? null,
                            'status'       => $status,
                            'priority'     => $priority,
                            'due_date'     => $item['due_date'] ?? null,
                            'remarks'      => $item['remarks'] ?? null,
                            'original_mom_id' => $mom->id,
                            'created_by'   => $request->user()?->id,
                            'updated_by'   => $request->user()?->id,
                        ]);

                        MomPointUpdate::create([
                            'mom_point_id'    => $point->id,
                            'mom_id'          => $mom->id,
                            'week_number'     => $mom->week_number,
                            'year'            => $mom->year,
                            'new_status'      => $point->status,
                            'new_completion'  => 0,
                            'update_note'     => 'Point created from document analysis',
                            'updated_by'      => $request->user()?->id,
                            'updated_by_name' => $request->user()?->full_name ?? $request->user()?->email,
                        ]);
                    }

                    $mom->recalculatePointCounts();
                }

                return $mom;
            });

            // Fire notifications
            NotificationService::momCreated($mom, $request->user()?->id);

            return response()->json([
                'message' => 'MOM created successfully',
                'mom'     => $this->mapMomToList($mom->fresh()),
            ], 201);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    /**
     * GET /api/mom/{mom}
     */
    public function show(string $id): JsonResponse
    {
        $mom = Mom::with([
            'points' => function ($q) {
                $q->with(['updates' => function ($uq) {
                    $uq->orderBy('created_at', 'desc');
                }, 'assignee:id,full_name,email,role', 'photos']);
            },
            'previousMom:id,mom_code,week_number,year,title,meeting_date,open_points,total_points',
            'nextMom:id,mom_code,week_number,year,title,meeting_date',
            'createdByUser:id,full_name,email',
        ])->findOrFail($id);

        $result = $this->mapMomToDetail($mom);

        // Previous MOM open points for carry-forward display
        if ($mom->previous_mom_id) {
            $prevOpenPoints = MomPoint::where('mom_id', $mom->previous_mom_id)
                ->unresolved()
                ->with(['updates' => function ($q) {
                    $q->orderBy('created_at', 'desc')->limit(3);
                }])
                ->get()
                ->map(fn($p) => $this->mapPointToFrontend($p));

            $result['previous_mom_open_points'] = $prevOpenPoints;
        } else {
            $result['previous_mom_open_points'] = [];
        }

        return response()->json($result);
    }

    /**
     * PUT /api/mom/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $mom = Mom::findOrFail($id);

        $request->validate([
            'title'               => 'nullable|string|max:500',
            'meeting_date'        => 'nullable|date',
            'meeting_type'        => 'nullable|string|max:100',
            'meeting_time'        => 'nullable|date_format:H:i',
            'meeting_location'    => 'nullable|string|max:255',
            'chaired_by'          => 'nullable|string|max:255',
            'minutes_prepared_by' => 'nullable|string|max:255',
            'site_project'        => 'nullable|string|max:255',
            'client_name'         => 'nullable|string|max:255',
            'attendees'           => 'nullable|array',
            'summary'             => 'nullable|string',
            'notes'               => 'nullable|string',
            'action_items'              => 'nullable|array',
            'action_items.*.id'         => 'nullable|integer',
            'action_items.*.title'      => 'required_with:action_items|string|max:500',
            'action_items.*.description'=> 'nullable|string',
            'action_items.*.status'     => 'nullable|string|in:Open,In Progress,Resolved,Closed,Pending,Blocked,Deferred,Carried Forward',
            'action_items.*.priority'   => 'nullable|in:Low,Medium,High,Critical',
            'action_items.*.assigned_to'=> 'nullable|string|max:255',
            'action_items.*.due_date'   => 'nullable|date',
            'action_items.*.category'   => 'nullable|string|max:50',
            'action_items.*.remarks'    => 'nullable|string',
        ]);

        $fields = [];
        $fieldMap = [
            'title', 'meeting_date', 'meeting_type', 'meeting_time',
            'meeting_location', 'chaired_by', 'minutes_prepared_by',
            'site_project', 'client_name', 'attendees', 'summary',
            'notes', 'previous_mom_id',
            'document_path', 'document_name', 'ai_analysis_id',
        ];

        foreach ($fieldMap as $field) {
            if ($request->has($field)) {
                $fields[$field] = $request->input($field);
            }
        }

        // Handle ai_analysed flag
        if ($request->has('ai_analysis_id')) {
            $fields['ai_analysed'] = $request->input('ai_analysis_id') ? 1 : ($mom->ai_analysed ? 1 : 0);
        }

        // Handle attachments update
        if ($request->has('attachments')) {
            $fields['attachments'] = $request->input('attachments');
        }

        // Handle file removals
        if ($request->has('remove_files') && is_array($request->input('remove_files'))) {
            $current = $mom->attachments ?? [];
            $remove = $request->input('remove_files');
            $fields['attachments'] = array_values(array_diff($current, $remove));
        }

        if ($request->has('meeting_location')) {
            $fields['location'] = $request->input('meeting_location');
        }

        $fields['updated_by'] = $request->user()?->id;

        try {
            DB::transaction(function () use ($mom, $fields, $request) {
                $mom->update($fields);

                // Sync action items / points
                if ($request->has('action_items')) {
                    $actionItems = $request->input('action_items', []);
                    $existingPointIds = MomPoint::where('mom_id', $mom->id)->pluck('id')->toArray();
                    $submittedIds = [];

                    $pointNumber = 0;
                    foreach ($actionItems as $item) {
                        if (empty($item['title'])) continue;
                        $pointNumber++;

                        $status = $this->normalizePointStatus($item['status'] ?? 'Open');
                        $priority = $this->normalizePointPriority($item['priority'] ?? 'Medium');

                        if (!empty($item['id']) && in_array($item['id'], $existingPointIds)) {
                            // Update existing point
                            $point = MomPoint::find($item['id']);
                            if (!$point) continue;
                            $point->update([
                                'point_number' => $pointNumber,
                                'title'        => $item['title'],
                                'description'  => $item['description'] ?? null,
                                'category'     => $item['category'] ?? 'Action Required',
                                'assigned_to'  => $item['assigned_to'] ?? null,
                                'status'       => $status,
                                'priority'     => $priority,
                                'due_date'     => $this->parseDate($item['due_date'] ?? null),
                                'remarks'      => $item['remarks'] ?? null,
                                'updated_by'   => $request->user()?->id,
                            ]);
                            $submittedIds[] = $item['id'];
                        } else {
                            // Create new point
                            $point = MomPoint::create([
                                'mom_id'         => $mom->id,
                                'point_number'   => $pointNumber,
                                'title'          => $item['title'],
                                'description'    => $item['description'] ?? null,
                                'category'       => $item['category'] ?? 'Action Required',
                                'assigned_to'    => $item['assigned_to'] ?? null,
                                'status'         => $status,
                                'priority'       => $priority,
                                'due_date'       => $this->parseDate($item['due_date'] ?? null),
                                'remarks'        => $item['remarks'] ?? null,
                                'original_mom_id' => $mom->id,
                                'created_by'     => $request->user()?->id,
                                'updated_by'     => $request->user()?->id,
                            ]);
                            $submittedIds[] = $point->id;

                            MomPointUpdate::create([
                                'mom_point_id'    => $point->id,
                                'mom_id'          => $mom->id,
                                'week_number'     => $mom->week_number,
                                'year'            => $mom->year,
                                'new_status'      => $status,
                                'new_completion'  => 0,
                                'update_note'     => 'Point added during MOM edit',
                                'updated_by'      => $request->user()?->id,
                                'updated_by_name' => $request->user()?->full_name ?? $request->user()?->email,
                            ]);
                        }
                    }

                    // Delete points that were removed from the form
                    $toDelete = array_diff($existingPointIds, $submittedIds);
                    if (!empty($toDelete)) {
                        MomPoint::whereIn('id', $toDelete)->delete();
                    }

                    $mom->recalculatePointCounts();
                }
            });

            return response()->json([
                'message' => 'MOM updated successfully',
                'mom'     => $this->mapMomToList($mom->fresh()),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    /**
     * DELETE /api/mom/{id}
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $mom = Mom::findOrFail($id);
            $mom->deleted_by = Auth::user()?->full_name ?? Auth::user()?->email ?? 'System';
            $mom->save();
            $mom->delete();
            RecycleBinController::logDeleteAction('mom', $mom);

            return response()->json(['message' => 'MOM deleted successfully']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    /**
     * POST /api/mom/{id}/points
     */
    public function addPoint(Request $request, string $id): JsonResponse
    {
        $mom = Mom::findOrFail($id);

        $request->validate([
            'title'                 => 'required|string|max:500',
            'description'           => 'nullable|string',
            'category'              => 'nullable|string|max:50',
            'raised_by'             => 'nullable|string|max:255',
            'assigned_to'           => 'nullable|string|max:255',
            'assigned_to_id'        => 'nullable|string|exists:users,id',
            'status'                => 'nullable|string|in:Open,In Progress,Resolved,Closed,Pending,Blocked,Deferred,Carried Forward',
            'priority'              => 'nullable|in:Low,Medium,High,Critical',
            'due_date'              => 'nullable|date',
            'remarks'               => 'nullable|string',
            'is_recurring'          => 'nullable|boolean',
            'carried_from_point_id' => 'nullable|integer|exists:mom_points,id',
            'original_mom_id'       => 'nullable|string|exists:moms,id',
            'carry_count'           => 'nullable|integer',
        ]);

        $point = DB::transaction(function () use ($request, $mom) {
            $pointNumber = (MomPoint::where('mom_id', $mom->id)->max('point_number') ?? 0) + 1;

            $point = MomPoint::create([
                'mom_id'                => $mom->id,
                'point_number'          => $pointNumber,
                'title'                 => $request->input('title'),
                'description'           => $request->input('description'),
                'category'              => $request->input('category', 'Action Required'),
                'raised_by'             => $request->input('raised_by'),
                'assigned_to'           => $request->input('assigned_to'),
                'assigned_to_id'        => $request->input('assigned_to_id'),
                'status'                => $request->input('status', 'Open'),
                'priority'              => $request->input('priority', 'Medium'),
                'due_date'              => $request->input('due_date'),
                'remarks'               => $request->input('remarks'),
                'is_recurring'          => $request->input('is_recurring', false),
                'carried_from_point_id' => $request->input('carried_from_point_id'),
                'original_mom_id'       => $request->input('original_mom_id', $mom->id),
                'carry_count'           => $request->input('carry_count', 0),
                'created_by'            => $request->user()?->id,
                'updated_by'            => $request->user()?->id,
            ]);

            // Create initial update log
            MomPointUpdate::create([
                'mom_point_id'    => $point->id,
                'mom_id'          => $mom->id,
                'week_number'     => $mom->week_number,
                'year'            => $mom->year,
                'new_status'      => $point->status,
                'new_completion'  => 0,
                'update_note'     => 'Point created',
                'updated_by'      => $request->user()?->id,
                'updated_by_name' => $request->user()?->full_name ?? $request->user()?->email,
            ]);

            return $point;
        });

        $mom->recalculatePointCounts();

        return response()->json([
            'message' => 'Point added successfully',
            'point'   => $this->mapPointToFrontend($point->fresh()->load('updates')),
        ], 201);
    }

    /**
     * PUT /api/mom/{momId}/points/{pointId}
     */
    public function updatePoint(Request $request, string $momId, int $pointId): JsonResponse
    {
        $mom = Mom::findOrFail($momId);
        $point = MomPoint::where('mom_id', $mom->id)->findOrFail($pointId);

        $request->validate([
            'title'          => 'nullable|string|max:500',
            'description'    => 'nullable|string',
            'category'       => 'nullable|string|max:50',
            'raised_by'      => 'nullable|string|max:255',
            'assigned_to'    => 'nullable|string|max:255',
            'assigned_to_id' => 'nullable|string|exists:users,id',
            'status'         => 'nullable|string|in:Open,In Progress,Resolved,Closed,Pending,Blocked,Deferred,Carried Forward',
            'priority'       => 'nullable|in:Low,Medium,High,Critical',
            'due_date'       => 'nullable|date',
            'completion_percentage' => 'nullable|integer|min:0|max:100',
            'remarks'        => 'nullable|string',
            'is_recurring'   => 'nullable|boolean',
            'update_note'    => 'nullable|string',
        ]);

        $oldStatus = $point->status;
        $oldCompletion = $point->completion_percentage;

        $fields = [];
        $fieldList = [
            'title', 'description', 'category', 'raised_by',
            'assigned_to', 'assigned_to_id', 'status', 'priority',
            'due_date', 'completion_percentage', 'remarks', 'is_recurring',
        ];

        foreach ($fieldList as $field) {
            if ($request->has($field)) {
                $fields[$field] = $request->input($field);
            }
        }

        $fields['updated_by'] = $request->user()?->id;

        $newStatus = $request->input('status', $oldStatus);
        $newCompletion = $request->input('completion_percentage', $oldCompletion);

        // Handle status change
        if ($newStatus !== $oldStatus || $newCompletion !== $oldCompletion) {
            MomPointUpdate::create([
                'mom_point_id'    => $point->id,
                'mom_id'          => $mom->id,
                'week_number'     => $mom->week_number,
                'year'            => $mom->year,
                'old_status'      => $oldStatus,
                'new_status'      => $newStatus,
                'old_completion'  => $oldCompletion,
                'new_completion'  => $newCompletion,
                'update_note'     => $request->input('update_note', 'Status updated'),
                'updated_by'      => $request->user()?->id,
                'updated_by_name' => $request->user()?->full_name ?? $request->user()?->email,
            ]);
        }

        // Closure handling
        if (in_array($newStatus, ['Resolved', 'Closed']) && !in_array($oldStatus, ['Resolved', 'Closed'])) {
            $fields['resolved_at'] = now();
            $fields['resolved_by'] = $request->user()?->id;
            if ($request->has('update_note')) {
                $fields['resolution_summary'] = $request->input('update_note');
            }
        }

        $point->update($fields);

        $mom->recalculatePointCounts();

        return response()->json([
            'message' => 'Point updated successfully',
            'point'   => $this->mapPointToFrontend($point->fresh()->load('updates')),
        ]);
    }

    /**
     * DELETE /api/mom/{momId}/points/{pointId}
     */
    public function deletePoint(string $momId, int $pointId): JsonResponse
    {
        $mom = Mom::findOrFail($momId);
        $point = MomPoint::where('mom_id', $mom->id)->findOrFail($pointId);
        $point->delete();

        $mom->recalculatePointCounts();

        return response()->json(['message' => 'Point deleted successfully']);
    }

    /**
     * POST /api/mom/{id}/carry-forward
     */
    public function carryForward(Request $request, string $id): JsonResponse
    {
        $mom = Mom::findOrFail($id);

        $request->validate([
            'point_ids'   => 'required|array|min:1',
            'point_ids.*' => 'integer|exists:mom_points,id',
        ]);

        $pointIds = $request->input('point_ids');

        // Validate points belong to the previous MOM
        $points = MomPoint::whereIn('id', $pointIds)->get();

        $newPoints = [];

        DB::transaction(function () use ($mom, $points, $request, &$newPoints) {
            foreach ($points as $originalPoint) {
                $pointNumber = (MomPoint::where('mom_id', $mom->id)->max('point_number') ?? 0) + 1;

                $newPoint = MomPoint::create([
                    'mom_id'                => $mom->id,
                    'point_number'          => $pointNumber,
                    'title'                 => $originalPoint->title,
                    'description'           => $originalPoint->description,
                    'category'              => $originalPoint->category,
                    'raised_by'             => $originalPoint->raised_by,
                    'assigned_to'           => $originalPoint->assigned_to,
                    'assigned_to_id'        => $originalPoint->assigned_to_id,
                    'priority'              => $originalPoint->priority,
                    'due_date'              => $originalPoint->due_date,
                    'remarks'               => $originalPoint->remarks,
                    'status'                => StatusConstants::MOM_POINT_OPEN,
                    'carried_from_point_id' => $originalPoint->id,
                    'original_mom_id'       => $originalPoint->original_mom_id ?? $originalPoint->mom_id,
                    'carry_count'           => $originalPoint->carry_count + 1,
                    'is_recurring'          => $originalPoint->is_recurring,
                    'created_by'            => $request->user()?->id,
                    'updated_by'            => $request->user()?->id,
                ]);

                // Mark original point as Carried Forward
                $originalPoint->update(['status' => StatusConstants::MOM_POINT_CARRIED_FORWARD, 'updated_by' => $request->user()?->id]);

                // Log on original point
                $origMom = Mom::find($originalPoint->mom_id);
                MomPointUpdate::create([
                    'mom_point_id'    => $originalPoint->id,
                    'mom_id'          => $mom->id,
                    'week_number'     => $mom->week_number,
                    'year'            => $mom->year,
                    'old_status'      => $originalPoint->getOriginal('status'),
                    'new_status'      => StatusConstants::MOM_POINT_CARRIED_FORWARD,
                    'update_note'     => 'Carried forward to Week ' . $mom->week_number . ' MOM',
                    'updated_by'      => $request->user()?->id,
                    'updated_by_name' => $request->user()?->full_name ?? $request->user()?->email,
                ]);

                // Log on new point
                MomPointUpdate::create([
                    'mom_point_id'    => $newPoint->id,
                    'mom_id'          => $mom->id,
                    'week_number'     => $mom->week_number,
                    'year'            => $mom->year,
                    'new_status'      => StatusConstants::MOM_POINT_OPEN,
                    'update_note'     => 'Carried forward from Week ' . ($origMom?->week_number ?? '?') . ' MOM',
                    'updated_by'      => $request->user()?->id,
                    'updated_by_name' => $request->user()?->full_name ?? $request->user()?->email,
                ]);

                $newPoints[] = $this->mapPointToFrontend($newPoint->fresh()->load('updates'));
            }

            // Recalculate counts on both MOMs
            $mom->recalculatePointCounts();
            if ($points->first()) {
                Mom::find($points->first()->mom_id)?->recalculatePointCounts();
            }
        });

        return response()->json([
            'message'    => count($newPoints) . ' points carried forward successfully',
            'carried'    => count($newPoints),
            'new_points' => $newPoints,
        ]);
    }

    /**
     * GET /api/mom/stats
     */
    public function stats(Request $request): JsonResponse
    {
        $year = (int) $request->get('year', now()->year);

        $kpis = DB::selectOne("
            SELECT
                COUNT(*) as total_moms,
                (SELECT COUNT(*) FROM mom_points mp JOIN moms m ON mp.mom_id = m.id WHERE m.year = ? AND m.deleted_at IS NULL) as total_points,
                (SELECT COUNT(*) FROM mom_points mp JOIN moms m ON mp.mom_id = m.id WHERE m.year = ? AND m.deleted_at IS NULL AND mp.status IN ('Open','Pending','Blocked')) as open_points,
                (SELECT COUNT(*) FROM mom_points mp JOIN moms m ON mp.mom_id = m.id WHERE m.year = ? AND m.deleted_at IS NULL AND mp.status = 'In Progress') as in_progress,
                (SELECT COUNT(*) FROM mom_points mp JOIN moms m ON mp.mom_id = m.id WHERE m.year = ? AND m.deleted_at IS NULL AND mp.status = 'Resolved') as resolved,
                (SELECT COUNT(*) FROM mom_points mp JOIN moms m ON mp.mom_id = m.id WHERE m.year = ? AND m.deleted_at IS NULL AND mp.due_date < CURDATE() AND mp.status NOT IN ('Resolved','Closed','Carried Forward')) as overdue
            FROM moms
            WHERE year = ? AND deleted_at IS NULL
        ", [$year, $year, $year, $year, $year, $year]);

        // This week's points
        $currentWeek = (int) now()->format('W');
        $thisWeekPoints = DB::selectOne("
            SELECT COUNT(*) as cnt FROM mom_points mp
            JOIN moms m ON mp.mom_id = m.id
            WHERE m.week_number = ? AND m.year = ? AND m.deleted_at IS NULL
        ", [$currentWeek, $year]);

        // Weekly trend (last 12 weeks)
        $weeklyTrend = DB::select("
            SELECT m.week_number, m.year,
                COUNT(mp.id) as total,
                SUM(mp.status IN ('Open','Pending','Blocked')) as open_count,
                SUM(mp.status IN ('Resolved','Closed')) as resolved
            FROM moms m
            LEFT JOIN mom_points mp ON mp.mom_id = m.id
            WHERE m.deleted_at IS NULL AND m.year = ?
            GROUP BY m.week_number, m.year
            ORDER BY m.week_number DESC
            LIMIT 12
        ", [$year]);

        // By category
        $byCategory = DB::select("
            SELECT mp.category, COUNT(*) as total
            FROM mom_points mp
            JOIN moms m ON mp.mom_id = m.id
            WHERE m.year = ? AND m.deleted_at IS NULL AND mp.category IS NOT NULL AND mp.category != ''
            GROUP BY mp.category ORDER BY total DESC
        ", [$year]);

        // By assignee
        $byAssignee = DB::select("
            SELECT mp.assigned_to, COUNT(*) as total,
                SUM(mp.status IN ('Open','Pending','Blocked')) as open_count,
                SUM(mp.status IN ('Resolved','Closed')) as resolved
            FROM mom_points mp
            JOIN moms m ON mp.mom_id = m.id
            WHERE m.year = ? AND m.deleted_at IS NULL AND mp.assigned_to IS NOT NULL AND mp.assigned_to != ''
            GROUP BY mp.assigned_to ORDER BY total DESC
            LIMIT 15
        ", [$year]);

        // Recent overdue (top 10)
        $recentOverdue = DB::select("
            SELECT mp.id, mp.point_code, mp.title, mp.status, mp.priority, mp.assigned_to,
                mp.due_date, mp.category, m.week_number, m.year,
                DATEDIFF(CURDATE(), mp.due_date) as days_overdue
            FROM mom_points mp
            JOIN moms m ON mp.mom_id = m.id
            WHERE m.deleted_at IS NULL AND mp.due_date < CURDATE()
                AND mp.status NOT IN ('Resolved','Closed','Carried Forward')
            ORDER BY mp.due_date ASC
            LIMIT 10
        ");

        return response()->json([
            'kpis' => [
                'total_moms'  => (int) ($kpis->total_moms ?? 0),
                'total_points' => (int) ($kpis->total_points ?? 0),
                'open_points' => (int) ($kpis->open_points ?? 0),
                'in_progress' => (int) ($kpis->in_progress ?? 0),
                'resolved'    => (int) ($kpis->resolved ?? 0),
                'overdue'     => (int) ($kpis->overdue ?? 0),
                'this_week'   => (int) ($thisWeekPoints->cnt ?? 0),
            ],
            'weekly_trend'   => array_map(fn($r) => [
                'week_number' => (int) $r->week_number,
                'year'        => (int) $r->year,
                'total'       => (int) ($r->total ?? 0),
                'open'        => (int) ($r->open_count ?? 0),
                'resolved'    => (int) ($r->resolved ?? 0),
            ], array_reverse($weeklyTrend)),
            'by_category'    => array_map(fn($r) => ['category' => $r->category, 'total' => (int) $r->total], $byCategory),
            'by_assignee'    => array_map(fn($r) => [
                'assigned_to' => $r->assigned_to,
                'total'       => (int) $r->total,
                'open'        => (int) ($r->open_count ?? 0),
                'resolved'    => (int) ($r->resolved ?? 0),
            ], $byAssignee),
            'recent_overdue' => array_map(fn($r) => [
                'id'           => (int) $r->id,
                'point_code'   => $r->point_code,
                'title'        => $r->title,
                'status'       => $r->status,
                'priority'     => $r->priority,
                'assigned_to'  => $r->assigned_to,
                'due_date'     => $r->due_date,
                'category'     => $r->category,
                'week_number'  => (int) $r->week_number,
                'year'         => (int) $r->year,
                'days_overdue' => (int) $r->days_overdue,
            ], $recentOverdue),
        ]);
    }

    /**
     * GET /api/mom/export
     */
    public function export(Request $request)
    {
        $query = Mom::with(['points.photos']);

        // Text search
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('mom_code', 'like', "%{$search}%")
                  ->orWhere('ref_number', 'like', "%{$search}%")
                  ->orWhere('chaired_by', 'like', "%{$search}%")
                  ->orWhere('client_name', 'like', "%{$search}%");
            });
        }

        if ($year = $request->get('year')) {
            $query->where('year', (int) $year);
        }
        if ($week = $request->get('week_number')) {
            $query->where('week_number', (int) $week);
        }
        if ($type = $request->get('meeting_type')) {
            $query->where('meeting_type', $type);
        }
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($request->get('has_open_points')) {
            $query->where('open_points', '>', 0);
        }
        if ($request->get('has_overdue')) {
            $query->where('overdue_points', '>', 0);
        }
        if ($from = $request->get('date_from')) {
            $query->whereDate('meeting_date', '>=', $from);
        }
        if ($to = $request->get('date_to')) {
            $query->whereDate('meeting_date', '<=', $to);
        }

        // Period shortcuts
        if ($period = $request->get('period')) {
            match ($period) {
                'week' => $query->whereBetween('meeting_date', [
                    now()->startOfWeek(), now()->endOfWeek(),
                ]),
                'month' => $query->whereMonth('meeting_date', now()->month)
                                 ->whereYear('meeting_date', now()->year),
                'year' => $query->whereYear('meeting_date', now()->year),
                default => null,
            };
        }

        $moms = $query->orderBy('meeting_date', 'desc')->get();

        $headers = [
            'MOM Code', 'Week', 'Year', 'Meeting Date', 'Title',
            'Meeting Type', 'Chaired By', 'Client',
            'Point Code', 'Point #', 'Point Title', 'Description',
            'Category', 'Raised By', 'Assigned To', 'Status', 'Priority',
            'Due Date', 'Completion %', 'Remarks', 'Carry Count',
            'Original Week', 'Is Overdue', 'Resolved At', 'Photos',
        ];

        // Pre-load all original MOMs to avoid N+1 queries
        $allPoints = $moms->flatMap->points;
        $originalMomIds = collect($allPoints)->pluck('original_mom_id')->unique()->filter();
        $originalMoms = Mom::whereIn('id', $originalMomIds)->pluck('week_number', 'id');

        $rows = [];
        foreach ($moms as $mom) {
            if ($mom->points->isEmpty()) {
                $rows[] = [
                    $mom->mom_code ?? $mom->ref_number, $mom->week_number, $mom->year,
                    $mom->meeting_date?->format('Y-m-d'), $mom->title,
                    $mom->meeting_type, $mom->chaired_by, $mom->client_name,
                    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
                ];
            } else {
                foreach ($mom->points as $point) {
                    $origMomWeek = $point->original_mom_id ? $originalMoms->get($point->original_mom_id) : null;
                    $photoCount = $point->photos ? $point->photos->count() : 0;
                    $photoRefs = $photoCount > 0
                        ? $point->photos->pluck('original_name')->implode(', ')
                        : '';
                    $rows[] = [
                        $mom->mom_code ?? $mom->ref_number, $mom->week_number, $mom->year,
                        $mom->meeting_date?->format('Y-m-d'), $mom->title,
                        $mom->meeting_type, $mom->chaired_by, $mom->client_name,
                        $point->point_code, $point->point_number, $point->title,
                        $point->description, $point->category, $point->raised_by,
                        $point->assigned_to, $point->status, $point->priority,
                        $point->due_date?->format('Y-m-d'), $point->completion_percentage,
                        $point->remarks, $point->carry_count,
                        $origMomWeek ? 'Week ' . $origMomWeek : '',
                        $point->is_overdue ? 'Yes' : 'No',
                        $point->resolved_at?->format('Y-m-d H:i'),
                        $photoCount > 0 ? $photoCount . ' photo(s): ' . $photoRefs : '',
                    ];
                }
            }
        }

        return $this->exportAs($headers, $rows, 'Weekly_MOM', $request->get('format', 'csv'));
    }

    /**
     * GET /api/mom/points/search
     */
    public function searchPoints(Request $request): JsonResponse
    {
        $query = MomPoint::with(['mom:id,mom_code,week_number,year,title,meeting_date']);

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('point_code', 'like', "%{$search}%");
            });
        }

        if ($status = $request->get('status')) {
            if (is_array($status)) {
                $query->whereIn('status', $status);
            } else {
                $query->where('status', $status);
            }
        }
        if ($assignedTo = $request->get('assigned_to')) {
            $query->where('assigned_to', 'like', "%{$assignedTo}%");
        }
        if ($category = $request->get('category')) {
            $query->where('category', $category);
        }
        if ($priority = $request->get('priority')) {
            $query->where('priority', $priority);
        }
        if ($request->get('overdue')) {
            $query->overdue();
        }
        if ($year = $request->get('year')) {
            $query->whereHas('mom', fn($q) => $q->where('year', (int) $year)->whereNull('deleted_at'));
        }
        if ($week = $request->get('week_number')) {
            $query->whereHas('mom', fn($q) => $q->where('week_number', (int) $week)->whereNull('deleted_at'));
        }
        if ($momId = $request->get('mom_id')) {
            $query->where('mom_id', $momId);
        }
        if ($from = $request->get('date_from')) {
            $query->whereDate('due_date', '>=', $from);
        }
        if ($to = $request->get('date_to')) {
            $query->whereDate('due_date', '<=', $to);
        }

        $perPage = min(100, max(1, (int) $request->get('per_page', 25)));
        $paginated = $query->orderBy('created_at', 'desc')->paginate($perPage);

        $data = collect($paginated->items())->map(fn($p) => $this->mapPointToFrontend($p));

        return response()->json([
            'data'      => $data,
            'total'     => $paginated->total(),
            'page'      => $paginated->currentPage(),
            'per_page'  => $paginated->perPage(),
            'last_page' => $paginated->lastPage(),
        ]);
    }

    /**
     * POST /api/mom/upload
     */
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
            $size = $file->getSize();
            $mimetype = $file->getClientMimeType();

            $name = 'mom-' . time() . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
            $subDir = 'moms/attachments';
            $file->move(storage_path('app/public/' . $subDir), $name);

            $uploaded[] = [
                'filename'     => $subDir . '/' . $name,
                'originalName' => $originalName,
                'size'         => $size,
                'mimetype'     => $mimetype,
            ];
        }

        return response()->json(['message' => 'Files uploaded successfully', 'files' => $uploaded]);
    }

    /**
     * POST /api/mom/import
     * Upload a weekly MOM document, parse it, extract tasks, and create MOM + points.
     */
    public function importDocument(Request $request): JsonResponse
    {
        $request->validate([
            'file'        => 'required|file|max:20480|mimes:pdf,doc,docx,xls,xlsx,csv,ppt,pptx,txt',
            'week_number' => 'nullable|integer|min:1|max:53',
            'year'        => 'nullable|integer',
            'title'       => 'nullable|string|max:500',
            'meeting_date' => 'nullable|date',
            'mode'        => 'nullable|in:create,merge,replace',
        ]);

        $file = $request->file('file');
        $mode = $request->input('mode', 'create');
        $user = $request->user();

        // Store the uploaded file
        $originalName = $file->getClientOriginalName();
        $ext = $file->getClientOriginalExtension();
        $storedName = 'mom-import-' . time() . '-' . Str::random(6) . '.' . $ext;
        $subDir = 'moms/imports';
        $file->move(storage_path('app/public/' . $subDir), $storedName);
        $storedPath = $subDir . '/' . $storedName;

        // Parse the document
        $parser = new DocumentParserService();
        $filePath = storage_path('app/public/' . $storedPath);
        $parsed = null;

        try {
            $parsed = $parser->parse($filePath, strtolower($ext));
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Failed to parse document: ' . $e->getMessage(),
            ], 422);
        }

        if (!$parsed) {
            return response()->json(['message' => 'Could not extract content from the document'], 422);
        }

        // Analyze the structure
        $analyzer = new DocumentAnalyzerService();
        $analyzed = $analyzer->analyze($parsed);

        // Extract metadata
        $docMeta = $analyzed['document_metadata'] ?? [];
        $weekNumber = $request->input('week_number')
            ?? (int) ($docMeta['week_number'] ?? $docMeta['week'] ?? now()->format('W'));
        $year = $request->input('year')
            ?? (int) ($docMeta['year'] ?? now()->year);
        $meetingDate = $request->input('meeting_date')
            ?? $this->parseDate($docMeta['meeting_date'] ?? $docMeta['date'] ?? null);
        $title = $request->input('title')
            ?? ($docMeta['meeting_title'] ?? $docMeta['title'] ?? 'HSE Weekly Meeting Week ' . $weekNumber);

        // Check for existing MOM for this week
        $existingMom = Mom::where('week_number', $weekNumber)
            ->where('year', $year)
            ->first();

        if ($existingMom && $mode === 'create') {
            // Return preview with warning about existing MOM
            $extractedPoints = $this->extractPointsFromParsed($analyzed);

            return response()->json([
                'message'          => 'A MOM for Week ' . $weekNumber . ' of ' . $year . ' already exists.',
                'existing_mom'     => $this->mapMomToList($existingMom),
                'extracted_points' => $extractedPoints,
                'document_metadata' => [
                    'week_number'  => $weekNumber,
                    'year'         => $year,
                    'title'        => $title,
                    'meeting_date' => $meetingDate,
                    'file_name'    => $originalName,
                ],
                'requires_action'  => 'duplicate',
                'file_path'        => $storedPath,
            ], 409);
        }

        // Extract points from parsed content
        $extractedPoints = $this->extractPointsFromParsed($analyzed);

        if ($request->input('preview_only')) {
            return response()->json([
                'message'           => 'Document analyzed successfully',
                'extracted_points'  => $extractedPoints,
                'document_metadata' => [
                    'week_number'  => $weekNumber,
                    'year'         => $year,
                    'title'        => $title,
                    'meeting_date' => $meetingDate,
                    'file_name'    => $originalName,
                ],
                'file_path' => $storedPath,
                'total_extracted' => count($extractedPoints),
            ]);
        }

        // Create or merge into MOM
        $result = DB::transaction(function () use (
            $existingMom, $mode, $weekNumber, $year, $title, $meetingDate,
            $extractedPoints, $storedPath, $originalName, $user, $docMeta
        ) {
            $mom = $existingMom;

            if ($mode === 'replace' && $existingMom) {
                // Delete existing points and re-import
                MomPoint::where('mom_id', $existingMom->id)->delete();
                $existingMom->update([
                    'title'                => $title,
                    'meeting_date'         => $meetingDate,
                    'source_document_path' => $storedPath,
                    'source_document_name' => $originalName,
                    'imported_at'          => now(),
                    'updated_by'           => $user?->id,
                    'chaired_by'           => $docMeta['chaired_by'] ?? $existingMom->chaired_by,
                    'site_project'         => $docMeta['area_name'] ?? $docMeta['site'] ?? $existingMom->site_project,
                ]);
                $mom = $existingMom;
            } elseif ($mode === 'merge' && $existingMom) {
                // Append new points to existing MOM
                $existingMom->update([
                    'source_document_path' => $storedPath,
                    'source_document_name' => $originalName,
                    'imported_at'          => now(),
                    'updated_by'           => $user?->id,
                ]);
                $mom = $existingMom;
            } else {
                // Create new MOM
                $prevMom = Mom::where('year', $year)
                    ->where('week_number', '<', $weekNumber)
                    ->orderBy('week_number', 'desc')
                    ->first();

                $mom = Mom::create([
                    'title'                => $title,
                    'meeting_date'         => $meetingDate,
                    'week_number'          => $weekNumber,
                    'year'                 => $year,
                    'meeting_type'         => 'Weekly HSE Meeting',
                    'chaired_by'           => $docMeta['chaired_by'] ?? null,
                    'site_project'         => $docMeta['area_name'] ?? $docMeta['site'] ?? null,
                    'client_name'          => $docMeta['client'] ?? null,
                    'summary'              => $docMeta['summary'] ?? null,
                    'previous_mom_id'      => $prevMom?->id,
                    'attachments'          => [$storedPath],
                    'status'               => StatusConstants::MOM_OPEN,
                    'source_document_path' => $storedPath,
                    'source_document_name' => $originalName,
                    'imported_at'          => now(),
                    'created_by'           => $user?->id,
                    'updated_by'           => $user?->id,
                    'recorded_by'          => $user?->id,
                ]);
            }

            // Create points
            $created = 0;
            $skipped = 0;
            $startNumber = (MomPoint::where('mom_id', $mom->id)->max('point_number') ?? 0) + 1;
            $normalizer = new StatusNormalizer();

            foreach ($extractedPoints as $idx => $ep) {
                // Duplicate check within same MOM
                if ($mode === 'merge') {
                    $dup = MomPoint::where('mom_id', $mom->id)
                        ->where('title', $ep['title'])
                        ->exists();
                    if ($dup) {
                        $skipped++;
                        continue;
                    }
                }

                $pointNumber = $startNumber + $created;
                $rawStatus = $ep['status'] ?? 'Open';
                $normalizedStatus = $normalizer->normalize($rawStatus, 'mom_points');

                $point = MomPoint::create([
                    'mom_id'                    => $mom->id,
                    'point_number'              => $pointNumber,
                    'title'                     => $ep['title'] ?? 'Untitled Point',
                    'description'               => $ep['description'] ?? null,
                    'category'                  => $ep['category'] ?? 'Action Required',
                    'raised_by'                 => $ep['raised_by'] ?? null,
                    'assigned_to'               => $ep['assigned_to'] ?? null,
                    'status'                    => $normalizedStatus,
                    'priority'                  => $this->normalizePriority($ep['priority'] ?? 'Medium'),
                    'due_date'                  => $this->parseDate($ep['due_date'] ?? null),
                    'remarks'                   => $ep['remarks'] ?? null,
                    'source_slide_no'           => $ep['source_slide_no'] ?? null,
                    'section_name'              => $ep['section_name'] ?? null,
                    'source_document_reference' => $originalName,
                    'source_row_no'             => $ep['source_row_no'] ?? ($idx + 1),
                    'original_mom_id'           => $mom->id,
                    'created_by'                => $user?->id,
                    'updated_by'                => $user?->id,
                ]);

                // Create initial update log
                MomPointUpdate::create([
                    'mom_point_id'    => $point->id,
                    'mom_id'          => $mom->id,
                    'week_number'     => $mom->week_number,
                    'year'            => $mom->year,
                    'new_status'      => $normalizedStatus,
                    'new_completion'  => 0,
                    'update_note'     => 'Imported from document: ' . $originalName,
                    'updated_by'      => $user?->id,
                    'updated_by_name' => $user?->full_name ?? $user?->email ?? 'System',
                ]);

                $created++;
            }

            $mom->recalculatePointCounts();

            return [
                'mom'     => $mom->fresh(),
                'created' => $created,
                'skipped' => $skipped,
                'mode'    => $mode,
            ];
        });

        $mom = $result['mom'];

        return response()->json([
            'message' => $result['created'] . ' points imported successfully'
                . ($result['skipped'] > 0 ? ' (' . $result['skipped'] . ' duplicates skipped)' : ''),
            'mom'     => $this->mapMomToList($mom),
            'summary' => [
                'created' => $result['created'],
                'skipped' => $result['skipped'],
                'total_points' => $mom->total_points,
                'mode'    => $result['mode'],
            ],
        ], 201);
    }

    /**
     * POST /api/mom/import/confirm
     * Confirm a previewed import (using stored file path).
     */
    public function confirmImport(Request $request): JsonResponse
    {
        $request->validate([
            'file_path'    => 'required|string',
            'week_number'  => 'required|integer|min:1|max:53',
            'year'         => 'required|integer',
            'title'        => 'required|string|max:500',
            'meeting_date' => 'nullable|date',
            'mode'         => 'required|in:create,merge,replace',
            'points'       => 'nullable|array',
            'skip_indices' => 'nullable|array',
        ]);

        // Re-parse from stored file
        $storedPath = $request->input('file_path');
        $fullPath = storage_path('app/public/' . $storedPath);

        if (!file_exists($fullPath)) {
            return response()->json(['message' => 'Uploaded file not found. Please re-upload.'], 404);
        }

        $ext = pathinfo($fullPath, PATHINFO_EXTENSION);
        $parser = new DocumentParserService();

        try {
            $parsed = $parser->parse($fullPath, strtolower($ext));
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to re-parse document'], 422);
        }

        $analyzer = new DocumentAnalyzerService();
        $analyzed = $analyzer->analyze($parsed);
        $extractedPoints = $request->input('points') ?? $this->extractPointsFromParsed($analyzed);

        // Apply skip list
        $skipIndices = $request->input('skip_indices', []);
        $filteredPoints = [];
        foreach ($extractedPoints as $i => $p) {
            if (!in_array($i, $skipIndices)) {
                $filteredPoints[] = $p;
            }
        }

        // Forward to actual import
        $importRequest = new Request([
            'week_number'  => $request->input('week_number'),
            'year'         => $request->input('year'),
            'title'        => $request->input('title'),
            'meeting_date' => $request->input('meeting_date'),
            'mode'         => $request->input('mode'),
        ]);
        $importRequest->setUserResolver(fn() => $request->user());

        // Use the filtered points directly
        return DB::transaction(function () use ($request, $filteredPoints, $storedPath) {
            $user = $request->user();
            $weekNumber = $request->input('week_number');
            $year = $request->input('year');
            $title = $request->input('title');
            $meetingDate = $request->input('meeting_date');
            $mode = $request->input('mode');
            $originalName = basename($storedPath);

            $existingMom = Mom::where('week_number', $weekNumber)
                ->where('year', $year)
                ->first();

            $mom = $existingMom;

            if ($mode === 'replace' && $existingMom) {
                MomPoint::where('mom_id', $existingMom->id)->delete();
                $existingMom->update([
                    'title'                => $title,
                    'meeting_date'         => $meetingDate,
                    'source_document_path' => $storedPath,
                    'source_document_name' => $originalName,
                    'imported_at'          => now(),
                    'updated_by'           => $user?->id,
                ]);
            } elseif ($mode === 'merge' && $existingMom) {
                $existingMom->update([
                    'source_document_path' => $storedPath,
                    'source_document_name' => $originalName,
                    'imported_at'          => now(),
                    'updated_by'           => $user?->id,
                ]);
            } else {
                $prevMom = Mom::where('year', $year)
                    ->where('week_number', '<', $weekNumber)
                    ->orderBy('week_number', 'desc')
                    ->first();

                $mom = Mom::create([
                    'title'                => $title,
                    'meeting_date'         => $meetingDate,
                    'week_number'          => $weekNumber,
                    'year'                 => $year,
                    'meeting_type'         => 'Weekly HSE Meeting',
                    'previous_mom_id'      => $prevMom?->id,
                    'attachments'          => [$storedPath],
                    'status'               => StatusConstants::MOM_OPEN,
                    'source_document_path' => $storedPath,
                    'source_document_name' => $originalName,
                    'imported_at'          => now(),
                    'created_by'           => $user?->id,
                    'updated_by'           => $user?->id,
                    'recorded_by'          => $user?->id,
                ]);
            }

            $created = 0;
            $startNumber = (MomPoint::where('mom_id', $mom->id)->max('point_number') ?? 0) + 1;
            $normalizer = new StatusNormalizer();

            foreach ($filteredPoints as $idx => $ep) {
                if ($mode === 'merge') {
                    $dup = MomPoint::where('mom_id', $mom->id)
                        ->where('title', $ep['title'] ?? '')
                        ->exists();
                    if ($dup) continue;
                }

                $pointNumber = $startNumber + $created;
                $rawStatus = $ep['status'] ?? 'Open';
                $normalizedStatus = $normalizer->normalize($rawStatus, 'mom_points');

                $point = MomPoint::create([
                    'mom_id'                    => $mom->id,
                    'point_number'              => $pointNumber,
                    'title'                     => $ep['title'] ?? 'Untitled Point',
                    'description'               => $ep['description'] ?? null,
                    'category'                  => $ep['category'] ?? 'Action Required',
                    'raised_by'                 => $ep['raised_by'] ?? null,
                    'assigned_to'               => $ep['assigned_to'] ?? null,
                    'status'                    => $normalizedStatus,
                    'priority'                  => $this->normalizePriority($ep['priority'] ?? 'Medium'),
                    'due_date'                  => $this->parseDate($ep['due_date'] ?? null),
                    'remarks'                   => $ep['remarks'] ?? null,
                    'section_name'              => $ep['section_name'] ?? null,
                    'source_document_reference' => $originalName,
                    'source_row_no'             => $ep['source_row_no'] ?? ($idx + 1),
                    'original_mom_id'           => $mom->id,
                    'created_by'                => $user?->id,
                    'updated_by'                => $user?->id,
                ]);

                MomPointUpdate::create([
                    'mom_point_id'    => $point->id,
                    'mom_id'          => $mom->id,
                    'week_number'     => $mom->week_number,
                    'year'            => $mom->year,
                    'new_status'      => $normalizedStatus,
                    'new_completion'  => 0,
                    'update_note'     => 'Imported from document',
                    'updated_by'      => $user?->id,
                    'updated_by_name' => $user?->full_name ?? $user?->email ?? 'System',
                ]);

                $created++;
            }

            $mom->recalculatePointCounts();

            return response()->json([
                'message' => $created . ' points imported successfully',
                'mom'     => $this->mapMomToList($mom->fresh()),
                'summary' => [
                    'created'      => $created,
                    'total_points' => $mom->fresh()->total_points,
                    'mode'         => $mode,
                ],
            ], 201);
        });
    }

    /**
     * POST /api/mom/{momId}/points/{pointId}/photos
     */
    public function uploadPointPhoto(Request $request, string $momId, int $pointId): JsonResponse
    {
        $mom = Mom::findOrFail($momId);
        $point = MomPoint::where('mom_id', $mom->id)->findOrFail($pointId);

        $request->validate([
            'photos'   => 'required',
            'photos.*' => 'file|max:10240|mimes:jpg,jpeg,png,gif,webp,bmp,pdf,doc,docx,xls,xlsx,csv,ppt,pptx,txt',
            'caption'  => 'nullable|string|max:500',
        ]);

        $files = $request->file('photos');
        if (!is_array($files)) $files = [$files];

        $uploaded = [];
        $user = $request->user();

        foreach ($files as $file) {
            if (!$file || !$file->isValid()) continue;

            $originalName = $file->getClientOriginalName();
            $ext = $file->getClientOriginalExtension();
            $fileSize = $file->getSize() ?? 0;
            $mimeType = $file->getClientMimeType() ?? 'image/jpeg';
            $name = 'mom-photo-' . $point->id . '-' . time() . '-' . Str::random(4) . '.' . $ext;
            $subDir = 'moms/point-photos';
            $file->move(storage_path('app/public/' . $subDir), $name);

            $photo = MomPointPhoto::create([
                'mom_point_id'    => $point->id,
                'mom_id'          => $mom->id,
                'file_name'       => $name,
                'original_name'   => $originalName,
                'file_path'       => $subDir . '/' . $name,
                'file_size'       => $fileSize,
                'mime_type'       => $mimeType,
                'caption'         => $request->input('caption'),
                'uploaded_by'     => $user?->id,
                'uploaded_by_name' => $user?->full_name ?? $user?->email,
                'created_at'      => now(),
            ]);

            $uploaded[] = $this->mapPhotoToFrontend($photo);
        }

        return response()->json([
            'message' => count($uploaded) . ' photo(s) uploaded successfully',
            'photos'  => $uploaded,
        ], 201);
    }

    /**
     * DELETE /api/mom/{momId}/points/{pointId}/photos/{photoId}
     */
    public function deletePointPhoto(string $momId, int $pointId, int $photoId): JsonResponse
    {
        $mom = Mom::findOrFail($momId);
        $point = MomPoint::where('mom_id', $mom->id)->findOrFail($pointId);
        $photo = MomPointPhoto::where('mom_point_id', $point->id)->findOrFail($photoId);

        // Delete file from disk
        $fullPath = storage_path('app/public/' . $photo->file_path);
        if (file_exists($fullPath)) {
            @unlink($fullPath);
        }

        $photo->delete();

        return response()->json(['message' => 'Photo deleted successfully']);
    }

    /**
     * GET /api/mom/{momId}/points/{pointId}/photos
     */
    public function getPointPhotos(string $momId, int $pointId): JsonResponse
    {
        $mom = Mom::findOrFail($momId);
        $point = MomPoint::where('mom_id', $mom->id)->findOrFail($pointId);
        $photos = MomPointPhoto::where('mom_point_id', $point->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($p) => $this->mapPhotoToFrontend($p));

        return response()->json(['photos' => $photos]);
    }

    // ─── Import helpers ────────────────────────────────

    /**
     * Extract structured action points from analyzed document content.
     */
    private function extractPointsFromParsed(array $analyzed): array
    {
        $points = [];

        // Extract from tables (richest data source)
        $tables = $analyzed['tables'] ?? [];
        foreach ($tables as $table) {
            $headers = $table['headers'] ?? ($table[0] ?? []);
            $rows = $table['rows'] ?? array_slice($table, 1);

            $headerMap = $this->mapTableHeaders($headers);

            foreach ($rows as $rowIdx => $row) {
                if (empty(implode('', array_map('trim', $row)))) continue;

                $point = $this->extractPointFromRow($row, $headerMap);
                if ($point && !empty($point['title'])) {
                    $point['source_row_no'] = $rowIdx + 1;
                    $points[] = $point;
                }
            }
        }

        // Extract from sections (bullet items, content blocks)
        $sections = $analyzed['sections'] ?? [];
        foreach ($sections as $sIdx => $section) {
            $sectionCategory = $section['category'] ?? 'general';
            if (in_array($sectionCategory, ['closing', 'weekly_header'])) continue;

            $heading = $section['heading'] ?? '';
            $items = $section['items'] ?? [];

            foreach ($items as $item) {
                $itemText = is_string($item) ? $item : ($item['text'] ?? $item['content'] ?? '');
                if (strlen(trim($itemText)) < 5) continue;

                $point = [
                    'title'       => $this->truncateText($itemText, 500),
                    'description' => strlen($itemText) > 500 ? $itemText : null,
                    'status'      => $item['status'] ?? $this->detectStatusInText($itemText),
                    'priority'    => $item['priority'] ?? $this->detectPriorityInText($itemText),
                    'assigned_to' => $item['assignee'] ?? $item['assigned_to'] ?? $this->detectAssigneeInText($itemText),
                    'due_date'    => $this->parseDate($item['date'] ?? $item['due_date'] ?? null),
                    'category'    => $this->mapSectionToCategory($heading, $sectionCategory),
                    'section_name' => $heading,
                    'source_slide_no' => $section['slide_number'] ?? null,
                    'remarks'     => $item['remarks'] ?? null,
                ];

                // Avoid duplicates
                $isDup = false;
                foreach ($points as $existing) {
                    if ($existing['title'] === $point['title']) {
                        $isDup = true;
                        break;
                    }
                }
                if (!$isDup) {
                    $points[] = $point;
                }
            }

            // If no items but has content with actionable bullet points
            if (empty($items) && !empty($section['content'])) {
                $bullets = $this->extractBulletPoints($section['content']);
                foreach ($bullets as $bullet) {
                    if (strlen(trim($bullet)) < 5) continue;
                    $isDup = false;
                    foreach ($points as $existing) {
                        if ($existing['title'] === $this->truncateText($bullet, 500)) {
                            $isDup = true;
                            break;
                        }
                    }
                    if ($isDup) continue;

                    $points[] = [
                        'title'        => $this->truncateText($bullet, 500),
                        'description'  => null,
                        'status'       => $this->detectStatusInText($bullet),
                        'priority'     => $this->detectPriorityInText($bullet),
                        'assigned_to'  => $this->detectAssigneeInText($bullet),
                        'due_date'     => null,
                        'category'     => $this->mapSectionToCategory($heading, $sectionCategory),
                        'section_name' => $heading,
                        'remarks'      => null,
                    ];
                }
            }
        }

        // If we found no points from tables or items, try key-value pairs
        if (empty($points)) {
            $rawText = $analyzed['raw_text'] ?? '';
            $bullets = $this->extractBulletPoints($rawText);
            foreach ($bullets as $idx => $bullet) {
                if (strlen(trim($bullet)) < 5) continue;
                $points[] = [
                    'title'       => $this->truncateText($bullet, 500),
                    'status'      => $this->detectStatusInText($bullet),
                    'priority'    => $this->detectPriorityInText($bullet),
                    'assigned_to' => $this->detectAssigneeInText($bullet),
                    'due_date'    => null,
                    'category'    => 'Action Required',
                    'section_name' => null,
                    'remarks'     => null,
                ];
            }
        }

        return $points;
    }

    private function mapTableHeaders(array $headers): array
    {
        $map = [];
        $headerLower = array_map(fn($h) => strtolower(trim(is_string($h) ? $h : '')), $headers);

        $patterns = [
            'title'       => ['title', 'action', 'task', 'item', 'description', 'point', 'activity', 'subject', 'issue'],
            'description' => ['detail', 'details', 'notes', 'note', 'comment', 'explanation'],
            'status'      => ['status', 'state', 'progress', 'condition'],
            'priority'    => ['priority', 'severity', 'urgency', 'level'],
            'assigned_to' => ['assigned', 'assignee', 'responsible', 'owner', 'person', 'name', 'by'],
            'due_date'    => ['due', 'deadline', 'target', 'date', 'completion date'],
            'category'    => ['category', 'type', 'area', 'department', 'section'],
            'remarks'     => ['remark', 'remarks', 'observation', 'comment', 'feedback'],
            'raised_by'   => ['raised by', 'reported by', 'raised', 'reporter'],
        ];

        foreach ($patterns as $field => $keywords) {
            foreach ($headerLower as $i => $header) {
                if (isset($map[$field])) break;
                foreach ($keywords as $kw) {
                    if (str_contains($header, $kw)) {
                        $map[$field] = $i;
                        break;
                    }
                }
            }
        }

        return $map;
    }

    private function extractPointFromRow(array $row, array $headerMap): ?array
    {
        $get = fn(string $field) => isset($headerMap[$field]) && isset($row[$headerMap[$field]])
            ? trim((string) $row[$headerMap[$field]])
            : null;

        $title = $get('title');
        if (!$title) {
            // Try first non-empty column as title
            foreach ($row as $cell) {
                $val = trim((string) $cell);
                if ($val && strlen($val) > 3) {
                    $title = $val;
                    break;
                }
            }
        }

        if (!$title) return null;

        return [
            'title'       => $this->truncateText($title, 500),
            'description' => $get('description'),
            'status'      => $get('status') ?? $this->detectStatusInText($title),
            'priority'    => $get('priority') ?? $this->detectPriorityInText($title),
            'assigned_to' => $get('assigned_to'),
            'due_date'    => $this->parseDate($get('due_date')),
            'category'    => $get('category') ?? 'Action Required',
            'raised_by'   => $get('raised_by'),
            'remarks'     => $get('remarks'),
            'section_name' => null,
        ];
    }

    private function detectStatusInText(string $text): string
    {
        $lower = strtolower($text);
        $statusPatterns = [
            'Closed'      => ['closed', 'completed', 'done', 'finished', 'resolved', 'fixed', 'addressed'],
            'In Progress' => ['in progress', 'in-progress', 'ongoing', 'wip', 'working', 'started', 'underway'],
            'Open'        => ['open', 'pending', 'new', 'not started', 'awaiting', 'to do', 'todo'],
        ];

        foreach ($statusPatterns as $status => $keywords) {
            foreach ($keywords as $kw) {
                if (str_contains($lower, $kw)) return $status;
            }
        }
        return 'Open';
    }

    private function detectPriorityInText(string $text): string
    {
        $lower = strtolower($text);
        if (preg_match('/\b(critical|urgent|emergency|immediate)\b/', $lower)) return 'Critical';
        if (preg_match('/\b(high|important|priority|severe)\b/', $lower)) return 'High';
        if (preg_match('/\b(low|minor|trivial)\b/', $lower)) return 'Low';
        return 'Medium';
    }

    private function detectAssigneeInText(string $text): ?string
    {
        // Pattern: "assigned to: Name" or "- Name" after action
        if (preg_match('/(?:assigned?\s*(?:to)?|responsible|owner)\s*[:=\-]\s*(.+?)(?:[,\.\;\n]|$)/i', $text, $m)) {
            $name = trim($m[1]);
            if (strlen($name) > 1 && strlen($name) < 100) return $name;
        }
        return null;
    }

    private function normalizePriority(string $raw): string
    {
        $map = [
            'critical' => 'Critical', 'urgent' => 'Critical',
            'high' => 'High', 'important' => 'High',
            'medium' => 'Medium', 'normal' => 'Medium', 'moderate' => 'Medium',
            'low' => 'Low', 'minor' => 'Low', 'trivial' => 'Low',
        ];
        return $map[strtolower(trim($raw))] ?? 'Medium';
    }

    private function mapSectionToCategory(string $heading, string $sectionCategory): string
    {
        $lower = strtolower($heading . ' ' . $sectionCategory);
        if (str_contains($lower, 'safety') || str_contains($lower, 'hse')) return 'HSE';
        if (str_contains($lower, 'permit')) return 'Permits';
        if (str_contains($lower, 'training')) return 'Training';
        if (str_contains($lower, 'equipment') || str_contains($lower, 'plant')) return 'Equipment';
        if (str_contains($lower, 'mom') || str_contains($lower, 'meeting') || str_contains($lower, 'action')) return 'Action Required';
        if (str_contains($lower, 'observation') || str_contains($lower, 'finding')) return 'Observations';
        if (str_contains($lower, 'incident')) return 'Incidents';
        return 'Action Required';
    }

    private function extractBulletPoints(string $text): array
    {
        $lines = preg_split('/\r?\n/', $text);
        $bullets = [];
        foreach ($lines as $line) {
            $line = trim($line);
            if (preg_match('/^[\-\*\→•▪▸›]\s*(.+)/', $line, $m)) {
                $bullets[] = trim($m[1]);
            } elseif (preg_match('/^\d+[\.\)]\s*(.+)/', $line, $m)) {
                $bullets[] = trim($m[1]);
            } elseif (preg_match('/^[a-z][\.\)]\s*(.+)/i', $line, $m)) {
                $bullets[] = trim($m[1]);
            }
        }
        return $bullets;
    }

    private function truncateText(string $text, int $max): string
    {
        $text = trim(preg_replace('/\s+/', ' ', $text));
        if (strlen($text) > $max) return substr($text, 0, $max - 3) . '...';
        return $text;
    }

    private function parseDate(?string $value): ?string
    {
        if (!$value) return null;
        $value = trim($value);
        $formats = ['d/m/Y', 'm/d/Y', 'Y-m-d', 'd-m-Y', 'd M Y', 'M d, Y', 'F d, Y', 'd.m.Y'];
        foreach ($formats as $fmt) {
            try {
                $dt = Carbon::createFromFormat($fmt, $value);
                if ($dt && $dt->year > 2000) return $dt->format('Y-m-d');
            } catch (\Throwable) {}
        }
        try {
            $dt = Carbon::parse($value);
            if ($dt->year > 2000) return $dt->format('Y-m-d');
        } catch (\Throwable) {}
        return null;
    }

    private function mapPhotoToFrontend(MomPointPhoto $p): array
    {
        return [
            'id'              => $p->id,
            'mom_point_id'    => $p->mom_point_id,
            'file_name'       => $p->file_name,
            'original_name'   => $p->original_name,
            'file_path'       => $p->file_path,
            'url'             => $p->url,
            'file_size'       => $p->file_size,
            'mime_type'       => $p->mime_type,
            'caption'         => $p->caption,
            'uploaded_by_name' => $p->uploaded_by_name,
            'created_at'      => $p->created_at?->toISOString(),
        ];
    }

    // ─── Local Document Parsing (no AI, no cost) ──────

    /**
     * POST /api/mom/parse-document
     * Parses a document locally and returns suggestions in the same shape as analyzeDocument.
     */
    public function parseDocument(Request $request): JsonResponse
    {
        $request->validate([
            'document' => 'required|file|max:20480|mimes:pdf,doc,docx,txt,ppt,pptx,xls,xlsx,csv',
        ]);

        $file = $request->file('document');
        $folder = 'moms/temp-analysis/' . date('Y');
        $path = $file->store($folder, 'public');
        $originalName = $file->getClientOriginalName();
        $ext = strtolower($file->getClientOriginalExtension());
        $fullPath = storage_path('app/public/' . $path);

        try {
            $parser = new DocumentParserService();
            $parsed = $parser->parse($fullPath, $ext);

            if (!$parsed) {
                return response()->json(['message' => 'Could not extract content from the document.'], 422);
            }

            $analyzer = new DocumentAnalyzerService();
            $analyzed = $analyzer->analyze($parsed);

            $docMeta = $analyzed['document_metadata'] ?? [];
            $extractedData = array_merge($docMeta, $parsed['metadata'] ?? []);

            // Build summary from sections
            $sectionHeadings = array_filter(array_map(
                fn($s) => $s['heading'] ?? null,
                $analyzed['sections'] ?? []
            ));
            $summary = $sectionHeadings
                ? 'Document contains sections: ' . implode(', ', array_slice($sectionHeadings, 0, 8))
                : '';

            // Detect document type from headings/content
            $rawText = strtolower($parsed['raw_text'] ?? '');
            $docType = 'MOM';
            if (str_contains($rawText, 'weekly hse meeting') || str_contains($rawText, 'weekly ehs meeting')) {
                $docType = 'Weekly HSE Meeting';
            } elseif (str_contains($rawText, 'minutes of meeting') || str_contains($rawText, 'mom')) {
                $docType = 'MOM';
            }

            // Extract action items from analyzed content
            $extractedPoints = $this->extractPointsFromParsed($analyzed);

            if (!empty($extractedPoints)) {
                $extractedData['action_items'] = array_map(fn($p) => [
                    'title'       => $p['title'] ?? '',
                    'description' => $p['description'] ?? '',
                    'status'      => $p['status'] ?? 'Open',
                    'priority'    => $p['priority'] ?? 'Medium',
                    'assigned_to' => $p['assigned_to'] ?? '',
                    'due_date'    => $p['due_date'] ?? null,
                    'category'    => $p['category'] ?? 'Action Required',
                    'remarks'     => $p['remarks'] ?? '',
                ], $extractedPoints);
            }

            $suggestions = $this->mapAnalysisToMomFields(
                $extractedData, $summary, $docType, $path, $originalName
            );

            return response()->json([
                'analysis_id'    => null,
                'file_path'      => $path,
                'file_name'      => $originalName,
                'document_type'  => $docType,
                'confidence'     => null,
                'summary'        => $summary,
                'suggestions'    => $suggestions,
                'missing_fields' => [],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Document parsing failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ─── AI Document Analysis ──────────────────────────

    /**
     * POST /api/mom/analyze-document
     */
    public function analyzeDocument(Request $request): JsonResponse
    {
        $request->validate([
            'document' => 'required|file|max:20480|mimes:pdf,doc,docx,txt,jpg,jpeg,png,ppt,pptx,xls,xlsx,csv,rtf,odt,odp,ods',
        ]);

        $folder = 'moms/temp-analysis/' . date('Y');
        $path = $request->file('document')->store($folder, 'public');
        $originalName = $request->file('document')->getClientOriginalName();
        $fileType = $request->file('document')->getClientOriginalExtension();
        $fileSizeKb = (int) ceil($request->file('document')->getSize() / 1024);

        try {
            $aiService = app(AiService::class);
            $analysis = $aiService->analyzeDocument(
                $path,
                $originalName,
                $fileType,
                $fileSizeKb,
                auth()->id()
            );

            $extractedData = $analysis->extracted_data ?? [];
            $summary = $analysis->summary ?? '';
            $docType = $analysis->detected_document_type ?? '';

            $momSuggestions = $this->mapAnalysisToMomFields(
                $extractedData, $summary, $docType, $path, $originalName
            );

            return response()->json([
                'analysis_id'    => $analysis->id,
                'file_path'      => $path,
                'file_name'      => $originalName,
                'document_type'  => $docType,
                'confidence'     => $analysis->confidence_score,
                'summary'        => $summary,
                'suggestions'    => $momSuggestions,
                'missing_fields' => $analysis->missing_fields ?? [],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Document analysis failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function mapAnalysisToMomFields(
        array $extractedData,
        string $summary,
        string $docType,
        string $filePath,
        string $fileName
    ): array {
        $suggestions = [];

        // Meeting Title
        $title = $extractedData['title']
            ?? $extractedData['meeting_title']
            ?? $extractedData['subject']
            ?? null;

        if ($title) {
            $suggestions['meeting_title'] = trim($title);
        } elseif (str_contains(strtolower($docType), 'mom') || str_contains(strtolower($docType), 'meeting')) {
            $suggestions['meeting_title'] = 'HSE Meeting — Imported';
        }

        // Meeting Date
        $dateRaw = $extractedData['date']
            ?? $extractedData['meeting_date']
            ?? $extractedData['date_of_meeting']
            ?? null;

        if ($dateRaw) {
            $parsedDate = $this->parseDate($dateRaw);
            if ($parsedDate) {
                $suggestions['meeting_date'] = $parsedDate;
            }
        }

        // Location
        $location = $extractedData['location']
            ?? $extractedData['venue']
            ?? $extractedData['place']
            ?? null;

        if ($location) {
            $suggestions['location'] = trim($location);
        }

        // Chaired By
        $chair = $extractedData['chaired_by']
            ?? $extractedData['chairperson']
            ?? $extractedData['chair']
            ?? $extractedData['facilitator']
            ?? null;

        if ($chair) {
            $suggestions['chaired_by'] = trim($chair);
        }

        // Minutes Prepared By
        $preparedBy = $extractedData['prepared_by']
            ?? $extractedData['minutes_by']
            ?? $extractedData['secretary']
            ?? $extractedData['recorded_by']
            ?? null;

        if ($preparedBy) {
            $suggestions['minutes_prepared_by'] = trim($preparedBy);
        }

        // Meeting Type
        $typeRaw = strtolower($docType . ' ' . ($extractedData['type'] ?? '') . ' ' . ($extractedData['meeting_type'] ?? ''));

        $typeMap = [
            'weekly hse'  => 'Weekly HSE Meeting',
            'monthly hse' => 'Monthly HSE Meeting',
            'client'      => 'Client / PMC HSE Meeting',
            'pmc'         => 'Client / PMC HSE Meeting',
            'incident'    => 'Incident Review Meeting',
            'rams'        => 'RAMS Review Meeting',
        ];

        foreach ($typeMap as $keyword => $meetingType) {
            if (str_contains($typeRaw, $keyword)) {
                $suggestions['meeting_type'] = $meetingType;
                break;
            }
        }

        // Week Number
        $weekRaw = $extractedData['week_number']
            ?? $extractedData['week']
            ?? $extractedData['week_no']
            ?? null;

        if ($weekRaw) {
            $weekNum = is_numeric($weekRaw) ? (int) $weekRaw : null;
            if (!$weekNum && is_string($weekRaw)) {
                preg_match('/\d+/', $weekRaw, $m);
                $weekNum = !empty($m[0]) ? (int) $m[0] : null;
            }
            if ($weekNum >= 1 && $weekNum <= 53) {
                $suggestions['week_number'] = $weekNum;
            }
        }

        // Year
        $yearRaw = $extractedData['year'] ?? null;
        if ($yearRaw && is_numeric($yearRaw) && (int) $yearRaw >= 2020 && (int) $yearRaw <= 2100) {
            $suggestions['year'] = (int) $yearRaw;
        }

        // Client Name
        $clientName = $extractedData['client'] ?? $extractedData['client_name'] ?? $extractedData['company'] ?? null;
        if ($clientName && is_string($clientName) && strlen(trim($clientName)) > 1) {
            $suggestions['client_name'] = trim($clientName);
        }

        // Site / Project
        $siteProject = $extractedData['site'] ?? $extractedData['project'] ?? $extractedData['site_project']
            ?? $extractedData['project_name'] ?? $extractedData['site_name'] ?? null;
        if ($siteProject && is_string($siteProject) && strlen(trim($siteProject)) > 1) {
            $suggestions['site_project'] = trim($siteProject);
        }

        // Discussion Summary
        if ($summary && strlen($summary) > 20) {
            $suggestions['discussion_summary'] = $summary;
        }

        // Attendees
        $attendeesRaw = $extractedData['attendees']
            ?? $extractedData['participants']
            ?? $extractedData['present']
            ?? null;

        if (is_array($attendeesRaw) && count($attendeesRaw) > 0) {
            $suggestions['attendees_hint'] = array_map(function ($a) {
                return is_string($a) ? ['name' => $a, 'company' => '', 'role' => ''] : $a;
            }, array_slice($attendeesRaw, 0, 20));
        } elseif (is_string($attendeesRaw) && strlen($attendeesRaw) > 2) {
            $names = preg_split('/[\n,;]+/', $attendeesRaw);
            $suggestions['attendees_hint'] = array_values(array_map(
                fn($n) => ['name' => trim($n), 'company' => '', 'role' => ''],
                array_filter($names, fn($n) => strlen(trim($n)) > 2)
            ));
        }

        // Action Items — normalize into structured task rows for frontend
        $actionsRaw = $extractedData['action_items']
            ?? $extractedData['actions']
            ?? $extractedData['tasks']
            ?? $extractedData['points']
            ?? $extractedData['action_points']
            ?? null;

        if (is_array($actionsRaw) && count($actionsRaw) > 0) {
            $suggestions['actions_hint'] = array_values(array_map(function ($a) {
                if (is_string($a)) {
                    return [
                        'title'       => $a,
                        'description' => '',
                        'status'      => StatusConstants::MOM_POINT_OPEN,
                        'priority'    => 'Medium',
                        'assigned_to' => '',
                        'due_date'    => null,
                        'category'    => 'Action Required',
                        'remarks'     => '',
                    ];
                }
                // Normalize from various AI output shapes
                $title = $a['title'] ?? $a['description'] ?? $a['action'] ?? $a['item'] ?? '';
                $desc  = $a['description'] ?? $a['details'] ?? $a['notes'] ?? '';
                // If title came from description, don't duplicate
                if ($title === $desc) $desc = '';
                return [
                    'title'       => trim($title),
                    'description' => trim($desc),
                    'status'      => $this->normalizePointStatus($a['status'] ?? null),
                    'priority'    => $this->normalizePointPriority($a['priority'] ?? null),
                    'assigned_to' => trim($a['assigned_to'] ?? $a['owner'] ?? $a['responsible'] ?? $a['assignee'] ?? ''),
                    'due_date'    => $this->parseDateSafe($a['due_date'] ?? $a['target_date'] ?? $a['deadline'] ?? null),
                    'category'    => trim($a['category'] ?? $a['section'] ?? 'Action Required'),
                    'remarks'     => trim($a['remarks'] ?? $a['comment'] ?? ''),
                ];
            }, array_slice($actionsRaw, 0, 30)));
        }

        // Document path (always include)
        $suggestions['document_path'] = $filePath;
        $suggestions['document_name'] = $fileName;

        return $suggestions;
    }

    // ─── Normalization helpers ─────────────────────────

    private function normalizePointStatus(?string $raw): string
    {
        if (!$raw) return 'Open';
        $lower = strtolower(trim($raw));
        $map = [
            'open' => 'Open', 'new' => 'Open', 'not started' => 'Open',
            'in progress' => 'In Progress', 'in-progress' => 'In Progress', 'ongoing' => 'In Progress', 'wip' => 'In Progress', 'active' => 'In Progress',
            'closed' => 'Closed', 'complete' => 'Closed', 'completed' => 'Closed', 'done' => 'Closed', 'resolved' => 'Closed',
            'pending' => 'Pending', 'on hold' => 'Pending', 'hold' => 'Pending',
            'blocked' => 'Blocked',
            'deferred' => 'Deferred', 'postponed' => 'Deferred',
        ];
        return $map[$lower] ?? 'Open';
    }

    private function normalizePointPriority(?string $raw): string
    {
        if (!$raw) return 'Medium';
        $lower = strtolower(trim($raw));
        $map = [
            'low' => 'Low', 'minor' => 'Low',
            'medium' => 'Medium', 'moderate' => 'Medium', 'normal' => 'Medium', 'med' => 'Medium',
            'high' => 'High', 'important' => 'High', 'major' => 'High', 'urgent' => 'High',
            'critical' => 'Critical', 'severe' => 'Critical', 'emergency' => 'Critical',
        ];
        return $map[$lower] ?? 'Medium';
    }

    private function parseDateSafe($raw): ?string
    {
        return $this->parseDate($raw);
    }

    // ─── Private mappers ────────────────────────────────

    private function mapMomToList(Mom $m): array
    {
        return [
            'id'                => $m->id,
            'mom_code'          => $m->mom_code ?? $m->ref_number,
            'ref_number'        => $m->ref_number,
            'week_number'       => $m->week_number,
            'year'              => $m->year,
            'title'             => $m->title,
            'meeting_date'      => $m->meeting_date?->format('Y-m-d'),
            'meeting_time'      => $m->meeting_time,
            'meeting_location'  => $m->meeting_location ?? $m->location,
            'meeting_type'      => $m->meeting_type,
            'chaired_by'        => $m->chaired_by,
            'client_name'       => $m->client_name,
            'site_project'      => $m->site_project,
            'status'            => $m->status,
            'total_points'      => $m->total_points,
            'open_points'       => $m->open_points,
            'in_progress_points' => $m->in_progress_points,
            'resolved_points'   => $m->resolved_points,
            'closed_points'     => $m->closed_points,
            'overdue_points'    => $m->overdue_points,
            'has_attachments'   => !empty($m->attachments),
            'previous_mom_id'   => $m->previous_mom_id,
            'distributed_at'    => $m->distributed_at?->toISOString(),
            'points_count'      => $m->points_count ?? $m->total_points,
            'created_at'        => $m->created_at?->toISOString(),
            'updated_at'        => $m->updated_at?->toISOString(),
        ];
    }

    private function mapMomToDetail(Mom $m): array
    {
        $base = $this->mapMomToList($m);
        $base['minutes_prepared_by'] = $m->minutes_prepared_by;
        $base['attendees'] = $m->attendees ?? [];
        $base['summary'] = $m->summary;
        $base['notes'] = $m->notes;
        $base['document_path'] = $m->document_path;
        $base['document_name'] = $m->document_name;
        $base['document_url'] = $m->document_url;
        $base['ai_analysis_id'] = $m->ai_analysis_id;
        $base['ai_analysed'] = $m->ai_analysed;
        $base['attachment_urls'] = $m->attachment_urls;
        $base['attachments'] = $m->attachments ?? [];
        $base['created_by'] = $m->createdByUser ? [
            'id' => $m->createdByUser->id,
            'name' => $m->createdByUser->full_name ?? $m->createdByUser->email,
        ] : null;
        $base['previous_mom'] = $m->previousMom ? [
            'id'           => $m->previousMom->id,
            'mom_code'     => $m->previousMom->mom_code ?? $m->previousMom->ref_number,
            'week_number'  => $m->previousMom->week_number,
            'year'         => $m->previousMom->year,
            'title'        => $m->previousMom->title,
            'meeting_date' => $m->previousMom->meeting_date?->format('Y-m-d'),
            'open_points'  => $m->previousMom->open_points,
            'total_points' => $m->previousMom->total_points,
        ] : null;
        $base['next_mom'] = $m->nextMom ? [
            'id'           => $m->nextMom->id,
            'mom_code'     => $m->nextMom->mom_code ?? $m->nextMom->ref_number,
            'week_number'  => $m->nextMom->week_number,
            'year'         => $m->nextMom->year,
            'title'        => $m->nextMom->title,
            'meeting_date' => $m->nextMom->meeting_date?->format('Y-m-d'),
        ] : null;
        $base['points'] = $m->points->map(fn($p) => $this->mapPointToFrontend($p))->values();

        return $base;
    }

    private function mapPointToFrontend(MomPoint $p): array
    {
        return [
            'id'                    => $p->id,
            'point_code'            => $p->point_code,
            'mom_id'                => $p->mom_id,
            'point_number'          => $p->point_number,
            'title'                 => $p->title,
            'description'           => $p->description,
            'category'              => $p->category,
            'raised_by'             => $p->raised_by,
            'assigned_to'           => $p->assigned_to,
            'assigned_to_id'        => $p->assigned_to_id,
            'status'                => $p->status,
            'priority'              => $p->priority,
            'due_date'              => $p->due_date?->format('Y-m-d'),
            'completion_percentage' => $p->completion_percentage,
            'remarks'               => $p->remarks,
            'is_recurring'          => $p->is_recurring,
            'is_overdue'            => $p->is_overdue,
            'days_overdue'          => $p->days_overdue,
            'carry_count'           => $p->carry_count,
            'carried_from_point_id' => $p->carried_from_point_id,
            'original_mom_id'       => $p->original_mom_id,
            'resolved_at'           => $p->resolved_at?->toISOString(),
            'resolution_summary'    => $p->resolution_summary,
            'assignee'              => $p->assignee ? [
                'id'   => $p->assignee->id,
                'name' => $p->assignee->full_name ?? $p->assignee->email,
            ] : null,
            'mom' => $p->relationLoaded('mom') && $p->mom ? [
                'id'           => $p->mom->id,
                'mom_code'     => $p->mom->mom_code ?? $p->mom->ref_number,
                'week_number'  => $p->mom->week_number,
                'year'         => $p->mom->year,
                'title'        => $p->mom->title,
                'meeting_date' => $p->mom->meeting_date?->format('Y-m-d'),
            ] : null,
            'updates' => $p->relationLoaded('updates')
                ? $p->updates->map(fn($u) => [
                    'id'              => $u->id,
                    'old_status'      => $u->old_status,
                    'new_status'      => $u->new_status,
                    'old_completion'  => $u->old_completion,
                    'new_completion'  => $u->new_completion,
                    'update_note'     => $u->update_note,
                    'updated_by_name' => $u->updated_by_name,
                    'week_number'     => $u->week_number,
                    'year'            => $u->year,
                    'created_at'      => $u->created_at?->toISOString(),
                ])->values()
                : [],
            'photos' => $p->relationLoaded('photos')
                ? $p->photos->map(fn($ph) => $this->mapPhotoToFrontend($ph))->values()
                : [],
            'created_at' => $p->created_at?->toISOString(),
            'updated_at' => $p->updated_at?->toISOString(),
        ];
    }
}
