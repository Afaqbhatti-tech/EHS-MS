<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mom_point_photos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('mom_point_id');
            $table->char('mom_id', 36)->nullable();
            $table->string('file_name', 255);
            $table->string('original_name', 255);
            $table->string('file_path', 500);
            $table->unsignedBigInteger('file_size')->default(0);
            $table->string('mime_type', 100)->nullable();
            $table->string('caption', 500)->nullable();
            $table->char('uploaded_by', 36)->nullable();
            $table->string('uploaded_by_name', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('mom_point_id')
                ->references('id')->on('mom_points')
                ->onDelete('cascade');

            $table->foreign('mom_id')
                ->references('id')->on('moms')
                ->onDelete('set null');

            $table->index('mom_point_id');
            $table->index('mom_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mom_point_photos');
    }
};
