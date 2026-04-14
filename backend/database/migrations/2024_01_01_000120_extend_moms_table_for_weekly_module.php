<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('moms', function (Blueprint $table) {
            // MOM code (format: MOM-YYYY-WNN)
            $table->string('mom_code', 30)->nullable()->unique()->after('ref_number');

            // Week tracking
            $table->integer('week_number')->nullable()->after('mom_code');
            $table->integer('year')->nullable()->after('week_number');

            // Title
            $table->string('title', 500)->nullable()->after('year');

            // Meeting details
            $table->time('meeting_time')->nullable()->after('meeting_date');
            $table->string('meeting_location', 255)->nullable()->after('meeting_time');
            $table->string('chaired_by', 255)->nullable()->after('meeting_type');
            $table->string('minutes_prepared_by', 255)->nullable()->after('chaired_by');
            $table->string('site_project', 255)->nullable()->after('minutes_prepared_by');
            $table->string('client_name', 255)->nullable()->after('site_project');

            // Summary
            $table->text('summary')->nullable()->after('client_name');

            // Point summary (denormalized for fast display)
            $table->integer('total_points')->default(0)->after('summary');
            $table->integer('open_points')->default(0)->after('total_points');
            $table->integer('in_progress_points')->default(0)->after('open_points');
            $table->integer('resolved_points')->default(0)->after('in_progress_points');
            $table->integer('closed_points')->default(0)->after('resolved_points');
            $table->integer('overdue_points')->default(0)->after('closed_points');

            // Attachments
            $table->json('attachments')->nullable()->after('overdue_points');

            // Previous MOM reference
            $table->char('previous_mom_id', 36)->nullable()->after('attachments');

            // Distribution
            $table->timestamp('distributed_at')->nullable()->after('previous_mom_id');
            $table->char('distributed_by', 36)->nullable()->after('distributed_at');

            // Meta
            $table->char('created_by', 36)->nullable()->after('status');
            $table->char('updated_by', 36)->nullable()->after('created_by');
            $table->softDeletes();

            // Indexes
            $table->index(['week_number', 'year'], 'idx_mom_week');
            $table->index('previous_mom_id', 'idx_mom_prev');
        });

        // Add unique constraint on week_number + year (only if both are not null)
        // Using a unique index
        Schema::table('moms', function (Blueprint $table) {
            $table->unique(['week_number', 'year'], 'idx_mom_week_yr');
        });
    }

    public function down(): void
    {
        Schema::table('moms', function (Blueprint $table) {
            $table->dropUnique('idx_mom_week_yr');
            $table->dropIndex('idx_mom_week');
            $table->dropIndex('idx_mom_prev');
            $table->dropSoftDeletes();

            $table->dropColumn([
                'mom_code', 'week_number', 'year', 'title',
                'meeting_time', 'meeting_location', 'chaired_by',
                'minutes_prepared_by', 'site_project', 'client_name',
                'summary', 'total_points', 'open_points', 'in_progress_points',
                'resolved_points', 'closed_points', 'overdue_points',
                'attachments', 'previous_mom_id', 'distributed_at',
                'distributed_by', 'created_by', 'updated_by',
            ]);
        });
    }
};
