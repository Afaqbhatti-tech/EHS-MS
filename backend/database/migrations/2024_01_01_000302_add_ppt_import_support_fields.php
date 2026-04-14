<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add fields to support PPT slide import: source_slide_no, section_name
 * on mom_points, permits, training_records tables.
 * Also create ppt_import_sections table for slide-level tracking.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Add source_slide_no + section_name to mom_points
        if (Schema::hasTable('mom_points')) {
            Schema::table('mom_points', function (Blueprint $table) {
                if (!Schema::hasColumn('mom_points', 'source_slide_no')) {
                    $table->unsignedSmallInteger('source_slide_no')->nullable()->after('remarks');
                }
                if (!Schema::hasColumn('mom_points', 'section_name')) {
                    $table->string('section_name', 255)->nullable()->after('source_slide_no');
                }
            });
        }

        // Add source_slide_no to permits
        if (Schema::hasTable('permits')) {
            Schema::table('permits', function (Blueprint $table) {
                if (!Schema::hasColumn('permits', 'source_slide_no')) {
                    $table->unsignedSmallInteger('source_slide_no')->nullable()->after('notes');
                }
            });
        }

        // Add source_slide_no to training_records
        if (Schema::hasTable('training_records')) {
            Schema::table('training_records', function (Blueprint $table) {
                if (!Schema::hasColumn('training_records', 'source_slide_no')) {
                    $table->unsignedSmallInteger('source_slide_no')->nullable()->after('notes');
                }
            });
        }

        // Create ppt_import_sections table for slide-level import tracking
        Schema::create('ppt_import_sections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('document_import_id');
            $table->unsignedSmallInteger('slide_number');
            $table->string('slide_title', 500)->nullable();
            $table->string('slide_type', 50)->nullable(); // weekly_mom_header, closing_slide, etc.
            $table->string('target_module', 50)->nullable(); // mom, permits, training, reports, etc.
            $table->string('classification_label', 100)->nullable(); // human-readable label
            $table->decimal('confidence', 3, 2)->default(0.00);
            $table->boolean('is_informational')->default(false);
            $table->text('content_preview')->nullable();
            $table->json('extracted_metadata')->nullable();
            $table->string('action', 20)->default('pending'); // pending, mapped, ignored, unmapped
            $table->unsignedInteger('records_created')->default(0);
            $table->timestamps();

            $table->foreign('document_import_id')
                ->references('id')
                ->on('document_imports')
                ->onDelete('cascade');

            $table->index(['document_import_id', 'slide_number']);
            $table->index('slide_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ppt_import_sections');

        if (Schema::hasTable('mom_points') && Schema::hasColumn('mom_points', 'source_slide_no')) {
            Schema::table('mom_points', function (Blueprint $table) {
                $table->dropColumn(['source_slide_no', 'section_name']);
            });
        }

        if (Schema::hasTable('permits') && Schema::hasColumn('permits', 'source_slide_no')) {
            Schema::table('permits', function (Blueprint $table) {
                $table->dropColumn('source_slide_no');
            });
        }

        if (Schema::hasTable('training_records') && Schema::hasColumn('training_records', 'source_slide_no')) {
            Schema::table('training_records', function (Blueprint $table) {
                $table->dropColumn('source_slide_no');
            });
        }
    }
};
