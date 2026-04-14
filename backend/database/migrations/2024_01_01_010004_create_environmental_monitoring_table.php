<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('environmental_monitoring', function (Blueprint $table) {
            $table->id();
            $table->string('monitoring_code', 30)->unique();
            $table->string('monitoring_type', 200);
            $table->string('source_area', 255)->nullable();
            $table->string('parameter', 255);
            $table->decimal('measured_value', 12, 4);
            $table->decimal('permissible_limit', 12, 4)->nullable();
            $table->string('unit', 100);
            $table->enum('compliance_status', ['Compliant', 'Non-Compliant', 'Warning', 'Pending'])->default('Pending');
            $table->date('monitoring_date');
            $table->time('monitoring_time')->nullable();
            $table->string('conducted_by', 255)->nullable();
            $table->char('conducted_by_id', 36)->nullable();
            $table->string('equipment_used', 255)->nullable();
            $table->string('report_path', 1000)->nullable();
            $table->text('remarks')->nullable();
            $table->char('created_by', 36)->nullable();
            $table->timestamps();

            $table->index('monitoring_type', 'idx_mon_type');
            $table->index('compliance_status', 'idx_mon_compliance');
            $table->index('monitoring_date', 'idx_mon_date');

            $table->foreign('conducted_by_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('environmental_monitoring');
    }
};
