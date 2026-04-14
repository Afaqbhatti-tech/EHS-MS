<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EnvironmentalAction extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'action_code', 'title', 'description',
        'linked_type', 'linked_id',
        'assigned_to', 'assigned_to_id', 'due_date',
        'priority', 'status', 'completion_notes', 'evidence_path',
        'closed_at', 'closed_by', 'created_by', 'updated_by',
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
        static::creating(function (self $model) {
            if (empty($model->action_code)) {
                $year  = now()->year;
                $count = self::whereYear('created_at', $year)->count();
                $model->action_code = 'EACT-' . $year . '-' . str_pad($count + 1, 4, '0', STR_PAD_LEFT);
            }
        });

        static::saving(function (self $model) {
            if ($model->due_date && $model->due_date->lt(today())
                && in_array($model->status, ['Open', 'In Progress'])) {
                $model->status = 'Overdue';
            }
        });
    }

    // ─── Computed ──────────────────────────────────

    public function getIsOverdueAttribute(): bool
    {
        return $this->due_date && $this->due_date->lt(today())
            && !in_array($this->status, ['Completed', 'Closed']);
    }

    public function getEvidenceUrlAttribute(): ?string
    {
        return $this->evidence_path ? asset('storage/' . $this->evidence_path) : null;
    }

    // ─── Relationships ─────────────────────────────

    public function assignedToUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_id');
    }

    public function closedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
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
            'log_type'          => 'action',
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
