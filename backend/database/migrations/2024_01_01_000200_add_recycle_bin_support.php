<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add soft-delete and deleted_by support for recycle bin.
     */
    public function up(): void
    {
        // Tables that need deleted_at added (don't have SoftDeletes yet)
        $tablesNeedingSoftDelete = [
            'tracker_categories',
            'checklist_categories',
            'observations',
        ];

        foreach ($tablesNeedingSoftDelete as $table) {
            if (Schema::hasTable($table) && !Schema::hasColumn($table, 'deleted_at')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->softDeletes();
                });
            }
        }

        // All soft-deletable tables that need deleted_by column
        $tablesNeedingDeletedBy = [
            'tracker_categories',
            'checklist_categories',
            'tracker_records',
            'checklist_items',
            'observations',
            'permits',
            'mockups',
            'moms',
            'workers',
            'training_records',
        ];

        foreach ($tablesNeedingDeletedBy as $table) {
            if (Schema::hasTable($table) && !Schema::hasColumn($table, 'deleted_by')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->string('deleted_by')->nullable()->after('updated_at');
                });
            }
        }
    }

    public function down(): void
    {
        $tablesWithDeletedAt = [
            'tracker_categories',
            'checklist_categories',
            'observations',
        ];

        foreach ($tablesWithDeletedAt as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'deleted_at')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->dropSoftDeletes();
                });
            }
        }

        $tablesWithDeletedBy = [
            'tracker_categories',
            'checklist_categories',
            'tracker_records',
            'checklist_items',
            'observations',
            'permits',
            'mockups',
            'moms',
            'workers',
            'training_records',
        ];

        foreach ($tablesWithDeletedBy as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'deleted_by')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->dropColumn('deleted_by');
                });
            }
        }
    }
};
