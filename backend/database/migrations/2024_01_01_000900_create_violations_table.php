<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('violations', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('violation_code', 20)->unique();

            // Basic info
            $table->date('violation_date');
            $table->string('violation_time', 10)->nullable();
            $table->string('location', 255)->nullable();
            $table->string('area', 255)->nullable();
            $table->string('department', 255)->nullable();

            // Person involved
            $table->string('violator_name', 255);
            $table->string('employee_id', 100)->nullable();
            $table->string('designation', 255)->nullable();
            $table->string('contractor_name', 255)->nullable();

            // Violation details
            $table->string('violation_type', 50); // Routine, Situational, Exceptional
            $table->string('violation_category', 100); // PPE, Work at Height, etc.
            $table->text('description');
            $table->text('violated_rule')->nullable();
            $table->text('hazard_description')->nullable();

            // Severity
            $table->string('severity', 20)->default('Medium'); // Low, Medium, High, Critical

            // Immediate action
            $table->string('immediate_action', 100)->nullable();
            $table->text('immediate_action_notes')->nullable();

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
            $table->text('root_cause')->nullable();
            $table->string('root_cause_category', 100)->nullable();
            $table->boolean('intentional')->nullable();
            $table->boolean('system_failure')->nullable();
            $table->text('investigation_notes')->nullable();

            // Status workflow
            $table->string('status', 30)->default('Open');

            // Closure
            $table->char('closed_by', 36)->nullable();
            $table->string('closed_by_name', 255)->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->text('close_notes')->nullable();

            // Metadata
            $table->text('remarks')->nullable();
            $table->json('photos')->nullable();

            // Soft delete
            $table->string('deleted_by', 255)->nullable();
            $table->softDeletes();
            $table->timestamps();

            // Indexes
            $table->index('violation_code');
            $table->index(['status', 'severity', 'violation_date']);
            $table->index('violation_category');
            $table->index('contractor_name');
            $table->index('assigned_to');
            $table->index('reported_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('violations');
    }
};
