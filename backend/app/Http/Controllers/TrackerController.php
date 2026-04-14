<?php

namespace App\Http\Controllers;

use App\Models\TrackerCategory;
use App\Models\TrackerRecord;
use App\Models\TrackerInspectionLog;
use App\Models\ChecklistItem;
use App\Models\ChecklistInspection;
use App\Models\EquipmentGroup;
use App\Models\EquipmentItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use App\Http\Traits\ExportsData;
use App\Services\NotificationService;

class TrackerController extends Controller
{
    use ExportsData;
    // ─── Categories ──────────────────────────────────────

    public function categories()
    {
        $cats = TrackerCategory::where('is_active', true)
            ->withCount([
                'records as active_count' => function ($q) {
                    $q->where('status', 'Active')->whereNull('deleted_at');
                },
                'records as overdue_count' => function ($q) {
                    $q->where('is_overdue', true)->whereNull('deleted_at');
                },
                'records as tuv_overdue_count' => function ($q) {
                    $q->where('is_tuv_overdue', true)->whereNull('deleted_at');
                },
                'records as due_soon_count' => function ($q) {
                    $q->where('is_overdue', false)->whereBetween('days_until_due', [0, 3])->whereNull('deleted_at');
                },
                'records as cert_expired_count' => function ($q) {
                    $q->where('is_cert_expired', true)->whereNull('deleted_at');
                },
            ])
            ->orderBy('sort_order')
            ->get();

        $data = $cats->map(function ($cat) {
            return [
                'id'               => $cat->id,
                'key'              => $cat->key,
                'label'            => $cat->label,
                'group_name'       => $cat->group_name,
                'icon'             => $cat->icon,
                'color'            => $cat->color,
                'light_color'      => $cat->light_color,
                'text_color'       => $cat->text_color,
                'has_plate'        => $cat->has_plate,
                'has_swl'          => $cat->has_swl,
                'has_tuv'          => $cat->has_tuv,
                'has_cert'         => $cat->has_cert,
                'insp_freq_days'   => $cat->insp_freq_days,
                'tuv_freq_days'    => $cat->tuv_freq_days,
                'template_type'    => $cat->template_type,
                'description'      => $cat->description,
                'active_count'     => $cat->active_count,
                'overdue_count'    => $cat->overdue_count,
                'tuv_overdue_count' => $cat->tuv_overdue_count,
                'due_soon_count'   => $cat->due_soon_count,
                'cert_expired_count' => $cat->cert_expired_count,
            ];
        });

        return response()->json($data);
    }

    /**
     * GET /api/tracker/categories/groups
     */
    public function groups()
    {
        $groups = TrackerCategory::where('is_active', true)
            ->select('group_name')
            ->distinct()
            ->orderBy('group_name')
            ->pluck('group_name');

        return response()->json($groups);
    }

    /**
     * POST /api/tracker/categories
     */
    public function storeCategory(Request $request)
    {
        $request->validate([
            'label'         => 'required|string|max:200',
            'group_name'    => 'required|string|max:100',
            'icon'          => 'nullable|string|max:50',
            'color'         => 'nullable|string|max:20',
            'light_color'   => 'nullable|string|max:20',
            'text_color'    => 'nullable|string|max:20',
            'has_plate'     => 'boolean',
            'has_swl'       => 'boolean',
            'has_tuv'       => 'boolean',
            'has_cert'      => 'boolean',
            'insp_freq_days' => 'integer|min:1',
            'tuv_freq_days' => 'nullable|integer|min:1',
            'template_type' => 'required|string|in:heavy_equipment,fire_extinguisher,harness,light_equipment,power_tool',
            'description'   => 'nullable|string|max:500',
            'sort_order'    => 'nullable|integer',
        ]);

        $key = Str::slug($request->label, '_');
        $baseKey = $key;
        $i = 1;
        while (TrackerCategory::where('key', $key)->exists()) {
            $key = $baseKey . '_' . $i++;
        }

        $maxSort = TrackerCategory::where('group_name', $request->group_name)->max('sort_order') ?? 0;

        $cat = TrackerCategory::create([
            'key'            => $key,
            'label'          => $request->label,
            'group_name'     => $request->group_name,
            'icon'           => $request->input('icon', 'Package'),
            'color'          => $request->input('color', '#6B7280'),
            'light_color'    => $request->input('light_color', '#F3F4F6'),
            'text_color'     => $request->input('text_color', '#374151'),
            'has_plate'      => $request->boolean('has_plate', false),
            'has_swl'        => $request->boolean('has_swl', false),
            'has_tuv'        => $request->boolean('has_tuv', false),
            'has_cert'       => $request->boolean('has_cert', false),
            'insp_freq_days' => $request->input('insp_freq_days', 7),
            'tuv_freq_days'  => $request->input('tuv_freq_days'),
            'template_type'  => $request->template_type,
            'description'    => $request->description,
            'sort_order'     => $request->input('sort_order', $maxSort + 10),
            'is_active'      => true,
        ]);

        return response()->json(['message' => 'Category created', 'category' => $cat], 201);
    }

    /**
     * PUT /api/tracker/categories/{id}
     */
    public function updateCategory(Request $request, $id)
    {
        $cat = TrackerCategory::findOrFail($id);

        $request->validate([
            'label'         => 'sometimes|string|max:200',
            'group_name'    => 'sometimes|string|max:100',
            'icon'          => 'nullable|string|max:50',
            'color'         => 'nullable|string|max:20',
            'light_color'   => 'nullable|string|max:20',
            'text_color'    => 'nullable|string|max:20',
            'has_plate'     => 'boolean',
            'has_swl'       => 'boolean',
            'has_tuv'       => 'boolean',
            'has_cert'      => 'boolean',
            'insp_freq_days' => 'integer|min:1',
            'tuv_freq_days' => 'nullable|integer|min:1',
            'template_type' => 'sometimes|string|in:heavy_equipment,fire_extinguisher,harness,light_equipment,power_tool',
            'description'   => 'nullable|string|max:500',
            'sort_order'    => 'nullable|integer',
            'is_active'     => 'boolean',
        ]);

        $cat->update($request->only([
            'label', 'group_name', 'icon', 'color', 'light_color', 'text_color',
            'has_plate', 'has_swl', 'has_tuv', 'has_cert',
            'insp_freq_days', 'tuv_freq_days', 'template_type',
            'description', 'sort_order', 'is_active',
        ]));

        return response()->json(['message' => 'Category updated', 'category' => $cat->fresh()]);
    }

    /**
     * DELETE /api/tracker/categories/{id}
     */
    public function deleteCategory($id)
    {
        $cat = TrackerCategory::findOrFail($id);

        $recordCount = $cat->records()->whereNull('deleted_at')->count();
        if ($recordCount > 0) {
            return response()->json([
                'message' => "Cannot delete: this category has {$recordCount} equipment record(s). Remove or reassign them first, or deactivate the category instead.",
                'record_count' => $recordCount,
            ], 422);
        }

        $cat->deleted_by = Auth::user()?->full_name ?? Auth::user()?->email ?? 'System';
        $cat->save();
        $cascaded = RecycleBinController::cascadeSoftDelete('tracker_category', $cat);
        $cat->delete();
        RecycleBinController::logDeleteAction('tracker_category', $cat, null, $cascaded);

        return response()->json(['message' => 'Category deleted']);
    }

    /**
     * PUT /api/tracker/categories/rename-group
     */
    public function renameGroup(Request $request)
    {
        $request->validate([
            'old_name' => 'required|string|max:100',
            'new_name' => 'required|string|max:100',
        ]);

        $updated = TrackerCategory::where('group_name', $request->old_name)
            ->update(['group_name' => $request->new_name]);

        return response()->json(['message' => "Group renamed ({$updated} categories updated)"]);
    }

    // ─── Records Index ───────────────────────────────────

    public function index(Request $request)
    {
        $query = TrackerRecord::with('category');

        // Search
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('equipment_name', 'like', "%{$search}%")
                  ->orWhere('record_code', 'like', "%{$search}%")
                  ->orWhere('plate_number', 'like', "%{$search}%")
                  ->orWhere('serial_number', 'like', "%{$search}%")
                  ->orWhere('certificate_number', 'like', "%{$search}%")
                  ->orWhere('assigned_to', 'like', "%{$search}%")
                  ->orWhere('location_area', 'like', "%{$search}%");
            });
        }

        // Filters
        if ($v = $request->input('category_key')) $query->where('category_key', $v);
        if ($v = $request->input('status')) $query->where('status', $v);
        if ($v = $request->input('condition')) $query->where('condition', $v);
        if ($v = $request->input('location_area')) $query->where('location_area', 'like', "%{$v}%");
        if ($v = $request->input('inspected_by')) $query->where('inspected_by', 'like', "%{$v}%");
        if ($v = $request->input('date_from')) $query->whereDate('created_at', '>=', $v);
        if ($v = $request->input('date_to')) $query->whereDate('created_at', '<=', $v);
        if ($v = $request->input('period')) $query->period($v);
        if ($request->input('overdue')) $query->where('is_overdue', true);
        if ($request->input('due_soon')) $query->dueSoon();
        if ($request->input('tuv_overdue')) $query->where('is_tuv_overdue', true);
        if ($request->input('cert_expired')) $query->where('is_cert_expired', true);

        // Sort
        $sortBy  = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');
        $allowed = ['equipment_name', 'record_code', 'status', 'condition', 'days_until_due',
                     'next_internal_inspection_date', 'tuv_expiry_date', 'certificate_expiry',
                     'created_at', 'category_key', 'onboarding_date'];
        if (in_array($sortBy, $allowed)) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = min((int)$request->input('per_page', 25), 100);
        $page = (int)$request->input('page', 1);

        $result = $query->paginate($perPage, ['*'], 'page', $page);

        $items = collect($result->items())->map(function ($r) {
            $data = $r->toArray();
            $data['category_label']       = $r->category->label ?? '';
            $data['category_color']       = $r->category->color ?? '';
            $data['category_light_color'] = $r->category->light_color ?? '';
            $data['category_text_color']  = $r->category->text_color ?? '';
            $data['due_soon']             = $r->due_soon;
            $data['tuv_expiring_soon']    = $r->tuv_expiring_soon;
            $data['image_url']            = $r->image_url;
            return $data;
        });

        return response()->json([
            'data'     => $items,
            'total'    => $result->total(),
            'page'     => $result->currentPage(),
            'per_page' => $result->perPage(),
            'last_page' => $result->lastPage(),
        ]);
    }

    // ─── Store ───────────────────────────────────────────

    public function store(Request $request)
    {
        $request->validate([
            'category_id'     => 'required|exists:tracker_categories,id',
            'category_key'    => 'required|string|max:100',
            'equipment_name'  => 'required|string|max:500',
        ]);

        $cat = TrackerCategory::findOrFail($request->category_id);
        $data = $request->except(['image', 'certificate_file', 'tuv_certificate']);
        $data['template_type'] = $cat->template_type;
        $data['created_by'] = Auth::id();
        $data['updated_by'] = Auth::id();

        // File uploads
        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')
                ->store("tracker/{$cat->key}/images", 'public');
        }
        if ($request->hasFile('certificate_file')) {
            $data['certificate_file_path'] = $request->file('certificate_file')
                ->store("tracker/{$cat->key}/certificates", 'public');
        }
        if ($request->hasFile('tuv_certificate')) {
            $data['tuv_certificate_path'] = $request->file('tuv_certificate')
                ->store("tracker/{$cat->key}/tuv", 'public');
        }

        $record = DB::transaction(function () use ($data) {
            return TrackerRecord::create($data);
        });
        $record->load('category');

        return response()->json([
            'message' => 'Equipment record created',
            'record'  => $record,
        ], 201);
    }

    // ─── Show ────────────────────────────────────────────

    public function show($id)
    {
        $record = TrackerRecord::with(['category'])->findOrFail($id);
        $inspections = $record->inspectionLogs()->limit(20)->get();

        $data = $record->toArray();
        $data['image_url']         = $record->image_url;
        $data['cert_file_url']     = $record->cert_file_url;
        $data['tuv_cert_url']      = $record->tuv_cert_url;
        $data['due_soon']          = $record->due_soon;
        $data['tuv_expiring_soon'] = $record->tuv_expiring_soon;
        $data['inspections']       = $inspections->map(function ($log) {
            $arr = $log->toArray();
            $arr['checklist_file_url']    = $log->checklist_file_url;
            $arr['checklist_image_url']   = $log->checklist_image_url;
            $arr['additional_image_urls'] = $log->additional_image_urls;
            $arr['supporting_doc_urls']   = $log->supporting_doc_urls;
            return $arr;
        });
        $data['category_label']    = $record->category->label ?? '';
        $data['category_color']    = $record->category->color ?? '';
        $data['category_light_color'] = $record->category->light_color ?? '';
        $data['category_text_color']  = $record->category->text_color ?? '';

        // Include linked checklist data
        $data['checklist_data'] = $this->resolveChecklistData($record);

        return response()->json($data);
    }

    // ─── Update ──────────────────────────────────────────

    public function update(Request $request, $id)
    {
        $record = TrackerRecord::findOrFail($id);

        $request->validate([
            'equipment_name' => 'sometimes|string|max:500',
        ]);

        // Extract checklist data before saving tracker record
        $checklistResponses = $request->input('checklist_responses');
        $checklistInspectorName = $request->input('checklist_inspector_name');
        $checklistNotes = $request->input('checklist_notes');

        $data = $request->except([
            'image', 'certificate_file', 'tuv_certificate', '_method',
            'checklist_responses', 'checklist_inspector_name', 'checklist_notes',
        ]);
        $data['updated_by'] = Auth::id();

        // File replacements (outside transaction — file ops are not transactional)
        if ($request->hasFile('image')) {
            if ($record->image_path) Storage::disk('public')->delete($record->image_path);
            $data['image_path'] = $request->file('image')
                ->store("tracker/{$record->category_key}/images", 'public');
        }
        if ($request->hasFile('certificate_file')) {
            if ($record->certificate_file_path) Storage::disk('public')->delete($record->certificate_file_path);
            $data['certificate_file_path'] = $request->file('certificate_file')
                ->store("tracker/{$record->category_key}/certificates", 'public');
        }
        if ($request->hasFile('tuv_certificate')) {
            if ($record->tuv_certificate_path) Storage::disk('public')->delete($record->tuv_certificate_path);
            $data['tuv_certificate_path'] = $request->file('tuv_certificate')
                ->store("tracker/{$record->category_key}/tuv", 'public');
        }

        // Wrap DB operations in transaction for atomicity
        DB::transaction(function () use ($record, $data, $checklistResponses, $checklistInspectorName, $checklistNotes) {
            $record->update($data);

            // Handle checklist data save
            if ($checklistResponses && is_array($checklistResponses) && $record->checklist_item_id) {
                $this->saveChecklistInspection($record, $checklistResponses, $checklistInspectorName, $checklistNotes);
            }
        });

        $record->load('category');

        return response()->json([
            'message' => 'Record updated',
            'record'  => $record,
        ]);
    }

    // ─── Destroy ─────────────────────────────────────────

    public function destroy($id)
    {
        $record = TrackerRecord::findOrFail($id);
        $record->deleted_by = Auth::user()?->full_name ?? Auth::user()?->email ?? 'System';
        $record->save();
        $record->delete();
        RecycleBinController::logDeleteAction('tracker_record', $record);

        return response()->json(['message' => 'Record deleted']);
    }

    // ─── Inspection Logs ─────────────────────────────────

    public function inspectionLogs(Request $request, $recordId)
    {
        $record = TrackerRecord::findOrFail($recordId);
        $logs = $record->inspectionLogs()->paginate(20);

        return response()->json($logs);
    }

    public function recordInspection(Request $request, $recordId)
    {
        $record = TrackerRecord::findOrFail($recordId);

        $request->validate([
            'inspection_date'      => 'required|date',
            'inspector_name'       => 'required|string|max:255',
            'result'               => 'required|in:Pass,Fail,Pass with Issues,Requires Action',
            'next_inspection_date' => 'nullable|date',
            'condition_found'      => 'nullable|string',
            'notes'                => 'nullable|string',
        ]);

        $data = $request->all();
        $data['tracker_record_id'] = $record->id;
        $data['category_key'] = $record->category_key;
        $data['recorded_by'] = Auth::id();

        DB::transaction(function () use (&$log, $data, $record, $request) {
            $log = TrackerInspectionLog::create($data);

            // Update parent record with inspection results
            $recordUpdate = [
                'last_internal_inspection_date' => $data['inspection_date'],
            ];
            if (!empty($data['next_inspection_date'])) {
                $recordUpdate['next_internal_inspection_date'] = $data['next_inspection_date'];
            } elseif ($record->category && $record->category->insp_freq_days) {
                $recordUpdate['next_internal_inspection_date'] = Carbon::parse($data['inspection_date'])
                    ->addDays($record->category->insp_freq_days)->toDateString();
            }
            if (!empty($data['condition_found'])) {
                $recordUpdate['condition'] = $data['condition_found'];
            }
            // Handle failure - mark defect
            if (in_array($data['result'], ['Fail', 'Requires Action'])) {
                $recordUpdate['has_open_defect'] = true;
                $recordUpdate['defect_description'] = $data['notes'] ?? 'Failed inspection';
                $recordUpdate['defect_reported_date'] = now()->toDateString();
                if ($data['result'] === 'Fail') {
                    $recordUpdate['status'] = 'Out of Service';
                }
            }
            $record->update($recordUpdate);
        });

        // Notify if defect found during inspection
        $record->refresh()->load('category');
        if (in_array($data['result'], ['Fail', 'Requires Action'])) {
            NotificationService::trackerDefectFound($record, Auth::id());
        }

        return response()->json([
            'message'    => 'Inspection recorded',
            'inspection' => $log,
            'record'     => $record,
        ], 201);
    }

    // ─── Helpers ────────────────────────────────────────

    /**
     * Recalculate due/overdue/expired flags for all active tracker records
     * so that KPIs and alerts always reflect the current date.
     */
    private function refreshDueStatuses(): void
    {
        $today = Carbon::today();
        DB::table('tracker_records')->whereNull('deleted_at')->orderBy('id')->chunk(200, function ($rows) use ($today) {
            foreach ($rows as $row) {
                $updates = [];

                if ($row->next_internal_inspection_date) {
                    $diff = (int) $today->diffInDays(Carbon::parse($row->next_internal_inspection_date), false);
                    $updates['days_until_due'] = $diff;
                    $updates['is_overdue'] = $diff < 0;
                } else {
                    $updates['days_until_due'] = null;
                    $updates['is_overdue'] = false;
                }

                if ($row->tuv_expiry_date) {
                    $diff = (int) $today->diffInDays(Carbon::parse($row->tuv_expiry_date), false);
                    $updates['days_until_tuv'] = $diff;
                    $updates['is_tuv_overdue'] = $diff < 0;
                } else {
                    $updates['days_until_tuv'] = null;
                    $updates['is_tuv_overdue'] = false;
                }

                if ($row->certificate_expiry) {
                    $updates['is_cert_expired'] = $today->gt(Carbon::parse($row->certificate_expiry));
                } else {
                    $updates['is_cert_expired'] = false;
                }

                DB::table('tracker_records')->where('id', $row->id)->update($updates);
            }
        });
    }

    // ─── Stats ───────────────────────────────────────────

    public function stats()
    {
        $today = now()->toDateString();
        $dueSoonThreshold = now()->addDays(7)->toDateString();

        // Total equipment items (not soft-deleted)
        $total = EquipmentItem::count();

        // Helper: count items that have a specific field_key with a specific value
        $countByFieldValue = function (string $key, string $value) {
            return EquipmentItem::whereHas('fieldValues', function ($q) use ($key, $value) {
                $q->where('field_key', $key)->where('field_value', $value);
            })->count();
        };

        // Helper: count items where a date field is before today
        $countDatePast = function (string $key) use ($today) {
            return EquipmentItem::whereHas('fieldValues', function ($q) use ($key, $today) {
                $q->where('field_key', $key)
                  ->whereNotNull('field_value')
                  ->where('field_value', '!=', '')
                  ->whereDate('field_value', '<', $today);
            })->count();
        };

        // Helper: count items where a date field is between today and threshold
        $countDateRange = function (string $key, string $from, string $to) {
            return EquipmentItem::whereHas('fieldValues', function ($q) use ($key, $from, $to) {
                $q->where('field_key', $key)
                  ->whereNotNull('field_value')
                  ->where('field_value', '!=', '')
                  ->whereDate('field_value', '>=', $from)
                  ->whereDate('field_value', '<=', $to);
            })->count();
        };

        $kpis = [
            'total'          => $total,
            'active'         => $countByFieldValue('equipment_status', 'Active'),
            'overdue'        => $countDatePast('next_inspection_date'),
            'due_soon'       => $countDateRange('next_inspection_date', $today, $dueSoonThreshold),
            'tuv_overdue'    => $countDatePast('tuv_expiry_date'),
            'cert_expired'   => $countDatePast('certificate_expiry'),
            'out_of_service' => $countByFieldValue('equipment_status', 'Out of Service'),
        ];

        // Per-group breakdown
        $byGroup = EquipmentGroup::withCount('items')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($g) {
                return [
                    'key'          => $g->id,
                    'label'        => $g->name,
                    'color'        => $g->color,
                    'light_color'  => $g->light_color,
                    'text_color'   => $g->text_color,
                    'item_count'   => $g->items_count,
                ];
            });

        return response()->json([
            'kpis'            => $kpis,
            'byCategory'      => $byGroup,
            'overdueItems'    => [],
            'tuvExpiringSoon' => [],
        ]);
    }

    // ─── Alerts ──────────────────────────────────────────

    public function alerts()
    {
        $this->refreshDueStatuses();

        $overdue = TrackerRecord::where('is_overdue', true)->whereNull('deleted_at')
            ->orderBy('days_until_due')
            ->limit(20)
            ->get(['id', 'record_code', 'equipment_name', 'category_key', 'days_until_due', 'next_internal_inspection_date']);

        $dueSoon = TrackerRecord::where('is_overdue', false)->whereBetween('days_until_due', [0, 3])->whereNull('deleted_at')
            ->orderBy('days_until_due')
            ->limit(20)
            ->get(['id', 'record_code', 'equipment_name', 'category_key', 'days_until_due', 'next_internal_inspection_date']);

        $tuvExpiring = TrackerRecord::where('is_tuv_overdue', false)->whereBetween('days_until_tuv', [0, 30])->whereNull('deleted_at')
            ->orderBy('days_until_tuv')
            ->limit(20)
            ->get(['id', 'record_code', 'equipment_name', 'category_key', 'tuv_expiry_date', 'days_until_tuv']);

        $certExpired = TrackerRecord::where('is_cert_expired', true)->whereNull('deleted_at')
            ->limit(20)
            ->get(['id', 'record_code', 'equipment_name', 'category_key', 'certificate_expiry']);

        $openDefects = TrackerRecord::where('has_open_defect', true)->whereNull('deleted_at')
            ->limit(20)
            ->get(['id', 'record_code', 'equipment_name', 'category_key', 'defect_description', 'defect_reported_date']);

        return response()->json([
            'overdue'      => $overdue,
            'due_soon'     => $dueSoon,
            'tuv_expiring' => $tuvExpiring,
            'cert_expired' => $certExpired,
            'open_defects' => $openDefects,
        ]);
    }

    // ─── Export ──────────────────────────────────────────

    public function export(Request $request)
    {
        $format = $request->input('format', 'csv');

        $query = TrackerRecord::with('category')->whereNull('deleted_at');

        // Search
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('equipment_name', 'like', "%{$search}%")
                  ->orWhere('record_code', 'like', "%{$search}%")
                  ->orWhere('plate_number', 'like', "%{$search}%")
                  ->orWhere('serial_number', 'like', "%{$search}%")
                  ->orWhere('certificate_number', 'like', "%{$search}%")
                  ->orWhere('assigned_to', 'like', "%{$search}%")
                  ->orWhere('location_area', 'like', "%{$search}%");
            });
        }

        if ($v = $request->input('category_key')) $query->where('category_key', $v);
        if ($v = $request->input('status')) $query->where('status', $v);
        if ($v = $request->input('condition')) $query->where('condition', $v);
        if ($v = $request->input('location_area')) $query->where('location_area', 'like', "%{$v}%");
        if ($v = $request->input('inspected_by')) $query->where('inspected_by', 'like', "%{$v}%");
        if ($v = $request->input('date_from')) $query->whereDate('created_at', '>=', $v);
        if ($v = $request->input('date_to')) $query->whereDate('created_at', '<=', $v);
        if ($v = $request->input('period')) $query->period($v);
        if ($request->input('overdue')) $query->where('is_overdue', true);
        if ($request->input('due_soon')) $query->dueSoon();
        if ($request->input('tuv_overdue')) $query->where('is_tuv_overdue', true);
        if ($request->input('cert_expired')) $query->where('is_cert_expired', true);

        $records = $query->orderBy('category_key')->orderBy('equipment_name')->get();

        $catKey = $request->input('category_key');
        $templateType = null;
        if ($catKey) {
            $cat = TrackerCategory::where('key', $catKey)->first();
            $templateType = $cat?->template_type;
        }

        $templates = config('tracker_categories.templates');
        $columns = $templateType && isset($templates[$templateType])
            ? $templates[$templateType]['excel_columns']
            : ['Record Code', 'Category', 'Equipment Name', 'Serial Number', 'Make/Model', 'Plate Number', 'Status', 'Condition', 'Location/Area', 'Onboarding Date', 'Next Inspection', 'TUV Expiry', 'Certificate Expiry', 'Notes'];

        $rows = $records->map(fn($r) => $this->recordToExportRow($r))->values()->toArray();

        return $this->exportAs($columns, $rows, 'Equipment Tracker', $request->get('format', 'csv'));
    }

    private function recordToExportRow($r): array
    {
        return [
            $r->record_code,
            $r->category->label ?? $r->category_key,
            $r->equipment_name,
            $r->serial_number ?? '',
            $r->make_model ?? '',
            $r->plate_number ?? '',
            $r->status,
            $r->condition,
            $r->location_area ?? '',
            $r->onboarding_date?->format('d/m/Y') ?? '',
            $r->next_internal_inspection_date?->format('d/m/Y') ?? '',
            $r->tuv_expiry_date?->format('d/m/Y') ?? '',
            $r->certificate_expiry?->format('d/m/Y') ?? '',
            $r->notes ?? '',
        ];
    }

    // ─── Import Template ─────────────────────────────────

    public function importTemplate(Request $request)
    {
        $catKey = $request->input('category_key');
        if (!$catKey) {
            return response()->json(['message' => 'category_key required'], 422);
        }

        $cat = TrackerCategory::where('key', $catKey)->firstOrFail();
        $templates = config('tracker_categories.templates');
        $tpl = $templates[$cat->template_type] ?? null;

        if (!$tpl) {
            return response()->json(['message' => 'Template not found for type: ' . $cat->template_type], 404);
        }

        $columns = $tpl['excel_columns'];
        $spreadsheet = new Spreadsheet();

        // Sheet 1: Import Template
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Import Template');

        // Header row
        foreach ($columns as $i => $col) {
            $cell = chr(65 + $i) . '1';
            $sheet->setCellValue($cell, $col);
            $sheet->getStyle($cell)->getFont()->setBold(true)->setSize(10)->getColor()->setRGB('FFFFFF');
            $sheet->getStyle($cell)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('166028');
            $sheet->getColumnDimension(chr(65 + $i))->setAutoSize(true);
        }
        $sheet->freezePane('A2');

        // Example row
        $example = $this->getExampleRow($cat->template_type, $cat->label);
        foreach ($example as $i => $val) {
            if ($i < count($columns)) {
                $sheet->setCellValue(chr(65 + $i) . '2', $val);
                $sheet->getStyle(chr(65 + $i) . '2')->getFont()->setItalic(true)->getColor()->setRGB('6B7280');
            }
        }

        // Data validations for Status column
        $statusCol = array_search('Status', $columns);
        if ($statusCol !== false) {
            $colLetter = chr(65 + $statusCol);
            for ($row = 3; $row <= 200; $row++) {
                $validation = $sheet->getCell("{$colLetter}{$row}")->getDataValidation();
                $validation->setType(DataValidation::TYPE_LIST);
                $validation->setFormula1('"Active,Inactive,Out of Service,Quarantined,Under Maintenance"');
                $validation->setShowDropDown(true);
            }
        }

        // Condition column validation
        $condCol = array_search('Condition', $columns);
        if ($condCol !== false) {
            $colLetter = chr(65 + $condCol);
            for ($row = 3; $row <= 200; $row++) {
                $validation = $sheet->getCell("{$colLetter}{$row}")->getDataValidation();
                $validation->setType(DataValidation::TYPE_LIST);
                $validation->setFormula1('"Good,Fair,Poor,Out of Service,Quarantined"');
                $validation->setShowDropDown(true);
            }
        }

        // Extinguisher Type validation
        $extCol = array_search('Extinguisher Type', $columns);
        if ($extCol !== false) {
            $colLetter = chr(65 + $extCol);
            for ($row = 3; $row <= 200; $row++) {
                $validation = $sheet->getCell("{$colLetter}{$row}")->getDataValidation();
                $validation->setType(DataValidation::TYPE_LIST);
                $validation->setFormula1('"CO2,Dry Chemical,Foam,Water,Wet Chemical"');
                $validation->setShowDropDown(true);
            }
        }

        // Sheet 2: Instructions
        $instrSheet = $spreadsheet->createSheet();
        $instrSheet->setTitle('Instructions');
        $instrSheet->setCellValue('A1', 'How to fill this template');
        $instrSheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);

        $instructions = [
            'Do not change column headers in the first row.',
            'Date format: DD/MM/YYYY or YYYY-MM-DD',
            'Required fields: ' . implode(', ', $tpl['required_fields']),
            'Leave optional fields blank if not applicable.',
            'Status must be exactly: Active, Inactive, Out of Service, Quarantined, or Under Maintenance',
            'Condition must be exactly: Good, Fair, Poor, Out of Service, or Quarantined',
            'Row 2 contains example data — delete it before importing.',
        ];

        foreach ($instructions as $i => $line) {
            $instrSheet->setCellValue('A' . ($i + 3), ($i + 1) . '. ' . $line);
        }

        $instrSheet->getColumnDimension('A')->setWidth(80);

        $filename = "tracker-import-template-{$catKey}.xlsx";
        $temp = tempnam(sys_get_temp_dir(), 'tpl');
        $writer = new Xlsx($spreadsheet);
        $writer->save($temp);

        return response()->download($temp, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    private function getExampleRow(string $type, string $label): array
    {
        $today = now()->format('d/m/Y');
        $next = now()->addDays(7)->format('d/m/Y');

        return match ($type) {
            'heavy_equipment' => [$label . ' Unit #1', 'PLT-001', 'SN-12345', 'CAT TH514', $today, '5 Tons', '5.0', 'CERT-001', $next, 'CHK-001', $today, $next, $today, $next, 'John Smith', 'Zone A', 'Active', 'Good condition'],
            'fire_extinguisher' => ['FE-Zone-A-001', 'CO2', $today, 'SN-FE-001', '6', 'Yes', 'CERT-FE-001', $today, $next, $next, 'John Smith', 'Zone A', 'Active', 'Monthly check OK'],
            'harness' => ['FBH-001', 'SN-H-001', $today, '15/01/2024', '15/01/2034', $today, $next, 'No', 'John Smith', 'Ahmed Ali', 'Good', 'Active', 'Inspected'],
            'light_equipment' => ['Ladder-A001', 'SN-L-001', 'Werner 6ft', $today, '150 kg', 'CERT-L-001', $today, $next, $next, 'John Smith', 'Good', 'Green', 'Active', 'OK'],
            'power_tool' => ['Drill-001', 'SN-PT-001', 'Makita HR2630', $today, '230V', $today, $next, $today, $next, 'John Smith', 'Good', 'Green', 'Active', 'PAT tested'],
            default => ['Item 001', 'SN-001', 'Brand Model', $today, '', $today, $next, '', 'John Smith', 'Good', '', 'Active', ''],
        };
    }

    // ─── Bulk Import ─────────────────────────────────────

    public function bulkImport(Request $request)
    {
        $request->validate([
            'file'         => 'required|file|mimes:xlsx,csv,xls',
            'category_key' => 'required|string|max:100',
        ]);

        $catKey = $request->input('category_key');
        $cat = TrackerCategory::where('key', $catKey)->firstOrFail();
        $templates = config('tracker_categories.templates');
        $tpl = $templates[$cat->template_type] ?? null;

        if (!$tpl) {
            return response()->json(['message' => 'Template not found'], 404);
        }

        $file = $request->file('file');
        $spreadsheet = IOFactory::load($file->getPathname());
        $worksheet = $spreadsheet->getActiveSheet();
        $rows = $worksheet->toArray(null, true, true, true);

        if (count($rows) < 2) {
            return response()->json(['message' => 'File has no data rows'], 422);
        }

        // Map headers
        $headerRow = $rows[array_key_first($rows)];
        $colMap = [];
        foreach ($tpl['excel_columns'] as $i => $excelCol) {
            foreach ($headerRow as $letter => $val) {
                if (strtolower(trim($val ?? '')) === strtolower(trim($excelCol))) {
                    $colMap[$excelCol] = $letter;
                    break;
                }
            }
        }

        $batchId = 'IMP-' . now()->format('Y-m-d') . '-' . strtoupper(Str::random(6));
        $total = 0;
        $success = 0;
        $failed = 0;
        $errors = [];
        $importedCodes = [];

        DB::transaction(function () use ($rows, $colMap, $tpl, $cat, $catKey, $batchId, $file, &$total, &$success, &$failed, &$errors, &$importedCodes) {
            $rowIndex = 0;
            foreach ($rows as $rowKey => $row) {
                $rowIndex++;
                if ($rowIndex === 1) continue; // Skip header

                // Skip empty rows
                $nonEmpty = array_filter($row, fn($v) => $v !== null && $v !== '');
                if (empty($nonEmpty)) continue;

                $total++;

                try {
                    $data = $this->mapImportRow($row, $colMap, $tpl, $cat);
                    $data['category_id'] = $cat->id;
                    $data['category_key'] = $catKey;
                    $data['template_type'] = $cat->template_type;
                    $data['import_batch_id'] = $batchId;
                    $data['created_by'] = Auth::id();
                    $data['updated_by'] = Auth::id();

                    // Validate required
                    foreach ($tpl['required_fields'] as $req) {
                        $mapped = $this->fieldToDbColumn($req);
                        if (empty($data[$mapped])) {
                            throw new \Exception("Required field '{$req}' is empty");
                        }
                    }

                    $record = TrackerRecord::create($data);
                    $importedCodes[] = $record->record_code;
                    $success++;
                } catch (\Exception $e) {
                    $failed++;
                    $errors[] = [
                        'row'     => $rowIndex,
                        'message' => $e->getMessage(),
                    ];
                }
            }

            // Store import log
            DB::table('tracker_import_logs')->insert([
                'import_batch_id' => $batchId,
                'category_key'    => $catKey,
                'original_filename' => $file->getClientOriginalName(),
                'total_rows'      => $total,
                'success_rows'    => $success,
                'failed_rows'     => $failed,
                'error_details'   => json_encode($errors),
                'imported_by'     => Auth::id(),
                'created_at'      => now(),
            ]);
        });

        return response()->json([
            'batch_id'         => $batchId,
            'total_rows'       => $total,
            'success'          => $success,
            'failed'           => $failed,
            'errors'           => $errors,
            'imported_records' => array_slice($importedCodes, 0, 5),
        ]);
    }

    private function mapImportRow(array $row, array $colMap, array $tpl, TrackerCategory $cat): array
    {
        $data = [];
        $allFields = array_merge($tpl['required_fields'], $tpl['optional_fields']);

        $excelToDb = $this->getExcelToDbMapping($cat->template_type);

        foreach ($tpl['excel_columns'] as $excelCol) {
            $letter = $colMap[$excelCol] ?? null;
            if (!$letter) continue;

            $value = $row[$letter] ?? null;
            if ($value === null || $value === '') continue;

            $dbField = $excelToDb[$excelCol] ?? null;
            if (!$dbField) continue;

            // Parse dates
            if ($this->isDateField($dbField)) {
                $value = $this->parseDate($value);
            }

            // Parse booleans
            if (in_array($dbField, ['civil_defense_tag', 'last_drop_arrest'])) {
                $value = in_array(strtolower(trim((string)$value)), ['yes', 'y', '1', 'true']);
            }

            // Validate enums
            if ($dbField === 'status') {
                $valid = ['Active', 'Inactive', 'Out of Service', 'Quarantined', 'Removed from Site', 'Under Maintenance'];
                if (!in_array($value, $valid)) {
                    $closest = $this->closestMatch($value, $valid);
                    if ($closest) {
                        $value = $closest;
                    } else {
                        throw new \Exception("Invalid Status: '{$value}'. Use: " . implode(', ', $valid));
                    }
                }
            }

            if ($dbField === 'condition') {
                $valid = ['Good', 'Fair', 'Poor', 'Out of Service', 'Quarantined'];
                if (!in_array($value, $valid)) {
                    $closest = $this->closestMatch($value, $valid);
                    $value = $closest ?: 'Good';
                }
            }

            $data[$dbField] = $value;
        }

        return $data;
    }

    private function getExcelToDbMapping(string $type): array
    {
        $common = [
            'Record Code' => null,
            'Status' => 'status',
            'Condition' => 'condition',
            'Notes' => 'notes',
            'Location/Area' => 'location_area',
            'Inspected By' => 'inspected_by',
            'Assigned To' => 'assigned_to',
        ];

        $specific = match ($type) {
            'heavy_equipment' => [
                'Equipment Name' => 'equipment_name',
                'Plate Number' => 'plate_number',
                'Serial Number' => 'serial_number',
                'Make/Model' => 'make_model',
                'Onboarding Date' => 'onboarding_date',
                'SWL' => 'swl',
                'Capacity (Tons)' => 'load_capacity_tons',
                'Certificate Number' => 'certificate_number',
                'Certificate Expiry' => 'certificate_expiry',
                'Checker Number' => 'checker_number',
                'TUV Inspection Date' => 'tuv_inspection_date',
                'TUV Expiry Date' => 'tuv_expiry_date',
                'Internal Inspection Date' => 'last_internal_inspection_date',
                'Next Inspection Date' => 'next_internal_inspection_date',
            ],
            'fire_extinguisher' => [
                'Name/ID' => 'equipment_name',
                'Extinguisher Type' => 'extinguisher_type',
                'Onboarding Date' => 'onboarding_date',
                'Serial Number' => 'serial_number',
                'Weight (KG)' => 'weight_kg',
                'Civil Defense Tag (Y/N)' => 'civil_defense_tag',
                'Certificate Number' => 'certificate_number',
                'Internal Inspection Date' => 'last_internal_inspection_date',
                'Next Inspection Date' => 'next_internal_inspection_date',
                'Expiry Date' => 'expiry_date',
            ],
            'harness' => [
                'Name/ID' => 'equipment_name',
                'Serial Number' => 'serial_number',
                'Onboarding Date' => 'onboarding_date',
                'Manufacture Date' => 'manufacture_date',
                'Retirement Date' => 'retirement_date',
                'Internal Inspection Date' => 'last_internal_inspection_date',
                'Next Inspection Date' => 'next_internal_inspection_date',
                'Drop/Fall Arrest (Y/N)' => 'last_drop_arrest',
            ],
            'light_equipment' => [
                'Name/ID' => 'equipment_name',
                'Serial Number' => 'serial_number',
                'Make/Model' => 'make_model',
                'Onboarding Date' => 'onboarding_date',
                'SWL' => 'swl',
                'Certificate Number' => 'certificate_number',
                'Internal Inspection Date' => 'last_internal_inspection_date',
                'Next Inspection Date' => 'next_internal_inspection_date',
                'Expiry Date' => 'expiry_date',
                'Code Colour' => 'toolbox_tag_colour',
            ],
            'power_tool' => [
                'Name/ID' => 'equipment_name',
                'Serial Number' => 'serial_number',
                'Make/Model' => 'make_model',
                'Onboarding Date' => 'onboarding_date',
                'Voltage Rating' => 'voltage_rating',
                'Internal Inspection Date' => 'last_internal_inspection_date',
                'Next Inspection Date' => 'next_internal_inspection_date',
                'Electrical Test Date' => 'electrical_test_date',
                'Electrical Test Expiry' => 'electrical_test_expiry',
                'Code Colour' => 'toolbox_tag_colour',
            ],
            default => [],
        };

        return array_merge($common, $specific);
    }

    private function fieldToDbColumn(string $field): string
    {
        return match ($field) {
            'equipment_name' => 'equipment_name',
            'plate_number' => 'plate_number',
            'serial_number' => 'serial_number',
            'make_model' => 'make_model',
            'onboarding_date' => 'onboarding_date',
            'extinguisher_type' => 'extinguisher_type',
            default => $field,
        };
    }

    private function isDateField(string $field): bool
    {
        return str_contains($field, 'date') || str_contains($field, 'expiry');
    }

    private function parseDate($value): ?string
    {
        if (!$value) return null;

        // Handle Excel numeric dates
        if (is_numeric($value)) {
            try {
                return Carbon::instance(\PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value))->format('Y-m-d');
            } catch (\Exception $e) { /* fall through */ }
        }

        $formats = ['Y-m-d', 'd/m/Y', 'd-m-Y', 'm/d/Y', 'd M Y', 'd F Y'];
        foreach ($formats as $fmt) {
            try {
                return Carbon::createFromFormat($fmt, trim($value))->format('Y-m-d');
            } catch (\Exception $e) { continue; }
        }

        // Last resort
        try {
            return Carbon::parse($value)->format('Y-m-d');
        } catch (\Exception $e) {
            throw new \Exception("Invalid date format: '{$value}'");
        }
    }

    private function closestMatch(string $input, array $valid): ?string
    {
        $lower = strtolower(trim($input));
        foreach ($valid as $v) {
            if (strtolower($v) === $lower) return $v;
        }
        foreach ($valid as $v) {
            if (str_contains(strtolower($v), $lower) || str_contains($lower, strtolower($v))) return $v;
        }
        return null;
    }

    // ─── Import Logs ─────────────────────────────────────

    public function importLogs(Request $request)
    {
        $query = DB::table('tracker_import_logs')->orderBy('created_at', 'desc');

        if ($v = $request->input('category_key')) {
            $query->where('category_key', $v);
        }

        return response()->json($query->limit(50)->get());
    }

    // ─── Refresh Due Status ──────────────────────────────

    public function refreshDueStatus()
    {
        $updated = 0;

        TrackerRecord::where('status', '!=', 'Removed from Site')
            ->whereNull('deleted_at')
            ->chunkById(200, function ($records) use (&$updated) {
                foreach ($records as $record) {
                    $orig = [$record->is_overdue, $record->days_until_due, $record->is_tuv_overdue, $record->days_until_tuv, $record->is_cert_expired];
                    $record->recalculateDueStatus();
                    $now = [$record->is_overdue, $record->days_until_due, $record->is_tuv_overdue, $record->days_until_tuv, $record->is_cert_expired];

                    if ($orig !== $now) {
                        $record->saveQuietly();
                        $updated++;
                    }
                }
            });

        return response()->json(['message' => "Refreshed. Updated {$updated} records."]);
    }

    // ─── Inspection Search / Item Selector ────────────────

    public function searchItems(Request $request)
    {
        $query = TrackerRecord::with('category')
            ->whereNotIn('status', ['Removed from Site']);

        if ($cat = $request->get('category_key')) {
            $query->where('category_key', $cat);
        }
        if ($type = $request->get('item_subtype')) {
            $query->where('item_subtype', $type);
        }
        if ($s = $request->get('q')) {
            $query->where(function ($q) use ($s) {
                $q->where('equipment_name', 'like', "%$s%")
                  ->orWhere('record_code', 'like', "%$s%")
                  ->orWhere('serial_number', 'like', "%$s%")
                  ->orWhere('plate_number', 'like', "%$s%")
                  ->orWhere('certificate_number', 'like', "%$s%")
                  ->orWhere('sticker_number', 'like', "%$s%")
                  ->orWhere('checker_number', 'like', "%$s%");
            });
        }

        $items = $query
            ->select([
                'id', 'record_code', 'equipment_name',
                'item_subtype', 'category_key', 'status',
                'condition', 'plate_number', 'serial_number',
                'certificate_number', 'sticker_number',
                'last_internal_inspection_date',
                'next_internal_inspection_date',
                'is_overdue', 'days_until_due',
                'tuv_expiry_date', 'is_tuv_overdue',
                'last_inspector_name', 'last_inspection_result',
                'total_inspections_count', 'category_id',
            ])
            ->orderBy('equipment_name')
            ->limit(100)
            ->get()
            ->map(fn($r) => [
                'id'                   => $r->id,
                'record_code'          => $r->record_code,
                'equipment_name'       => $r->equipment_name,
                'item_subtype'         => $r->item_subtype,
                'category_key'         => $r->category_key,
                'category_label'       => $r->category?->label,
                'category_color'       => $r->category?->color,
                'category_light_color' => $r->category?->light_color,
                'category_text_color'  => $r->category?->text_color,
                'status'               => $r->status,
                'condition'            => $r->condition,
                'plate_number'         => $r->plate_number,
                'serial_number'        => $r->serial_number,
                'certificate_number'   => $r->certificate_number,
                'sticker_number'       => $r->sticker_number,
                'last_inspection_date' => $r->last_internal_inspection_date?->format('Y-m-d'),
                'next_due_date'        => $r->next_internal_inspection_date?->format('Y-m-d'),
                'is_overdue'           => $r->is_overdue,
                'days_until_due'       => $r->days_until_due,
                'tuv_expiry_date'      => $r->tuv_expiry_date?->format('Y-m-d'),
                'is_tuv_overdue'       => $r->is_tuv_overdue,
                'last_inspector'       => $r->last_inspector_name,
                'last_result'          => $r->last_inspection_result,
                'total_inspections'    => $r->total_inspections_count,
            ]);

        return response()->json($items);
    }

    // ─── Global Inspection List ───────────────────────────

    public function allInspections(Request $request)
    {
        $query = TrackerInspectionLog::with([
            'record:id,record_code,equipment_name,item_subtype,category_key,plate_number,serial_number,sticker_number,category_id',
            'record.category:id,key,label,color,light_color,text_color',
        ])
        // Exclude inspections for soft-deleted records
        ->whereHas('record');

        if ($cat = $request->get('category_key')) {
            $query->where('category_key', $cat);
        }
        if ($subtype = $request->get('item_subtype')) {
            $query->whereHas('record', fn($q) => $q->where('item_subtype', $subtype));
        }
        if ($itemId = $request->get('tracker_record_id')) {
            $query->where('tracker_record_id', $itemId);
        }
        if ($s = $request->get('search')) {
            $query->where(function ($q) use ($s) {
                $q->where('inspector_name', 'like', "%$s%")
                  ->orWhere('sticker_number', 'like', "%$s%")
                  ->orWhere('certificate_number', 'like', "%$s%")
                  ->orWhere('log_code', 'like', "%$s%")
                  ->orWhere('findings', 'like', "%$s%")
                  ->orWhereHas('record', fn($rq) =>
                      $rq->where('equipment_name', 'like', "%$s%")
                         ->orWhere('record_code', 'like', "%$s%")
                         ->orWhere('plate_number', 'like', "%$s%")
                         ->orWhere('sticker_number', 'like', "%$s%")
                  );
            });
        }
        if ($type = $request->get('inspection_type')) {
            $query->where('inspection_type', $type);
        }
        if ($purpose = $request->get('inspection_purpose')) {
            $query->where('inspection_purpose', $purpose);
        }
        if ($result = $request->get('result')) {
            $query->where('result', $result);
        }
        if ($inspector = $request->get('inspector_name')) {
            $query->where('inspector_name', 'like', "%$inspector%");
        }
        if ($from = $request->get('date_from')) {
            $query->where('inspection_date', '>=', $from);
        }
        if ($to = $request->get('date_to')) {
            $query->where('inspection_date', '<=', $to);
        }
        if ($period = $request->get('period')) {
            match ($period) {
                'week'  => $query->whereBetween('inspection_date', [now()->startOfWeek()->toDateString(), now()->endOfWeek()->toDateString()]),
                'month' => $query->whereMonth('inspection_date', now()->month)->whereYear('inspection_date', now()->year),
                'year'  => $query->whereYear('inspection_date', now()->year),
                default => null,
            };
        }
        if ($request->get('was_overdue')) {
            $query->where('overdue_at_time', true);
        }

        $sortBy  = $request->get('sort_by', 'inspection_date');
        $sortDir = $request->get('sort_dir', 'desc');
        $allowed = ['inspection_date', 'result', 'inspector_name', 'inspection_type', 'created_at'];
        if (in_array($sortBy, $allowed)) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        }

        $inspections = $query->paginate($request->get('per_page', 25));

        $inspections->getCollection()->transform(function ($log) {
            $log->checklist_file_url    = $log->checklist_file_url;
            $log->checklist_image_url   = $log->checklist_image_url;
            $log->additional_image_urls = $log->additional_image_urls;
            $log->supporting_doc_urls   = $log->supporting_doc_urls;
            return $log;
        });

        return response()->json($inspections);
    }

    // ─── Enhanced Record Inspection ───────────────────────

    public function recordInspectionEnhanced(Request $request, TrackerRecord $record)
    {
        $validated = $request->validate([
            'inspection_date'        => 'required|date',
            'inspection_type'        => 'required|in:Internal Daily,Internal Weekly,Internal Monthly,Third Party / TUV,Pre-Use Check,Post-Incident,Handover,Electrical Test,Certification Renewal',
            'inspection_purpose'     => 'nullable|in:Routine,Post-Incident,Pre-Mobilisation,Certification,TUV Renewal,Emergency,Scheduled',
            'inspection_frequency'   => 'nullable|in:Daily,Weekly,Monthly,Quarterly,Annual',
            'inspector_name'         => 'required|string|max:255',
            'inspector_company'      => 'nullable|string|max:200',
            'result'                 => 'required|in:Pass,Fail,Pass with Issues,Requires Action',
            'condition_found'        => 'required|in:Good,Fair,Poor,Out of Service,Quarantined',
            'next_inspection_date'   => 'nullable|date|after:inspection_date',
            'sticker_number'         => 'nullable|string|max:200',
            'plate_number_at_insp'   => 'nullable|string|max:100',
            'certificate_issued'     => 'nullable|boolean',
            'certificate_number'     => 'nullable|string|max:200',
            'certificate_expiry'     => 'nullable|date',
            'tuv_updated'            => 'nullable|boolean',
            'findings'               => 'nullable|string',
            'corrective_actions'     => 'nullable|string',
            'visual_condition_notes' => 'nullable|string',
            'defect_found'           => 'nullable|boolean',
            'defect_detail'          => 'nullable|string|required_if:defect_found,true',
            'notes'                  => 'nullable|string',
            'verified_by'            => 'nullable|string|max:255',
            'extinguisher_weight_kg' => 'nullable|numeric',
            'civil_defense_tag_ok'   => 'nullable|boolean',
            'harness_condition'      => 'nullable|string|max:100',
            'drop_arrest_occurred'   => 'nullable|boolean',
            'ladder_type'            => 'nullable|string|max:100',
            'checklist_data'         => 'nullable|json',
            'checklist_file'         => 'nullable|file|max:20480|mimes:pdf,doc,docx,xlsx,xls',
            'checklist_image'        => 'nullable|image|max:10240',
            'additional_images.*'    => 'nullable|image|max:10240',
            'supporting_docs.*'      => 'nullable|file|max:20480',
        ]);

        $folder = 'tracker/inspections/' . $record->category_key . '/' . $record->id;

        if ($request->hasFile('checklist_file')) {
            $validated['checklist_file_path'] = $request->file('checklist_file')
                ->store($folder . '/checklists', 'public');
        }
        if ($request->hasFile('checklist_image')) {
            $validated['checklist_image_path'] = $request->file('checklist_image')
                ->store($folder . '/images', 'public');
        }
        if ($request->hasFile('additional_images')) {
            $paths = [];
            foreach ($request->file('additional_images') as $img) {
                $paths[] = $img->store($folder . '/images', 'public');
            }
            $validated['additional_images'] = $paths;
        }
        if ($request->hasFile('supporting_docs')) {
            $paths = [];
            foreach ($request->file('supporting_docs') as $doc) {
                $paths[] = $doc->store($folder . '/docs', 'public');
            }
            $validated['supporting_docs'] = $paths;
        }

        // Decode checklist_data from JSON string
        if (isset($validated['checklist_data']) && is_string($validated['checklist_data'])) {
            $validated['checklist_data'] = json_decode($validated['checklist_data'], true);
        }

        // Capture overdue state BEFORE updating dates
        $validated['overdue_at_time']      = $record->is_overdue;
        $validated['days_overdue_at_time'] = $record->is_overdue ? abs($record->days_until_due ?? 0) : 0;
        $validated['tracker_record_id']    = $record->id;
        $validated['category_key']         = $record->category_key;
        $validated['recorded_by']          = Auth::id();

        unset($validated['checklist_file'], $validated['checklist_image']);

        $log = DB::transaction(function () use ($validated, $record) {
            $log = TrackerInspectionLog::create($validated);

            // Update parent record with inspection results
            $recordUpdate = [
                'last_internal_inspection_date' => $validated['inspection_date'],
                'last_inspected_by' => $validated['inspector_name'],
            ];
            if (!empty($validated['next_inspection_date'])) {
                $recordUpdate['next_internal_inspection_date'] = $validated['next_inspection_date'];
            } elseif ($record->category && $record->category->insp_freq_days) {
                $recordUpdate['next_internal_inspection_date'] = Carbon::parse($validated['inspection_date'])
                    ->addDays($record->category->insp_freq_days)->toDateString();
            }
            if (!empty($validated['condition_found'])) {
                $recordUpdate['condition'] = $validated['condition_found'];
            }
            if (!empty($validated['sticker_number'])) {
                $recordUpdate['sticker_number'] = $validated['sticker_number'];
            }
            // Certificate updates
            if (!empty($validated['certificate_number'])) {
                $recordUpdate['certificate_number'] = $validated['certificate_number'];
            }
            if (!empty($validated['certificate_expiry'])) {
                $recordUpdate['certificate_expiry'] = $validated['certificate_expiry'];
            }
            // TUV update
            if (!empty($validated['tuv_updated']) && !empty($validated['certificate_expiry'])) {
                $recordUpdate['tuv_expiry_date'] = $validated['certificate_expiry'];
            }
            // Handle defect
            if ($validated['defect_found'] ?? false) {
                $recordUpdate['has_open_defect'] = true;
                $recordUpdate['defect_description'] = $validated['defect_detail'] ?? 'Defect found during inspection';
                $recordUpdate['defect_reported_date'] = now()->toDateString();
                if ($validated['result'] === 'Fail') {
                    $recordUpdate['status'] = 'Out of Service';
                }
            }
            // Handle drop arrest for harness
            if ($validated['drop_arrest_occurred'] ?? false) {
                $recordUpdate['status'] = 'Out of Service';
                $recordUpdate['condition'] = 'Out of Service';
            }

            $record->update($recordUpdate);

            return $log;
        });

        return response()->json([
            'message' => 'Inspection recorded successfully',
            'log'     => $log,
            'record'  => $record->fresh()->load('category'),
        ], 201);
    }

    // ─── Inspection Detail ────────────────────────────────

    public function showInspection(TrackerInspectionLog $log)
    {
        $log->load([
            'record:id,record_code,equipment_name,item_subtype,category_key,plate_number,serial_number,sticker_number,status,condition,category_id',
            'record.category',
        ]);
        $log->checklist_file_url    = $log->checklist_file_url;
        $log->checklist_image_url   = $log->checklist_image_url;
        $log->additional_image_urls = $log->additional_image_urls;
        $log->supporting_doc_urls   = $log->supporting_doc_urls;

        return response()->json($log);
    }

    // ─── Update Inspection ────────────────────────────────

    public function updateInspection(Request $request, TrackerInspectionLog $log)
    {
        $validated = $request->validate([
            'inspection_date'        => 'sometimes|date',
            'inspection_type'        => 'sometimes|in:Internal Daily,Internal Weekly,Internal Monthly,Third Party / TUV,Pre-Use Check,Post-Incident,Handover,Electrical Test,Certification Renewal',
            'inspection_purpose'     => 'nullable|in:Routine,Post-Incident,Pre-Mobilisation,Certification,TUV Renewal,Emergency,Scheduled',
            'inspection_frequency'   => 'nullable|in:Daily,Weekly,Monthly,Quarterly,Annual',
            'inspector_name'         => 'sometimes|string|max:255',
            'inspector_company'      => 'nullable|string|max:200',
            'result'                 => 'sometimes|in:Pass,Fail,Pass with Issues,Requires Action',
            'condition_found'        => 'sometimes|in:Good,Fair,Poor,Out of Service,Quarantined',
            'next_inspection_date'   => 'nullable|date',
            'sticker_number'         => 'nullable|string|max:200',
            'plate_number_at_insp'   => 'nullable|string|max:100',
            'certificate_issued'     => 'nullable|boolean',
            'certificate_number'     => 'nullable|string|max:200',
            'certificate_expiry'     => 'nullable|date',
            'tuv_updated'            => 'nullable|boolean',
            'findings'               => 'nullable|string',
            'corrective_actions'     => 'nullable|string',
            'visual_condition_notes' => 'nullable|string',
            'defect_found'           => 'nullable|boolean',
            'defect_detail'          => 'nullable|string',
            'notes'                  => 'nullable|string',
            'verified_by'            => 'nullable|string|max:255',
            'extinguisher_weight_kg' => 'nullable|numeric',
            'civil_defense_tag_ok'   => 'nullable|boolean',
            'harness_condition'      => 'nullable|string|max:100',
            'drop_arrest_occurred'   => 'nullable|boolean',
            'ladder_type'            => 'nullable|string|max:100',
            'checklist_data'              => 'nullable|json',
            'checklist_file'              => 'nullable|file|max:20480|mimes:pdf,doc,docx,xlsx,xls',
            'checklist_image'             => 'nullable|image|max:10240',
            'additional_images.*'         => 'nullable|image|max:10240',
            'supporting_docs.*'           => 'nullable|file|max:20480',
            'remove_checklist_file'       => 'nullable|boolean',
            'remove_checklist_image'      => 'nullable|boolean',
            'existing_additional_images'  => 'nullable|array',
            'existing_additional_images.*'=> 'string',
            'existing_supporting_docs'    => 'nullable|array',
            'existing_supporting_docs.*'  => 'string',
        ]);

        $folder = 'tracker/inspections/' . $log->category_key . '/' . $log->tracker_record_id;

        // Handle checklist file: new upload, removal, or keep
        if ($request->hasFile('checklist_file')) {
            if ($log->checklist_file_path) {
                Storage::disk('public')->delete($log->checklist_file_path);
            }
            $validated['checklist_file_path'] = $request->file('checklist_file')
                ->store($folder . '/checklists', 'public');
        } elseif ($request->boolean('remove_checklist_file')) {
            if ($log->checklist_file_path) {
                Storage::disk('public')->delete($log->checklist_file_path);
            }
            $validated['checklist_file_path'] = null;
        }

        // Handle checklist image: new upload, removal, or keep
        if ($request->hasFile('checklist_image')) {
            if ($log->checklist_image_path) {
                Storage::disk('public')->delete($log->checklist_image_path);
            }
            $validated['checklist_image_path'] = $request->file('checklist_image')
                ->store($folder . '/images', 'public');
        } elseif ($request->boolean('remove_checklist_image')) {
            if ($log->checklist_image_path) {
                Storage::disk('public')->delete($log->checklist_image_path);
            }
            $validated['checklist_image_path'] = null;
        }

        // Handle additional images: merge existing kept paths + new uploads
        {
            $existingKept = $request->input('existing_additional_images', []);
            $currentPaths = is_array($log->additional_images) ? $log->additional_images : [];

            // Delete removed images from storage
            foreach ($currentPaths as $path) {
                if (!in_array($path, $existingKept)) {
                    Storage::disk('public')->delete($path);
                }
            }

            // Upload new images
            $newPaths = [];
            if ($request->hasFile('additional_images')) {
                foreach ($request->file('additional_images') as $img) {
                    $newPaths[] = $img->store($folder . '/images', 'public');
                }
            }

            $merged = array_merge($existingKept, $newPaths);
            if (count($merged) > 0 || count($currentPaths) > 0) {
                $validated['additional_images'] = $merged ?: null;
            }
        }

        // Handle supporting docs: merge existing kept paths + new uploads
        {
            $existingKept = $request->input('existing_supporting_docs', []);
            $currentPaths = is_array($log->supporting_docs) ? $log->supporting_docs : [];

            // Delete removed docs from storage
            foreach ($currentPaths as $path) {
                if (!in_array($path, $existingKept)) {
                    Storage::disk('public')->delete($path);
                }
            }

            // Upload new docs
            $newPaths = [];
            if ($request->hasFile('supporting_docs')) {
                foreach ($request->file('supporting_docs') as $doc) {
                    $newPaths[] = $doc->store($folder . '/docs', 'public');
                }
            }

            $merged = array_merge($existingKept, $newPaths);
            if (count($merged) > 0 || count($currentPaths) > 0) {
                $validated['supporting_docs'] = $merged ?: null;
            }
        }

        // Decode checklist_data from JSON string
        if (isset($validated['checklist_data']) && is_string($validated['checklist_data'])) {
            $validated['checklist_data'] = json_decode($validated['checklist_data'], true);
        }

        unset($validated['checklist_file'], $validated['checklist_image'],
              $validated['remove_checklist_file'], $validated['remove_checklist_image'],
              $validated['existing_additional_images'], $validated['existing_supporting_docs']);

        if (isset($validated['verified_by']) && $validated['verified_by']) {
            $validated['verified_at'] = now();
        }

        $log->update($validated);

        return response()->json([
            'message' => 'Inspection updated',
            'log'     => $log->fresh(),
        ]);
    }

    // ─── Delete Inspection ────────────────────────────────

    public function destroyInspection(TrackerInspectionLog $log)
    {
        // Clean up attached files
        if ($log->checklist_file_path) {
            Storage::disk('public')->delete($log->checklist_file_path);
        }
        if ($log->checklist_image_path) {
            Storage::disk('public')->delete($log->checklist_image_path);
        }
        if ($log->additional_image_paths) {
            foreach ($log->additional_image_paths as $path) {
                Storage::disk('public')->delete($path);
            }
        }
        if ($log->supporting_doc_paths) {
            foreach ($log->supporting_doc_paths as $path) {
                Storage::disk('public')->delete($path);
            }
        }

        $log->delete();

        return response()->json(['message' => 'Inspection deleted successfully']);
    }

    // ─── Inspection Stats ─────────────────────────────────

    public function inspectionStats(Request $request)
    {
        $year = $request->get('year', now()->year);

        // Base query: only inspections for non-deleted records
        $activeScope = fn($q) => $q->whereHas('record');

        $kpis = [
            'total_inspections' => TrackerInspectionLog::where($activeScope)->count(),
            'this_month'        => TrackerInspectionLog::where($activeScope)
                                    ->whereMonth('inspection_date', now()->month)
                                    ->whereYear('inspection_date', now()->year)->count(),
            'pass_count'        => TrackerInspectionLog::where($activeScope)->where('result', 'Pass')->count(),
            'fail_count'        => TrackerInspectionLog::where($activeScope)->where('result', 'Fail')->count(),
            'with_defects'      => TrackerInspectionLog::where($activeScope)->where('defect_found', true)->count(),
            'with_checklists'   => TrackerInspectionLog::where($activeScope)->where(function ($q) {
                                    $q->whereNotNull('checklist_file_path')
                                      ->orWhereNotNull('checklist_image_path');
                                  })->count(),
        ];

        $monthly = TrackerInspectionLog::whereHas('record')
            ->selectRaw(
                'MONTH(inspection_date) as month, COUNT(*) as total,
                 SUM(result = "Pass") as pass_count,
                 SUM(result = "Fail") as fail_count'
            )->whereYear('inspection_date', $year)
             ->groupBy('month')
             ->orderBy('month')
             ->get();

        $byCategory = TrackerInspectionLog::whereHas('record')
            ->selectRaw(
                'category_key, COUNT(*) as total,
                 SUM(result = "Pass") as pass_count,
                 SUM(result = "Fail") as fail_count'
            )->groupBy('category_key')
             ->orderByDesc('total')
             ->get();

        $byInspector = TrackerInspectionLog::whereHas('record')
            ->selectRaw(
                'inspector_name, COUNT(*) as total'
            )->groupBy('inspector_name')
             ->orderByDesc('total')
             ->limit(10)
             ->get();

        $byResult = TrackerInspectionLog::whereHas('record')
            ->selectRaw(
                'result, COUNT(*) as total'
            )->groupBy('result')
             ->get();

        $upcoming = TrackerRecord::with('category')
            ->where('status', 'Active')
            ->whereNotNull('next_internal_inspection_date')
            ->whereBetween('next_internal_inspection_date', [
                now()->toDateString(),
                now()->addDays(7)->toDateString(),
            ])
            ->orderBy('next_internal_inspection_date')
            ->limit(15)
            ->select([
                'id', 'record_code', 'equipment_name',
                'item_subtype', 'category_key',
                'next_internal_inspection_date',
                'days_until_due', 'is_overdue', 'category_id',
            ])
            ->get();

        return response()->json(compact(
            'kpis', 'monthly', 'byCategory',
            'byInspector', 'byResult', 'upcoming'
        ));
    }

    // ─── Export Inspections ───────────────────────────────

    public function exportInspections(Request $request)
    {
        $query = TrackerInspectionLog::with([
            'record:id,record_code,equipment_name,item_subtype,category_key,plate_number,serial_number',
            'record.category:id,key,label',
        ])
        // Exclude inspections for soft-deleted records
        ->whereHas('record');

        if ($cat = $request->get('category_key')) {
            $query->where('category_key', $cat);
        }
        if ($from = $request->get('date_from')) {
            $query->where('inspection_date', '>=', $from);
        }
        if ($to = $request->get('date_to')) {
            $query->where('inspection_date', '<=', $to);
        }
        if ($result = $request->get('result')) {
            $query->where('result', $result);
        }
        if ($inspector = $request->get('inspector_name')) {
            $query->where('inspector_name', 'like', "%$inspector%");
        }

        $logs = $query->orderBy('inspection_date', 'desc')->get();

        $headers = [
            'Log Code', 'Category', 'Equipment Name', 'Sub-Type', 'Record Code',
            'Plate Number', 'Serial Number', 'Sticker Number',
            'Inspection Date', 'Inspection Type', 'Purpose', 'Inspector', 'Company',
            'Result', 'Condition Found', 'Next Due Date', 'Certificate Number',
            'Defect Found', 'Overdue at Time', 'Days Overdue',
            'Findings', 'Corrective Actions', 'Notes',
            'Has Checklist File', 'Has Checklist Image', 'Created',
        ];

        $rows = $logs->map(fn($log) => [
            $log->log_code,
            $log->record?->category?->label ?? $log->category_key,
            $log->record?->equipment_name,
            $log->record?->item_subtype,
            $log->record?->record_code,
            $log->plate_number_at_insp ?? $log->record?->plate_number,
            $log->record?->serial_number,
            $log->sticker_number,
            $log->inspection_date?->format('Y-m-d'),
            $log->inspection_type,
            $log->inspection_purpose,
            $log->inspector_name,
            $log->inspector_company,
            $log->result,
            $log->condition_found,
            $log->next_inspection_date?->format('Y-m-d'),
            $log->certificate_number,
            $log->defect_found ? 'Yes' : 'No',
            $log->overdue_at_time ? 'Yes' : 'No',
            $log->days_overdue_at_time,
            $log->findings,
            $log->corrective_actions,
            $log->notes,
            $log->checklist_file_path ? 'Yes' : 'No',
            $log->checklist_image_path ? 'Yes' : 'No',
            $log->created_at?->format('Y-m-d H:i'),
        ])->values()->toArray();

        return $this->exportAs($headers, $rows, 'Inspections', $request->get('format', 'csv'));
    }

    // ─── Checklist Integration ────────────────────────────

    /**
     * GET /tracker/records/{id}/checklist-matches
     * Find checklist items that can be linked to this tracker record.
     */
    public function findChecklistMatches(Request $request, $id)
    {
        $record = TrackerRecord::findOrFail($id);
        $templateKey = $this->getChecklistTemplateKey($record->category_key);

        if (!$templateKey) {
            return response()->json([]);
        }

        $mewpTypes = ['forklift', 'scissor_lift', 'man_lift', 'boom_lift'];
        $query = ChecklistItem::whereNull('deleted_at');

        if (in_array($record->category_key, $mewpTypes)) {
            $query->where('category_key', 'mewp');
        } else {
            $query->where('category_key', $templateKey);
        }

        $search = $request->query('q', '');
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('item_code', 'like', "%{$search}%")
                  ->orWhere('serial_number', 'like', "%{$search}%")
                  ->orWhere('plate_number', 'like', "%{$search}%");
            });
        }

        $items = $query->select('id', 'item_code', 'name', 'serial_number', 'plate_number', 'status', 'health_condition')
            ->orderBy('name')
            ->limit(50)
            ->get();

        return response()->json($items);
    }

    /**
     * POST /tracker/records/{id}/link-checklist
     * Manually link a tracker record to a checklist item.
     */
    public function linkChecklist(Request $request, $id)
    {
        $record = TrackerRecord::findOrFail($id);

        $request->validate([
            'checklist_item_id' => 'required|string',
        ]);

        $checklistItem = ChecklistItem::findOrFail($request->checklist_item_id);
        $record->update(['checklist_item_id' => $checklistItem->id]);

        return response()->json([
            'message' => 'Checklist item linked',
            'checklist_data' => $this->resolveChecklistData($record->fresh()),
        ]);
    }

    /**
     * POST /tracker/records/{id}/save-checklist
     * Save checklist inspection responses for a linked checklist item.
     */
    public function saveChecklist(Request $request, $id)
    {
        $record = TrackerRecord::findOrFail($id);

        $validated = $request->validate([
            'checklist_item_id'            => 'nullable|string',
            'checklist_responses'          => 'required|array',
            'checklist_responses.*.id'     => 'required|string',
            'checklist_responses.*.result' => 'required|in:pass,fail,na',
            'checklist_responses.*.note'   => 'nullable|string',
            'inspector_name'               => 'required|string|max:255',
            'inspection_date'              => 'nullable|date',
            'notes'                        => 'nullable|string',
        ]);

        $checklistItemId = $validated['checklist_item_id'] ?? $record->checklist_item_id;

        if (!$checklistItemId) {
            return response()->json(['message' => 'No linked checklist item.'], 422);
        }

        // Link if not already linked
        if ($record->checklist_item_id !== $checklistItemId) {
            $record->update(['checklist_item_id' => $checklistItemId]);
        }

        $this->saveChecklistInspection(
            $record->fresh(),
            $validated['checklist_responses'],
            $validated['inspector_name'],
            $validated['notes'] ?? null,
            $validated['inspection_date'] ?? null
        );

        return response()->json([
            'message' => 'Checklist inspection saved',
            'checklist_data' => $this->resolveChecklistData($record->fresh()),
        ]);
    }

    // ─── Private Checklist Helpers ────────────────────────

    /**
     * Resolve checklist data for a tracker record.
     * Auto-matches if not already linked.
     */
    private function resolveChecklistData(TrackerRecord $record): ?array
    {
        $templateKey = $this->getChecklistTemplateKey($record->category_key);
        if (!$templateKey) {
            return null;
        }

        $checklistItem = null;

        // Try linked item first
        if ($record->checklist_item_id) {
            $checklistItem = ChecklistItem::with('latestInspection')->find($record->checklist_item_id);
        }

        // Auto-match if not linked
        if (!$checklistItem) {
            $checklistItem = $this->autoMatchChecklistItem($record, $templateKey);
            if ($checklistItem) {
                $record->updateQuietly(['checklist_item_id' => $checklistItem->id]);
                $checklistItem->load('latestInspection');
            }
        }

        $result = [
            'template_key' => $templateKey,
            'checklist_item' => null,
            'latest_inspection' => null,
            'checklist_responses' => null,
        ];

        if ($checklistItem) {
            $latest = $checklistItem->latestInspection;
            $result['checklist_item'] = [
                'id' => $checklistItem->id,
                'item_code' => $checklistItem->item_code,
                'name' => $checklistItem->name,
                'health_condition' => $checklistItem->health_condition,
                'status' => $checklistItem->status,
            ];
            if ($latest) {
                $result['latest_inspection'] = [
                    'id' => $latest->id,
                    'inspection_code' => $latest->inspection_code,
                    'inspection_date' => $latest->inspection_date?->toDateString(),
                    'inspector_name' => $latest->inspector_name,
                    'overall_result' => $latest->overall_result,
                    'health_condition_found' => $latest->health_condition_found,
                    'notes' => $latest->notes,
                    'findings' => $latest->findings,
                ];
                $result['checklist_responses'] = $latest->checklist_responses;
            }
        }

        return $result;
    }

    /**
     * Try to auto-match a tracker record to a checklist item
     * by serial number, plate number, or equipment name.
     */
    private function autoMatchChecklistItem(TrackerRecord $record, string $templateKey): ?ChecklistItem
    {
        $mewpTypes = ['forklift', 'scissor_lift', 'man_lift', 'boom_lift'];

        $query = ChecklistItem::whereNull('deleted_at')
            ->where('status', '!=', 'Removed from Site');

        if (in_array($record->category_key, $mewpTypes)) {
            $query->where('category_key', 'mewp')
                  ->where('mewp_type', $record->category_key);
        } else {
            $query->where('category_key', $templateKey);
        }

        // Try matching by serial number first
        if ($record->serial_number) {
            $match = (clone $query)->where('serial_number', $record->serial_number)->first();
            if ($match) return $match;
        }

        // Try matching by plate number
        if ($record->plate_number) {
            $match = (clone $query)->where('plate_number', $record->plate_number)->first();
            if ($match) return $match;
        }

        // Try matching by name
        $match = (clone $query)->where('name', $record->equipment_name)->first();
        return $match;
    }

    /**
     * Save a structured checklist inspection on the linked checklist item.
     */
    private function saveChecklistInspection(
        TrackerRecord $record,
        array $responses,
        ?string $inspectorName,
        ?string $notes,
        ?string $inspectionDate = null
    ): void {
        $checklistItem = ChecklistItem::with('category')->find($record->checklist_item_id);
        if (!$checklistItem) return;

        $failCount = collect($responses)->where('result', 'fail')->count();

        $overallResult = match (true) {
            $failCount === 0 => 'Pass',
            $failCount <= 2  => 'Pass with Issues',
            default          => 'Fail',
        };

        $healthCondition = match (true) {
            $failCount > 3  => 'Poor',
            $failCount > 0  => 'Fair',
            default         => 'Good',
        };

        ChecklistInspection::create([
            'checklist_item_id'    => $checklistItem->id,
            'category_id'         => $checklistItem->category_id,
            'inspection_date'     => $inspectionDate ?? now()->toDateString(),
            'inspection_type'     => 'Internal',
            'inspector_name'      => $inspectorName ?? Auth::user()?->full_name ?? Auth::user()?->email ?? 'System',
            'overall_result'      => $overallResult,
            'health_condition_found' => $healthCondition,
            'checklist_responses' => $responses,
            'notes'               => $notes,
            'findings'            => $failCount > 0
                ? "$failCount item(s) failed inspection."
                : 'All items passed inspection.',
            'recorded_by'         => Auth::id(),
        ]);
    }

    /**
     * Map tracker category keys to checklist template keys.
     */
    private function getChecklistTemplateKey(string $trackerCategoryKey): ?string
    {
        $mapping = [
            'forklift'          => 'mewp',
            'scissor_lift'      => 'mewp',
            'man_lift'          => 'mewp',
            'boom_lift'         => 'mewp',
            'fire_extinguisher' => 'fire_extinguisher',
            'full_body_harness' => 'full_body_harness',
            'ladder'            => 'ladder',
            'grinder'           => 'grinder',
            'cutter'            => 'cutter',
        ];

        return $mapping[$trackerCategoryKey] ?? null;
    }
}
