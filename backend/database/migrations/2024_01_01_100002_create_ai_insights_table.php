<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_insights', function (Blueprint $table) {
            $table->id();
            $table->string('title', 500);
            $table->text('description');
            $table->string('insight_type', 200);
            $table->enum('severity', ['Critical', 'High', 'Medium', 'Low', 'Info'])->default('Medium');
            $table->string('linked_module', 100)->nullable();
            $table->unsignedBigInteger('linked_record_id')->nullable();
            $table->string('linked_record_code', 100)->nullable();
            $table->json('data_snapshot')->nullable();
            $table->enum('generated_by', ['auto', 'manual', 'scheduled'])->default('auto');
            $table->timestamp('generated_at')->useCurrent();
            $table->char('generated_by_user', 36)->nullable();
            $table->enum('status', ['Active', 'Dismissed', 'Actioned', 'Expired'])->default('Active');
            $table->timestamp('dismissed_at')->nullable();
            $table->char('dismissed_by', 36)->nullable();
            $table->text('dismiss_reason')->nullable();
            $table->timestamp('valid_until')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('insight_type', 'idx_ai_type');
            $table->index('severity', 'idx_ai_severity');
            $table->index('linked_module', 'idx_ai_module');
            $table->index('status', 'idx_ai_status');
            $table->index('generated_at', 'idx_ai_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_insights');
    }
};
