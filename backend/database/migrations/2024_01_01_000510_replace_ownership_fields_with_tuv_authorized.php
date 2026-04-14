<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('equipment_register', function (Blueprint $table) {
            $table->string('tuv_authorized', 3)->default('no')->after('company_name');
        });

        Schema::table('equipment_register', function (Blueprint $table) {
            $table->dropColumn(['equipment_owner', 'authorized_by', 'approved_by']);
        });
    }

    public function down(): void
    {
        Schema::table('equipment_register', function (Blueprint $table) {
            $table->string('equipment_owner', 150)->nullable()->after('company_name');
            $table->string('authorized_by', 150)->nullable()->after('equipment_owner');
            $table->string('approved_by', 150)->nullable()->after('authorized_by');
        });

        Schema::table('equipment_register', function (Blueprint $table) {
            $table->dropColumn('tuv_authorized');
        });
    }
};
