<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('erps', function (Blueprint $table) {
            $table->id();
            $table->string('erp_code', 30)->unique();
            $table->string('title', 500);
            $table->string('erp_type', 80);
            $table->string('version', 20)->nullable();
            $table->string('revision_number', 20)->nullable();
            $table->string('status', 30)->default('Draft');

            // Location
            $table->string('site', 255)->nullable();
            $table->string('project', 255)->nullable();
            $table->string('area', 200)->nullable();
            $table->string('zone', 200)->nullable();
            $table->string('department', 200)->nullable();

            // Scenario / Planning
            $table->text('scenario_description')->nullable();
            $table->text('scope')->nullable();
            $table->text('purpose')->nullable();
            $table->string('risk_level', 20)->nullable();
            $table->text('trigger_conditions')->nullable();

            // Response Structure
            $table->string('incident_controller', 255)->nullable();
            $table->string('emergency_coordinator', 255)->nullable();
            $table->json('fire_wardens')->nullable();
            $table->json('first_aiders')->nullable();
            $table->json('rescue_team')->nullable();
            $table->json('security_team')->nullable();
            $table->json('medical_team')->nullable();
            $table->json('emergency_contacts')->nullable();
            $table->text('communication_method')->nullable();
            $table->string('radio_channel', 100)->nullable();
            $table->string('alarm_method', 255)->nullable();

            // Evacuation / Response
            $table->string('assembly_point', 500)->nullable();
            $table->string('muster_point', 500)->nullable();
            $table->text('evacuation_route')->nullable();
            $table->text('response_steps')->nullable();
            $table->text('escalation_hierarchy')->nullable();

            // Equipment / Resources
            $table->json('required_equipment')->nullable();
            $table->text('equipment_locations')->nullable();
            $table->text('backup_equipment')->nullable();

            // Documentation
            $table->string('file_path', 1000)->nullable();
            $table->string('drawings_path', 1000)->nullable();
            $table->string('sop_path', 1000)->nullable();
            $table->text('notes')->nullable();

            // Lifecycle
            $table->char('created_by', 36)->nullable();
            $table->string('approved_by', 255)->nullable();
            $table->char('approved_by_id', 36)->nullable();
            $table->date('approval_date')->nullable();
            $table->string('review_frequency', 30)->nullable();
            $table->date('next_review_date')->nullable();
            $table->char('updated_by', 36)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('erp_type');
            $table->index('status');
            $table->index('site');
            $table->index('next_review_date');
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('approved_by_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('erps');
    }
};
