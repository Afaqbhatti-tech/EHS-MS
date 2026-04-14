<?php

namespace Database\Seeders;

use App\Models\TrainingTopic;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class TrainingTopicSeeder extends Seeder
{
    public function run(): void
    {
        $topics = config('training_topics.topics', []);

        foreach ($topics as $index => $topic) {
            TrainingTopic::updateOrCreate(
                ['key' => $topic['key']],
                [
                    'id' => Str::uuid()->toString(),
                    'label' => $topic['label'],
                    'category' => $topic['category'],
                    'validity_days' => $topic['validity_days'],
                    'is_mandatory' => $topic['is_mandatory'],
                    'description' => $topic['description'],
                    'color' => $topic['color'],
                    'light_color' => $topic['light_color'],
                    'is_active' => true,
                    'sort_order' => $index,
                ]
            );
        }
    }
}
