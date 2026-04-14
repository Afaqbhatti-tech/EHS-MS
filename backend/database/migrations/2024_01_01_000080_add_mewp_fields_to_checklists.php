<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('checklist_items', function (Blueprint $table) {
            if (!Schema::hasColumn('checklist_items', 'third_party_cert_number')) {
                $table->string('third_party_cert_number', 200)->nullable()->after('certificate_expiry');
            }
            if (!Schema::hasColumn('checklist_items', 'third_party_cert_expiry')) {
                $table->date('third_party_cert_expiry')->nullable()->after('third_party_cert_number');
            }
            if (!Schema::hasColumn('checklist_items', 'third_party_inspector')) {
                $table->string('third_party_inspector', 255)->nullable()->after('third_party_cert_expiry');
            }
            if (!Schema::hasColumn('checklist_items', 'third_party_company')) {
                $table->string('third_party_company', 200)->nullable()->after('third_party_inspector');
            }
            if (!Schema::hasColumn('checklist_items', 'service_interval_hours')) {
                $table->integer('service_interval_hours')->nullable()->after('next_service_date');
            }
            if (!Schema::hasColumn('checklist_items', 'last_condition_rating')) {
                $table->tinyInteger('last_condition_rating')->nullable()->after('service_interval_hours');
            }
            if (!Schema::hasColumn('checklist_items', 'requires_authorization')) {
                $table->boolean('requires_authorization')->default(false)->after('last_condition_rating');
            }
            if (!Schema::hasColumn('checklist_items', 'authorized_operators')) {
                $table->text('authorized_operators')->nullable()->after('requires_authorization');
            }
            if (!Schema::hasColumn('checklist_items', 'defect_closed_date')) {
                $table->date('defect_closed_date')->nullable()->after('defect_reported_date');
            }
            if (!Schema::hasColumn('checklist_items', 'mewp_type')) {
                $table->string('mewp_type', 50)->nullable()->after('item_type');
            }
        });

        Schema::table('checklist_inspections', function (Blueprint $table) {
            if (!Schema::hasColumn('checklist_inspections', 'is_third_party')) {
                $table->boolean('is_third_party')->default(false)->after('notes');
            }
            if (!Schema::hasColumn('checklist_inspections', 'third_party_cert_number')) {
                $table->string('third_party_cert_number', 200)->nullable()->after('is_third_party');
            }
            if (!Schema::hasColumn('checklist_inspections', 'third_party_cert_expiry')) {
                $table->date('third_party_cert_expiry')->nullable()->after('third_party_cert_number');
            }
            if (!Schema::hasColumn('checklist_inspections', 'engine_hours_at_inspection')) {
                $table->decimal('engine_hours_at_inspection', 10, 2)->nullable()->after('third_party_cert_expiry');
            }
        });
    }

    public function down(): void
    {
        Schema::table('checklist_items', function (Blueprint $table) {
            $cols = [
                'third_party_cert_number', 'third_party_cert_expiry',
                'third_party_inspector', 'third_party_company',
                'service_interval_hours', 'last_condition_rating',
                'requires_authorization', 'authorized_operators',
                'defect_closed_date', 'mewp_type',
            ];
            foreach ($cols as $col) {
                if (Schema::hasColumn('checklist_items', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('checklist_inspections', function (Blueprint $table) {
            $cols = [
                'is_third_party', 'third_party_cert_number',
                'third_party_cert_expiry', 'engine_hours_at_inspection',
            ];
            foreach ($cols as $col) {
                if (Schema::hasColumn('checklist_inspections', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
