<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\TrackerRecord;

class RefreshTrackerDueStatus extends Command
{
    protected $signature = 'tracker:refresh-due-status';
    protected $description = 'Recalculate overdue and due-soon status for all tracker records';

    public function handle(): int
    {
        $updated = 0;

        TrackerRecord::where('status', '!=', 'Removed from Site')
            ->whereNull('deleted_at')
            ->chunkById(200, function ($records) use (&$updated) {
                foreach ($records as $record) {
                    $origOverdue    = $record->is_overdue;
                    $origDays       = $record->days_until_due;
                    $origTuvOverdue = $record->is_tuv_overdue;
                    $origTuvDays    = $record->days_until_tuv;
                    $origCertExp    = $record->is_cert_expired;

                    $record->recalculateDueStatus();

                    if ($record->is_overdue !== $origOverdue
                        || $record->days_until_due !== $origDays
                        || $record->is_tuv_overdue !== $origTuvOverdue
                        || $record->days_until_tuv !== $origTuvDays
                        || $record->is_cert_expired !== $origCertExp
                    ) {
                        $record->saveQuietly();
                        $updated++;
                    }
                }
            });

        $this->info("Refreshed due status. Updated {$updated} records.");
        return Command::SUCCESS;
    }
}
