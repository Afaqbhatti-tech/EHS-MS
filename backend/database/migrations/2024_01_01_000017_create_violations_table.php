<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('violations', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('ref_number', 20)->unique();
            $table->date('violation_date');
            $table->string('severity', 30);
            $table->string('action_type', 100)->nullable();
            $table->text('description');
            $table->string('contractor', 100)->nullable();
            $table->string('zone', 100)->nullable();
            $table->json('golden_rules')->nullable();
            $table->decimal('penalty_amount', 10, 2)->nullable();
            $table->string('status', 30)->default('Open');
            $table->char('issued_by', 36)->nullable();
            $table->json('attachments')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('severity');
            $table->index('contractor');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('violations');
    }
};
