<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('worker_daily_hours', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('worker_id', 36);
            $table->date('work_date');
            $table->string('day_name', 15)->nullable();
            $table->enum('shift', ['Day', 'Night', 'Split'])->default('Day');
            $table->decimal('hours_worked', 5, 2)->default(0.00);
            $table->decimal('overtime_hours', 5, 2)->default(0.00);
            $table->enum('attendance_status', ['Present', 'Absent', 'Half Day', 'Leave', 'Holiday', 'Off'])->default('Present');
            $table->string('site_area', 150)->nullable();
            $table->text('notes')->nullable();
            $table->char('recorded_by', 36)->nullable();
            $table->timestamps();

            $table->unique(['worker_id', 'work_date'], 'unique_worker_date');
            $table->index('work_date');
            $table->index('worker_id');
            $table->index('attendance_status');
            $table->index('shift');

            $table->foreign('worker_id')->references('id')->on('workers')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('worker_daily_hours');
    }
};
