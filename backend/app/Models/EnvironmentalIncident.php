<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvironmentalIncident extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'incident_code', 'incident_type', 'incident_date', 'incident_time',
        'location', 'area', 'zone', 'description', 'environmental_impact',
        'severity', 'immediate_action', 'root_cause', 'contributing_factors',
        'reported_by', 'reported_by_id', 'assigned_to', 'assigned_to_id',
        'linked_incident_id', 'status', 'evidence_paths',
        'closed_at', 'closed_by', 'notes', 'created_by', 'updated_by', 'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'incident_date'  => 'date',
            'evidence_paths' => 'array',
            'closed_at'      => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (empty($model->incident_code)) {
                $year  = now()->year;
                $count = self::withTrashed()->whereYear('created_at', $year)->count();
                $model->incident_code = 'EINC-' . $year . '-' . str_pad($count + 1, 4, '0', STR_PAD_LEFT);
            }
        });

        static::saving(function (self $model) {
            if ($model->status === 'Closed' && !$model->closed_at) {
                $model->closed_at = now();
            }
        });
    }

    // ─── Computed ──────────────────────────────────

    public function getEvidenceUrlsAttribute(): array
    {
        if (!$this->evidence_paths) return [];
        return array_map(fn($p) => asset('storage/' . $p), $this->evidence_paths);
    }

    // ─── Relationships ─────────────────────────────

    public function reportedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by_id');
    }

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
            'log_type'          => 'incident',
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

    // ─── Scopes ────────────────────────────────────

    public function scopeOpen($query)
    {
        return $query->where('status', '!=', 'Closed');
    }

    public function scopeBySeverity($query, string $severity)
    {
        return $query->where('severity', $severity);
    }
}
