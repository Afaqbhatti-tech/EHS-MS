<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->string('dedup_key', 500)->nullable()->after('read_at');
            $table->unique('dedup_key', 'idx_notif_dedup');
            $table->index(['ref_module', 'ref_id'], 'idx_notif_module_ref');
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropUnique('idx_notif_dedup');
            $table->dropIndex('idx_notif_module_ref');
            $table->dropColumn('dedup_key');
        });
    }
};
