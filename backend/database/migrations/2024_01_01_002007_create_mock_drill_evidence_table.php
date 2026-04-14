<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mock_drill_evidence', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('mock_drill_id');
            $table->string('linked_type', 30);
            $table->unsignedBigInteger('linked_id')->nullable();
            $table->string('file_path', 1000);
            $table->string('original_name', 500)->nullable();
            $table->string('file_type', 50)->nullable();
            $table->integer('file_size_kb')->nullable();
            $table->string('caption', 500)->nullable();
            $table->char('uploaded_by', 36)->nullable();
            $table->string('uploaded_by_name', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('mock_drill_id');
            $table->index(['linked_type', 'linked_id']);
            $table->foreign('mock_drill_id')->references('id')->on('mock_drills')->cascadeOnDelete();
            $table->foreign('uploaded_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mock_drill_evidence');
    }
};
