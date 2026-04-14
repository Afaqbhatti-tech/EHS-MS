<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('poster_media', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('poster_id');
            $table->enum('media_type', [
                'Main Image', 'Secondary Image', 'Background',
                'Logo', 'Icon', 'QR Code', 'Preview', 'PDF Output', 'Other',
            ]);
            $table->string('file_path', 1000);
            $table->string('original_name', 500)->nullable();
            $table->string('file_type', 50)->nullable();
            $table->integer('file_size_kb')->nullable();
            $table->string('caption', 500)->nullable();
            $table->char('uploaded_by', 36)->nullable();
            $table->string('uploaded_by_name', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('poster_id', 'idx_pm_poster');
            $table->index('media_type', 'idx_pm_type');

            $table->foreign('poster_id')->references('id')->on('posters')->cascadeOnDelete();
            // Soft FK to users (UUID)
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('poster_media');
    }
};
