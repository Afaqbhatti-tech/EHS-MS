<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment_register', function (Blueprint $table) {
            $table->id();
            $table->string('equipment_code', 30)->unique();

            // ── Basic Identification ──
            $table->string('equipment_name', 255);
            $table->string('serial_number', 100)->nullable();
            $table->string('equipment_category', 80)->nullable();
            $table->string('equipment_type', 120)->nullable();
            $table->string('manufacturer', 150)->nullable();
            $table->string('model_number', 100)->nullable();
            $table->string('asset_tag', 80)->nullable();
            $table->string('registration_number', 80)->nullable();

            // ── Status & Lifecycle ──
            $table->string('equipment_status', 30)->default('active');
            $table->string('working_status', 30)->default('currently_working');
            $table->string('condition_status', 30)->default('good');
            $table->text('condition_details')->nullable();
            $table->date('purchase_date')->nullable();
            $table->date('commissioning_date')->nullable();
            $table->date('retirement_date')->nullable();

            // ── Location / Assignment ──
            $table->string('project_name', 150)->nullable();
            $table->string('current_location', 200)->nullable();
            $table->string('area', 100)->nullable();
            $table->string('zone', 100)->nullable();
            $table->string('assigned_team', 150)->nullable();
            $table->string('assigned_supervisor', 150)->nullable();
            $table->string('assigned_operator', 150)->nullable();

            // ── Ownership / Authorization ──
            $table->string('company_name', 150)->nullable();
            $table->string('equipment_owner', 150)->nullable();
            $table->string('authorized_by', 150)->nullable();
            $table->string('approved_by', 150)->nullable();
            $table->string('vendor_supplier', 150)->nullable();

            // ── Inspection / Condition ──
            $table->date('last_inspection_date')->nullable();
            $table->date('next_inspection_date')->nullable();
            $table->string('inspection_frequency', 30)->nullable();
            $table->string('inspection_status', 30)->default('valid');
            $table->string('certificate_number', 100)->nullable();
            $table->date('tuv_valid_until')->nullable();

            // ── Financial / Administrative ──
            $table->decimal('purchase_cost', 12, 2)->nullable();
            $table->string('rental_status', 20)->default('owned');
            $table->string('rental_company', 150)->nullable();
            $table->date('warranty_expiry')->nullable();

            // ── Media / Notes ──
            $table->string('image_path', 500)->nullable();
            $table->json('additional_images')->nullable();
            $table->json('attachments')->nullable();
            $table->text('notes')->nullable();
            $table->text('remarks')->nullable();

            // ── Audit ──
            $table->string('created_by', 255)->nullable();
            $table->string('updated_by', 255)->nullable();
            $table->string('deleted_by', 255)->nullable();

            $table->timestamps();
            $table->softDeletes();

            // ── Indexes ──
            $table->index('equipment_status');
            $table->index('working_status');
            $table->index('condition_status');
            $table->index('equipment_category');
            $table->index('company_name');
            $table->index('area');
            $table->index('zone');
            $table->index('next_inspection_date');
            $table->index('inspection_status');
            $table->index('serial_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment_register');
    }
};
