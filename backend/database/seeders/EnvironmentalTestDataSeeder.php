<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\EnvironmentalAspect;
use App\Models\EnvironmentalRisk;
use App\Models\WasteRecord;
use App\Models\EnvironmentalMonitoring;
use App\Models\ResourceConsumption;
use App\Models\EnvironmentalIncident;
use App\Models\EnvironmentalInspection;
use App\Models\EnvironmentalComplianceRegister;
use App\Models\EnvironmentalObjective;
use App\Models\EnvironmentalAction;

class EnvironmentalTestDataSeeder extends Seeder
{
    public function run(): void
    {
        // ─── Aspects ───────────────────────────────────
        $aspects = [];
        $aspectData = [
            ['Concrete mixing', 'Dust generation from concrete batching plant', 'Air Emission', 'Pollution', 3, 3],
            ['Vehicle washing', 'Contaminated water discharge to storm drains', 'Water Pollution', 'Pollution', 4, 3],
            ['General construction', 'Construction and demolition waste generation', 'Waste Generation', 'Resource Depletion', 2, 4],
            ['Pile driving', 'Noise from pile driving operations exceeding limits', 'Noise', 'Community Disturbance', 3, 4],
            ['Painting & coating', 'VOC emissions from spray painting operations', 'Air Emission', 'Health Impact', 4, 2],
            ['Fuel storage', 'Potential diesel spill from storage tanks', 'Spill Risk', 'Pollution', 4, 2],
            ['Office operations', 'Electricity consumption from office buildings', 'Resource Consumption', 'Resource Depletion', 1, 4],
            ['Chemical storage', 'Improper storage of hazardous chemicals', 'Chemical Use', 'Legal Non-Compliance', 3, 3],
        ];

        foreach ($aspectData as $d) {
            $aspects[] = EnvironmentalAspect::create([
                'activity'           => $d[0],
                'aspect_description' => $d[1],
                'aspect_category'    => $d[2],
                'impact_type'        => $d[3],
                'severity'           => $d[4],
                'likelihood'         => $d[5],
                'area'               => ['Zone A', 'Zone B', 'Zone C', 'Station 1'][array_rand(['Zone A', 'Zone B', 'Zone C', 'Station 1'])],
                'department'         => ['Construction', 'Operations', 'Maintenance'][array_rand(['Construction', 'Operations', 'Maintenance'])],
                'controls'           => 'Standard operational controls in place',
                'status'             => ['Active', 'Under Review', 'Controlled'][array_rand(['Active', 'Under Review', 'Controlled'])],
            ]);
        }

        // ─── Risks ─────────────────────────────────────
        $riskData = [
            ['Dust exposure to workers and nearby community', 'Respiratory health issues', 3, 3, 2, 2],
            ['Groundwater contamination from diesel spill', 'Long-term soil and water damage', 4, 3, 2, 2],
            ['Noise-induced hearing loss for workers', 'Occupational health impact', 3, 4, 2, 2],
            ['Chemical spill during transport', 'Soil and water contamination', 4, 2, 2, 1],
        ];

        foreach ($riskData as $i => $d) {
            EnvironmentalRisk::create([
                'aspect_id'           => $aspects[$i]->id ?? null,
                'hazard_description'  => $d[0],
                'potential_impact'    => $d[1],
                'likelihood'          => $d[2],
                'severity'            => $d[3],
                'residual_likelihood' => $d[4],
                'residual_severity'   => $d[5],
                'existing_controls'   => 'PPE, engineering controls, monitoring',
                'status'              => ['Open', 'Controlled', 'Under Review'][array_rand(['Open', 'Controlled', 'Under Review'])],
            ]);
        }

        // ─── Waste Records ─────────────────────────────
        $wasteData = [
            ['Hazardous Waste', 'Hazardous', 150, 'kg', 'Licensed Contractor', 'Pending Collection'],
            ['Construction Debris', 'Non-Hazardous', 5000, 'kg', 'Licensed Landfill', 'Collected'],
            ['Oily Waste', 'Hazardous', 200, 'litres', 'Incineration', 'Disposed'],
            ['Recyclable Waste', 'Recyclable', 800, 'kg', 'Recycling', 'Recycled'],
            ['Electronic Waste', 'Hazardous', 50, 'kg', 'Licensed Contractor', 'In Storage'],
            ['General Waste', 'Non-Hazardous', 2000, 'kg', 'Licensed Landfill', 'Collected'],
            ['Scrap Metal', 'Recyclable', 1200, 'kg', 'Recycling', 'Recycled'],
            ['Chemical Waste', 'Hazardous', 80, 'litres', 'Chemical Treatment', 'Pending Collection'],
        ];

        foreach ($wasteData as $d) {
            WasteRecord::create([
                'waste_type'     => $d[0],
                'waste_category' => $d[1],
                'quantity'       => $d[2],
                'unit'           => $d[3],
                'disposal_method' => $d[4],
                'status'          => $d[5],
                'source_area'     => ['Zone A', 'Zone B', 'Workshop'][array_rand(['Zone A', 'Zone B', 'Workshop'])],
                'disposal_vendor' => ['Green Disposal Co.', 'KSA Waste Mgmt', 'RecyclePro'][array_rand(['Green Disposal Co.', 'KSA Waste Mgmt', 'RecyclePro'])],
            ]);
        }

        // ─── Monitoring ────────────────────────────────
        $monData = [
            ['Air Emission', 'PM2.5', 45.5, 50, 'ug/m3'],
            ['Air Emission', 'CO2 ppm', 380, 400, 'ppm'],
            ['Noise Level', 'Ambient Noise', 72, 70, 'dB(A)'],
            ['Water Discharge', 'pH Level', 7.2, 9, 'pH'],
            ['Dust', 'TSP', 120, 150, 'ug/m3'],
            ['Air Emission', 'SO2', 18, 20, 'ppb'],
            ['Noise Level', 'Construction Noise', 85, 80, 'dB(A)'],
            ['Water Discharge', 'BOD', 25, 30, 'mg/L'],
        ];

        foreach ($monData as $d) {
            EnvironmentalMonitoring::create([
                'monitoring_type'   => $d[0],
                'parameter'         => $d[1],
                'measured_value'    => $d[2],
                'permissible_limit' => $d[3],
                'unit'              => $d[4],
                'monitoring_date'   => now()->subDays(rand(1, 60)),
                'source_area'       => ['Zone A', 'Zone B', 'Perimeter'][array_rand(['Zone A', 'Zone B', 'Perimeter'])],
                'conducted_by'      => 'Environmental Officer',
                'equipment_used'    => ['Air Quality Monitor', 'Noise Meter', 'pH Meter', 'Dust Sampler'][array_rand(['Air Quality Monitor', 'Noise Meter', 'pH Meter', 'Dust Sampler'])],
            ]);
        }

        // ─── Resource Consumption ──────────────────────
        for ($m = 5; $m >= 0; $m--) {
            $date = now()->subMonths($m)->endOfMonth();
            foreach (['Electricity', 'Water', 'Diesel'] as $type) {
                $base = match($type) {
                    'Electricity' => rand(15000, 25000),
                    'Water'       => rand(500, 1500),
                    'Diesel'      => rand(2000, 5000),
                };
                ResourceConsumption::create([
                    'resource_type'     => $type,
                    'consumption_value' => $base,
                    'unit'              => match($type) { 'Electricity' => 'kWh', 'Water' => 'm3', 'Diesel' => 'litres' },
                    'reading_date'      => $date,
                    'billing_period'    => $date->format('F Y'),
                    'location'          => 'Main Site',
                    'area'              => 'Zone A',
                    'cost'              => $base * match($type) { 'Electricity' => 0.21, 'Water' => 3.50, 'Diesel' => 2.10 },
                    'currency'          => 'SAR',
                ]);
            }
        }

        // ─── Incidents ─────────────────────────────────
        $incData = [
            ['Oil Spill', 'Hydraulic oil leak from excavator onto bare soil', 'High', 'Reported'],
            ['Dust Complaint', 'Community complaint about dust from earthworks', 'Medium', 'Under Investigation'],
            ['Waste Mismanagement', 'Hazardous waste found mixed with general waste', 'High', 'Action Assigned'],
            ['Chemical Leak', 'Minor paint thinner leak in storage area', 'Low', 'Closed'],
            ['Noise Complaint', 'Night-time construction noise exceeding limits', 'Medium', 'In Progress'],
        ];

        foreach ($incData as $d) {
            EnvironmentalIncident::create([
                'incident_type' => $d[0],
                'description'   => $d[1],
                'severity'      => $d[2],
                'status'        => $d[3],
                'incident_date' => now()->subDays(rand(1, 90)),
                'area'          => ['Zone A', 'Zone B', 'Zone C'][array_rand(['Zone A', 'Zone B', 'Zone C'])],
                'immediate_action' => 'Area cordoned off and cleanup initiated',
            ]);
        }

        // ─── Inspections ───────────────────────────────
        $inspData = [
            ['Routine Environmental Inspection', 'Compliant', 0, 'Open'],
            ['Waste Area Inspection', 'Partially Compliant', 2, 'Action Required'],
            ['Spill Control Inspection', 'Compliant', 0, 'Closed'],
            ['Environmental Audit', 'Non-Compliant', 5, 'Action Required'],
            ['Emission Monitoring Inspection', 'Compliant', 0, 'Open'],
        ];

        foreach ($inspData as $d) {
            EnvironmentalInspection::create([
                'inspection_type'      => $d[0],
                'compliance_status'    => $d[1],
                'non_compliance_count' => $d[2],
                'status'               => $d[3],
                'inspection_date'      => now()->subDays(rand(1, 60)),
                'inspector_name'       => ['John Smith', 'Ahmed Ali', 'Sarah Johnson'][array_rand(['John Smith', 'Ahmed Ali', 'Sarah Johnson'])],
                'area'                 => 'Zone A',
                'findings_summary'     => 'Environmental inspection completed with findings as noted.',
                'recommendations'      => 'Continue monitoring and address non-conformances.',
            ]);
        }

        // ─── Compliance Register ───────────────────────
        $compData = [
            ['Saudi Environmental Law - Air Quality', 'NCEC', 'Law', 'Compliant'],
            ['Waste Management Regulation 2023', 'MEWA', 'Standard', 'Compliant'],
            ['Construction Noise Permit', 'Municipality', 'Permit', 'Pending Review'],
            ['Wastewater Discharge License', 'SWCC', 'License', 'Non-Compliant'],
            ['Hazardous Materials Storage Permit', 'Civil Defense', 'Permit', 'Under Action'],
        ];

        foreach ($compData as $d) {
            EnvironmentalComplianceRegister::create([
                'regulation_name'         => $d[0],
                'regulatory_authority'    => $d[1],
                'requirement_type'        => $d[2],
                'requirement_description' => "Full compliance with {$d[0]} requirements and standards.",
                'compliance_status'       => $d[3],
                'last_checked_date'       => now()->subDays(rand(10, 60)),
                'next_due_date'           => now()->addDays(rand(-10, 90)),
                'applicable_area'         => 'All Areas',
            ]);
        }

        // ─── Objectives ────────────────────────────────
        $objData = [
            ['Reduce construction waste by 20%', 'Waste Reduction', 20, 12, '%', 'In Progress'],
            ['Achieve 50% recycling rate', 'Recycling Improvement', 50, 35, '%', 'In Progress'],
            ['Reduce water consumption by 15%', 'Water Conservation', 15, 15, '%', 'Achieved'],
            ['Zero environmental incidents per quarter', 'Spill Prevention', 0, 2, 'incidents', 'Delayed'],
            ['Reduce energy use by 10%', 'Energy Efficiency', 10, 6, '%', 'In Progress'],
        ];

        foreach ($objData as $d) {
            EnvironmentalObjective::create([
                'title'         => $d[0],
                'category'      => $d[1],
                'target_value'  => $d[2],
                'current_value' => $d[3],
                'unit'          => $d[4],
                'status'        => $d[5],
                'deadline'      => now()->addMonths(rand(1, 6)),
                'baseline_date' => now()->subMonths(6),
                'baseline_value' => 0,
            ]);
        }

        // ─── Actions ───────────────────────────────────
        $actionData = [
            ['Install additional dust suppression systems', 'aspect', 'High', 'Open'],
            ['Repair secondary containment bund', 'risk', 'Critical', 'In Progress'],
            ['Train workers on waste segregation', 'waste', 'Medium', 'Completed'],
            ['Calibrate noise monitoring equipment', 'monitoring', 'Low', 'Completed'],
            ['Submit wastewater discharge report', 'compliance', 'High', 'Overdue'],
            ['Investigate oil spill root cause', 'incident', 'Critical', 'In Progress'],
            ['Follow up non-compliance from audit', 'inspection', 'High', 'Open'],
            ['Update recycling targets in EMS', 'objective', 'Medium', 'Open'],
        ];

        foreach ($actionData as $d) {
            EnvironmentalAction::create([
                'title'       => $d[0],
                'linked_type' => $d[1],
                'linked_id'   => 1,
                'priority'    => $d[2],
                'status'      => $d[3],
                'due_date'    => $d[3] === 'Overdue' ? now()->subDays(5) : now()->addDays(rand(5, 30)),
                'assigned_to' => ['John Smith', 'Ahmed Ali', 'Sarah Johnson'][array_rand(['John Smith', 'Ahmed Ali', 'Sarah Johnson'])],
            ]);
        }
    }
}
