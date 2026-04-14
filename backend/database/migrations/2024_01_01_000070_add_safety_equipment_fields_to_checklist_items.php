<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('checklist_items', function (Blueprint $table) {
            // Harness-specific
            $table->date('manufacture_date')->nullable()->after('notes');
            $table->date('retirement_date')->nullable()->after('manufacture_date');
            $table->boolean('last_drop_arrest')->default(false)->after('retirement_date');
            $table->date('drop_arrest_date')->nullable()->after('last_drop_arrest');

            // Fire extinguisher-specific
            $table->string('extinguisher_type', 100)->nullable()->after('drop_arrest_date');
            $table->decimal('capacity_litres', 6, 2)->nullable()->after('extinguisher_type');
            $table->date('last_service_date')->nullable()->after('capacity_litres');
            $table->date('next_service_date')->nullable()->after('last_service_date');
            $table->enum('pressure_status', ['Normal', 'Low', 'High', 'Unknown'])
                ->default('Normal')->after('next_service_date');

            // Generator-specific
            $table->decimal('engine_hours', 10, 2)->nullable()->after('pressure_status');
            $table->string('fuel_type', 50)->nullable()->after('engine_hours');
            $table->decimal('kva_rating', 8, 2)->nullable()->after('fuel_type');

            // General tool tracking
            $table->date('last_toolbox_tag_date')->nullable()->after('kva_rating');
            $table->string('toolbox_tag_colour', 50)->nullable()->after('last_toolbox_tag_date');
            $table->date('next_toolbox_tag_date')->nullable()->after('toolbox_tag_colour');

            // Defect tracking
            $table->boolean('has_open_defect')->default(false)->after('next_toolbox_tag_date');
            $table->text('defect_description')->nullable()->after('has_open_defect');
            $table->date('defect_reported_date')->nullable()->after('defect_description');

            // Indexes
            $table->index('manufacture_date', 'idx_ci_manufacture');
            $table->index('retirement_date', 'idx_ci_retirement');
            $table->index('last_service_date', 'idx_ci_svc_date');
            $table->index('next_toolbox_tag_date', 'idx_ci_tag_date');
        });
    }

    public function down(): void
    {
        Schema::table('checklist_items', function (Blueprint $table) {
            $table->dropIndex('idx_ci_manufacture');
            $table->dropIndex('idx_ci_retirement');
            $table->dropIndex('idx_ci_svc_date');
            $table->dropIndex('idx_ci_tag_date');

            $table->dropColumn([
                'manufacture_date', 'retirement_date', 'last_drop_arrest', 'drop_arrest_date',
                'extinguisher_type', 'capacity_litres', 'last_service_date', 'next_service_date', 'pressure_status',
                'engine_hours', 'fuel_type', 'kva_rating',
                'last_toolbox_tag_date', 'toolbox_tag_colour', 'next_toolbox_tag_date',
                'has_open_defect', 'defect_description', 'defect_reported_date',
            ]);
        });
    }
};
