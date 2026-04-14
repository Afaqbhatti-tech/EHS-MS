<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Extend existing permit_amendments table ────────────────
        Schema::table('permit_amendments', function (Blueprint $table) {
            $table->string('amendment_code', 30)->unique()->nullable()->after('ref_number');
            $table->integer('revision_number')->default(1)->after('permit_id');
            $table->string('amendment_title', 500)->nullable()->after('revision_number');
            $table->string('amendment_type', 100)->nullable()->after('amendment_title');
            $table->string('amendment_category', 20)->default('Minor')->after('amendment_type');
            $table->text('reason')->nullable()->after('amendment_category');
            $table->string('priority', 20)->default('Medium')->after('reason');

            // Overhaul status to new enum set (existing 'status' column stays, we just allow new values)
            // No need to alter existing column type since it's varchar(30)

            // Requestor fields
            $table->char('requested_by_id', 36)->nullable()->after('requested_by');
            $table->date('request_date')->nullable()->after('requested_by_id');

            // Scheduling
            $table->date('effective_from')->nullable()->after('request_date');
            $table->date('effective_to')->nullable()->after('effective_from');

            // Review / Approval fields
            $table->string('reviewed_by', 255)->nullable()->after('effective_to');
            $table->char('reviewed_by_id', 36)->nullable()->after('reviewed_by');
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by_id');
            $table->text('approval_comments')->nullable()->after('reviewed_at');
            $table->text('conditions')->nullable()->after('approval_comments');

            // Rejection fields
            $table->string('rejected_by', 255)->nullable()->after('conditions');
            $table->char('rejected_by_id', 36)->nullable()->after('rejected_by');
            $table->timestamp('rejected_at')->nullable()->after('rejected_by_id');
            $table->text('rejection_reason')->nullable()->after('rejected_at');

            // Revision control
            $table->boolean('is_active_revision')->default(false)->after('rejection_reason');
            $table->char('superseded_by_id', 36)->nullable()->after('is_active_revision');

            // Major change warning
            $table->boolean('is_major_change_flagged')->default(false)->after('superseded_by_id');
            $table->text('major_change_note')->nullable()->after('is_major_change_flagged');

            // Denormalized permit context snapshots
            $table->string('permit_number_snapshot', 100)->nullable()->after('major_change_note');
            $table->string('permit_type_snapshot', 200)->nullable()->after('permit_number_snapshot');
            $table->string('permit_area_snapshot', 200)->nullable()->after('permit_type_snapshot');

            // Misc
            $table->text('notes')->nullable()->after('permit_area_snapshot');
            $table->char('created_by', 36)->nullable()->after('notes');
            $table->char('updated_by', 36)->nullable()->after('created_by');
            $table->softDeletes()->after('updated_at');

            // Indexes
            $table->index('amendment_type', 'idx_amd_type');
            $table->index('amendment_category', 'idx_amd_category');
            $table->index(['permit_id', 'revision_number'], 'idx_amd_revision');
            $table->index('is_active_revision', 'idx_amd_active');
            $table->index('requested_by_id', 'idx_amd_requested');
            $table->index('effective_from', 'idx_amd_effective');
        });

        // ── 2. Create permit_amendment_changes ────────────────────────
        Schema::create('permit_amendment_changes', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('amendment_id', 36);
            $table->integer('change_order')->default(1);
            $table->string('change_category', 50)->default('Permit Basics');
            $table->string('field_name', 255);
            $table->text('old_value')->nullable();
            $table->text('new_value')->nullable();
            $table->text('change_reason')->nullable();
            $table->boolean('is_major_trigger')->default(false);
            $table->timestamps();

            $table->foreign('amendment_id')->references('id')->on('permit_amendments')->onDelete('cascade');
            $table->index('amendment_id', 'idx_amc_amendment');
            $table->index('change_category', 'idx_amc_category');
        });

        // ── 3. Create permit_amendment_attachments ────────────────────
        Schema::create('permit_amendment_attachments', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('amendment_id', 36);
            $table->string('file_path', 1000);
            $table->string('original_name', 500)->nullable();
            $table->string('file_type', 50)->nullable();
            $table->integer('file_size_kb')->nullable();
            $table->string('attachment_category', 100)->default('Other');
            $table->string('caption', 500)->nullable();
            $table->char('uploaded_by', 36)->nullable();
            $table->string('uploaded_by_name', 255)->nullable();
            $table->timestamp('created_at')->nullable();

            $table->foreign('amendment_id')->references('id')->on('permit_amendments')->onDelete('cascade');
            $table->index('amendment_id', 'idx_ama_amendment');
        });

        // ── 4. Create permit_amendment_logs ────────────────────────────
        Schema::create('permit_amendment_logs', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('amendment_id', 36);
            $table->char('permit_id', 36)->nullable();
            $table->string('action', 200);
            $table->string('from_status', 100)->nullable();
            $table->string('to_status', 100)->nullable();
            $table->char('performed_by', 36)->nullable();
            $table->string('performed_by_name', 255)->nullable();
            $table->string('performed_by_role', 100)->nullable();
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->foreign('amendment_id')->references('id')->on('permit_amendments')->onDelete('cascade');
            $table->foreign('permit_id')->references('id')->on('permits')->onDelete('cascade');
            $table->index('amendment_id', 'idx_pal_amendment');
            $table->index('permit_id', 'idx_pal_permit');
            $table->index('action', 'idx_pal_action');
        });

        // ── 5. Add amendment tracking columns to permits table ────────
        Schema::table('permits', function (Blueprint $table) {
            $table->integer('current_revision_number')->default(0)->after('status');
            $table->boolean('has_active_amendment')->default(false)->after('current_revision_number');
            $table->integer('amendment_count')->default(0)->after('has_active_amendment');
        });
    }

    public function down(): void
    {
        Schema::table('permits', function (Blueprint $table) {
            $table->dropColumn(['current_revision_number', 'has_active_amendment', 'amendment_count']);
        });

        Schema::dropIfExists('permit_amendment_logs');
        Schema::dropIfExists('permit_amendment_attachments');
        Schema::dropIfExists('permit_amendment_changes');

        Schema::table('permit_amendments', function (Blueprint $table) {
            $table->dropIndex('idx_amd_type');
            $table->dropIndex('idx_amd_category');
            $table->dropIndex('idx_amd_revision');
            $table->dropIndex('idx_amd_active');
            $table->dropIndex('idx_amd_requested');
            $table->dropIndex('idx_amd_effective');
            $table->dropSoftDeletes();
            $table->dropColumn([
                'amendment_code', 'revision_number', 'amendment_title',
                'amendment_type', 'amendment_category', 'reason', 'priority',
                'requested_by_id', 'request_date', 'effective_from', 'effective_to',
                'reviewed_by', 'reviewed_by_id', 'reviewed_at',
                'approval_comments', 'conditions',
                'rejected_by', 'rejected_by_id', 'rejected_at', 'rejection_reason',
                'is_active_revision', 'superseded_by_id',
                'is_major_change_flagged', 'major_change_note',
                'permit_number_snapshot', 'permit_type_snapshot', 'permit_area_snapshot',
                'notes', 'created_by', 'updated_by',
            ]);
        });
    }
};
