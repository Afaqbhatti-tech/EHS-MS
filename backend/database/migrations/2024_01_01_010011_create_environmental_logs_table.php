<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('environmental_logs', function (Blueprint $table) {
            $table->id();
            $table->string('log_type', 100);
            $table->unsignedBigInteger('linked_id');
            $table->string('action', 200);
            $table->string('from_status', 100)->nullable();
            $table->string('to_status', 100)->nullable();
            $table->char('performed_by', 36)->nullable();
            $table->string('performed_by_name', 255)->nullable();
            $table->string('performed_by_role', 100)->nullable();
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['log_type', 'linked_id'], 'idx_elog_type');
            $table->index('action', 'idx_elog_action');

            $table->foreign('performed_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('environmental_logs');
    }
};
