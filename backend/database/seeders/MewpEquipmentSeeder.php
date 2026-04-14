<?php

namespace Database\Seeders;

use App\Models\ChecklistCategory;
use App\Models\ChecklistItem;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class MewpEquipmentSeeder extends Seeder
{
    public function run(): void
    {
        $mewpCat = ChecklistCategory::where('key', 'mewp')->first();
        if (!$mewpCat) {
            $this->command->warn('MEWP category not found — skipping seeder.');
            return;
        }

        $items = [
            // 2 Scissor Lifts (1 overdue)
            [
                'name'                          => 'Genie GS-2632 Scissor Lift',
                'item_type'                     => 'Scissor Lift',
                'mewp_type'                     => 'scissor_lift',
                'plate_number'                  => 'SCL-001',
                'serial_number'                 => 'GS2632-4587',
                'make_model'                    => 'Genie GS-2632',
                'swl'                           => '227 kg',
                'engine_hours'                  => 3240.5,
                'health_condition'              => 'Good',
                'status'                        => 'Active',
                'onboarding_date'               => '2024-08-15',
                'last_internal_inspection_date' => now()->subDays(12)->toDateString(),
                'next_internal_inspection_date' => now()->subDays(5)->toDateString(),
                'third_party_cert_number'       => 'TPC-SCL-2024-0041',
                'third_party_cert_expiry'       => now()->addDays(120)->toDateString(),
                'third_party_inspector'         => 'Ahmad Al-Rashidi',
                'third_party_company'           => 'SGS Arabia',
                'location_area'                 => 'Zone A - Building 3',
                'assigned_to'                   => 'Mohammed Ibrahim',
            ],
            [
                'name'                          => 'JLG 3246ES Scissor Lift',
                'item_type'                     => 'Scissor Lift',
                'mewp_type'                     => 'scissor_lift',
                'plate_number'                  => 'SCL-002',
                'serial_number'                 => 'JLG3246-9823',
                'make_model'                    => 'JLG 3246ES',
                'swl'                           => '318 kg',
                'engine_hours'                  => 1820.0,
                'health_condition'              => 'Good',
                'status'                        => 'Active',
                'onboarding_date'               => '2024-10-01',
                'last_internal_inspection_date' => now()->subDays(4)->toDateString(),
                'next_internal_inspection_date' => now()->addDays(3)->toDateString(),
                'third_party_cert_number'       => 'TPC-SCL-2024-0055',
                'third_party_cert_expiry'       => now()->addDays(90)->toDateString(),
                'third_party_inspector'         => 'Khalid Hassan',
                'third_party_company'           => 'Bureau Veritas',
                'location_area'                 => 'Zone B - Platform',
                'assigned_to'                   => 'Ali Saeed',
            ],

            // 2 Forklifts (1 with open defect)
            [
                'name'                          => 'Toyota 8FBN25 Forklift',
                'item_type'                     => 'Forklift',
                'mewp_type'                     => 'forklift',
                'plate_number'                  => 'FLT-001',
                'serial_number'                 => 'TOY8FBN-2241',
                'make_model'                    => 'Toyota 8FBN25',
                'swl'                           => '2500 kg',
                'engine_hours'                  => 5612.5,
                'health_condition'              => 'Good',
                'status'                        => 'Active',
                'onboarding_date'               => '2024-06-01',
                'last_internal_inspection_date' => now()->subDays(1)->toDateString(),
                'next_internal_inspection_date' => now()->toDateString(),
                'third_party_cert_number'       => 'TPC-FLT-2024-0033',
                'third_party_cert_expiry'       => now()->addDays(200)->toDateString(),
                'third_party_inspector'         => 'Fahad Al-Otaibi',
                'third_party_company'           => 'TUV Middle East',
                'location_area'                 => 'Warehouse',
                'assigned_to'                   => 'Saleh Al-Qahtani',
            ],
            [
                'name'                          => 'Hyster H50FT Forklift',
                'item_type'                     => 'Forklift',
                'mewp_type'                     => 'forklift',
                'plate_number'                  => 'FLT-002',
                'serial_number'                 => 'HYS-H50FT-6741',
                'make_model'                    => 'Hyster H50FT',
                'swl'                           => '2300 kg',
                'engine_hours'                  => 8900.0,
                'health_condition'              => 'Out of Service',
                'status'                        => 'Out of Service',
                'has_open_defect'               => true,
                'defect_description'            => 'Hydraulic mast leak detected during pre-use check. Right-side cylinder seal failure.',
                'defect_reported_date'          => now()->subDays(2)->toDateString(),
                'onboarding_date'               => '2024-03-15',
                'last_internal_inspection_date' => now()->subDays(2)->toDateString(),
                'next_internal_inspection_date' => now()->subDays(1)->toDateString(),
                'third_party_cert_number'       => 'TPC-FLT-2024-0018',
                'third_party_cert_expiry'       => now()->addDays(45)->toDateString(),
                'third_party_inspector'         => 'Fahad Al-Otaibi',
                'third_party_company'           => 'TUV Middle East',
                'location_area'                 => 'Maintenance Bay',
                'assigned_to'                   => 'Tariq Abdullah',
            ],

            // 2 Telehandlers (1 cert expiring soon)
            [
                'name'                          => 'JCB 535-140 Telehandler',
                'item_type'                     => 'Telehandler',
                'mewp_type'                     => 'telehandler',
                'plate_number'                  => 'TLH-001',
                'serial_number'                 => 'JCB535-7789',
                'make_model'                    => 'JCB 535-140',
                'swl'                           => '3500 kg',
                'engine_hours'                  => 4200.0,
                'health_condition'              => 'Good',
                'status'                        => 'Active',
                'onboarding_date'               => '2024-07-10',
                'last_internal_inspection_date' => now()->subDays(1)->toDateString(),
                'next_internal_inspection_date' => now()->toDateString(),
                'third_party_cert_number'       => 'TPC-TLH-2024-0012',
                'third_party_cert_expiry'       => now()->addDays(300)->toDateString(),
                'third_party_inspector'         => 'Nasser Al-Malki',
                'third_party_company'           => 'Intertek',
                'location_area'                 => 'Zone C - Loading',
                'assigned_to'                   => 'Hamad Al-Shehri',
            ],
            [
                'name'                          => 'CAT TH408D Telehandler',
                'item_type'                     => 'Telehandler',
                'mewp_type'                     => 'telehandler',
                'plate_number'                  => 'TLH-002',
                'serial_number'                 => 'CAT408D-3321',
                'make_model'                    => 'CAT TH408D',
                'swl'                           => '4000 kg',
                'engine_hours'                  => 6780.0,
                'health_condition'              => 'Fair',
                'status'                        => 'Active',
                'onboarding_date'               => '2024-04-20',
                'last_internal_inspection_date' => now()->subDays(1)->toDateString(),
                'next_internal_inspection_date' => now()->toDateString(),
                'third_party_cert_number'       => 'TPC-TLH-2024-0008',
                'third_party_cert_expiry'       => now()->addDays(25)->toDateString(), // expiring soon
                'third_party_inspector'         => 'Nasser Al-Malki',
                'third_party_company'           => 'Intertek',
                'location_area'                 => 'Zone A - Material Yard',
                'assigned_to'                   => 'Youssef Adel',
            ],

            // 2 Boom Lifts (1 due soon, 1 current)
            [
                'name'                          => 'JLG 660SJ Boom Lift',
                'item_type'                     => 'Boom Lift',
                'mewp_type'                     => 'boom_lift',
                'plate_number'                  => 'BML-001',
                'serial_number'                 => 'JLG660-5542',
                'make_model'                    => 'JLG 660SJ',
                'swl'                           => '230 kg',
                'engine_hours'                  => 2100.0,
                'health_condition'              => 'Good',
                'status'                        => 'Active',
                'onboarding_date'               => '2024-09-01',
                'last_internal_inspection_date' => now()->subDays(6)->toDateString(),
                'next_internal_inspection_date' => now()->addDays(1)->toDateString(), // due soon
                'third_party_cert_number'       => 'TPC-BML-2024-0029',
                'third_party_cert_expiry'       => now()->addDays(150)->toDateString(),
                'third_party_inspector'         => 'Ahmad Al-Rashidi',
                'third_party_company'           => 'SGS Arabia',
                'location_area'                 => 'Zone B - Facade',
                'assigned_to'                   => 'Omar Khaled',
            ],
            [
                'name'                          => 'Genie Z-45/25J Boom Lift',
                'item_type'                     => 'Boom Lift',
                'mewp_type'                     => 'boom_lift',
                'plate_number'                  => 'BML-002',
                'serial_number'                 => 'GZ4525-8817',
                'make_model'                    => 'Genie Z-45/25J',
                'swl'                           => '227 kg',
                'engine_hours'                  => 1550.0,
                'health_condition'              => 'Good',
                'status'                        => 'Active',
                'onboarding_date'               => '2024-11-15',
                'last_internal_inspection_date' => now()->subDays(3)->toDateString(),
                'next_internal_inspection_date' => now()->addDays(4)->toDateString(),
                'third_party_cert_number'       => 'TPC-BML-2024-0037',
                'third_party_cert_expiry'       => now()->addDays(170)->toDateString(),
                'third_party_inspector'         => 'Khalid Hassan',
                'third_party_company'           => 'Bureau Veritas',
                'location_area'                 => 'Zone C - Steel Structure',
                'assigned_to'                   => 'Waleed Nasser',
            ],

            // 1 Man Lift (current)
            [
                'name'                          => 'JLG 20MVL Man Lift',
                'item_type'                     => 'Man Lift',
                'mewp_type'                     => 'man_lift',
                'plate_number'                  => 'MNL-001',
                'serial_number'                 => 'JLG20MVL-3345',
                'make_model'                    => 'JLG 20MVL',
                'swl'                           => '159 kg',
                'engine_hours'                  => 980.0,
                'health_condition'              => 'Good',
                'status'                        => 'Active',
                'onboarding_date'               => '2025-01-10',
                'last_internal_inspection_date' => now()->subDays(5)->toDateString(),
                'next_internal_inspection_date' => now()->addDays(2)->toDateString(),
                'third_party_cert_number'       => 'TPC-MNL-2025-0002',
                'third_party_cert_expiry'       => now()->addDays(175)->toDateString(),
                'third_party_inspector'         => 'Ahmad Al-Rashidi',
                'third_party_company'           => 'SGS Arabia',
                'location_area'                 => 'Zone A - Electrical Room',
                'assigned_to'                   => 'Faisal Majed',
            ],

            // 1 Scissor Lift (Out of Service, failed last check)
            [
                'name'                          => 'Skyjack SJ6832RT Scissor Lift',
                'item_type'                     => 'Scissor Lift',
                'mewp_type'                     => 'scissor_lift',
                'plate_number'                  => 'SCL-003',
                'serial_number'                 => 'SJ6832-1198',
                'make_model'                    => 'Skyjack SJ6832RT',
                'swl'                           => '680 kg',
                'engine_hours'                  => 4500.0,
                'health_condition'              => 'Out of Service',
                'status'                        => 'Out of Service',
                'onboarding_date'               => '2024-05-20',
                'last_internal_inspection_date' => now()->subDays(3)->toDateString(),
                'next_internal_inspection_date' => now()->subDays(3)->toDateString(),
                'third_party_cert_number'       => 'TPC-SCL-2024-0019',
                'third_party_cert_expiry'       => now()->subDays(10)->toDateString(), // expired
                'third_party_inspector'         => 'Khalid Hassan',
                'third_party_company'           => 'Bureau Veritas',
                'location_area'                 => 'Maintenance Bay',
                'has_open_defect'               => true,
                'defect_description'            => 'Platform guardrail bent and toe-board missing after impact. Emergency descent not functioning.',
                'defect_reported_date'          => now()->subDays(3)->toDateString(),
            ],
        ];

        foreach ($items as $data) {
            $data['category_id']  = $mewpCat->id;
            $data['category_key'] = 'mewp';
            ChecklistItem::create($data);
        }

        $this->command->info('MEWP equipment seeded: ' . count($items) . ' items');
    }
}
