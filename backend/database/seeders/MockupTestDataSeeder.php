<?php

namespace Database\Seeders;

use App\Models\Mockup;
use App\Models\MockupComment;
use App\Models\MockupHistory;
use App\Models\RamsDocument;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MockupTestDataSeeder extends Seeder
{
    public function run(): void
    {
        $ramsDocIds = RamsDocument::pluck('id')->toArray();

        $mockups = [
            [
                'title'           => 'Steel Structure Erection - Zone A Main Building',
                'description'     => 'Mockup for steel structure erection procedure including crane positioning and lifting operations.',
                'procedure_type'  => 'Structural',
                'area'            => 'Zone A',
                'zone'            => 'North Wing',
                'phase'           => 'Execution Phase',
                'contractor'      => 'CCCC',
                'supervisor_name' => 'Ahmed Al-Rashid',
                'priority'        => 'High',
                'approval_status' => 'Approved',
                'approved_at'     => now()->subDays(5),
                'can_proceed'     => true,
            ],
            [
                'title'           => 'Concrete Pouring - Foundation Block B2',
                'description'     => 'Mockup for concrete pouring operation in Foundation Block B2 including rebar inspection and formwork verification.',
                'procedure_type'  => 'Civil',
                'area'            => 'Zone B',
                'zone'            => 'East Wing',
                'phase'           => 'Execution Phase',
                'contractor'      => 'CCC Rail',
                'supervisor_name' => 'Mohammed Al-Qahtani',
                'priority'        => 'Critical',
                'approval_status' => 'Submitted for Review',
                'submitted_at'    => now()->subDays(2),
            ],
            [
                'title'           => 'Scaffolding Installation - Station 3 Platform',
                'description'     => 'Scaffolding erection and inspection procedure for Station 3 elevated platform works.',
                'procedure_type'  => 'Work at Height',
                'area'            => 'Station 3',
                'zone'            => 'Platform Level',
                'phase'           => 'Execution Phase',
                'contractor'      => 'CCCC',
                'supervisor_name' => 'Fahad Al-Otaibi',
                'priority'        => 'High',
                'approval_status' => 'Approved with Comments',
                'has_unresolved_comments'  => true,
                'unresolved_comment_count' => 2,
            ],
            [
                'title'           => 'Electrical Panel Installation - Substation 1',
                'description'     => 'Installation procedure for main electrical panels in Substation 1 including isolation and lockout/tagout procedures.',
                'procedure_type'  => 'Electrical',
                'area'            => 'Zone C',
                'zone'            => 'Utility Area',
                'phase'           => 'Commissioning Phase',
                'contractor'      => 'Lucid Electric',
                'supervisor_name' => 'Khalid Al-Harbi',
                'priority'        => 'Medium',
                'approval_status' => 'Draft',
            ],
            [
                'title'           => 'HVAC Duct Routing - Office Block',
                'description'     => 'Mockup for HVAC ductwork routing and penetration points in the main office block.',
                'procedure_type'  => 'Mechanical',
                'area'            => 'Zone A',
                'zone'            => 'Office Block',
                'phase'           => 'Execution Phase',
                'contractor'      => 'CCC Rail',
                'supervisor_name' => 'Omar Al-Shahrani',
                'priority'        => 'Low',
                'approval_status' => 'Rejected',
                'rejection_reason' => 'RAMS document needs to be updated with the revised duct routing plan. Current RAMS does not address fire damper locations.',
                'rejected_at'     => now()->subDays(1),
            ],
            [
                'title'           => 'Waterproofing Application - Basement Level',
                'description'     => 'Waterproofing membrane application procedure for basement retaining walls and floor slab.',
                'procedure_type'  => 'Civil',
                'area'            => 'Zone B',
                'zone'            => 'Basement',
                'phase'           => 'Execution Phase',
                'contractor'      => 'CCCC',
                'supervisor_name' => 'Saad Al-Dosari',
                'priority'        => 'High',
                'approval_status' => 'Comments Resolved',
                'can_proceed'     => true,
            ],
            [
                'title'           => 'Crane Mobilization - Tower Crane TC-01',
                'description'     => 'Tower crane mobilization, erection and commissioning procedure for TC-01 in Zone D.',
                'procedure_type'  => 'Lifting',
                'area'            => 'Zone D',
                'zone'            => 'Crane Pad 1',
                'phase'           => 'Planning Phase',
                'contractor'      => 'Lucid Cranes',
                'supervisor_name' => 'Rashid Al-Ghamdi',
                'priority'        => 'Critical',
                'approval_status' => 'Re-submitted',
                'submitted_at'    => now()->subHours(6),
            ],
            [
                'title'           => 'Fire Stopping Installation - Core Walls',
                'description'     => 'Fire stopping and fireseal installation at all penetration points through core walls.',
                'procedure_type'  => 'Fire Protection',
                'area'            => 'Zone A',
                'zone'            => 'Core Structure',
                'phase'           => 'Execution Phase',
                'contractor'      => 'FFT Safety',
                'supervisor_name' => 'Ibrahim Al-Zahrani',
                'priority'        => 'Medium',
                'approval_status' => 'Draft',
            ],
        ];

        foreach ($mockups as $data) {
            $ramsId = !empty($ramsDocIds) ? $ramsDocIds[array_rand($ramsDocIds)] : null;
            $data['rams_document_id'] = $ramsId;
            $data['status'] = 'Open';
            $data['created_by'] = null;

            $mockup = Mockup::create($data);

            // Add history
            $mockup->logHistory('Created', null, 'Draft', 'Mockup created (seeded)');

            if ($data['approval_status'] !== 'Draft') {
                $mockup->logHistory('Submitted for Review', 'Draft', 'Submitted for Review', 'Submitted for review');
            }

            if ($data['approval_status'] === 'Approved') {
                $mockup->logHistory('Approved', 'Submitted for Review', 'Approved', 'Approved. Activity may proceed.');
            }

            // Add sample comments for the one with unresolved comments
            if ($data['approval_status'] === 'Approved with Comments') {
                MockupComment::create([
                    'mockup_id'             => $mockup->id,
                    'user_name'             => 'Client Inspector',
                    'user_role'             => 'client',
                    'comment_type'          => 'Review Comment',
                    'comment_text'          => 'Please ensure the scaffolding base plates are properly aligned with the structural grid. The current layout shows a 50mm offset that needs to be addressed before proceeding.',
                    'is_resolved'           => false,
                    'mockup_status_at_time' => 'Approved with Comments',
                ]);
                MockupComment::create([
                    'mockup_id'             => $mockup->id,
                    'user_name'             => 'Client Inspector',
                    'user_role'             => 'client',
                    'comment_type'          => 'Review Comment',
                    'comment_text'          => 'The edge protection detail at the platform perimeter does not match the approved RAMS drawing. Please revise to include double guardrails as specified.',
                    'is_resolved'           => false,
                    'mockup_status_at_time' => 'Approved with Comments',
                ]);
            }
        }
    }
}
