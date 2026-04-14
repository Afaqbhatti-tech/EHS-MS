<?php

namespace App\Http\Controllers;

use App\Models\EquipmentGroup;
use App\Models\EquipmentGroupField;
use App\Models\EquipmentItem;
use App\Models\EquipmentItemValue;
use App\Models\EquipmentRegistryGroup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class EquipmentGroupController extends Controller
{
    // ── Master field definitions ───────────────────────────
    // These are the available fields users can pick from when creating a group.

    public static function masterFields(): array
    {
        return [
            // Core Fields
            ['key' => 'serial_number',        'label' => 'Serial Number',        'type' => 'text',     'category' => 'Core Fields'],
            ['key' => 'equipment_name',       'label' => 'Equipment Name',       'type' => 'text',     'category' => 'Core Fields'],
            ['key' => 'equipment_type',       'label' => 'Equipment Type',       'type' => 'text',     'category' => 'Core Fields'],
            ['key' => 'equipment_category',   'label' => 'Equipment Category',   'type' => 'text',     'category' => 'Core Fields'],
            ['key' => 'equipment_status',     'label' => 'Equipment Status',     'type' => 'select',   'category' => 'Core Fields',
             'options' => ['Active', 'Inactive', 'Out of Service', 'Under Maintenance', 'Quarantined']],
            ['key' => 'condition',            'label' => 'Condition',            'type' => 'select',   'category' => 'Core Fields',
             'options' => ['Good', 'Fair', 'Poor', 'Out of Service', 'Quarantined']],
            ['key' => 'owner',                'label' => 'Owner',                'type' => 'text',     'category' => 'Core Fields'],
            ['key' => 'company_name',         'label' => 'Company Name',         'type' => 'text',     'category' => 'Core Fields'],
            ['key' => 'area',                 'label' => 'Area',                 'type' => 'text',     'category' => 'Core Fields'],
            ['key' => 'zone_location',        'label' => 'Zone / Location',      'type' => 'text',     'category' => 'Core Fields'],
            ['key' => 'assigned_to',          'label' => 'Assigned To',          'type' => 'text',     'category' => 'Core Fields'],
            ['key' => 'authorized_by',        'label' => 'Authorized By',        'type' => 'text',     'category' => 'Core Fields'],
            ['key' => 'purchase_date',        'label' => 'Purchase Date',        'type' => 'date',     'category' => 'Core Fields'],
            ['key' => 'last_inspection_date', 'label' => 'Last Inspection Date', 'type' => 'date',     'category' => 'Core Fields'],
            ['key' => 'next_inspection_date', 'label' => 'Next Inspection Date', 'type' => 'date',     'category' => 'Core Fields'],
            ['key' => 'inspection_status',    'label' => 'Inspection Status',    'type' => 'select',   'category' => 'Core Fields',
             'options' => ['Passed', 'Failed', 'Pending', 'Overdue']],
            ['key' => 'notes_remarks',        'label' => 'Notes / Remarks',      'type' => 'textarea', 'category' => 'Core Fields'],
            ['key' => 'image_upload',         'label' => 'Image Upload',         'type' => 'file',     'category' => 'Core Fields'],

            // Specific Fields
            ['key' => 'manufacturer',         'label' => 'Manufacturer',         'type' => 'text',     'category' => 'Specific Fields'],
            ['key' => 'model_number',         'label' => 'Model Number',         'type' => 'text',     'category' => 'Specific Fields'],
            ['key' => 'asset_tag',            'label' => 'Asset Tag',            'type' => 'text',     'category' => 'Specific Fields'],
            ['key' => 'registration_number',  'label' => 'Registration Number',  'type' => 'text',     'category' => 'Specific Fields'],
            ['key' => 'capacity',             'label' => 'Capacity',             'type' => 'text',     'category' => 'Specific Fields'],
            ['key' => 'weight',               'label' => 'Weight (KG)',          'type' => 'text',     'category' => 'Specific Fields'],
            ['key' => 'working_height',       'label' => 'Working Height',       'type' => 'text',     'category' => 'Specific Fields'],
            ['key' => 'power_type',           'label' => 'Power Type',           'type' => 'select',   'category' => 'Specific Fields',
             'options' => ['Electric', 'Diesel', 'Gas', 'Manual', 'Hybrid', 'Solar']],
            ['key' => 'fuel_type',            'label' => 'Fuel Type',            'type' => 'select',   'category' => 'Specific Fields',
             'options' => ['Diesel', 'Petrol', 'LPG', 'CNG', 'Electric', 'N/A']],
            ['key' => 'battery_type',         'label' => 'Battery Type',         'type' => 'text',     'category' => 'Specific Fields'],
            ['key' => 'swl',                  'label' => 'SWL (Safe Working Load)', 'type' => 'text',  'category' => 'Specific Fields'],
            ['key' => 'load_capacity',        'label' => 'Load Capacity',        'type' => 'text',     'category' => 'Specific Fields'],

            // Inspection Related Fields
            ['key' => 'date_of_joining',      'label' => 'Date of Joining',      'type' => 'date',     'category' => 'Inspection Related'],
            ['key' => 'inspection_frequency', 'label' => 'Inspection Frequency', 'type' => 'select',   'category' => 'Inspection Related',
             'options' => ['Daily', 'Weekly', 'Bi-Weekly', 'Monthly', 'Quarterly', 'Semi-Annual', 'Annual']],
            ['key' => 'tuv_certificate_number', 'label' => 'TUV Certificate Number', 'type' => 'text', 'category' => 'Inspection Related'],
            ['key' => 'tuv_sticker_number',   'label' => 'TUV Sticker Number',   'type' => 'text',     'category' => 'Inspection Related'],
            ['key' => 'tuv_last_inspection',  'label' => 'TUV Last Inspection Date', 'type' => 'date', 'category' => 'Inspection Related'],
            ['key' => 'tuv_expiry_date',      'label' => 'TUV Expiry Date',      'type' => 'date',     'category' => 'Inspection Related'],
            ['key' => 'certificate_expiry',   'label' => 'Certificate Expiry',   'type' => 'date',     'category' => 'Inspection Related'],
            ['key' => 'civil_defense_tag',    'label' => 'Civil Defense Tag',    'type' => 'text',     'category' => 'Inspection Related'],
            ['key' => 'internal_last_inspection', 'label' => 'Internal Last Inspection Date', 'type' => 'date', 'category' => 'Inspection Related'],
            ['key' => 'internal_next_inspection', 'label' => 'Internal Next Inspection Date', 'type' => 'date', 'category' => 'Inspection Related'],
            ['key' => 'checklist_linked',     'label' => 'Checklist Linked',     'type' => 'text',     'category' => 'Inspection Related'],
            ['key' => 'last_inspection_by',   'label' => 'Last Inspection By',   'type' => 'text',     'category' => 'Inspection Related'],
            ['key' => 'inspection_notes',     'label' => 'Inspection Notes',     'type' => 'textarea', 'category' => 'Inspection Related'],

            // Condition & Safety Fields
            ['key' => 'condition_status',     'label' => 'Condition Status',     'type' => 'select',   'category' => 'Condition & Safety',
             'options' => ['Serviceable', 'Unserviceable', 'Needs Repair', 'Condemned']],
            ['key' => 'safety_status',        'label' => 'Safety Status',        'type' => 'select',   'category' => 'Condition & Safety',
             'options' => ['Safe', 'Unsafe', 'Needs Review']],
            ['key' => 'risk_level',           'label' => 'Risk Level',           'type' => 'select',   'category' => 'Condition & Safety',
             'options' => ['Low', 'Medium', 'High', 'Critical']],
            ['key' => 'out_of_service',       'label' => 'Out of Service',       'type' => 'select',   'category' => 'Condition & Safety',
             'options' => ['Yes', 'No']],

            // Location & Assignment Fields
            ['key' => 'project_name',         'label' => 'Project Name',         'type' => 'text',     'category' => 'Location & Assignment'],
            ['key' => 'assigned_supervisor',  'label' => 'Assigned Supervisor',  'type' => 'text',     'category' => 'Location & Assignment'],
            ['key' => 'assigned_operator',    'label' => 'Assigned Operator',    'type' => 'text',     'category' => 'Location & Assignment'],

            // Fire Safety Fields
            ['key' => 'extinguisher_type',    'label' => 'Extinguisher Type',    'type' => 'select',   'category' => 'Fire Safety',
             'options' => ['CO2', 'Dry Chemical', 'Foam', 'Water', 'Wet Chemical', 'Clean Agent']],
            ['key' => 'extinguisher_weight',  'label' => 'Extinguisher Weight',  'type' => 'text',     'category' => 'Fire Safety'],
            ['key' => 'pressure_status',      'label' => 'Pressure Status',      'type' => 'select',   'category' => 'Fire Safety',
             'options' => ['Normal', 'Low', 'Empty', 'Overcharged']],
        ];
    }

    // ═══════════════════════════════════════════════════════
    //  REGISTRY GROUPS (Top-Level "Groups")
    // ═══════════════════════════════════════════════════════

    /**
     * GET /api/tracker/equipment-groups/registry
     */
    public function registryIndex()
    {
        $groups = EquipmentRegistryGroup::withCount('categories')
            ->with(['fields' => function ($q) {
                $q->whereNull('group_id')->orderBy('sort_order');
            }])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(function ($rg) {
                $stats = $rg->item_stats;
                return [
                    'id'              => $rg->id,
                    'name'            => $rg->name,
                    'description'     => $rg->description,
                    'icon'            => $rg->icon,
                    'color'           => $rg->color,
                    'light_color'     => $rg->light_color,
                    'text_color'      => $rg->text_color,
                    'sort_order'      => $rg->sort_order,
                    'categories_count' => $rg->categories_count,
                    'fields_count'    => $rg->fields->count(),
                    'fields'          => $rg->fields,
                    'total_items'     => $stats['total'],
                    'active_items'    => $stats['active'],
                    'expired_items'   => $stats['expired'],
                    'expiring_soon'   => $stats['expiring_soon'],
                    'created_at'      => $rg->created_at,
                    'updated_at'      => $rg->updated_at,
                ];
            });

        return response()->json($groups);
    }

    /**
     * POST /api/tracker/equipment-groups/registry
     */
    public function registryStore(Request $request)
    {
        $request->validate([
            'name'          => 'required|string|max:255',
            'description'   => 'nullable|string|max:1000',
            'icon'          => 'nullable|string|max:50',
            'color'         => 'nullable|string|max:20',
            'light_color'   => 'nullable|string|max:20',
            'text_color'    => 'nullable|string|max:20',
            'fields'        => 'nullable|array',
            'fields.*.field_key'   => 'required|string',
            'fields.*.field_label' => 'required|string',
            'fields.*.field_type'  => 'required|string',
            'fields.*.is_required' => 'nullable|boolean',
        ]);

        return DB::transaction(function () use ($request) {
            $rg = EquipmentRegistryGroup::create([
                'name'        => $request->name,
                'description' => $request->description,
                'icon'        => $request->icon ?? 'Package',
                'color'       => $request->color ?? '#6B7280',
                'light_color' => $request->light_color ?? '#F3F4F6',
                'text_color'  => $request->text_color ?? '#374151',
                'sort_order'  => EquipmentRegistryGroup::max('sort_order') + 1,
                'created_by'  => Auth::id(),
            ]);

            if ($request->fields) {
                foreach ($request->fields as $i => $fieldData) {
                    EquipmentGroupField::create([
                        'registry_group_id' => $rg->id,
                        'group_id'          => null,
                        'field_key'         => $fieldData['field_key'],
                        'field_label'       => $fieldData['field_label'],
                        'field_type'        => $fieldData['field_type'],
                        'field_options'     => $fieldData['field_options'] ?? null,
                        'is_required'       => $fieldData['is_required'] ?? false,
                        'sort_order'        => $i,
                    ]);
                }
            }

            $rg->load('fields');

            return response()->json([
                'message' => 'Group created successfully',
                'group'   => $rg,
            ], 201);
        });
    }

    /**
     * GET /api/tracker/equipment-groups/registry/{id}
     */
    public function registryShow($id)
    {
        $rg = EquipmentRegistryGroup::with(['fields' => function ($q) {
            $q->whereNull('group_id')->orderBy('sort_order');
        }])->findOrFail($id);

        $categories = EquipmentGroup::where('registry_group_id', $id)
            ->withCount('items')
            ->orderBy('name')
            ->get()
            ->map(function ($cat) {
                $stats = $cat->item_stats;
                return [
                    'id'            => $cat->id,
                    'name'          => $cat->name,
                    'description'   => $cat->description,
                    'icon'          => $cat->icon,
                    'color'         => $cat->color,
                    'light_color'   => $cat->light_color,
                    'text_color'    => $cat->text_color,
                    'code_prefix'   => $cat->code_prefix,
                    'item_count'    => $cat->items_count,
                    'stats'         => $stats,
                    'created_at'    => $cat->created_at,
                ];
            });

        return response()->json([
            'id'            => $rg->id,
            'name'          => $rg->name,
            'description'   => $rg->description,
            'icon'          => $rg->icon,
            'color'         => $rg->color,
            'light_color'   => $rg->light_color,
            'text_color'    => $rg->text_color,
            'sort_order'    => $rg->sort_order,
            'fields'        => $rg->fields,
            'categories'    => $categories,
            'created_at'    => $rg->created_at,
        ]);
    }

    /**
     * PUT /api/tracker/equipment-groups/registry/{id}
     */
    public function registryUpdate(Request $request, $id)
    {
        $rg = EquipmentRegistryGroup::findOrFail($id);

        $request->validate([
            'name'        => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'icon'        => 'nullable|string|max:50',
            'color'       => 'nullable|string|max:20',
            'light_color' => 'nullable|string|max:20',
            'text_color'  => 'nullable|string|max:20',
        ]);

        $rg->update(array_merge(
            $request->only(['name', 'description', 'icon', 'color', 'light_color', 'text_color']),
            ['updated_by' => Auth::id()]
        ));

        $rg->load('fields');

        return response()->json([
            'message' => 'Group updated successfully',
            'group'   => $rg,
        ]);
    }

    /**
     * DELETE /api/tracker/equipment-groups/registry/{id}
     */
    public function registryDestroy($id)
    {
        $rg = EquipmentRegistryGroup::findOrFail($id);

        $totalItems = $rg->total_item_count;

        if ($totalItems > 0) {
            return response()->json([
                'message' => "Cannot delete group with {$totalItems} active equipment item(s). Remove all items first.",
            ], 422);
        }

        $cascaded = [];

        DB::transaction(function () use ($rg, &$cascaded) {
            $deletedBy = Auth::user()?->full_name ?? Auth::user()?->email ?? 'System';

            // Use the standard cascade system for proper child handling + logging
            $rg->update(['deleted_by' => $deletedBy]);
            $rg->delete();

            $cascaded = RecycleBinController::cascadeSoftDelete('equipment_registry_group', $rg);
        });

        RecycleBinController::logDeleteAction('equipment_registry_group', $rg, null, $cascaded);

        $childCount = count($cascaded);
        $message = 'Group deleted successfully';
        if ($childCount > 0) {
            $message .= " (including {$childCount} related " . ($childCount === 1 ? 'record' : 'records') . ')';
        }

        return response()->json(['message' => $message]);
    }

    // ═══════════════════════════════════════════════════════
    //  REGISTRY GROUP FIELDS
    // ═══════════════════════════════════════════════════════

    /**
     * PUT /api/tracker/equipment-groups/registry/{id}/fields
     */
    public function registrySyncFields(Request $request, $id)
    {
        $rg = EquipmentRegistryGroup::findOrFail($id);

        $request->validate([
            'fields'               => 'required|array|min:1',
            'fields.*.field_key'   => 'required|string',
            'fields.*.field_label' => 'required|string',
            'fields.*.field_type'  => 'required|string',
            'fields.*.is_required' => 'nullable|boolean',
        ]);

        return DB::transaction(function () use ($request, $rg) {
            $desiredKeys = collect($request->fields)->pluck('field_key')->toArray();
            $existingFields = EquipmentGroupField::where('registry_group_id', $rg->id)
                ->whereNull('group_id')
                ->get();
            $existingKeys = $existingFields->pluck('field_key')->toArray();

            $toAdd = array_diff($desiredKeys, $existingKeys);
            $toRemove = array_diff($existingKeys, $desiredKeys);

            // Remove deselected fields and their values across all items in this group
            if (!empty($toRemove)) {
                $categoryIds = $rg->categories()->pluck('id');
                EquipmentItemValue::whereHas('item', function ($q) use ($categoryIds) {
                    $q->whereIn('group_id', $categoryIds);
                })->whereIn('field_key', $toRemove)->delete();

                EquipmentGroupField::where('registry_group_id', $rg->id)
                    ->whereNull('group_id')
                    ->whereIn('field_key', $toRemove)
                    ->delete();
            }

            // Add new fields
            $maxSort = EquipmentGroupField::where('registry_group_id', $rg->id)
                ->whereNull('group_id')
                ->max('sort_order') ?? -1;
            $added = 0;

            foreach ($request->fields as $fieldData) {
                if (!in_array($fieldData['field_key'], $toAdd)) continue;
                $maxSort++;
                EquipmentGroupField::create([
                    'registry_group_id' => $rg->id,
                    'group_id'          => null,
                    'field_key'         => $fieldData['field_key'],
                    'field_label'       => $fieldData['field_label'],
                    'field_type'        => $fieldData['field_type'],
                    'field_options'     => $fieldData['field_options'] ?? null,
                    'is_required'       => $fieldData['is_required'] ?? false,
                    'sort_order'        => $maxSort,
                ]);
                $added++;
            }

            return response()->json([
                'message' => "Fields updated: {$added} added, " . count($toRemove) . " removed",
            ]);
        });
    }

    // ═══════════════════════════════════════════════════════
    //  CATEGORIES (under a Registry Group)
    // ═══════════════════════════════════════════════════════

    /**
     * GET /api/tracker/equipment-groups/registry/{id}/categories
     */
    public function categoryIndex($registryGroupId)
    {
        $rg = EquipmentRegistryGroup::findOrFail($registryGroupId);

        $categories = EquipmentGroup::where('registry_group_id', $registryGroupId)
            ->orderBy('name')
            ->get()
            ->map(function ($cat) {
                $stats = $cat->item_stats;
                return [
                    'id'            => $cat->id,
                    'name'          => $cat->name,
                    'description'   => $cat->description,
                    'icon'          => $cat->icon,
                    'color'         => $cat->color,
                    'light_color'   => $cat->light_color,
                    'text_color'    => $cat->text_color,
                    'code_prefix'   => $cat->code_prefix,
                    'item_count'    => $cat->item_count,
                    'stats'         => $stats,
                    'created_at'    => $cat->created_at,
                    'updated_at'    => $cat->updated_at,
                ];
            });

        return response()->json($categories);
    }

    /**
     * POST /api/tracker/equipment-groups/registry/{id}/categories
     */
    public function categoryStore(Request $request, $registryGroupId)
    {
        $rg = EquipmentRegistryGroup::findOrFail($registryGroupId);

        $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'icon'        => 'nullable|string|max:50',
            'color'       => 'nullable|string|max:20',
            'light_color' => 'nullable|string|max:20',
            'text_color'  => 'nullable|string|max:20',
            'code_prefix' => 'nullable|string|max:10',
        ]);

        $category = EquipmentGroup::create([
            'name'              => $request->name,
            'description'       => $request->description,
            'icon'              => $request->icon ?? $rg->icon,
            'color'             => $request->color ?? $rg->color,
            'light_color'       => $request->light_color ?? $rg->light_color,
            'text_color'        => $request->text_color ?? $rg->text_color,
            'category_type'     => $rg->name,
            'code_prefix'       => $request->code_prefix,
            'registry_group_id' => $rg->id,
            'created_by'        => Auth::id(),
        ]);

        return response()->json([
            'message'  => 'Category created successfully',
            'category' => $category,
        ], 201);
    }

    /**
     * PUT /api/tracker/equipment-groups/categories/{id}
     */
    public function categoryUpdate(Request $request, $id)
    {
        $cat = EquipmentGroup::findOrFail($id);

        $request->validate([
            'name'        => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'icon'        => 'nullable|string|max:50',
            'color'       => 'nullable|string|max:20',
            'light_color' => 'nullable|string|max:20',
            'text_color'  => 'nullable|string|max:20',
            'code_prefix' => 'nullable|string|max:10',
        ]);

        $cat->update(array_merge(
            $request->only(['name', 'description', 'icon', 'color', 'light_color', 'text_color', 'code_prefix']),
            ['updated_by' => Auth::id()]
        ));

        return response()->json([
            'message'  => 'Category updated successfully',
            'category' => $cat,
        ]);
    }

    /**
     * DELETE /api/tracker/equipment-groups/categories/{id}
     */
    public function categoryDestroy($id)
    {
        $cat = EquipmentGroup::findOrFail($id);

        $itemCount = $cat->items()->whereNull('deleted_at')->count();
        if ($itemCount > 0) {
            return response()->json([
                'message' => "Cannot delete category with {$itemCount} active item(s). Remove items first.",
            ], 422);
        }

        $cat->update(['deleted_by' => Auth::user()?->full_name ?? 'System']);
        $cat->delete();

        return response()->json(['message' => 'Category deleted successfully']);
    }

    // ═══════════════════════════════════════════════════════
    //  MASTER FIELDS
    // ═══════════════════════════════════════════════════════

    /**
     * GET /api/tracker/equipment-groups/master-fields
     */
    public function masterFieldList()
    {
        return response()->json(self::masterFields());
    }

    // ═══════════════════════════════════════════════════════
    //  LEGACY GROUPS (backward compat)
    // ═══════════════════════════════════════════════════════

    /**
     * GET /api/tracker/equipment-groups
     */
    public function index()
    {
        $groups = EquipmentGroup::withCount('items')
            ->with('registryGroup')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($g) {
                $fields = $g->effective_fields;
                return [
                    'id'              => $g->id,
                    'name'            => $g->name,
                    'description'     => $g->description,
                    'icon'            => $g->icon,
                    'color'           => $g->color,
                    'light_color'     => $g->light_color,
                    'text_color'      => $g->text_color,
                    'category_type'   => $g->category_type,
                    'code_prefix'     => $g->code_prefix,
                    'registry_group_id' => $g->registry_group_id,
                    'registry_group'  => $g->registryGroup ? [
                        'id'   => $g->registryGroup->id,
                        'name' => $g->registryGroup->name,
                    ] : null,
                    'item_count'      => $g->item_count,
                    'fields_count'    => $fields->count(),
                    'fields'          => $fields->values(),
                    'created_at'      => $g->created_at,
                    'updated_at'      => $g->updated_at,
                ];
            });

        return response()->json($groups);
    }

    /**
     * POST /api/tracker/equipment-groups
     */
    public function store(Request $request)
    {
        $request->validate([
            'name'          => 'required|string|max:255',
            'description'   => 'nullable|string|max:1000',
            'icon'          => 'nullable|string|max:50',
            'color'         => 'nullable|string|max:20',
            'light_color'   => 'nullable|string|max:20',
            'text_color'    => 'nullable|string|max:20',
            'category_type' => 'nullable|string|max:50',
            'code_prefix'   => 'nullable|string|max:10',
            'registry_group_id' => 'nullable|integer|exists:equipment_registry_groups,id',
            'fields'        => 'nullable|array',
            'fields.*.field_key'   => 'required|string',
            'fields.*.field_label' => 'required|string',
            'fields.*.field_type'  => 'required|string',
            'fields.*.is_required' => 'nullable|boolean',
        ]);

        return DB::transaction(function () use ($request) {
            $group = EquipmentGroup::create([
                'name'              => $request->name,
                'description'       => $request->description,
                'icon'              => $request->icon ?? 'Package',
                'color'             => $request->color ?? '#6B7280',
                'light_color'       => $request->light_color ?? '#F3F4F6',
                'text_color'        => $request->text_color ?? '#374151',
                'category_type'     => $request->category_type ?? 'custom',
                'code_prefix'       => $request->code_prefix,
                'registry_group_id' => $request->registry_group_id,
                'created_by'        => Auth::id(),
            ]);

            if ($request->fields && !$request->registry_group_id) {
                foreach ($request->fields as $i => $fieldData) {
                    EquipmentGroupField::create([
                        'group_id'      => $group->id,
                        'field_key'     => $fieldData['field_key'],
                        'field_label'   => $fieldData['field_label'],
                        'field_type'    => $fieldData['field_type'],
                        'field_options' => $fieldData['field_options'] ?? null,
                        'is_required'   => $fieldData['is_required'] ?? false,
                        'sort_order'    => $i,
                    ]);
                }
            }

            return response()->json([
                'message' => 'Category created successfully',
                'group'   => $group->load('registryGroup'),
            ], 201);
        });
    }

    /**
     * GET /api/tracker/equipment-groups/{id}
     */
    public function show($id)
    {
        $group = EquipmentGroup::with('registryGroup')->findOrFail($id);
        $fields = $group->effective_fields;

        return response()->json([
            'id'              => $group->id,
            'name'            => $group->name,
            'description'     => $group->description,
            'icon'            => $group->icon,
            'color'           => $group->color,
            'light_color'     => $group->light_color,
            'text_color'      => $group->text_color,
            'category_type'   => $group->category_type,
            'code_prefix'     => $group->code_prefix,
            'registry_group_id' => $group->registry_group_id,
            'item_count'      => $group->item_count,
            'fields'          => $fields->values(),
            'created_at'      => $group->created_at,
        ]);
    }

    /**
     * PUT /api/tracker/equipment-groups/{id}
     */
    public function update(Request $request, $id)
    {
        $group = EquipmentGroup::findOrFail($id);

        $request->validate([
            'name'          => 'sometimes|required|string|max:255',
            'description'   => 'nullable|string|max:1000',
            'icon'          => 'nullable|string|max:50',
            'color'         => 'nullable|string|max:20',
            'light_color'   => 'nullable|string|max:20',
            'text_color'    => 'nullable|string|max:20',
            'category_type' => 'nullable|string|max:50',
            'code_prefix'   => 'nullable|string|max:10',
        ]);

        $group->update(array_merge(
            $request->only(['name', 'description', 'icon', 'color', 'light_color', 'text_color', 'category_type', 'code_prefix']),
            ['updated_by' => Auth::id()]
        ));

        return response()->json([
            'message' => 'Category updated successfully',
            'group'   => $group,
        ]);
    }

    /**
     * DELETE /api/tracker/equipment-groups/{id}
     */
    public function destroy($id)
    {
        $group = EquipmentGroup::findOrFail($id);
        $cascaded = [];

        DB::transaction(function () use ($group, &$cascaded) {
            $deletedBy = Auth::user()?->full_name ?? Auth::user()?->email ?? 'System';

            $group->update(['deleted_by' => $deletedBy]);
            $group->delete();

            // Cascade soft-delete child items
            $cascaded = RecycleBinController::cascadeSoftDelete('equipment_group', $group);
        });

        RecycleBinController::logDeleteAction('equipment_group', $group, null, $cascaded);

        $childCount = count($cascaded);
        $message = 'Category deleted successfully';
        if ($childCount > 0) {
            $message .= " (including {$childCount} item" . ($childCount === 1 ? '' : 's') . ')';
        }

        return response()->json(['message' => $message]);
    }

    // ═══════════════════════════════════════════════════════
    //  FIELDS (add to existing group / legacy)
    // ═══════════════════════════════════════════════════════

    public function addFields(Request $request, $id)
    {
        $group = EquipmentGroup::findOrFail($id);

        $request->validate([
            'fields'               => 'required|array|min:1',
            'fields.*.field_key'   => 'required|string',
            'fields.*.field_label' => 'required|string',
            'fields.*.field_type'  => 'required|string',
            'fields.*.is_required' => 'nullable|boolean',
        ]);

        $maxSort = $group->fields()->max('sort_order') ?? -1;
        $added = [];

        foreach ($request->fields as $fieldData) {
            $exists = $group->fields()->where('field_key', $fieldData['field_key'])->exists();
            if ($exists) continue;

            $maxSort++;
            $field = EquipmentGroupField::create([
                'group_id'      => $group->id,
                'field_key'     => $fieldData['field_key'],
                'field_label'   => $fieldData['field_label'],
                'field_type'    => $fieldData['field_type'],
                'field_options' => $fieldData['field_options'] ?? null,
                'is_required'   => $fieldData['is_required'] ?? false,
                'sort_order'    => $maxSort,
            ]);
            $added[] = $field;
        }

        $group->load('fields');

        return response()->json([
            'message' => count($added) . ' field(s) added to group',
            'group'   => $group,
        ]);
    }

    public function syncFields(Request $request, $id)
    {
        $group = EquipmentGroup::with('fields')->findOrFail($id);

        $request->validate([
            'fields'               => 'required|array|min:1',
            'fields.*.field_key'   => 'required|string',
            'fields.*.field_label' => 'required|string',
            'fields.*.field_type'  => 'required|string',
            'fields.*.is_required' => 'nullable|boolean',
        ]);

        return DB::transaction(function () use ($request, $group) {
            $desiredKeys = collect($request->fields)->pluck('field_key')->toArray();
            $existingKeys = $group->fields->pluck('field_key')->toArray();

            $toAdd = array_diff($desiredKeys, $existingKeys);
            $toRemove = array_diff($existingKeys, $desiredKeys);

            if (!empty($toRemove)) {
                EquipmentItemValue::whereHas('item', function ($q) use ($group) {
                    $q->where('group_id', $group->id);
                })->whereIn('field_key', $toRemove)->delete();

                $group->fields()->whereIn('field_key', $toRemove)->delete();
            }

            $maxSort = $group->fields()->max('sort_order') ?? -1;
            $added = 0;
            foreach ($request->fields as $fieldData) {
                if (!in_array($fieldData['field_key'], $toAdd)) continue;

                $maxSort++;
                EquipmentGroupField::create([
                    'group_id'      => $group->id,
                    'field_key'     => $fieldData['field_key'],
                    'field_label'   => $fieldData['field_label'],
                    'field_type'    => $fieldData['field_type'],
                    'field_options' => $fieldData['field_options'] ?? null,
                    'is_required'   => $fieldData['is_required'] ?? false,
                    'sort_order'    => $maxSort,
                ]);
                $added++;
            }

            $group->load('fields');

            return response()->json([
                'message' => "Fields updated: {$added} added, " . count($toRemove) . " removed",
                'group'   => $group,
            ]);
        });
    }

    public function removeField($groupId, $fieldId)
    {
        $field = EquipmentGroupField::where('group_id', $groupId)->findOrFail($fieldId);
        $fieldKey = $field->field_key;

        EquipmentItemValue::whereHas('item', function ($q) use ($groupId) {
            $q->where('group_id', $groupId);
        })->where('field_key', $fieldKey)->delete();

        $field->delete();

        return response()->json(['message' => 'Field removed from group']);
    }

    // ═══════════════════════════════════════════════════════
    //  ITEMS
    // ═══════════════════════════════════════════════════════

    /**
     * GET /api/tracker/equipment-groups/{id}/items
     */
    public function items(Request $request, $id)
    {
        $group = EquipmentGroup::with('registryGroup')->findOrFail($id);
        $fields = $group->effective_fields;

        $query = EquipmentItem::where('group_id', $id)
            ->with('fieldValues')
            ->orderBy('created_at', 'desc');

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('item_code', 'like', "%{$search}%")
                  ->orWhere('equipment_code', 'like', "%{$search}%")
                  ->orWhere('item_name', 'like', "%{$search}%")
                  ->orWhereHas('fieldValues', function ($q2) use ($search) {
                      $q2->where('field_value', 'like', "%{$search}%");
                  });
            });
        }

        // Status filter
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Expiry filter
        if ($request->filled('expiry_status')) {
            $expiryStatus = $request->expiry_status;
            $now = now()->toDateString();
            $soonDate = now()->addDays(30)->toDateString();

            if ($expiryStatus === 'expired') {
                $query->whereHas('fieldValues', function ($q) use ($now) {
                    $q->whereIn('field_key', ['tuv_expiry_date', 'next_inspection_date', 'certificate_expiry'])
                      ->where('field_value', '<', $now)
                      ->where('field_value', '!=', '');
                });
            } elseif ($expiryStatus === 'expiring_soon') {
                $query->whereHas('fieldValues', function ($q) use ($now, $soonDate) {
                    $q->whereIn('field_key', ['tuv_expiry_date', 'next_inspection_date', 'certificate_expiry'])
                      ->where('field_value', '>=', $now)
                      ->where('field_value', '<=', $soonDate)
                      ->where('field_value', '!=', '');
                });
            }
        }

        $perPage = $request->input('per_page', 25);
        $paginated = $query->paginate($perPage);

        $items = collect($paginated->items())->map(function ($item) {
            $values = $item->getFieldValuesArray();
            return [
                'id'              => $item->id,
                'item_code'       => $item->item_code,
                'equipment_code'  => $item->equipment_code,
                'item_name'       => $item->item_name,
                'status'          => $item->status,
                'values'          => $values,
                'expiry_status'   => $item->expiry_status,
                'created_at'      => $item->created_at,
                'updated_at'      => $item->updated_at,
                'created_by'      => $item->created_by,
            ];
        });

        return response()->json([
            'group'  => [
                'id'              => $group->id,
                'name'            => $group->name,
                'description'     => $group->description,
                'icon'            => $group->icon,
                'color'           => $group->color,
                'light_color'     => $group->light_color,
                'text_color'      => $group->text_color,
                'category_type'   => $group->category_type,
                'code_prefix'     => $group->code_prefix,
                'registry_group_id' => $group->registry_group_id,
                'fields'          => $fields->values(),
            ],
            'items'  => $items,
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
                'per_page'     => $paginated->perPage(),
                'total'        => $paginated->total(),
            ],
        ]);
    }

    /**
     * POST /api/tracker/equipment-groups/{id}/items
     */
    public function storeItem(Request $request, $id)
    {
        $group = EquipmentGroup::findOrFail($id);
        $fields = $group->effective_fields;

        $request->validate([
            'values'    => 'required|array',
            'status'    => 'nullable|string|max:50',
            'item_name' => 'required|string|max:255',
        ]);

        // Validate required fields
        foreach ($fields as $field) {
            if ($field->is_required && empty($request->input("values.{$field->field_key}"))) {
                return response()->json([
                    'message' => "{$field->field_label} is required",
                    'errors'  => [
                        "values.{$field->field_key}" => ["{$field->field_label} is required"],
                    ],
                ], 422);
            }
        }

        return DB::transaction(function () use ($request, $group, $fields) {
            $item = EquipmentItem::create([
                'group_id'   => $group->id,
                'item_name'  => $request->input('item_name'),
                'status'     => $request->input('status', 'Active'),
                'created_by' => Auth::id(),
            ]);

            $validFieldKeys = $fields->pluck('field_key')->toArray();
            foreach ($request->values as $key => $value) {
                if (!in_array($key, $validFieldKeys)) continue;
                if ($value === null || $value === '') continue;

                EquipmentItemValue::create([
                    'item_id'     => $item->id,
                    'field_key'   => $key,
                    'field_value' => (string) $value,
                ]);
            }

            $item->load('fieldValues');

            return response()->json([
                'message' => 'Item created successfully',
                'item'    => [
                    'id'             => $item->id,
                    'item_code'      => $item->item_code,
                    'equipment_code' => $item->equipment_code,
                    'item_name'      => $item->item_name,
                    'status'         => $item->status,
                    'values'         => $item->getFieldValuesArray(),
                    'expiry_status'  => $item->expiry_status,
                ],
            ], 201);
        });
    }

    /**
     * GET /api/tracker/equipment-groups/{groupId}/items/{itemId}
     */
    public function showItem($groupId, $itemId)
    {
        $item = EquipmentItem::where('group_id', $groupId)
            ->with('fieldValues', 'group.registryGroup')
            ->findOrFail($itemId);

        $fields = $item->group->effective_fields;

        // Get linked inspection history from checklists if available
        $inspections = [];
        $checklistItemId = $item->getFieldValue('checklist_linked');
        if ($checklistItemId) {
            $inspections = \App\Models\ChecklistInspection::where('checklist_item_id', $checklistItemId)
                ->orderBy('inspection_date', 'desc')
                ->limit(20)
                ->get()
                ->toArray();
        }

        return response()->json([
            'id'              => $item->id,
            'item_code'       => $item->item_code,
            'equipment_code'  => $item->equipment_code,
            'item_name'       => $item->item_name,
            'group_id'        => $item->group_id,
            'group_name'      => $item->group->name,
            'registry_group'  => $item->group->registryGroup ? [
                'id'   => $item->group->registryGroup->id,
                'name' => $item->group->registryGroup->name,
            ] : null,
            'status'          => $item->status,
            'values'          => $item->getFieldValuesArray(),
            'fields'          => $fields->values(),
            'expiry_status'   => $item->expiry_status,
            'inspections'     => $inspections,
            'created_at'      => $item->created_at,
            'updated_at'      => $item->updated_at,
        ]);
    }

    /**
     * PUT /api/tracker/equipment-groups/{groupId}/items/{itemId}
     */
    public function updateItem(Request $request, $groupId, $itemId)
    {
        $group = EquipmentGroup::findOrFail($groupId);
        $item = EquipmentItem::where('group_id', $groupId)->findOrFail($itemId);
        $fields = $group->effective_fields;

        $request->validate([
            'values'    => 'required|array',
            'status'    => 'nullable|string|max:50',
            'item_name' => 'required|string|max:255',
        ]);

        foreach ($fields as $field) {
            if ($field->is_required && empty($request->input("values.{$field->field_key}"))) {
                return response()->json([
                    'message' => "{$field->field_label} is required",
                    'errors'  => [
                        "values.{$field->field_key}" => ["{$field->field_label} is required"],
                    ],
                ], 422);
            }
        }

        return DB::transaction(function () use ($request, $group, $item, $fields) {
            $updateData = ['updated_by' => Auth::id()];
            if ($request->has('status')) $updateData['status'] = $request->status;
            if ($request->has('item_name')) $updateData['item_name'] = $request->item_name;
            $item->update($updateData);

            $validFieldKeys = $fields->pluck('field_key')->toArray();
            foreach ($request->values as $key => $value) {
                if (!in_array($key, $validFieldKeys)) continue;

                if ($value === null || $value === '') {
                    EquipmentItemValue::where('item_id', $item->id)
                        ->where('field_key', $key)
                        ->delete();
                } else {
                    EquipmentItemValue::updateOrCreate(
                        ['item_id' => $item->id, 'field_key' => $key],
                        ['field_value' => (string) $value]
                    );
                }
            }

            $item->load('fieldValues');

            return response()->json([
                'message' => 'Item updated successfully',
                'item'    => [
                    'id'             => $item->id,
                    'item_code'      => $item->item_code,
                    'equipment_code' => $item->equipment_code,
                    'item_name'      => $item->item_name,
                    'status'         => $item->status,
                    'values'         => $item->getFieldValuesArray(),
                    'expiry_status'  => $item->expiry_status,
                ],
            ]);
        });
    }

    /**
     * DELETE /api/tracker/equipment-groups/{groupId}/items/{itemId}
     */
    public function destroyItem($groupId, $itemId)
    {
        $item = EquipmentItem::where('group_id', $groupId)->findOrFail($itemId);
        $item->update(['deleted_by' => Auth::user()?->full_name ?? 'System']);
        $item->delete();
        RecycleBinController::logDeleteAction('equipment_item', $item);

        return response()->json(['message' => 'Item moved to recycle bin']);
    }

    /**
     * POST /api/tracker/equipment-groups/{id}/items/{itemId}/upload
     */
    public function uploadItemFile(Request $request, $groupId, $itemId)
    {
        $item = EquipmentItem::where('group_id', $groupId)->findOrFail($itemId);

        $request->validate([
            'field_key' => 'required|string',
            'file'      => 'required|file|max:10240',
        ]);

        $fieldKey = $request->field_key;
        $file = $request->file('file');
        $path = $file->store("equipment-items/{$groupId}/{$itemId}", 'public');

        EquipmentItemValue::updateOrCreate(
            ['item_id' => $item->id, 'field_key' => $fieldKey],
            ['field_value' => $path]
        );

        return response()->json([
            'message' => 'File uploaded successfully',
            'path'    => $path,
            'url'     => Storage::disk('public')->url($path),
        ]);
    }

    // ═══════════════════════════════════════════════════════
    //  STATS & DASHBOARD
    // ═══════════════════════════════════════════════════════

    /**
     * GET /api/tracker/equipment-groups/stats
     */
    public function registryStats()
    {
        $now = now()->toDateString();
        $soonDate = now()->addDays(30)->toDateString();

        $totalItems = EquipmentItem::whereNull('deleted_at')->count();
        $activeItems = EquipmentItem::whereNull('deleted_at')->where('status', 'Active')->count();

        // Count expired and expiring soon items
        $allItemIds = EquipmentItem::whereNull('deleted_at')->pluck('id');
        $expiryValues = EquipmentItemValue::whereIn('item_id', $allItemIds)
            ->whereIn('field_key', ['tuv_expiry_date', 'next_inspection_date', 'certificate_expiry'])
            ->where('field_value', '!=', '')
            ->get()
            ->groupBy('item_id');

        $expired = 0;
        $expiringSoon = 0;
        $checkedItems = [];

        foreach ($expiryValues as $itemId => $values) {
            if (isset($checkedItems[$itemId])) continue;
            foreach ($values as $val) {
                try {
                    $date = \Carbon\Carbon::parse($val->field_value);
                    if ($date->isPast()) {
                        $expired++;
                        $checkedItems[$itemId] = true;
                        break;
                    } elseif ($date->lte(now()->addDays(30))) {
                        $expiringSoon++;
                        $checkedItems[$itemId] = true;
                        break;
                    }
                } catch (\Exception $e) {
                    continue;
                }
            }
        }

        // Per-group stats
        $groups = EquipmentRegistryGroup::withCount('categories')
            ->orderBy('sort_order')
            ->get()
            ->map(function ($rg) {
                $stats = $rg->item_stats;
                return [
                    'id'              => $rg->id,
                    'name'            => $rg->name,
                    'icon'            => $rg->icon,
                    'color'           => $rg->color,
                    'categories_count' => $rg->categories_count,
                    'total'           => $stats['total'],
                    'active'          => $stats['active'],
                    'expired'         => $stats['expired'],
                    'expiring_soon'   => $stats['expiring_soon'],
                ];
            });

        return response()->json([
            'kpis' => [
                'total_items'    => $totalItems,
                'active_items'   => $activeItems,
                'expired'        => $expired,
                'expiring_soon'  => $expiringSoon,
                'total_groups'   => EquipmentRegistryGroup::whereNull('deleted_at')->count(),
                'total_categories' => EquipmentGroup::whereNull('deleted_at')->count(),
            ],
            'by_group' => $groups,
        ]);
    }

    // ═══════════════════════════════════════════════════════
    //  ALL ITEMS (Total Item Register)
    // ═══════════════════════════════════════════════════════

    /**
     * GET /api/tracker/equipment-groups/all-items
     * Returns a paginated list of ALL equipment items across all categories.
     */
    public function allItems(Request $request)
    {
        $query = EquipmentItem::with(['fieldValues', 'group.registryGroup'])
            ->whereNull('equipment_items.deleted_at');

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('item_code', 'like', "%{$search}%")
                  ->orWhere('equipment_code', 'like', "%{$search}%")
                  ->orWhere('item_name', 'like', "%{$search}%")
                  ->orWhereHas('fieldValues', function ($q2) use ($search) {
                      $q2->where('field_value', 'like', "%{$search}%");
                  });
            });
        }

        // Status filter
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Category filter
        if ($request->filled('category_id')) {
            $query->where('group_id', $request->category_id);
        }

        // Registry group filter
        if ($request->filled('registry_group_id')) {
            $categoryIds = EquipmentGroup::where('registry_group_id', $request->registry_group_id)
                ->whereNull('deleted_at')
                ->pluck('id');
            $query->whereIn('group_id', $categoryIds);
        }

        // Expiry filter
        if ($request->filled('expiry_status')) {
            $expiryStatus = $request->expiry_status;
            $now = now()->toDateString();
            $soonDate = now()->addDays(30)->toDateString();

            if ($expiryStatus === 'expired') {
                $query->whereHas('fieldValues', function ($q) use ($now) {
                    $q->whereIn('field_key', ['tuv_expiry_date', 'next_inspection_date', 'certificate_expiry'])
                      ->where('field_value', '<', $now)
                      ->where('field_value', '!=', '');
                });
            } elseif ($expiryStatus === 'expiring_soon') {
                $query->whereHas('fieldValues', function ($q) use ($now, $soonDate) {
                    $q->whereIn('field_key', ['tuv_expiry_date', 'next_inspection_date', 'certificate_expiry'])
                      ->where('field_value', '>=', $now)
                      ->where('field_value', '<=', $soonDate)
                      ->where('field_value', '!=', '');
                });
            }
        }

        $perPage = $request->input('per_page', 25);
        $paginated = $query->orderBy('created_at', 'desc')->paginate($perPage);

        // Collect all unique field definitions across all categories represented
        $groupIds = collect($paginated->items())->pluck('group_id')->unique();
        $groups = EquipmentGroup::with('registryGroup')->whereIn('id', $groupIds)->get()->keyBy('id');

        $allFieldDefs = [];
        foreach ($groups as $group) {
            foreach ($group->effective_fields as $f) {
                if (!isset($allFieldDefs[$f->field_key])) {
                    $allFieldDefs[$f->field_key] = [
                        'field_key'   => $f->field_key,
                        'field_label' => $f->field_label,
                        'field_type'  => $f->field_type,
                    ];
                }
            }
        }

        $items = collect($paginated->items())->map(function ($item) use ($groups) {
            $values = $item->getFieldValuesArray();
            $group = $groups[$item->group_id] ?? null;
            return [
                'id'              => $item->id,
                'item_code'       => $item->item_code,
                'equipment_code'  => $item->equipment_code,
                'item_name'       => $item->item_name,
                'status'          => $item->status,
                'values'          => $values,
                'expiry_status'   => $item->expiry_status,
                'category_id'     => $item->group_id,
                'category_name'   => $group?->name ?? '',
                'category_color'  => $group?->color ?? '#6b7280',
                'category_icon'   => $group?->icon ?? 'Package',
                'registry_group_name' => $group?->registryGroup?->name ?? '',
                'created_at'      => $item->created_at,
                'updated_at'      => $item->updated_at,
            ];
        });

        // Build category filter options
        $allCategories = EquipmentGroup::whereNull('deleted_at')
            ->orderBy('name')
            ->get(['id', 'name', 'registry_group_id']);

        return response()->json([
            'items'      => $items,
            'fields'     => array_values($allFieldDefs),
            'categories' => $allCategories->map(fn($c) => ['id' => $c->id, 'name' => $c->name]),
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
                'per_page'     => $paginated->perPage(),
                'total'        => $paginated->total(),
            ],
        ]);
    }

    // ═══════════════════════════════════════════════════════
    //  EXPORT
    // ═══════════════════════════════════════════════════════

    /**
     * GET /api/tracker/equipment-groups/export
     */
    public function exportItems(Request $request)
    {
        $query = EquipmentItem::with(['fieldValues', 'group.registryGroup'])
            ->whereNull('deleted_at');

        // Filter by registry group
        if ($request->filled('registry_group_id')) {
            $categoryIds = EquipmentGroup::where('registry_group_id', $request->registry_group_id)->pluck('id');
            $query->whereIn('group_id', $categoryIds);
        }

        // Filter by category
        if ($request->filled('category_id')) {
            $query->where('group_id', $request->category_id);
        }

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Date range
        if ($request->filled('from_date')) {
            $query->where('created_at', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->where('created_at', '<=', $request->to_date . ' 23:59:59');
        }

        $items = $query->orderBy('created_at', 'desc')->get();

        // Collect all unique field keys
        $allFieldKeys = [];
        $allFieldLabels = [];
        foreach ($items as $item) {
            $fields = $item->group->effective_fields;
            foreach ($fields as $f) {
                if (!isset($allFieldKeys[$f->field_key])) {
                    $allFieldKeys[$f->field_key] = true;
                    $allFieldLabels[$f->field_key] = $f->field_label;
                }
            }
        }

        // Build CSV
        $headers = ['Equipment Code', 'Item Code', 'Item Name', 'Group', 'Category', 'Status'];
        foreach ($allFieldLabels as $label) {
            $headers[] = $label;
        }
        $headers[] = 'Created At';
        $headers[] = 'Updated At';

        $rows = [$headers];
        foreach ($items as $item) {
            $values = $item->getFieldValuesArray();
            $row = [
                $item->equipment_code,
                $item->item_code,
                $item->item_name,
                $item->group->registryGroup?->name ?? $item->group->category_type ?? '',
                $item->group->name,
                $item->status,
            ];
            foreach (array_keys($allFieldLabels) as $key) {
                $row[] = $values[$key] ?? '';
            }
            $row[] = $item->created_at?->format('Y-m-d H:i');
            $row[] = $item->updated_at?->format('Y-m-d H:i');
            $rows[] = $row;
        }

        $callback = function () use ($rows) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF)); // BOM for Excel UTF-8
            foreach ($rows as $row) {
                fputcsv($file, $row);
            }
            fclose($file);
        };

        $filename = 'equipment_export_' . date('Y-m-d_His') . '.csv';

        return response()->stream($callback, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    // ═══════════════════════════════════════════════════════
    //  IMPORT WITH MAPPING
    // ═══════════════════════════════════════════════════════

    /**
     * POST /api/tracker/equipment-groups/import/preview
     */
    public function importPreview(Request $request)
    {
        $request->validate([
            'file'        => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
            'category_id' => 'required|integer|exists:equipment_groups,id',
        ]);

        $file = $request->file('file');
        $category = EquipmentGroup::findOrFail($request->category_id);
        $fields = $category->effective_fields;

        // Parse CSV
        $rows = [];
        $headers = [];
        if (($handle = fopen($file->getPathname(), 'r')) !== false) {
            $lineNum = 0;
            while (($data = fgetcsv($handle)) !== false) {
                $lineNum++;
                if ($lineNum === 1) {
                    $headers = array_map('trim', $data);
                    continue;
                }
                if ($lineNum > 101) break; // Max 100 preview rows
                $rows[] = array_combine($headers, array_pad($data, count($headers), ''));
            }
            fclose($handle);
        }

        // Suggest column mappings
        $systemFields = [
            ['key' => 'item_name', 'label' => 'Item Name', 'required' => true],
            ['key' => 'status', 'label' => 'Status', 'required' => false],
        ];
        foreach ($fields as $f) {
            $systemFields[] = [
                'key'      => $f->field_key,
                'label'    => $f->field_label,
                'required' => $f->is_required,
            ];
        }

        // Auto-map by label similarity
        $mappings = [];
        foreach ($systemFields as $sf) {
            $bestMatch = null;
            $bestScore = 0;
            foreach ($headers as $h) {
                $similarity = 0;
                similar_text(strtolower($sf['label']), strtolower($h), $similarity);
                if ($similarity > $bestScore && $similarity > 60) {
                    $bestScore = $similarity;
                    $bestMatch = $h;
                }
            }
            $mappings[] = [
                'system_field' => $sf,
                'file_column'  => $bestMatch,
                'confidence'   => $bestMatch ? round($bestScore) : 0,
            ];
        }

        return response()->json([
            'file_columns'  => $headers,
            'system_fields' => $systemFields,
            'mappings'      => $mappings,
            'preview_rows'  => array_slice($rows, 0, 5),
            'total_rows'    => count($rows),
            'category'      => [
                'id'   => $category->id,
                'name' => $category->name,
            ],
        ]);
    }

    /**
     * POST /api/tracker/equipment-groups/import/confirm
     */
    public function importConfirm(Request $request)
    {
        $request->validate([
            'file'        => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
            'category_id' => 'required|integer|exists:equipment_groups,id',
            'mappings'    => 'required|array',
        ]);

        $file = $request->file('file');
        $category = EquipmentGroup::findOrFail($request->category_id);
        $fields = $category->effective_fields;
        $validFieldKeys = $fields->pluck('field_key')->toArray();

        // Parse mappings: system_field_key => file_column_name
        $columnMap = [];
        foreach ($request->mappings as $mapping) {
            if (!empty($mapping['file_column']) && !empty($mapping['system_field'])) {
                $columnMap[$mapping['system_field']] = $mapping['file_column'];
            }
        }

        // Parse CSV
        $rows = [];
        $headers = [];
        if (($handle = fopen($file->getPathname(), 'r')) !== false) {
            $lineNum = 0;
            while (($data = fgetcsv($handle)) !== false) {
                $lineNum++;
                if ($lineNum === 1) {
                    $headers = array_map('trim', $data);
                    continue;
                }
                $rows[] = array_combine($headers, array_pad($data, count($headers), ''));
            }
            fclose($handle);
        }

        $results = ['success' => 0, 'failed' => 0, 'errors' => []];

        DB::beginTransaction();
        try {
            foreach ($rows as $rowIndex => $row) {
                $rowNum = $rowIndex + 2; // Account for header row

                // Get item_name from mapping
                $itemName = '';
                if (isset($columnMap['item_name'])) {
                    $itemName = trim($row[$columnMap['item_name']] ?? '');
                }

                if (empty($itemName)) {
                    $results['failed']++;
                    $results['errors'][] = "Row {$rowNum}: Item Name is required";
                    continue;
                }

                // Validate required fields
                $missingRequired = false;
                foreach ($fields as $field) {
                    if ($field->is_required && isset($columnMap[$field->field_key])) {
                        $val = trim($row[$columnMap[$field->field_key]] ?? '');
                        if (empty($val)) {
                            $results['failed']++;
                            $results['errors'][] = "Row {$rowNum}: {$field->field_label} is required";
                            $missingRequired = true;
                            break;
                        }
                    }
                }
                if ($missingRequired) continue;

                $status = 'Active';
                if (isset($columnMap['status'])) {
                    $status = trim($row[$columnMap['status']] ?? '') ?: 'Active';
                }

                $item = EquipmentItem::create([
                    'group_id'   => $category->id,
                    'item_name'  => $itemName,
                    'status'     => $status,
                    'created_by' => Auth::id(),
                ]);

                // Save field values
                foreach ($columnMap as $fieldKey => $fileColumn) {
                    if (in_array($fieldKey, ['item_name', 'status'])) continue;
                    if (!in_array($fieldKey, $validFieldKeys)) continue;
                    $val = trim($row[$fileColumn] ?? '');
                    if ($val === '') continue;

                    EquipmentItemValue::create([
                        'item_id'     => $item->id,
                        'field_key'   => $fieldKey,
                        'field_value' => $val,
                    ]);
                }

                $results['success']++;
            }

            DB::commit();

            // Refresh item count
            $category->refreshItemCount();

            return response()->json([
                'message' => "{$results['success']} item(s) imported successfully" .
                    ($results['failed'] > 0 ? ", {$results['failed']} failed" : ''),
                'results' => $results,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Import failed: ' . $e->getMessage(),
                'results' => $results,
            ], 500);
        }
    }
}
