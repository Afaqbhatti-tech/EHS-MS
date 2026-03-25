<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permits', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('ref_number', 20)->unique();
            $table->string('permit_type', 100);
            $table->text('work_description');
            $table->string('zone', 100)->nullable();
            $table->string('phase', 100)->nullable();
            $table->string('contractor', 100)->nullable();
            $table->string('applicant_name', 255)->nullable();
            $table->datetime('valid_from');
            $table->datetime('valid_to');
            $table->string('status', 30)->default('Draft');
            $table->text('safety_measures')->nullable();
            $table->text('ppe_requirements')->nullable();
            $table->json('attachments')->nullable();
            $table->char('approved_by', 36)->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->char('closed_by', 36)->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('contractor');
            $table->index('valid_from');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permits');
    }
};
