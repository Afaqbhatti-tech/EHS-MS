<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mock_drills', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('ref_number', 20)->unique();
            $table->string('drill_type', 100);
            $table->date('drill_date');
            $table->string('location', 255)->nullable();
            $table->integer('participants_count')->default(0);
            $table->integer('response_time_seconds')->nullable();
            $table->decimal('kpi_score', 5, 2)->nullable();
            $table->string('status', 30)->default('Planned');
            $table->text('findings')->nullable();
            $table->json('attachments')->nullable();
            $table->char('conducted_by', 36)->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('drill_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mock_drills');
    }
};
