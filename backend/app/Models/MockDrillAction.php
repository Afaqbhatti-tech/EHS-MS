<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MockDrillAction extends Model
{
    protected $fillable = [
        'action_code', 'mock_drill_id', 'observation_id', 'title', 'description',
        'assigned_to', 'assigned_to_id', 'due_date', 'priority', 'status',
        'completion_notes', 'evidence_path', 'closed_at', 'closed_by',
        'created_by', 'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'due_date'  => 'date',
            'closed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (MockDrillAction $action) {
            if (empty($action->action_code)) {
                $year = now()->year;
                $count = self::whereYear('created_at', $year)->count();
                $action->action_code = 'DACT-' . $year . '-' . str_pad($count + 1, 4, '0', STR_PAD_LEFT);
            }
        });

        static::saving(function (MockDrillAction $action) {
            if ($action->due_date && $action->due_date->lt(today()) && in_array($action->status, ['Open', 'In Progress'])) {
                $action->status = 'Overdue';
            }
        });

        static::saved(function (MockDrillAction $action) {
            MockDrill::find($action->mock_drill_id)?->recalculateCounts();
        });

        static::deleted(function (MockDrillAction $action) {
            MockDrill::find($action->mock_drill_id)?->recalculateCounts();
        });
    }

    public function drill(): BelongsTo
    {
        return $this->belongsTo(MockDrill::class, 'mock_drill_id');
    }

    public function observation(): BelongsTo
    {
        return $this->belongsTo(MockDrillObservation::class, 'observation_id');
    }

    public function assignedToUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_id');
    }

    public function getIsOverdueAttribute(): bool
    {
        return $this->due_date && $this->due_date->lt(today()) && !in_array($this->status, ['Closed']);
    }

    public function getDaysOverdueAttribute(): ?int
    {
        if (!$this->is_overdue) return null;
        return (int) $this->due_date->diffInDays(today());
    }
}
