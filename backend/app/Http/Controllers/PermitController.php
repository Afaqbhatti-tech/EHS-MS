<?php

namespace App\Http\Controllers;

use App\Models\Permit;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Constants\StatusConstants;
use App\Http\Traits\ExportsData;

class PermitController extends Controller
{
    use ExportsData;

    /**
     * GET /api/permits
     */
    public function index(Request $request): JsonResponse
    {
        $query = Permit::query();

        // Text search
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('work_description', 'like', "%{$search}%")
                  ->orWhere('ref_number', 'like', "%{$search}%")
                  ->orWhere('zone', 'like', "%{$search}%")
                  ->orWhere('contractor', 'like', "%{$search}%")
                  ->orWhere('applicant_name', 'like', "%{$search}%")
                  ->orWhere('activity_type', 'like', "%{$search}%");
            });
        }

        if ($type = $request->get('permit_type')) {
            $query->where('permit_type', $type);
        }
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($area = $request->get('area')) {
            $query->where('zone', 'like', "%{$area}%");
        }
        if ($contractor = $request->get('contractor')) {
            $query->where('contractor', $contractor);
        }
        if ($from = $request->get('date_from')) {
            $query->whereDate('valid_from', '>=', $from);
        }
        if ($to = $request->get('date_to')) {
            $query->whereDate('valid_from', '<=', $to);
        }

        // Period shortcuts
        if ($period = $request->get('period')) {
            match ($period) {
                'today' => $query->whereDate('valid_from', today()),
                'week'  => $query->whereBetween('valid_from', [
                    now()->startOfWeek(), now()->endOfWeek(),
                ]),
                'month' => $query->whereMonth('valid_from', now()->month)
                                 ->whereYear('valid_from', now()->year),
                'year'  => $query->whereYear('valid_from', now()->year),
                default => null,
            };
        }

        $perPage = min(500, max(1, (int) $request->get('per_page', 20)));

        $paginated = $query->orderBy('valid_from', 'desc')
                           ->orderBy('created_at', 'desc')
                           ->paginate($perPage);

        $data = collect($paginated->items())->map(fn ($p) => $this->mapToFrontend($p));

        return response()->json([
            'data'      => $data,
            'total'     => $paginated->total(),
            'page'      => $paginated->currentPage(),
            'per_page'  => $paginated->perPage(),
            'last_page' => $paginated->lastPage(),
        ]);
    }

    /**
     * GET /api/permits/stats
     */
    public function stats(Request $request): JsonResponse
    {
        $year = (int) $request->get('year', now()->year);

        $kpis = DB::selectOne("
            SELECT
                COUNT(*) as total,
                SUM(status = 'Active') as active,
                SUM(status = 'Draft') as draft,
                SUM(status = 'Expired') as expired,
                SUM(status = 'Closed') as closed,
                SUM(status = 'Cancelled') as cancelled
            FROM permits
            WHERE YEAR(valid_from) = ? AND deleted_at IS NULL
        ", [$year]);

        $byType = DB::select("
            SELECT
                permit_type,
                COUNT(*) as total,
                SUM(status = 'Active') as active,
                SUM(status = 'Closed') as closed,
                SUM(status = 'Expired') as expired
            FROM permits
            WHERE YEAR(valid_from) = ? AND deleted_at IS NULL
            GROUP BY permit_type
            ORDER BY total DESC
        ", [$year]);

        $monthly = DB::select("
            SELECT
                MONTH(valid_from) as month,
                COUNT(*) as total,
                SUM(status = 'Active') as active,
                SUM(status = 'Closed') as closed,
                SUM(status = 'Expired') as expired
            FROM permits
            WHERE YEAR(valid_from) = ? AND deleted_at IS NULL
            GROUP BY MONTH(valid_from)
            ORDER BY month
        ", [$year]);

        $byArea = DB::select("
            SELECT zone as area, COUNT(*) as total
            FROM permits
            WHERE YEAR(valid_from) = ? AND zone IS NOT NULL AND zone != '' AND deleted_at IS NULL
            GROUP BY zone ORDER BY total DESC
        ", [$year]);

        $byContractor = DB::select("
            SELECT contractor, COUNT(*) as total
            FROM permits
            WHERE YEAR(valid_from) = ? AND contractor IS NOT NULL AND contractor != '' AND deleted_at IS NULL
            GROUP BY contractor ORDER BY total DESC
        ", [$year]);

        return response()->json([
            'kpis' => [
                'total'     => (int) ($kpis ? ($kpis->total ?? 0) : 0),
                'active'    => (int) ($kpis ? ($kpis->active ?? 0) : 0),
                'draft'     => (int) ($kpis ? ($kpis->draft ?? 0) : 0),
                'expired'   => (int) ($kpis ? ($kpis->expired ?? 0) : 0),
                'closed'    => (int) ($kpis ? ($kpis->closed ?? 0) : 0),
                'cancelled' => (int) ($kpis ? ($kpis->cancelled ?? 0) : 0),
            ],
            'byType' => array_map(fn ($r) => [
                'permit_type' => $r->permit_type,
                'total'       => (int) $r->total,
                'active'      => (int) ($r->active ?? 0),
                'closed'      => (int) ($r->closed ?? 0),
                'expired'     => (int) ($r->expired ?? 0),
            ], $byType ?? []),
            'monthly' => array_map(fn ($r) => [
                'month'   => (int) $r->month,
                'total'   => (int) $r->total,
                'active'  => (int) ($r->active ?? 0),
                'closed'  => (int) ($r->closed ?? 0),
                'expired' => (int) ($r->expired ?? 0),
            ], $monthly ?? []),
            'byArea'       => array_map(fn ($r) => ['area' => $r->area, 'total' => (int) $r->total], $byArea ?? []),
            'byContractor' => array_map(fn ($r) => ['contractor' => $r->contractor, 'total' => (int) $r->total], $byContractor ?? []),
        ]);
    }

    /**
     * GET /api/permits/calendar
     */
    public function calendar(Request $request): JsonResponse
    {
        $month = (int) $request->get('month', now()->month);
        $year  = (int) $request->get('year', now()->year);

        $start = Carbon::create($year, $month, 1)->startOfMonth()->toDateString();
        $end   = Carbon::create($year, $month, 1)->endOfMonth()->toDateString();

        $permits = Permit::where(function ($q) use ($start, $end) {
                $q->whereBetween('valid_from', [$start . ' 00:00:00', $end . ' 23:59:59'])
                  ->orWhere(function ($q2) use ($start, $end) {
                      $q2->whereNotNull('valid_to')
                         ->whereDate('valid_from', '<=', $end)
                         ->whereDate('valid_to', '>=', $start);
                  });
            })
            ->orderBy('valid_from')
            ->get();

        $types = Permit::getTypes();

        $data = $permits->map(function ($p) use ($types) {
            $config = $types[$p->permit_type] ?? [];
            return [
                'id'             => $p->id,
                'permit_number'  => $p->ref_number,
                'title'          => $p->work_description,
                'permit_type'    => $p->permit_type,
                'type_label'     => $config['label'] ?? $p->permit_type,
                'abbr'           => $config['abbr'] ?? strtoupper(substr($p->permit_type, 0, 3)),
                'color'          => $config['color'] ?? '#6B7280',
                'lightColor'     => $config['lightColor'] ?? '#F3F4F6',
                'textColor'      => $config['textColor'] ?? '#374151',
                'permit_date'    => $p->valid_from?->format('Y-m-d'),
                'permit_date_end'=> $p->valid_to?->format('Y-m-d'),
                'area'           => $p->zone,
                'status'         => $p->status,
            ];
        });

        return response()->json($data);
    }

    /**
     * GET /api/permits/export
     */
    public function export(Request $request)
    {
        $query = Permit::query();

        // Text search
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('work_description', 'like', "%{$search}%")
                  ->orWhere('ref_number', 'like', "%{$search}%")
                  ->orWhere('zone', 'like', "%{$search}%")
                  ->orWhere('contractor', 'like', "%{$search}%")
                  ->orWhere('applicant_name', 'like', "%{$search}%")
                  ->orWhere('activity_type', 'like', "%{$search}%");
            });
        }

        if ($type = $request->get('permit_type')) {
            $query->where('permit_type', $type);
        }
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($area = $request->get('area')) {
            $query->where('zone', 'like', "%{$area}%");
        }
        if ($contractor = $request->get('contractor')) {
            $query->where('contractor', $contractor);
        }
        if ($from = $request->get('date_from')) {
            $query->whereDate('valid_from', '>=', $from);
        }
        if ($to = $request->get('date_to')) {
            $query->whereDate('valid_from', '<=', $to);
        }

        // Period shortcuts
        if ($period = $request->get('period')) {
            match ($period) {
                'today' => $query->whereDate('valid_from', today()),
                'week'  => $query->whereBetween('valid_from', [
                    now()->startOfWeek(), now()->endOfWeek(),
                ]),
                'month' => $query->whereMonth('valid_from', now()->month)
                                 ->whereYear('valid_from', now()->year),
                'year'  => $query->whereYear('valid_from', now()->year),
                default => null,
            };
        }

        $records = $query->orderBy('valid_from', 'desc')->get();
        $types   = Permit::getTypes();

        $headers = [
            'Permit No.', 'Type', 'Title', 'Area', 'Activity',
            'Date From', 'Date To', 'Start Time', 'End Time',
            'Status', 'Issued To', 'Contractor', 'Approved By',
            'Safety Measures', 'Notes', 'Created',
        ];

        $rows = $records->map(fn ($p) => [
            $p->ref_number,
            $types[$p->permit_type]['label'] ?? $p->permit_type,
            $p->work_description,
            $p->zone,
            $p->activity_type,
            $p->valid_from?->format('Y-m-d'),
            $p->valid_to?->format('Y-m-d'),
            $p->start_time,
            $p->end_time,
            $p->status,
            $p->applicant_name,
            $p->contractor,
            $p->approved_by,
            $p->safety_measures,
            $p->notes,
            $p->created_at?->format('Y-m-d H:i'),
        ])->all();

        return $this->exportAs($headers, $rows, 'Permits', $request->get('format', 'csv'));
    }

    /**
     * GET /api/permits/filters/options
     */
    public function filterOptions(): JsonResponse
    {
        return response()->json([
            'areas'       => Permit::distinct()->whereNotNull('zone')->where('zone', '!=', '')->pluck('zone'),
            'contractors' => Permit::distinct()->whereNotNull('contractor')->where('contractor', '!=', '')->pluck('contractor'),
            'applicants'  => Permit::distinct()->whereNotNull('applicant_name')->where('applicant_name', '!=', '')->pluck('applicant_name'),
        ]);
    }

    /**
     * POST /api/permits/upload
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'files'   => 'required',
            'files.*' => 'file|mimes:jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,zip|max:20480',
        ]);

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

            $name = 'ptw-' . time() . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
            $storedPath = $file->storeAs('public/permits', $name);

            if (!$storedPath) {
                continue;
            }

            $uploaded[] = [
                'filename'     => 'permits/' . $name,
                'originalName' => $originalName,
                'size'         => $size,
                'mimetype'     => $mimetype,
            ];
        }

        return response()->json(['message' => 'Files uploaded successfully', 'files' => $uploaded]);
    }

    /**
     * GET /api/permits/{id}
     */
    public function show(string $id): JsonResponse
    {
        $permit = Permit::findOrFail($id);
        return response()->json($this->mapToFrontend($permit));
    }

    /**
     * POST /api/permits
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || ($user->role !== 'master' && empty($user->permissions['can_record_permit']))) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        $request->validate([
            'permit_type'     => 'required|string|in:' . implode(',', array_keys(Permit::getTypes())),
            'title'           => 'required|string|max:500',
            'area'            => 'nullable|string|max:255',
            'activity_type'   => 'nullable|string|max:255',
            'description'     => 'nullable|string',
            'permit_date'     => 'required|date',
            'permit_date_end' => 'nullable|date|after_or_equal:permit_date',
            'start_time'      => ['nullable', 'regex:/^\d{2}:\d{2}$/'],
            'end_time'        => ['nullable', 'regex:/^\d{2}:\d{2}$/'],
            'status'          => 'nullable|in:Draft,Active,Expired,Closed,Cancelled',
            'notes'           => 'nullable|string',
            'issued_to'       => 'nullable|string|max:255',
            'approved_by'     => 'nullable|string|max:255',
            'contractor'      => 'nullable|string|max:255',
            'safety_measures' => 'nullable|string',
            'ppe_requirements'=> 'nullable|string',
            'image_path'      => 'nullable|string',
            'attachments'     => 'nullable|array',
        ]);

        try {
            $permit = DB::transaction(function () use ($request) {
                // Generate ref number inside transaction to avoid race conditions
                $year  = now()->year;
                $count = Permit::whereYear('created_at', $year)->withTrashed()->lockForUpdate()->count() + 1;
                $refNumber = 'PTW-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

                return Permit::create([
                    'id'               => Str::uuid()->toString(),
                    'ref_number'       => $refNumber,
                    'permit_type'      => $request->input('permit_type'),
                    'work_description' => $request->input('title'),
                    'zone'             => $request->input('area'),
                    'activity_type'    => $request->input('activity_type'),
                    'description'      => $request->input('description'),
                    'contractor'       => $request->input('contractor'),
                    'applicant_name'   => $request->input('issued_to'),
                    'valid_from'       => $request->input('permit_date'),
                    'valid_to'         => $request->input('permit_date_end'),
                    'start_time'       => $request->input('start_time'),
                    'end_time'         => $request->input('end_time'),
                    'status'           => $request->input('status', StatusConstants::PERMIT_ACTIVE),
                    'safety_measures'  => $request->input('safety_measures'),
                    'ppe_requirements' => $request->input('ppe_requirements'),
                    'image_path'       => $request->input('image_path'),
                    'attachments'      => $request->input('attachments', []),
                    'notes'            => $request->input('notes'),
                    'approved_by'      => $request->input('approved_by'),
                    'created_by'       => $request->user()->id ?? null,
                    'updated_by'       => $request->user()->id ?? null,
                ]);
            });

            // Fire notifications
            NotificationService::permitCreated($permit, $request->user()->id);

            return response()->json([
                'message' => 'Permit created successfully',
                'permit'  => $this->mapToFrontend($permit),
            ], 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to create permit: ' . $e->getMessage()], 500);
        }
    }

    /**
     * PUT /api/permits/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || ($user->role !== 'master' && empty($user->permissions['can_record_permit']))) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        $request->validate([
            'permit_type'     => 'sometimes|string|in:' . implode(',', array_keys(Permit::getTypes())),
            'title'           => 'sometimes|string|max:500',
            'area'            => 'nullable|string|max:255',
            'activity_type'   => 'nullable|string|max:255',
            'description'     => 'nullable|string',
            'permit_date'     => 'sometimes|date',
            'permit_date_end' => 'nullable|date|after_or_equal:permit_date',
            'start_time'      => ['nullable', 'regex:/^\d{2}:\d{2}$/'],
            'end_time'        => ['nullable', 'regex:/^\d{2}:\d{2}$/'],
            'status'          => 'nullable|in:Draft,Active,Expired,Closed,Cancelled',
            'notes'           => 'nullable|string',
            'issued_to'       => 'nullable|string|max:255',
            'approved_by'     => 'nullable|string|max:255',
            'contractor'      => 'nullable|string|max:255',
            'safety_measures' => 'nullable|string',
            'ppe_requirements'=> 'nullable|string',
            'image_path'      => 'nullable|string',
            'attachments'     => 'nullable|array',
        ]);

        try {
            $permit = Permit::findOrFail($id);

            $fields = [];
            $map = [
                'permit_type'      => 'permit_type',
                'title'            => 'work_description',
                'area'             => 'zone',
                'activity_type'    => 'activity_type',
                'description'      => 'description',
                'contractor'       => 'contractor',
                'issued_to'        => 'applicant_name',
                'permit_date'      => 'valid_from',
                'permit_date_end'  => 'valid_to',
                'start_time'       => 'start_time',
                'end_time'         => 'end_time',
                'status'           => 'status',
                'safety_measures'  => 'safety_measures',
                'ppe_requirements' => 'ppe_requirements',
                'image_path'       => 'image_path',
                'notes'            => 'notes',
                'approved_by'      => 'approved_by',
                'attachments'      => 'attachments',
            ];

            foreach ($map as $input => $column) {
                if ($request->has($input)) {
                    $fields[$column] = $request->input($input);
                }
            }

            $fields['updated_by'] = $request->user()->id ?? null;

            // Handle status-specific fields
            if ($request->input('status') === StatusConstants::PERMIT_CLOSED) {
                $fields['closed_at'] = now();
                $fields['closed_by'] = $request->user()->id ?? null;
            }

            if ($request->input('status') === StatusConstants::PERMIT_ACTIVE && !$permit->approved_at) {
                $fields['approved_at'] = now();
            }

            $permit->update($fields);

            return response()->json([
                'message' => 'Permit updated successfully',
                'permit'  => $this->mapToFrontend($permit->fresh()),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            throw $e;
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to update permit: ' . $e->getMessage()], 500);
        }
    }

    /**
     * PATCH /api/permits/{id}/status
     */
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || ($user->role !== 'master' && empty($user->permissions['can_record_permit']))) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        $request->validate([
            'status' => 'required|in:Draft,Active,Expired,Closed,Cancelled',
        ]);

        $permit = Permit::findOrFail($id);

        $fields = ['status' => $request->input('status')];

        if ($request->input('status') === StatusConstants::PERMIT_CLOSED) {
            $fields['closed_at'] = now();
            $fields['closed_by'] = $request->user()->id ?? null;
        }

        $permit->update($fields);

        // Fire notification on status change
        NotificationService::permitStatusChanged($permit, $request->input('status'), $request->user()->id);

        return response()->json([
            'message' => 'Status updated',
            'permit'  => $this->mapToFrontend($permit->fresh()),
        ]);
    }

    /**
     * DELETE /api/permits/{id}
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || ($user->role !== 'master' && empty($user->permissions['can_record_permit']))) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        try {
            $permit = Permit::findOrFail($id);
            $permit->deleted_by = Auth::user()?->full_name ?? Auth::user()?->email ?? 'System';
            $permit->save();
            $cascaded = RecycleBinController::cascadeSoftDelete('permit', $permit);
            $permit->delete();
            RecycleBinController::logDeleteAction('permit', $permit, null, $cascaded);

            return response()->json(['message' => 'Permit deleted successfully']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            throw $e;
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to delete permit: ' . $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/permits/types
     */
    public function types(): JsonResponse
    {
        return response()->json(Permit::getTypes());
    }

    // ─── Private helpers ────────────────────────────

    private function mapToFrontend(Permit $p): array
    {
        $types  = Permit::getTypes();
        $config = $types[$p->permit_type] ?? [];

        return [
            'id'               => $p->id,
            'permit_number'    => $p->ref_number,
            'permit_type'      => $p->permit_type,
            'title'            => $p->work_description,
            'area'             => $p->zone,
            'phase'            => $p->phase,
            'activity_type'    => $p->activity_type,
            'description'      => $p->description,
            'contractor'       => $p->contractor,
            'issued_to'        => $p->applicant_name,
            'permit_date'      => $p->valid_from?->format('Y-m-d'),
            'permit_date_end'  => $p->valid_to?->format('Y-m-d'),
            'start_time'       => $p->start_time,
            'end_time'         => $p->end_time,
            'status'           => $p->status,
            'safety_measures'  => $p->safety_measures,
            'ppe_requirements' => $p->ppe_requirements,
            'image_path'       => $p->image_path,
            'image_url'        => $p->image_path
                ? asset('storage/' . $p->image_path)
                : null,
            'attachments'      => $p->attachments ?? [],
            'notes'            => $p->notes,
            'approved_by'      => $p->approved_by,
            'approved_at'      => $p->approved_at?->toISOString(),
            'closed_by'        => $p->closed_by,
            'closed_at'        => $p->closed_at?->toISOString(),
            'created_by'       => $p->created_by,
            'updated_by'       => $p->updated_by,
            'type_config'      => $config,
            'type_abbr'        => $config['abbr'] ?? strtoupper(substr($p->permit_type, 0, 3)),
            'type_label'       => $config['label'] ?? $p->permit_type,
            'created_at'       => $p->created_at?->toISOString(),
            'updated_at'       => $p->updated_at?->toISOString(),
        ];
    }
}
