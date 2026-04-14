<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_imports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('file_name');
            $table->string('original_name');
            $table->string('file_type', 20); // pdf, docx, xlsx, csv, pptx, txt
            $table->string('mime_type')->nullable();
            $table->string('file_path');
            $table->unsignedBigInteger('file_size')->default(0);
            $table->string('status', 30)->default('processing'); // processing, analyzed, confirmed, failed, partial
            $table->string('document_type', 100)->nullable(); // detected: weekly_report, mom, training_sheet, permit_form, etc.
            $table->json('classification')->nullable(); // module confidence scores
            $table->longText('extracted_data')->nullable(); // full extracted/mapped data (JSON)
            $table->json('import_summary')->nullable(); // summary of what was imported
            $table->unsignedInteger('total_sections')->default(0);
            $table->unsignedInteger('total_records_created')->default(0);
            $table->unsignedInteger('total_records_updated')->default(0);
            $table->unsignedInteger('total_warnings')->default(0);
            $table->json('warnings')->nullable();
            $table->json('errors')->nullable();
            $table->uuid('imported_by')->nullable();
            $table->string('imported_by_name')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->unsignedInteger('processing_time_ms')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('document_type');
            $table->index('imported_by');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_imports');
    }
};
