<?php

namespace Database\Seeders;

use App\Models\WorkLine;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class WorkLineSeeder extends Seeder
{
    public function run(): void
    {
        $lines = [
            ['name' => 'Civil Works',       'slug' => 'civil-works',       'color' => '#3b82f6', 'description' => 'Civil and earthwork activities'],
            ['name' => 'MEP',               'slug' => 'mep',               'color' => '#10b981', 'description' => 'Mechanical, Electrical & Plumbing'],
            ['name' => 'Structural',        'slug' => 'structural',        'color' => '#f59e0b', 'description' => 'Structural steel and concrete works'],
            ['name' => 'Finishing',          'slug' => 'finishing',         'color' => '#8b5cf6', 'description' => 'Interior and exterior finishing'],
            ['name' => 'Landscaping',        'slug' => 'landscaping',       'color' => '#22c55e', 'description' => 'Landscaping and irrigation works'],
            ['name' => 'Infrastructure',     'slug' => 'infrastructure',    'color' => '#ef4444', 'description' => 'Roads, utilities, and infrastructure'],
            ['name' => 'Temporary Works',    'slug' => 'temporary-works',   'color' => '#ec4899', 'description' => 'Scaffolding, shoring, and temporary structures'],
        ];

        foreach ($lines as $i => $line) {
            WorkLine::updateOrCreate(
                ['slug' => $line['slug']],
                [
                    'id' => (string) Str::uuid(),
                    'name' => $line['name'],
                    'description' => $line['description'],
                    'color' => $line['color'],
                    'sort_order' => $i + 1,
                    'is_active' => true,
                ],
            );
        }

        $this->command->info('Seeded ' . count($lines) . ' work lines.');
    }
}
