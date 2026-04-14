<?php

namespace Database\Seeders;

use App\Models\Contractor;
use App\Models\ContractorContact;
use App\Models\ContractorDocument;
use App\Models\ContractorLog;
use Illuminate\Database\Seeder;

class ContractorTestDataSeeder extends Seeder
{
    public function run(): void
    {
        $userId = \App\Models\User::first()?->id;
        $contractors = [
            [
                'contractor_name'        => 'Al Rashid Trading & Contracting',
                'registered_company_name' => 'Al Rashid Trading & Contracting Co. Ltd.',
                'company_type'           => 'Civil Contractor',
                'scope_of_work'          => 'Civil Works',
                'registration_number'    => 'CR-100234',
                'tax_number'             => 'VAT-3001234567',
                'country'                => 'Saudi Arabia',
                'city'                   => 'Jeddah',
                'address'                => 'Industrial Area, Phase 3, Jeddah',
                'site'                   => 'KAEC Rail Project',
                'project'                => 'Main Line',
                'area'                   => 'Zone A',
                'contractor_status'      => 'Active',
                'compliance_status'      => 'Compliant',
                'total_workforce'        => 120,
                'current_site_headcount' => 85,
                'skilled_workers_count'  => 60,
                'unskilled_workers_count'=> 35,
                'supervisors_count'      => 8,
                'operators_count'        => 12,
                'contract_start_date'    => '2024-01-15',
                'contract_end_date'      => '2026-12-31',
                'mobilized_date'         => '2024-02-01',
                'primary_contact_name'   => 'Ahmed Al Rashid',
                'primary_contact_designation' => 'Project Manager',
                'primary_contact_phone'  => '+966 50 123 4567',
                'primary_contact_email'  => 'ahmed@alrashid.com',
            ],
            [
                'contractor_name'        => 'Gulf Safety Services',
                'company_type'           => 'Safety Services Contractor',
                'scope_of_work'          => 'Emergency Support',
                'registration_number'    => 'CR-200567',
                'country'                => 'Saudi Arabia',
                'city'                   => 'Rabigh',
                'site'                   => 'KAEC Rail Project',
                'project'                => 'Station Works',
                'area'                   => 'Zone B',
                'contractor_status'      => 'Active',
                'compliance_status'      => 'Compliant',
                'total_workforce'        => 25,
                'current_site_headcount' => 18,
                'safety_staff_count'     => 15,
                'supervisors_count'      => 3,
                'contract_start_date'    => '2024-03-01',
                'contract_end_date'      => '2025-12-31',
                'mobilized_date'         => '2024-03-15',
                'primary_contact_name'   => 'Khalid Al Otaibi',
                'primary_contact_phone'  => '+966 55 234 5678',
                'primary_contact_email'  => 'khalid@gulfsafety.com',
            ],
            [
                'contractor_name'        => 'Heavy Lift Arabia',
                'company_type'           => 'Lifting Contractor',
                'scope_of_work'          => 'Lifting Operations',
                'registration_number'    => 'CR-300891',
                'country'                => 'Saudi Arabia',
                'city'                   => 'KAEC',
                'site'                   => 'KAEC Rail Project',
                'area'                   => 'Zone C',
                'contractor_status'      => 'Approved',
                'compliance_status'      => 'Partially Compliant',
                'total_workforce'        => 40,
                'current_site_headcount' => 0,
                'operators_count'        => 20,
                'drivers_count'          => 8,
                'contract_start_date'    => '2024-06-01',
                'contract_end_date'      => '2025-06-30',
                'primary_contact_name'   => 'Sami Ibrahim',
                'primary_contact_phone'  => '+966 56 345 6789',
            ],
            [
                'contractor_name'        => 'Scaffolding Masters',
                'company_type'           => 'Scaffolding Contractor',
                'scope_of_work'          => 'Scaffolding',
                'registration_number'    => 'CR-400123',
                'country'                => 'Saudi Arabia',
                'city'                   => 'Jeddah',
                'site'                   => 'KAEC Rail Project',
                'area'                   => 'Zone A',
                'contractor_status'      => 'Suspended',
                'compliance_status'      => 'Non-Compliant',
                'total_workforce'        => 35,
                'current_site_headcount' => 0,
                'skilled_workers_count'  => 25,
                'contract_start_date'    => '2024-02-01',
                'contract_end_date'      => '2025-08-31',
                'suspension_reason'      => 'Expired safety certifications and insurance documents',
                'suspended_at'           => '2025-01-15',
                'primary_contact_name'   => 'Faisal Mahmoud',
                'primary_contact_phone'  => '+966 54 456 7890',
            ],
            [
                'contractor_name'        => 'Green Waste Solutions',
                'company_type'           => 'Waste Contractor',
                'scope_of_work'          => 'Waste Disposal',
                'registration_number'    => 'CR-500456',
                'country'                => 'Saudi Arabia',
                'city'                   => 'KAEC',
                'site'                   => 'KAEC Rail Project',
                'contractor_status'      => 'Active',
                'compliance_status'      => 'Compliant',
                'total_workforce'        => 15,
                'current_site_headcount' => 12,
                'drivers_count'          => 6,
                'contract_start_date'    => '2024-04-01',
                'contract_end_date'      => '2026-03-31',
                'mobilized_date'         => '2024-04-10',
                'primary_contact_name'   => 'Omar Hassan',
                'primary_contact_phone'  => '+966 50 567 8901',
                'primary_contact_email'  => 'omar@greenwaste.sa',
            ],
            [
                'contractor_name'        => 'Electra Power Systems',
                'company_type'           => 'Electrical Contractor',
                'scope_of_work'          => 'Electrical Works',
                'registration_number'    => 'CR-600789',
                'country'                => 'Saudi Arabia',
                'city'                   => 'Riyadh',
                'site'                   => 'KAEC Rail Project',
                'area'                   => 'Station 1',
                'contractor_status'      => 'Draft',
                'compliance_status'      => 'Under Review',
                'total_workforce'        => 50,
                'primary_contact_name'   => 'Ali Nasser',
                'primary_contact_phone'  => '+966 55 678 9012',
            ],
            [
                'contractor_name'        => 'Desert Mechanical Works',
                'company_type'           => 'Mechanical Contractor',
                'scope_of_work'          => 'Mechanical Works',
                'registration_number'    => 'CR-700012',
                'country'                => 'Saudi Arabia',
                'city'                   => 'Jeddah',
                'site'                   => 'KAEC Rail Project',
                'area'                   => 'Zone B',
                'contractor_status'      => 'Active',
                'compliance_status'      => 'Partially Compliant',
                'total_workforce'        => 65,
                'current_site_headcount' => 48,
                'skilled_workers_count'  => 40,
                'supervisors_count'      => 5,
                'contract_start_date'    => '2024-01-01',
                'contract_end_date'      => '2025-05-15',
                'mobilized_date'         => '2024-01-10',
                'primary_contact_name'   => 'Mohammed Yousuf',
                'primary_contact_phone'  => '+966 54 789 0123',
                'primary_contact_email'  => 'myousuf@desertmech.com',
            ],
            [
                'contractor_name'        => 'Rail Track Specialists',
                'company_type'           => 'Rail / Infrastructure Contractor',
                'scope_of_work'          => 'Rail / Track Works',
                'registration_number'    => 'CR-800345',
                'country'                => 'Saudi Arabia',
                'city'                   => 'KAEC',
                'site'                   => 'KAEC Rail Project',
                'project'                => 'Track Laying',
                'area'                   => 'Main Line',
                'contractor_status'      => 'Active',
                'compliance_status'      => 'Compliant',
                'total_workforce'        => 200,
                'current_site_headcount' => 150,
                'skilled_workers_count'  => 100,
                'unskilled_workers_count'=> 50,
                'supervisors_count'      => 15,
                'operators_count'        => 25,
                'drivers_count'          => 10,
                'contract_start_date'    => '2023-06-01',
                'contract_end_date'      => '2026-12-31',
                'mobilized_date'         => '2023-07-01',
                'primary_contact_name'   => 'Tariq Al Faisal',
                'primary_contact_designation' => 'Operations Director',
                'primary_contact_phone'  => '+966 50 890 1234',
                'primary_contact_email'  => 'tariq@railtrack.sa',
            ],
        ];

        foreach ($contractors as $data) {
            $contractor = Contractor::create(array_merge($data, [
                'created_by' => $userId,
                'updated_by' => $userId,
            ]));

            // Add contacts
            if ($contractor->primary_contact_name) {
                ContractorContact::create([
                    'contractor_id'      => $contractor->id,
                    'name'               => $contractor->primary_contact_name,
                    'designation'        => $contractor->primary_contact_designation ?? 'Primary Contact',
                    'role'               => 'Primary Contact',
                    'phone'              => $contractor->primary_contact_phone,
                    'email'              => $contractor->primary_contact_email,
                    'is_primary_contact' => true,
                ]);
            }

            // Add HSE contact for active contractors
            if ($contractor->contractor_status === 'Active') {
                ContractorContact::create([
                    'contractor_id'   => $contractor->id,
                    'name'            => 'HSE Rep - ' . $contractor->contractor_name,
                    'designation'     => 'Safety Officer',
                    'role'            => 'HSE / Safety Representative',
                    'phone'           => '+966 5x xxx xxxx',
                    'is_safety_rep'   => true,
                ]);
            }

            // Add sample documents for active/approved contractors
            if (in_array($contractor->contractor_status, ['Active', 'Approved', 'Suspended'])) {
                $docTemplates = [
                    ['type' => 'Trade License', 'days_offset' => 180],
                    ['type' => 'Public Liability Insurance', 'days_offset' => 90],
                    ['type' => 'Workers Compensation Insurance', 'days_offset' => 120],
                    ['type' => 'Safety Certification', 'days_offset' => 60],
                ];

                // For suspended contractor, make some expired
                if ($contractor->contractor_status === 'Suspended') {
                    $docTemplates[0]['days_offset'] = -30; // Expired
                    $docTemplates[3]['days_offset'] = -15; // Expired
                }

                foreach ($docTemplates as $docTmpl) {
                    ContractorDocument::create([
                        'contractor_id'  => $contractor->id,
                        'document_type'  => $docTmpl['type'],
                        'document_number' => 'DOC-' . rand(10000, 99999),
                        'issue_date'     => now()->subYear(),
                        'expiry_date'    => now()->addDays($docTmpl['days_offset']),
                        'issued_by'      => 'Government Authority',
                        'uploaded_by'    => $userId,
                        'uploaded_by_name' => 'System',
                        'verification_status' => $docTmpl['days_offset'] > 0 ? 'Verified' : 'Pending',
                    ]);
                }
            }

            // Recalculate
            $contractor->recalculateExpiryFlags();
            $contractor->recalculateCounts();

            // Add creation log
            ContractorLog::create([
                'contractor_id'     => $contractor->id,
                'action'            => 'Contractor Created',
                'to_status'         => $contractor->contractor_status,
                'performed_by'      => $userId,
                'performed_by_name' => 'System Seeder',
                'performed_by_role' => 'master',
                'description'       => 'Test data seeded',
            ]);

            // Add approval log for approved/active
            if (in_array($contractor->contractor_status, ['Active', 'Approved'])) {
                $contractor->update([
                    'approved_by'    => 'System Admin',
                    'approved_by_id' => $userId,
                    'approved_at'    => now()->subMonths(3),
                ]);

                ContractorLog::create([
                    'contractor_id'     => $contractor->id,
                    'action'            => 'Status Changed',
                    'from_status'       => 'Draft',
                    'to_status'         => 'Approved',
                    'performed_by'      => $userId,
                    'performed_by_name' => 'System Admin',
                    'performed_by_role' => 'master',
                    'description'       => 'Approved during seeding',
                ]);
            }
        }
    }
}
