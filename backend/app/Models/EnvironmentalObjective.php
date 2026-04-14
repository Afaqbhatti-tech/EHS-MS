<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvironmentalObjective extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'objective_code', 'title', 'description', 'category',
        'target_value', 'current_value', 'unit',
        'baseline_value', 'baseline_date', 'deadline',
        'responsible_person', 'responsible_id',
        'progress_percentage', 'status', 'progress_notes',
        'created_by', 'updated_by', 'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'baseline_date'       => 'date',
            'deadline'            => 'date',
            'target_value'        => 'decimal:4',
            'current_value'       => 'decimal:4',
            'baseline_value'      => 'decimal:4',
            'progress_percentage' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (empty($model->objective_code)) {
                $year  = now()->year;
                $count = self::withTrashed()->whereYear('created_at', $year)->count();
                $model->objective_code = 'EOBJ-' . $year . '-' . str_pad($count + 1, 4, '0', STR_PAD_LEFT);
            }
        });

        static::saving(function (self $model) {
            if ($model->target_value > 0 && $model->current_value !== null) {
                $model->progress_percentage = (int) min(100, round(($model->current_value / $model->target_value) * 100));
            }
            if ($model->progress_percentage >= 100 && $model->status !== 'Closed') {
                $model->status = 'Achieved';
            }
        });
    }

    // ─── Relationships ─────────────────────────────

    public function responsible(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsible_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ─── Helpers ───────────────────────────────────

    public function logHistory(string $action, ?string $fromStatus = null, ?string $toStatus = null, ?string $description = null, ?array $metadata = null): void
    {
        $user = auth()->user();
        EnvironmentalLog::create([
            'log_type'          => 'objective',
            'linked_id'         => $this->id,
            'action'            => $action,
            'from_status'       => $fromStatus,
            'to_status'         => $toStatus,
            'description'       => $description,
            'performed_by'      => $user?->id,
            'performed_by_name' => $user?->full_name ?? $user?->email ?? 'System',
            'performed_by_role' => $user?->role ?? 'unknown',
            'metadata'          => $metadata,
        ]);
    }
}
