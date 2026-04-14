<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mockups', function (Blueprint $table) {
            $table->text('involved_candidates')->nullable()->after('notes');
            $table->text('manual_approved_by')->nullable()->after('involved_candidates');
        });
    }

    public function down(): void
    {
        Schema::table('mockups', function (Blueprint $table) {
            $table->dropColumn(['involved_candidates', 'manual_approved_by']);
        });
    }
};
