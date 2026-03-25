<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incidents', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('ref_number', 20)->unique();
            $table->date('incident_date');
            $table->time('incident_time')->nullable();
            $table->string('classification', 100);
            $table->string('severity', 30)->default('Minor');
            $table->string('zone', 100)->nullable();
            $table->string('contractor', 100)->nullable();
            $table->text('description');
            $table->text('immediate_actions')->nullable();
            $table->json('witnesses')->nullable();
            $table->text('root_cause')->nullable();
            $table->json('corrective_actions')->nullable();
            $table->string('status', 30)->default('Open');
            $table->char('reported_by', 36)->nullable();
            $table->char('investigated_by', 36)->nullable();
            $table->json('attachments')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('severity');
            $table->index('contractor');
            $table->index('incident_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incidents');
    }
};
