<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanTestData extends Command
{
    protected $signature = 'app:clean-test-data {--force : Skip confirmation}';
    protected $description = 'Remove all seeded/test data from data tables, preserving config & user tables';

    public function handle(): int
    {
        if (!$this->option('force') && !$this->confirm('This will DELETE all data from operational tables. Continue?')) {
            $this->info('Aborted.');
            return 0;
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        // Order matters for foreign keys — child tables first, then parents
        $tables = [
            // AI
            'ai_logs', 'ai_document_analyses', 'ai_alerts',
            'ai_recommendations', 'ai_insights', 'ai_queries',

            // Campaigns
            'campaign_logs', 'campaign_results', 'campaign_evidence',
            'campaign_participants', 'campaign_activities', 'campaign_actions', 'campaigns',

            // Contractors
            'contractor_module_links', 'contractor_logs',
            'contractor_documents', 'contractor_contacts', 'contractors',

            // Document Control
            'dc_logs', 'dc_links', 'dc_approvals', 'dc_reviews', 'dc_revisions', 'dc_documents',

            // Document Imports
            'document_import_items', 'document_imports',

            // Environmental
            'environmental_logs', 'environmental_actions', 'environmental_objectives',
            'environmental_compliance_register', 'environmental_inspections',
            'environmental_incidents', 'resource_consumption', 'environmental_monitoring',
            'waste_records', 'environmental_risks', 'environmental_aspects',

            // Equipment
            'equipment_item_values', 'equipment_items', 'equipment_groups',
            'equipment_register',

            // Incidents
            'incident_logs', 'incident_actions', 'incident_evidence', 'incidents',

            // Mock Drills / ERP
            'mock_drill_logs', 'mock_drill_evidence', 'mock_drill_evaluations',
            'mock_drill_actions', 'mock_drill_observations', 'mock_drill_resources',
            'mock_drill_participants', 'mock_drills', 'erps',

            // Mockups
            'mockup_import_batches', 'mockup_history', 'mockup_comments', 'mockups',

            // MOM
            'mom_point_photos', 'mom_point_updates', 'mom_points', 'moms',

            // Observations
            'observations',

            // Permits & Amendments
            'permit_amendment_logs', 'permit_amendment_changes',
            'permit_amendment_attachments', 'permit_amendments', 'permits',

            // Posters
            'poster_logs', 'poster_links', 'poster_media', 'posters',

            // Tracker
            'tracker_inspection_logs', 'tracker_records',

            // Training
            'training_records',

            // Violations
            'violation_logs', 'violation_actions', 'violation_evidence', 'violations',

            // Waste Manifests
            'waste_manifest_logs', 'waste_manifest_attachments', 'waste_manifests',

            // Workers
            'worker_daily_hours', 'workers',

            // Notifications
            'notifications',
        ];

        $cleaned = 0;
        foreach ($tables as $table) {
            try {
                $count = DB::table($table)->count();
                if ($count > 0) {
                    DB::table($table)->truncate();
                    $this->line("  Truncated <info>{$table}</info> ({$count} rows)");
                    $cleaned++;
                }
            } catch (\Throwable $e) {
                // Table may not exist yet — skip silently
            }
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        $this->newLine();
        $this->info("Done — cleaned {$cleaned} tables. Config/reference tables preserved.");

        return 0;
    }
}
