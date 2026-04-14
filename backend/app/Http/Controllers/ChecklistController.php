<?php

namespace App\Http\Controllers;

use App\Models\ChecklistCategory;
use App\Models\ChecklistItem;
use App\Models\ChecklistInspection;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use App\Http\Controllers\RecycleBinController;
use App\Http\Traits\ExportsData;
use App\Constants\StatusConstants;

class ChecklistController extends Controller
{
    use ExportsData;
    // ── CATEGORIES ────────────────────────────────────────

    /**
     * GET /api/checklists/categories
     */
    public function categories(Request $request): JsonResponse
    {
        $categories = ChecklistCategory::where('is_active', true)
            ->withCount([
                'items as item_count' => function ($q) {
                    $q->where('status', '!=', 'Removed from Site');
                },
                'items as overdue_count' => function ($q) {
                    $q->where('is_overdue', true)->where('status', 'Active');
                },
                'items as due_soon_count' => function ($q) {
                    $q->where('is_overdue', false)->where('status', 'Active')->whereBetween('days_until_due', [0, 3]);
                },
            ])
            ->orderBy('sort_order')
            ->get()
            ->map(function ($cat) {
                return [
                    'id'             => $cat->id,
                    'key'            => $cat->key,
                    'label'          => $cat->label,
                    'full_label'     => $cat->full_label,
                    'icon'           => $cat->icon,
                    'color'          => $cat->color,
                    'light_color'    => $cat->light_color,
                    'text_color'     => $cat->text_color,
                    'has_plate'      => $cat->has_plate,
                    'has_swl'        => $cat->has_swl,
                    'has_cert'       => $cat->has_cert,
                    'insp_freq_days' => $cat->insp_freq_days,
                    'description'    => $cat->description,
                    'item_count'     => $cat->item_count,
                    'overdue_count'  => $cat->overdue_count,
                    'due_soon_count' => $cat->due_soon_count,
                ];
            });

        return response()->json($categories);
    }

    /**
     * POST /api/checklists/categories
     */
    public function storeCategory(Request $request): JsonResponse
    {
        $request->validate([
            'label'         => 'required|string|max:150',
            'full_label'    => 'nullable|string|max:255',
            'icon'          => 'nullable|string|max:50',
            'color'         => 'nullable|string|max:20',
            'light_color'   => 'nullable|string|max:20',
            'text_color'    => 'nullable|string|max:20',
            'has_plate'     => 'boolean',
            'has_swl'       => 'boolean',
            'has_cert'      => 'boolean',
            'insp_freq_days' => 'integer|min:1',
            'description'   => 'nullable|string|max:500',
            'sort_order'    => 'nullable|integer',
        ]);

        $key = Str::slug($request->label, '_');
        $baseKey = $key;
        $i = 1;
        while (ChecklistCategory::where('key', $key)->exists()) {
            $key = $baseKey . '_' . $i++;
        }

        $maxSort = ChecklistCategory::max('sort_order') ?? 0;

        $cat = ChecklistCategory::create([
            'key'            => $key,
            'label'          => $request->label,
            'full_label'     => $request->input('full_label', $request->label),
            'icon'           => $request->input('icon', 'Package'),
            'color'          => $request->input('color', '#6B7280'),
            'light_color'    => $request->input('light_color', '#F3F4F6'),
            'text_color'     => $request->input('text_color', '#374151'),
            'has_plate'      => $request->boolean('has_plate', false),
            'has_swl'        => $request->boolean('has_swl', false),
            'has_cert'       => $request->boolean('has_cert', false),
            'insp_freq_days' => $request->input('insp_freq_days', 7),
            'description'    => $request->description,
            'sort_order'     => $request->input('sort_order', $maxSort + 10),
            'is_active'      => true,
        ]);

        return response()->json(['message' => 'Category created', 'category' => $cat], 201);
    }

    /**
     * PUT /api/checklists/categories/{id}
     */
    public function updateCategory(Request $request, $id): JsonResponse
    {
        $cat = ChecklistCategory::findOrFail($id);

        $request->validate([
            'label'         => 'sometimes|string|max:150',
            'full_label'    => 'nullable|string|max:255',
            'icon'          => 'nullable|string|max:50',
            'color'         => 'nullable|string|max:20',
            'light_color'   => 'nullable|string|max:20',
            'text_color'    => 'nullable|string|max:20',
            'has_plate'     => 'boolean',
            'has_swl'       => 'boolean',
            'has_cert'      => 'boolean',
            'insp_freq_days' => 'integer|min:1',
            'description'   => 'nullable|string|max:500',
            'sort_order'    => 'nullable|integer',
            'is_active'     => 'boolean',
        ]);

        $cat->update($request->only([
            'label', 'full_label', 'icon', 'color', 'light_color', 'text_color',
            'has_plate', 'has_swl', 'has_cert',
            'insp_freq_days', 'description', 'sort_order', 'is_active',
        ]));

        return response()->json(['message' => 'Category updated', 'category' => $cat->fresh()]);
    }

    /**
     * DELETE /api/checklists/categories/{id}
     */
    public function deleteCategory($id): JsonResponse
    {
        $cat = ChecklistCategory::findOrFail($id);

        $cat->deleted_by = Auth::user()?->full_name ?? Auth::user()?->email ?? 'System';
        $cat->save();
        $cat->delete();

        // Cascade soft-delete child items
        $cascaded = RecycleBinController::cascadeSoftDelete('checklist_category', $cat);
        RecycleBinController::logDeleteAction('checklist_category', $cat, null, $cascaded);

        $childCount = count($cascaded);
        $message = 'Category deleted';
        if ($childCount > 0) {
            $message .= " (including {$childCount} related item" . ($childCount === 1 ? '' : 's') . ')';
        }

        return response()->json(['message' => $message]);
    }

    // ── ITEMS ─────────────────────────────────────────────

    /**
     * GET /api/checklists/items
     */
    public function index(Request $request): JsonResponse
    {
        $query = ChecklistItem::with('category')
            ->withCount('inspections');

        if ($cat = $request->get('category_key')) {
            $query->where('category_key', $cat);
        }
        if ($catId = $request->get('category_id')) {
            $query->where('category_id', $catId);
        }
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($health = $request->get('health_condition')) {
            $query->where('health_condition', $health);
        }
        if ($request->get('overdue')) {
            $query->overdue();
        }
        if ($request->get('due_soon')) {
            $query->dueSoon(3);
        }
        if ($from = $request->get('due_from')) {
            $query->where('next_internal_inspection_date', '>=', $from);
        }
        if ($to = $request->get('due_to')) {
            $query->where('next_internal_inspection_date', '<=', $to);
        }

        // Search
        if ($s = $request->get('search')) {
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhere('item_code', 'like', "%{$s}%")
                    ->orWhere('item_type', 'like', "%{$s}%")
                    ->orWhere('plate_number', 'like', "%{$s}%")
                    ->orWhere('serial_number', 'like', "%{$s}%")
                    ->orWhere('assigned_to', 'like', "%{$s}%")
                    ->orWhere('location_area', 'like', "%{$s}%");
            });
        }

        // Period
        if ($period = $request->get('period')) {
            match ($period) {
                'today' => $query->whereDate('created_at', today()),
                'week'  => $query->whereBetween('created_at', [
                    now()->startOfWeek(), now()->endOfWeek(),
                ]),
                'month' => $query->whereMonth('created_at', now()->month)
                    ->whereYear('created_at', now()->year),
                'year'  => $query->whereYear('created_at', now()->year),
                default => null,
            };
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortDir = $request->get('sort_dir', 'desc');
        $allowed = ['name', 'item_code', 'status', 'health_condition',
            'days_until_due', 'next_internal_inspection_date',
            'certificate_expiry', 'created_at', 'category_key'];
        if (in_array($sortBy, $allowed)) {
            $query->orderBy($sortBy, $sortDir);
        }

        $perPage = min(100, max(1, (int) $request->get('per_page', 25)));
        $paginated = $query->paginate($perPage);

        $data = collect($paginated->items())->map(fn($item) => $this->mapItem($item));

        return response()->json([
            'data'      => $data,
            'total'     => $paginated->total(),
            'page'      => $paginated->currentPage(),
            'per_page'  => $paginated->perPage(),
            'last_page' => $paginated->lastPage(),
        ]);
    }

    /**
     * POST /api/checklists/items
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'category_id'  => 'required|exists:checklist_categories,id',
            'category_key' => 'required|string|max:100',
            'name'         => 'required|string|max:255',
        ]);

        $data = $request->only([
            'category_id', 'category_key', 'name', 'item_type',
            'plate_number', 'serial_number', 'make_model', 'swl',
            'certificate_number', 'certificate_expiry', 'onboarding_date',
            'last_internal_inspection_date', 'next_internal_inspection_date',
            'health_condition', 'visual_condition', 'status',
            'location_area', 'assigned_to', 'notes',
            // Safety equipment fields
            'manufacture_date', 'retirement_date',
            'extinguisher_type', 'capacity_litres',
            'last_service_date', 'next_service_date',
            'pressure_status', 'engine_hours', 'fuel_type', 'kva_rating',
            'last_toolbox_tag_date', 'toolbox_tag_colour', 'next_toolbox_tag_date',
            // MEWP fields
            'mewp_type', 'third_party_cert_number', 'third_party_cert_expiry',
            'third_party_inspector', 'third_party_company', 'service_interval_hours',
        ]);

        $data['created_by'] = $request->user()?->id;
        $data['updated_by'] = $request->user()?->id;

        // Auto-calculate next inspection if not provided
        if (empty($data['next_internal_inspection_date'])) {
            $cat = ChecklistCategory::find($data['category_id']);
            $base = $data['last_internal_inspection_date']
                ?? $data['onboarding_date']
                ?? now()->toDateString();
            $freq = $cat->insp_freq_days ?? 7;
            $data['next_internal_inspection_date'] =
                Carbon::parse($base)->addDays($freq)->toDateString();
        }

        if ($request->hasFile('image')) {
            $name = 'chk-' . time() . '-' . Str::random(6) . '.' . $request->file('image')->getClientOriginalExtension();
            $request->file('image')->move(storage_path('app/public/checklists'), $name);
            $data['image_path'] = 'checklists/' . $name;
        }

        $item = ChecklistItem::create($data);

        return response()->json([
            'message' => 'Item added to checklist',
            'item'    => $this->mapItem($item->load('category')),
        ], 201);
    }

    /**
     * GET /api/checklists/items/{id}
     */
    public function show(string $id): JsonResponse
    {
        $item = ChecklistItem::with(['category', 'inspections' => fn($q) => $q->limit(20)])
            ->findOrFail($id);

        $mapped = $this->mapItem($item);
        $mapped['inspections'] = $item->inspections->map(fn($i) => $this->mapInspection($i));

        return response()->json($mapped);
    }

    /**
     * PUT /api/checklists/items/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $item = ChecklistItem::findOrFail($id);

        $fields = $request->only([
            'name', 'item_type', 'plate_number', 'serial_number',
            'make_model', 'swl', 'certificate_number', 'certificate_expiry',
            'onboarding_date', 'last_internal_inspection_date',
            'next_internal_inspection_date', 'health_condition',
            'visual_condition', 'status', 'location_area',
            'assigned_to', 'notes',
            // Safety equipment fields
            'manufacture_date', 'retirement_date',
            'extinguisher_type', 'capacity_litres',
            'last_service_date', 'next_service_date',
            'pressure_status', 'engine_hours', 'fuel_type', 'kva_rating',
            'last_toolbox_tag_date', 'toolbox_tag_colour', 'next_toolbox_tag_date',
            // MEWP fields
            'mewp_type', 'third_party_cert_number', 'third_party_cert_expiry',
            'third_party_inspector', 'third_party_company', 'service_interval_hours',
        ]);

        $fields['updated_by'] = $request->user()?->id;

        if ($request->hasFile('image')) {
            if ($item->image_path && Storage::disk('public')->exists($item->image_path)) {
                Storage::disk('public')->delete($item->image_path);
            }
            $name = 'chk-' . time() . '-' . Str::random(6) . '.' . $request->file('image')->getClientOriginalExtension();
            $request->file('image')->move(storage_path('app/public/checklists'), $name);
            $fields['image_path'] = 'checklists/' . $name;
        }

        $item->update($fields);

        return response()->json([
            'message' => 'Item updated',
            'item'    => $this->mapItem($item->fresh()->load('category')),
        ]);
    }

    /**
     * PATCH /api/checklists/items/{id}/status
     */
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:Active,Inactive,Out of Service,Quarantined,Removed from Site',
        ]);

        $item = ChecklistItem::findOrFail($id);
        $item->update([
            'status'     => $request->input('status'),
            'updated_by' => $request->user()?->id,
        ]);

        return response()->json([
            'message' => 'Status updated',
            'item'    => $this->mapItem($item->fresh()->load('category')),
        ]);
    }

    /**
     * DELETE /api/checklists/items/{id}
     */
    public function destroy(string $id): JsonResponse
    {
        $item = ChecklistItem::findOrFail($id);
        $item->deleted_by = Auth::user()?->full_name ?? Auth::user()?->email ?? 'System';
        $item->save();
        $item->delete();
        RecycleBinController::logDeleteAction('checklist_item', $item);
        return response()->json(['message' => 'Item removed']);
    }

    // ── INSPECTIONS ───────────────────────────────────────

    /**
     * GET /api/checklists/items/{id}/inspections
     */
    public function inspections(Request $request, string $id): JsonResponse
    {
        $item = ChecklistItem::findOrFail($id);

        $inspections = ChecklistInspection::where('checklist_item_id', $item->id)
            ->orderBy('inspection_date', 'desc')
            ->paginate(15);

        $data = collect($inspections->items())->map(fn($i) => $this->mapInspection($i));

        return response()->json([
            'data'      => $data,
            'total'     => $inspections->total(),
            'page'      => $inspections->currentPage(),
            'per_page'  => $inspections->perPage(),
            'last_page' => $inspections->lastPage(),
        ]);
    }

    /**
     * POST /api/checklists/items/{id}/inspections
     */
    public function recordInspection(Request $request, string $id): JsonResponse
    {
        $item = ChecklistItem::findOrFail($id);

        $request->validate([
            'inspection_date'        => 'required|date',
            'inspection_type'        => 'required|in:Internal,Third Party,Pre-Use,Post-Incident,Periodic,Handover',
            'inspector_name'         => 'required|string|max:255',
            'inspector_company'      => 'nullable|string|max:200',
            'overall_result'         => 'required|in:Pass,Fail,Pass with Issues,Requires Action',
            'health_condition_found' => 'required|in:Good,Fair,Poor,Out of Service,Quarantined',
            'findings'               => 'nullable|string',
            'corrective_actions'     => 'nullable|string',
            'next_inspection_date'   => 'nullable|date',
            'certificate_issued'     => 'nullable|boolean',
            'certificate_number'     => 'nullable|string|max:200',
            'certificate_expiry'     => 'nullable|date',
            'notes'                  => 'nullable|string',
        ]);

        $data = $request->only([
            'inspection_date', 'inspection_type', 'inspector_name',
            'inspector_company', 'overall_result', 'health_condition_found',
            'findings', 'corrective_actions', 'next_inspection_date',
            'certificate_issued', 'certificate_number', 'certificate_expiry', 'notes',
        ]);

        $data['checklist_item_id'] = $item->id;
        $data['category_id'] = $item->category_id;
        $data['recorded_by'] = $request->user()?->id;

        if ($request->hasFile('image')) {
            $name = 'ins-' . time() . '-' . Str::random(6) . '.' . $request->file('image')->getClientOriginalExtension();
            $request->file('image')->move(storage_path('app/public/checklists/inspections'), $name);
            $data['image_path'] = 'checklists/inspections/' . $name;
        }

        $result = DB::transaction(function () use ($data, $item) {
            $inspection = ChecklistInspection::create($data);

            // Note: model created() hook also updates parent item.
            // The controller update below is more thorough (handles defect state),
            // so both writes are combined in this transaction for atomicity.
            $itemUpdate = [
                'last_internal_inspection_date' => $data['inspection_date'],
                'health_condition' => $data['health_condition_found'],
            ];
            if (!empty($data['next_inspection_date'])) {
                $itemUpdate['next_internal_inspection_date'] = $data['next_inspection_date'];
            } elseif ($item->category && $item->category->insp_freq_days) {
                $itemUpdate['next_internal_inspection_date'] = Carbon::parse($data['inspection_date'])
                    ->addDays($item->category->insp_freq_days)->toDateString();
            }
            if (!empty($data['certificate_number'])) {
                $itemUpdate['certificate_number'] = $data['certificate_number'];
            }
            if (!empty($data['certificate_expiry'])) {
                $itemUpdate['certificate_expiry'] = $data['certificate_expiry'];
            }
            if (in_array($data['overall_result'], ['Fail', 'Requires Action'])) {
                $itemUpdate['has_open_defect'] = true;
                $itemUpdate['defect_description'] = $data['findings'] ?? $data['corrective_actions'] ?? null;
                $itemUpdate['defect_reported_date'] = now()->toDateString();
                if ($data['overall_result'] === 'Fail') {
                    $itemUpdate['status'] = 'Out of Service';
                }
            }
            $item->update($itemUpdate);

            return $inspection;
        });

        return response()->json([
            'message'    => 'Inspection recorded',
            'inspection' => $this->mapInspection($result),
            'item'       => $this->mapItem($item->fresh()->load('category')),
        ], 201);
    }

    // ── STATS ─────────────────────────────────────────────

    /**
     * GET /api/checklists/stats
     */
    public function stats(Request $request): JsonResponse
    {
        $kpis = [
            'total'               => ChecklistItem::where('status', '!=', 'Removed from Site')->count(),
            'active'              => ChecklistItem::where('status', 'Active')->count(),
            'overdue'             => ChecklistItem::where('is_overdue', true)->where('status', 'Active')->count(),
            'due_soon'            => ChecklistItem::where('is_overdue', false)->where('status', 'Active')
                ->whereBetween('days_until_due', [0, 3])->count(),
            'out_of_service'      => ChecklistItem::where('status', 'Out of Service')->count(),
            'inspections_this_month' => ChecklistInspection::whereMonth('inspection_date', now()->month)
                ->whereYear('inspection_date', now()->year)->count(),
        ];

        $byCategory = ChecklistCategory::where('is_active', true)
            ->withCount([
                'items as item_count' => function ($q) {
                    $q->where('status', '!=', 'Removed from Site');
                },
                'items as overdue_count' => function ($q) {
                    $q->where('is_overdue', true)->where('status', 'Active');
                },
                'items as due_soon_count' => function ($q) {
                    $q->where('is_overdue', false)->where('status', 'Active')->whereBetween('days_until_due', [0, 3]);
                },
            ])
            ->orderBy('sort_order')
            ->get()
            ->map(function ($cat) {
                return [
                    'key'           => $cat->key,
                    'label'         => $cat->label,
                    'color'         => $cat->color,
                    'light_color'   => $cat->light_color,
                    'text_color'    => $cat->text_color,
                    'item_count'    => $cat->item_count,
                    'overdue_count' => $cat->overdue_count,
                    'due_soon_count' => $cat->due_soon_count,
                ];
            });

        $upcoming = ChecklistItem::with('category')
            ->where('status', 'Active')
            ->whereNotNull('next_internal_inspection_date')
            ->whereBetween('next_internal_inspection_date', [
                now()->toDateString(),
                now()->addDays(7)->toDateString(),
            ])
            ->orderBy('next_internal_inspection_date')
            ->limit(10)
            ->get()
            ->map(fn($i) => [
                'id'         => $i->id,
                'item_code'  => $i->item_code,
                'name'       => $i->name,
                'category'   => $i->category?->label,
                'due_date'   => $i->next_internal_inspection_date?->format('Y-m-d'),
                'days_until' => $i->days_until_due,
            ]);

        $overdueItems = ChecklistItem::with('category')
            ->overdue()
            ->orderBy('days_until_due')
            ->limit(10)
            ->get()
            ->map(fn($i) => [
                'id'        => $i->id,
                'item_code' => $i->item_code,
                'name'      => $i->name,
                'category'  => $i->category?->label,
                'color'     => $i->category?->color,
                'days_over' => abs($i->days_until_due ?? 0),
            ]);

        // By health condition
        $byHealth = DB::table('checklist_items')
            ->select('health_condition', DB::raw('COUNT(*) as total'))
            ->whereNull('deleted_at')
            ->where('status', '!=', 'Removed from Site')
            ->groupBy('health_condition')
            ->get()
            ->map(fn($r) => ['condition' => $r->health_condition, 'total' => (int) $r->total]);

        // By status
        $byStatus = DB::table('checklist_items')
            ->select('status', DB::raw('COUNT(*) as total'))
            ->whereNull('deleted_at')
            ->groupBy('status')
            ->get()
            ->map(fn($r) => ['status' => $r->status, 'total' => (int) $r->total]);

        // Monthly inspections
        $monthlyInspections = DB::table('checklist_inspections')
            ->select(
                DB::raw('MONTH(inspection_date) as month'),
                DB::raw('COUNT(*) as total'),
                DB::raw("SUM(CASE WHEN overall_result = 'Pass' THEN 1 ELSE 0 END) as passed"),
                DB::raw("SUM(CASE WHEN overall_result = 'Fail' THEN 1 ELSE 0 END) as failed")
            )
            ->whereYear('inspection_date', now()->year)
            ->groupBy(DB::raw('MONTH(inspection_date)'))
            ->get()
            ->map(fn($r) => [
                'month'  => (int) $r->month,
                'total'  => (int) $r->total,
                'passed' => (int) ($r->passed ?? 0),
                'failed' => (int) ($r->failed ?? 0),
            ]);

        return response()->json(compact(
            'kpis', 'byCategory', 'upcoming', 'overdueItems',
            'byHealth', 'byStatus', 'monthlyInspections'
        ));
    }

    /**
     * GET /api/checklists/alerts
     */
    public function alerts(Request $request): JsonResponse
    {
        $overdue = ChecklistItem::with('category')
            ->overdue()
            ->get()
            ->map(fn($i) => [
                'type'      => 'overdue',
                'id'        => $i->id,
                'item_code' => $i->item_code,
                'name'      => $i->name,
                'category'  => $i->category?->label,
                'color'     => $i->category?->color,
                'message'   => 'Overdue by ' . abs($i->days_until_due ?? 0) . ' day(s)',
                'severity'  => 'danger',
            ]);

        $dueSoon = ChecklistItem::with('category')
            ->dueSoon(3)
            ->get()
            ->map(fn($i) => [
                'type'      => 'due_soon',
                'id'        => $i->id,
                'item_code' => $i->item_code,
                'name'      => $i->name,
                'category'  => $i->category?->label,
                'color'     => $i->category?->color,
                'message'   => $i->days_until_due === 0
                    ? 'Due today'
                    : 'Due in ' . $i->days_until_due . ' day(s)',
                'severity'  => 'warning',
            ]);

        $certExpiring = ChecklistItem::with('category')
            ->where('certificate_expiry', '>', now())
            ->where('certificate_expiry', '<=', now()->addDays(7))
            ->get()
            ->map(fn($i) => [
                'type'      => 'cert_expiring',
                'id'        => $i->id,
                'item_code' => $i->item_code,
                'name'      => $i->name,
                'category'  => $i->category?->label,
                'color'     => $i->category?->color,
                'message'   => 'Certificate expires ' . $i->certificate_expiry?->format('d M Y'),
                'severity'  => 'warning',
            ]);

        $allAlerts = $overdue->concat($dueSoon)->concat($certExpiring)->values();

        return response()->json([
            'total'         => $allAlerts->count(),
            'overdue'       => $overdue->count(),
            'due_soon'      => $dueSoon->count(),
            'cert_expiring' => $certExpiring->count(),
            'alerts'        => $allAlerts,
        ]);
    }

    /**
     * GET /api/checklists/filters/options
     */
    public function filterOptions(): JsonResponse
    {
        return response()->json([
            'categories'       => ChecklistCategory::where('is_active', true)->orderBy('sort_order')
                ->get(['id', 'key', 'label']),
            'statuses'         => ['Active', 'Inactive', 'Out of Service', 'Quarantined', 'Removed from Site'],
            'health_conditions' => ['Good', 'Fair', 'Poor', 'Out of Service', 'Quarantined'],
            'locations'        => ChecklistItem::distinct()->whereNotNull('location_area')
                ->where('location_area', '!=', '')->pluck('location_area'),
            'assigned_to'      => ChecklistItem::distinct()->whereNotNull('assigned_to')
                ->where('assigned_to', '!=', '')->pluck('assigned_to'),
        ]);
    }

    /**
     * GET /api/checklists/export
     */
    public function export(Request $request)
    {
        $query = ChecklistItem::with('category');

        if ($cat = $request->get('category_key')) {
            $query->where('category_key', $cat);
        }
        if ($catId = $request->get('category_id')) {
            $query->where('category_id', $catId);
        }
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($health = $request->get('health_condition')) {
            $query->where('health_condition', $health);
        }
        if ($request->get('overdue')) {
            $query->overdue();
        }
        if ($request->get('due_soon')) {
            $query->dueSoon(3);
        }
        if ($from = $request->get('due_from')) {
            $query->where('next_internal_inspection_date', '>=', $from);
        }
        if ($to = $request->get('due_to')) {
            $query->where('next_internal_inspection_date', '<=', $to);
        }

        // Search
        if ($s = $request->get('search')) {
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhere('item_code', 'like', "%{$s}%")
                    ->orWhere('item_type', 'like', "%{$s}%")
                    ->orWhere('plate_number', 'like', "%{$s}%")
                    ->orWhere('serial_number', 'like', "%{$s}%")
                    ->orWhere('assigned_to', 'like', "%{$s}%")
                    ->orWhere('location_area', 'like', "%{$s}%");
            });
        }

        // Period
        if ($period = $request->get('period')) {
            match ($period) {
                'today' => $query->whereDate('created_at', today()),
                'week'  => $query->whereBetween('created_at', [
                    now()->startOfWeek(), now()->endOfWeek(),
                ]),
                'month' => $query->whereMonth('created_at', now()->month)
                    ->whereYear('created_at', now()->year),
                'year'  => $query->whereYear('created_at', now()->year),
                default => null,
            };
        }

        $items = $query->orderBy('category_key')->orderBy('name')->get();

        $headers = [
            'Item Code', 'Category', 'Name', 'Type', 'Plate No.', 'Serial No.',
            'Make/Model', 'SWL', 'Cert No.', 'Cert Expiry', 'Onboarding Date',
            'Last Inspection', 'Next Inspection', 'Health', 'Status',
            'Location', 'Assigned To', 'Is Overdue', 'Days Until Due', 'Notes',
        ];

        $rows = $items->map(fn($i) => [
            $i->item_code,
            $i->category?->label,
            $i->name,
            $i->item_type,
            $i->plate_number,
            $i->serial_number,
            $i->make_model,
            $i->swl,
            $i->certificate_number,
            $i->certificate_expiry?->format('Y-m-d'),
            $i->onboarding_date?->format('Y-m-d'),
            $i->last_internal_inspection_date?->format('Y-m-d'),
            $i->next_internal_inspection_date?->format('Y-m-d'),
            $i->health_condition,
            $i->status,
            $i->location_area,
            $i->assigned_to,
            $i->is_overdue ? 'Yes' : 'No',
            $i->days_until_due,
            $i->notes,
        ])->toArray();

        return $this->exportAs($headers, $rows, 'Checklists', $request->get('format', 'csv'));
    }

    /**
     * POST /api/checklists/upload
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

            // Capture metadata before move() — temp file is deleted after move
            $originalName = $file->getClientOriginalName();
            $size         = $file->getSize();
            $mimetype     = $file->getClientMimeType();

            $name = 'chk-' . time() . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
            $file->move(storage_path('app/public/checklists'), $name);

            $uploaded[] = [
                'filename'     => 'checklists/' . $name,
                'originalName' => $originalName,
                'size'         => $size,
                'mimetype'     => $mimetype,
            ];
        }

        return response()->json(['message' => 'Files uploaded', 'files' => $uploaded]);
    }

    // ── STRUCTURED INSPECTIONS ──────────────────────────────

    /**
     * GET /api/checklists/equipment-template
     * Returns the structured inspection template for any category key.
     */
    public function equipmentChecklistTemplate(Request $request): JsonResponse
    {
        $key = $request->get('category_key');

        if (empty($key)) {
            return response()->json([
                'message' => 'category_key is required',
                'items'   => [],
            ], 422);
        }

        $templates = config('equipment_checklists');

        if (!isset($templates[$key])) {
            return response()->json([
                'message' => "No template found for: $key",
                'items'   => [],
            ]);
        }

        return response()->json([
            'category_key' => $key,
            'items'        => $templates[$key],
        ]);
    }

    /**
     * POST /api/checklists/items/{id}/structured-inspection
     * Record a structured inspection with checklist responses for any category.
     */
    public function recordStructuredInspection(Request $request, string $id): JsonResponse
    {
        $item = ChecklistItem::with('category')->findOrFail($id);

        $validated = $request->validate([
            'inspection_date'          => 'required|date',
            'inspection_type'          => 'required|in:Pre-Use,Weekly,Monthly,Periodic,Post-Incident,Third Party,Handover,Post-Fall,Annual Service',
            'inspector_name'           => 'required|string|max:255',
            'checklist_responses'      => 'required|array',
            'checklist_responses.*.id' => 'required|string',
            'checklist_responses.*.result' => 'required|in:pass,fail,na',
            'checklist_responses.*.note' => 'nullable|string',
            'defect_found'             => 'nullable|boolean',
            'defect_detail'            => 'nullable|string',
            'notes'                    => 'nullable|string',
            'next_inspection_date'     => 'nullable|date',
            'image'                    => 'nullable|image|max:10240',
            // Harness-specific
            'drop_arrest_occurred'     => 'nullable|boolean',
            'drop_arrest_date'         => 'nullable|date',
            // Fire extinguisher-specific
            'pressure_status'          => 'nullable|in:Normal,Low,High,Unknown',
            // Generator-specific
            'engine_hours'             => 'nullable|numeric',
        ]);

        $responses = collect($validated['checklist_responses']);
        $failCount = $responses->where('result', 'fail')->count();

        $overallResult = match (true) {
            $failCount === 0  => 'Pass',
            $failCount <= 2   => 'Pass with Issues',
            default           => 'Fail',
        };

        if ($validated['defect_found'] ?? false) {
            $overallResult = 'Fail';
        }

        // Harness: if drop arrest occurred, force retirement
        if (($validated['drop_arrest_occurred'] ?? false)
            && $item->category_key === 'full_body_harness') {
            $overallResult = 'Fail';
            $validated['defect_found'] = true;
            $validated['defect_detail'] =
                ($validated['defect_detail'] ?? '') .
                ' [DROP ARREST RECORDED — REMOVE FROM SERVICE]';
        }

        $data = [
            'checklist_item_id'    => $item->id,
            'category_id'          => $item->category_id,
            'inspection_date'      => $validated['inspection_date'],
            'inspection_type'      => $validated['inspection_type'],
            'inspector_name'       => $validated['inspector_name'],
            'overall_result'       => $overallResult,
            'health_condition_found' => $failCount > 3
                ? 'Poor'
                : ($failCount > 0 ? 'Fair' : 'Good'),
            'checklist_responses'  => $validated['checklist_responses'],
            'defect_found'         => $validated['defect_found'] ?? false,
            'defect_detail'        => $validated['defect_detail'] ?? null,
            'notes'                => $validated['notes'] ?? null,
            'findings'             => $failCount > 0
                ? "$failCount item(s) failed inspection."
                : 'All items passed inspection.',
            'next_inspection_date' => $validated['next_inspection_date'] ?? null,
            'recorded_by'          => $request->user()?->id,
        ];

        if ($request->hasFile('image')) {
            $folder = 'checklists/' . $item->category_key;
            $name = 'ins-' . time() . '-' . Str::random(6) . '.' . $request->file('image')->getClientOriginalExtension();
            $request->file('image')->move(storage_path('app/public/' . $folder), $name);
            $data['image_path'] = $folder . '/' . $name;
        }

        // Wrap all DB operations in a transaction for atomicity
        $inspection = DB::transaction(function () use ($item, $data, $validated, $overallResult) {
            // Handle engine hours for generators
            if (!empty($validated['engine_hours'])) {
                $item->update(['engine_hours' => $validated['engine_hours']]);
            }

            // Handle pressure status for fire extinguishers
            if (!empty($validated['pressure_status'])) {
                $item->update(['pressure_status' => $validated['pressure_status']]);
            }

            $inspection = ChecklistInspection::create($data);

            // Always update parent item inspection dates and health condition
            $itemUpdate = [
                'last_internal_inspection_date' => $data['inspection_date'],
                'health_condition' => $data['health_condition_found'],
            ];
            if (!empty($data['next_inspection_date'])) {
                $itemUpdate['next_internal_inspection_date'] = $data['next_inspection_date'];
            } elseif ($item->category && $item->category->insp_freq_days) {
                $itemUpdate['next_internal_inspection_date'] = Carbon::parse($data['inspection_date'])
                    ->addDays($item->category->insp_freq_days)->toDateString();
            }

            // Handle defects — mark Out of Service
            if ($validated['defect_found'] ?? false) {
                $itemUpdate['has_open_defect'] = true;
                $itemUpdate['defect_description'] = $validated['defect_detail'];
                $itemUpdate['defect_reported_date'] = now()->toDateString();
                $itemUpdate['status'] = 'Out of Service';
            }

            // Handle drop arrest for harness
            if (($validated['drop_arrest_occurred'] ?? false)
                && $item->category_key === 'full_body_harness') {
                $itemUpdate['last_drop_arrest'] = true;
                $itemUpdate['drop_arrest_date'] = $validated['drop_arrest_date'] ?? now()->toDateString();
                $itemUpdate['status'] = 'Out of Service';
                $itemUpdate['health_condition'] = 'Out of Service';
            }

            $item->update($itemUpdate);

            return $inspection;
        });

        return response()->json([
            'message'    => 'Inspection recorded successfully',
            'result'     => $overallResult,
            'fail_count' => $failCount,
            'inspection' => $this->mapInspection($inspection),
            'item'       => $this->mapItem($item->fresh()->load('category')),
        ], 201);
    }

    /**
     * GET /api/checklists/safety-equipment/stats
     * Stats for all structured-inspection categories.
     */
    public function safetyEquipmentStats(): JsonResponse
    {
        $categories = [
            'full_body_harness', 'fire_extinguisher', 'ladder',
            'vending_machine', 'cutter', 'grinder',
            'lifting_gear', 'generator', 'spill_kit',
        ];

        $data = [];
        foreach ($categories as $cat) {
            $base = ChecklistItem::where('category_key', $cat);
            $data[$cat] = [
                'total'          => (clone $base)->count(),
                'active'         => (clone $base)->where('status', 'Active')->count(),
                'overdue'        => (clone $base)->where('is_overdue', true)->count(),
                'out_of_service' => (clone $base)->where('status', 'Out of Service')->count(),
            ];
        }

        // Harness-specific: retirement warnings
        $nearRetirement = ChecklistItem::where('category_key', 'full_body_harness')
            ->whereNotNull('retirement_date')
            ->where('retirement_date', '<=', now()->addMonths(3))
            ->where('status', '!=', 'Removed from Site')
            ->count();

        $data['harness_near_retirement'] = $nearRetirement;

        return response()->json($data);
    }

    // ── MEWP ────────────────────────────────────────────────

    /**
     * GET /api/checklists/mewp/types
     */
    public function mewpTypes(): JsonResponse
    {
        return response()->json(config('mewp.types'));
    }

    /**
     * GET /api/checklists/mewp/stats
     */
    public function mewpStats(): JsonResponse
    {
        $base = ChecklistItem::where('category_key', 'mewp');

        $kpis = [
            'total'            => (clone $base)->count(),
            'active'           => (clone $base)->where('status', 'Active')->count(),
            'overdue'          => (clone $base)->where('is_overdue', true)->count(),
            'due_soon'         => (clone $base)->where('is_overdue', false)->whereBetween('days_until_due', [0, 3])->count(),
            'out_of_service'   => (clone $base)->where('status', 'Out of Service')->count(),
            'has_open_defect'  => (clone $base)->where('has_open_defect', true)->count(),
            'cert_expiring'    => (clone $base)->whereNotNull('third_party_cert_expiry')
                ->where('third_party_cert_expiry', '<=', now()->addDays(60))
                ->where('third_party_cert_expiry', '>', now())
                ->count(),
        ];

        // By MEWP equipment type
        $byType = DB::table('checklist_items')
            ->select(
                'mewp_type',
                DB::raw('COUNT(*) as total'),
                DB::raw("SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active"),
                DB::raw("SUM(CASE WHEN is_overdue = 1 THEN 1 ELSE 0 END) as overdue"),
                DB::raw("SUM(CASE WHEN has_open_defect = 1 THEN 1 ELSE 0 END) as defects")
            )
            ->where('category_key', 'mewp')
            ->whereNull('deleted_at')
            ->whereNotNull('mewp_type')
            ->groupBy('mewp_type')
            ->get();

        // Items needing attention
        $attention = ChecklistItem::with('category')
            ->where('category_key', 'mewp')
            ->where(function ($q) {
                $q->where('is_overdue', true)
                    ->orWhere('has_open_defect', true)
                    ->orWhere('status', 'Out of Service');
            })
            ->orderByRaw('has_open_defect DESC, is_overdue DESC')
            ->limit(10)
            ->get()
            ->map(fn($i) => $this->mapItem($i));

        // Certs due within 60 days
        $certsDue = ChecklistItem::where('category_key', 'mewp')
            ->whereNotNull('third_party_cert_expiry')
            ->where('third_party_cert_expiry', '<=', now()->addDays(60))
            ->orderBy('third_party_cert_expiry')
            ->get()
            ->map(fn($i) => $this->mapItem($i));

        return response()->json(compact('kpis', 'byType', 'attention', 'certsDue'));
    }

    /**
     * GET /api/checklists/mewp/checklist-template
     */
    public function mewpChecklistTemplate(): JsonResponse
    {
        return response()->json([
            'category_key' => 'mewp',
            'items'        => config('mewp.daily_preuse_checklist'),
        ]);
    }

    /**
     * POST /api/checklists/items/{id}/mewp-preuse
     * Record a MEWP daily pre-use inspection.
     */
    public function recordMewpPreUse(Request $request, string $id): JsonResponse
    {
        $item = ChecklistItem::with('category')->findOrFail($id);

        if ($item->category_key !== 'mewp') {
            return response()->json(['message' => 'Item is not a MEWP equipment'], 422);
        }

        $validated = $request->validate([
            'inspection_date'          => 'required|date',
            'inspector_name'           => 'required|string|max:255',
            'checklist_responses'      => 'required|array',
            'checklist_responses.*.id' => 'required|string',
            'checklist_responses.*.result' => 'required|in:pass,fail,na',
            'checklist_responses.*.note' => 'nullable|string',
            'engine_hours'             => 'nullable|numeric',
            'defect_found'             => 'nullable|boolean',
            'defect_detail'            => 'nullable|string',
            'notes'                    => 'nullable|string',
        ]);

        $responses = collect($validated['checklist_responses']);
        $failCount = $responses->where('result', 'fail')->count();

        $overallResult = match (true) {
            ($validated['defect_found'] ?? false) => 'Fail',
            $failCount === 0  => 'Pass',
            $failCount <= 2   => 'Pass with Issues',
            default           => 'Fail',
        };

        $data = [
            'checklist_item_id'         => $item->id,
            'category_id'               => $item->category_id,
            'inspection_date'           => $validated['inspection_date'],
            'inspection_type'           => 'Pre-Use',
            'inspector_name'            => $validated['inspector_name'],
            'overall_result'            => $overallResult,
            'health_condition_found'    => $failCount > 3 ? 'Poor' : ($failCount > 0 ? 'Fair' : 'Good'),
            'checklist_responses'       => $validated['checklist_responses'],
            'defect_found'              => $validated['defect_found'] ?? false,
            'defect_detail'             => $validated['defect_detail'] ?? null,
            'notes'                     => $validated['notes'] ?? null,
            'findings'                  => $failCount > 0
                ? "$failCount item(s) failed pre-use check."
                : 'All items passed pre-use check.',
            'engine_hours_at_inspection' => $validated['engine_hours'] ?? null,
            'recorded_by'               => $request->user()?->id,
        ];

        if ($request->hasFile('image')) {
            $name = 'ins-' . time() . '-' . Str::random(6) . '.' . $request->file('image')->getClientOriginalExtension();
            $request->file('image')->move(storage_path('app/public/checklists/mewp'), $name);
            $data['image_path'] = 'checklists/mewp/' . $name;
        }

        // Wrap all DB operations in a transaction for atomicity
        $inspection = DB::transaction(function () use ($item, $data, $validated) {
            // Update engine hours on parent item
            if (!empty($validated['engine_hours'])) {
                $item->update(['engine_hours' => $validated['engine_hours']]);
            }

            $inspection = ChecklistInspection::create($data);

            // Always update parent item with inspection dates and health
            $itemUpdate = [
                'last_internal_inspection_date' => $data['inspection_date'],
                'health_condition' => $data['health_condition_found'],
            ];
            if ($item->category && $item->category->insp_freq_days) {
                $itemUpdate['next_internal_inspection_date'] = Carbon::parse($data['inspection_date'])
                    ->addDays($item->category->insp_freq_days)->toDateString();
            }

            // If defect found: mark Out of Service
            if ($validated['defect_found'] ?? false) {
                $itemUpdate['has_open_defect'] = true;
                $itemUpdate['defect_description'] = $validated['defect_detail'];
                $itemUpdate['defect_reported_date'] = now()->toDateString();
                $itemUpdate['status'] = 'Out of Service';
            }

            $item->update($itemUpdate);

            return $inspection;
        });

        return response()->json([
            'message'    => 'Pre-use inspection recorded',
            'result'     => $overallResult,
            'fail_count' => $failCount,
            'inspection' => $this->mapInspection($inspection),
            'item'       => $this->mapItem($item->fresh()->load('category')),
        ], 201);
    }

    /**
     * PATCH /api/checklists/items/{id}/close-defect
     * Close an open defect on an item and return it to Active.
     */
    public function closeDefect(Request $request, string $id): JsonResponse
    {
        $item = ChecklistItem::findOrFail($id);

        $request->validate([
            'closure_notes' => 'required|string|max:2000',
        ]);

        if (!$item->has_open_defect) {
            return response()->json(['message' => 'No open defect on this item'], 422);
        }

        $item->update([
            'has_open_defect'    => false,
            'defect_closed_date' => now()->toDateString(),
            'status'             => StatusConstants::CHECKLIST_ACTIVE,
            'notes'              => trim(
                ($item->notes ?? '') . "\n[Defect closed " .
                now()->format('Y-m-d') . '] ' . $request->input('closure_notes')
            ),
            'updated_by'         => $request->user()?->id,
        ]);

        return response()->json([
            'message' => 'Defect closed — item returned to Active',
            'item'    => $this->mapItem($item->fresh()->load('category')),
        ]);
    }

    // ── Private helpers ────────────────────────────────────

    private function mapItem(ChecklistItem $item): array
    {
        return [
            'id'                               => $item->id,
            'item_code'                        => $item->item_code,
            'category_id'                      => $item->category_id,
            'category_key'                     => $item->category_key,
            'category_label'                   => $item->category?->label,
            'category_color'                   => $item->category?->color,
            'category_light_color'             => $item->category?->light_color,
            'category_text_color'              => $item->category?->text_color,
            'name'                             => $item->name,
            'item_type'                        => $item->item_type,
            'plate_number'                     => $item->plate_number,
            'serial_number'                    => $item->serial_number,
            'make_model'                       => $item->make_model,
            'swl'                              => $item->swl,
            'certificate_number'               => $item->certificate_number,
            'certificate_expiry'               => $item->certificate_expiry?->format('Y-m-d'),
            'onboarding_date'                  => $item->onboarding_date?->format('Y-m-d'),
            'last_internal_inspection_date'    => $item->last_internal_inspection_date?->format('Y-m-d'),
            'next_internal_inspection_date'    => $item->next_internal_inspection_date?->format('Y-m-d'),
            'last_third_party_inspection_date' => $item->last_third_party_inspection_date?->format('Y-m-d'),
            'next_third_party_inspection_date' => $item->next_third_party_inspection_date?->format('Y-m-d'),
            'health_condition'                 => $item->health_condition,
            'visual_condition'                 => $item->visual_condition,
            'status'                           => $item->status,
            'is_overdue'                       => $item->is_overdue,
            'days_until_due'                   => $item->days_until_due,
            'due_soon'                         => $item->due_soon,
            'cert_expiring_soon'               => $item->cert_expiring_soon,
            'location_area'                    => $item->location_area,
            'assigned_to'                      => $item->assigned_to,
            'notes'                            => $item->notes,
            'image_url'                        => $item->image_path ? asset('storage/' . $item->image_path) : null,
            'inspections_count'                => $item->inspections_count ?? $item->inspection_count,
            // Safety equipment fields
            'manufacture_date'                 => $item->manufacture_date?->format('Y-m-d'),
            'retirement_date'                  => $item->retirement_date?->format('Y-m-d'),
            'last_drop_arrest'                 => $item->last_drop_arrest,
            'drop_arrest_date'                 => $item->drop_arrest_date?->format('Y-m-d'),
            'extinguisher_type'                => $item->extinguisher_type,
            'capacity_litres'                  => $item->capacity_litres,
            'last_service_date'                => $item->last_service_date?->format('Y-m-d'),
            'next_service_date'                => $item->next_service_date?->format('Y-m-d'),
            'pressure_status'                  => $item->pressure_status,
            'engine_hours'                     => $item->engine_hours,
            'fuel_type'                        => $item->fuel_type,
            'kva_rating'                       => $item->kva_rating,
            'last_toolbox_tag_date'            => $item->last_toolbox_tag_date?->format('Y-m-d'),
            'toolbox_tag_colour'               => $item->toolbox_tag_colour,
            'next_toolbox_tag_date'            => $item->next_toolbox_tag_date?->format('Y-m-d'),
            'has_open_defect'                  => $item->has_open_defect,
            'defect_description'               => $item->defect_description,
            'defect_reported_date'             => $item->defect_reported_date?->format('Y-m-d'),
            'defect_closed_date'               => $item->defect_closed_date?->format('Y-m-d'),
            // MEWP fields
            'mewp_type'                        => $item->mewp_type,
            'third_party_cert_number'          => $item->third_party_cert_number,
            'third_party_cert_expiry'          => $item->third_party_cert_expiry?->format('Y-m-d'),
            'third_party_inspector'            => $item->third_party_inspector,
            'third_party_company'              => $item->third_party_company,
            'service_interval_hours'           => $item->service_interval_hours,
            'created_at'                       => $item->created_at?->toISOString(),
            'updated_at'                       => $item->updated_at?->toISOString(),
        ];
    }

    private function mapInspection(ChecklistInspection $insp): array
    {
        return [
            'id'                     => $insp->id,
            'inspection_code'        => $insp->inspection_code,
            'checklist_item_id'      => $insp->checklist_item_id,
            'inspection_date'        => $insp->inspection_date?->format('Y-m-d'),
            'inspection_type'        => $insp->inspection_type,
            'inspector_name'         => $insp->inspector_name,
            'inspector_company'      => $insp->inspector_company,
            'overall_result'         => $insp->overall_result,
            'health_condition_found' => $insp->health_condition_found,
            'findings'               => $insp->findings,
            'corrective_actions'     => $insp->corrective_actions,
            'next_inspection_date'   => $insp->next_inspection_date?->format('Y-m-d'),
            'certificate_issued'     => $insp->certificate_issued,
            'certificate_number'     => $insp->certificate_number,
            'certificate_expiry'     => $insp->certificate_expiry?->format('Y-m-d'),
            'image_url'              => $insp->image_url,
            'notes'                  => $insp->notes,
            'created_at'             => $insp->created_at?->toISOString(),
        ];
    }
}
