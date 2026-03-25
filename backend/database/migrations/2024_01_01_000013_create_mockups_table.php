<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mockups', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('ref_number', 20)->unique();
            $table->string('title', 255);
            $table->string('procedure_type', 100)->nullable();
            $table->string('area', 100)->nullable();
            $table->string('contractor', 100)->nullable();
            $table->string('status', 30)->default('Open');
            $table->text('description')->nullable();
            $table->string('fft_decision', 50)->nullable();
            $table->string('consultant_decision', 50)->nullable();
            $table->string('client_decision', 50)->nullable();
            $table->json('attachments')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('contractor');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mockups');
    }
};
