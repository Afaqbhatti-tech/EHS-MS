<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workers', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('worker_id', 30)->unique();
            $table->string('name', 255);
            $table->string('employee_number', 100)->nullable()->unique();
            $table->string('profession', 150)->nullable();
            $table->string('department', 150)->nullable();
            $table->string('company', 200)->nullable();
            $table->string('nationality', 100)->nullable();
            $table->date('joining_date')->nullable();
            $table->date('demobilization_date')->nullable();
            $table->enum('induction_status', ['Done', 'Not Done', 'Pending'])->default('Not Done');
            $table->date('induction_date')->nullable();
            $table->string('induction_by', 255)->nullable();
            $table->enum('status', ['Active', 'Inactive', 'Demobilised', 'Suspended'])->default('Active');
            $table->string('id_number', 100)->nullable();
            $table->string('contact_number', 50)->nullable();
            $table->string('emergency_contact', 255)->nullable();
            $table->text('remarks')->nullable();
            $table->char('training_profile_id', 36)->nullable();
            $table->char('created_by', 36)->nullable();
            $table->char('updated_by', 36)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('name');
            $table->index('profession');
            $table->index('company');
            $table->index('status');
            $table->index('induction_status');
            $table->index('joining_date');
            $table->index('department');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workers');
    }
};
