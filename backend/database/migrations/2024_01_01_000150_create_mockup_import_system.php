<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mockup_import_batches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('file_name', 255);
            $table->string('original_name', 500);
            $table->string('file_type', 20);
            $table->string('file_path', 500)->nullable();
            $table->integer('total_parsed')->default(0);
            $table->integer('success_count')->default(0);
            $table->integer('failed_count')->default(0);
            $table->integer('skipped_count')->default(0);
            $table->json('errors')->nullable();
            $table->json('field_mapping')->nullable();
            $table->string('status', 30)->default('completed');
            $table->uuid('imported_by')->nullable();
            $table->string('imported_by_name', 200)->nullable();
            $table->timestamps();

            $table->index('imported_by');
            $table->index('created_at');
        });

        Schema::table('mockups', function (Blueprint $table) {
            $table->uuid('import_batch_id')->nullable()->after('updated_by');
            $table->index('import_batch_id');
        });
    }

    public function down(): void
    {
        Schema::table('mockups', function (Blueprint $table) {
            $table->dropIndex(['import_batch_id']);
            $table->dropColumn('import_batch_id');
        });

        Schema::dropIfExists('mockup_import_batches');
    }
};
