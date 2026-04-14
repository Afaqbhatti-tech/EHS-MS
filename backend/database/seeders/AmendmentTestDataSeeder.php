<?php

namespace Database\Seeders;

use App\Models\Permit;
use App\Models\PermitAmendment;
use App\Models\PermitAmendmentChange;
use App\Models\PermitAmendmentAttachment;
use App\Models\PermitAmendmentLog;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class AmendmentTestDataSeeder extends Seeder
{
    public function run(): void
    {
        $permits = Permit::limit(6)->get();
        if ($permits->isEmpty()) {
            $this->command->warn('No permits found. Skipping amendment seeder.');
            return;
        }

        $users = User::limit(5)->get();
        $user = $users->first();

        $types = [
            'Date Extension', 'Scope Change', 'Location Change',
            'Hazard Update', 'Equipment Change', 'Manpower Change',
            'Supervisor Change', 'Work Method Change',
        ];
        $categories = ['Minor', 'Major'];
        $priorities = ['Low', 'Medium', 'High', 'Urgent', 'Critical'];
        $statuses = ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Approved with Comments'];

        $changeCategories = ['Permit Basics', 'Location', 'People', 'Equipment', 'Hazards', 'Control Measures'];
        $changeFields = [
            'Permit Basics' => [
                ['Start Date', '2026-01-15', '2026-02-01', 'Project schedule updated'],
                ['End Date', '2026-03-31', '2026-04-30', 'Extension required'],
                ['Work Scope', 'Steel erection L1-L3', 'Steel erection L1-L5', 'Additional floors added'],
                ['Shift', 'Day shift only', 'Day + Night shift', 'Accelerated schedule'],
            ],
            'Location' => [
                ['Work Area', 'Zone A - Level 3', 'Zone A - Level 3 & 4', 'Scope expanded'],
                ['Zone', 'North Wing', 'North & East Wing', 'Work area extended'],
                ['Site', 'Building A', 'Building A & B', 'Multi-building scope'],
            ],
            'People' => [
                ['Permit Holder', 'John Smith', 'Ahmed Hassan', 'Personnel rotation'],
                ['Supervisor', 'Mike Johnson', 'Sara Ahmed', 'Team restructure'],
                ['Contractor', 'ABC Contracting', 'XYZ Engineering', 'Contractor replaced'],
            ],
            'Equipment' => [
                ['Crane Type', '50T Mobile Crane', '80T Mobile Crane', 'Heavier loads required'],
                ['MEWP', 'Scissor Lift 12m', 'Boom Lift 18m', 'Higher reach needed'],
            ],
            'Hazards' => [
                ['Hazard Level', 'Medium', 'High', 'New hazard identified during work'],
                ['Risk Assessment', 'Standard RA-042', 'Updated RA-042 Rev.1', 'Additional controls needed'],
            ],
            'Control Measures' => [
                ['PPE Requirements', 'Hard hat, safety boots', 'Hard hat, safety boots, harness, goggles', 'Updated for new scope'],
                ['Safety Nets', 'Not required', 'Required below L4', 'Fall protection for additional height'],
            ],
        ];

        $count = 0;
        foreach ($permits->take(5) as $permit) {
            $numAmendments = rand(1, 3);

            for ($rev = 1; $rev <= $numAmendments; $rev++) {
                $status = $statuses[array_rand($statuses)];
                $type = $types[array_rand($types)];
                $cat = $categories[array_rand($categories)];
                $priority = $priorities[array_rand($priorities)];
                $reqUser = $users->count() > 1 ? $users->random() : $user;
                $revUser = $users->count() > 1 ? $users->random() : $user;

                $isApproved = in_array($status, ['Approved', 'Approved with Comments']);
                $isRejected = $status === 'Rejected';

                $amendment = PermitAmendment::create([
                    'permit_id'            => $permit->id,
                    'amendment_title'      => $type . ' for ' . ($permit->ref_number ?? 'Permit'),
                    'amendment_type'       => $type,
                    'amendment_category'   => $cat,
                    'reason'               => 'Test reason: ' . $type . ' required due to project schedule changes and updated site conditions.',
                    'amendment_reason'     => 'Test reason: ' . $type . ' required due to project schedule changes.',
                    'priority'             => $priority,
                    'status'               => $status,
                    'requested_by'         => $reqUser?->name ?? 'Test User',
                    'requested_by_id'      => $reqUser?->id,
                    'request_date'         => now()->subDays(rand(1, 30))->toDateString(),
                    'effective_from'       => now()->addDays(rand(1, 14))->toDateString(),
                    'effective_to'         => now()->addDays(rand(30, 90))->toDateString(),
                    'notes'                => 'Seeded test amendment #' . ($count + 1),
                    'is_major_change_flagged' => $cat === 'Major',
                    'major_change_note'       => $cat === 'Major' ? 'Major change flagged for review.' : null,
                    'reviewed_by'          => $isApproved || $isRejected ? ($revUser?->name ?? 'Reviewer') : null,
                    'reviewed_by_id'       => $isApproved || $isRejected ? $revUser?->id : null,
                    'reviewed_at'          => $isApproved || $isRejected ? now()->subDays(rand(0, 5)) : null,
                    'approved_by'          => $isApproved ? $revUser?->id : null,
                    'approved_at'          => $isApproved ? now()->subDays(rand(0, 5)) : null,
                    'approval_comments'    => $isApproved ? 'Approved. Proceed with amended scope.' : null,
                    'rejected_by'          => $isRejected ? ($revUser?->name ?? 'Reviewer') : null,
                    'rejected_by_id'       => $isRejected ? $revUser?->id : null,
                    'rejected_at'          => $isRejected ? now()->subDays(rand(0, 3)) : null,
                    'rejection_reason'     => $isRejected ? 'Insufficient justification for the requested change. Please provide more detail.' : null,
                    'created_by'           => $reqUser?->id,
                    'updated_by'           => $reqUser?->id,
                ]);

                // Add 2-4 change rows
                $numChanges = rand(2, 4);
                $usedCategories = array_rand(array_flip($changeCategories), min($numChanges, count($changeCategories)));
                if (!is_array($usedCategories)) $usedCategories = [$usedCategories];

                foreach ($usedCategories as $order => $changeCat) {
                    $fields = $changeFields[$changeCat] ?? $changeFields['Permit Basics'];
                    $field = $fields[array_rand($fields)];

                    PermitAmendmentChange::create([
                        'amendment_id'    => $amendment->id,
                        'change_order'    => $order + 1,
                        'change_category' => $changeCat,
                        'field_name'      => $field[0],
                        'old_value'       => $field[1],
                        'new_value'       => $field[2],
                        'change_reason'   => $field[3],
                        'is_major_trigger' => in_array($changeCat, ['Hazards', 'People']) && $cat === 'Major',
                    ]);
                }

                // Add log entries
                PermitAmendmentLog::create([
                    'amendment_id'      => $amendment->id,
                    'permit_id'         => $permit->id,
                    'action'            => 'Amendment Created',
                    'from_status'       => null,
                    'to_status'         => 'Draft',
                    'performed_by'      => $reqUser?->id,
                    'performed_by_name' => $reqUser?->name ?? 'System',
                    'performed_by_role' => $reqUser?->role ?? 'unknown',
                    'description'       => 'Test amendment created by seeder',
                ]);

                if (in_array($status, ['Submitted', 'Under Review', 'Approved', 'Rejected', 'Approved with Comments'])) {
                    PermitAmendmentLog::create([
                        'amendment_id'      => $amendment->id,
                        'permit_id'         => $permit->id,
                        'action'            => 'Submitted for Review',
                        'from_status'       => 'Draft',
                        'to_status'         => 'Submitted',
                        'performed_by'      => $reqUser?->id,
                        'performed_by_name' => $reqUser?->name ?? 'System',
                        'performed_by_role' => $reqUser?->role ?? 'unknown',
                    ]);
                }

                if ($isApproved) {
                    PermitAmendmentLog::create([
                        'amendment_id'      => $amendment->id,
                        'permit_id'         => $permit->id,
                        'action'            => $status === 'Approved with Comments' ? 'Approved with Comments' : 'Approved',
                        'from_status'       => 'Submitted',
                        'to_status'         => $status,
                        'performed_by'      => $revUser?->id,
                        'performed_by_name' => $revUser?->name ?? 'Reviewer',
                        'performed_by_role' => $revUser?->role ?? 'unknown',
                        'description'       => 'Approved by reviewer',
                    ]);
                }

                if ($isRejected) {
                    PermitAmendmentLog::create([
                        'amendment_id'      => $amendment->id,
                        'permit_id'         => $permit->id,
                        'action'            => 'Rejected',
                        'from_status'       => 'Submitted',
                        'to_status'         => 'Rejected',
                        'performed_by'      => $revUser?->id,
                        'performed_by_name' => $revUser?->name ?? 'Reviewer',
                        'performed_by_role' => $revUser?->role ?? 'unknown',
                        'description'       => 'Rejected due to insufficient detail',
                    ]);
                }

                $count++;
            }
        }

        $this->command->info("Seeded {$count} permit amendments with change rows and logs.");
    }
}
