<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_queries', function (Blueprint $table) {
            $table->id();
            $table->char('user_id', 36)->nullable();
            $table->string('user_name', 255)->nullable();
            $table->text('query_text');
            $table->string('module_scope', 100)->default('all');
            $table->json('context_data')->nullable();
            $table->text('response_text')->nullable();
            $table->enum('response_type', [
                'summary', 'trend', 'risk', 'recommendation',
                'comparison', 'alert', 'general',
            ])->default('general');
            $table->string('intent_detected', 200)->nullable();
            $table->integer('tokens_used')->nullable();
            $table->string('model_used', 100)->nullable();
            $table->enum('status', ['pending', 'completed', 'failed', 'cached'])->default('pending');
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index('user_id', 'idx_aq_user');
            $table->index('module_scope', 'idx_aq_scope');
            $table->index('status', 'idx_aq_status');
            $table->index('created_at', 'idx_aq_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_queries');
    }
};
