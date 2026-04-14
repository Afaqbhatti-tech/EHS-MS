<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tracker_records', function (Blueprint $table) {
            $table->string('checklist_item_id')->nullable()->after('import_batch_id');
            $table->index('checklist_item_id');
        });
    }

    public function down(): void
    {
        Schema::table('tracker_records', function (Blueprint $table) {
            $table->dropIndex(['checklist_item_id']);
            $table->dropColumn('checklist_item_id');
        });
    }
};
