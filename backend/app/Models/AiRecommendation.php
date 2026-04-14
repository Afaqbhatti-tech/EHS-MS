<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class AiRecommendation extends Model
{
    public $timestamps = false;

    protected $table = 'ai_recommendations';

    protected $fillable = [
        'title',
        'description',
        'recommendation_type',
        'priority',
        'linked_module',
        'linked_record_id',
        'linked_record_code',
        'linked_insight_id',
        'action_suggestion',
        'expected_outcome',
        'generated_at',
        'generated_by_user',
        'status',
        'accepted_by',
        'accepted_at',
        'completed_at',
        'completion_notes',
    ];

    protected function casts(): array
    {
        return [
            'generated_at'  => 'datetime',
            'accepted_at'   => 'datetime',
            'completed_at'  => 'datetime',
            'created_at'    => 'datetime',
        ];
    }

    // ── Relationships ───────────────────────────────────

    public function insight(): BelongsTo
    {
        return $this->belongsTo(AiInsight::class, 'linked_insight_id');
    }

    public function acceptedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accepted_by');
    }

    // ── Scopes ──────────────────────────────────────────

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', 'Pending');
    }

    public function scopeAccepted(Builder $query): Builder
    {
        return $query->whereIn('status', ['Accepted', 'In Progress']);
    }
}
