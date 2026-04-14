<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * DATA INTEGRITY HARDENING — Environmental Module
 *
 * Adds SoftDeletes (deleted_at + deleted_by) to three environmental tables
 * that previously used hard delete:
 *
 * 1. environmental_monitoring — compliance monitoring data (air/water/noise)
 * 2. resource_consumption     — sustainability reporting data
 * 3. environmental_actions    — corrective actions linked polymorphically to
 *                               aspects, risks, incidents, objectives
 *
 * Rationale:
 * - EHS compliance requires data recoverability (ISO 14001)
 * - environmental_actions uses polymorphic linked_type/linked_id with NO FK,
 *   creating orphan risk on parent force-delete; SoftDeletes + cascade fixes this
 * - environmental_monitoring & resource_consumption are operational compliance
 *   data that should be recoverable from the recycle bin
 *
 * NOTE: environmental_logs is intentionally excluded — immutable audit trail
 *       that must persist even after parent entity removal.
 */
return new class extends Migration
{
    public function up(): void
    {
        $tables = ['environmental_monitoring', 'resource_consumption', 'environmental_actions'];

        foreach ($tables as $tbl) {
            if (!Schema::hasTable($tbl)) continue;

            Schema::table($tbl, function (Blueprint $table) use ($tbl) {
                if (!Schema::hasColumn($tbl, 'deleted_at')) {
                    $table->softDeletes();
                }
                if (!Schema::hasColumn($tbl, 'deleted_by')) {
                    $table->string('deleted_by')->nullable()->after('deleted_at');
                }
            });
        }
    }

    public function down(): void
    {
        $tables = ['environmental_monitoring', 'resource_consumption', 'environmental_actions'];

        foreach ($tables as $tbl) {
            if (!Schema::hasTable($tbl)) continue;

            Schema::table($tbl, function (Blueprint $table) use ($tbl) {
                if (Schema::hasColumn($tbl, 'deleted_at')) {
                    $table->dropSoftDeletes();
                }
                if (Schema::hasColumn($tbl, 'deleted_by')) {
                    $table->dropColumn('deleted_by');
                }
            });
        }
    }
};
