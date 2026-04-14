<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add deleted_by column to mock_drills, campaigns, and waste_manifests
     * for recycle-bin / audit-trail support.
     */
    public function up(): void
    {
        $tables = ['mock_drills', 'campaigns', 'waste_manifests'];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && !Schema::hasColumn($table, 'deleted_by')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->string('deleted_by')->nullable()->after('updated_at');
                });
            }
        }
    }

    public function down(): void
    {
        $tables = ['mock_drills', 'campaigns', 'waste_manifests'];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'deleted_by')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->dropColumn('deleted_by');
                });
            }
        }
    }
};
