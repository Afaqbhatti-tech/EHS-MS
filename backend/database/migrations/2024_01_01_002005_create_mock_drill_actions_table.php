<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mock_drill_actions', function (Blueprint $table) {
            $table->id();
            $table->string('action_code', 30)->unique();
            $table->unsignedBigInteger('mock_drill_id');
            $table->unsignedBigInteger('observation_id')->nullable();
            $table->string('title', 500);
            $table->text('description')->nullable();
            $table->string('assigned_to', 255)->nullable();
            $table->char('assigned_to_id', 36)->nullable();
            $table->date('due_date')->nullable();
            $table->string('priority', 20)->default('Medium');
            $table->string('status', 20)->default('Open');
            $table->text('completion_notes')->nullable();
            $table->string('evidence_path', 1000)->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->char('closed_by', 36)->nullable();
            $table->char('created_by', 36)->nullable();
            $table->char('updated_by', 36)->nullable();
            $table->timestamps();

            $table->index('mock_drill_id');
            $table->index('observation_id');
            $table->index('status');
            $table->index('due_date');
            $table->index('assigned_to_id');
            $table->foreign('mock_drill_id')->references('id')->on('mock_drills')->cascadeOnDelete();
            $table->foreign('observation_id')->references('id')->on('mock_drill_observations')->nullOnDelete();
            $table->foreign('assigned_to_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mock_drill_actions');
    }
};
