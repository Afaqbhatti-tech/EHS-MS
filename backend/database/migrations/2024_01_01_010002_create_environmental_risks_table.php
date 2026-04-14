<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('environmental_risks', function (Blueprint $table) {
            $table->id();
            $table->string('risk_code', 30)->unique();
            $table->unsignedBigInteger('aspect_id')->nullable();
            $table->text('hazard_description');
            $table->text('potential_impact')->nullable();
            $table->integer('likelihood')->nullable();
            $table->integer('severity')->nullable();
            $table->integer('risk_score')->nullable();
            $table->enum('risk_rating', ['Low', 'Medium', 'High', 'Critical'])->nullable();
            $table->text('existing_controls')->nullable();
            $table->text('additional_controls')->nullable();
            $table->integer('residual_likelihood')->nullable();
            $table->integer('residual_severity')->nullable();
            $table->integer('residual_risk_score')->nullable();
            $table->enum('residual_risk_rating', ['Low', 'Medium', 'High', 'Critical'])->nullable();
            $table->string('responsible_person', 255)->nullable();
            $table->char('responsible_id', 36)->nullable();
            $table->date('review_date')->nullable();
            $table->enum('status', ['Open', 'Controlled', 'Closed', 'Under Review'])->default('Open');
            $table->text('notes')->nullable();
            $table->char('created_by', 36)->nullable();
            $table->char('updated_by', 36)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('aspect_id', 'idx_erisk_aspect');
            $table->index('risk_rating', 'idx_erisk_rating');
            $table->index('status', 'idx_erisk_status');

            $table->foreign('aspect_id')->references('id')->on('environmental_aspects')->onDelete('set null');
            $table->foreign('responsible_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('environmental_risks');
    }
};
