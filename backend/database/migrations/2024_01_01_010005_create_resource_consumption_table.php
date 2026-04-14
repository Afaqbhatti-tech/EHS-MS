<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resource_consumption', function (Blueprint $table) {
            $table->id();
            $table->string('consumption_code', 30)->unique();
            $table->string('resource_type', 100);
            $table->decimal('consumption_value', 12, 4);
            $table->string('unit', 50);
            $table->decimal('meter_reading', 12, 4)->nullable();
            $table->decimal('previous_reading', 12, 4)->nullable();
            $table->date('reading_date');
            $table->string('billing_period', 100)->nullable();
            $table->string('location', 255)->nullable();
            $table->string('area', 200)->nullable();
            $table->string('department', 200)->nullable();
            $table->string('recorded_by', 255)->nullable();
            $table->char('recorded_by_id', 36)->nullable();
            $table->decimal('cost', 12, 2)->nullable();
            $table->string('currency', 10)->default('SAR');
            $table->text('remarks')->nullable();
            $table->string('document_path', 1000)->nullable();
            $table->timestamps();

            $table->index('resource_type', 'idx_res_type');
            $table->index('reading_date', 'idx_res_date');
            $table->index('area', 'idx_res_area');

            $table->foreign('recorded_by_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resource_consumption');
    }
};
