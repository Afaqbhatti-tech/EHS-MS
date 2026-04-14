<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('environmental_incidents', function (Blueprint $table) {
            $table->id();
            $table->string('incident_code', 30)->unique();
            $table->string('incident_type', 200);
            $table->date('incident_date');
            $table->time('incident_time')->nullable();
            $table->string('location', 255)->nullable();
            $table->string('area', 200)->nullable();
            $table->string('zone', 200)->nullable();
            $table->text('description');
            $table->text('environmental_impact')->nullable();
            $table->enum('severity', ['Low', 'Medium', 'High', 'Critical'])->default('Medium');
            $table->text('immediate_action')->nullable();
            $table->text('root_cause')->nullable();
            $table->text('contributing_factors')->nullable();
            $table->string('reported_by', 255)->nullable();
            $table->char('reported_by_id', 36)->nullable();
            $table->string('assigned_to', 255)->nullable();
            $table->char('assigned_to_id', 36)->nullable();
            $table->unsignedBigInteger('linked_incident_id')->nullable();
            $table->enum('status', ['Reported', 'Under Investigation', 'Action Assigned', 'In Progress', 'Closed', 'Reopened'])->default('Reported');
            $table->json('evidence_paths')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->char('closed_by', 36)->nullable();
            $table->text('notes')->nullable();
            $table->char('created_by', 36)->nullable();
            $table->char('updated_by', 36)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('incident_type', 'idx_einc_type');
            $table->index('severity', 'idx_einc_severity');
            $table->index('status', 'idx_einc_status');
            $table->index('incident_date', 'idx_einc_date');

            $table->foreign('reported_by_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('assigned_to_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('closed_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('environmental_incidents');
    }
};
