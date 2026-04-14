<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop old basic campaigns table (no child tables reference it yet)
        Schema::dropIfExists('campaigns');

        // ─── TABLE 1: campaigns ─────────────────────────
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('campaign_code', 30)->unique();
            $table->string('title', 500);
            $table->string('campaign_type', 200);
            $table->string('topic', 200);
            $table->text('description')->nullable();
            $table->text('objective')->nullable();

            // Time
            $table->date('start_date');
            $table->date('end_date');
            $table->integer('duration_days')->nullable();
            $table->enum('frequency', ['One-Time', 'Weekly', 'Monthly', 'Quarterly', 'Annual'])->default('One-Time');

            // Ownership (users table has char(36) UUID PK)
            $table->string('owner_name', 255)->nullable();
            $table->char('owner_id', 36)->nullable();
            $table->string('conducted_by', 255)->nullable();
            $table->string('approved_by', 255)->nullable();
            $table->char('approved_by_id', 36)->nullable();

            // Coverage
            $table->string('site', 255)->nullable();
            $table->string('project', 255)->nullable();
            $table->string('area', 200)->nullable();
            $table->string('zone', 200)->nullable();
            $table->string('department', 200)->nullable();
            $table->string('contractor_name', 200)->nullable();
            $table->text('target_audience')->nullable();
            $table->integer('expected_participants')->nullable();

            // Status
            $table->enum('status', ['Draft', 'Planned', 'Active', 'Completed', 'Closed', 'Cancelled'])->default('Draft');

            // Denormalized counts
            $table->integer('activity_count')->default(0);
            $table->integer('participant_count')->default(0);
            $table->integer('evidence_count')->default(0);
            $table->integer('action_count')->default(0);
            $table->integer('open_action_count')->default(0);
            $table->integer('completion_percentage')->default(0);

            $table->text('notes')->nullable();
            $table->char('created_by', 36)->nullable();
            $table->char('updated_by', 36)->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Foreign keys
            $table->foreign('owner_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('approved_by_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();

            // Indexes
            $table->index('campaign_type', 'idx_cmp_type');
            $table->index('topic', 'idx_cmp_topic');
            $table->index('status', 'idx_cmp_status');
            $table->index('site', 'idx_cmp_site');
            $table->index('owner_id', 'idx_cmp_owner');
            $table->index(['start_date', 'end_date'], 'idx_cmp_dates');
        });

        // ─── TABLE 2: campaign_activities ────────────────
        Schema::create('campaign_activities', function (Blueprint $table) {
            $table->id();
            $table->string('activity_code', 30)->unique();
            $table->unsignedBigInteger('campaign_id');
            $table->string('title', 500);
            $table->string('activity_type', 200);
            $table->date('activity_date');
            $table->time('activity_time')->nullable();
            $table->string('location', 255)->nullable();
            $table->string('conducted_by', 255)->nullable();
            $table->text('description')->nullable();
            $table->integer('attendance_count')->default(0);
            $table->enum('status', ['Planned', 'Conducted', 'Cancelled', 'Rescheduled'])->default('Planned');
            $table->text('notes')->nullable();
            $table->char('created_by', 36)->nullable();
            $table->timestamps();

            $table->foreign('campaign_id')->references('id')->on('campaigns')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();

            $table->index('campaign_id', 'idx_ca_campaign');
            $table->index('activity_date', 'idx_ca_date');
            $table->index('status', 'idx_ca_status');
        });

        // ─── TABLE 3: campaign_participants ──────────────
        Schema::create('campaign_participants', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('campaign_id');
            $table->unsignedBigInteger('activity_id')->nullable();
            $table->char('user_id', 36)->nullable();
            $table->string('participant_name', 255);
            $table->string('employee_id', 100)->nullable();
            $table->string('designation', 200)->nullable();
            $table->string('department', 200)->nullable();
            $table->string('company', 200)->nullable();
            $table->enum('attendance_status', ['Present', 'Absent', 'Late', 'Excused'])->default('Present');
            $table->enum('participation_type', ['Attendee', 'Speaker', 'Organizer', 'Supervisor', 'Observer'])->default('Attendee');
            $table->text('remarks')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('campaign_id')->references('id')->on('campaigns')->cascadeOnDelete();
            $table->foreign('activity_id')->references('id')->on('campaign_activities')->nullOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();

            $table->index('campaign_id', 'idx_cp_campaign');
            $table->index('activity_id', 'idx_cp_activity');
            $table->index('user_id', 'idx_cp_user');
        });

        // ─── TABLE 4: campaign_evidence ──────────────────
        Schema::create('campaign_evidence', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('campaign_id');
            $table->unsignedBigInteger('activity_id')->nullable();
            $table->string('file_path', 1000);
            $table->string('original_name', 500)->nullable();
            $table->string('file_type', 50)->nullable();
            $table->integer('file_size_kb')->nullable();
            $table->string('evidence_category', 200)->nullable();
            $table->string('caption', 500)->nullable();
            $table->char('uploaded_by', 36)->nullable();
            $table->string('uploaded_by_name', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('campaign_id')->references('id')->on('campaigns')->cascadeOnDelete();
            $table->foreign('activity_id')->references('id')->on('campaign_activities')->nullOnDelete();
            $table->foreign('uploaded_by')->references('id')->on('users')->nullOnDelete();

            $table->index('campaign_id', 'idx_ce_campaign');
            $table->index('activity_id', 'idx_ce_activity');
        });

        // ─── TABLE 5: campaign_actions ───────────────────
        Schema::create('campaign_actions', function (Blueprint $table) {
            $table->id();
            $table->string('action_code', 30)->unique();
            $table->unsignedBigInteger('campaign_id');
            $table->string('title', 500);
            $table->text('description')->nullable();
            $table->string('assigned_to', 255)->nullable();
            $table->char('assigned_to_id', 36)->nullable();
            $table->date('due_date')->nullable();
            $table->enum('priority', ['Low', 'Medium', 'High', 'Critical'])->default('Medium');
            $table->enum('status', ['Open', 'In Progress', 'Completed', 'Overdue'])->default('Open');
            $table->text('completion_notes')->nullable();
            $table->string('evidence_path', 1000)->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->char('closed_by', 36)->nullable();
            $table->char('created_by', 36)->nullable();
            $table->char('updated_by', 36)->nullable();
            $table->timestamps();

            $table->foreign('campaign_id')->references('id')->on('campaigns')->cascadeOnDelete();
            $table->foreign('assigned_to_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('closed_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();

            $table->index('campaign_id', 'idx_cam_campaign');
            $table->index('status', 'idx_cam_status');
            $table->index('due_date', 'idx_cam_due');
            $table->index('assigned_to_id', 'idx_cam_assigned');
        });

        // ─── TABLE 6: campaign_results ───────────────────
        Schema::create('campaign_results', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('campaign_id')->unique();

            // Counts
            $table->integer('total_activities_conducted')->default(0);
            $table->integer('total_participants')->default(0);
            $table->decimal('participation_rate', 5, 2)->nullable();
            $table->integer('areas_covered')->default(0);
            $table->integer('sessions_delivered')->default(0);

            // Impact metrics
            $table->integer('observations_raised')->default(0);
            $table->integer('violations_before')->nullable();
            $table->integer('violations_after')->nullable();
            $table->integer('incidents_before')->nullable();
            $table->integer('incidents_after')->nullable();
            $table->integer('actions_created')->default(0);
            $table->integer('actions_closed')->default(0);

            // Evaluation
            $table->enum('effectiveness_rating', ['Successful', 'Partially Successful', 'Needs Improvement', 'Not Effective'])->nullable();
            $table->text('outcome_summary')->nullable();
            $table->text('lessons_learned')->nullable();
            $table->text('recommendations')->nullable();
            $table->text('next_steps')->nullable();

            $table->string('evaluated_by', 255)->nullable();
            $table->char('evaluated_by_id', 36)->nullable();
            $table->timestamp('evaluated_at')->nullable();
            $table->timestamps();

            $table->foreign('campaign_id')->references('id')->on('campaigns')->cascadeOnDelete();
            $table->foreign('evaluated_by_id')->references('id')->on('users')->nullOnDelete();

            $table->index('campaign_id', 'idx_cr_campaign');
        });

        // ─── TABLE 7: campaign_logs ─────────────────────
        Schema::create('campaign_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('campaign_id');
            $table->string('action', 200);
            $table->string('from_status', 100)->nullable();
            $table->string('to_status', 100)->nullable();
            $table->char('performed_by', 36)->nullable();
            $table->string('performed_by_name', 255)->nullable();
            $table->string('performed_by_role', 100)->nullable();
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('campaign_id')->references('id')->on('campaigns')->cascadeOnDelete();
            $table->foreign('performed_by')->references('id')->on('users')->nullOnDelete();

            $table->index('campaign_id', 'idx_cl_campaign');
            $table->index('action', 'idx_cl_action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_logs');
        Schema::dropIfExists('campaign_results');
        Schema::dropIfExists('campaign_actions');
        Schema::dropIfExists('campaign_evidence');
        Schema::dropIfExists('campaign_participants');
        Schema::dropIfExists('campaign_activities');
        Schema::dropIfExists('campaigns');
    }
};
