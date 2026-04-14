<?php

namespace Database\Seeders;

use App\Models\WasteManifest;
use App\Models\WasteManifestAttachment;
use App\Models\WasteManifestLog;
use Illuminate\Database\Seeder;

class WasteManifestTestDataSeeder extends Seeder
{
    public function run(): void
    {
        $wasteTypes      = config('waste_manifest_config.waste_types');
        $categories      = config('waste_manifest_config.waste_categories');
        $hazardClasses   = config('waste_manifest_config.hazard_classifications');
        $forms           = config('waste_manifest_config.physical_forms');
        $units           = config('waste_manifest_config.units');
        $packaging       = config('waste_manifest_config.packaging_types');
        $treatments      = config('waste_manifest_config.treatment_methods');
        $vehicleTypes    = config('waste_manifest_config.vehicle_types');
        $statuses        = config('waste_manifest_config.statuses');

        $transporters = [
            'Al-Rajhi Waste Services', 'Green Disposal Co.', 'Saudi Waste Management',
            'KAEC Environmental Services', 'Clean Haul Logistics', 'Eco Transport KSA',
        ];
        $facilities = [
            'Jubail Treatment Facility', 'Rabigh Landfill (Licensed)', 'KAEC Recycling Centre',
            'Jeddah Incineration Plant', 'Riyadh Hazmat Disposal', 'Dammam Recovery Facility',
        ];
        $areas   = ['Zone A', 'Zone B', 'Zone C', 'North Sector', 'South Sector', 'Marine Area', 'Industrial Area'];
        $depts   = ['Construction', 'Maintenance', 'Operations', 'Painting', 'MEP', 'Civil Works'];
        $drivers = ['Ahmed Al-Saud', 'Mohammed Ali', 'Khalid Ibrahim', 'Omar Yousef', 'Fahad Hassan'];

        $userId = \App\Models\User::first()?->id;

        $records = [];
        for ($i = 0; $i < 30; $i++) {
            $status   = $statuses[array_rand($statuses)];
            $category = $categories[array_rand($categories)];
            $date     = now()->subDays(rand(0, 180));

            $data = [
                'manifest_date'         => $date->format('Y-m-d'),
                'priority'              => ['Normal', 'Normal', 'Normal', 'Urgent', 'Critical'][rand(0, 4)],
                'status'                => $status,
                'source_site'           => 'KAEC Rail Project',
                'source_project'        => 'FFT/Lucid',
                'source_area'           => $areas[array_rand($areas)],
                'source_department'     => $depts[array_rand($depts)],
                'generator_company'     => ['FFT Construction', 'Lucid Contracting', 'KAEC Infrastructure'][rand(0, 2)],
                'responsible_person'    => ['John Smith', 'Ali Mohammed', 'Sarah Chen', 'Ahmed Hassan'][rand(0, 3)],
                'responsible_person_id' => $userId,
                'contact_number'        => '+966 5' . rand(10000000, 99999999),
                'waste_type'            => $wasteTypes[array_rand($wasteTypes)],
                'waste_category'        => $category,
                'waste_description'     => 'Waste material from construction activities at project site.',
                'hazard_classification' => $category === 'Hazardous' ? $hazardClasses[array_rand($hazardClasses)] : 'Not Hazardous',
                'physical_form'         => $forms[array_rand($forms)],
                'quantity'              => round(rand(10, 5000) / 10, 2),
                'unit'                  => $units[array_rand($units)],
                'container_count'       => rand(1, 20),
                'packaging_type'        => $packaging[array_rand($packaging)],
                'temporary_storage_location' => 'Staging Area ' . chr(rand(65, 70)),
                'created_by'            => $userId,
                'updated_by'            => $userId,
            ];

            // Add transporter for dispatched+ statuses
            if (in_array($status, ['Dispatched', 'In Transit', 'Received', 'Completed'])) {
                $data['transporter_name']      = $transporters[array_rand($transporters)];
                $data['transporter_license_no'] = 'TL-' . rand(10000, 99999);
                $data['driver_name']           = $drivers[array_rand($drivers)];
                $data['driver_contact']        = '+966 5' . rand(10000000, 99999999);
                $data['vehicle_number']        = rand(1000, 9999) . ' ' . ['RKH', 'JED', 'RYD', 'DMM'][rand(0, 3)];
                $data['vehicle_type']          = $vehicleTypes[array_rand($vehicleTypes)];
                $data['handover_by']           = $data['responsible_person'];
                $data['handover_date']         = $date->copy()->addDays(rand(1, 3))->format('Y-m-d');
                $data['dispatch_date']         = $data['handover_date'];
                $data['dispatched_at']         = $date->copy()->addDays(rand(1, 3));
                $data['dispatched_by']         = $userId;
                $data['expected_delivery_date'] = $date->copy()->addDays(rand(3, 10))->format('Y-m-d');
            }

            // Add receiving for received/completed
            if (in_array($status, ['Received', 'Completed'])) {
                $data['facility_name']       = $facilities[array_rand($facilities)];
                $data['facility_license_no'] = 'FL-' . rand(10000, 99999);
                $data['receiving_person']    = ['Facility Manager', 'Reception Officer', 'Site Supervisor'][rand(0, 2)];
                $data['receiving_date']      = $date->copy()->addDays(rand(4, 8))->format('Y-m-d');
                $data['received_at']         = $date->copy()->addDays(rand(4, 8));
                $data['received_by']         = $data['receiving_person'];
            }

            // Add completion data
            if ($status === 'Completed') {
                $data['treatment_method']           = $treatments[array_rand($treatments)];
                $data['disposal_certificate_no']    = 'DC-' . date('Y') . '-' . rand(1000, 9999);
                $data['manifest_compliance_status'] = ['Compliant', 'Compliant', 'Compliant', 'Non-Compliant'][rand(0, 3)];
                $data['completed_at']               = $date->copy()->addDays(rand(5, 12));
                $data['completed_by']               = $userId;
            }

            if ($status === 'Cancelled') {
                $data['cancelled_at']        = $date->copy()->addDays(rand(1, 5));
                $data['cancellation_reason'] = 'Manifest cancelled due to operational changes.';
            }

            $records[] = $data;
        }

        foreach ($records as $data) {
            $manifest = WasteManifest::create($data);

            // Create initial log
            WasteManifestLog::create([
                'waste_manifest_id' => $manifest->id,
                'action'            => 'Manifest Created',
                'from_status'       => null,
                'to_status'         => 'Draft',
                'performed_by'      => $userId,
                'performed_by_name' => 'System Seeder',
                'performed_by_role' => 'master',
                'description'       => 'Test data seeded',
            ]);

            // Create status-change logs for non-Draft
            if ($manifest->status !== 'Draft') {
                WasteManifestLog::create([
                    'waste_manifest_id' => $manifest->id,
                    'action'            => 'Status Changed',
                    'from_status'       => 'Draft',
                    'to_status'         => $manifest->status,
                    'performed_by'      => $userId,
                    'performed_by_name' => 'System Seeder',
                    'performed_by_role' => 'master',
                    'description'       => 'Seeded with status: ' . $manifest->status,
                ]);
            }
        }

        $this->command->info('Waste manifest test data seeded: ' . count($records) . ' manifests created.');
    }
}
