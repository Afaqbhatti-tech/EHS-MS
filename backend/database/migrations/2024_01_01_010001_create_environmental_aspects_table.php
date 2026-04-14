<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('environmental_aspects', function (Blueprint $table) {
            $table->id();
            $table->string('aspect_code', 30)->unique();
            $table->string('activity', 500);
            $table->text('aspect_description');
            $table->text('impact_description')->nullable();
            $table->string('aspect_category', 200);
            $table->string('impact_type', 200)->nullable();
            $table->string('location', 255)->nullable();
            $table->string('area', 200)->nullable();
            $table->string('department', 200)->nullable();
            $table->integer('severity')->nullable();
            $table->integer('likelihood')->nullable();
            $table->enum('risk_level', ['Low', 'Medium', 'High', 'Critical'])->nullable();
            $table->integer('risk_score')->nullable();
            $table->text('controls')->nullable();
            $table->text('additional_controls')->nullable();
            $table->string('responsible_person', 255)->nullable();
            $table->char('responsible_id', 36)->nullable();
            $table->date('review_date')->nullable();
            $table->enum('status', ['Active', 'Under Review', 'Controlled', 'Closed'])->default('Active');
            $table->text('notes')->nullable();
            $table->char('created_by', 36)->nullable();
            $table->char('updated_by', 36)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('aspect_category', 'idx_asp_category');
            $table->index('risk_level', 'idx_asp_risk');
            $table->index('status', 'idx_asp_status');
            $table->index('area', 'idx_asp_area');

            $table->foreign('responsible_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('environmental_aspects');
    }
};
