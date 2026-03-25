<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_records', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('ref_number', 20)->unique();
            $table->char('employee_id', 36)->nullable();
            $table->string('training_type', 100);
            $table->string('training_title', 255);
            $table->date('training_date');
            $table->date('expiry_date')->nullable();
            $table->string('result', 50)->default('Pending');
            $table->string('contractor', 100)->nullable();
            $table->string('trainer', 255)->nullable();
            $table->string('certificate_number', 100)->nullable();
            $table->json('attachments')->nullable();
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('set null');
            $table->index('contractor');
            $table->index('result');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_records');
    }
};
