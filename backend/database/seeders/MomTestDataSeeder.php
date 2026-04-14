<?php

namespace Database\Seeders;

use App\Models\Mom;
use App\Models\MomPoint;
use App\Models\MomPointUpdate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Carbon\Carbon;

class MomTestDataSeeder extends Seeder
{
    public function run(): void
    {
        if (Mom::where('mom_code', 'like', 'MOM-%')->count() > 0) {
            $this->command->info('MOM test data already exists, skipping.');
            return;
        }

        $now = Carbon::now();
        $userId = \App\Models\User::first()?->id;

        // ── WEEK 7 ──────────────────────────────────────
        $week7 = Mom::create([
            'title'             => 'HSE Weekly Meeting Week 7',
            'meeting_date'      => $now->copy()->subWeeks(3)->startOfWeek()->format('Y-m-d'),
            'week_number'       => (int) $now->copy()->subWeeks(3)->format('W'),
            'year'              => (int) $now->copy()->subWeeks(3)->format('o'),
            'meeting_type'      => 'Weekly HSE Meeting',
            'meeting_location'  => 'Main Office',
            'chaired_by'        => 'Ahmad Al-Rashid',
            'minutes_prepared_by' => 'Sarah Johnson',
            'site_project'      => 'KAEC Rail Project',
            'client_name'       => 'Lucid / Royal Commission',
            'attendees'         => [
                ['name' => 'Ahmad Al-Rashid', 'company' => 'FFT', 'role' => 'HSE Manager'],
                ['name' => 'Sarah Johnson', 'company' => 'FFT', 'role' => 'Safety Officer'],
                ['name' => 'Mohammed Ali', 'company' => 'CCCC', 'role' => 'Site Engineer'],
                ['name' => 'James Wilson', 'company' => 'Lucid', 'role' => 'Client Representative'],
            ],
            'summary'           => 'Reviewed weekly safety performance. Fire extinguisher inspection delays and scaffold tagging issues discussed.',
            'status'            => 'Distributed',
            'distributed_at'    => $now->copy()->subWeeks(3)->addDays(1),
            'distributed_by'    => $userId,
            'created_by'        => $userId,
            'updated_by'        => $userId,
        ]);

        $w7Points = [
            ['title' => 'Site safety induction gaps identified', 'description' => 'Several new workers found without proper site induction records.', 'category' => 'Safety', 'status' => 'Resolved', 'priority' => 'High', 'assigned_to' => 'Sarah Johnson', 'due_date' => $now->copy()->subWeeks(3)->addDays(3)->format('Y-m-d'), 'raised_by' => 'Ahmad Al-Rashid', 'completion_percentage' => 100, 'resolved_at' => $now->copy()->subWeeks(2)],
            ['title' => 'Fire extinguisher inspection overdue', 'description' => 'Zone B and C fire extinguishers past inspection due date.', 'category' => 'Safety', 'status' => 'Resolved', 'priority' => 'Critical', 'assigned_to' => 'Mohammed Ali', 'due_date' => $now->copy()->subWeeks(3)->addDays(2)->format('Y-m-d'), 'raised_by' => 'Sarah Johnson', 'completion_percentage' => 100, 'resolved_at' => $now->copy()->subWeeks(2)->subDays(1)],
            ['title' => 'Scaffold tagging non-compliance', 'description' => 'Multiple scaffolds without proper inspection tags in Building A.', 'category' => 'Safety', 'status' => 'Closed', 'priority' => 'High', 'assigned_to' => 'Mohammed Ali', 'due_date' => $now->copy()->subWeeks(3)->addDays(5)->format('Y-m-d'), 'raised_by' => 'James Wilson', 'completion_percentage' => 100, 'resolved_at' => $now->copy()->subWeeks(2)->subDays(2)],
            ['title' => 'Missing TBT records for CCCC team', 'description' => 'Toolbox talk records not submitted for 3 consecutive days.', 'category' => 'Administrative', 'status' => 'Resolved', 'priority' => 'Medium', 'assigned_to' => 'Mohammed Ali', 'due_date' => $now->copy()->subWeeks(3)->addDays(4)->format('Y-m-d'), 'raised_by' => 'Ahmad Al-Rashid', 'completion_percentage' => 100, 'resolved_at' => $now->copy()->subWeeks(2)],
            ['title' => 'Spill kit not replenished at Zone B', 'description' => 'Spill kit used during last incident not restocked.', 'category' => 'Environmental', 'status' => 'Carried Forward', 'priority' => 'Medium', 'assigned_to' => 'Sarah Johnson', 'due_date' => $now->copy()->subWeeks(2)->format('Y-m-d'), 'raised_by' => 'Sarah Johnson', 'completion_percentage' => 30],
        ];

        $this->createPoints($week7, $w7Points, $userId);

        // ── WEEK 8 ──────────────────────────────────────
        $week8 = Mom::create([
            'title'             => 'HSE Weekly Meeting Week 8',
            'meeting_date'      => $now->copy()->subWeeks(2)->startOfWeek()->format('Y-m-d'),
            'week_number'       => (int) $now->copy()->subWeeks(2)->format('W'),
            'year'              => (int) $now->copy()->subWeeks(2)->format('o'),
            'meeting_type'      => 'Weekly HSE Meeting',
            'meeting_location'  => 'Site Office - Zone A',
            'chaired_by'        => 'Ahmad Al-Rashid',
            'minutes_prepared_by' => 'Sarah Johnson',
            'site_project'      => 'KAEC Rail Project',
            'client_name'       => 'Lucid / Royal Commission',
            'attendees'         => [
                ['name' => 'Ahmad Al-Rashid', 'company' => 'FFT', 'role' => 'HSE Manager'],
                ['name' => 'Sarah Johnson', 'company' => 'FFT', 'role' => 'Safety Officer'],
                ['name' => 'Mohammed Ali', 'company' => 'CCCC', 'role' => 'Site Engineer'],
                ['name' => 'Omar Hassan', 'company' => 'FFT', 'role' => 'Environmental Officer'],
            ],
            'summary'           => 'Follow-up on Week 7 items. New concerns about crane inspection and hot work permits. Spill kit issue carried forward.',
            'previous_mom_id'   => $week7->id,
            'status'            => 'Distributed',
            'distributed_at'    => $now->copy()->subWeeks(2)->addDays(1),
            'distributed_by'    => $userId,
            'created_by'        => $userId,
            'updated_by'        => $userId,
        ]);

        // Carry forward the spill kit point from Week 7
        $spillKitW7 = MomPoint::where('mom_id', $week7->id)->where('title', 'like', 'Spill kit%')->first();
        $spillKitCarry = null;
        if ($spillKitW7) {
            $spillKitCarry = $this->carryPoint($spillKitW7, $week8, $userId);
        }

        $w8Points = [
            ['title' => 'Crane inspection certificate expiring', 'description' => 'Tower crane TC-01 certificate expires in 5 days.', 'category' => 'Safety', 'status' => 'Resolved', 'priority' => 'Critical', 'assigned_to' => 'Mohammed Ali', 'due_date' => $now->copy()->subWeeks(2)->addDays(3)->format('Y-m-d'), 'raised_by' => 'Ahmad Al-Rashid', 'completion_percentage' => 100, 'resolved_at' => $now->copy()->subWeeks(1)],
            ['title' => 'Hot work permit process non-compliance', 'description' => 'Multiple hot work activities observed without valid permits.', 'category' => 'Safety', 'status' => 'In Progress', 'priority' => 'High', 'assigned_to' => 'Sarah Johnson', 'due_date' => $now->copy()->subWeeks(1)->format('Y-m-d'), 'raised_by' => 'James Wilson', 'completion_percentage' => 60],
            ['title' => 'Environmental waste segregation audit', 'description' => 'Conduct audit of waste segregation practices across all zones.', 'category' => 'Environmental', 'status' => 'In Progress', 'priority' => 'Medium', 'assigned_to' => 'Omar Hassan', 'due_date' => $now->copy()->subWeeks(1)->addDays(3)->format('Y-m-d'), 'raised_by' => 'Omar Hassan', 'completion_percentage' => 40],
            ['title' => 'PPE compliance check for new contractor team', 'description' => 'New electrical contractor team needs PPE verification.', 'category' => 'Safety', 'status' => 'Closed', 'priority' => 'Medium', 'assigned_to' => 'Sarah Johnson', 'due_date' => $now->copy()->subWeeks(2)->addDays(4)->format('Y-m-d'), 'raised_by' => 'Sarah Johnson', 'completion_percentage' => 100, 'resolved_at' => $now->copy()->subWeeks(1)->subDays(1)],
        ];

        $this->createPoints($week8, $w8Points, $userId);

        // ── WEEK 9 ──────────────────────────────────────
        $week9 = Mom::create([
            'title'             => 'HSE Weekly Meeting Week 9',
            'meeting_date'      => $now->copy()->subWeeks(1)->startOfWeek()->format('Y-m-d'),
            'week_number'       => (int) $now->copy()->subWeeks(1)->format('W'),
            'year'              => (int) $now->copy()->subWeeks(1)->format('o'),
            'meeting_type'      => 'Weekly HSE Meeting',
            'meeting_location'  => 'Main Office',
            'chaired_by'        => 'Ahmad Al-Rashid',
            'minutes_prepared_by' => 'Sarah Johnson',
            'site_project'      => 'KAEC Rail Project',
            'client_name'       => 'Lucid / Royal Commission',
            'attendees'         => [
                ['name' => 'Ahmad Al-Rashid', 'company' => 'FFT', 'role' => 'HSE Manager'],
                ['name' => 'Sarah Johnson', 'company' => 'FFT', 'role' => 'Safety Officer'],
                ['name' => 'Mohammed Ali', 'company' => 'CCCC', 'role' => 'Site Engineer'],
                ['name' => 'Omar Hassan', 'company' => 'FFT', 'role' => 'Environmental Officer'],
                ['name' => 'James Wilson', 'company' => 'Lucid', 'role' => 'Client Representative'],
            ],
            'summary'           => 'Progress review on carried items. New RAMS review pending for tunnel works. Client raised concerns on emergency response drill schedule.',
            'previous_mom_id'   => $week8->id,
            'status'            => 'Finalised',
            'created_by'        => $userId,
            'updated_by'        => $userId,
        ]);

        // Carry forward unresolved points from Week 8
        $unresolvedW8 = MomPoint::where('mom_id', $week8->id)->whereIn('status', ['Open', 'In Progress', 'Pending', 'Blocked'])->get();
        foreach ($unresolvedW8 as $up) {
            $this->carryPoint($up, $week9, $userId);
        }

        $w9Points = [
            ['title' => 'RAMS review for tunnel works Phase 2', 'description' => 'RAMS document needs review and approval before tunnel works commence.', 'category' => 'Technical', 'status' => 'Open', 'priority' => 'Critical', 'assigned_to' => 'Ahmad Al-Rashid', 'due_date' => $now->copy()->addDays(2)->format('Y-m-d'), 'raised_by' => 'James Wilson', 'completion_percentage' => 0],
            ['title' => 'Emergency response drill scheduling', 'description' => 'Client requires emergency drill to be conducted within 2 weeks.', 'category' => 'Safety', 'status' => 'Open', 'priority' => 'High', 'assigned_to' => 'Sarah Johnson', 'due_date' => $now->copy()->addDays(10)->format('Y-m-d'), 'raised_by' => 'James Wilson', 'completion_percentage' => 0],
            ['title' => 'Safety signage update for restricted zones', 'description' => 'Update safety signage in zones B and C per new layout.', 'category' => 'Safety', 'status' => 'In Progress', 'priority' => 'Medium', 'assigned_to' => 'Mohammed Ali', 'due_date' => $now->copy()->addDays(5)->format('Y-m-d'), 'raised_by' => 'Sarah Johnson', 'completion_percentage' => 25],
            ['title' => 'First aid kit audit - all zones', 'description' => 'Complete audit of first aid kits across all construction zones.', 'category' => 'Safety', 'status' => 'Open', 'priority' => 'Medium', 'assigned_to' => 'Omar Hassan', 'due_date' => $now->copy()->addDays(7)->format('Y-m-d'), 'raised_by' => 'Ahmad Al-Rashid', 'completion_percentage' => 0],
        ];

        $this->createPoints($week9, $w9Points, $userId);

        // ── WEEK 10 (Current Week - Draft) ──────────────
        $week10 = Mom::create([
            'title'             => 'HSE Weekly Meeting Week 10',
            'meeting_date'      => $now->startOfWeek()->format('Y-m-d'),
            'week_number'       => (int) $now->format('W'),
            'year'              => (int) $now->format('o'),
            'meeting_type'      => 'Weekly HSE Meeting',
            'meeting_location'  => 'TBD',
            'chaired_by'        => 'Ahmad Al-Rashid',
            'minutes_prepared_by' => 'Sarah Johnson',
            'site_project'      => 'KAEC Rail Project',
            'client_name'       => 'Lucid / Royal Commission',
            'attendees'         => [],
            'summary'           => null,
            'previous_mom_id'   => $week9->id,
            'status'            => 'Draft',
            'created_by'        => $userId,
            'updated_by'        => $userId,
        ]);

        // Recalculate all counts
        foreach ([$week7, $week8, $week9, $week10] as $m) {
            $m->recalculatePointCounts();
        }

        $this->command->info('MOM test data seeded successfully: 4 weeks of meetings with action points.');
    }

    private function createPoints(Mom $mom, array $pointsData, ?string $userId): void
    {
        foreach ($pointsData as $i => $data) {
            $pointNumber = (MomPoint::where('mom_id', $mom->id)->max('point_number') ?? 0) + 1;

            $point = MomPoint::create([
                'mom_id'                => $mom->id,
                'point_number'          => $pointNumber,
                'title'                 => $data['title'],
                'description'           => $data['description'] ?? null,
                'category'              => $data['category'] ?? 'Action Required',
                'raised_by'             => $data['raised_by'] ?? null,
                'assigned_to'           => $data['assigned_to'] ?? null,
                'status'                => $data['status'] ?? 'Open',
                'priority'              => $data['priority'] ?? 'Medium',
                'due_date'              => $data['due_date'] ?? null,
                'completion_percentage' => $data['completion_percentage'] ?? 0,
                'original_mom_id'       => $mom->id,
                'resolved_at'           => $data['resolved_at'] ?? null,
                'created_by'            => $userId,
                'updated_by'            => $userId,
            ]);

            MomPointUpdate::create([
                'mom_point_id'    => $point->id,
                'mom_id'          => $mom->id,
                'week_number'     => $mom->week_number,
                'year'            => $mom->year,
                'new_status'      => $point->status,
                'new_completion'  => $point->completion_percentage,
                'update_note'     => 'Point created',
                'updated_by'      => $userId,
                'updated_by_name' => 'System Seeder',
            ]);
        }
    }

    private function carryPoint(MomPoint $original, Mom $targetMom, ?string $userId): MomPoint
    {
        $pointNumber = (MomPoint::where('mom_id', $targetMom->id)->max('point_number') ?? 0) + 1;

        $newPoint = MomPoint::create([
            'mom_id'                => $targetMom->id,
            'point_number'          => $pointNumber,
            'title'                 => $original->title,
            'description'           => $original->description,
            'category'              => $original->category,
            'raised_by'             => $original->raised_by,
            'assigned_to'           => $original->assigned_to,
            'assigned_to_id'        => $original->assigned_to_id,
            'priority'              => $original->priority,
            'due_date'              => $original->due_date,
            'remarks'               => $original->remarks,
            'status'                => 'Open',
            'carried_from_point_id' => $original->id,
            'original_mom_id'       => $original->original_mom_id ?? $original->mom_id,
            'carry_count'           => $original->carry_count + 1,
            'is_recurring'          => $original->is_recurring,
            'completion_percentage' => $original->completion_percentage,
            'created_by'            => $userId,
            'updated_by'            => $userId,
        ]);

        $original->update(['status' => 'Carried Forward', 'updated_by' => $userId]);

        $origMom = Mom::find($original->mom_id);

        MomPointUpdate::create([
            'mom_point_id'    => $original->id,
            'mom_id'          => $targetMom->id,
            'week_number'     => $targetMom->week_number,
            'year'            => $targetMom->year,
            'old_status'      => 'Open',
            'new_status'      => 'Carried Forward',
            'update_note'     => 'Carried forward to Week ' . $targetMom->week_number . ' MOM',
            'updated_by'      => $userId,
            'updated_by_name' => 'System Seeder',
        ]);

        MomPointUpdate::create([
            'mom_point_id'    => $newPoint->id,
            'mom_id'          => $targetMom->id,
            'week_number'     => $targetMom->week_number,
            'year'            => $targetMom->year,
            'new_status'      => 'Open',
            'update_note'     => 'Carried forward from Week ' . ($origMom?->week_number ?? '?') . ' MOM',
            'updated_by'      => $userId,
            'updated_by_name' => 'System Seeder',
        ]);

        return $newPoint;
    }
}
