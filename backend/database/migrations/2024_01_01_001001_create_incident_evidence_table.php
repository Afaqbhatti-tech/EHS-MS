<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incident_evidence', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('incident_id', 36);
            $table->string('related_type', 30)->default('report'); // report, investigation, action
            $table->char('related_id', 36)->nullable(); // links to incident_actions.id when type=action
            $table->string('file_path', 500);
            $table->string('original_name', 500)->nullable();
            $table->string('file_type', 100)->nullable();
            $table->unsignedBigInteger('file_size')->default(0);
            $table->char('uploaded_by', 36)->nullable();
            $table->string('uploaded_by_name', 255)->nullable();
            $table->timestamps();

            $table->foreign('incident_id')->references('id')->on('incidents')->onDelete('cascade');
            $table->index('incident_id');
            $table->index(['related_type', 'related_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incident_evidence');
    }
};
