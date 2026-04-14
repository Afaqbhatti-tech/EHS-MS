<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class AiQuery extends Model
{
    protected $table = 'ai_queries';

    protected $fillable = [
        'user_id',
        'user_name',
        'query_text',
        'module_scope',
        'context_data',
        'response_text',
        'response_type',
        'intent_detected',
        'tokens_used',
        'model_used',
        'status',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'context_data' => 'array',
            'tokens_used'  => 'integer',
            'created_at'   => 'datetime',
            'updated_at'   => 'datetime',
        ];
    }

    // ── Relationships ───────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // ── Scopes ──────────────────────────────────────────

    public function scopeSuccessful(Builder $query): Builder
    {
        return $query->where('status', 'completed');
    }

    public function scopeByScope(Builder $query, string $scope): Builder
    {
        return $query->where('module_scope', $scope);
    }

    public function scopeRecent(Builder $query, int $limit = 10): Builder
    {
        return $query->latest()->limit($limit);
    }
}
