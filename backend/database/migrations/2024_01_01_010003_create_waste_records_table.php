<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('waste_records', function (Blueprint $table) {
            $table->id();
            $table->string('waste_code', 30)->unique();
            $table->string('waste_type', 200);
            $table->enum('waste_category', ['Hazardous', 'Non-Hazardous', 'Recyclable', 'Other'])->default('Non-Hazardous');
            $table->string('source_area', 255)->nullable();
            $table->string('department', 200)->nullable();
            $table->decimal('quantity', 10, 3);
            $table->string('unit', 50);
            $table->string('storage_location', 255)->nullable();
            $table->string('container_type', 200)->nullable();
            $table->string('responsible_person', 255)->nullable();
            $table->char('responsible_id', 36)->nullable();
            $table->string('disposal_method', 200)->nullable();
            $table->string('disposal_vendor', 255)->nullable();
            $table->string('manifest_number', 200)->nullable();
            $table->date('disposal_date')->nullable();
            $table->date('collection_date')->nullable();
            $table->string('document_path', 1000)->nullable();
            $table->enum('status', ['Pending Collection', 'In Storage', 'Collected', 'Disposed', 'Recycled'])->default('Pending Collection');
            $table->text('notes')->nullable();
            $table->char('created_by', 36)->nullable();
            $table->char('updated_by', 36)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('waste_type', 'idx_wst_type');
            $table->index('waste_category', 'idx_wst_category');
            $table->index('status', 'idx_wst_status');
            $table->index('disposal_date', 'idx_wst_date');

            $table->foreign('responsible_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('waste_records');
    }
};
