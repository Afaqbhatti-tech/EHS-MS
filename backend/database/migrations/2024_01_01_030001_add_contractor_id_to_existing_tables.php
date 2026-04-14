<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add contractor_id FK to existing tables that already have a
     * contractor / contractor_name text column.
     * Only adds if the table AND the 'after' column exist.
     */
    public function up(): void
    {
        $tables = [
            'permits'         => 'contractor',
            'rams_documents'  => 'contractor',
            'observations'    => 'contractor',
            'mockups'         => 'contractor',
            'incidents'       => 'contractor_name',
            'violations'      => 'contractor_name',
        ];

        foreach ($tables as $table => $afterColumn) {
            if (Schema::hasTable($table) && ! Schema::hasColumn($table, 'contractor_id')) {
                Schema::table($table, function (Blueprint $blueprint) use ($table, $afterColumn) {
                    // Only use 'after' if the column actually exists
                    if (Schema::hasColumn($table, $afterColumn)) {
                        $blueprint->unsignedBigInteger('contractor_id')->nullable()->after($afterColumn);
                    } else {
                        $blueprint->unsignedBigInteger('contractor_id')->nullable();
                    }
                    $blueprint->foreign('contractor_id')->references('id')->on('contractors')->nullOnDelete();
                    $blueprint->index('contractor_id');
                });
            }
        }

        // Also add to waste_manifests if it exists (may not have contractor column)
        if (Schema::hasTable('waste_manifests') && ! Schema::hasColumn('waste_manifests', 'contractor_id')) {
            Schema::table('waste_manifests', function (Blueprint $table) {
                $table->unsignedBigInteger('contractor_id')->nullable();
                $table->foreign('contractor_id')->references('id')->on('contractors')->nullOnDelete();
                $table->index('contractor_id');
            });
        }
    }

    public function down(): void
    {
        $tables = ['permits', 'rams_documents', 'observations', 'mockups', 'incidents', 'violations', 'waste_manifests'];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'contractor_id')) {
                Schema::table($table, function (Blueprint $blueprint) use ($table) {
                    $blueprint->dropForeign([$table === 'waste_manifests' ? 'waste_manifests_contractor_id_foreign' : 'contractor_id']);
                    $blueprint->dropColumn('contractor_id');
                });
            }
        }
    }
};
