<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('environmental_objectives', function (Blueprint $table) {
            $table->id();
            $table->string('objective_code', 30)->unique();
            $table->string('title', 500);
            $table->text('description')->nullable();
            $table->string('category', 200)->nullable();
            $table->decimal('target_value', 12, 4)->nullable();
            $table->decimal('current_value', 12, 4)->nullable();
            $table->string('unit', 100)->nullable();
            $table->decimal('baseline_value', 12, 4)->nullable();
            $table->date('baseline_date')->nullable();
            $table->date('deadline')->nullable();
            $table->string('responsible_person', 255)->nullable();
            $table->char('responsible_id', 36)->nullable();
            $table->integer('progress_percentage')->default(0);
            $table->enum('status', ['Planned', 'In Progress', 'Achieved', 'Delayed', 'Closed'])->default('Planned');
            $table->text('progress_notes')->nullable();
            $table->char('created_by', 36)->nullable();
            $table->char('updated_by', 36)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status', 'idx_eobj_status');
            $table->index('category', 'idx_eobj_category');
            $table->index('deadline', 'idx_eobj_deadline');

            $table->foreign('responsible_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('environmental_objectives');
    }
};
