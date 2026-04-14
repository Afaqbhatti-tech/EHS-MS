<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class AiAlert extends Model
{
    protected $table = 'ai_alerts';

    protected $fillable = [
        'title',
        'description',
        'alert_type',
        'severity',
        'linked_module',
        'linked_record_id',
        'linked_record_code',
        'alert_key',
        'generated_at',
        'status',
        'acknowledged_by',
        'acknowledged_at',
        'resolved_at',
        'resolution_notes',
        'auto_resolved',
    ];

    protected function casts(): array
    {
        return [
            'generated_at'     => 'datetime',
            'acknowledged_at'  => 'datetime',
            'resolved_at'      => 'datetime',
            'auto_resolved'    => 'boolean',
            'created_at'       => 'datetime',
            'updated_at'       => 'datetime',
        ];
    }

    // ── Relationships ───────────────────────────────────

    public function acknowledgedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acknowledged_by');
    }

    // ── Scopes ──────────────────────────────────────────

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'Active');
    }

    public function scopeCritical(Builder $query): Builder
    {
        return $query->where('severity', 'Critical');
    }

    // ── Static Helpers ──────────────────────────────────

    public static function fireOrUpdate(string $alertKey, array $data): self
    {
        $existing = static::where('alert_key', $alertKey)
            ->where('status', 'Active')
            ->first();

        if ($existing) {
            $existing->touch();
            return $existing;
        }

        return static::create(array_merge($data, [
            'alert_key'    => $alertKey,
            'generated_at' => now(),
        ]));
    }
}
