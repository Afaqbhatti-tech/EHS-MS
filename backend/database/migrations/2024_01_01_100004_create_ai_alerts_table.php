<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_alerts', function (Blueprint $table) {
            $table->id();
            $table->string('title', 500);
            $table->text('description');
            $table->string('alert_type', 200);
            $table->enum('severity', ['Critical', 'High', 'Medium', 'Low'])->default('High');
            $table->string('linked_module', 100)->nullable();
            $table->unsignedBigInteger('linked_record_id')->nullable();
            $table->string('linked_record_code', 100)->nullable();
            $table->string('alert_key', 500)->nullable();
            $table->timestamp('generated_at')->useCurrent();
            $table->enum('status', ['Active', 'Acknowledged', 'Resolved', 'Dismissed'])->default('Active');
            $table->char('acknowledged_by', 36)->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->boolean('auto_resolved')->default(false);
            $table->timestamps();

            $table->index('alert_type', 'idx_aa_type');
            $table->index('severity', 'idx_aa_severity');
            $table->index('status', 'idx_aa_status');
            $table->index('linked_module', 'idx_aa_module');
            $table->index('alert_key', 'idx_aa_key');
            $table->index('generated_at', 'idx_aa_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_alerts');
    }
};
