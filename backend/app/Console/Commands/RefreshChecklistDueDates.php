<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ChecklistItem;
use Carbon\Carbon;

class RefreshChecklistDueDates extends Command
{
    protected $signature = 'checklists:refresh-due-dates';
    protected $description = 'Refresh overdue flags and days_until_due for all checklist items';

    public function handle(): void
    {
        $today = now()->startOfDay();
        $updated = 0;

        ChecklistItem::whereNotNull('next_internal_inspection_date')
            ->where('status', '!=', 'Removed from Site')
            ->chunk(200, function ($items) use ($today, &$updated) {
                foreach ($items as $item) {
                    $nextDate = Carbon::parse($item->next_internal_inspection_date)->startOfDay();
                    $diff = (int) $today->diffInDays($nextDate, false);
                    $overdue = $diff < 0;

                    if ($item->days_until_due !== $diff || $item->is_overdue !== $overdue) {
                        ChecklistItem::withoutEvents(function () use ($item, $diff, $overdue) {
                            $item->update([
                                'days_until_due' => $diff,
                                'is_overdue'     => $overdue,
                            ]);
                        });
                        $updated++;
                    }
                }
            });

        // Also handle items without next date
        ChecklistItem::whereNull('next_internal_inspection_date')
            ->where(function ($q) {
                $q->where('is_overdue', true)->orWhereNotNull('days_until_due');
            })
            ->update(['is_overdue' => false, 'days_until_due' => null]);

        $this->info("Refreshed {$updated} checklist item(s).");
    }
}
