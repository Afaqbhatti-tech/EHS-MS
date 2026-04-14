<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mockup_history', function (Blueprint $table) {
            $table->char('id', 36)->primary();

            $table->char('mockup_id', 36);

            $table->string('action', 100);
            $table->string('from_status', 100)->nullable();
            $table->string('to_status', 100)->nullable();

            $table->char('performed_by', 36)->nullable();
            $table->string('performed_by_name', 255)->nullable();
            $table->string('performed_by_role', 100)->nullable();

            $table->text('description')->nullable();
            $table->json('metadata')->nullable();

            $table->timestamp('created_at')->useCurrent();

            $table->foreign('mockup_id')->references('id')->on('mockups')->onDelete('cascade');
            $table->index('mockup_id', 'idx_mh_mockup');
            $table->index('action', 'idx_mh_action');
            $table->index('performed_by', 'idx_mh_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mockup_history');
    }
};
