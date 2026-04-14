<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incident_actions', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('incident_id', 36);
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->char('assigned_to', 36)->nullable();
            $table->string('assigned_to_name', 255)->nullable();
            $table->date('due_date')->nullable();
            $table->string('priority', 20)->default('Medium'); // Low, Medium, High
            $table->string('status', 30)->default('Pending'); // Pending, In Progress, Completed, Overdue
            $table->text('completion_notes')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->char('completed_by', 36)->nullable();
            $table->string('completed_by_name', 255)->nullable();
            $table->char('created_by', 36)->nullable();
            $table->timestamps();

            $table->foreign('incident_id')->references('id')->on('incidents')->onDelete('cascade');
            $table->index('incident_id');
            $table->index(['status', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incident_actions');
    }
};
