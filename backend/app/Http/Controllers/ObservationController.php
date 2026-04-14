<?php

namespace App\Http\Controllers;

use App\Models\Observation;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Constants\StatusConstants;
use App\Http\Traits\ExportsData;

class ObservationController extends Controller
{
    use ExportsData;
    /**
     * GET /api/observations
     */
    public function index(Request $request): JsonResponse
    {
        $query = Observation::query();

        // Text search
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('ref_number', 'like', "%{$search}%")
                  ->orWhere('zone', 'like', "%{$search}%")
                  ->orWhere('contractor', 'like', "%{$search}%")
                  ->orWhere('assigned_to', 'like', "%{$search}%")
                  ->orWhere('reporting_officer', 'like', "%{$search}%");
            });
        }

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($category = $request->get('category')) {
            $query->where('category', $category);
        }
        if ($priority = $request->get('priority')) {
            $query->where('priority', $priority);
        }
        if ($contractor = $request->get('contractor')) {
            $query->where('contractor', $contractor);
        }
        if ($type = $request->get('observation_type')) {
            $query->where('type', $type);
        }
        if ($supervisor = $request->get('responsible_supervisor')) {
            $query->where('assigned_to', 'like', "%{$supervisor}%");
        }
        if ($from = $request->get('date_from')) {
            $query->whereDate('observation_date', '>=', $from);
        }
        if ($to = $request->get('date_to')) {
            $query->whereDate('observation_date', '<=', $to);
        }

        // Period shortcuts
        if ($period = $request->get('period')) {
            match ($period) {
                'today' => $query->whereDate('observation_date', today()),
                'week'  => $query->whereBetween('observation_date', [
                    now()->startOfWeek(), now()->endOfWeek(),
                ]),
                'month' => $query->whereMonth('observation_date', now()->month)
                                 ->whereYear('observation_date', now()->year),
                'year'  => $query->whereYear('observation_date', now()->year),
                default => null,
            };
        }

        $perPage = min(100, max(1, (int) $request->get('per_page', 20)));

        $paginated = $query->orderBy('created_at', 'desc')->paginate($perPage);

        // Map to frontend-expected field names
        $data = collect($paginated->items())->map(fn ($obs) => $this->mapToFrontend($obs));

        return response()->json([
            'data'     => $data,
            'total'    => $paginated->total(),
            'page'     => $paginated->currentPage(),
            'per_page' => $paginated->perPage(),
            'last_page' => $paginated->lastPage(),
        ]);
    }

    /**
     * GET /api/observations/stats
     */
    public function stats(Request $request): JsonResponse
    {
        $year = (int) $request->get('year', now()->year);

        $kpis = DB::selectOne("
            SELECT
                COUNT(*) as total,
                SUM(status = 'Open') as open_count,
                SUM(status = 'In Progress') as in_progress,
                SUM(status = 'Closed') as closed,
                SUM(status = 'Verified') as verified,
                SUM(status = 'Overdue') as overdue,
                SUM(status = 'Reopened') as reopened
            FROM observations
            WHERE deleted_at IS NULL AND YEAR(observation_date) = ?
        ", [$year]);

        $monthly = DB::select("
            SELECT
                MONTH(observation_date) as month,
                COUNT(*) as total,
                SUM(status = 'Open') as open_count,
                SUM(status = 'In Progress') as in_progress,
                SUM(status = 'Closed') as closed,
                SUM(status = 'Overdue') as overdue
            FROM observations
            WHERE deleted_at IS NULL AND YEAR(observation_date) = ?
            GROUP BY MONTH(observation_date)
            ORDER BY month
        ", [$year]);

        $byCategory = DB::select("
            SELECT category, COUNT(*) as total
            FROM observations
            WHERE deleted_at IS NULL AND YEAR(observation_date) = ? AND category IS NOT NULL AND category != ''
            GROUP BY category ORDER BY total DESC
        ", [$year]);

        $byContractor = DB::select("
            SELECT contractor, COUNT(*) as total
            FROM observations
            WHERE deleted_at IS NULL AND YEAR(observation_date) = ? AND contractor IS NOT NULL AND contractor != ''
            GROUP BY contractor ORDER BY total DESC
        ", [$year]);

        $byOfficer = DB::select("
            SELECT reporting_officer as officer_name, COUNT(*) as total
            FROM observations
            WHERE deleted_at IS NULL AND YEAR(observation_date) = ?
            GROUP BY reporting_officer
            ORDER BY total DESC LIMIT 10
        ", [$year]);

        return response()->json([
            'kpis' => [
                'total'       => (int) ($kpis->total ?? 0),
                'open'        => (int) ($kpis->open_count ?? 0),
                'in_progress' => (int) ($kpis->in_progress ?? 0),
                'closed'      => (int) ($kpis->closed ?? 0),
                'verified'    => (int) ($kpis->verified ?? 0),
                'overdue'     => (int) ($kpis->overdue ?? 0),
                'reopened'    => (int) ($kpis->reopened ?? 0),
            ],
            'monthly'      => array_map(fn ($r) => [
                'month'       => (int) $r->month,
                'total'       => (int) $r->total,
                'open'        => (int) ($r->open_count ?? 0),
                'in_progress' => (int) ($r->in_progress ?? 0),
                'closed'      => (int) ($r->closed ?? 0),
                'overdue'     => (int) ($r->overdue ?? 0),
            ], $monthly),
            'byCategory'   => array_map(fn ($r) => ['category' => $r->category, 'total' => (int) $r->total], $byCategory),
            'byContractor' => array_map(fn ($r) => ['contractor' => $r->contractor, 'total' => (int) $r->total], $byContractor),
            'byOfficer'    => array_map(fn ($r) => ['officer_name' => $r->officer_name ?? 'Unknown', 'total' => (int) $r->total], $byOfficer),
        ]);
    }

    /**
     * GET /api/observations/export
     */
    public function export(Request $request)
    {
        $query = Observation::query();

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('ref_number', 'like', "%{$search}%")
                  ->orWhere('zone', 'like', "%{$search}%")
                  ->orWhere('contractor', 'like', "%{$search}%");
            });
        }
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($category = $request->get('category')) {
            $query->where('category', $category);
        }
        if ($priority = $request->get('priority')) {
            $query->where('priority', $priority);
        }
        if ($contractor = $request->get('contractor')) {
            $query->where('contractor', $contractor);
        }
        if ($type = $request->get('observation_type')) {
            $query->where('type', $type);
        }
        if ($from = $request->get('date_from')) {
            $query->whereDate('observation_date', '>=', $from);
        }
        if ($to = $request->get('date_to')) {
            $query->whereDate('observation_date', '<=', $to);
        }

        $records = $query->orderBy('observation_date', 'desc')->get();

        $headers = [
            'Ref Number', 'Date', 'Zone', 'Contractor', 'Category', 'Type',
            'Priority', 'Description', 'Corrective Action', 'Assigned To',
            'Target Date', 'Status', 'Closed Date', 'Closed By',
        ];

        $rows = $records->map(fn($obs) => [
            $obs->ref_number,
            $obs->observation_date?->format('Y-m-d'),
            $obs->zone,
            $obs->contractor,
            $obs->category,
            $obs->type,
            $obs->priority,
            $obs->description,
            $obs->corrective_action,
            $obs->assigned_to,
            $obs->target_date?->format('Y-m-d'),
            $obs->status,
            $obs->closed_date?->format('Y-m-d'),
            $obs->closed_by,
        ])->toArray();

        return $this->exportAs($headers, $rows, 'Observations', $request->get('format', 'csv'));
    }

    /**
     * GET /api/observations/filters/options
     */
    public function filterOptions(): JsonResponse
    {
        return response()->json([
            'categories'        => Observation::distinct()->whereNotNull('category')->where('category', '!=', '')->pluck('category'),
            'contractors'       => Observation::distinct()->whereNotNull('contractor')->where('contractor', '!=', '')->pluck('contractor'),
            'areas'             => Observation::distinct()->whereNotNull('zone')->where('zone', '!=', '')->pluck('zone'),
            'observation_types' => Observation::distinct()->whereNotNull('type')->where('type', '!=', '')->pluck('type'),
            'supervisors'       => Observation::distinct()->whereNotNull('assigned_to')->where('assigned_to', '!=', '')->pluck('assigned_to'),
        ]);
    }

    /**
     * POST /api/observations/upload
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'files'   => 'required',
            'files.*' => 'file|mimes:jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,zip|max:20480',
        ]);

        // Accept files from both 'files' and 'files[]' form keys
        $files = $request->file('files');

        if (!$files) {
            return response()->json(['message' => 'No files provided'], 422);
        }

        // Normalize to array (handles single file upload too)
        if (!is_array($files)) {
            $files = [$files];
        }

        $uploaded = [];
        foreach ($files as $file) {
            if (!$file || !$file->isValid()) {
                continue;
            }

            $originalName = $file->getClientOriginalName();
            $size = $file->getSize();
            $mimetype = $file->getClientMimeType();

            $name = 'obs-' . time() . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
            $storedPath = $file->storeAs('public/observations', $name);

            if (!$storedPath) {
                continue;
            }

            $uploaded[] = [
                'filename'     => 'observations/' . $name,
                'originalName' => $originalName,
                'size'         => $size,
                'mimetype'     => $mimetype,
            ];
        }

        return response()->json(['message' => 'Files uploaded successfully', 'files' => $uploaded]);
    }

    /**
     * GET /api/observations/{id}
     */
    public function show(string $id): JsonResponse
    {
        $obs = Observation::findOrFail($id);
        return response()->json($this->mapToFrontend($obs));
    }

    /**
     * POST /api/observations
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || ($user->role !== 'master' && empty($user->permissions['can_create_observation']))) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        $request->validate([
            'area'             => 'required|string|max:255',
            'contractor'       => 'required|string|max:255',
            'category'         => 'required|string|max:255',
            'observation_type' => 'required|string|max:255',
            'priority'         => 'required|in:Low,Medium,High',
            'description'      => 'required|string|min:10',
        ]);

        try {
            $obs = DB::transaction(function () use ($request) {
                // Generate ref number inside transaction with lock to avoid race conditions
                $year = now()->year;
                $count = Observation::whereYear('created_at', $year)->withTrashed()->lockForUpdate()->count() + 1;
                $refNumber = 'OBS-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

                $user = $request->user();

                return Observation::create([
                    'id'                 => Str::uuid()->toString(),
                    'ref_number'         => $refNumber,
                    'observation_date'   => $request->input('observation_date', now()),
                    'reporting_officer'  => $user ? ($user->full_name ?? $user->email) : 'Unknown',
                    'zone'               => $request->input('area'),
                    'contractor'         => $request->input('contractor'),
                    'category'           => $request->input('category'),
                    'type'               => $request->input('observation_type'),
                    'priority'           => $request->input('priority'),
                    'description'        => $request->input('description'),
                    'corrective_action'  => $request->input('immediate_action'),
                    'assigned_to'        => $request->input('responsible_supervisor'),
                    'target_date'        => $request->input('proposed_rectification_date'),
                    'status'             => StatusConstants::OBSERVATION_OPEN,
                    'photos'             => $this->buildPhotosJson($request),
                ]);
            });

            // Fire notifications
            NotificationService::observationCreated($obs, $request->user()->id);

            return response()->json([
                'message'     => 'Observation created successfully',
                'observation' => $this->mapToFrontend($obs),
            ], 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to create observation: ' . $e->getMessage()], 500);
        }
    }

    /**
     * PUT /api/observations/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || ($user->role !== 'master' && empty($user->permissions['can_create_observation']))) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        try {
            $obs = Observation::findOrFail($id);

            $fields = [];
            $map = [
                'observation_date'          => 'observation_date',
                'area'                      => 'zone',
                'contractor'                => 'contractor',
                'category'                  => 'category',
                'observation_type'          => 'type',
                'priority'                  => 'priority',
                'description'               => 'description',
                'immediate_action'          => 'corrective_action',
                'responsible_supervisor'    => 'assigned_to',
                'proposed_rectification_date' => 'target_date',
                'status'                    => 'status',
            ];

            foreach ($map as $input => $column) {
                if ($request->has($input)) {
                    $fields[$column] = $request->input($input);
                }
            }

            // Handle photos
            if ($request->has('before_photos') || $request->has('after_photos')) {
                $photos = $obs->photos ?? ['before' => [], 'after' => []];
                if ($request->has('before_photos')) {
                    $photos['before'] = $request->input('before_photos', []);
                }
                if ($request->has('after_photos')) {
                    $photos['after'] = $request->input('after_photos', []);
                }
                $fields['photos'] = $photos;
            }

            // Handle status-specific fields
            if ($request->input('status') === StatusConstants::OBSERVATION_CLOSED) {
                $fields['closed_date'] = $request->input('closed_date', now()->toDateString());
                $user = $request->user();
                $fields['closed_by'] = $user ? ($user->full_name ?? $user->email) : 'System';
                $fields['close_notes'] = $request->input('close_notes');
            }

            $obs->update($fields);

            return response()->json([
                'message'     => 'Observation updated successfully',
                'observation' => $this->mapToFrontend($obs->fresh()),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            throw $e;
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to update observation: ' . $e->getMessage()], 500);
        }
    }

    /**
     * PATCH /api/observations/{id}/status
     */
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || ($user->role !== 'master' && empty($user->permissions['can_create_observation']))) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        $request->validate([
            'status' => 'required|in:Open,In Progress,Closed,Verified,Overdue,Reopened',
        ]);

        $obs = Observation::findOrFail($id);

        $fields = ['status' => $request->input('status')];

        if ($request->input('status') === StatusConstants::OBSERVATION_CLOSED) {
            $fields['closed_date'] = now()->toDateString();
            $fields['closed_by'] = $request->user()->full_name ?? $request->user()->email;
        }

        $obs->update($fields);

        // Fire notification on status change
        NotificationService::observationStatusChanged($obs, $request->input('status'), $request->user()->id);

        return response()->json([
            'message'     => 'Status updated',
            'observation' => $this->mapToFrontend($obs->fresh()),
        ]);
    }

    /**
     * DELETE /api/observations/{id}
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || ($user->role !== 'master' && empty($user->permissions['can_create_observation']))) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        try {
            $obs = Observation::findOrFail($id);
            $obs->deleted_by = Auth::user()?->full_name ?? Auth::user()?->email ?? 'System';
            $obs->save();
            $obs->delete();
            RecycleBinController::logDeleteAction('observation', $obs);

            return response()->json(['message' => 'Deleted successfully']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            throw $e;
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to delete observation: ' . $e->getMessage()], 500);
        }
    }

    // ─── Private helpers ────────────────────────────

    /**
     * Map DB observation to frontend-expected shape.
     */
    private function mapToFrontend(Observation $obs): array
    {
        $photos = $obs->photos ?? ['before' => [], 'after' => []];
        // Handle both old format (flat array) and new format (before/after)
        $beforePhotos = [];
        $afterPhotos = [];
        if (is_array($photos)) {
            if (isset($photos['before'])) {
                $beforePhotos = $photos['before'];
                $afterPhotos = $photos['after'] ?? [];
            } else {
                // Legacy: flat array treated as before photos
                $beforePhotos = $photos;
            }
        }

        return [
            'id'                         => $obs->id,
            'observation_id'             => $obs->ref_number,
            'observation_date'           => $obs->observation_date?->toISOString(),
            'reporting_officer_id'       => null,
            'reporting_officer_name'     => $obs->reporting_officer,
            'area'                       => $obs->zone,
            'contractor'                 => $obs->contractor,
            'category'                   => $obs->category,
            'observation_type'           => $obs->type,
            'priority'                   => $obs->priority,
            'description'                => $obs->description,
            'immediate_action'           => $obs->corrective_action,
            'responsible_supervisor'     => $obs->assigned_to,
            'proposed_rectification_date' => $obs->target_date?->format('Y-m-d'),
            'status'                     => $obs->status,
            'escalation_required'        => false,
            'linked_permit_id'           => null,
            'linked_incident_id'         => null,
            'verified_by'                => $obs->closed_by,
            'verified_date'              => $obs->closed_date?->format('Y-m-d'),
            'before_photos'              => $beforePhotos,
            'after_photos'               => $afterPhotos,
            'created_at'                 => $obs->created_at?->toISOString(),
            'updated_at'                 => $obs->updated_at?->toISOString(),
        ];
    }

    private function buildPhotosJson(Request $request): array
    {
        return [
            'before' => $request->input('before_photos', []),
            'after'  => $request->input('after_photos', []),
        ];
    }
}
