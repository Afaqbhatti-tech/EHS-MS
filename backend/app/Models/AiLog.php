<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiLog extends Model
{
    public $timestamps = false;

    protected $table = 'ai_logs';

    protected $fillable = [
        'user_id',
        'user_name',
        'action_type',
        'input_reference',
        'output_reference',
        'module_scope',
        'tokens_used',
        'duration_ms',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'tokens_used' => 'integer',
            'duration_ms' => 'integer',
            'created_at'  => 'datetime',
        ];
    }

    // ── Relationships ───────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
