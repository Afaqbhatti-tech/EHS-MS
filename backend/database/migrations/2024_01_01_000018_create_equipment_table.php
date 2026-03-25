<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('ref_number', 20)->unique();
            $table->string('name', 255);
            $table->string('type', 100)->nullable();
            $table->string('serial_number', 100)->nullable();
            $table->string('contractor', 100)->nullable();
            $table->string('location', 255)->nullable();
            $table->string('status', 30)->default('Active');
            $table->date('last_inspection_date')->nullable();
            $table->date('next_inspection_date')->nullable();
            $table->string('certificate_number', 100)->nullable();
            $table->date('certificate_expiry')->nullable();
            $table->json('attachments')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('contractor');
            $table->index('next_inspection_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment');
    }
};
