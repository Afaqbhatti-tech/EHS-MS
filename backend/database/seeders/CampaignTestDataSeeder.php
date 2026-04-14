<?php

namespace Database\Seeders;

use App\Models\Campaign;
use App\Models\CampaignActivity;
use App\Models\CampaignParticipant;
use App\Models\CampaignAction;
use App\Models\CampaignLog;
use Illuminate\Database\Seeder;

class CampaignTestDataSeeder extends Seeder
{
    public function run(): void
    {
        $userId = \App\Models\User::first()?->id;
        if (!$userId) {
            $this->command->warn('No users found — skipping campaign seed.');
            return;
        }

        $campaigns = [
            [
                'title'                => 'Heat Stress Awareness Week',
                'campaign_type'        => 'Health Campaign',
                'topic'                => 'Heat Stress',
                'start_date'           => '2026-03-15',
                'end_date'             => '2026-03-21',
                'frequency'            => 'One-Time',
                'owner_name'           => 'Ahmed Al-Rashid',
                'site'                 => 'KAEC Rail Project',
                'area'                 => 'Zone A',
                'department'           => 'EHS',
                'expected_participants' => 120,
                'status'               => 'Completed',
                'description'          => 'A week-long campaign to raise awareness on heat stress prevention and first aid procedures.',
                'objective'            => 'Reduce heat-related incidents by 50% during summer months.',
            ],
            [
                'title'                => 'PPE Compliance Drive Q2',
                'campaign_type'        => 'PPE Campaign',
                'topic'                => 'PPE Compliance',
                'start_date'           => '2026-04-01',
                'end_date'             => '2026-04-30',
                'frequency'            => 'Monthly',
                'owner_name'           => 'Fatima Hassan',
                'site'                 => 'KAEC Rail Project',
                'area'                 => 'Zone B',
                'department'           => 'Safety',
                'expected_participants' => 200,
                'status'               => 'Active',
                'description'          => 'Monthly PPE compliance checks and awareness sessions across all zones.',
                'objective'            => 'Achieve 95% PPE compliance rate across all work zones.',
            ],
            [
                'title'                => 'Fire Safety Month 2026',
                'campaign_type'        => 'Awareness Campaign',
                'topic'                => 'Fire Safety',
                'start_date'           => '2026-05-01',
                'end_date'             => '2026-05-31',
                'frequency'            => 'One-Time',
                'owner_name'           => 'Omar Khalid',
                'site'                 => 'KAEC Rail Project',
                'area'                 => 'All Zones',
                'department'           => 'EHS',
                'expected_participants' => 300,
                'status'               => 'Planned',
                'description'          => 'Comprehensive fire safety campaign including drills, training, and poster displays.',
                'objective'            => 'Ensure all workers can identify fire hazards and use fire extinguishers.',
            ],
            [
                'title'                => 'Housekeeping Excellence Initiative',
                'campaign_type'        => 'Housekeeping Campaign',
                'topic'                => 'Housekeeping',
                'start_date'           => '2026-03-01',
                'end_date'             => '2026-06-30',
                'frequency'            => 'Quarterly',
                'owner_name'           => 'Khalid Al-Mansour',
                'site'                 => 'KAEC Rail Project',
                'area'                 => 'Zone C',
                'department'           => 'Operations',
                'expected_participants' => 150,
                'status'               => 'Active',
                'description'          => 'Quarterly housekeeping inspection and improvement campaign.',
                'objective'            => 'Maintain 90%+ housekeeping scores in all inspected areas.',
            ],
            [
                'title'                => 'Work at Height Safety Focus',
                'campaign_type'        => 'Training Campaign',
                'topic'                => 'Work at Height',
                'start_date'           => '2026-04-15',
                'end_date'             => '2026-04-25',
                'frequency'            => 'One-Time',
                'owner_name'           => 'Ahmed Al-Rashid',
                'site'                 => 'KAEC Rail Project',
                'area'                 => 'Station 1',
                'department'           => 'EHS',
                'expected_participants' => 80,
                'status'               => 'Draft',
                'description'          => 'Targeted training campaign for work at height safety, including harness checks and fall protection.',
                'objective'            => 'Certify 100% of height workers on updated fall protection procedures.',
            ],
        ];

        foreach ($campaigns as $data) {
            $campaign = Campaign::create(array_merge($data, [
                'created_by' => $userId,
                'updated_by' => $userId,
            ]));

            // Add activities
            $activityTypes = ['Toolbox Talk (TBT)', 'Training Session', 'Safety Walk / Inspection', 'Poster / Signage Display'];
            $activityStatuses = $campaign->status === 'Completed' ? ['Conducted', 'Conducted', 'Conducted'] :
                ($campaign->status === 'Active' ? ['Conducted', 'Conducted', 'Planned'] : ['Planned', 'Planned', 'Planned']);

            for ($i = 0; $i < 3; $i++) {
                $activity = CampaignActivity::create([
                    'campaign_id'      => $campaign->id,
                    'title'            => $activityTypes[$i] . ' - ' . $campaign->title,
                    'activity_type'    => $activityTypes[$i],
                    'activity_date'    => $campaign->start_date->addDays($i * 2),
                    'location'         => $campaign->area,
                    'conducted_by'     => $campaign->owner_name,
                    'attendance_count' => $activityStatuses[$i] === 'Conducted' ? rand(15, 40) : 0,
                    'status'           => $activityStatuses[$i],
                    'created_by'       => $userId,
                ]);

                // Add participants for conducted activities
                if ($activityStatuses[$i] === 'Conducted') {
                    $names = ['John Smith', 'Ali Mohammed', 'David Chen', 'Raj Patel', 'Carlos Garcia'];
                    foreach (array_slice($names, 0, rand(3, 5)) as $name) {
                        CampaignParticipant::create([
                            'campaign_id'      => $campaign->id,
                            'activity_id'      => $activity->id,
                            'participant_name' => $name,
                            'department'       => $campaign->department,
                            'company'          => 'FFT Direct',
                            'attendance_status' => 'Present',
                        ]);
                    }
                }
            }

            // Add actions
            if (in_array($campaign->status, ['Active', 'Completed'])) {
                $actionStatuses = $campaign->status === 'Completed' ? ['Completed', 'Completed'] : ['Open', 'In Progress'];
                $actionTitles = ['Follow up on awareness gaps', 'Update training materials'];

                for ($i = 0; $i < 2; $i++) {
                    CampaignAction::create([
                        'campaign_id' => $campaign->id,
                        'title'       => $actionTitles[$i],
                        'assigned_to' => $campaign->owner_name,
                        'due_date'    => $campaign->end_date->addDays(7),
                        'priority'    => $i === 0 ? 'High' : 'Medium',
                        'status'      => $actionStatuses[$i],
                        'closed_at'   => $actionStatuses[$i] === 'Completed' ? now() : null,
                        'created_by'  => $userId,
                    ]);
                }
            }

            // Log creation
            CampaignLog::create([
                'campaign_id'       => $campaign->id,
                'action'            => 'Campaign Created',
                'performed_by'      => $userId,
                'performed_by_name' => 'System Seeder',
                'performed_by_role' => 'master',
                'description'       => 'Seeded test campaign',
            ]);

            // Recalculate counts
            $campaign->recalculateCounts();
        }
    }
}
