<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incident_logs', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('incident_id', 36);
            $table->string('action_type', 50); // created, status_changed, investigation_added, action_added, action_updated, evidence_uploaded, closed, reopened, assigned, edited
            $table->text('description')->nullable();
            $table->string('old_value', 255)->nullable();
            $table->string('new_value', 255)->nullable();
            $table->json('metadata')->nullable();
            $table->char('user_id', 36)->nullable();
            $table->string('user_name', 255)->nullable();
            $table->timestamps();

            $table->foreign('incident_id')->references('id')->on('incidents')->onDelete('cascade');
            $table->index('incident_id');
            $table->index('action_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incident_logs');
    }
};
