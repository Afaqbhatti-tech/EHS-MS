<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProfessionSeeder extends Seeder
{
    public function run(): void
    {
        $professions = [
            ['name' => 'Rigger', 'category' => 'Lifting'],
            ['name' => 'Welder', 'category' => 'MEP'],
            ['name' => 'Electrician', 'category' => 'MEP'],
            ['name' => 'Scaffolder', 'category' => 'Civil'],
            ['name' => 'Mason', 'category' => 'Civil'],
            ['name' => 'Carpenter', 'category' => 'Civil'],
            ['name' => 'Plumber', 'category' => 'MEP'],
            ['name' => 'Painter', 'category' => 'Civil'],
            ['name' => 'Heavy Equipment Operator', 'category' => 'Machinery'],
            ['name' => 'Forklift Operator', 'category' => 'Machinery'],
            ['name' => 'Driver', 'category' => 'Machinery'],
            ['name' => 'Helper', 'category' => 'General'],
            ['name' => 'Labourer', 'category' => 'General'],
            ['name' => 'Safety Officer', 'category' => 'Safety'],
            ['name' => 'HSE Officer', 'category' => 'Safety'],
            ['name' => 'Foreman', 'category' => 'Supervision'],
            ['name' => 'Supervisor', 'category' => 'Supervision'],
            ['name' => 'Site Engineer', 'category' => 'Engineering'],
            ['name' => 'QC Inspector', 'category' => 'Quality'],
            ['name' => 'Surveyor', 'category' => 'Engineering'],
            ['name' => 'Storekeeper', 'category' => 'General'],
        ];

        foreach ($professions as $i => $p) {
            DB::table('professions')->updateOrInsert(
                ['name' => $p['name']],
                array_merge($p, ['sort_order' => $i, 'is_active' => true])
            );
        }
    }
}
