<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\ChecklistCategory;
use App\Models\ChecklistInspection;
use App\Models\ChecklistItem;
use App\Models\Contractor;
use App\Models\DcDocument;
use App\Models\EnvironmentalAction;
use App\Models\EnvironmentalAspect;
use App\Models\EnvironmentalComplianceRegister;
use App\Models\EnvironmentalIncident;
use App\Models\EnvironmentalInspection;
use App\Models\EnvironmentalMonitoring;
use App\Models\EnvironmentalObjective;
use App\Models\EnvironmentalRisk;
use App\Models\EquipmentGroup;
use App\Models\EquipmentItem;
use App\Models\EquipmentRegister;
use App\Models\EquipmentRegistryGroup;
use App\Models\Erp;
use App\Models\Incident;
use App\Models\MockDrill;
use App\Models\Mockup;
use App\Models\Mom;
use App\Models\Observation;
use App\Models\Permit;
use App\Models\PermitAmendment;
use App\Models\Poster;
use App\Models\RecycleBinLog;
use App\Models\ResourceConsumption;
use App\Models\TrackerCategory;
use App\Models\TrackerRecord;
use App\Models\TrainingRecord;
use App\Models\Violation;
use App\Models\WasteManifest;
use App\Models\WasteRecord;
use App\Models\Worker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RecycleBinController extends Controller
{
    /**
     * Map of type keys to model classes and display config.
     */
    private const TYPE_MAP = [
        'tracker_category'         => ['model' => TrackerCategory::class,                'module' => 'Equipment Tracker',  'label' => 'Equipment Type'],
        'tracker_record'           => ['model' => TrackerRecord::class,                  'module' => 'Equipment Tracker',  'label' => 'Equipment Record'],
        'checklist_category'       => ['model' => ChecklistCategory::class,              'module' => 'Checklists',         'label' => 'Checklist Category'],
        'checklist_item'           => ['model' => ChecklistItem::class,                  'module' => 'Checklists',         'label' => 'Checklist Item'],
        'checklist_inspection'     => ['model' => ChecklistInspection::class,            'module' => 'Checklists',         'label' => 'Checklist Inspection'],
        'observation'              => ['model' => Observation::class,                    'module' => 'Observations',       'label' => 'Observation'],
        'permit'                   => ['model' => Permit::class,                         'module' => 'Permits',            'label' => 'Permit'],
        'permit_amendment'         => ['model' => PermitAmendment::class,                'module' => 'Permit Amendments',  'label' => 'Permit Amendment'],
        'mockup'                   => ['model' => Mockup::class,                         'module' => 'Mock-Up Register',   'label' => 'Mockup'],
        'mom'                      => ['model' => Mom::class,                            'module' => 'Weekly MOM',         'label' => 'MOM'],
        'worker'                   => ['model' => Worker::class,                         'module' => 'Manpower',           'label' => 'Worker'],
        'training_record'          => ['model' => TrainingRecord::class,                 'module' => 'Training Matrix',    'label' => 'Training Record'],
        'equipment_register'       => ['model' => EquipmentRegister::class,              'module' => 'Equipment Register', 'label' => 'Equipment'],
        'equipment_group'          => ['model' => EquipmentGroup::class,                 'module' => 'Equipment Tracker',  'label' => 'Equipment Category'],
        'equipment_item'           => ['model' => EquipmentItem::class,                  'module' => 'Equipment Tracker',  'label' => 'Equipment Item'],
        'equipment_registry_group' => ['model' => EquipmentRegistryGroup::class,         'module' => 'Equipment Tracker',  'label' => 'Equipment Group'],
        'violation'                => ['model' => Violation::class,                      'module' => 'Violations',         'label' => 'Violation'],
        'incident'                 => ['model' => Incident::class,                       'module' => 'Incidents',          'label' => 'Incident'],
        'mock_drill'               => ['model' => MockDrill::class,                      'module' => 'Mock Drills',        'label' => 'Mock Drill'],
        'erp'                      => ['model' => Erp::class,                            'module' => 'ERP',                'label' => 'Emergency Response Plan'],
        'campaign'                 => ['model' => Campaign::class,                       'module' => 'Campaigns',          'label' => 'Campaign'],
        'poster'                   => ['model' => Poster::class,                         'module' => 'Posters',            'label' => 'Poster'],
        'contractor'               => ['model' => Contractor::class,                     'module' => 'Contractors',        'label' => 'Contractor'],
        'dc_document'              => ['model' => DcDocument::class,                     'module' => 'Document Control',   'label' => 'Document'],
        'env_aspect'               => ['model' => EnvironmentalAspect::class,            'module' => 'Environmental',      'label' => 'Environmental Aspect'],
        'env_risk'                 => ['model' => EnvironmentalRisk::class,              'module' => 'Environmental',      'label' => 'Environmental Risk'],
        'env_incident'             => ['model' => EnvironmentalIncident::class,          'module' => 'Environmental',      'label' => 'Environmental Incident'],
        'env_inspection'           => ['model' => EnvironmentalInspection::class,        'module' => 'Environmental',      'label' => 'Environmental Inspection'],
        'env_compliance'           => ['model' => EnvironmentalComplianceRegister::class,'module' => 'Environmental',      'label' => 'Compliance Register'],
        'env_objective'            => ['model' => EnvironmentalObjective::class,         'module' => 'Environmental',      'label' => 'Environmental Objective'],
        'waste_manifest'           => ['model' => WasteManifest::class,                  'module' => 'Waste Manifests',    'label' => 'Waste Manifest'],
        'waste_record'             => ['model' => WasteRecord::class,                    'module' => 'Environmental',      'label' => 'Waste Record'],
        'env_monitoring'           => ['model' => EnvironmentalMonitoring::class,        'module' => 'Environmental',      'label' => 'Environmental Monitoring'],
        'env_resource'             => ['model' => ResourceConsumption::class,            'module' => 'Environmental',      'label' => 'Resource Consumption'],
        'env_action'               => ['model' => EnvironmentalAction::class,            'module' => 'Environmental',      'label' => 'Environmental Action'],
    ];

    /**
     * Parent-child cascade relationships.
     * When a parent is deleted/restored, these children should follow.
     * Format: 'parent_type' => [['child_type' => '...', 'relation' => 'method_name'], ...]
     */
    private const CASCADE_MAP = [
        'checklist_category'       => [['child_type' => 'checklist_item',   'fk' => 'category_id']],
        'tracker_category'         => [['child_type' => 'tracker_record',   'fk' => 'category_id']],
        'worker'                   => [['child_type' => 'training_record',  'fk' => 'worker_id']],
        'equipment_group'          => [['child_type' => 'equipment_item',   'fk' => 'group_id']],
        'equipment_registry_group' => [['child_type' => 'equipment_group',  'fk' => 'registry_group_id']],
        'permit'                   => [['child_type' => 'permit_amendment', 'fk' => 'permit_id']],
        'erp'                      => [['child_type' => 'mock_drill',       'fk' => 'erp_id']],
        'env_aspect'               => [
            ['child_type' => 'env_risk',   'fk' => 'aspect_id'],
            ['child_type' => 'env_action', 'fk' => 'linked_id', 'polymorphic_type' => 'linked_type', 'polymorphic_value' => 'aspect'],
        ],
        'env_risk'                 => [
            ['child_type' => 'env_action', 'fk' => 'linked_id', 'polymorphic_type' => 'linked_type', 'polymorphic_value' => 'risk'],
        ],
        'env_incident'             => [
            ['child_type' => 'env_action', 'fk' => 'linked_id', 'polymorphic_type' => 'linked_type', 'polymorphic_value' => 'incident'],
        ],
        'env_inspection'           => [
            ['child_type' => 'env_action', 'fk' => 'linked_id', 'polymorphic_type' => 'linked_type', 'polymorphic_value' => 'inspection'],
        ],
        'env_compliance'           => [
            ['child_type' => 'env_action', 'fk' => 'linked_id', 'polymorphic_type' => 'linked_type', 'polymorphic_value' => 'compliance'],
        ],
        'env_objective'            => [
            ['child_type' => 'env_action', 'fk' => 'linked_id', 'polymorphic_type' => 'linked_type', 'polymorphic_value' => 'objective'],
        ],
    ];

    // ─── LIST ───────────────────────────────────────

    /**
     * GET /api/recycle-bin
     * List trashed items, optionally filtered by module or type.
     */
    public function index(Request $request): JsonResponse
    {
        $typeFilter   = $request->input('type');
        $moduleFilter = $request->input('module');
        $search       = $request->input('search');
        $perPage      = min((int) $request->input('per_page', 25), 100);

        $allItems = collect();

        foreach (self::TYPE_MAP as $typeKey => $config) {
            if ($typeFilter && $typeFilter !== $typeKey) continue;
            if ($moduleFilter && $config['module'] !== $moduleFilter) continue;

            try {
                $modelClass = $config['model'];
                $query = $modelClass::onlyTrashed();

                if ($search) {
                    $query->where(function ($q) use ($search, $typeKey) {
                        $nameCol = $this->getNameColumn($typeKey);
                        if ($nameCol) {
                            $q->where($nameCol, 'like', "%{$search}%");
                        }
                        $codeCol = $this->getCodeColumn($typeKey);
                        if ($codeCol) {
                            $q->orWhere($codeCol, 'like', "%{$search}%");
                        }
                    });
                }

                $trashed = $query->orderByDesc('deleted_at')->limit(200)->get();

                foreach ($trashed as $item) {
                    $allItems->push([
                        'id'          => $item->getKey(),
                        'type'        => $typeKey,
                        'type_label'  => $config['label'],
                        'module'      => $config['module'],
                        'name'        => $this->getDisplayName($typeKey, $item),
                        'code'        => $this->getDisplayCode($typeKey, $item),
                        'deleted_at'  => $item->deleted_at?->toIso8601String(),
                        'deleted_by'  => $item->deleted_by ?? null,
                    ]);
                }
            } catch (\Throwable $e) {
                // Skip types whose table may not exist (e.g., pending migration)
                continue;
            }
        }

        // Sort all by deleted_at desc
        $sorted = $allItems->sortByDesc('deleted_at')->values();

        // Simple pagination
        $page   = max(1, (int) $request->input('page', 1));
        $offset = ($page - 1) * $perPage;
        $total  = $sorted->count();
        $paged  = $sorted->slice($offset, $perPage)->values();

        return response()->json([
            'data'      => $paged,
            'total'     => $total,
            'page'      => $page,
            'per_page'  => $perPage,
            'last_page' => max(1, (int) ceil($total / $perPage)),
        ]);
    }

    /**
     * GET /api/recycle-bin/count
     * Quick count of trashed items.
     */
    public function count(): JsonResponse
    {
        $total = 0;
        foreach (self::TYPE_MAP as $config) {
            try {
                $total += $config['model']::onlyTrashed()->count();
            } catch (\Throwable) {
                continue;
            }
        }
        return response()->json(['count' => $total]);
    }

    /**
     * GET /api/recycle-bin/modules
     * Returns trashed item counts grouped by module/section.
     */
    public function modules(): JsonResponse
    {
        $modules = [];

        foreach (self::TYPE_MAP as $key => $config) {
            try {
                $count = $config['model']::onlyTrashed()->count();
            } catch (\Throwable) {
                continue;
            }
            $moduleName = $config['module'];

            if (!isset($modules[$moduleName])) {
                $modules[$moduleName] = [
                    'module' => $moduleName,
                    'count'  => 0,
                    'types'  => [],
                ];
            }

            $modules[$moduleName]['count'] += $count;
            $modules[$moduleName]['types'][] = [
                'key'   => $key,
                'label' => $config['label'],
                'count' => $count,
            ];
        }

        // Sort modules by count desc, then filter out empty ones
        $result = collect(array_values($modules))
            ->sortByDesc('count')
            ->values()
            ->all();

        return response()->json($result);
    }

    // ─── RESTORE ────────────────────────────────────

    /**
     * POST /api/recycle-bin/restore
     * Restore a trashed item and its cascade children.
     */
    public function restore(Request $request): JsonResponse
    {
        $request->validate([
            'type'   => 'required|string',
            'id'     => 'required',
            'reason' => 'nullable|string|max:500',
        ]);

        $typeKey = $request->type;
        if (!isset(self::TYPE_MAP[$typeKey])) {
            return response()->json(['message' => 'Invalid type'], 422);
        }

        $config     = self::TYPE_MAP[$typeKey];
        $modelClass = $config['model'];
        $item       = $modelClass::onlyTrashed()->findOrFail($request->id);

        $cascadedChildren = [];

        DB::transaction(function () use ($typeKey, $item, $request, &$cascadedChildren) {
            // Restore the main record
            $item->deleted_by = null;
            $item->save();
            $item->restore();

            // Cascade restore children
            $cascadedChildren = $this->cascadeRestore($typeKey, $item);
        });

        // Log the restore action
        $this->logAction('restored', $typeKey, $item, $request->input('reason'), $cascadedChildren);

        // Fire module-specific post-restore hook if the model supports it
        if (method_exists($item, 'onRestoredFromRecycleBin')) {
            $item->onRestoredFromRecycleBin();
        }

        // Also fire hooks for cascade-restored children
        foreach ($cascadedChildren as $childInfo) {
            $childConfig = self::TYPE_MAP[$childInfo['type']] ?? null;
            if ($childConfig) {
                $childModel = $childConfig['model']::find($childInfo['id']);
                if ($childModel && method_exists($childModel, 'onRestoredFromRecycleBin')) {
                    $childModel->onRestoredFromRecycleBin();
                }
            }
        }

        $childCount = count($cascadedChildren);
        $message = $config['label'] . ' restored successfully';
        if ($childCount > 0) {
            $message .= " (including {$childCount} related " . ($childCount === 1 ? 'record' : 'records') . ')';
        }

        return response()->json(['message' => $message]);
    }

    // ─── FORCE DELETE ───────────────────────────────

    /**
     * POST /api/recycle-bin/force-delete
     * Permanently delete a trashed item and its children.
     */
    public function forceDelete(Request $request): JsonResponse
    {
        $request->validate([
            'type'   => 'required|string',
            'id'     => 'required',
            'reason' => 'nullable|string|max:500',
        ]);

        $typeKey = $request->type;
        if (!isset(self::TYPE_MAP[$typeKey])) {
            return response()->json(['message' => 'Invalid type'], 422);
        }

        $config     = self::TYPE_MAP[$typeKey];
        $modelClass = $config['model'];
        $item       = $modelClass::onlyTrashed()->findOrFail($request->id);

        // Capture display info before deletion
        $displayName = $this->getDisplayName($typeKey, $item);
        $displayCode = $this->getDisplayCode($typeKey, $item);
        $itemId      = $item->getKey();
        $cascadedChildren = [];

        DB::transaction(function () use ($typeKey, $item, &$cascadedChildren) {
            // Cascade force-delete children first
            $cascadedChildren = $this->cascadeForceDelete($typeKey, $item);

            // Force delete the main record
            $item->forceDelete();
        });

        // Log the permanent delete action (use captured info since item is gone)
        $this->logActionRaw('permanently_deleted', $typeKey, $itemId, $displayName, $displayCode, $config['module'], $request->input('reason'), $cascadedChildren);

        return response()->json([
            'message' => $config['label'] . ' permanently deleted',
        ]);
    }

    // ─── TYPES ──────────────────────────────────────

    /**
     * GET /api/recycle-bin/types
     * Available types for filtering (with counts).
     */
    public function types(): JsonResponse
    {
        $types = [];
        foreach (self::TYPE_MAP as $key => $config) {
            try {
                $count = $config['model']::onlyTrashed()->count();
            } catch (\Throwable) {
                continue;
            }
            $types[] = [
                'key'    => $key,
                'label'  => $config['label'],
                'module' => $config['module'],
                'count'  => $count,
            ];
        }
        return response()->json($types);
    }

    // ─── LOGS ───────────────────────────────────────

    /**
     * GET /api/recycle-bin/logs
     * Return audit logs for recycle bin actions.
     */
    public function logs(Request $request): JsonResponse
    {
        $perPage = min((int) $request->input('per_page', 25), 100);

        $query = RecycleBinLog::query()->orderByDesc('created_at');

        if ($action = $request->input('action')) {
            $query->where('action', $action);
        }
        if ($module = $request->input('module')) {
            $query->where('module', $module);
        }
        if ($type = $request->input('record_type')) {
            $query->where('record_type', $type);
        }

        $page   = max(1, (int) $request->input('page', 1));
        $total  = $query->count();
        $logs   = $query->skip(($page - 1) * $perPage)->take($perPage)->get();

        return response()->json([
            'data'      => $logs,
            'total'     => $total,
            'page'      => $page,
            'per_page'  => $perPage,
            'last_page' => max(1, (int) ceil($total / $perPage)),
        ]);
    }

    // ─── CASCADE HELPERS ────────────────────────────

    /**
     * Cascade soft-delete children when a parent is deleted.
     * Called from individual controllers when they delete a record.
     */
    public static function cascadeSoftDelete(string $parentType, $parentItem): array
    {
        $cascaded = [];
        $deletedBy = Auth::user()?->full_name ?? 'System';

        if (!isset(self::CASCADE_MAP[$parentType])) {
            return $cascaded;
        }

        foreach (self::CASCADE_MAP[$parentType] as $childDef) {
            $childTypeKey = $childDef['child_type'];
            if (!isset(self::TYPE_MAP[$childTypeKey])) continue;

            $childModelClass = self::TYPE_MAP[$childTypeKey]['model'];
            $fk = $childDef['fk'];

            // Get active children for this parent (supports polymorphic FK)
            $query = $childModelClass::where($fk, $parentItem->getKey());
            if (isset($childDef['polymorphic_type'], $childDef['polymorphic_value'])) {
                $query->where($childDef['polymorphic_type'], $childDef['polymorphic_value']);
            }
            $children = $query->get();

            foreach ($children as $child) {
                $child->deleted_by = $deletedBy;
                $child->save();
                $child->delete();

                $cascaded[] = [
                    'type' => $childTypeKey,
                    'id'   => $child->getKey(),
                ];

                // Recursively cascade if this child type is also a parent
                $subCascaded = self::cascadeSoftDeleteStatic($childTypeKey, $child);
                $cascaded = array_merge($cascaded, $subCascaded);
            }
        }

        return $cascaded;
    }

    private static function cascadeSoftDeleteStatic(string $parentType, $parentItem): array
    {
        $cascaded = [];
        $deletedBy = Auth::user()?->full_name ?? 'System';

        if (!isset(self::CASCADE_MAP[$parentType])) {
            return $cascaded;
        }

        foreach (self::CASCADE_MAP[$parentType] as $childDef) {
            $childTypeKey = $childDef['child_type'];
            if (!isset(self::TYPE_MAP[$childTypeKey])) continue;

            $childModelClass = self::TYPE_MAP[$childTypeKey]['model'];
            $fk = $childDef['fk'];

            $query = $childModelClass::where($fk, $parentItem->getKey());
            if (isset($childDef['polymorphic_type'], $childDef['polymorphic_value'])) {
                $query->where($childDef['polymorphic_type'], $childDef['polymorphic_value']);
            }
            $children = $query->get();

            foreach ($children as $child) {
                $child->deleted_by = $deletedBy;
                $child->save();
                $child->delete();

                $cascaded[] = [
                    'type' => $childTypeKey,
                    'id'   => $child->getKey(),
                ];

                $subCascaded = self::cascadeSoftDeleteStatic($childTypeKey, $child);
                $cascaded = array_merge($cascaded, $subCascaded);
            }
        }

        return $cascaded;
    }

    /**
     * Cascade restore of children.
     */
    private function cascadeRestore(string $parentType, $parentItem): array
    {
        $restored = [];

        if (!isset(self::CASCADE_MAP[$parentType])) {
            return $restored;
        }

        foreach (self::CASCADE_MAP[$parentType] as $childDef) {
            $childTypeKey = $childDef['child_type'];
            if (!isset(self::TYPE_MAP[$childTypeKey])) continue;

            $childModelClass = self::TYPE_MAP[$childTypeKey]['model'];
            $fk = $childDef['fk'];

            // Find trashed children belonging to this parent (supports polymorphic FK)
            $query = $childModelClass::onlyTrashed()
                ->where($fk, $parentItem->getKey());
            if (isset($childDef['polymorphic_type'], $childDef['polymorphic_value'])) {
                $query->where($childDef['polymorphic_type'], $childDef['polymorphic_value']);
            }
            $trashedChildren = $query->get();

            foreach ($trashedChildren as $child) {
                $child->deleted_by = null;
                $child->save();
                $child->restore();

                $restored[] = [
                    'type' => $childTypeKey,
                    'id'   => $child->getKey(),
                ];

                // Recursively restore children of this child
                $subRestored = $this->cascadeRestore($childTypeKey, $child);
                $restored = array_merge($restored, $subRestored);
            }
        }

        return $restored;
    }

    /**
     * Cascade force-delete of children (including non-soft-deletable child records).
     */
    private function cascadeForceDelete(string $parentType, $parentItem): array
    {
        $deleted = [];

        if (!isset(self::CASCADE_MAP[$parentType])) {
            return $deleted;
        }

        foreach (self::CASCADE_MAP[$parentType] as $childDef) {
            $childTypeKey = $childDef['child_type'];
            if (!isset(self::TYPE_MAP[$childTypeKey])) continue;

            $childModelClass = self::TYPE_MAP[$childTypeKey]['model'];
            $fk = $childDef['fk'];

            // Get both active AND trashed children (supports polymorphic FK)
            $query = $childModelClass::withTrashed()
                ->where($fk, $parentItem->getKey());
            if (isset($childDef['polymorphic_type'], $childDef['polymorphic_value'])) {
                $query->where($childDef['polymorphic_type'], $childDef['polymorphic_value']);
            }
            $children = $query->get();

            foreach ($children as $child) {
                // Recursively force-delete children of this child first
                $subDeleted = $this->cascadeForceDelete($childTypeKey, $child);
                $deleted = array_merge($deleted, $subDeleted);

                $deleted[] = [
                    'type' => $childTypeKey,
                    'id'   => $child->getKey(),
                ];

                $child->forceDelete();
            }
        }

        return $deleted;
    }

    // ─── AUDIT LOGGING ──────────────────────────────

    /**
     * Log a recycle bin action for an item that still exists.
     */
    private function logAction(string $action, string $typeKey, $item, ?string $reason = null, array $cascaded = []): void
    {
        $config = self::TYPE_MAP[$typeKey] ?? null;
        if (!$config) return;

        $user = Auth::user();

        RecycleBinLog::create([
            'action'            => $action,
            'record_type'       => $typeKey,
            'record_id'         => (string) $item->getKey(),
            'record_name'       => $this->getDisplayName($typeKey, $item),
            'record_code'       => $this->getDisplayCode($typeKey, $item),
            'module'            => $config['module'],
            'performed_by'      => $user?->id,
            'performed_by_name' => $user?->full_name ?? 'System',
            'reason'            => $reason,
            'metadata'          => !empty($cascaded) ? ['cascaded' => $cascaded] : null,
            'created_at'        => now(),
        ]);
    }

    /**
     * Log a recycle bin action using raw data (for permanently deleted items).
     */
    private function logActionRaw(string $action, string $typeKey, $recordId, string $name, ?string $code, string $module, ?string $reason = null, array $cascaded = []): void
    {
        $user = Auth::user();

        RecycleBinLog::create([
            'action'            => $action,
            'record_type'       => $typeKey,
            'record_id'         => (string) $recordId,
            'record_name'       => $name,
            'record_code'       => $code,
            'module'            => $module,
            'performed_by'      => $user?->id,
            'performed_by_name' => $user?->full_name ?? 'System',
            'reason'            => $reason,
            'metadata'          => !empty($cascaded) ? ['cascaded' => $cascaded] : null,
            'created_at'        => now(),
        ]);
    }

    /**
     * Static helper for controllers to log delete actions.
     */
    public static function logDeleteAction(string $typeKey, $item, ?string $reason = null, array $cascaded = []): void
    {
        $config = self::TYPE_MAP[$typeKey] ?? null;
        if (!$config) return;

        $user = Auth::user();
        $instance = new self();

        RecycleBinLog::create([
            'action'            => 'deleted',
            'record_type'       => $typeKey,
            'record_id'         => (string) $item->getKey(),
            'record_name'       => $instance->getDisplayName($typeKey, $item),
            'record_code'       => $instance->getDisplayCode($typeKey, $item),
            'module'            => $config['module'],
            'performed_by'      => $user?->id,
            'performed_by_name' => $user?->full_name ?? 'System',
            'reason'            => $reason,
            'metadata'          => !empty($cascaded) ? ['cascaded' => $cascaded] : null,
            'created_at'        => now(),
        ]);
    }

    // ─── DISPLAY HELPERS ────────────────────────────

    private function getNameColumn(string $type): ?string
    {
        return match ($type) {
            'tracker_category', 'checklist_category' => 'label',
            'tracker_record'       => 'equipment_name',
            'checklist_item'       => 'name',
            'observation'          => 'description',
            'permit'               => 'description',
            'mockup'               => 'title',
            'mom'                  => 'title',
            'worker'               => 'name',
            'training_record'      => 'training_topic_key',
            'equipment_register'   => 'equipment_name',
            'checklist_inspection' => 'inspector_name',
            'permit_amendment'     => 'amendment_title',
            'equipment_group'      => 'name',
            'equipment_item'       => 'item_name',
            'equipment_registry_group' => 'name',
            'violation'            => 'description',
            'incident'             => 'description',
            'mock_drill'           => 'title',
            'erp'                  => 'title',
            'campaign'             => 'title',
            'poster'               => 'title',
            'contractor'           => 'contractor_name',
            'dc_document'          => 'document_title',
            'env_aspect'           => 'activity',
            'env_risk'             => 'hazard_description',
            'env_incident'         => 'description',
            'env_inspection'       => 'findings_summary',
            'env_compliance'       => 'regulation_name',
            'env_objective'        => 'title',
            'waste_manifest'       => 'waste_description',
            'waste_record'         => 'waste_type',
            'env_monitoring'       => 'parameter',
            'env_resource'         => 'resource_type',
            'env_action'           => 'title',
            default => null,
        };
    }

    private function getCodeColumn(string $type): ?string
    {
        return match ($type) {
            'tracker_record'       => 'record_code',
            'checklist_item'       => 'item_code',
            'checklist_inspection' => 'inspection_code',
            'observation'          => 'ref_number',
            'permit'               => 'ref_number',
            'permit_amendment'     => 'amendment_code',
            'mockup'               => 'ref_number',
            'mom'                  => 'mom_code',
            'training_record'      => 'record_id',
            'equipment_register'   => 'equipment_code',
            'equipment_item'       => 'item_code',
            'violation'            => 'violation_code',
            'incident'             => 'incident_code',
            'mock_drill'           => 'drill_code',
            'erp'                  => 'erp_code',
            'campaign'             => 'campaign_code',
            'poster'               => 'poster_code',
            'contractor'           => 'contractor_code',
            'dc_document'          => 'document_code',
            'env_aspect'           => 'aspect_code',
            'env_risk'             => 'risk_code',
            'env_incident'         => 'incident_code',
            'env_inspection'       => 'inspection_code',
            'env_compliance'       => 'compliance_code',
            'env_objective'        => 'objective_code',
            'waste_manifest'       => 'manifest_code',
            'waste_record'         => 'waste_code',
            'env_monitoring'       => 'monitoring_code',
            'env_resource'         => 'consumption_code',
            'env_action'           => 'action_code',
            default => null,
        };
    }

    private function getDisplayName(string $type, $item): string
    {
        if ($type === 'training_record') {
            $topicLabel = $item->topic?->label ?? null;
            if ($topicLabel) return $topicLabel;
            $key = $item->training_topic_key ?? '';
            return $key ? ucwords(str_replace('_', ' ', $key)) : '(unnamed)';
        }
        $col = $this->getNameColumn($type);
        return $col ? (string) ($item->{$col} ?? '(unnamed)') : '(unnamed)';
    }

    private function getDisplayCode(string $type, $item): ?string
    {
        $col = $this->getCodeColumn($type);
        return $col ? ($item->{$col} ?? null) : null;
    }
}
