<?php

namespace Database\Seeders;

use App\Models\ProfessionTrainingRequirement;
use App\Models\TrainingTopic;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Seeds initial profession → training topic requirement mappings.
 *
 * Idempotent: uses firstOrCreate on the unique (profession, training_topic_key) pair.
 * Based on real construction-industry training requirements.
 */
class ProfessionTrainingRequirementSeeder extends Seeder
{
    public function run(): void
    {
        // Cache topic IDs for efficient lookup
        $topicIds = TrainingTopic::pluck('id', 'key')->toArray();

        // Guard: abort gracefully if training topics haven't been seeded yet
        if (empty($topicIds)) {
            $this->command?->warn('ProfessionTrainingRequirements: Skipped — no training topics found. Run TrainingTopicSeeder first.');
            return;
        }

        // Universal requirements — every profession needs these
        $universal = ['site_induction', 'fire_safety', 'emergency_response'];

        // Profession-specific additional requirements (beyond universal)
        $professionMap = [
            'Rigger' => [
                'lifting_rigging', 'work_at_height', 'manual_handling',
            ],
            'Welder' => [
                'hot_work', 'confined_space', 'electrical_safety', 'manual_handling',
            ],
            'Electrician' => [
                'electrical_safety', 'confined_space', 'work_at_height',
            ],
            'Scaffolder' => [
                'work_at_height', 'manual_handling',
            ],
            'Mason' => [
                'manual_handling', 'work_at_height',
            ],
            'Carpenter' => [
                'work_at_height', 'manual_handling',
            ],
            'Plumber' => [
                'confined_space', 'manual_handling',
            ],
            'Painter' => [
                'work_at_height', 'coshh', 'manual_handling',
            ],
            'Heavy Equipment Operator' => [
                'heavy_vehicle', 'defensive_driving',
            ],
            'Forklift Operator' => [
                'forklift_operation', 'manual_handling',
            ],
            'Driver' => [
                'defensive_driving', 'heavy_vehicle',
            ],
            'Helper' => [
                'manual_handling',
            ],
            'Labourer' => [
                'manual_handling',
            ],
            'Safety Officer' => [
                'first_aid', 'work_at_height', 'confined_space', 'electrical_safety',
                'coshh', 'behavioral_safety', 'supervisor_safety',
                'environmental_awareness', 'manual_handling',
            ],
            'HSE Officer' => [
                'first_aid', 'work_at_height', 'confined_space', 'electrical_safety',
                'coshh', 'behavioral_safety', 'supervisor_safety',
                'environmental_awareness', 'manual_handling',
            ],
            'Foreman' => [
                'supervisor_safety', 'behavioral_safety', 'first_aid',
                'work_at_height', 'manual_handling',
            ],
            'Supervisor' => [
                'supervisor_safety', 'behavioral_safety', 'first_aid',
                'work_at_height', 'manual_handling',
            ],
            'Site Engineer' => [
                'work_at_height', 'confined_space',
            ],
            'QC Inspector' => [
                'environmental_awareness',
            ],
            'Surveyor' => [
                'work_at_height',
            ],
            'Storekeeper' => [
                'manual_handling', 'coshh',
            ],
        ];

        $created = 0;
        $skipped = 0;

        foreach ($professionMap as $profession => $specificTopics) {
            // Combine universal + profession-specific, deduplicate
            $allTopics = array_unique(array_merge($universal, $specificTopics));

            foreach ($allTopics as $topicKey) {
                // Skip topic keys that don't exist in the training_topics table
                if (!array_key_exists($topicKey, $topicIds)) {
                    $this->command?->warn("  Skipped unknown topic '{$topicKey}' for {$profession}");
                    $skipped++;
                    continue;
                }

                $existing = ProfessionTrainingRequirement::where('profession', $profession)
                    ->where('training_topic_key', $topicKey)
                    ->exists();

                if ($existing) {
                    $skipped++;
                    continue;
                }

                ProfessionTrainingRequirement::create([
                    'id' => Str::uuid()->toString(),
                    'profession' => $profession,
                    'training_topic_key' => $topicKey,
                    'training_topic_id' => $topicIds[$topicKey] ?? null,
                    'is_mandatory' => in_array($topicKey, $universal),
                    'notes' => in_array($topicKey, $universal)
                        ? 'Universal mandatory requirement'
                        : 'Trade-specific requirement',
                    'created_by' => null,
                ]);
                $created++;
            }
        }

        $this->command?->info("ProfessionTrainingRequirements: {$created} created, {$skipped} skipped (already exist).");
    }
}
