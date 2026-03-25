<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rams_document_versions', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('rams_document_id', 36);
            $table->unsignedInteger('version_number');
            $table->string('file_path', 500);
            $table->string('file_name', 255);
            $table->unsignedBigInteger('file_size')->default(0);
            $table->string('mime_type', 100)->default('application/pdf');
            $table->char('uploaded_by', 36)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('rams_document_id')->references('id')->on('rams_documents')->onDelete('cascade');
            $table->index('rams_document_id');
            $table->unique(['rams_document_id', 'version_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rams_document_versions');
    }
};
