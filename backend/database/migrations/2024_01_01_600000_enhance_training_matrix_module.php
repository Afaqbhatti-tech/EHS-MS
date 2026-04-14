<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Add missing columns to training_records (idempotent) ─
        $columnsToAdd = [
            'next_training_date' => fn(Blueprint $t) => $t->date('next_training_date')->nullable()->after('expiry_date'),
            'training_duration' => fn(Blueprint $t) => $t->string('training_duration', 100)->nullable()->after(Schema::hasColumn('training_records', 'next_training_date') ? 'next_training_date' : 'expiry_date'),
            'training_provider' => fn(Blueprint $t) => $t->string('training_provider', 255)->nullable()->after('trainer_name'),
            'result_status' => fn(Blueprint $t) => $t->enum('result_status', ['Completed', 'Passed', 'Failed', 'Attended', 'Absent', 'N/A'])->default('Completed')->after('status'),
            'certificate_file_path' => fn(Blueprint $t) => $t->string('certificate_file_path', 1000)->nullable()->after('certificate_path'),
            'certificate_file_name' => fn(Blueprint $t) => $t->string('certificate_file_name', 500)->nullable()->after(Schema::hasColumn('training_records', 'certificate_file_path') ? 'certificate_file_path' : 'certificate_path'),
            'deleted_by' => fn(Blueprint $t) => $t->string('deleted_by', 255)->nullable()->after('updated_by'),
        ];

        foreach ($columnsToAdd as $col => $adder) {
            if (!Schema::hasColumn('training_records', $col)) {
                Schema::table('training_records', function (Blueprint $table) use ($adder) {
                    $adder($table);
                });
            }
        }

        // Add indexes if not already present (wrapped in try/catch for safety)
        try {
            Schema::table('training_records', function (Blueprint $table) {
                $table->index('next_training_date', 'idx_tr_next_date');
                $table->index('result_status', 'idx_tr_result');
            });
        } catch (\Exception $e) {
            // Indexes may already exist
        }

        // ── 2. Create profession_training_requirements table ─────
        Schema::create('profession_training_requirements', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('profession', 150);
            $table->string('training_topic_key', 100);
            $table->char('training_topic_id', 36)->nullable();
            $table->foreign('training_topic_id')
                ->references('id')->on('training_topics')
                ->onDelete('set null');
            $table->boolean('is_mandatory')->default(true);
            $table->text('notes')->nullable();
            $table->char('created_by', 36)->nullable();
            $table->timestamps();

            $table->unique(['profession', 'training_topic_key'], 'uq_prof_topic');
            $table->index('profession', 'idx_ptr_profession');
            $table->index('training_topic_key', 'idx_ptr_topic_key');
        });

        // ── 3. Create training_logs table (audit trail) ──────────
        Schema::create('training_logs', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('training_record_id', 36)->nullable();
            $table->string('record_code', 30)->nullable();
            $table->string('action_type', 50);
            $table->text('description')->nullable();
            $table->text('old_value')->nullable();
            $table->text('new_value')->nullable();
            $table->json('metadata')->nullable();
            $table->char('user_id', 36)->nullable();
            $table->string('user_name', 255)->nullable();
            $table->timestamps();

            $table->index('training_record_id', 'idx_tl_record');
            $table->index('action_type', 'idx_tl_action');
            $table->index('created_at', 'idx_tl_created');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_logs');
        Schema::dropIfExists('profession_training_requirements');

        Schema::table('training_records', function (Blueprint $table) {
            $table->dropIndex('idx_tr_next_date');
            $table->dropIndex('idx_tr_result');
            $table->dropColumn([
                'next_training_date', 'training_duration', 'training_provider',
                'result_status', 'certificate_file_path', 'certificate_file_name',
            ]);
        });
    }
};
