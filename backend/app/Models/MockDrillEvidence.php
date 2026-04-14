<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MockDrillEvidence extends Model
{
    public $timestamps = false;

    protected $table = 'mock_drill_evidence';

    protected $fillable = [
        'mock_drill_id', 'linked_type', 'linked_id',
        'file_path', 'original_name', 'file_type', 'file_size_kb',
        'caption', 'uploaded_by', 'uploaded_by_name',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            $model->created_at = $model->created_at ?? now();
        });
    }

    public function drill(): BelongsTo
    {
        return $this->belongsTo(MockDrill::class, 'mock_drill_id');
    }

    public function getUrlAttribute(): ?string
    {
        return $this->file_path ? url('storage/' . $this->file_path) : null;
    }
}
