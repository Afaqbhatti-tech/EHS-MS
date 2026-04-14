<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posters', function (Blueprint $table) {
            $table->bigIncrements('id');

            $table->string('poster_code', 30)->unique();

            // Identity
            $table->string('title', 500);
            $table->string('subtitle', 500)->nullable();
            $table->string('category', 200);
            $table->string('poster_type', 200);
            $table->string('topic', 200)->nullable();
            $table->text('description')->nullable();

            // Content fields
            $table->string('headline', 500)->nullable();
            $table->string('subheadline', 500)->nullable();
            $table->text('main_body_text')->nullable();
            $table->json('bullet_points')->nullable();
            $table->string('warning_text', 1000)->nullable();
            $table->string('call_to_action', 500)->nullable();
            $table->string('footer_text', 500)->nullable();
            $table->string('quote_or_slogan', 500)->nullable();

            // Design settings
            $table->unsignedInteger('template_id')->nullable();
            $table->string('layout_type', 100)->nullable();
            $table->enum('orientation', ['Portrait', 'Landscape'])->default('Portrait');
            $table->string('theme_key', 50)->nullable();
            $table->string('background_color', 20)->nullable();
            $table->string('accent_color', 20)->nullable();
            $table->string('font_style', 100)->nullable();
            $table->enum('font_size', ['Small', 'Medium', 'Large', 'Extra Large'])->default('Medium');
            $table->enum('text_alignment', ['Left', 'Center', 'Right'])->default('Center');
            $table->string('print_size', 50)->default('A4');

            // Classification
            $table->string('target_audience', 255)->nullable();
            $table->enum('priority', ['Low', 'Medium', 'High', 'Critical'])->default('Medium');
            $table->string('language', 50)->default('English');
            $table->string('site', 255)->nullable();
            $table->string('project', 255)->nullable();
            $table->string('area', 200)->nullable();
            $table->string('zone', 200)->nullable();
            $table->string('department', 200)->nullable();
            $table->string('contractor_name', 200)->nullable();

            // Status & lifecycle
            $table->enum('status', ['Draft', 'Under Review', 'Approved', 'Published', 'Archived'])->default('Draft');
            $table->string('version', 20)->default('v1.0');
            $table->date('effective_date')->nullable();
            $table->date('expiry_date')->nullable();

            // Ownership
            $table->char('created_by', 36)->nullable();
            $table->string('reviewed_by', 255)->nullable();
            $table->string('approved_by', 255)->nullable();
            $table->string('published_by', 255)->nullable();
            $table->timestamp('published_at')->nullable();
            $table->char('updated_by', 36)->nullable();

            // Media paths
            $table->string('main_image_path', 1000)->nullable();
            $table->string('secondary_image_path', 1000)->nullable();
            $table->string('background_image_path', 1000)->nullable();
            $table->string('company_logo_path', 1000)->nullable();
            $table->text('qr_code_data')->nullable();

            // Output files
            $table->string('preview_file_path', 1000)->nullable();
            $table->string('pdf_file_path', 1000)->nullable();
            $table->string('image_file_path', 1000)->nullable();

            // Usage tracking
            $table->integer('view_count')->default(0);
            $table->integer('download_count')->default(0);
            $table->integer('print_count')->default(0);
            $table->integer('share_count')->default(0);
            $table->timestamp('last_used_at')->nullable();
            $table->text('usage_notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('category', 'idx_pst_category');
            $table->index('poster_type', 'idx_pst_type');
            $table->index('topic', 'idx_pst_topic');
            $table->index('status', 'idx_pst_status');
            $table->index('site', 'idx_pst_site');
            $table->index('template_id', 'idx_pst_template');

            $table->foreign('template_id')->references('id')->on('poster_templates')->nullOnDelete();
            // Soft FK to users (UUID) — no formal constraint to avoid type issues
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('posters');
    }
};
