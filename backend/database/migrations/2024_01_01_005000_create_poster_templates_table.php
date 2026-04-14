<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('poster_templates', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name', 300);
            $table->string('category', 200)->nullable();
            $table->string('layout_type', 100)->nullable();
            $table->text('description')->nullable();
            $table->json('placeholder_schema')->nullable();
            $table->string('default_theme_key', 50)->nullable();
            $table->enum('default_orientation', ['Portrait', 'Landscape'])->default('Portrait');
            $table->string('print_size', 50)->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('category', 'idx_pt_category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('poster_templates');
    }
};
