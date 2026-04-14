<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Environmental tables that use SoftDeletes but are missing the deleted_by column.
     */
    private array $tables = [
        'environmental_aspects',
        'environmental_risks',
        'waste_records',
        'environmental_incidents',
        'environmental_inspections',
        'environmental_compliance_register',
        'environmental_objectives',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            if (Schema::hasTable($table) && !Schema::hasColumn($table, 'deleted_by')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->string('deleted_by')->nullable()->after('updated_at');
                });
            }
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'deleted_by')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->dropColumn('deleted_by');
                });
            }
        }
    }
};
