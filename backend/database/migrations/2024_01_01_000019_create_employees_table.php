<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('employee_id', 50)->unique();
            $table->string('full_name', 255);
            $table->string('designation', 100)->nullable();
            $table->string('department', 100)->nullable();
            $table->string('contractor', 100)->nullable();
            $table->string('worker_category', 50)->nullable();
            $table->string('nationality', 100)->nullable();
            $table->string('id_number', 100)->nullable();
            $table->date('medical_fitness_expiry')->nullable();
            $table->boolean('is_active')->default(true);
            $table->json('certifications')->nullable();
            $table->timestamps();

            $table->index('contractor');
            $table->index('worker_category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
