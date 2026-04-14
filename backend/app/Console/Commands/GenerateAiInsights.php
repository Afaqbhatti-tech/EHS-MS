<?php

namespace App\Console\Commands;

use App\Services\AiService;
use Illuminate\Console\Command;

class GenerateAiInsights extends Command
{
    protected $signature = 'ai:generate-insights';

    protected $description = 'Generate AI insights, recommendations, and alerts from EHS data';

    public function handle(AiService $aiService): int
    {
        $this->info('Starting AI data analysis...');

        $this->info('Generating insights...');
        $insights = $aiService->generateInsights(null);
        $this->info('Generated ' . count($insights) . ' new insights.');

        $this->info('Generating recommendations...');
        $recommendations = $aiService->generateRecommendations(null);
        $this->info('Generated ' . count($recommendations) . ' new recommendations.');

        $this->info('Generating alerts...');
        $alerts = $aiService->generateAlerts();
        $this->info('Processed ' . count($alerts) . ' alerts.');

        $this->info("Done. Generated " . count($insights) . " insights, " .
            count($recommendations) . " recommendations, " .
            count($alerts) . " alerts.");

        return Command::SUCCESS;
    }
}
