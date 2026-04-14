<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class AiInsight extends Model
{
    public $timestamps = false;

    protected $table = 'ai_insights';

    protected $fillable = [
        'title',
        'description',
        'insight_type',
        'severity',
        'linked_module',
        'linked_record_id',
        'linked_record_code',
        'data_snapshot',
        'generated_by',
        'generated_at',
        'generated_by_user',
        'status',
        'dismissed_at',
        'dismissed_by',
        'dismiss_reason',
        'valid_until',
    ];

    protected function casts(): array
    {
        return [
            'data_snapshot' => 'array',
            'generated_at'  => 'datetime',
            'dismissed_at'  => 'datetime',
            'valid_until'   => 'datetime',
            'created_at'    => 'datetime',
        ];
    }

    // ── Boot ────────────────────────────────────────────

    protected static function booted(): void
    {
        static::saving(function (AiInsight $insight) {
            if ($insight->status === 'Active' && $insight->valid_until === null) {
                $insight->valid_until = now()->addDays(30);
            }
        });
    }

    // ── Relationships ───────────────────────────────────

    public function dismissedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dismissed_by');
    }

    public function generatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by_user');
    }

    public function recommendations(): HasMany
    {
        return $this->hasMany(AiRecommendation::class, 'linked_insight_id');
    }

    // ── Scopes ──────────────────────────────────────────

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'Active')
            ->where(function ($q) {
                $q->where('valid_until', '>', now())
                  ->orWhereNull('valid_until');
            });
    }

    public function scopeBySeverity(Builder $query, string $severity): Builder
    {
        return $query->where('severity', $severity);
    }

    public function scopeByModule(Builder $query, string $module): Builder
    {
        return $query->where('linked_module', $module);
    }
}
