<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('environmental_inspections', function (Blueprint $table) {
            $table->id();
            $table->string('inspection_code', 30)->unique();
            $table->string('inspection_type', 200);
            $table->string('site', 255)->nullable();
            $table->string('area', 200)->nullable();
            $table->string('zone', 200)->nullable();
            $table->string('department', 200)->nullable();
            $table->date('inspection_date');
            $table->string('inspector_name', 255);
            $table->char('inspector_id', 36)->nullable();
            $table->text('findings_summary')->nullable();
            $table->enum('compliance_status', ['Compliant', 'Partially Compliant', 'Non-Compliant'])->default('Compliant');
            $table->integer('non_compliance_count')->default(0);
            $table->text('positive_findings')->nullable();
            $table->text('recommendations')->nullable();
            $table->json('photo_paths')->nullable();
            $table->string('report_path', 1000)->nullable();
            $table->date('follow_up_date')->nullable();
            $table->enum('status', ['Open', 'Closed', 'Action Required'])->default('Open');
            $table->text('notes')->nullable();
            $table->char('created_by', 36)->nullable();
            $table->char('updated_by', 36)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('inspection_type', 'idx_einsp_type');
            $table->index('compliance_status', 'idx_einsp_compliance');
            $table->index('inspection_date', 'idx_einsp_date');
            $table->index('status', 'idx_einsp_status');

            $table->foreign('inspector_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('environmental_inspections');
    }
};
