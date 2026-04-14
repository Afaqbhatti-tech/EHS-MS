<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_logs', function (Blueprint $table) {
            $table->id();
            $table->char('user_id', 36)->nullable();
            $table->string('user_name', 255)->nullable();
            $table->string('action_type', 200);
            $table->string('input_reference', 500)->nullable();
            $table->string('output_reference', 500)->nullable();
            $table->string('module_scope', 100)->nullable();
            $table->integer('tokens_used')->nullable();
            $table->integer('duration_ms')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('user_id', 'idx_al_user');
            $table->index('action_type', 'idx_al_action');
            $table->index('created_at', 'idx_al_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_logs');
    }
};
