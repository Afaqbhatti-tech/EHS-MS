<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mockups', function (Blueprint $table) {
            // Rename existing columns for clarity
            // title -> activity_name (keeping title as alias)
            // status -> approval_status

            // Zone & phase
            $table->string('zone', 200)->nullable()->after('area');
            $table->string('phase', 50)->nullable()->after('zone');

            // Supervisor
            $table->string('supervisor_name', 200)->nullable()->after('contractor');
            $table->char('supervisor_id', 36)->nullable()->after('supervisor_name');

            // RAMS linkage
            $table->char('rams_document_id', 36)->nullable()->after('supervisor_id');
            $table->char('rams_version_id', 36)->nullable()->after('rams_document_id');
            $table->string('rams_revision_number', 20)->nullable()->after('rams_version_id');

            // Approval workflow
            $table->string('approval_status', 50)->default('Draft')->after('status');
            $table->timestamp('submitted_at')->nullable()->after('approval_status');
            $table->char('submitted_by', 36)->nullable()->after('submitted_at');
            $table->char('reviewed_by', 36)->nullable()->after('submitted_by');
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');
            $table->char('approved_by', 36)->nullable()->after('reviewed_at');
            $table->timestamp('approved_at')->nullable()->after('approved_by');
            $table->char('rejected_by', 36)->nullable()->after('approved_at');
            $table->timestamp('rejected_at')->nullable()->after('rejected_by');
            $table->text('rejection_reason')->nullable()->after('rejected_at');

            // Comment control
            $table->boolean('has_unresolved_comments')->default(false)->after('rejection_reason');
            $table->unsignedInteger('unresolved_comment_count')->default(0)->after('has_unresolved_comments');
            $table->boolean('can_proceed')->default(false)->after('unresolved_comment_count');

            // Tags
            $table->json('tags')->nullable()->after('can_proceed');

            // Scheduling
            $table->date('planned_start_date')->nullable()->after('tags');
            $table->date('planned_end_date')->nullable()->after('planned_start_date');

            // Priority
            $table->string('priority', 20)->default('Medium')->after('planned_end_date');

            // Notes
            $table->text('notes')->nullable()->after('priority');

            // Audit
            $table->char('created_by', 36)->nullable()->after('notes');
            $table->char('updated_by', 36)->nullable()->after('created_by');
            $table->softDeletes();

            // Indexes
            $table->index('approval_status', 'idx_mkp_approval_status');
            $table->index('rams_document_id', 'idx_mkp_rams_doc');
            $table->index('zone', 'idx_mkp_zone');
            $table->index('phase', 'idx_mkp_phase');
            $table->index('can_proceed', 'idx_mkp_proceed');
            $table->index('priority', 'idx_mkp_priority');
            $table->index('submitted_at', 'idx_mkp_submitted');
        });
    }

    public function down(): void
    {
        Schema::table('mockups', function (Blueprint $table) {
            $table->dropIndex('idx_mkp_approval_status');
            $table->dropIndex('idx_mkp_rams_doc');
            $table->dropIndex('idx_mkp_zone');
            $table->dropIndex('idx_mkp_phase');
            $table->dropIndex('idx_mkp_proceed');
            $table->dropIndex('idx_mkp_priority');
            $table->dropIndex('idx_mkp_submitted');

            $table->dropSoftDeletes();
            $table->dropColumn([
                'zone', 'phase', 'supervisor_name', 'supervisor_id',
                'rams_document_id', 'rams_version_id', 'rams_revision_number',
                'approval_status', 'submitted_at', 'submitted_by',
                'reviewed_by', 'reviewed_at', 'approved_by', 'approved_at',
                'rejected_by', 'rejected_at', 'rejection_reason',
                'has_unresolved_comments', 'unresolved_comment_count', 'can_proceed',
                'tags', 'planned_start_date', 'planned_end_date',
                'priority', 'notes', 'created_by', 'updated_by',
            ]);
        });
    }
};
