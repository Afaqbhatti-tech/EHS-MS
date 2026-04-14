<?php

namespace Database\Seeders;

use App\Models\Erp;
use App\Models\MockDrill;
use App\Models\MockDrillParticipant;
use App\Models\MockDrillResource;
use App\Models\MockDrillObservation;
use App\Models\MockDrillAction;
use App\Models\MockDrillEvaluation;
use App\Models\MockDrillEvidence;
use App\Models\MockDrillLog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DrillTestDataSeeder extends Seeder
{
    public function run(): void
    {
        $userId = DB::table('users')->where('role', 'master')->value('id') ?? DB::table('users')->first()?->id;
        $userName = DB::table('users')->where('id', $userId)->value('full_name') ?? 'System';

        // ─── ERPs ──────────────────────────────────────
        $erpTypes = [
            ['Fire Emergency Plan', 'Fire Emergency Response Plan - Main Building', 'High', 'Active'],
            ['Medical Emergency Plan', 'Medical Emergency Plan - Construction Site', 'Critical', 'Active'],
            ['Evacuation Plan', 'Site-Wide Evacuation Procedure', 'High', 'Active'],
            ['Chemical Spill Response Plan', 'Hazardous Chemical Spill Response Plan', 'Critical', 'Draft'],
            ['Confined Space Rescue Plan', 'Confined Space Entry & Rescue Plan', 'High', 'Under Review'],
            ['Work at Height Rescue Plan', 'Work at Height Rescue Protocol', 'High', 'Active'],
            ['Electrical Emergency Plan', 'Electrical Emergency Response Procedure', 'Medium', 'Draft'],
        ];

        $erps = [];
        foreach ($erpTypes as $i => [$type, $title, $risk, $status]) {
            $erps[] = Erp::create([
                'title'                => $title,
                'erp_type'             => $type,
                'version'              => 'v1.' . $i,
                'revision_number'      => 'Rev.00' . ($i + 1),
                'status'               => $status,
                'site'                 => 'KAEC Rail Project',
                'project'              => 'Main Construction',
                'area'                 => ['Zone A', 'Zone B', 'Zone C', 'Zone D'][$i % 4],
                'department'           => ['Construction', 'MEP', 'Safety', 'Operations'][$i % 4],
                'risk_level'           => $risk,
                'scenario_description' => "Standard {$type} scenario covering all aspects of emergency response for the designated area.",
                'scope'                => "This plan covers all personnel and contractors within the project site.",
                'purpose'              => "To ensure timely and effective response to {$type} situations.",
                'incident_controller'  => $userName,
                'emergency_coordinator' => 'Safety Manager',
                'assembly_point'       => 'Assembly Point ' . chr(65 + $i),
                'muster_point'         => 'Muster Station ' . ($i + 1),
                'alarm_method'         => ['Fire Alarm System', 'PA System', 'Air Horn', 'Radio Alert'][$i % 4],
                'communication_method' => 'Two-way radio + PA system',
                'radio_channel'        => 'Channel ' . ($i + 1),
                'emergency_contacts'   => [
                    ['name' => 'Emergency Control Room', 'phone' => '800-111-' . str_pad($i, 4, '0', STR_PAD_LEFT), 'role' => 'Control Room'],
                    ['name' => 'Site HSE Manager', 'phone' => '800-222-' . str_pad($i, 4, '0', STR_PAD_LEFT), 'role' => 'HSE Manager'],
                ],
                'fire_wardens'         => [['name' => 'Fire Warden ' . ($i + 1), 'contact' => '050-' . rand(1000000, 9999999)]],
                'first_aiders'         => [['name' => 'First Aider ' . ($i + 1), 'contact' => '050-' . rand(1000000, 9999999)]],
                'required_equipment'   => [
                    ['item' => 'Fire Extinguisher', 'qty' => 4, 'location' => 'Each floor'],
                    ['item' => 'First Aid Kit', 'qty' => 2, 'location' => 'Office & Workshop'],
                ],
                'review_frequency'     => ['Monthly', 'Quarterly', 'Bi-Annual', 'Annual'][$i % 4],
                'next_review_date'     => now()->addMonths(rand(1, 6))->format('Y-m-d'),
                'approval_date'        => $status === 'Active' ? now()->subDays(rand(10, 90))->format('Y-m-d') : null,
                'approved_by'          => $status === 'Active' ? $userName : null,
                'approved_by_id'       => $status === 'Active' ? $userId : null,
                'created_by'           => $userId,
            ]);
        }

        // ─── MOCK DRILLS ──────────────────────────────
        $drillData = [
            ['Fire Drill', 'Fire Evacuation Drill - Building A', 'Conducted', -30],
            ['Evacuation Drill', 'Full Site Evacuation Drill Q1', 'Closed', -60],
            ['First Aid Drill', 'First Aid Response Drill - Workshop', 'Conducted', -15],
            ['Spill Response Drill', 'Chemical Spill Response Exercise', 'Planned', 14],
            ['Rescue Drill', 'Confined Space Rescue Drill', 'Scheduled', 7],
            ['Medical Emergency Drill', 'Medical Emergency Response Drill', 'Planned', 21],
            ['Fire Drill', 'Night Shift Fire Drill', 'Conducted', -45],
            ['Evacuation Drill', 'Evacuation Drill Zone C', 'Under Review', -5],
            ['Chemical Leak Drill', 'Chemical Leak Containment Drill', 'Cancelled', -20],
            ['Work at Height Rescue Drill', 'Height Rescue Response Test', 'Planned', -3],
        ];

        foreach ($drillData as $i => [$type, $title, $status, $dayOffset]) {
            $plannedDate = now()->addDays($dayOffset);
            $isConducted = in_array($status, ['Conducted', 'Closed', 'Under Review']);

            $drill = MockDrill::create([
                'title'               => $title,
                'erp_id'              => $erps[$i % count($erps)]->id,
                'drill_type'          => $type,
                'planned_date'        => $plannedDate->format('Y-m-d'),
                'planned_time'        => sprintf('%02d:00', rand(8, 16)),
                'location'            => ['Building A', 'Workshop', 'Zone C', 'Main Office', 'Substation'][$i % 5],
                'area'                => ['Zone A', 'Zone B', 'Zone C', 'Zone D'][$i % 4],
                'department'          => ['Construction', 'MEP', 'Safety', 'Operations'][$i % 4],
                'responsible_person'  => $userName,
                'responsible_person_id' => $userId,
                'conducted_by'        => $isConducted ? $userName : null,
                'observed_by'         => $isConducted ? 'Safety Officer' : null,
                'scenario_description' => "Simulated {$type} scenario to test emergency response procedures and team coordination.",
                'trigger_method'      => ['Fire Alarm', 'PA Announcement', 'Air Horn', 'Radio Alert'][$i % 4],
                'expected_response'   => "All personnel evacuate within 5 minutes, muster at designated assembly points.",
                'actual_response'     => $isConducted ? "Personnel evacuated in approximately " . rand(3, 8) . " minutes." : null,
                'actual_start_time'   => $isConducted ? $plannedDate->copy()->setHour(10)->setMinute(0) : null,
                'actual_end_time'     => $isConducted ? $plannedDate->copy()->setHour(10)->setMinute(rand(20, 50)) : null,
                'alarm_trigger_time'  => $isConducted ? $plannedDate->copy()->setHour(10)->setMinute(0)->setSecond(0) : null,
                'first_response_time' => $isConducted ? $plannedDate->copy()->setHour(10)->setMinute(rand(2, 5))->setSecond(rand(0, 59)) : null,
                'evacuation_start_time'  => $isConducted ? $plannedDate->copy()->setHour(10)->setMinute(1)->setSecond(rand(0, 30)) : null,
                'evacuation_complete_time' => $isConducted ? $plannedDate->copy()->setHour(10)->setMinute(rand(6, 12))->setSecond(rand(0, 59)) : null,
                'muster_complete_time' => $isConducted ? $plannedDate->copy()->setHour(10)->setMinute(rand(10, 15))->setSecond(rand(0, 59)) : null,
                'response_complete_time' => $isConducted ? $plannedDate->copy()->setHour(10)->setMinute(rand(15, 25))->setSecond(rand(0, 59)) : null,
                'status'              => $status,
                'frequency'           => ['One-Time', 'Monthly', 'Quarterly', 'Annual'][$i % 4],
                'next_drill_due'      => now()->addMonths(rand(1, 6))->format('Y-m-d'),
                'notes'               => $isConducted ? 'Drill completed successfully with minor observations.' : null,
                'closed_at'           => $status === 'Closed' ? now()->subDays(rand(1, 10)) : null,
                'closed_by'           => $status === 'Closed' ? $userId : null,
                'closure_notes'       => $status === 'Closed' ? 'All actions completed. Drill closed.' : null,
                'created_by'          => $userId,
            ]);

            // Participants
            $participantNames = ['Ahmed Al-Rashid', 'Mohammed Hassan', 'Khalid Ibrahim', 'Omar Saeed', 'Youssef Ali', 'Tariq Nasser', 'Faisal Khan', 'Hamza Qureshi'];
            $roles = ['Incident Controller', 'Fire Warden', 'First Aider', 'Rescue Team Member', 'Safety Officer', 'Evacuee / General Staff', 'Observer'];
            $numParticipants = rand(4, 8);
            for ($p = 0; $p < $numParticipants; $p++) {
                MockDrillParticipant::create([
                    'mock_drill_id'      => $drill->id,
                    'name'               => $participantNames[$p % count($participantNames)],
                    'employee_id'        => 'EMP-' . str_pad(rand(100, 999), 4, '0', STR_PAD_LEFT),
                    'designation'        => ['Engineer', 'Technician', 'Supervisor', 'Foreman', 'Safety Officer'][$p % 5],
                    'department'         => $drill->department,
                    'company'            => ['FFT', 'Lucid', 'Contractor A', 'Contractor B'][$p % 4],
                    'emergency_role'     => $roles[$p % count($roles)],
                    'attendance_status'  => $p < $numParticipants - 1 ? 'Present' : ['Present', 'Late', 'Absent'][rand(0, 2)],
                    'participation_status' => $p === 0 ? 'Active' : ['Active', 'Passive', 'Observer'][rand(0, 2)],
                ]);
            }

            // Resources
            if ($isConducted) {
                $equipmentList = [
                    ['Fire Extinguisher', 'Fire Extinguisher', 2],
                    ['Emergency Alarm', 'Alarm', 1],
                    ['Stretcher', 'Stretcher', 1],
                    ['First Aid Box', 'First Aid Box', 2],
                    ['Two-Way Radio', 'Radio / Communication', 3],
                ];
                foreach ($equipmentList as [$name, $type, $qty]) {
                    MockDrillResource::create([
                        'mock_drill_id'  => $drill->id,
                        'equipment_name' => $name,
                        'equipment_type' => $type,
                        'quantity'       => $qty,
                        'condition'      => ['Good', 'Good', 'Fair'][rand(0, 2)],
                        'was_available'  => rand(0, 10) > 1,
                        'was_functional' => rand(0, 10) > 1,
                    ]);
                }
            }

            // Observations
            if ($isConducted) {
                $obsData = [
                    ['Delayed alarm response in Zone B', 'Negative', 'Delayed Response', 'High'],
                    ['Excellent coordination by fire wardens', 'Positive', 'Good Practice Observed', 'Low'],
                    ['Some workers missing PPE during evacuation', 'Negative', 'Missing PPE', 'Medium'],
                ];
                foreach ($obsData as $oi => [$obsTitle, $obsType, $cat, $sev]) {
                    $obs = MockDrillObservation::create([
                        'mock_drill_id'    => $drill->id,
                        'title'            => $obsTitle,
                        'description'      => "Detailed observation: {$obsTitle}. This was noted during the drill execution phase.",
                        'observation_type' => $obsType,
                        'category'         => $cat,
                        'severity'         => $sev,
                        'reported_by'      => $userName,
                        'reported_by_id'   => $userId,
                        'created_by'       => $userId,
                    ]);

                    // Actions for negative observations
                    if ($obsType === 'Negative') {
                        MockDrillAction::create([
                            'mock_drill_id'  => $drill->id,
                            'observation_id' => $obs->id,
                            'title'          => "Corrective action for: {$obsTitle}",
                            'description'    => "Implement corrective measures to address the observation.",
                            'assigned_to'    => $userName,
                            'assigned_to_id' => $userId,
                            'due_date'       => now()->addDays(rand(7, 30))->format('Y-m-d'),
                            'priority'       => $sev,
                            'status'         => $status === 'Closed' ? 'Closed' : ['Open', 'In Progress'][rand(0, 1)],
                            'closed_at'      => $status === 'Closed' ? now()->subDays(rand(1, 5)) : null,
                            'closed_by'      => $status === 'Closed' ? $userId : null,
                            'completion_notes' => $status === 'Closed' ? 'Action completed successfully.' : null,
                            'created_by'     => $userId,
                        ]);
                    }
                }
            }

            // Evaluation for conducted/closed drills
            if (in_array($status, ['Conducted', 'Closed', 'Under Review'])) {
                MockDrillEvaluation::create([
                    'mock_drill_id'             => $drill->id,
                    'overall_result'            => ['Satisfactory', 'Needs Improvement', 'Satisfactory'][$i % 3],
                    'response_time_score'       => rand(55, 95),
                    'communication_score'       => rand(60, 90),
                    'team_coordination_score'   => rand(50, 95),
                    'equipment_readiness_score' => rand(65, 95),
                    'erp_compliance_score'      => rand(60, 100),
                    'participation_score'       => rand(70, 100),
                    'drill_effectiveness'       => ['Fully Effective', 'Partially Effective', 'Fully Effective'][$i % 3],
                    'strengths'                 => 'Good team coordination and communication during the drill.',
                    'weaknesses'                => 'Some delays in initial response and PPE compliance.',
                    'recommendations'           => 'Conduct additional training for new personnel. Review alarm system.',
                    'overall_notes'             => 'Overall the drill was effective with areas for improvement identified.',
                    'evaluated_by'              => $userName,
                    'evaluated_by_id'           => $userId,
                    'evaluated_at'              => now()->subDays(rand(1, 10)),
                ]);
            }

            // Recalculate counts
            $drill->recalculateCounts();

            // Audit logs
            MockDrillLog::create([
                'mock_drill_id'     => $drill->id,
                'log_type'          => 'Drill',
                'action'            => 'Drill Created',
                'to_status'         => 'Planned',
                'description'       => "Drill {$drill->drill_code} created.",
                'performed_by'      => $userId,
                'performed_by_name' => $userName,
                'performed_by_role' => 'master',
            ]);

            if ($isConducted) {
                MockDrillLog::create([
                    'mock_drill_id'     => $drill->id,
                    'log_type'          => 'Drill',
                    'action'            => 'Drill Conducted',
                    'from_status'       => 'Planned',
                    'to_status'         => 'Conducted',
                    'description'       => "Drill conducted on site.",
                    'performed_by'      => $userId,
                    'performed_by_name' => $userName,
                    'performed_by_role' => 'master',
                ]);
            }

            if ($status === 'Closed') {
                MockDrillLog::create([
                    'mock_drill_id'     => $drill->id,
                    'log_type'          => 'Drill',
                    'action'            => 'Drill Closed',
                    'from_status'       => 'Conducted',
                    'to_status'         => 'Closed',
                    'description'       => "All actions closed. Drill closed.",
                    'performed_by'      => $userId,
                    'performed_by_name' => $userName,
                    'performed_by_role' => 'master',
                ]);
            }
        }

        // ERP audit logs
        foreach ($erps as $erp) {
            MockDrillLog::create([
                'erp_id'            => $erp->id,
                'log_type'          => 'ERP',
                'action'            => 'ERP Created',
                'to_status'         => $erp->status,
                'description'       => "ERP {$erp->erp_code} created.",
                'performed_by'      => $userId,
                'performed_by_name' => $userName,
                'performed_by_role' => 'master',
            ]);
        }
    }
}
