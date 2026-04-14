<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mock_drill_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('mock_drill_id')->nullable();
            $table->unsignedBigInteger('erp_id')->nullable();
            $table->string('log_type', 10);
            $table->string('action', 200);
            $table->string('from_status', 100)->nullable();
            $table->string('to_status', 100)->nullable();
            $table->text('description')->nullable();
            $table->char('performed_by', 36)->nullable();
            $table->string('performed_by_name', 255)->nullable();
            $table->string('performed_by_role', 100)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('mock_drill_id');
            $table->index('erp_id');
            $table->index('action');
            $table->foreign('mock_drill_id')->references('id')->on('mock_drills')->cascadeOnDelete();
            $table->foreign('erp_id')->references('id')->on('erps')->cascadeOnDelete();
            $table->foreign('performed_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mock_drill_logs');
    }
};
