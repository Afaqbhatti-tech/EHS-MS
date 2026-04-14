<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mock_drill_participants', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('mock_drill_id');
            $table->char('user_id', 36)->nullable();
            $table->string('name', 255);
            $table->string('employee_id', 100)->nullable();
            $table->string('designation', 200)->nullable();
            $table->string('department', 200)->nullable();
            $table->string('company', 200)->nullable();
            $table->string('emergency_role', 60)->nullable();
            $table->string('attendance_status', 20)->default('Present');
            $table->string('participation_status', 20)->default('Active');
            $table->text('responsibility')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('mock_drill_id');
            $table->index('user_id');
            $table->foreign('mock_drill_id')->references('id')->on('mock_drills')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mock_drill_participants');
    }
};
