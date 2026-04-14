<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_recommendations', function (Blueprint $table) {
            $table->id();
            $table->string('title', 500);
            $table->text('description');
            $table->string('recommendation_type', 200);
            $table->enum('priority', ['Critical', 'High', 'Medium', 'Low'])->default('Medium');
            $table->string('linked_module', 100)->nullable();
            $table->unsignedBigInteger('linked_record_id')->nullable();
            $table->string('linked_record_code', 100)->nullable();
            $table->unsignedBigInteger('linked_insight_id')->nullable();
            $table->text('action_suggestion')->nullable();
            $table->text('expected_outcome')->nullable();
            $table->timestamp('generated_at')->useCurrent();
            $table->char('generated_by_user', 36)->nullable();
            $table->enum('status', ['Pending', 'Accepted', 'In Progress', 'Completed', 'Dismissed'])->default('Pending');
            $table->char('accepted_by', 36)->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->text('completion_notes')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('linked_insight_id')
                  ->references('id')->on('ai_insights')
                  ->onDelete('set null');

            $table->index('recommendation_type', 'idx_ar_type');
            $table->index('priority', 'idx_ar_priority');
            $table->index('status', 'idx_ar_status');
            $table->index('linked_module', 'idx_ar_module');
            $table->index('linked_insight_id', 'idx_ar_insight');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_recommendations');
    }
};
