<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop the old basic table and rebuild completely
        Schema::dropIfExists('waste_manifests');

        Schema::create('waste_manifests', function (Blueprint $table) {
            $table->id();

            $table->string('manifest_code', 30)->unique();
            $table->string('manifest_number', 200)->nullable();
            $table->date('manifest_date');
            $table->date('dispatch_date')->nullable();
            $table->time('dispatch_time')->nullable();
            $table->enum('priority', ['Normal', 'Urgent', 'Critical'])->default('Normal');
            $table->text('notes')->nullable();

            // Status workflow
            $table->enum('status', [
                'Draft', 'Prepared', 'Ready for Dispatch',
                'Dispatched', 'In Transit', 'Received', 'Completed',
                'Cancelled', 'Rejected', 'Under Review',
            ])->default('Draft');

            // A: Source / Generator
            $table->string('source_site', 255)->nullable();
            $table->string('source_project', 255)->nullable();
            $table->string('source_area', 200)->nullable();
            $table->string('source_zone', 200)->nullable();
            $table->string('source_department', 200)->nullable();
            $table->text('generating_activity')->nullable();
            $table->string('generator_company', 255)->nullable();
            $table->string('responsible_person', 255)->nullable();
            $table->char('responsible_person_id', 36)->nullable();
            $table->string('contact_number', 100)->nullable();

            // B: Waste Identification
            $table->string('waste_type', 200);
            $table->enum('waste_category', [
                'Hazardous', 'Non-Hazardous', 'Recyclable', 'Special Waste', 'Inert Waste',
            ]);
            $table->text('waste_description')->nullable();
            $table->string('hazard_classification', 200)->nullable();
            $table->string('waste_code', 100)->nullable();
            $table->string('un_code', 50)->nullable();
            $table->string('physical_form', 100)->nullable();
            $table->text('chemical_composition')->nullable();
            $table->text('compatibility_notes')->nullable();
            $table->text('special_handling')->nullable();

            // C: Quantity & Packaging
            $table->decimal('quantity', 12, 4);
            $table->string('unit', 50);
            $table->integer('container_count')->nullable();
            $table->string('packaging_type', 200)->nullable();
            $table->text('container_ids')->nullable();
            $table->decimal('gross_weight_kg', 10, 3)->nullable();
            $table->decimal('net_weight_kg', 10, 3)->nullable();
            $table->string('temporary_storage_location', 255)->nullable();
            $table->text('storage_condition')->nullable();

            // D: Transporter Details
            $table->string('transporter_name', 255)->nullable();
            $table->string('transporter_license_no', 200)->nullable();
            $table->string('driver_name', 255)->nullable();
            $table->string('driver_contact', 100)->nullable();
            $table->string('vehicle_number', 100)->nullable();
            $table->string('vehicle_type', 100)->nullable();
            $table->string('transport_permit_number', 200)->nullable();
            $table->string('handover_by', 255)->nullable();
            $table->date('handover_date')->nullable();
            $table->time('handover_time')->nullable();
            $table->date('transport_start_date')->nullable();
            $table->date('expected_delivery_date')->nullable();
            $table->text('handover_note')->nullable();

            // E: Disposal / Treatment Facility
            $table->string('facility_name', 255)->nullable();
            $table->string('facility_license_no', 200)->nullable();
            $table->text('facility_address')->nullable();
            $table->string('treatment_method', 200)->nullable();
            $table->string('receiving_person', 255)->nullable();
            $table->date('receiving_date')->nullable();
            $table->time('receiving_time')->nullable();
            $table->string('final_destination_status', 200)->nullable();
            $table->string('disposal_certificate_no', 200)->nullable();
            $table->text('final_notes')->nullable();

            // F: Compliance / Legal
            $table->string('regulatory_reference', 500)->nullable();
            $table->string('permit_license_reference', 500)->nullable();
            $table->enum('manifest_compliance_status', [
                'Compliant', 'Non-Compliant', 'Pending', 'N/A',
            ])->default('Pending');
            $table->boolean('hazardous_waste_compliance')->default(true);
            $table->boolean('special_approval_required')->default(false);
            $table->text('special_approval_note')->nullable();
            $table->text('legal_remarks')->nullable();

            // Cross-module links
            $table->unsignedBigInteger('linked_waste_record_id')->nullable();
            $table->unsignedBigInteger('linked_env_incident_id')->nullable();
            $table->unsignedBigInteger('linked_incident_id')->nullable();
            $table->unsignedBigInteger('linked_inspection_id')->nullable();
            $table->unsignedBigInteger('linked_compliance_id')->nullable();

            // Workflow control
            $table->char('created_by', 36)->nullable();
            $table->char('updated_by', 36)->nullable();
            $table->string('reviewed_by', 255)->nullable();
            $table->string('approved_by', 255)->nullable();
            $table->char('dispatched_by', 36)->nullable();
            $table->timestamp('dispatched_at')->nullable();
            $table->string('received_by', 255)->nullable();
            $table->timestamp('received_at')->nullable();
            $table->char('completed_by', 36)->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('cancellation_reason')->nullable();

            // Usage tracking
            $table->boolean('is_delayed')->default(false);

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('status', 'idx_wm_status');
            $table->index('waste_type', 'idx_wm_type');
            $table->index('waste_category', 'idx_wm_category');
            $table->index('dispatch_date', 'idx_wm_dispatch');
            $table->index('source_area', 'idx_wm_source');
            $table->index('transporter_name', 'idx_wm_transporter');
            $table->index('facility_name', 'idx_wm_facility');
            $table->index('linked_waste_record_id', 'idx_wm_linked_wst');
            $table->index('is_delayed', 'idx_wm_delayed');

            // Foreign keys
            $table->foreign('responsible_person_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('dispatched_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('completed_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('linked_waste_record_id')->references('id')->on('waste_records')->nullOnDelete();
            $table->foreign('linked_env_incident_id')->references('id')->on('environmental_incidents')->nullOnDelete();
            $table->foreign('linked_inspection_id')->references('id')->on('environmental_inspections')->nullOnDelete();
            $table->foreign('linked_compliance_id')->references('id')->on('environmental_compliance_register')->nullOnDelete();
        });

        // Table 2: waste_manifest_attachments
        Schema::create('waste_manifest_attachments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('waste_manifest_id');
            $table->string('file_path', 1000);
            $table->string('original_name', 500)->nullable();
            $table->string('file_type', 50)->nullable();
            $table->integer('file_size_kb')->nullable();
            $table->string('attachment_category', 200)->nullable();
            $table->string('caption', 500)->nullable();
            $table->text('description')->nullable();
            $table->char('uploaded_by', 36)->nullable();
            $table->string('uploaded_by_name', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('waste_manifest_id', 'idx_wma_manifest');
            $table->index('attachment_category', 'idx_wma_category');

            $table->foreign('waste_manifest_id')->references('id')->on('waste_manifests')->cascadeOnDelete();
            $table->foreign('uploaded_by')->references('id')->on('users')->nullOnDelete();
        });

        // Table 3: waste_manifest_logs (immutable audit trail)
        Schema::create('waste_manifest_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('waste_manifest_id');
            $table->string('action', 200);
            $table->string('from_status', 100)->nullable();
            $table->string('to_status', 100)->nullable();
            $table->char('performed_by', 36)->nullable();
            $table->string('performed_by_name', 255)->nullable();
            $table->string('performed_by_role', 100)->nullable();
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('waste_manifest_id', 'idx_wml_manifest');
            $table->index('action', 'idx_wml_action');

            $table->foreign('waste_manifest_id')->references('id')->on('waste_manifests')->cascadeOnDelete();
            $table->foreign('performed_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('waste_manifest_logs');
        Schema::dropIfExists('waste_manifest_attachments');
        Schema::dropIfExists('waste_manifests');
    }
};
