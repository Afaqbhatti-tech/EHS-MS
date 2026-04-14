<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('violation_evidence', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('violation_id', 36);
            $table->string('related_type', 30)->default('report'); // report, action, investigation
            $table->char('related_id', 36)->nullable(); // FK to violation_actions if type=action
            $table->string('file_path', 500);
            $table->string('original_name', 500)->nullable();
            $table->string('file_type', 50)->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->char('uploaded_by', 36)->nullable();
            $table->string('uploaded_by_name', 255)->nullable();
            $table->timestamps();

            $table->index('violation_id');
            $table->index(['related_type', 'related_id']);
            $table->foreign('violation_id')->references('id')->on('violations')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('violation_evidence');
    }
};
