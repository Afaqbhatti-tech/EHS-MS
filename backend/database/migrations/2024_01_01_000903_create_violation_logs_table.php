<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('violation_logs', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('violation_id', 36);
            $table->string('action_type', 50); // created, status_changed, investigation_added, action_added, action_updated, evidence_uploaded, closed, reopened, assigned, edited
            $table->text('description')->nullable();
            $table->string('old_value', 255)->nullable();
            $table->string('new_value', 255)->nullable();
            $table->json('metadata')->nullable();
            $table->char('user_id', 36)->nullable();
            $table->string('user_name', 255)->nullable();
            $table->timestamps();

            $table->index('violation_id');
            $table->index('action_type');
            $table->foreign('violation_id')->references('id')->on('violations')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('violation_logs');
    }
};
