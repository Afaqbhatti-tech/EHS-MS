<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Enhance mockups table ─────────────────────────────
        Schema::table('mockups', function (Blueprint $table) {
            $table->string('mockup_type', 50)->nullable()->after('procedure_type');
            $table->string('trim_line', 200)->nullable()->after('phase');
            $table->string('site', 200)->nullable()->after('trim_line');
            $table->string('project', 200)->nullable()->after('site');
            $table->unsignedInteger('revision_number')->default(1)->after('approval_status');
            $table->char('parent_mockup_id', 36)->nullable()->after('revision_number');
            $table->text('general_remarks')->nullable()->after('rejection_reason');
            $table->text('consultant_comments')->nullable()->after('general_remarks');
            $table->string('compliance_status', 50)->nullable()->after('consultant_comments');
            $table->date('mockup_date')->nullable()->after('planned_end_date');
            $table->time('mockup_time')->nullable()->after('mockup_date');

            $table->index('parent_mockup_id');
            $table->index('mockup_type');
            $table->index('trim_line');
            $table->index('revision_number');
            $table->index('compliance_status');
        });

        // ── mockup_personnel ──────────────────────────────────
        Schema::create('mockup_personnel', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('mockup_id', 36);
            $table->char('user_id', 36)->nullable();
            $table->string('person_name', 255);
            $table->string('designation', 200)->nullable();
            $table->string('company', 200)->nullable();
            $table->string('source_type', 20)->default('manual'); // linked | manual
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('mockup_id')->references('id')->on('mockups')->cascadeOnDelete();
            $table->index('mockup_id');
            $table->index('user_id');
        });

        // ── mockup_approvers ──────────────────────────────────
        Schema::create('mockup_approvers', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('mockup_id', 36);
            $table->string('name', 255);
            $table->string('designation', 200)->nullable();
            $table->string('approver_type', 50)->nullable(); // Client Representative, Consultant, etc.
            $table->string('approval_status', 50)->default('Pending'); // Pending, Approved, Rejected
            $table->date('approval_date')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->nullable();

            $table->foreign('mockup_id')->references('id')->on('mockups')->cascadeOnDelete();
            $table->index('mockup_id');
        });

        // ── mockup_attachments ────────────────────────────────
        Schema::create('mockup_attachments', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('mockup_id', 36);
            $table->string('attachment_type', 30)->default('general'); // approved, rejected, comments, general
            $table->string('file_path', 500);
            $table->string('original_name', 500)->nullable();
            $table->string('file_type', 100)->nullable();
            $table->unsignedBigInteger('file_size')->default(0);
            $table->char('uploaded_by', 36)->nullable();
            $table->string('uploaded_by_name', 255)->nullable();
            $table->timestamps();

            $table->foreign('mockup_id')->references('id')->on('mockups')->cascadeOnDelete();
            $table->index('mockup_id');
            $table->index('attachment_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mockup_attachments');
        Schema::dropIfExists('mockup_approvers');
        Schema::dropIfExists('mockup_personnel');

        Schema::table('mockups', function (Blueprint $table) {
            $table->dropIndex(['parent_mockup_id']);
            $table->dropIndex(['mockup_type']);
            $table->dropIndex(['trim_line']);
            $table->dropIndex(['revision_number']);
            $table->dropIndex(['compliance_status']);

            $table->dropColumn([
                'mockup_type', 'trim_line', 'site', 'project',
                'revision_number', 'parent_mockup_id',
                'general_remarks', 'consultant_comments', 'compliance_status',
                'mockup_date', 'mockup_time',
            ]);
        });
    }
};
