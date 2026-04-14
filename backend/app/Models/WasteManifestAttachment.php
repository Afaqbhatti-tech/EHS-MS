<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WasteManifestAttachment extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'waste_manifest_id', 'file_path', 'original_name',
        'file_type', 'file_size_kb', 'attachment_category',
        'caption', 'description', 'uploaded_by', 'uploaded_by_name',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    // ─── Computed ────────────────────────────────────

    public function getUrlAttribute(): ?string
    {
        return $this->file_path ? asset('storage/' . $this->file_path) : null;
    }

    public function getIsImageAttribute(): bool
    {
        return in_array(strtolower($this->file_type ?? ''), ['jpg', 'jpeg', 'png', 'webp', 'gif']);
    }

    // ─── Relationships ───────────────────────────────

    public function manifest(): BelongsTo
    {
        return $this->belongsTo(WasteManifest::class, 'waste_manifest_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
