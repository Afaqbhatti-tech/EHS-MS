<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checklist_inspections', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('inspection_code', 30)->unique();
            $table->char('checklist_item_id', 36);
            $table->unsignedBigInteger('category_id');
            $table->date('inspection_date');
            $table->string('inspection_type', 30)->default('Internal');
            $table->string('inspector_name', 255);
            $table->string('inspector_company', 200)->nullable();
            $table->string('overall_result', 30);
            $table->string('health_condition_found', 30)->default('Good');
            $table->text('findings')->nullable();
            $table->text('corrective_actions')->nullable();
            $table->date('next_inspection_date')->nullable();
            $table->boolean('certificate_issued')->default(false);
            $table->string('certificate_number', 200)->nullable();
            $table->date('certificate_expiry')->nullable();
            $table->string('image_path', 1000)->nullable();
            $table->json('additional_images')->nullable();
            $table->string('signature', 500)->nullable();
            $table->text('notes')->nullable();
            $table->char('recorded_by', 36)->nullable();
            $table->char('deleted_by', 36)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('checklist_item_id');
            $table->index('inspection_date');
            $table->index('overall_result');
            $table->index('inspection_type');
            $table->index('category_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checklist_inspections');
    }
};
