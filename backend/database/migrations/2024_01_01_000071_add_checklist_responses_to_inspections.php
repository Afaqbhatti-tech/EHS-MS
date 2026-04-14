<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('checklist_inspections', function (Blueprint $table) {
            $table->json('checklist_responses')->nullable()->after('notes');
            $table->boolean('defect_found')->default(false)->after('checklist_responses');
            $table->text('defect_detail')->nullable()->after('defect_found');
        });
    }

    public function down(): void
    {
        Schema::table('checklist_inspections', function (Blueprint $table) {
            $table->dropColumn(['checklist_responses', 'defect_found', 'defect_detail']);
        });
    }
};
