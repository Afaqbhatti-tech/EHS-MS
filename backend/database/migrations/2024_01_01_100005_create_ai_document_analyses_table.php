<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_document_analyses', function (Blueprint $table) {
            $table->id();
            $table->char('user_id', 36)->nullable();
            $table->string('file_path', 1000);
            $table->string('original_name', 500)->nullable();
            $table->string('file_type', 50)->nullable();
            $table->integer('file_size_kb')->nullable();
            $table->string('detected_document_type', 200)->nullable();
            $table->integer('confidence_score')->nullable();
            $table->json('extracted_data')->nullable();
            $table->json('missing_fields')->nullable();
            $table->text('summary')->nullable();
            $table->string('suggested_module', 100)->nullable();
            $table->text('suggested_action')->nullable();
            $table->enum('mapping_status', ['Pending', 'Mapped', 'Dismissed'])->default('Pending');
            $table->string('linked_module', 100)->nullable();
            $table->unsignedBigInteger('linked_record_id')->nullable();
            $table->text('raw_response')->nullable();
            $table->integer('tokens_used')->nullable();
            $table->timestamps();

            $table->index('user_id', 'idx_ada_user');
            $table->index('mapping_status', 'idx_ada_status');
            $table->index('suggested_module', 'idx_ada_module');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_document_analyses');
    }
};
