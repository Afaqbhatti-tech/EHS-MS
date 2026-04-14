<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CampaignEvidence extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'campaign_id', 'activity_id', 'file_path', 'original_name',
        'file_type', 'file_size_kb', 'evidence_category',
        'caption', 'uploaded_by', 'uploaded_by_name',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($model) {
            $model->created_at = $model->created_at ?? now();
        });

        static::saved(function (CampaignEvidence $e) {
            Campaign::find($e->campaign_id)?->recalculateCounts();
        });

        static::deleted(function (CampaignEvidence $e) {
            Campaign::find($e->campaign_id)?->recalculateCounts();
        });
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function activity(): BelongsTo
    {
        return $this->belongsTo(CampaignActivity::class, 'activity_id');
    }

    public function getUrlAttribute(): string
    {
        return asset('storage/' . $this->file_path);
    }

    public function getIsImageAttribute(): bool
    {
        return in_array(strtolower($this->file_type ?? ''), ['jpg', 'jpeg', 'png', 'webp', 'gif', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    }

    public function getIsVideoAttribute(): bool
    {
        return in_array(strtolower($this->file_type ?? ''), ['mp4', 'mov', 'avi', 'video/mp4', 'video/quicktime', 'video/x-msvideo']);
    }
}
