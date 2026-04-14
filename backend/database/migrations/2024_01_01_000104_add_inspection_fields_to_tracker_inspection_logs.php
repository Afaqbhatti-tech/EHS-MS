<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Add new columns to tracker_inspection_logs ──────────
        Schema::table('tracker_inspection_logs', function (Blueprint $table) {
            // Item identification at time of inspection
            $table->string('sticker_number', 200)->nullable()->after('category_key');
            $table->string('plate_number_at_insp', 100)->nullable()->after('sticker_number');

            // Inspection purpose / reason
            $table->string('inspection_purpose', 255)->nullable()->after('inspection_type');
            $table->string('inspection_frequency', 50)->nullable()->after('inspection_purpose');

            // Category-specific fields
            $table->decimal('extinguisher_weight_kg', 6, 2)->nullable()->after('notes');
            $table->tinyInteger('civil_defense_tag_ok')->nullable()->after('extinguisher_weight_kg');
            $table->string('harness_condition', 100)->nullable()->after('civil_defense_tag_ok');
            $table->tinyInteger('drop_arrest_occurred')->default(0)->after('harness_condition');
            $table->string('ladder_type', 100)->nullable()->after('drop_arrest_occurred');
            $table->text('visual_condition_notes')->nullable()->after('ladder_type');

            // File attachments
            $table->string('checklist_file_path', 1000)->nullable()->after('image_path');
            $table->string('checklist_image_path', 1000)->nullable()->after('checklist_file_path');
            $table->json('additional_images')->nullable()->after('checklist_image_path');
            $table->json('supporting_docs')->nullable()->after('additional_images');

            // Enhanced tracking
            $table->tinyInteger('overdue_at_time')->default(0)->after('supporting_docs');
            $table->integer('days_overdue_at_time')->nullable()->after('overdue_at_time');

            // Verification
            $table->string('verified_by', 255)->nullable()->after('days_overdue_at_time');
            $table->timestamp('verified_at')->nullable()->after('verified_by');

            // Indexes
            $table->index('inspection_purpose', 'idx_til_purpose');
            $table->index('inspector_name', 'idx_til_inspector');
            $table->index('sticker_number', 'idx_til_sticker');
        });

        // ── Add new columns to tracker_records ──────────────────
        Schema::table('tracker_records', function (Blueprint $table) {
            $table->string('sticker_number', 200)->nullable()->after('checker_number');
            $table->integer('total_inspections_count')->default(0)->after('notes');
            $table->string('last_inspection_result', 50)->nullable()->after('total_inspections_count');
            $table->string('last_inspector_name', 255)->nullable()->after('last_inspection_result');
        });
    }

    public function down(): void
    {
        Schema::table('tracker_inspection_logs', function (Blueprint $table) {
            $table->dropIndex('idx_til_purpose');
            $table->dropIndex('idx_til_inspector');
            $table->dropIndex('idx_til_sticker');

            $table->dropColumn([
                'sticker_number', 'plate_number_at_insp',
                'inspection_purpose', 'inspection_frequency',
                'extinguisher_weight_kg', 'civil_defense_tag_ok',
                'harness_condition', 'drop_arrest_occurred',
                'ladder_type', 'visual_condition_notes',
                'checklist_file_path', 'checklist_image_path',
                'additional_images', 'supporting_docs',
                'overdue_at_time', 'days_overdue_at_time',
                'verified_by', 'verified_at',
            ]);
        });

        Schema::table('tracker_records', function (Blueprint $table) {
            $table->dropColumn([
                'sticker_number', 'total_inspections_count',
                'last_inspection_result', 'last_inspector_name',
            ]);
        });
    }
};
