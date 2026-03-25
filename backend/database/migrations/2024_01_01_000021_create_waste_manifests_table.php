<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('waste_manifests', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('ref_number', 20)->unique();
            $table->string('waste_type', 100);
            $table->decimal('quantity', 10, 2)->nullable();
            $table->string('unit', 50)->nullable();
            $table->string('contractor', 100)->nullable();
            $table->string('disposal_method', 100)->nullable();
            $table->string('disposal_site', 255)->nullable();
            $table->date('manifest_date');
            $table->string('status', 30)->default('Pending');
            $table->json('signatures')->nullable();
            $table->json('attachments')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('contractor');
            $table->index('waste_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('waste_manifests');
    }
};
