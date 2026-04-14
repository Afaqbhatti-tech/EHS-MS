<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checklist_items', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('item_code', 30)->unique();
            $table->unsignedBigInteger('category_id');
            $table->string('category_key', 100);
            $table->string('name', 255);
            $table->string('item_type', 150)->nullable();
            $table->string('plate_number', 100)->nullable();
            $table->string('serial_number', 150)->nullable();
            $table->string('make_model', 200)->nullable();
            $table->string('swl', 100)->nullable();
            $table->string('certificate_number', 200)->nullable();
            $table->date('certificate_expiry')->nullable();
            $table->date('onboarding_date')->nullable();
            $table->date('last_internal_inspection_date')->nullable();
            $table->date('next_internal_inspection_date')->nullable();
            $table->date('last_third_party_inspection_date')->nullable();
            $table->date('next_third_party_inspection_date')->nullable();
            $table->string('health_condition', 30)->default('Good');
            $table->text('visual_condition')->nullable();
            $table->string('status', 30)->default('Active');
            $table->boolean('is_overdue')->default(false);
            $table->integer('days_until_due')->nullable();
            $table->timestamp('alert_sent_at')->nullable();
            $table->string('location_area', 200)->nullable();
            $table->string('assigned_to', 255)->nullable();
            $table->text('notes')->nullable();
            $table->string('image_path', 1000)->nullable();
            $table->char('created_by', 36)->nullable();
            $table->char('updated_by', 36)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('category_id');
            $table->index('category_key');
            $table->index('status');
            $table->index('is_overdue');
            $table->index('next_internal_inspection_date');
            $table->index('certificate_expiry');
            $table->index('health_condition');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checklist_items');
    }
};
