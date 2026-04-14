<?php

namespace App\Console\Commands;

use App\Models\TrainingRecord;
use App\Models\EnvironmentalAction;
use App\Models\ContractorDocument;
use App\Models\Contractor;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SendExpiryNotifications extends Command
{
    protected $signature = 'notifications:send-expiry';
    protected $description = 'Generate notifications for expiring training records, overdue actions, and expired documents';

    public function handle(): int
    {
        $this->info('Checking for expiry and overdue notifications...');
        $total = 0;

        $total += $this->checkTrainingExpiry();
        $total += $this->checkEnvironmentalActionsOverdue();
        $total += $this->checkContractorDocumentExpiry();

        $this->info("Done. {$total} notification(s) generated.");
        return self::SUCCESS;
    }

    private function checkTrainingExpiry(): int
    {
        $count = 0;
        $today = Carbon::today();

        // Training records expiring within 30 days
        $expiring = TrainingRecord::with(['worker', 'topic'])
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '<=', $today->copy()->addDays(30))
            ->where('expiry_date', '>=', $today)
            ->get();

        foreach ($expiring as $record) {
            // Training is worker-based; notify EHS managers about upcoming expiry
            $daysLeft = $today->diffInDays(Carbon::parse($record->expiry_date));
            $topicName = $record->topic?->label ?? $record->training_topic_key ?? 'Training';
            $workerName = $record->worker?->name ?? 'Unknown worker';
            $ref = $record->record_id ?? (string) $record->id;

            // Only notify at key milestones: 30, 14, 7, 3, 1 day(s) out
            if (!in_array($daysLeft, [30, 14, 7, 3, 1])) {
                continue;
            }

            NotificationService::notifyRoles(
                ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
                NotificationService::TYPE_TRAINING,
                "Training Expiring in {$daysLeft} Days",
                "{$workerName}: {$topicName} expires on " . Carbon::parse($record->expiry_date)->format('d M Y') . ".",
                $daysLeft <= 7 ? 'danger' : 'warning',
                'clock',
                '/training-matrix',
                'training_records',
                $ref,
            );
            $count++;
        }

        // Training records already expired
        $expired = TrainingRecord::with(['worker', 'topic'])
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '<', $today)
            ->where('expiry_date', '>=', $today->copy()->subDays(1)) // only just-expired (yesterday)
            ->get();

        foreach ($expired as $record) {
            $topicName = $record->topic?->label ?? $record->training_topic_key ?? 'Training';
            $workerName = $record->worker?->name ?? 'Unknown worker';
            $ref = $record->record_id ?? (string) $record->id;

            NotificationService::notifyRoles(
                ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
                NotificationService::TYPE_TRAINING,
                'Training Certificate Expired',
                "{$workerName}: {$topicName} expired on " . Carbon::parse($record->expiry_date)->format('d M Y') . ". Renewal required.",
                'danger',
                'alert-triangle',
                '/training-matrix',
                'training_records',
                $ref,
            );
            $count++;
        }

        $this->line("  Training: {$count} notification(s)");
        return $count;
    }

    private function checkEnvironmentalActionsOverdue(): int
    {
        $count = 0;
        $today = Carbon::today();

        // Check if EnvironmentalAction table exists and has the expected columns
        try {
            $overdueActions = DB::table('environmental_actions')
                ->where('due_date', '<', $today)
                ->whereIn('status', ['Open', 'In Progress'])
                ->whereNotNull('assigned_to')
                ->whereNull('deleted_at')
                ->get();
        } catch (\Throwable $e) {
            $this->warn("  Environmental actions table not accessible: {$e->getMessage()}");
            return 0;
        }

        foreach ($overdueActions as $action) {
            NotificationService::environmentalActionOverdue($action, $action->assigned_to);
            $count++;
        }

        $this->line("  Environmental actions overdue: {$count} notification(s)");
        return $count;
    }

    private function checkContractorDocumentExpiry(): int
    {
        $count = 0;
        $today = Carbon::today();

        try {
            // Contractor documents expiring within 30 days
            $expiringDocs = DB::table('contractor_documents')
                ->join('contractors', 'contractor_documents.contractor_id', '=', 'contractors.id')
                ->whereNotNull('contractor_documents.expiry_date')
                ->where('contractor_documents.expiry_date', '<=', $today->copy()->addDays(30))
                ->where('contractor_documents.expiry_date', '>=', $today)
                ->select(
                    'contractor_documents.*',
                    'contractors.contractor_name',
                    'contractors.contractor_code',
                    'contractors.created_by as contractor_created_by',
                )
                ->get();

            foreach ($expiringDocs as $doc) {
                $daysLeft = $today->diffInDays(Carbon::parse($doc->expiry_date));
                if (!in_array($daysLeft, [30, 14, 7, 3, 1])) {
                    continue;
                }

                $docLabel = $doc->document_type ?? $doc->original_name ?? 'Document';

                NotificationService::notifyRoles(
                    ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
                    NotificationService::TYPE_CONTRACTOR,
                    "Contractor Document Expiring in {$daysLeft} Days",
                    "{$doc->contractor_name}: {$docLabel} expires on " .
                        Carbon::parse($doc->expiry_date)->format('d M Y') . ".",
                    $daysLeft <= 7 ? 'danger' : 'warning',
                    'settings',
                    '/environmental/contractor-records',
                    'contractors',
                    $doc->contractor_code ?? (string) $doc->contractor_id,
                );
                $count++;
            }
        } catch (\Throwable $e) {
            $this->warn("  Contractor documents check skipped: {$e->getMessage()}");
            return 0;
        }

        $this->line("  Contractor documents: {$count} notification(s)");
        return $count;
    }
}
