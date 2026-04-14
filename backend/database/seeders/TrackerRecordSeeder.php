<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TrackerRecord;
use App\Models\TrackerCategory;
use Carbon\Carbon;

class TrackerRecordSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        $equipment = [
            // ── FORKLIFTS ──────────────────────────────────
            ['category_key' => 'forklift', 'equipment_name' => 'Toyota 8FBN25 Forklift', 'item_subtype' => 'Counterbalance', 'serial_number' => 'TOY-FLT-2022-001', 'plate_number' => 'FL-001', 'make_model' => 'Toyota 8FBN25', 'swl' => '2.5 Ton', 'load_capacity_tons' => 2.5, 'location_area' => 'Warehouse A', 'assigned_to' => 'Ahmed Al-Farsi', 'condition' => 'Good'],
            ['category_key' => 'forklift', 'equipment_name' => 'Hyster H3.0FT Forklift', 'item_subtype' => 'Counterbalance', 'serial_number' => 'HYS-FLT-2021-003', 'plate_number' => 'FL-002', 'make_model' => 'Hyster H3.0FT', 'swl' => '3.0 Ton', 'load_capacity_tons' => 3.0, 'location_area' => 'Loading Bay B', 'assigned_to' => 'Mohammed Sayed', 'condition' => 'Good'],
            ['category_key' => 'forklift', 'equipment_name' => 'Caterpillar DP25N Forklift', 'item_subtype' => 'Diesel', 'serial_number' => 'CAT-FLT-2023-007', 'plate_number' => 'FL-003', 'make_model' => 'CAT DP25N', 'swl' => '2.5 Ton', 'load_capacity_tons' => 2.5, 'location_area' => 'Site C - Zone 3', 'assigned_to' => 'Khalid Omar', 'condition' => 'Fair'],
            ['category_key' => 'forklift', 'equipment_name' => 'Komatsu FG25T Forklift', 'item_subtype' => 'LPG', 'serial_number' => 'KOM-FLT-2020-012', 'plate_number' => 'FL-004', 'make_model' => 'Komatsu FG25T', 'swl' => '2.5 Ton', 'load_capacity_tons' => 2.5, 'location_area' => 'Warehouse B', 'assigned_to' => 'Tariq Hassan', 'condition' => 'Good'],

            // ── SCISSOR LIFTS ──────────────────────────────
            ['category_key' => 'scissor_lift', 'equipment_name' => 'Genie GS-2632 Scissor Lift', 'item_subtype' => 'Electric', 'serial_number' => 'GEN-SL-2023-015', 'plate_number' => 'SL-001', 'make_model' => 'Genie GS-2632', 'swl' => '227 kg', 'location_area' => 'Building A - Level 2', 'assigned_to' => 'Ali Rashid', 'condition' => 'Good'],
            ['category_key' => 'scissor_lift', 'equipment_name' => 'JLG 2630ES Scissor Lift', 'item_subtype' => 'Electric', 'serial_number' => 'JLG-SL-2022-008', 'plate_number' => 'SL-002', 'make_model' => 'JLG 2630ES', 'swl' => '230 kg', 'location_area' => 'Building B - Level 3', 'assigned_to' => 'Nasser Ali', 'condition' => 'Good'],
            ['category_key' => 'scissor_lift', 'equipment_name' => 'Skyjack SJ6832RT Scissor Lift', 'item_subtype' => 'Rough Terrain', 'serial_number' => 'SKJ-SL-2021-022', 'plate_number' => 'SL-003', 'make_model' => 'Skyjack SJ6832RT', 'swl' => '450 kg', 'location_area' => 'External Zone D', 'assigned_to' => 'Samir Khan', 'condition' => 'Fair'],

            // ── MAN LIFTS ──────────────────────────────────
            ['category_key' => 'man_lift', 'equipment_name' => 'Genie Z-45/25 Man Lift', 'item_subtype' => 'Articulating Boom', 'serial_number' => 'GEN-ML-2023-002', 'plate_number' => 'ML-001', 'make_model' => 'Genie Z-45/25', 'swl' => '227 kg', 'location_area' => 'Tower A', 'assigned_to' => 'Faisal Ahmed', 'condition' => 'Good'],
            ['category_key' => 'man_lift', 'equipment_name' => 'Man Basket Assembly #2', 'item_subtype' => 'Man Basket', 'serial_number' => 'MB-2022-004', 'plate_number' => 'ML-002', 'make_model' => 'Custom Fabricated', 'swl' => '500 kg', 'location_area' => 'Crane Zone B', 'assigned_to' => 'Youssef Nabil', 'condition' => 'Good'],

            // ── BOOM LIFTS ─────────────────────────────────
            ['category_key' => 'boom_lift', 'equipment_name' => 'JLG 600S Boom Lift', 'item_subtype' => 'Telescopic', 'serial_number' => 'JLG-BL-2022-011', 'plate_number' => 'BL-001', 'make_model' => 'JLG 600S', 'swl' => '272 kg', 'location_area' => 'Tower B - Facade', 'assigned_to' => 'Hamad Saleh', 'condition' => 'Good'],
            ['category_key' => 'boom_lift', 'equipment_name' => 'Genie S-65 Boom Lift', 'item_subtype' => 'Telescopic', 'serial_number' => 'GEN-BL-2021-006', 'plate_number' => 'BL-002', 'make_model' => 'Genie S-65', 'swl' => '227 kg', 'location_area' => 'External Works', 'assigned_to' => 'Omar Khalil', 'condition' => 'Good'],
            ['category_key' => 'boom_lift', 'equipment_name' => 'Haulotte HA20 RTJ PRO Boom Lift', 'item_subtype' => 'Articulating', 'serial_number' => 'HAU-BL-2023-019', 'plate_number' => 'BL-003', 'make_model' => 'Haulotte HA20 RTJ PRO', 'swl' => '250 kg', 'location_area' => 'Parking Structure', 'assigned_to' => 'Majid Rami', 'condition' => 'Good'],

            // ── FIRE EXTINGUISHERS ─────────────────────────
            ['category_key' => 'fire_extinguisher', 'equipment_name' => 'FE-DCP-6KG-001', 'item_subtype' => 'Dry Chemical Powder', 'serial_number' => 'FE-SN-2023-101', 'extinguisher_type' => 'DCP', 'weight_kg' => 6.0, 'location_area' => 'Office Building - Ground Floor', 'condition' => 'Good'],
            ['category_key' => 'fire_extinguisher', 'equipment_name' => 'FE-CO2-5KG-002', 'item_subtype' => 'CO2', 'serial_number' => 'FE-SN-2023-102', 'extinguisher_type' => 'CO2', 'weight_kg' => 5.0, 'location_area' => 'Server Room A', 'condition' => 'Good'],
            ['category_key' => 'fire_extinguisher', 'equipment_name' => 'FE-FOAM-9L-003', 'item_subtype' => 'Foam', 'serial_number' => 'FE-SN-2022-056', 'extinguisher_type' => 'Foam', 'weight_kg' => 13.5, 'location_area' => 'Workshop B', 'condition' => 'Good'],
            ['category_key' => 'fire_extinguisher', 'equipment_name' => 'FE-DCP-9KG-004', 'item_subtype' => 'Dry Chemical Powder', 'serial_number' => 'FE-SN-2023-103', 'extinguisher_type' => 'DCP', 'weight_kg' => 9.0, 'location_area' => 'Warehouse A - Bay 3', 'condition' => 'Good'],
            ['category_key' => 'fire_extinguisher', 'equipment_name' => 'FE-CO2-2KG-005', 'item_subtype' => 'CO2', 'serial_number' => 'FE-SN-2021-044', 'extinguisher_type' => 'CO2', 'weight_kg' => 2.0, 'location_area' => 'Electrical Room B2', 'condition' => 'Good'],
            ['category_key' => 'fire_extinguisher', 'equipment_name' => 'FE-DCP-6KG-006', 'item_subtype' => 'Dry Chemical Powder', 'serial_number' => 'FE-SN-2023-104', 'extinguisher_type' => 'DCP', 'weight_kg' => 6.0, 'location_area' => 'Loading Bay A', 'condition' => 'Fair'],

            // ── FULL BODY HARNESSES ────────────────────────
            ['category_key' => 'full_body_harness', 'equipment_name' => '3M DBI-SALA ExoFit NEX Harness', 'item_subtype' => 'Full Body', 'serial_number' => 'HRN-2023-001', 'make_model' => '3M DBI-SALA ExoFit NEX', 'assigned_to' => 'Ahmed Ali', 'location_area' => 'Tower A - Height Work', 'condition' => 'Good'],
            ['category_key' => 'full_body_harness', 'equipment_name' => 'Petzl Newton EASYFIT Harness', 'item_subtype' => 'Full Body', 'serial_number' => 'HRN-2023-002', 'make_model' => 'Petzl Newton EASYFIT', 'assigned_to' => 'Omar Rashid', 'location_area' => 'Facade Team', 'condition' => 'Good'],
            ['category_key' => 'full_body_harness', 'equipment_name' => 'MSA V-FORM+ Harness', 'item_subtype' => 'Full Body', 'serial_number' => 'HRN-2022-015', 'make_model' => 'MSA V-FORM+', 'assigned_to' => 'Khaled Nasser', 'location_area' => 'Scaffold Team', 'condition' => 'Good'],
            ['category_key' => 'full_body_harness', 'equipment_name' => 'Honeywell Miller H500 Harness', 'item_subtype' => 'Full Body', 'serial_number' => 'HRN-2021-008', 'make_model' => 'Honeywell Miller H500', 'assigned_to' => 'Saeed Fahad', 'location_area' => 'Steel Structure', 'condition' => 'Fair'],
            ['category_key' => 'full_body_harness', 'equipment_name' => '3M Protecta P200 Harness', 'item_subtype' => 'Full Body', 'serial_number' => 'HRN-2023-003', 'make_model' => '3M Protecta P200', 'assigned_to' => 'Waleed Sami', 'location_area' => 'Roof Work', 'condition' => 'Good'],

            // ── LADDERS ────────────────────────────────────
            ['category_key' => 'ladder', 'equipment_name' => 'Werner 3.6m Step Ladder', 'item_subtype' => 'Step Ladder', 'serial_number' => 'LAD-2023-001', 'make_model' => 'Werner T376', 'swl' => '150 kg', 'location_area' => 'Maintenance Store', 'condition' => 'Good'],
            ['category_key' => 'ladder', 'equipment_name' => 'Zarges 6m Extension Ladder', 'item_subtype' => 'Extension Ladder', 'serial_number' => 'LAD-2022-005', 'make_model' => 'Zarges Z600', 'swl' => '150 kg', 'location_area' => 'Workshop A', 'condition' => 'Good'],
            ['category_key' => 'ladder', 'equipment_name' => 'Hailo 2.4m Platform Ladder', 'item_subtype' => 'Platform Ladder', 'serial_number' => 'LAD-2023-009', 'make_model' => 'Hailo L80', 'swl' => '150 kg', 'location_area' => 'Office Building', 'condition' => 'Good'],
            ['category_key' => 'ladder', 'equipment_name' => 'Louisville 4.8m Extension Ladder', 'item_subtype' => 'Extension Ladder', 'serial_number' => 'LAD-2021-012', 'make_model' => 'Louisville FE3216', 'swl' => '136 kg', 'location_area' => 'Electrical Works', 'condition' => 'Fair'],

            // ── WELDING MACHINES ────────────────────────────
            ['category_key' => 'welding_machine', 'equipment_name' => 'Lincoln Electric Invertec V350-PRO', 'item_subtype' => 'MIG/MAG', 'serial_number' => 'WLD-2023-001', 'make_model' => 'Lincoln Invertec V350-PRO', 'voltage_rating' => '380V', 'location_area' => 'Welding Bay A', 'assigned_to' => 'Rami Nasser', 'condition' => 'Good'],
            ['category_key' => 'welding_machine', 'equipment_name' => 'ESAB Rebel EMP 235ic', 'item_subtype' => 'Multi-Process', 'serial_number' => 'WLD-2022-004', 'make_model' => 'ESAB Rebel EMP 235ic', 'voltage_rating' => '220V', 'location_area' => 'Workshop B', 'assigned_to' => 'Hassan Fouad', 'condition' => 'Good'],
            ['category_key' => 'welding_machine', 'equipment_name' => 'Miller Syncrowave 210 TIG', 'item_subtype' => 'TIG', 'serial_number' => 'WLD-2021-007', 'make_model' => 'Miller Syncrowave 210', 'voltage_rating' => '220V', 'location_area' => 'Pipe Fabrication', 'assigned_to' => 'Adel Ibrahim', 'condition' => 'Good'],

            // ── POWER TOOLS ────────────────────────────────
            ['category_key' => 'power_tool', 'equipment_name' => 'Hilti TE 70-ATC Rotary Hammer', 'item_subtype' => 'Rotary Hammer', 'serial_number' => 'PT-2023-001', 'make_model' => 'Hilti TE 70-ATC', 'voltage_rating' => '220V', 'location_area' => 'Concrete Team', 'condition' => 'Good'],
            ['category_key' => 'power_tool', 'equipment_name' => 'DeWalt DCD996 Hammer Drill', 'item_subtype' => 'Hammer Drill', 'serial_number' => 'PT-2023-005', 'make_model' => 'DeWalt DCD996', 'voltage_rating' => '18V Battery', 'location_area' => 'Fit-Out Team', 'condition' => 'Good'],
            ['category_key' => 'power_tool', 'equipment_name' => 'Makita HR2470 SDS Drill', 'item_subtype' => 'SDS Drill', 'serial_number' => 'PT-2022-011', 'make_model' => 'Makita HR2470', 'voltage_rating' => '220V', 'location_area' => 'MEP Team', 'condition' => 'Good'],
            ['category_key' => 'power_tool', 'equipment_name' => 'Bosch GBH 2-26 DRE Drill', 'item_subtype' => 'SDS Drill', 'serial_number' => 'PT-2021-018', 'make_model' => 'Bosch GBH 2-26 DRE', 'voltage_rating' => '220V', 'location_area' => 'General Store', 'condition' => 'Fair'],

            // ── GRINDERS ───────────────────────────────────
            ['category_key' => 'grinder', 'equipment_name' => 'Makita GA9020 Angle Grinder 230mm', 'item_subtype' => 'Angle Grinder', 'serial_number' => 'GRD-2023-001', 'make_model' => 'Makita GA9020', 'voltage_rating' => '220V', 'location_area' => 'Steel Fabrication', 'condition' => 'Good'],
            ['category_key' => 'grinder', 'equipment_name' => 'DeWalt DWE4257 Angle Grinder 125mm', 'item_subtype' => 'Angle Grinder', 'serial_number' => 'GRD-2022-006', 'make_model' => 'DeWalt DWE4257', 'voltage_rating' => '220V', 'location_area' => 'Workshop A', 'condition' => 'Good'],
            ['category_key' => 'grinder', 'equipment_name' => 'Bosch GWS 22-230 Angle Grinder', 'item_subtype' => 'Angle Grinder', 'serial_number' => 'GRD-2021-009', 'make_model' => 'Bosch GWS 22-230', 'voltage_rating' => '220V', 'location_area' => 'Pipe Fabrication', 'condition' => 'Fair'],

            // ── CUTTERS ────────────────────────────────────
            ['category_key' => 'cutter', 'equipment_name' => 'Stihl TS 420 Disc Cutter', 'item_subtype' => 'Disc Cutter', 'serial_number' => 'CUT-2023-001', 'make_model' => 'Stihl TS 420', 'voltage_rating' => 'Petrol', 'location_area' => 'Road Works', 'condition' => 'Good'],
            ['category_key' => 'cutter', 'equipment_name' => 'Ridgid 258 Pipe Cutter', 'item_subtype' => 'Pipe Cutter', 'serial_number' => 'CUT-2022-004', 'make_model' => 'Ridgid 258', 'voltage_rating' => '220V', 'location_area' => 'Plumbing Team', 'condition' => 'Good'],
            ['category_key' => 'cutter', 'equipment_name' => 'Milwaukee M18 Fuel Bolt Cutter', 'item_subtype' => 'Bolt Cutter', 'serial_number' => 'CUT-2023-008', 'make_model' => 'Milwaukee M18 FMCS', 'voltage_rating' => '18V Battery', 'location_area' => 'Rebar Team', 'condition' => 'Good'],
        ];

        $categoryMap = TrackerCategory::pluck('id', 'key')->toArray();
        $templateMap = TrackerCategory::pluck('template_type', 'key')->toArray();
        $freqMap = TrackerCategory::pluck('insp_freq_days', 'key')->toArray();

        foreach ($equipment as $item) {
            $catKey = $item['category_key'];
            $catId = $categoryMap[$catKey] ?? null;
            if (!$catId) continue;

            $freqDays = $freqMap[$catKey] ?? 7;
            $lastInspDate = $now->copy()->subDays(rand(1, $freqDays + 5));
            $nextInspDate = $lastInspDate->copy()->addDays($freqDays);
            $isOverdue = $nextInspDate->lt($now);
            $daysUntilDue = $now->diffInDays($nextInspDate, false);

            $base = [
                'category_id'                   => $catId,
                'category_key'                  => $catKey,
                'template_type'                 => $templateMap[$catKey] ?? 'heavy_equipment',
                'onboarding_date'               => $now->copy()->subMonths(rand(6, 36)),
                'status'                        => 'Active',
                'last_internal_inspection_date'  => $lastInspDate,
                'next_internal_inspection_date'  => $nextInspDate,
                'is_overdue'                     => $isOverdue,
                'days_until_due'                 => (int) $daysUntilDue,
                'inspected_by'                   => 'System Seeder',
                'total_inspections_count'        => rand(1, 20),
                'last_inspection_result'         => 'Pass',
                'last_inspector_name'            => 'System Seeder',
                'created_by'                     => 1,
            ];

            // Remove keys that don't match fillable
            $fillable = array_merge($base, $item);
            unset($fillable['category_key']); // already in base
            $fillable['category_key'] = $catKey;

            TrackerRecord::updateOrCreate(
                ['serial_number' => $item['serial_number'] ?? $item['equipment_name']],
                $fillable
            );
        }

        // Recalculate due status
        TrackerRecord::all()->each(fn($r) => $r->recalculateDueStatus());
    }
}
