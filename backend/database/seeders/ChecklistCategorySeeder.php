<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ChecklistCategory;

class ChecklistCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'key' => 'mewp', 'label' => 'MEWP', 'full_label' => 'Mobile Elevating Work Platform',
                'icon' => 'crane', 'color' => '#7C3AED', 'light_color' => '#EDE9FE', 'text_color' => '#5B21B6',
                'has_plate' => true, 'has_swl' => true, 'has_cert' => true,
                'insp_freq_days' => 7, 'description' => 'Scissor lifts, boom lifts, cherry pickers',
                'sort_order' => 1,
            ],
            [
                'key' => 'full_body_harness', 'label' => 'Full Body Harness', 'full_label' => 'Full Body Harness & Fall Arrest Equipment',
                'icon' => 'shield', 'color' => '#DC2626', 'light_color' => '#FEE2E2', 'text_color' => '#991B1B',
                'has_plate' => false, 'has_swl' => false, 'has_cert' => false,
                'insp_freq_days' => 7, 'description' => 'Safety harnesses, lanyards, connectors, energy absorbers, anchor devices',
                'sort_order' => 10,
            ],
            [
                'key' => 'fire_extinguisher', 'label' => 'Fire Extinguishers', 'full_label' => 'Fire Extinguisher & Suppression Equipment',
                'icon' => 'flame', 'color' => '#EA580C', 'light_color' => '#FFF7ED', 'text_color' => '#9A3412',
                'has_plate' => false, 'has_swl' => false, 'has_cert' => true,
                'insp_freq_days' => 30, 'description' => 'All types of fire suppression equipment including CO2, dry powder, foam, water',
                'sort_order' => 20,
            ],
            [
                'key' => 'ladder', 'label' => 'Ladders', 'full_label' => 'Ladders & Step Platforms',
                'icon' => 'align-justify', 'color' => '#0369A1', 'light_color' => '#E0F2FE', 'text_color' => '#075985',
                'has_plate' => false, 'has_swl' => true, 'has_cert' => false,
                'insp_freq_days' => 7, 'description' => 'Step ladders, extension ladders, roof ladders, podium steps',
                'sort_order' => 30,
            ],
            [
                'key' => 'vending_machine', 'label' => 'Vending Machines', 'full_label' => 'Vending & Dispensing Equipment',
                'icon' => 'shopping-bag', 'color' => '#7C3AED', 'light_color' => '#EDE9FE', 'text_color' => '#5B21B6',
                'has_plate' => false, 'has_swl' => false, 'has_cert' => false,
                'insp_freq_days' => 30, 'description' => 'Site vending machines, water dispensers, refreshment equipment',
                'sort_order' => 35,
            ],
            [
                'key' => 'cutter', 'label' => 'Cutters', 'full_label' => 'Cutting Tools & Equipment',
                'icon' => 'scissors', 'color' => '#0F766E', 'light_color' => '#CCFBF1', 'text_color' => '#134E4A',
                'has_plate' => false, 'has_swl' => false, 'has_cert' => false,
                'insp_freq_days' => 7, 'description' => 'Angle grinder discs, pipe cutters, bolt cutters, cable cutters',
                'sort_order' => 40,
            ],
            [
                'key' => 'grinder', 'label' => 'Grinders', 'full_label' => 'Angle Grinders & Bench Grinders',
                'icon' => 'settings', 'color' => '#B45309', 'light_color' => '#FEF3C7', 'text_color' => '#92400E',
                'has_plate' => false, 'has_swl' => false, 'has_cert' => false,
                'insp_freq_days' => 7, 'description' => 'Angle grinders, bench grinders, die grinders, surface grinders',
                'sort_order' => 45,
            ],
            [
                'key' => 'lifting_gear', 'label' => 'Hooks & Lifting Gear', 'full_label' => 'Hooks, Shackles & Rigging Hardware',
                'icon' => 'link', 'color' => '#1D4ED8', 'light_color' => '#DBEAFE', 'text_color' => '#1E40AF',
                'has_plate' => false, 'has_swl' => true, 'has_cert' => true,
                'insp_freq_days' => 7, 'description' => 'Crane hooks, shackles, eye bolts, swivels, turnbuckles, rigging hardware',
                'sort_order' => 50,
            ],
            [
                'key' => 'generator', 'label' => 'Generators', 'full_label' => 'Portable & Fixed Generators',
                'icon' => 'zap', 'color' => '#4F46E5', 'light_color' => '#E0E7FF', 'text_color' => '#3730A3',
                'has_plate' => true, 'has_swl' => false, 'has_cert' => false,
                'insp_freq_days' => 7, 'description' => 'Portable generators, diesel generators, standby power equipment',
                'sort_order' => 55,
            ],
            [
                'key' => 'spill_kit', 'label' => 'Spill Kits', 'full_label' => 'Spill Response Kits & Containment',
                'icon' => 'droplets', 'color' => '#065F46', 'light_color' => '#D1FAE5', 'text_color' => '#064E3B',
                'has_plate' => false, 'has_swl' => false, 'has_cert' => false,
                'insp_freq_days' => 30, 'description' => 'Oil spill kits, chemical spill kits, absorbent materials, containment booms',
                'sort_order' => 60,
            ],
            [
                'key' => 'first_aid_kit', 'label' => 'First Aid Kits', 'full_label' => 'First Aid Kit',
                'icon' => 'plus-square', 'color' => '#BE185D', 'light_color' => '#FCE7F3', 'text_color' => '#9D174D',
                'has_plate' => false, 'has_swl' => false, 'has_cert' => false,
                'insp_freq_days' => 30, 'description' => 'First aid boxes, trauma kits, medical supplies',
                'sort_order' => 10,
            ],
            [
                'key' => 'vehicle', 'label' => 'Vehicles', 'full_label' => 'Vehicle / Mobile Plant',
                'icon' => 'truck', 'color' => '#374151', 'light_color' => '#F3F4F6', 'text_color' => '#1F2937',
                'has_plate' => true, 'has_swl' => false, 'has_cert' => true,
                'insp_freq_days' => 1, 'description' => 'Site vehicles, mobile plant, forklifts',
                'sort_order' => 11,
            ],
            [
                'key' => 'scaffold', 'label' => 'Scaffolding', 'full_label' => 'Scaffold Equipment',
                'icon' => 'grid', 'color' => '#92400E', 'light_color' => '#FEF3C7', 'text_color' => '#78350F',
                'has_plate' => false, 'has_swl' => false, 'has_cert' => false,
                'insp_freq_days' => 7, 'description' => 'Scaffold tubes, boards, couplers, base plates',
                'sort_order' => 12,
            ],
            [
                'key' => 'welding_equipment', 'label' => 'Welding Equipment', 'full_label' => 'Welding Machine & Accessories',
                'icon' => 'wrench', 'color' => '#9333EA', 'light_color' => '#F3E8FF', 'text_color' => '#6B21A8',
                'has_plate' => true, 'has_swl' => false, 'has_cert' => true,
                'insp_freq_days' => 7, 'description' => 'Arc welders, MIG/TIG machines, gas sets, welding leads',
                'sort_order' => 13,
            ],
            [
                'key' => 'crane', 'label' => 'Cranes', 'full_label' => 'Tower & Mobile Crane',
                'icon' => 'anchor', 'color' => '#1E3A5F', 'light_color' => '#DBEAFE', 'text_color' => '#1E3A5F',
                'has_plate' => true, 'has_swl' => true, 'has_cert' => true,
                'insp_freq_days' => 1, 'description' => 'Tower cranes, mobile cranes, overhead cranes, hoists',
                'sort_order' => 14,
            ],
            [
                'key' => 'power_tool', 'label' => 'Power Tools', 'full_label' => 'Handheld Power Tool',
                'icon' => 'drill', 'color' => '#A16207', 'light_color' => '#FEF9C3', 'text_color' => '#854D0E',
                'has_plate' => false, 'has_swl' => false, 'has_cert' => false,
                'insp_freq_days' => 7, 'description' => 'Drills, impact drivers, reciprocating saws, heat guns',
                'sort_order' => 15,
            ],
            [
                'key' => 'forklift', 'label' => 'Forklifts', 'full_label' => 'Forklift / Telehandler',
                'icon' => 'forklift', 'color' => '#166534', 'light_color' => '#DCFCE7', 'text_color' => '#14532D',
                'has_plate' => true, 'has_swl' => true, 'has_cert' => true,
                'insp_freq_days' => 1, 'description' => 'Counterbalance forklifts, telehandlers, reach trucks',
                'sort_order' => 16,
            ],
            [
                'key' => 'temporary_electrics', 'label' => 'Temp. Electrics', 'full_label' => 'Temporary Electrical Installation',
                'icon' => 'plug', 'color' => '#CA8A04', 'light_color' => '#FEF9C3', 'text_color' => '#854D0E',
                'has_plate' => false, 'has_swl' => false, 'has_cert' => true,
                'insp_freq_days' => 30, 'description' => 'Distribution boards, RCDs, extension leads, site lighting',
                'sort_order' => 17,
            ],
            [
                'key' => 'air_compressor', 'label' => 'Air Compressors', 'full_label' => 'Air Compressor & Pneumatic Tools',
                'icon' => 'gauge', 'color' => '#0891B2', 'light_color' => '#CFFAFE', 'text_color' => '#155E75',
                'has_plate' => true, 'has_swl' => false, 'has_cert' => true,
                'insp_freq_days' => 30, 'description' => 'Air compressors, pneumatic nailers, breakers, hoses',
                'sort_order' => 18,
            ],
            [
                'key' => 'confined_space_kit', 'label' => 'Confined Space', 'full_label' => 'Confined Space Entry Kit',
                'icon' => 'eye', 'color' => '#7C2D12', 'light_color' => '#FFF7ED', 'text_color' => '#7C2D12',
                'has_plate' => false, 'has_swl' => false, 'has_cert' => true,
                'insp_freq_days' => 7, 'description' => 'Gas detectors, rescue tripods, ventilation fans, BA sets',
                'sort_order' => 19,
            ],
            [
                'key' => 'ppe_station', 'label' => 'PPE Stations', 'full_label' => 'PPE Storage & Issue Point',
                'icon' => 'hard-hat', 'color' => '#EA580C', 'light_color' => '#FFF7ED', 'text_color' => '#9A3412',
                'has_plate' => false, 'has_swl' => false, 'has_cert' => false,
                'insp_freq_days' => 30, 'description' => 'Hard hats, safety glasses, hi-vis vests, gloves, boots',
                'sort_order' => 20,
            ],
            [
                'key' => 'cable_wire_rope', 'label' => 'Cables & Wire Ropes', 'full_label' => 'Cable, Wire Rope & Accessories',
                'icon' => 'cable', 'color' => '#475569', 'light_color' => '#F1F5F9', 'text_color' => '#334155',
                'has_plate' => false, 'has_swl' => true, 'has_cert' => true,
                'insp_freq_days' => 7, 'description' => 'Steel wire ropes, electrical cables, winch lines, turnbuckles',
                'sort_order' => 21,
            ],
            [
                'key' => 'traffic_management', 'label' => 'Traffic Management', 'full_label' => 'Traffic Control & Barriers',
                'icon' => 'traffic-cone', 'color' => '#DC2626', 'light_color' => '#FEE2E2', 'text_color' => '#991B1B',
                'has_plate' => false, 'has_swl' => false, 'has_cert' => false,
                'insp_freq_days' => 30, 'description' => 'Traffic cones, barriers, signage, speed bumps, flagging',
                'sort_order' => 22,
            ],
        ];

        foreach ($categories as $cat) {
            ChecklistCategory::updateOrCreate(
                ['key' => $cat['key']],
                $cat
            );
        }
    }
}
