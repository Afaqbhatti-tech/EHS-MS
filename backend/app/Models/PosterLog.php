<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosterLog extends Model
{
    public $timestamps = false;

    const UPDATED_AT = null;

    protected $fillable = [
        'poster_id', 'action', 'from_status', 'to_status',
        'performed_by', 'performed_by_name', 'performed_by_role',
        'description', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata'   => 'array',
            'created_at' => 'datetime',
        ];
    }

    /* ── Relationships ─────────────────────────────── */

    public function poster(): BelongsTo
    {
        return $this->belongsTo(Poster::class);
    }

    public function performer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}
