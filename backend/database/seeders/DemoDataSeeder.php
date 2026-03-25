<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DemoDataSeeder extends Seeder
{
    private array $contractors = ['CCCC', 'CCC Rail', 'Artal', 'FFT Direct', 'KAEC Infra'];
    private array $zones = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Station Area'];

    public function run(): void
    {
        $this->seedObservations();
        $this->seedPermits();
        $this->seedIncidents();
        $this->seedViolations();
        $this->seedManpower();
        $this->seedPermitAmendments();
        $this->seedMockups();
        $this->seedMoms();
        $this->seedWasteManifests();
        $this->seedTrainingRecords();

        $this->command->info('Demo data seeded successfully.');
    }

    private function seedObservations(): void
    {
        $categories = ['Housekeeping', 'PPE', 'Scaffolding', 'Excavation', 'Electrical', 'Working at Height', 'Fire Safety', 'Material Storage'];
        $types = ['safe', 'unsafe', 'near_miss'];
        $statuses = ['open', 'open', 'open', 'closed', 'closed', 'closed', 'closed', 'in_progress'];
        $priorities = ['low', 'medium', 'high', 'critical'];

        $rows = [];
        for ($i = 1; $i <= 120; $i++) {
            $date = Carbon::today()->subDays(rand(0, 210));
            $status = $statuses[array_rand($statuses)];
            $rows[] = [
                'id' => (string) Str::uuid(),
                'ref_number' => sprintf('OBS-%04d', $i),
                'observation_date' => $date->toDateString(),
                'reporting_officer' => 'Officer ' . rand(1, 8),
                'category' => $categories[array_rand($categories)],
                'type' => $types[array_rand($types)],
                'zone' => $this->zones[array_rand($this->zones)],
                'phase' => 'Phase ' . rand(1, 3),
                'contractor' => $this->contractors[array_rand($this->contractors)],
                'priority' => $priorities[array_rand($priorities)],
                'status' => $status,
                'description' => 'Demo observation ' . $i,
                'corrective_action' => $status === 'closed' ? 'Corrective action taken' : null,
                'assigned_to' => 'Safety Team',
                'target_date' => $date->copy()->addDays(7)->toDateString(),
                'closed_date' => $status === 'closed' ? $date->copy()->addDays(rand(1, 10))->toDateString() : null,
                'created_at' => $date->toDateTimeString(),
                'updated_at' => $date->toDateTimeString(),
            ];
        }

        foreach (array_chunk($rows, 50) as $chunk) {
            DB::table('observations')->insert($chunk);
        }

        $this->command->info('  Observations: ' . count($rows));
    }

    private function seedPermits(): void
    {
        $types = ['Hot Work', 'Excavation', 'Confined Space', 'Working at Height', 'Electrical', 'Crane Lifting', 'Road Closure'];
        $statuses = ['active', 'active', 'active', 'active', 'approved', 'closed', 'closed', 'closed', 'expired', 'pending'];

        $rows = [];
        for ($i = 1; $i <= 80; $i++) {
            $validFrom = Carbon::today()->subDays(rand(0, 180));
            $status = $statuses[array_rand($statuses)];
            $rows[] = [
                'id' => (string) Str::uuid(),
                'ref_number' => sprintf('PTW-%04d', $i),
                'permit_type' => $types[array_rand($types)],
                'work_description' => 'Permit work scope ' . $i,
                'zone' => $this->zones[array_rand($this->zones)],
                'phase' => 'Phase ' . rand(1, 3),
                'contractor' => $this->contractors[array_rand($this->contractors)],
                'applicant_name' => 'Worker ' . rand(1, 30),
                'valid_from' => $validFrom->toDateTimeString(),
                'valid_to' => $validFrom->copy()->addDays(rand(1, 14))->toDateTimeString(),
                'status' => $status,
                'safety_measures' => json_encode(['Barricading', 'Fire watch', 'Gas test']),
                'ppe_requirements' => json_encode(['Helmet', 'Gloves', 'Safety harness']),
                'approved_by' => in_array($status, ['active', 'approved', 'closed']) ? 'Ahmed Siddiqui' : null,
                'approved_at' => in_array($status, ['active', 'approved', 'closed']) ? $validFrom->toDateTimeString() : null,
                'closed_by' => $status === 'closed' ? 'Safety Officer' : null,
                'closed_at' => $status === 'closed' ? $validFrom->copy()->addDays(rand(1, 7))->toDateTimeString() : null,
                'created_at' => $validFrom->toDateTimeString(),
                'updated_at' => $validFrom->toDateTimeString(),
            ];
        }

        foreach (array_chunk($rows, 50) as $chunk) {
            DB::table('permits')->insert($chunk);
        }

        $this->command->info('  Permits: ' . count($rows));
    }

    private function seedIncidents(): void
    {
        $classifications = ['Near Miss', 'First Aid', 'Medical Treatment', 'Lost Time', 'Property Damage'];
        $severities = ['low', 'medium', 'high', 'critical'];

        $rows = [];
        // Only a few incidents — keep incident-free days realistic
        for ($i = 1; $i <= 8; $i++) {
            $date = Carbon::today()->subDays(rand(87, 300)); // last incident 87+ days ago
            $rows[] = [
                'id' => (string) Str::uuid(),
                'ref_number' => sprintf('INC-%04d', $i),
                'incident_date' => $date->toDateString(),
                'incident_time' => sprintf('%02d:%02d', rand(6, 18), rand(0, 59)),
                'classification' => $classifications[array_rand($classifications)],
                'severity' => $severities[array_rand($severities)],
                'zone' => $this->zones[array_rand($this->zones)],
                'contractor' => $this->contractors[array_rand($this->contractors)],
                'description' => 'Incident description ' . $i,
                'immediate_actions' => 'Immediate response taken',
                'root_cause' => 'Root cause analysis completed',
                'corrective_actions' => json_encode(['Corrective actions implemented', 'Area barricaded']),
                'status' => $i <= 2 ? 'investigating' : 'closed',
                'reported_by' => 'Officer ' . rand(1, 5),
                'created_at' => $date->toDateTimeString(),
                'updated_at' => $date->toDateTimeString(),
            ];
        }

        DB::table('incidents')->insert($rows);
        $this->command->info('  Incidents: ' . count($rows));
    }

    private function seedViolations(): void
    {
        $severities = ['minor', 'major', 'critical'];
        $actionTypes = ['Verbal Warning', 'Written Warning', 'Suspension', 'Removal from Site', 'Fine'];

        $rows = [];
        for ($i = 1; $i <= 25; $i++) {
            $date = Carbon::today()->subDays(rand(0, 180));
            $rows[] = [
                'id' => (string) Str::uuid(),
                'ref_number' => sprintf('VIO-%04d', $i),
                'violation_date' => $date->toDateString(),
                'severity' => $severities[array_rand($severities)],
                'action_type' => $actionTypes[array_rand($actionTypes)],
                'description' => 'Violation description ' . $i,
                'contractor' => $this->contractors[array_rand($this->contractors)],
                'zone' => $this->zones[array_rand($this->zones)],
                'golden_rules' => json_encode(['Rule ' . rand(1, 12)]),
                'penalty_amount' => rand(0, 1) ? rand(500, 5000) : null,
                'status' => rand(0, 1) ? 'closed' : 'open',
                'issued_by' => 'Safety Officer ' . rand(1, 3),
                'created_at' => $date->toDateTimeString(),
                'updated_at' => $date->toDateTimeString(),
            ];
        }

        DB::table('violations')->insert($rows);
        $this->command->info('  Violations: ' . count($rows));
    }

    private function seedManpower(): void
    {
        $shifts = ['Day', 'Night'];
        $rows = [];

        // Daily records for the last 7 months
        for ($day = 210; $day >= 0; $day--) {
            $date = Carbon::today()->subDays($day);
            if ($date->isWeekend() && rand(0, 2) === 0) continue; // skip some weekends

            foreach ($this->contractors as $contractor) {
                $headcount = rand(80, 350);
                $rows[] = [
                    'id' => (string) Str::uuid(),
                    'record_date' => $date->toDateString(),
                    'shift' => $shifts[array_rand($shifts)],
                    'area' => $this->zones[array_rand($this->zones)],
                    'contractor' => $contractor,
                    'headcount' => $headcount,
                    'man_hours' => $headcount * rand(8, 12),
                    'worker_categories' => json_encode(['Skilled' => rand(30, 100), 'Unskilled' => rand(50, 200), 'Supervisors' => rand(5, 20)]),
                    'notes' => null,
                    'created_at' => $date->toDateTimeString(),
                    'updated_at' => $date->toDateTimeString(),
                ];
            }
        }

        foreach (array_chunk($rows, 100) as $chunk) {
            DB::table('manpower_records')->insert($chunk);
        }

        $this->command->info('  Manpower records: ' . count($rows));
    }

    private function seedPermitAmendments(): void
    {
        $permitIds = DB::table('permits')->pluck('id')->toArray();
        if (empty($permitIds)) return;

        $statuses = ['pending', 'pending', 'pending', 'approved', 'approved', 'rejected'];
        $rows = [];

        for ($i = 1; $i <= 12; $i++) {
            $date = Carbon::today()->subDays(rand(0, 60));
            $status = $statuses[array_rand($statuses)];
            $rows[] = [
                'id' => (string) Str::uuid(),
                'ref_number' => sprintf('AMD-%04d', $i),
                'permit_id' => $permitIds[array_rand($permitIds)],
                'amendment_reason' => 'Extension of work duration by ' . rand(1, 5) . ' days',
                'changes_description' => 'Duration extended due to weather/scope change',
                'status' => $status,
                'requested_by' => 'Worker ' . rand(1, 10),
                'approved_by' => $status === 'approved' ? 'Ahmed Siddiqui' : null,
                'approved_at' => $status === 'approved' ? $date->toDateTimeString() : null,
                'created_at' => $date->toDateTimeString(),
                'updated_at' => $date->toDateTimeString(),
            ];
        }

        DB::table('permit_amendments')->insert($rows);
        $this->command->info('  Permit amendments: ' . count($rows));
    }

    private function seedMockups(): void
    {
        $statuses = ['pending', 'pending', 'pending', 'approved', 'approved', 'verified', 'verified', 'rejected'];
        $types = ['Structural', 'MEP', 'Finishing', 'Facade', 'Landscape'];

        $rows = [];
        for ($i = 1; $i <= 18; $i++) {
            $date = Carbon::today()->subDays(rand(0, 120));
            $rows[] = [
                'id' => (string) Str::uuid(),
                'ref_number' => sprintf('MU-%04d', $i),
                'title' => $types[array_rand($types)] . ' mock-up — ' . $this->zones[array_rand($this->zones)],
                'procedure_type' => $types[array_rand($types)],
                'area' => $this->zones[array_rand($this->zones)],
                'contractor' => $this->contractors[array_rand($this->contractors)],
                'status' => $statuses[array_rand($statuses)],
                'description' => 'Mock-up verification ' . $i,
                'created_at' => $date->toDateTimeString(),
                'updated_at' => $date->toDateTimeString(),
            ];
        }

        DB::table('mockups')->insert($rows);
        $this->command->info('  Mockups: ' . count($rows));
    }

    private function seedMoms(): void
    {
        $types = ['Weekly Safety', 'Monthly Review', 'Contractor Coordination', 'Emergency Response'];
        $statuses = ['open', 'open', 'closed', 'closed', 'closed'];

        $rows = [];
        for ($i = 1; $i <= 24; $i++) {
            $date = Carbon::today()->subWeeks($i - 1)->startOfWeek()->addDays(3); // Thursdays
            $rows[] = [
                'id' => (string) Str::uuid(),
                'ref_number' => sprintf('MOM-%04d', $i),
                'meeting_date' => $date->toDateString(),
                'meeting_type' => $types[array_rand($types)],
                'location' => 'Conference Room ' . rand(1, 3),
                'attendees' => json_encode(['Ahmed S.', 'Safety Team', 'CCCC Rep', 'FFT Lead']),
                'action_items' => json_encode([
                    ['text' => 'Update inspection checklist', 'owner' => 'Safety Team', 'status' => $i > 4 ? 'closed' : 'open'],
                    ['text' => 'Submit revised plan', 'owner' => 'CCCC HSE', 'status' => $i > 2 ? 'closed' : 'open'],
                ]),
                'status' => $i <= 4 ? 'open' : 'closed',
                'recorded_by' => 'Admin',
                'created_at' => $date->toDateTimeString(),
                'updated_at' => $date->toDateTimeString(),
            ];
        }

        DB::table('moms')->insert($rows);
        $this->command->info('  MOMs: ' . count($rows));
    }

    private function seedWasteManifests(): void
    {
        $wasteTypes = ['General Construction', 'Hazardous', 'Recyclable', 'Chemical', 'Electronic', 'Organic'];
        $statuses = ['completed', 'completed', 'completed', 'pending', 'in_transit'];
        $units = ['tons', 'kg', 'cubic_meters'];

        $rows = [];
        for ($i = 1; $i <= 35; $i++) {
            $date = Carbon::today()->subDays(rand(0, 180));
            $rows[] = [
                'id' => (string) Str::uuid(),
                'ref_number' => sprintf('WM-%04d', $i),
                'waste_type' => $wasteTypes[array_rand($wasteTypes)],
                'quantity' => rand(1, 50) + (rand(0, 99) / 100),
                'unit' => $units[array_rand($units)],
                'contractor' => $this->contractors[array_rand($this->contractors)],
                'disposal_method' => rand(0, 1) ? 'Landfill' : 'Recycling',
                'disposal_site' => 'Approved Site ' . rand(1, 3),
                'manifest_date' => $date->toDateString(),
                'status' => $statuses[array_rand($statuses)],
                'notes' => null,
                'created_at' => $date->toDateTimeString(),
                'updated_at' => $date->toDateTimeString(),
            ];
        }

        DB::table('waste_manifests')->insert($rows);
        $this->command->info('  Waste manifests: ' . count($rows));
    }

    private function seedTrainingRecords(): void
    {
        $types = ['Induction', 'Toolbox Talk', 'First Aid', 'Fire Safety', 'Crane Operation', 'Scaffold Erection', 'Confined Space', 'Electrical Safety'];
        $results = ['pass', 'pass', 'pass', 'pass', 'fail', 'pending'];

        $rows = [];
        for ($i = 1; $i <= 60; $i++) {
            $date = Carbon::today()->subDays(rand(0, 180));
            $rows[] = [
                'id' => (string) Str::uuid(),
                'ref_number' => sprintf('TR-%04d', $i),
                'employee_id' => null,
                'training_type' => $types[array_rand($types)],
                'training_title' => $types[array_rand($types)] . ' Training Session',
                'training_date' => $date->toDateString(),
                'expiry_date' => $date->copy()->addYear()->toDateString(),
                'result' => $results[array_rand($results)],
                'contractor' => $this->contractors[array_rand($this->contractors)],
                'trainer' => 'Trainer ' . rand(1, 5),
                'certificate_number' => 'CERT-' . strtoupper(Str::random(8)),
                'created_at' => $date->toDateTimeString(),
                'updated_at' => $date->toDateTimeString(),
            ];
        }

        DB::table('training_records')->insert($rows);
        $this->command->info('  Training records: ' . count($rows));
    }
}
