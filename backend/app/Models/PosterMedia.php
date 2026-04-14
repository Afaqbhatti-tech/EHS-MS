<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosterMedia extends Model
{
    public $timestamps = false;

    protected $table = 'poster_media';

    protected $fillable = [
        'poster_id', 'media_type', 'file_path', 'original_name',
        'file_type', 'file_size_kb', 'caption',
        'uploaded_by', 'uploaded_by_name', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    /* ── Relationships ─────────────────────────────── */

    public function poster(): BelongsTo
    {
        return $this->belongsTo(Poster::class);
    }

    /* ── Computed ───────────────────────────────────── */

    public function getUrlAttribute(): string
    {
        return asset('storage/' . $this->file_path);
    }

    public function getIsImageAttribute(): bool
    {
        return in_array(
            strtolower($this->file_type ?? ''),
            ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp']
        );
    }
}
