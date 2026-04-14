<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Table 1: contractors ──────────────────────────────────
        if (! Schema::hasTable('contractors')) {
            Schema::create('contractors', function (Blueprint $table) {
                $table->id();
                $table->string('contractor_code', 30)->unique();

                // A: Company Identity
                $table->string('contractor_name', 500);
                $table->string('registered_company_name', 500)->nullable();
                $table->string('trade_name', 300)->nullable();
                $table->string('company_type', 200);
                $table->string('scope_of_work', 500);
                $table->text('description')->nullable();
                $table->string('registration_number', 200)->nullable();
                $table->string('tax_number', 200)->nullable();
                $table->string('country', 100)->nullable()->default('Saudi Arabia');
                $table->string('city', 100)->nullable();
                $table->text('address')->nullable();

                // B: Primary Contact (denormalized)
                $table->string('primary_contact_name', 255)->nullable();
                $table->string('primary_contact_designation', 200)->nullable();
                $table->string('primary_contact_phone', 100)->nullable();
                $table->string('primary_contact_email', 255)->nullable();
                $table->string('alternate_contact', 255)->nullable();
                $table->string('emergency_contact_number', 100)->nullable();

                // C: Operational Details
                $table->string('site', 255)->nullable();
                $table->string('project', 255)->nullable();
                $table->string('area', 200)->nullable();
                $table->string('zone', 200)->nullable();
                $table->string('department', 200)->nullable();
                $table->string('assigned_supervisor', 255)->nullable();
                $table->char('assigned_supervisor_id', 36)->nullable();
                $table->date('contract_start_date')->nullable();
                $table->date('contract_end_date')->nullable();

                // D: Workforce
                $table->integer('total_workforce')->nullable()->default(0);
                $table->integer('skilled_workers_count')->nullable()->default(0);
                $table->integer('unskilled_workers_count')->nullable()->default(0);
                $table->integer('supervisors_count')->nullable()->default(0);
                $table->integer('operators_count')->nullable()->default(0);
                $table->integer('drivers_count')->nullable()->default(0);
                $table->integer('safety_staff_count')->nullable()->default(0);
                $table->integer('current_site_headcount')->nullable()->default(0);
                $table->date('mobilized_date')->nullable();
                $table->date('demobilized_date')->nullable();

                // E: Status & Compliance
                $table->enum('contractor_status', [
                    'Draft', 'Under Review', 'Approved', 'Active',
                    'Inactive', 'Suspended', 'Expired', 'Rejected', 'Blacklisted',
                ])->default('Draft');
                $table->enum('compliance_status', [
                    'Compliant', 'Partially Compliant', 'Non-Compliant',
                    'Under Review', 'Suspended',
                ])->default('Under Review');
                $table->boolean('is_active')->default(false);
                $table->boolean('is_suspended')->default(false);

                // Denormalized expiry flags
                $table->boolean('has_expired_documents')->default(false);
                $table->boolean('has_expiring_documents')->default(false);
                $table->date('next_expiry_date')->nullable();

                // Denormalized counts
                $table->integer('document_count')->default(0);
                $table->integer('contact_count')->default(0);

                $table->text('notes')->nullable();
                $table->char('created_by', 36)->nullable();
                $table->char('updated_by', 36)->nullable();
                $table->string('approved_by', 255)->nullable();
                $table->char('approved_by_id', 36)->nullable();
                $table->timestamp('approved_at')->nullable();
                $table->timestamp('suspended_at')->nullable();
                $table->text('suspension_reason')->nullable();

                $table->timestamps();
                $table->softDeletes();

                // Indexes
                $table->index('contractor_status', 'idx_con_status');
                $table->index('compliance_status', 'idx_con_compliance');
                $table->index('company_type', 'idx_con_type');
                $table->index('site', 'idx_con_site');
                $table->index('is_active', 'idx_con_active');
                $table->index('is_suspended', 'idx_con_suspended');
                $table->index('next_expiry_date', 'idx_con_expiry');
                $table->index('has_expired_documents', 'idx_con_expired_doc');

                // Foreign keys
                $table->foreign('assigned_supervisor_id')->references('id')->on('users')->nullOnDelete();
                $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
                $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();
                $table->foreign('approved_by_id')->references('id')->on('users')->nullOnDelete();
            });
        }

        // ── Table 2: contractor_contacts ──────────────────────────
        if (! Schema::hasTable('contractor_contacts')) {
            Schema::create('contractor_contacts', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('contractor_id');
                $table->string('name', 255);
                $table->string('designation', 200)->nullable();
                $table->string('role', 200)->nullable();
                $table->string('phone', 100)->nullable();
                $table->string('email', 255)->nullable();
                $table->string('id_number', 100)->nullable();
                $table->boolean('is_primary_contact')->default(false);
                $table->boolean('is_site_supervisor')->default(false);
                $table->boolean('is_safety_rep')->default(false);
                $table->boolean('is_emergency_contact')->default(false);
                $table->enum('status', ['Active', 'Inactive'])->default('Active');
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index('contractor_id', 'idx_cc_contractor');
                $table->index('is_primary_contact', 'idx_cc_primary');
                $table->foreign('contractor_id')->references('id')->on('contractors')->cascadeOnDelete();
            });
        }

        // ── Table 3: contractor_documents ─────────────────────────
        if (! Schema::hasTable('contractor_documents')) {
            Schema::create('contractor_documents', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('contractor_id');
                $table->string('document_type', 200);
                $table->string('document_number', 300)->nullable();
                $table->date('issue_date')->nullable();
                $table->date('expiry_date')->nullable();
                $table->string('issued_by', 255)->nullable();
                $table->string('file_path', 1000)->nullable();
                $table->string('original_name', 500)->nullable();
                $table->string('file_type', 50)->nullable();
                $table->integer('file_size_kb')->nullable();
                $table->enum('status', [
                    'Valid', 'Expiring Soon', 'Expired', 'Under Review', 'Rejected',
                ])->default('Under Review');
                $table->enum('verification_status', [
                    'Pending', 'Verified', 'Rejected', 'Not Required',
                ])->default('Pending');
                $table->string('verified_by', 255)->nullable();
                $table->char('verified_by_id', 36)->nullable();
                $table->date('verified_date')->nullable();
                $table->text('remarks')->nullable();
                $table->char('uploaded_by', 36)->nullable();
                $table->string('uploaded_by_name', 255)->nullable();
                $table->timestamps();

                $table->index('contractor_id', 'idx_cd_contractor');
                $table->index('document_type', 'idx_cd_type');
                $table->index('status', 'idx_cd_status');
                $table->index('expiry_date', 'idx_cd_expiry');
                $table->index('verification_status', 'idx_cd_verified');
                $table->foreign('contractor_id')->references('id')->on('contractors')->cascadeOnDelete();
                $table->foreign('verified_by_id')->references('id')->on('users')->nullOnDelete();
                $table->foreign('uploaded_by')->references('id')->on('users')->nullOnDelete();
            });
        }

        // ── Table 4: contractor_logs ──────────────────────────────
        if (! Schema::hasTable('contractor_logs')) {
            Schema::create('contractor_logs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('contractor_id');
                $table->string('action', 200);
                $table->string('from_status', 100)->nullable();
                $table->string('to_status', 100)->nullable();
                $table->char('performed_by', 36)->nullable();
                $table->string('performed_by_name', 255)->nullable();
                $table->string('performed_by_role', 100)->nullable();
                $table->text('description')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->index('contractor_id', 'idx_cl_contractor');
                $table->index('action', 'idx_cl_action');
                $table->foreign('contractor_id')->references('id')->on('contractors')->cascadeOnDelete();
                $table->foreign('performed_by')->references('id')->on('users')->nullOnDelete();
            });
        }

        // ── Table 5: contractor_module_links ──────────────────────
        if (! Schema::hasTable('contractor_module_links')) {
            Schema::create('contractor_module_links', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('contractor_id');
                $table->string('module_type', 100);
                $table->unsignedBigInteger('module_id');
                $table->string('module_code', 100)->nullable();
                $table->string('module_title', 500)->nullable();
                $table->date('link_date')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->index('contractor_id', 'idx_cml_contractor');
                $table->index(['module_type', 'module_id'], 'idx_cml_module');
                $table->foreign('contractor_id')->references('id')->on('contractors')->cascadeOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('contractor_module_links');
        Schema::dropIfExists('contractor_logs');
        Schema::dropIfExists('contractor_documents');
        Schema::dropIfExists('contractor_contacts');
        Schema::dropIfExists('contractors');
    }
};
