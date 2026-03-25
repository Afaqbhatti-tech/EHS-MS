<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('manpower_records', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->date('record_date');
            $table->string('shift', 50)->nullable();
            $table->string('area', 100)->nullable();
            $table->string('contractor', 100)->nullable();
            $table->integer('headcount')->default(0);
            $table->decimal('man_hours', 10, 2)->default(0);
            $table->json('worker_categories')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('record_date');
            $table->index('contractor');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('manpower_records');
    }
};
