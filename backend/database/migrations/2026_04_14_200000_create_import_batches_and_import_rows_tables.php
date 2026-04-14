<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('import_batches', function (Blueprint $table) {
            $table->id();
            $table->string('batch_code', 30)->unique();
            $table->string('module', 100);
            $table->char('uploaded_by', 36)->nullable();
            $table->string('original_filename', 500)->nullable();
            $table->string('file_path', 1000)->nullable();
            $table->unsignedInteger('file_size_kb')->nullable();

            // Parse results
            $table->unsignedInteger('total_rows')->default(0);
            $table->unsignedInteger('parsed_rows')->default(0);
            $table->unsignedInteger('parse_errors')->default(0);

            // Classification counts
            $table->unsignedInteger('new_count')->default(0);
            $table->unsignedInteger('update_count')->default(0);
            $table->unsignedInteger('duplicate_count')->default(0);
            $table->unsignedInteger('conflict_count')->default(0);
            $table->unsignedInteger('error_count')->default(0);
            $table->unsignedInteger('intra_file_dup_count')->default(0);

            // Sync results (after confirmation)
            $table->unsignedInteger('created_count')->default(0);
            $table->unsignedInteger('updated_count')->default(0);
            $table->unsignedInteger('skipped_count')->default(0);
            $table->unsignedInteger('conflicts_held')->default(0);

            // Status
            $table->enum('status', [
                'uploading', 'parsing', 'preview_ready',
                'confirmed', 'syncing', 'completed',
                'failed', 'cancelled',
            ])->default('uploading');

            $table->text('parse_error_message')->nullable();

            // Timing
            $table->timestamp('parsed_at')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->char('confirmed_by', 36)->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();

            // Foreign keys
            $table->foreign('uploaded_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('confirmed_by')->references('id')->on('users')->nullOnDelete();

            // Indexes
            $table->index('module', 'idx_ib_module');
            $table->index('status', 'idx_ib_status');
            $table->index('uploaded_by', 'idx_ib_user');
        });

        Schema::create('import_rows', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('batch_id');
            $table->unsignedInteger('row_number');

            // Raw extracted data
            $table->json('raw_data');

            // Match result
            $table->enum('classification', [
                'new', 'update', 'duplicate',
                'conflict', 'error', 'intra_file_dup',
            ]);

            $table->string('match_type', 100)->nullable();
            $table->enum('match_confidence', [
                'strong', 'moderate', 'weak', 'none',
            ])->default('none');

            $table->unsignedBigInteger('matched_record_id')->nullable();
            $table->string('matched_record_uuid', 36)->nullable();
            $table->string('matched_record_code', 100)->nullable();

            // Field-level analysis
            $table->json('fields_to_fill')->nullable();
            $table->json('fields_conflicting')->nullable();
            $table->json('fields_identical')->nullable();

            // Conflict / review info
            $table->text('conflict_reason')->nullable();
            $table->text('review_notes')->nullable();

            // Sync result (set after confirmation)
            $table->enum('sync_action', [
                'created', 'updated', 'skipped',
                'held', 'error', 'pending',
            ])->default('pending');

            $table->text('sync_error')->nullable();
            $table->unsignedBigInteger('synced_record_id')->nullable();
            $table->string('synced_record_uuid', 36)->nullable();
            $table->timestamp('synced_at')->nullable();

            $table->timestamp('created_at')->useCurrent();

            // Foreign key
            $table->foreign('batch_id')->references('id')->on('import_batches')->cascadeOnDelete();

            // Indexes
            $table->index('batch_id', 'idx_ir_batch');
            $table->index('classification', 'idx_ir_classification');
            $table->index('matched_record_id', 'idx_ir_matched');
            $table->index('sync_action', 'idx_ir_sync');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('import_rows');
        Schema::dropIfExists('import_batches');
    }
};
