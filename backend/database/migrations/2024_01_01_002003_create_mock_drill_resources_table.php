<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mock_drill_resources', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('mock_drill_id');
            $table->string('equipment_name', 255);
            $table->string('equipment_type', 60)->default('Other');
            $table->integer('quantity')->default(1);
            $table->string('condition', 20)->default('Good');
            $table->boolean('was_available')->default(true);
            $table->boolean('was_functional')->default(true);
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index('mock_drill_id');
            $table->foreign('mock_drill_id')->references('id')->on('mock_drills')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mock_drill_resources');
    }
};
