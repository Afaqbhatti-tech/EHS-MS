<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mockup_comments', function (Blueprint $table) {
            $table->char('id', 36)->primary();

            $table->char('mockup_id', 36);
            $table->char('parent_comment_id', 36)->nullable();

            $table->char('user_id', 36)->nullable();
            $table->string('user_name', 255)->nullable();
            $table->string('user_role', 100)->nullable();

            $table->string('comment_type', 50)->default('Review Comment');
            $table->text('comment_text');

            // Resolution tracking
            $table->boolean('is_resolved')->default(false);
            $table->char('resolved_by', 36)->nullable();
            $table->string('resolved_by_name', 255)->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->text('resolution_note')->nullable();

            // Status snapshot
            $table->string('mockup_status_at_time', 100)->nullable();

            $table->timestamps();

            $table->foreign('mockup_id')->references('id')->on('mockups')->onDelete('cascade');
            $table->index('mockup_id', 'idx_mc_mockup');
            $table->index('parent_comment_id', 'idx_mc_parent');
            $table->index('is_resolved', 'idx_mc_resolved');
            $table->index('user_id', 'idx_mc_user');
            $table->index('comment_type', 'idx_mc_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mockup_comments');
    }
};
