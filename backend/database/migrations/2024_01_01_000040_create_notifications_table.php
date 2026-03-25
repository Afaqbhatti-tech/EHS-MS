<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('user_id', 36)->index();
            $table->string('type', 50);          // observation, permit, incident, violation, system, assignment, overdue
            $table->string('title');
            $table->text('body')->nullable();
            $table->string('icon', 50)->nullable();    // lucide icon name hint
            $table->string('severity', 20)->default('info'); // info, success, warning, danger
            $table->string('link')->nullable();         // frontend route to navigate to
            $table->string('ref_module', 50)->nullable();
            $table->string('ref_id', 100)->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index(['user_id', 'read_at']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
