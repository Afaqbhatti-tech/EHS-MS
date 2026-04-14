<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_import_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('document_import_id');
            $table->string('target_module', 50); // mom, training, permits, observations, mockups, checklists, tracker
            $table->string('target_model', 100)->nullable(); // e.g. Mom, Permit, TrainingRecord
            $table->uuid('target_record_id')->nullable(); // ID of created/updated record
            $table->string('action', 20)->default('pending'); // pending, created, updated, skipped, failed
            $table->string('section_heading')->nullable(); // original section heading from document
            $table->json('extracted_fields')->nullable(); // raw extracted data
            $table->json('mapped_fields')->nullable(); // data mapped to model fields
            $table->decimal('confidence', 3, 2)->default(0.00); // 0.00 to 1.00
            $table->string('status', 20)->default('pending'); // pending, confirmed, created, failed, skipped
            $table->string('duplicate_of')->nullable(); // ref_number of potential duplicate
            $table->json('warnings')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->foreign('document_import_id')
                ->references('id')
                ->on('document_imports')
                ->onDelete('cascade');

            $table->index('document_import_id');
            $table->index('target_module');
            $table->index('status');
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_import_items');
    }
};
