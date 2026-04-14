<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mock_drill_observations', function (Blueprint $table) {
            $table->id();
            $table->string('obs_code', 30)->unique();
            $table->unsignedBigInteger('mock_drill_id');
            $table->string('title', 500);
            $table->text('description')->nullable();
            $table->string('observation_type', 20)->default('Negative');
            $table->string('category', 60)->default('Other');
            $table->string('severity', 20)->default('Medium');
            $table->string('reported_by', 255)->nullable();
            $table->char('reported_by_id', 36)->nullable();
            $table->json('photo_paths')->nullable();
            $table->string('file_path', 1000)->nullable();
            $table->text('notes')->nullable();
            $table->char('created_by', 36)->nullable();
            $table->timestamps();

            $table->index('mock_drill_id');
            $table->index('observation_type');
            $table->index('severity');
            $table->foreign('mock_drill_id')->references('id')->on('mock_drills')->cascadeOnDelete();
            $table->foreign('reported_by_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mock_drill_observations');
    }
};
