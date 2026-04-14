<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Create registry groups table (top-level "Groups") ──
        if (!Schema::hasTable('equipment_registry_groups')) {
            Schema::create('equipment_registry_groups', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->text('description')->nullable();
                $table->string('icon')->default('Package');
                $table->string('color')->default('#6B7280');
                $table->string('light_color')->default('#F3F4F6');
                $table->string('text_color')->default('#374151');
                $table->unsignedInteger('sort_order')->default(0);
                $table->unsignedBigInteger('created_by')->nullable();
                $table->unsignedBigInteger('updated_by')->nullable();
                $table->string('deleted_by')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->index('sort_order');
                $table->index('created_by');
            });
        }

        // ── 2. Add registry_group_id + extras to equipment_groups (now "Categories") ──
        if (Schema::hasTable('equipment_groups')) {
            Schema::table('equipment_groups', function (Blueprint $table) {
                if (!Schema::hasColumn('equipment_groups', 'registry_group_id')) {
                    $table->unsignedBigInteger('registry_group_id')->nullable()->after('id');
                    $table->index('registry_group_id');
                }
                if (!Schema::hasColumn('equipment_groups', 'code_prefix')) {
                    $table->string('code_prefix', 10)->nullable()->after('category_type');
                }
                if (!Schema::hasColumn('equipment_groups', 'deleted_by')) {
                    $table->string('deleted_by')->nullable()->after('updated_by');
                }
            });
        }

        // ── 3. Add registry_group_id to equipment_group_fields ──
        if (Schema::hasTable('equipment_group_fields')) {
            Schema::table('equipment_group_fields', function (Blueprint $table) {
                if (!Schema::hasColumn('equipment_group_fields', 'registry_group_id')) {
                    $table->unsignedBigInteger('registry_group_id')->nullable()->after('id');
                    $table->index('registry_group_id');
                }
            });

            // ── 4. Make group_id nullable on equipment_group_fields ──
            // (allows fields to belong to registry group instead of individual category)
            Schema::table('equipment_group_fields', function (Blueprint $table) {
                $table->unsignedBigInteger('group_id')->nullable()->change();
            });
        }

        // ── 5. Add equipment_code + deleted_by to equipment_items ──
        if (Schema::hasTable('equipment_items')) {
            Schema::table('equipment_items', function (Blueprint $table) {
                if (!Schema::hasColumn('equipment_items', 'equipment_code')) {
                    $table->string('equipment_code', 20)->nullable()->after('item_code');
                    $table->unique('equipment_code');
                }
                if (!Schema::hasColumn('equipment_items', 'deleted_by')) {
                    $table->string('deleted_by')->nullable()->after('updated_by');
                }
            });
        }

        // ── 6. Data migration (safe — only runs if data not yet migrated) ──
        $this->migrateExistingData();
    }

    private function migrateExistingData(): void
    {
        // Guard: skip if registry groups already have data (migration already ran)
        if (DB::table('equipment_registry_groups')->count() > 0) {
            return;
        }

        // Get all distinct category_type values from existing equipment_groups
        // that are NOT yet linked to a registry group
        $categoryTypes = DB::table('equipment_groups')
            ->whereNull('deleted_at')
            ->whereNull('registry_group_id')
            ->distinct()
            ->pluck('category_type')
            ->filter()
            ->values();

        if ($categoryTypes->isEmpty()) {
            // Still generate equipment_code for items that don't have one
            $this->generateMissingEquipmentCodes();
            return;
        }

        foreach ($categoryTypes as $index => $typeName) {
            // Get the first group of this type for icon/color defaults
            $firstGroup = DB::table('equipment_groups')
                ->where('category_type', $typeName)
                ->whereNull('deleted_at')
                ->first();

            if (!$firstGroup) continue;

            // Create a registry group from each distinct category_type
            $registryGroupId = DB::table('equipment_registry_groups')->insertGetId([
                'name'        => $typeName,
                'description' => null,
                'icon'        => $firstGroup->icon ?? 'Package',
                'color'       => $firstGroup->color ?? '#6B7280',
                'light_color' => $firstGroup->light_color ?? '#F3F4F6',
                'text_color'  => $firstGroup->text_color ?? '#374151',
                'sort_order'  => $index,
                'created_by'  => $firstGroup->created_by,
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);

            // Link all equipment_groups of this type to the new registry group
            DB::table('equipment_groups')
                ->where('category_type', $typeName)
                ->whereNull('registry_group_id')
                ->update(['registry_group_id' => $registryGroupId]);

            // Collect unique fields from all categories in this group
            $groupIds = DB::table('equipment_groups')
                ->where('category_type', $typeName)
                ->pluck('id');

            $existingFields = DB::table('equipment_group_fields')
                ->whereIn('group_id', $groupIds)
                ->get();

            // Deduplicate by field_key, keeping the first occurrence
            $seenKeys = [];
            $sortOrder = 0;
            foreach ($existingFields as $field) {
                if (isset($seenKeys[$field->field_key])) continue;
                $seenKeys[$field->field_key] = true;

                // Guard: don't create if this field already exists at registry level
                $exists = DB::table('equipment_group_fields')
                    ->where('registry_group_id', $registryGroupId)
                    ->whereNull('group_id')
                    ->where('field_key', $field->field_key)
                    ->exists();

                if ($exists) continue;

                // Create a registry-group-level field definition
                DB::table('equipment_group_fields')->insert([
                    'registry_group_id' => $registryGroupId,
                    'group_id'          => null,
                    'field_key'         => $field->field_key,
                    'field_label'       => $field->field_label,
                    'field_type'        => $field->field_type,
                    'field_options'     => $field->field_options,
                    'is_required'       => $field->is_required,
                    'sort_order'        => $sortOrder++,
                    'created_at'        => now(),
                    'updated_at'        => now(),
                ]);
            }
        }

        // Generate equipment_code for existing items that don't have one
        $this->generateMissingEquipmentCodes();
    }

    private function generateMissingEquipmentCodes(): void
    {
        $items = DB::table('equipment_items')
            ->whereNull('equipment_code')
            ->orderBy('id')
            ->get();

        foreach ($items as $item) {
            $code = sprintf('EQ-%06d', $item->id);
            DB::table('equipment_items')
                ->where('id', $item->id)
                ->update(['equipment_code' => $code]);
        }
    }

    public function down(): void
    {
        // Remove generated registry-group-level fields
        DB::table('equipment_group_fields')
            ->whereNotNull('registry_group_id')
            ->whereNull('group_id')
            ->delete();

        if (Schema::hasTable('equipment_items')) {
            Schema::table('equipment_items', function (Blueprint $table) {
                if (Schema::hasColumn('equipment_items', 'equipment_code')) {
                    $table->dropUnique(['equipment_code']);
                    $table->dropColumn('equipment_code');
                }
                if (Schema::hasColumn('equipment_items', 'deleted_by')) {
                    $table->dropColumn('deleted_by');
                }
            });
        }

        if (Schema::hasTable('equipment_group_fields')) {
            Schema::table('equipment_group_fields', function (Blueprint $table) {
                if (Schema::hasColumn('equipment_group_fields', 'registry_group_id')) {
                    $table->dropIndex(['registry_group_id']);
                    $table->dropColumn('registry_group_id');
                }
            });
        }

        if (Schema::hasTable('equipment_groups')) {
            Schema::table('equipment_groups', function (Blueprint $table) {
                if (Schema::hasColumn('equipment_groups', 'registry_group_id')) {
                    $table->dropIndex(['registry_group_id']);
                    $table->dropColumn('registry_group_id');
                }
                if (Schema::hasColumn('equipment_groups', 'code_prefix')) {
                    $table->dropColumn('code_prefix');
                }
                if (Schema::hasColumn('equipment_groups', 'deleted_by')) {
                    $table->dropColumn('deleted_by');
                }
            });
        }

        Schema::dropIfExists('equipment_registry_groups');
    }
};
