<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incidents', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('incident_code', 20)->unique();

            // Basic Information
            $table->date('incident_date');
            $table->string('incident_time', 10)->nullable();
            $table->string('location', 255)->nullable();
            $table->string('area', 255)->nullable();
            $table->string('department', 255)->nullable();

            // Classification
            $table->string('incident_type', 100);
            $table->string('incident_category', 100)->nullable();
            $table->text('description');
            $table->text('immediate_action')->nullable();
            $table->string('severity', 20)->default('Medium'); // Low, Medium, High, Critical

            // Person Involved
            $table->string('affected_person_name', 255)->nullable();
            $table->string('employee_id', 100)->nullable();
            $table->string('designation', 255)->nullable();
            $table->string('contractor_name', 255)->nullable();
            $table->string('contact_number', 50)->nullable();
            $table->string('supervisor_name', 255)->nullable();

            // Injury / Impact Details
            $table->string('injury_type', 255)->nullable();
            $table->string('body_part_affected', 255)->nullable();
            $table->boolean('medical_treatment_required')->default(false);
            $table->boolean('lost_time_injury')->default(false);
            $table->boolean('hospitalization')->default(false);
            $table->boolean('property_damage')->default(false);
            $table->boolean('equipment_damage')->default(false);
            $table->boolean('environmental_impact')->default(false);
            $table->decimal('financial_loss', 12, 2)->nullable();
            $table->text('incident_outcome_summary')->nullable();

            // Reporting
            $table->char('reported_by', 36)->nullable();
            $table->string('reported_by_name', 255)->nullable();

            // Assignment
            $table->char('assigned_to', 36)->nullable();
            $table->string('assigned_to_name', 255)->nullable();

            // Investigation
            $table->char('investigated_by', 36)->nullable();
            $table->string('investigated_by_name', 255)->nullable();
            $table->date('investigation_date')->nullable();
            $table->text('immediate_cause')->nullable();
            $table->text('root_cause')->nullable();
            $table->string('root_cause_category', 100)->nullable();
            $table->boolean('ppe_used')->nullable();
            $table->boolean('procedure_followed')->nullable();
            $table->boolean('supervision_adequate')->nullable();
            $table->boolean('training_adequate')->nullable();
            $table->text('witness_details')->nullable();
            $table->text('investigation_notes')->nullable();

            // Status & Closure
            $table->string('status', 30)->default('Reported');
            $table->char('closed_by', 36)->nullable();
            $table->string('closed_by_name', 255)->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->text('close_notes')->nullable();

            // Other
            $table->text('remarks')->nullable();
            $table->json('photos')->nullable();

            // Soft delete
            $table->string('deleted_by', 255)->nullable();
            $table->softDeletes();

            $table->timestamps();

            // Indexes
            $table->index(['status', 'severity', 'incident_date']);
            $table->index('incident_type');
            $table->index('incident_category');
            $table->index('contractor_name');
            $table->index('assigned_to');
            $table->index('reported_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incidents');
    }
};
