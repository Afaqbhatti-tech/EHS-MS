<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    private array $phases = [
        ['name' => 'Pre Trim',   'color' => '#6366f1', 'description' => 'Pre-trim preparation phase'],
        ['name' => 'Trim',       'color' => '#8b5cf6', 'description' => 'Trim installation phase'],
        ['name' => 'Chases',     'color' => '#ec4899', 'description' => 'Chases and routing phase'],
        ['name' => 'Battery',    'color' => '#f59e0b', 'description' => 'Battery installation phase'],
        ['name' => 'Doors',      'color' => '#10b981', 'description' => 'Door fitting phase'],
        ['name' => 'Final line', 'color' => '#0ea5e9', 'description' => 'Final line completion phase'],
    ];

    public function up(): void
    {
        $maxOrder = DB::table('work_lines')->max('sort_order') ?? 0;

        foreach ($this->phases as $i => $phase) {
            $slug = Str::slug($phase['name']);

            // Skip if already exists
            if (DB::table('work_lines')->where('slug', $slug)->exists()) {
                continue;
            }

            DB::table('work_lines')->insert([
                'id'          => (string) Str::uuid(),
                'name'        => $phase['name'],
                'slug'        => $slug,
                'description' => $phase['description'],
                'color'       => $phase['color'],
                'sort_order'  => $maxOrder + $i + 1,
                'is_active'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);
        }
    }

    public function down(): void
    {
        $slugs = array_map(fn ($p) => Str::slug($p['name']), $this->phases);
        DB::table('work_lines')->whereIn('slug', $slugs)->delete();
    }
};
