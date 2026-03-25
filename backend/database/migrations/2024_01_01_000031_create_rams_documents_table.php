<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rams_documents', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('work_line_id', 36);
            $table->string('ref_number', 30)->unique();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->string('contractor', 100)->nullable();
            $table->string('zone', 100)->nullable();
            $table->string('status', 30)->default('Draft');
            $table->unsignedInteger('current_version')->default(0);
            $table->char('submitted_by', 36)->nullable();
            $table->char('approved_by', 36)->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejected_reason')->nullable();
            $table->date('due_date')->nullable();
            $table->json('tags')->nullable();
            $table->timestamps();

            $table->foreign('work_line_id')->references('id')->on('work_lines')->onDelete('cascade');
            $table->index('status');
            $table->index('contractor');
            $table->index('work_line_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rams_documents');
    }
};
