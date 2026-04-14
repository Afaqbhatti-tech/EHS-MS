<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mock_drill_evaluations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('mock_drill_id')->unique();
            $table->string('overall_result', 40)->nullable();
            $table->integer('response_time_score')->nullable();
            $table->integer('communication_score')->nullable();
            $table->integer('team_coordination_score')->nullable();
            $table->integer('equipment_readiness_score')->nullable();
            $table->integer('erp_compliance_score')->nullable();
            $table->integer('participation_score')->nullable();
            $table->decimal('final_score', 5, 2)->nullable();
            $table->string('final_rating', 30)->nullable();
            $table->string('drill_effectiveness', 40)->nullable();
            $table->text('strengths')->nullable();
            $table->text('weaknesses')->nullable();
            $table->text('recommendations')->nullable();
            $table->text('overall_notes')->nullable();
            $table->string('evaluated_by', 255)->nullable();
            $table->char('evaluated_by_id', 36)->nullable();
            $table->timestamp('evaluated_at')->nullable();
            $table->timestamps();

            $table->foreign('mock_drill_id')->references('id')->on('mock_drills')->cascadeOnDelete();
            $table->foreign('evaluated_by_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mock_drill_evaluations');
    }
};
