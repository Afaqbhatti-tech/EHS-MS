<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── TABLE 1: dc_documents ────────────────────────────
        Schema::create('dc_documents', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('document_code', 30)->unique();
            $table->string('document_number', 200)->nullable();
            $table->string('document_title', 1000);
            $table->string('short_title', 300)->nullable();
            $table->string('document_type', 200);
            $table->string('document_category', 200)->nullable();
            $table->text('description')->nullable();

            // Ownership
            $table->string('department', 200)->nullable();
            $table->string('owner', 255)->nullable();
            $table->char('owner_id', 36)->nullable();
            $table->string('prepared_by', 255)->nullable();
            $table->string('responsible_person', 255)->nullable();

            // Scope
            $table->string('site', 255)->nullable();
            $table->string('project', 255)->nullable();
            $table->string('area', 200)->nullable();
            $table->string('zone', 200)->nullable();
            $table->unsignedBigInteger('contractor_id')->nullable();
            $table->string('contractor_name', 255)->nullable();

            // Control
            $table->enum('confidentiality_level', ['Public', 'Internal', 'Restricted', 'Confidential', 'Top Secret'])->default('Internal');
            $table->enum('priority', ['Critical', 'High', 'Medium', 'Low'])->default('Medium');
            $table->string('language', 100)->default('English');
            $table->json('tags')->nullable();

            // Status
            $table->string('status', 50)->default('Draft');

            // Denormalized from active revision
            $table->unsignedBigInteger('active_revision_id')->nullable();
            $table->string('current_revision_number', 20)->nullable();
            $table->date('next_review_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->boolean('is_overdue_review')->default(false);
            $table->boolean('is_expired')->default(false);
            $table->boolean('is_expiring_soon')->default(false);

            // Audit
            $table->char('created_by', 36)->nullable();
            $table->char('updated_by', 36)->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('document_type', 'idx_dcd_type');
            $table->index('document_category', 'idx_dcd_category');
            $table->index('status', 'idx_dcd_status');
            $table->index('department', 'idx_dcd_dept');
            $table->index('owner_id', 'idx_dcd_owner');
            $table->index('contractor_id', 'idx_dcd_contractor');
            $table->index('next_review_date', 'idx_dcd_review');
            $table->index('expiry_date', 'idx_dcd_expiry');
            $table->index('is_expired', 'idx_dcd_expired');
            $table->index('is_overdue_review', 'idx_dcd_overdue');
        });

        // ── TABLE 2: dc_revisions ────────────────────────────
        Schema::create('dc_revisions', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('document_id');
            $table->string('revision_number', 20);
            $table->string('version_label', 50)->nullable();
            $table->string('status', 50)->default('Draft');
            $table->boolean('is_active')->default(false);

            // Dates
            $table->date('issue_date')->nullable();
            $table->date('effective_date')->nullable();
            $table->date('next_review_date')->nullable();
            $table->date('expiry_date')->nullable();

            // Change management
            $table->text('change_summary')->nullable();
            $table->text('reason_for_revision')->nullable();

            // File
            $table->string('file_path', 1000)->nullable();
            $table->string('original_name', 500)->nullable();
            $table->string('file_type', 50)->nullable();
            $table->integer('file_size_kb')->nullable();

            // Workflow timestamps
            $table->timestamp('submitted_for_review_at')->nullable();
            $table->char('submitted_by', 36)->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->string('approved_by', 255)->nullable();
            $table->char('approved_by_id', 36)->nullable();
            $table->timestamp('activated_at')->nullable();

            // Notes
            $table->text('notes')->nullable();

            // Audit
            $table->char('created_by', 36)->nullable();
            $table->char('updated_by', 36)->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('document_id')->references('id')->on('dc_documents')->onDelete('cascade');

            // Indexes
            $table->index('document_id', 'idx_dcr_document');
            $table->index('status', 'idx_dcr_status');
            $table->index('is_active', 'idx_dcr_active');
            $table->index('next_review_date', 'idx_dcr_review');
            $table->index('expiry_date', 'idx_dcr_expiry');
        });

        // ── TABLE 3: dc_reviews ──────────────────────────────
        Schema::create('dc_reviews', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('document_revision_id');
            $table->unsignedBigInteger('document_id');
            $table->char('reviewer_id', 36)->nullable();
            $table->string('reviewer_name', 255)->nullable();
            $table->string('reviewer_role', 200)->nullable();
            $table->enum('review_status', ['Pending', 'Approved', 'Approved with Comments', 'Rejected'])->default('Pending');
            $table->text('review_comments')->nullable();
            $table->string('review_party', 200)->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->date('due_date')->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('document_revision_id')->references('id')->on('dc_revisions')->onDelete('cascade');
            $table->foreign('document_id')->references('id')->on('dc_documents')->onDelete('cascade');

            // Indexes
            $table->index('document_revision_id', 'idx_dcrev_revision');
            $table->index('document_id', 'idx_dcrev_document');
            $table->index('reviewer_id', 'idx_dcrev_reviewer');
            $table->index('review_status', 'idx_dcrev_status');
        });

        // ── TABLE 4: dc_approvals ────────────────────────────
        Schema::create('dc_approvals', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('document_revision_id');
            $table->unsignedBigInteger('document_id');
            $table->char('approver_id', 36)->nullable();
            $table->string('approver_name', 255)->nullable();
            $table->string('approver_role', 200)->nullable();
            $table->enum('approval_status', ['Pending', 'Approved', 'Approved with Comments', 'Rejected'])->default('Pending');
            $table->text('approval_comments')->nullable();
            $table->string('approval_party', 200)->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->date('due_date')->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('document_revision_id')->references('id')->on('dc_revisions')->onDelete('cascade');
            $table->foreign('document_id')->references('id')->on('dc_documents')->onDelete('cascade');

            // Indexes
            $table->index('document_revision_id', 'idx_dcapp_revision');
            $table->index('document_id', 'idx_dcapp_document');
            $table->index('approver_id', 'idx_dcapp_approver');
            $table->index('approval_status', 'idx_dcapp_status');
        });

        // ── TABLE 5: dc_links ────────────────────────────────
        Schema::create('dc_links', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('document_id');
            $table->unsignedBigInteger('document_revision_id')->nullable();
            $table->string('linked_module', 100);
            $table->string('linked_id', 36);
            $table->string('linked_code', 100)->nullable();
            $table->string('linked_title', 500)->nullable();
            $table->text('link_notes')->nullable();
            $table->char('created_by', 36)->nullable();
            $table->timestamp('created_at')->nullable();

            // Foreign keys
            $table->foreign('document_id')->references('id')->on('dc_documents')->onDelete('cascade');
            $table->foreign('document_revision_id')->references('id')->on('dc_revisions')->onDelete('set null');

            // Indexes
            $table->index('document_id', 'idx_dcl_document');
            $table->index(['linked_module', 'linked_id'], 'idx_dcl_module');
            $table->index('document_revision_id', 'idx_dcl_revision');
        });

        // ── TABLE 6: dc_logs ─────────────────────────────────
        Schema::create('dc_logs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('document_id');
            $table->unsignedBigInteger('document_revision_id')->nullable();
            $table->string('action', 200);
            $table->string('from_status', 100)->nullable();
            $table->string('to_status', 100)->nullable();
            $table->char('performed_by', 36)->nullable();
            $table->string('performed_by_name', 255)->nullable();
            $table->string('performed_by_role', 100)->nullable();
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->nullable();

            // Foreign keys
            $table->foreign('document_id')->references('id')->on('dc_documents')->onDelete('cascade');
            $table->foreign('document_revision_id')->references('id')->on('dc_revisions')->onDelete('set null');

            // Indexes
            $table->index('document_id', 'idx_dclog_document');
            $table->index('document_revision_id', 'idx_dclog_revision');
            $table->index('action', 'idx_dclog_action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dc_logs');
        Schema::dropIfExists('dc_links');
        Schema::dropIfExists('dc_approvals');
        Schema::dropIfExists('dc_reviews');
        Schema::dropIfExists('dc_revisions');
        Schema::dropIfExists('dc_documents');
    }
};
