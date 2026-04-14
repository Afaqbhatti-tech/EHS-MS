<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mom_point_updates', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('mom_point_id');
            $table->char('mom_id', 36);
            $table->integer('week_number');
            $table->integer('year');

            // Before / After
            $table->string('old_status', 100)->nullable();
            $table->string('new_status', 100)->nullable();
            $table->integer('old_completion')->nullable();
            $table->integer('new_completion')->nullable();

            // Update content
            $table->text('update_note');

            $table->char('updated_by', 36)->nullable();
            $table->string('updated_by_name', 255)->nullable();

            $table->timestamp('created_at')->useCurrent();
            // NO updated_at — immutable update log

            // Indexes
            $table->index('mom_point_id', 'idx_mpu_point');
            $table->index('mom_id', 'idx_mpu_mom');
            $table->index(['week_number', 'year'], 'idx_mpu_week');
            $table->index('updated_by', 'idx_mpu_by');

            // Foreign keys
            $table->foreign('mom_point_id')->references('id')->on('mom_points')->onDelete('cascade');
            $table->foreign('mom_id')->references('id')->on('moms')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mom_point_updates');
    }
};
