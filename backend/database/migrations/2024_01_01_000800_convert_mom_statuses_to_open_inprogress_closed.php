<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Convert old statuses to new ones
        // Draft → Open
        // Finalised → recalculated (In Progress if has open points, Closed otherwise)
        // Distributed → recalculated (In Progress if has open points, Closed otherwise)
        DB::table('moms')->where('status', 'Draft')->update(['status' => 'Open']);

        // For Finalised/Distributed, set based on open points
        DB::table('moms')
            ->whereIn('status', ['Finalised', 'Distributed'])
            ->where(function ($q) {
                $q->where('open_points', '>', 0)
                  ->orWhere('in_progress_points', '>', 0);
            })
            ->update(['status' => 'In Progress']);

        DB::table('moms')
            ->whereIn('status', ['Finalised', 'Distributed'])
            ->update(['status' => 'Closed']);

        // Also update default value
        DB::statement("ALTER TABLE moms ALTER COLUMN status SET DEFAULT 'Open'");
    }

    public function down(): void
    {
        DB::table('moms')->where('status', 'Open')->update(['status' => 'Draft']);
        DB::table('moms')->where('status', 'In Progress')->update(['status' => 'Finalised']);
        DB::table('moms')->where('status', 'Closed')->update(['status' => 'Distributed']);

        DB::statement("ALTER TABLE moms ALTER COLUMN status SET DEFAULT 'Draft'");
    }
};
