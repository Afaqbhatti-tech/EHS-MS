<?php

namespace App\Http\Controllers;

use App\Models\EquipmentRegister;
use App\Http\Traits\ExportsData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class EquipmentRegisterController extends Controller
{
    use ExportsData;

    // ═══════════════════════════════════════════════════════════
    //  LIST / INDEX
    // ═══════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        $query = EquipmentRegister::query();

        // ── Search ──
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('equipment_name', 'like', "%{$search}%")
                  ->orWhere('equipment_code', 'like', "%{$search}%")
                  ->orWhere('serial_number', 'like', "%{$search}%")
                  ->orWhere('asset_tag', 'like', "%{$search}%")
                  ->orWhere('registration_number', 'like', "%{$search}%")
                  ->orWhere('manufacturer', 'like', "%{$search}%")
                  ->orWhere('company_name', 'like', "%{$search}%")
                  ->orWhere('area', 'like', "%{$search}%")
                  ->orWhere('zone', 'like', "%{$search}%");
            });
        }

        // ── Filters ──
        if ($v = $request->input('equipment_status'))   $query->where('equipment_status', $v);
        if ($v = $request->input('working_status'))      $query->where('working_status', $v);
        if ($v = $request->input('condition_status'))     $query->where('condition_status', $v);
        if ($v = $request->input('equipment_category'))   $query->where('equipment_category', $v);
        if ($v = $request->input('company_name'))         $query->where('company_name', $v);
        if ($v = $request->input('area'))                 $query->where('area', $v);
        if ($v = $request->input('zone'))                 $query->where('zone', $v);
        if ($v = $request->input('inspection_status'))    $query->where('inspection_status', $v);
        if ($v = $request->input('rental_status'))        $query->where('rental_status', $v);
        if ($v = $request->input('tuv_authorized'))        $query->where('tuv_authorized', $v);

        if ($request->boolean('overdue')) {
            $query->where('inspection_status', 'overdue');
        }
        if ($request->boolean('due_soon')) {
            $query->where('inspection_status', 'due_soon');
        }

        if ($v = $request->input('date_from')) {
            $query->where('created_at', '>=', $v);
        }
        if ($v = $request->input('date_to')) {
            $query->where('created_at', '<=', $v . ' 23:59:59');
        }

        // ── Sorting ──
        $sortBy  = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');
        $allowed = [
            'equipment_name', 'equipment_code', 'serial_number', 'equipment_category',
            'equipment_status', 'working_status', 'condition_status', 'area', 'zone',
            'company_name', 'next_inspection_date', 'created_at', 'purchase_date',
        ];
        if (in_array($sortBy, $allowed)) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderByDesc('created_at');
        }

        // ── Pagination ──
        $perPage = min((int) $request->input('per_page', 25), 100);
        $paginated = $query->paginate($perPage);

        // Append computed attributes
        $paginated->getCollection()->transform(function ($item) {
            $item->image_url = $item->image_url;
            return $item;
        });

        return response()->json($paginated);
    }

    // ═══════════════════════════════════════════════════════════
    //  SHOW
    // ═══════════════════════════════════════════════════════════

    public function show(EquipmentRegister $equipment): JsonResponse
    {
        $equipment->image_url             = $equipment->image_url;
        $equipment->additional_image_urls = $equipment->additional_image_urls;
        $equipment->attachment_urls       = $equipment->attachment_urls;

        return response()->json($equipment);
    }

    // ═══════════════════════════════════════════════════════════
    //  STORE (CREATE)
    // ═══════════════════════════════════════════════════════════

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'equipment_name'       => 'required|string|max:255',
            'serial_number'        => 'nullable|string|max:100',
            'equipment_category'   => 'nullable|string|max:80',
            'equipment_type'       => 'nullable|string|max:120',
            'manufacturer'         => 'nullable|string|max:150',
            'model_number'         => 'nullable|string|max:100',
            'asset_tag'            => 'nullable|string|max:80',
            'registration_number'  => 'nullable|string|max:80',
            'equipment_status'     => 'nullable|string|in:active,inactive,under_maintenance,out_of_service,retired',
            'working_status'       => 'nullable|string|in:currently_working,standby,damaged,old_equipment',
            'condition_status'     => 'nullable|string|in:excellent,good,fair,poor,damaged',
            'condition_details'    => 'nullable|string|max:2000',
            'purchase_date'        => 'nullable|date',
            'commissioning_date'   => 'nullable|date',
            'retirement_date'      => 'nullable|date',
            'project_name'         => 'nullable|string|max:150',
            'current_location'     => 'nullable|string|max:200',
            'area'                 => 'nullable|string|max:100',
            'zone'                 => 'nullable|string|max:100',
            'assigned_team'        => 'nullable|string|max:150',
            'assigned_supervisor'  => 'nullable|string|max:150',
            'assigned_operator'    => 'nullable|string|max:150',
            'company_name'         => 'nullable|string|max:150',
            'tuv_authorized'       => 'nullable|string|in:yes,no',
            'vendor_supplier'      => 'nullable|string|max:150',
            'last_inspection_date' => 'nullable|date',
            'next_inspection_date' => 'nullable|date',
            'inspection_frequency' => 'nullable|string|in:daily,weekly,monthly,quarterly,semi_annual,annual',
            'certificate_number'   => 'nullable|string|max:100',
            'tuv_valid_until'      => 'nullable|date',
            'purchase_cost'        => 'nullable|numeric|min:0',
            'rental_status'        => 'nullable|string|in:owned,rented,leased',
            'rental_company'       => 'nullable|string|max:150',
            'warranty_expiry'      => 'nullable|date',
            'notes'                => 'nullable|string|max:5000',
            'remarks'              => 'nullable|string|max:5000',
            'image'                => 'nullable|file|max:10240|mimes:jpg,jpeg,png,gif,webp,bmp,pdf,doc,docx,xls,xlsx,csv,ppt,pptx,txt',
            'additional_images.*'  => 'nullable|file|max:10240|mimes:jpg,jpeg,png,gif,webp,bmp,pdf,doc,docx,xls,xlsx,csv,ppt,pptx,txt',
            'attachments.*'        => 'nullable|file|max:20480',
        ]);

        // Handle image upload
        if ($request->hasFile('image')) {
            $validated['image_path'] = $request->file('image')
                ->store('equipment-register/images', 'public');
        }

        // Handle additional images
        if ($request->hasFile('additional_images')) {
            $paths = [];
            foreach ($request->file('additional_images') as $file) {
                $paths[] = $file->store('equipment-register/images', 'public');
            }
            $validated['additional_images'] = $paths;
        }

        // Handle attachments
        if ($request->hasFile('attachments')) {
            $paths = [];
            foreach ($request->file('attachments') as $file) {
                $paths[] = $file->store('equipment-register/attachments', 'public');
            }
            $validated['attachments'] = $paths;
        }

        // Remove file fields that aren't model columns
        unset($validated['image'], $validated['additional_images.*'], $validated['attachments.*']);

        $validated['created_by'] = Auth::user()?->full_name ?? Auth::user()?->email ?? 'System';
        $validated['updated_by'] = Auth::user()?->full_name ?? Auth::user()?->email ?? 'System';

        $equipment = DB::transaction(function () use ($validated) {
            // Generate equipment_code with lock to prevent race conditions
            $lastCode = EquipmentRegister::withTrashed()
                ->lockForUpdate()
                ->orderByDesc('id')
                ->value('equipment_code');
            $seq = $lastCode ? (int) substr($lastCode, -5) + 1 : 1;
            $validated['equipment_code'] = 'EQR-' . str_pad($seq, 5, '0', STR_PAD_LEFT);

            return EquipmentRegister::create($validated);
        });

        $equipment->image_url = $equipment->image_url;

        return response()->json([
            'message' => 'Equipment registered successfully',
            'data'    => $equipment,
        ], 201);
    }

    // ═══════════════════════════════════════════════════════════
    //  UPDATE
    // ═══════════════════════════════════════════════════════════

    public function update(Request $request, EquipmentRegister $equipment): JsonResponse
    {
        $validated = $request->validate([
            'equipment_name'       => 'sometimes|string|max:255',
            'serial_number'        => 'nullable|string|max:100',
            'equipment_category'   => 'nullable|string|max:80',
            'equipment_type'       => 'nullable|string|max:120',
            'manufacturer'         => 'nullable|string|max:150',
            'model_number'         => 'nullable|string|max:100',
            'asset_tag'            => 'nullable|string|max:80',
            'registration_number'  => 'nullable|string|max:80',
            'equipment_status'     => 'nullable|string|in:active,inactive,under_maintenance,out_of_service,retired',
            'working_status'       => 'nullable|string|in:currently_working,standby,damaged,old_equipment',
            'condition_status'     => 'nullable|string|in:excellent,good,fair,poor,damaged',
            'condition_details'    => 'nullable|string|max:2000',
            'purchase_date'        => 'nullable|date',
            'commissioning_date'   => 'nullable|date',
            'retirement_date'      => 'nullable|date',
            'project_name'         => 'nullable|string|max:150',
            'current_location'     => 'nullable|string|max:200',
            'area'                 => 'nullable|string|max:100',
            'zone'                 => 'nullable|string|max:100',
            'assigned_team'        => 'nullable|string|max:150',
            'assigned_supervisor'  => 'nullable|string|max:150',
            'assigned_operator'    => 'nullable|string|max:150',
            'company_name'         => 'nullable|string|max:150',
            'tuv_authorized'       => 'nullable|string|in:yes,no',
            'vendor_supplier'      => 'nullable|string|max:150',
            'last_inspection_date' => 'nullable|date',
            'next_inspection_date' => 'nullable|date',
            'inspection_frequency' => 'nullable|string|in:daily,weekly,monthly,quarterly,semi_annual,annual',
            'certificate_number'   => 'nullable|string|max:100',
            'tuv_valid_until'      => 'nullable|date',
            'purchase_cost'        => 'nullable|numeric|min:0',
            'rental_status'        => 'nullable|string|in:owned,rented,leased',
            'rental_company'       => 'nullable|string|max:150',
            'warranty_expiry'      => 'nullable|date',
            'notes'                => 'nullable|string|max:5000',
            'remarks'              => 'nullable|string|max:5000',
            'image'                => 'nullable|file|max:10240|mimes:jpg,jpeg,png,gif,webp,bmp,pdf,doc,docx,xls,xlsx,csv,ppt,pptx,txt',
            'additional_images.*'  => 'nullable|file|max:10240|mimes:jpg,jpeg,png,gif,webp,bmp,pdf,doc,docx,xls,xlsx,csv,ppt,pptx,txt',
            'attachments.*'        => 'nullable|file|max:20480',
        ]);

        // Handle image upload (replace old)
        if ($request->hasFile('image')) {
            if ($equipment->image_path) {
                Storage::disk('public')->delete($equipment->image_path);
            }
            $validated['image_path'] = $request->file('image')
                ->store('equipment-register/images', 'public');
        }

        // Handle additional images
        if ($request->hasFile('additional_images')) {
            // Delete old additional images
            foreach ($equipment->additional_images ?? [] as $oldPath) {
                Storage::disk('public')->delete($oldPath);
            }
            $paths = [];
            foreach ($request->file('additional_images') as $file) {
                $paths[] = $file->store('equipment-register/images', 'public');
            }
            $validated['additional_images'] = $paths;
        }

        // Handle attachments
        if ($request->hasFile('attachments')) {
            foreach ($equipment->attachments ?? [] as $oldPath) {
                Storage::disk('public')->delete($oldPath);
            }
            $paths = [];
            foreach ($request->file('attachments') as $file) {
                $paths[] = $file->store('equipment-register/attachments', 'public');
            }
            $validated['attachments'] = $paths;
        }

        unset($validated['image'], $validated['additional_images.*'], $validated['attachments.*']);

        $validated['updated_by'] = Auth::user()?->full_name ?? Auth::user()?->email ?? 'System';

        $equipment->update($validated);

        $equipment->image_url             = $equipment->image_url;
        $equipment->additional_image_urls = $equipment->additional_image_urls;
        $equipment->attachment_urls       = $equipment->attachment_urls;

        return response()->json([
            'message' => 'Equipment updated successfully',
            'data'    => $equipment,
        ]);
    }

    // ═══════════════════════════════════════════════════════════
    //  DELETE (SOFT)
    // ═══════════════════════════════════════════════════════════

    public function destroy(EquipmentRegister $equipment): JsonResponse
    {
        $equipment->deleted_by = Auth::user()?->full_name ?? Auth::user()?->email ?? 'System';
        $equipment->save();
        $equipment->delete();
        RecycleBinController::logDeleteAction('equipment_register', $equipment);

        return response()->json(['message' => 'Equipment moved to recycle bin']);
    }

    // ═══════════════════════════════════════════════════════════
    //  STATS
    // ═══════════════════════════════════════════════════════════

    public function stats(): JsonResponse
    {
        $statusCounts = EquipmentRegister::selectRaw("
            COUNT(*) as total,
            SUM(equipment_status = 'active') as active,
            SUM(equipment_status = 'inactive') as inactive,
            SUM(equipment_status = 'retired') as retired,
            SUM(equipment_status = 'under_maintenance') as under_maintenance,
            SUM(equipment_status = 'out_of_service') as out_of_service,
            SUM(inspection_status = 'overdue') as overdue,
            SUM(inspection_status = 'due_soon') as due_soon,
            SUM(working_status = 'currently_working') as currently_working,
            SUM(working_status = 'old_equipment') as old_equipment
        ")->first();
        $total = (int) $statusCounts->total;
        $active = (int) $statusCounts->active;
        $inactive = (int) $statusCounts->inactive;
        $retired = (int) $statusCounts->retired;
        $maintenance = (int) $statusCounts->under_maintenance;
        $outOfService = (int) $statusCounts->out_of_service;
        $overdue = (int) $statusCounts->overdue;
        $dueSoon = (int) $statusCounts->due_soon;
        $working = (int) $statusCounts->currently_working;
        $old = (int) $statusCounts->old_equipment;

        // By category
        $byCategory = EquipmentRegister::selectRaw('equipment_category, COUNT(*) as total')
            ->whereNotNull('equipment_category')
            ->groupBy('equipment_category')
            ->orderByDesc('total')
            ->get();

        // By company
        $byCompany = EquipmentRegister::selectRaw('company_name, COUNT(*) as total')
            ->whereNotNull('company_name')
            ->where('company_name', '!=', '')
            ->groupBy('company_name')
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        return response()->json([
            'total'           => $total,
            'active'          => $active,
            'inactive'        => $inactive,
            'retired'         => $retired,
            'under_maintenance' => $maintenance,
            'out_of_service'  => $outOfService,
            'overdue'         => $overdue,
            'due_soon'        => $dueSoon,
            'currently_working' => $working,
            'old_equipment'   => $old,
            'by_category'     => $byCategory,
            'by_company'      => $byCompany,
        ]);
    }

    // ═══════════════════════════════════════════════════════════
    //  FILTER OPTIONS (for dropdowns)
    // ═══════════════════════════════════════════════════════════

    public function filterOptions(): JsonResponse
    {
        $areas = EquipmentRegister::whereNotNull('area')
            ->where('area', '!=', '')
            ->distinct()->pluck('area')->sort()->values();

        $zones = EquipmentRegister::whereNotNull('zone')
            ->where('zone', '!=', '')
            ->distinct()->pluck('zone')->sort()->values();

        $companies = EquipmentRegister::whereNotNull('company_name')
            ->where('company_name', '!=', '')
            ->distinct()->pluck('company_name')->sort()->values();

        return response()->json([
            'areas'      => $areas,
            'zones'      => $zones,
            'companies'  => $companies,
            'statuses'   => EquipmentRegister::STATUSES,
            'working_statuses'  => EquipmentRegister::WORKING_STATUSES,
            'conditions' => EquipmentRegister::CONDITIONS,
            'categories' => EquipmentRegister::CATEGORIES,
            'inspection_frequencies' => EquipmentRegister::INSPECTION_FREQUENCIES,
            'rental_statuses' => EquipmentRegister::RENTAL_STATUSES,
        ]);
    }

    // ═══════════════════════════════════════════════════════════
    //  EXPORT
    // ═══════════════════════════════════════════════════════════

    public function export(Request $request)
    {
        $format = $request->input('format', 'xlsx');

        $query = EquipmentRegister::query();

        // Apply same filters as index
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('equipment_name', 'like', "%{$search}%")
                  ->orWhere('equipment_code', 'like', "%{$search}%")
                  ->orWhere('serial_number', 'like', "%{$search}%");
            });
        }
        if ($v = $request->input('equipment_status'))   $query->where('equipment_status', $v);
        if ($v = $request->input('working_status'))      $query->where('working_status', $v);
        if ($v = $request->input('condition_status'))     $query->where('condition_status', $v);
        if ($v = $request->input('equipment_category'))   $query->where('equipment_category', $v);
        if ($v = $request->input('company_name'))         $query->where('company_name', $v);
        if ($v = $request->input('area'))                 $query->where('area', $v);
        if ($v = $request->input('zone'))                 $query->where('zone', $v);
        if ($v = $request->input('inspection_status'))    $query->where('inspection_status', $v);

        $records = $query->orderByDesc('created_at')->get();

        $headers = [
            'Equipment Code', 'Equipment Name', 'Serial Number', 'Category', 'Type',
            'Manufacturer', 'Model', 'Asset Tag', 'Registration No.',
            'Status', 'Working Status', 'Condition',
            'Area', 'Zone', 'Current Location',
            'Company', 'TUV Authorized',
            'Last Inspection', 'Next Inspection', 'Inspection Status',
            'Certificate No.', 'TUV Valid Until',
            'Purchase Cost', 'Rental Status',
            'Notes', 'Created At',
        ];

        $rows = $records->map(function ($r) {
            return [
                $r->equipment_code,
                $r->equipment_name,
                $r->serial_number ?? '',
                $r->equipment_category ? ucwords(str_replace('_', ' ', $r->equipment_category)) : '',
                $r->equipment_type ?? '',
                $r->manufacturer ?? '',
                $r->model_number ?? '',
                $r->asset_tag ?? '',
                $r->registration_number ?? '',
                ucwords(str_replace('_', ' ', $r->equipment_status)),
                ucwords(str_replace('_', ' ', $r->working_status)),
                ucwords(str_replace('_', ' ', $r->condition_status)),
                $r->area ?? '',
                $r->zone ?? '',
                $r->current_location ?? '',
                $r->company_name ?? '',
                $r->tuv_authorized === 'yes' ? 'Yes' : 'No',
                $r->last_inspection_date ? $r->last_inspection_date->format('d/m/Y') : '',
                $r->next_inspection_date ? $r->next_inspection_date->format('d/m/Y') : '',
                ucwords(str_replace('_', ' ', $r->inspection_status)),
                $r->certificate_number ?? '',
                $r->tuv_valid_until ? $r->tuv_valid_until->format('d/m/Y') : '',
                $r->purchase_cost ?? '',
                ucwords(str_replace('_', ' ', $r->rental_status ?? 'owned')),
                $r->notes ?? '',
                $r->created_at?->format('d/m/Y'),
            ];
        })->toArray();

        return $this->exportAs($headers, $rows, 'Equipment Register', $format);
    }
}
