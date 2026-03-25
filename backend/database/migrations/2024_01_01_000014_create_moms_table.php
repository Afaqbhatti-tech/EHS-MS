<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('moms', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('ref_number', 20)->unique();
            $table->date('meeting_date');
            $table->string('meeting_type', 100)->nullable();
            $table->string('location', 255)->nullable();
            $table->json('attendees')->nullable();
            $table->json('action_items')->nullable();
            $table->json('previous_closeouts')->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 30)->default('Draft');
            $table->char('recorded_by', 36)->nullable();
            $table->timestamps();

            $table->index('meeting_date');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('moms');
    }
};
