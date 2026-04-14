<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('environmental_compliance_register', function (Blueprint $table) {
            $table->id();
            $table->string('compliance_code', 30)->unique();
            $table->string('regulation_name', 500);
            $table->string('regulatory_authority', 255)->nullable();
            $table->string('requirement_type', 200)->nullable();
            $table->text('requirement_description');
            $table->string('applicable_area', 255)->nullable();
            $table->string('applicable_process', 255)->nullable();
            $table->string('responsible_person', 255)->nullable();
            $table->char('responsible_id', 36)->nullable();
            $table->enum('compliance_status', ['Compliant', 'Non-Compliant', 'Pending Review', 'Expired', 'Under Action'])->default('Pending Review');
            $table->date('last_checked_date')->nullable();
            $table->date('next_due_date')->nullable();
            $table->string('document_path', 1000)->nullable();
            $table->text('remarks')->nullable();
            $table->char('created_by', 36)->nullable();
            $table->char('updated_by', 36)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('compliance_status', 'idx_comp_status');
            $table->index('next_due_date', 'idx_comp_due');
            $table->index('applicable_area', 'idx_comp_area');

            $table->foreign('responsible_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('environmental_compliance_register');
    }
};
