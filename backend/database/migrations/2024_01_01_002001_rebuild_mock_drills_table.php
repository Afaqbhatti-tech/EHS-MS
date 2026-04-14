<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('mock_drills');

        Schema::create('mock_drills', function (Blueprint $table) {
            $table->id();
            $table->string('drill_code', 30)->unique();
            $table->string('title', 500);
            $table->unsignedBigInteger('erp_id')->nullable();
            $table->string('drill_type', 80);

            // Planning
            $table->date('planned_date')->nullable();
            $table->time('planned_time')->nullable();
            $table->string('location', 255)->nullable();
            $table->string('area', 200)->nullable();
            $table->string('department', 200)->nullable();
            $table->string('responsible_person', 255)->nullable();
            $table->char('responsible_person_id', 36)->nullable();
            $table->string('conducted_by', 255)->nullable();
            $table->string('observed_by', 255)->nullable();
            $table->string('approved_by', 255)->nullable();

            // Scenario
            $table->text('scenario_description')->nullable();
            $table->string('trigger_method', 255)->nullable();
            $table->text('expected_response')->nullable();
            $table->text('actual_response')->nullable();

            // Execution Timings
            $table->dateTime('actual_start_time')->nullable();
            $table->dateTime('actual_end_time')->nullable();
            $table->integer('total_duration_minutes')->nullable();
            $table->dateTime('alarm_trigger_time')->nullable();
            $table->dateTime('first_response_time')->nullable();
            $table->integer('first_response_seconds')->nullable();
            $table->dateTime('evacuation_start_time')->nullable();
            $table->dateTime('evacuation_complete_time')->nullable();
            $table->integer('evacuation_duration_seconds')->nullable();
            $table->dateTime('muster_complete_time')->nullable();
            $table->integer('muster_duration_seconds')->nullable();
            $table->dateTime('response_complete_time')->nullable();
            $table->integer('total_response_seconds')->nullable();

            // Status
            $table->string('status', 30)->default('Planned');

            // Summary counts
            $table->integer('participant_count')->default(0);
            $table->integer('observation_count')->default(0);
            $table->integer('action_count')->default(0);
            $table->integer('open_action_count')->default(0);

            // Scheduling
            $table->string('frequency', 30)->nullable();
            $table->date('next_drill_due')->nullable();

            // Closure
            $table->timestamp('closed_at')->nullable();
            $table->char('closed_by', 36)->nullable();
            $table->text('closure_notes')->nullable();

            $table->text('notes')->nullable();
            $table->char('created_by', 36)->nullable();
            $table->char('updated_by', 36)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('erp_id');
            $table->index('drill_type');
            $table->index('status');
            $table->index('planned_date');
            $table->index('next_drill_due');
            $table->foreign('erp_id')->references('id')->on('erps')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('responsible_person_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mock_drills');
    }
};
