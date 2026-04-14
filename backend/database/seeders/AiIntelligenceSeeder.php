<?php

namespace Database\Seeders;

use App\Models\AiAlert;
use App\Models\AiInsight;
use App\Models\AiLog;
use App\Models\AiRecommendation;
use Illuminate\Database\Seeder;

class AiIntelligenceSeeder extends Seeder
{
    public function run(): void
    {
        // Seed sample insights
        $insights = [
            [
                'title'         => 'Elevated Violation Rate in Zone A — 5 incidents in 30 days',
                'description'   => 'Zone A has recorded 5 safety violations in the past 30 days, which is above the project threshold. The majority are related to PPE non-compliance and working at height procedures. Immediate toolbox talks and increased supervision are recommended.',
                'insight_type'  => 'Violation Pattern',
                'severity'      => 'High',
                'linked_module' => 'violations',
                'data_snapshot' => ['area' => 'Zone A', 'count' => 5, 'period_days' => 30],
                'generated_by'  => 'auto',
                'status'        => 'Active',
            ],
            [
                'title'         => '12 Overdue MOM Actions Require Follow-Up',
                'description'   => '12 MOM action items from weekly meetings are past their due dates. The majority are assigned to contractor HSE officers. Meeting chairs should escalate these during the next weekly review.',
                'insight_type'  => 'Action Overdue',
                'severity'      => 'Medium',
                'linked_module' => 'mom',
                'data_snapshot' => ['overdue_count' => 12],
                'generated_by'  => 'auto',
                'status'        => 'Active',
            ],
            [
                'title'         => 'Training Compliance Gap: 8 Expired Certifications',
                'description'   => '8 training records have expired across multiple trades. Workers with expired certifications should not perform related tasks until retraining is completed. Schedule a training refresher session urgently.',
                'insight_type'  => 'Training Gap',
                'severity'      => 'High',
                'linked_module' => 'training',
                'data_snapshot' => ['expired_count' => 8],
                'generated_by'  => 'auto',
                'status'        => 'Active',
            ],
        ];

        foreach ($insights as $data) {
            AiInsight::create($data);
        }

        // Seed sample recommendations
        $recs = [
            [
                'title'               => 'Schedule PPE Compliance Toolbox Talk for Zone A',
                'description'         => 'Based on the elevated violation pattern in Zone A, conduct a targeted toolbox talk on PPE requirements.',
                'recommendation_type' => 'Schedule Training',
                'priority'            => 'High',
                'linked_module'       => 'violations',
                'linked_insight_id'   => 1,
                'action_suggestion'   => '1. Schedule a toolbox talk within 48 hours. 2. Focus on PPE requirements for working at height. 3. Require attendance sign-off from all Zone A workers. 4. Follow up with spot checks for 2 weeks.',
                'expected_outcome'    => 'Reduction in PPE-related violations in Zone A by 50% within 30 days.',
                'status'              => 'Pending',
            ],
            [
                'title'               => 'Escalate Overdue MOM Actions to Project Management',
                'description'         => 'With 12 overdue MOM actions, escalation to project management is needed to drive accountability.',
                'recommendation_type' => 'Escalate to Management',
                'priority'            => 'Medium',
                'linked_module'       => 'mom',
                'linked_insight_id'   => 2,
                'action_suggestion'   => '1. Compile list of overdue items with responsible persons. 2. Present at next management review. 3. Set 7-day deadline for closure. 4. Assign backup responsible persons.',
                'expected_outcome'    => 'Closure of 80% of overdue MOM actions within 14 days.',
                'status'              => 'Pending',
            ],
        ];

        foreach ($recs as $data) {
            AiRecommendation::create($data);
        }

        // Seed sample alerts
        $alerts = [
            [
                'title'         => '3 Overdue MOM Actions',
                'description'   => '3 MOM action points are past their due dates and require follow-up.',
                'alert_type'    => 'Overdue Action',
                'severity'      => 'High',
                'linked_module' => 'mom',
                'alert_key'     => 'mom:overdue:seed',
                'status'        => 'Active',
            ],
            [
                'title'         => 'Incident Cluster Warning',
                'description'   => 'Multiple incidents reported in the last 7 days. Review safety conditions on site.',
                'alert_type'    => 'High-Risk Incident',
                'severity'      => 'Critical',
                'linked_module' => 'incidents',
                'alert_key'     => 'incidents:cluster:seed',
                'status'        => 'Active',
            ],
        ];

        foreach ($alerts as $data) {
            AiAlert::create($data);
        }

        // Seed a log entry
        AiLog::create([
            'user_name'        => 'System',
            'action_type'      => 'Insights Generated',
            'output_reference' => '3 insights created (seeder)',
            'notes'            => 'Initial seed data for AI Intelligence module.',
        ]);
    }
}
