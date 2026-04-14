<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MomPointPhoto extends Model
{
    protected $table = 'mom_point_photos';

    public $timestamps = false;

    protected $fillable = [
        'mom_point_id', 'mom_id', 'file_name', 'original_name',
        'file_path', 'file_size', 'mime_type', 'caption',
        'uploaded_by', 'uploaded_by_name', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    // ── Relationships ────────────────────────────────

    public function point()
    {
        return $this->belongsTo(MomPoint::class, 'mom_point_id');
    }

    public function mom()
    {
        return $this->belongsTo(Mom::class, 'mom_id');
    }

    public function uploadedByUser()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    // ── Helpers ──────────────────────────────────────

    public function getUrlAttribute(): string
    {
        return asset('storage/' . $this->file_path);
    }
}
