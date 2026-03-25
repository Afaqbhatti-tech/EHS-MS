<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('observations', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('ref_number', 20)->unique();
            $table->date('observation_date');
            $table->string('reporting_officer', 255);
            $table->string('category', 100);
            $table->string('type', 100);
            $table->string('zone', 100)->nullable();
            $table->string('phase', 100)->nullable();
            $table->string('contractor', 100)->nullable();
            $table->string('priority', 20)->default('Medium');
            $table->string('status', 30)->default('Open');
            $table->text('description')->nullable();
            $table->text('corrective_action')->nullable();
            $table->json('photos')->nullable();
            $table->char('assigned_to', 36)->nullable();
            $table->date('target_date')->nullable();
            $table->date('closed_date')->nullable();
            $table->char('closed_by', 36)->nullable();
            $table->text('close_notes')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('contractor');
            $table->index('observation_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('observations');
    }
};
