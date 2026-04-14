<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_topics', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('key', 100)->unique();
            $table->string('label', 200);
            $table->string('category', 100)->nullable();
            $table->integer('validity_days')->nullable();
            $table->boolean('is_mandatory')->default(false);
            $table->text('description')->nullable();
            $table->string('color', 7)->nullable();
            $table->string('light_color', 7)->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('category');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_topics');
    }
};
