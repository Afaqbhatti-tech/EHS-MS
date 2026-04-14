<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tracker_inspection_logs', function (Blueprint $table) {
            $table->json('checklist_data')->nullable()->after('visual_condition_notes');
        });
    }

    public function down(): void
    {
        Schema::table('tracker_inspection_logs', function (Blueprint $table) {
            $table->dropColumn('checklist_data');
        });
    }
};
