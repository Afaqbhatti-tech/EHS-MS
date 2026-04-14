<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('environmental_actions', function (Blueprint $table) {
            $table->id();
            $table->string('action_code', 30)->unique();
            $table->string('title', 500);
            $table->text('description')->nullable();
            $table->string('linked_type', 100)->nullable();
            $table->unsignedBigInteger('linked_id')->nullable();
            $table->string('assigned_to', 255)->nullable();
            $table->char('assigned_to_id', 36)->nullable();
            $table->date('due_date')->nullable();
            $table->enum('priority', ['Low', 'Medium', 'High', 'Critical'])->default('Medium');
            $table->enum('status', ['Open', 'In Progress', 'Completed', 'Overdue', 'Closed'])->default('Open');
            $table->text('completion_notes')->nullable();
            $table->string('evidence_path', 1000)->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->char('closed_by', 36)->nullable();
            $table->char('created_by', 36)->nullable();
            $table->char('updated_by', 36)->nullable();
            $table->timestamps();

            $table->index('status', 'idx_eact_status');
            $table->index(['linked_type', 'linked_id'], 'idx_eact_linked');
            $table->index('due_date', 'idx_eact_due');
            $table->index('assigned_to_id', 'idx_eact_assigned');

            $table->foreign('assigned_to_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('closed_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('environmental_actions');
    }
};
