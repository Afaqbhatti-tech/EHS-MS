<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permit_amendments', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('ref_number', 20)->unique();
            $table->char('permit_id', 36);
            $table->text('amendment_reason');
            $table->text('changes_description')->nullable();
            $table->string('status', 30)->default('Pending');
            $table->char('requested_by', 36)->nullable();
            $table->char('approved_by', 36)->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->foreign('permit_id')->references('id')->on('permits')->onDelete('cascade');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permit_amendments');
    }
};
