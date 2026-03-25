<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('ref_number', 20)->unique();
            $table->string('title', 255);
            $table->string('document_type', 100)->nullable();
            $table->string('category', 100)->nullable();
            $table->integer('version')->default(1);
            $table->string('file_path', 500)->nullable();
            $table->string('status', 30)->default('Draft');
            $table->boolean('is_ai_generated')->default(false);
            $table->string('fft_review_status', 30)->nullable();
            $table->string('lucid_review_status', 30)->nullable();
            $table->string('src_review_status', 30)->nullable();
            $table->string('pmcm_review_status', 30)->nullable();
            $table->char('uploaded_by', 36)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('document_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
