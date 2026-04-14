<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checklist_categories', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique();
            $table->string('label', 150);
            $table->string('full_label', 255)->nullable();
            $table->string('icon', 50)->nullable();
            $table->string('color', 7)->nullable();
            $table->string('light_color', 7)->nullable();
            $table->string('text_color', 7)->nullable();
            $table->boolean('has_plate')->default(false);
            $table->boolean('has_swl')->default(false);
            $table->boolean('has_cert')->default(false);
            $table->integer('insp_freq_days')->default(7);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checklist_categories');
    }
};
