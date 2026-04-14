<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('poster_logs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('poster_id');
            $table->string('action', 200);
            $table->string('from_status', 100)->nullable();
            $table->string('to_status', 100)->nullable();
            $table->char('performed_by', 36)->nullable();
            $table->string('performed_by_name', 255)->nullable();
            $table->string('performed_by_role', 100)->nullable();
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('poster_id', 'idx_plg_poster');
            $table->index('action', 'idx_plg_action');

            $table->foreign('poster_id')->references('id')->on('posters')->cascadeOnDelete();
            // Soft FK to users (UUID)
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('poster_logs');
    }
};
