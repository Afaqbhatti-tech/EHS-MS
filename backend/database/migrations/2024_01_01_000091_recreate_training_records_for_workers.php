<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop legacy training_records table (was linked to employees, not workers)
        Schema::dropIfExists('training_records');

        Schema::create('training_records', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('record_id', 30)->unique();

            $table->char('worker_id', 36);
            $table->foreign('worker_id')->references('id')->on('workers')->onDelete('cascade');

            $table->string('training_topic_key', 100);
            $table->char('training_topic_id', 36)->nullable();
            $table->foreign('training_topic_id')->references('id')->on('training_topics')->onDelete('set null');

            $table->date('training_date');
            $table->date('expiry_date')->nullable();

            $table->string('trainer_name', 255)->nullable();
            $table->string('training_location', 255)->nullable();
            $table->string('certificate_number', 200)->nullable();
            $table->string('certificate_path', 1000)->nullable();

            $table->enum('status', ['Valid', 'Expired', 'Expiring Soon', 'Pending', 'Not Required'])->default('Valid');

            $table->boolean('is_bulk_assignment')->default(false);
            $table->string('bulk_assignment_id', 50)->nullable();

            $table->text('notes')->nullable();

            $table->string('verified_by', 255)->nullable();
            $table->timestamp('verified_at')->nullable();

            $table->char('created_by', 36)->nullable();
            $table->char('updated_by', 36)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('worker_id', 'idx_tr_worker');
            $table->index('training_topic_key', 'idx_tr_topic_key');
            $table->index('training_date', 'idx_tr_training_date');
            $table->index('expiry_date', 'idx_tr_expiry_date');
            $table->index('status', 'idx_tr_status');
            $table->index('bulk_assignment_id', 'idx_tr_bulk');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_records');
    }
};
