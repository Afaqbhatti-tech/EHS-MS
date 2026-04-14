<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tracker_records', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('record_code', 30)->unique();
            $table->unsignedInteger('category_id');
            $table->string('category_key', 100);
            $table->string('template_type', 50);

            // Core fields
            $table->string('equipment_name', 500);
            $table->string('item_subtype', 200)->nullable();
            $table->string('serial_number', 200)->nullable();
            $table->string('make_model', 200)->nullable();
            $table->string('location_area', 200)->nullable();
            $table->string('assigned_to', 255)->nullable();
            $table->date('onboarding_date')->nullable();
            $table->enum('status', ['Active', 'Inactive', 'Out of Service', 'Quarantined', 'Removed from Site', 'Under Maintenance'])->default('Active');
            $table->enum('condition', ['Good', 'Fair', 'Poor', 'Out of Service', 'Quarantined'])->default('Good');

            // Heavy equipment
            $table->string('plate_number', 100)->nullable();
            $table->string('swl', 100)->nullable();
            $table->decimal('load_capacity_tons', 8, 2)->nullable();
            $table->string('checker_number', 200)->nullable();

            // Certification
            $table->string('certificate_number', 200)->nullable();
            $table->date('certificate_expiry')->nullable();
            $table->string('certificate_issuer', 255)->nullable();

            // TUV / Third-party
            $table->date('tuv_inspection_date')->nullable();
            $table->date('tuv_expiry_date')->nullable();
            $table->string('tuv_inspector', 255)->nullable();
            $table->string('tuv_company', 200)->nullable();
            $table->string('tuv_certificate_number', 200)->nullable();

            // Internal inspection
            $table->date('last_internal_inspection_date')->nullable();
            $table->date('next_internal_inspection_date')->nullable();
            $table->string('inspected_by', 255)->nullable();

            // General expiry
            $table->date('expiry_date')->nullable();

            // Due status (auto-calculated)
            $table->boolean('is_overdue')->default(false);
            $table->integer('days_until_due')->nullable();
            $table->boolean('is_tuv_overdue')->default(false);
            $table->integer('days_until_tuv')->nullable();
            $table->boolean('is_cert_expired')->default(false);

            // Fire extinguisher
            $table->string('extinguisher_type', 100)->nullable();
            $table->decimal('weight_kg', 6, 2)->nullable();
            $table->boolean('civil_defense_tag')->default(false);

            // Harness
            $table->date('manufacture_date')->nullable();
            $table->date('retirement_date')->nullable();
            $table->boolean('last_drop_arrest')->default(false);
            $table->date('drop_arrest_date')->nullable();

            // Power tool
            $table->string('voltage_rating', 50)->nullable();
            $table->date('electrical_test_date')->nullable();
            $table->date('electrical_test_expiry')->nullable();

            // Tool tag
            $table->string('toolbox_tag_colour', 50)->nullable();
            $table->date('last_toolbox_tag_date')->nullable();
            $table->date('next_toolbox_tag_date')->nullable();

            // Defect tracking
            $table->boolean('has_open_defect')->default(false);
            $table->text('defect_description')->nullable();
            $table->date('defect_reported_date')->nullable();
            $table->date('defect_closed_date')->nullable();

            // Import tracking
            $table->string('import_batch_id', 100)->nullable();

            // Files
            $table->string('image_path', 1000)->nullable();
            $table->string('certificate_file_path', 1000)->nullable();
            $table->string('tuv_certificate_path', 1000)->nullable();

            $table->text('notes')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Foreign keys
            $table->foreign('category_id')->references('id')->on('tracker_categories');

            // Indexes
            $table->index('category_key', 'idx_tr_category_key');
            $table->index('status', 'idx_tr_status');
            $table->index('is_overdue', 'idx_tr_is_overdue');
            $table->index('is_tuv_overdue', 'idx_tr_is_tuv_overdue');
            $table->index('next_internal_inspection_date', 'idx_tr_next_insp');
            $table->index('tuv_expiry_date', 'idx_tr_tuv_expiry');
            $table->index('certificate_expiry', 'idx_tr_cert_expiry');
            $table->index('plate_number', 'idx_tr_plate');
            $table->index('serial_number', 'idx_tr_serial');
            $table->index('import_batch_id', 'idx_tr_import_batch');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tracker_records');
    }
};
