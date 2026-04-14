<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mom_points', function (Blueprint $table) {
            $table->id();

            $table->string('point_code', 30)->unique();
            $table->char('mom_id', 36);
            $table->integer('point_number');

            // Origin tracking
            $table->unsignedBigInteger('carried_from_point_id')->nullable();
            $table->char('original_mom_id', 36)->nullable();
            $table->integer('carry_count')->default(0);

            // Content
            $table->string('title', 500);
            $table->text('description')->nullable();
            $table->string('category', 50)->default('Action Required');
            $table->string('raised_by', 255)->nullable();
            $table->string('assigned_to', 255)->nullable();
            $table->char('assigned_to_id', 36)->nullable();

            // Status & Priority
            $table->string('status', 30)->default('Open');
            $table->string('priority', 20)->default('Medium');
            $table->date('due_date')->nullable();

            // Progress
            $table->integer('completion_percentage')->default(0);

            // Current remarks
            $table->text('remarks')->nullable();

            // Closure
            $table->timestamp('resolved_at')->nullable();
            $table->char('resolved_by', 36)->nullable();
            $table->text('resolution_summary')->nullable();

            // Meta
            $table->boolean('is_recurring')->default(false);
            $table->char('created_by', 36)->nullable();
            $table->char('updated_by', 36)->nullable();
            $table->timestamps();

            // Indexes
            $table->index('mom_id', 'idx_mp_mom');
            $table->index('status', 'idx_mp_status');
            $table->index('assigned_to_id', 'idx_mp_assigned');
            $table->index('carried_from_point_id', 'idx_mp_carried');
            $table->index('due_date', 'idx_mp_due');
            $table->index('category', 'idx_mp_category');

            // Foreign keys
            $table->foreign('mom_id')->references('id')->on('moms')->onDelete('cascade');
            $table->foreign('carried_from_point_id')->references('id')->on('mom_points')->onDelete('set null');
            $table->foreign('original_mom_id')->references('id')->on('moms')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mom_points');
    }
};
