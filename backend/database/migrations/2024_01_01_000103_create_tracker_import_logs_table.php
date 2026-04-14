<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tracker_import_logs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('import_batch_id', 100)->unique();
            $table->string('category_key', 100);
            $table->string('original_filename', 500)->nullable();
            $table->integer('total_rows')->default(0);
            $table->integer('success_rows')->default(0);
            $table->integer('failed_rows')->default(0);
            $table->json('error_details')->nullable();
            $table->unsignedBigInteger('imported_by')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tracker_import_logs');
    }
};
