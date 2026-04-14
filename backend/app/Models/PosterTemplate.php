<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PosterTemplate extends Model
{
    protected $fillable = [
        'name', 'category', 'layout_type', 'description',
        'placeholder_schema', 'default_theme_key', 'default_orientation',
        'print_size', 'is_active', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'placeholder_schema' => 'array',
            'is_active'          => 'boolean',
        ];
    }

    /* ── Relationships ─────────────────────────────── */

    public function posters(): HasMany
    {
        return $this->hasMany(Poster::class, 'template_id');
    }

    /* ── Scopes ────────────────────────────────────── */

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
