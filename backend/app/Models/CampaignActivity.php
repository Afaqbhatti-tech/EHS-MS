<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CampaignActivity extends Model
{
    protected $fillable = [
        'activity_code', 'campaign_id', 'title', 'activity_type',
        'activity_date', 'activity_time', 'location', 'conducted_by',
        'description', 'attendance_count', 'status', 'notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'activity_date' => 'date',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (CampaignActivity $activity) {
            if (empty($activity->activity_code)) {
                $year = now()->year;
                $count = self::whereYear('created_at', $year)->count();
                $activity->activity_code = 'CACT-' . $year . '-' . str_pad($count + 1, 4, '0', STR_PAD_LEFT);
            }
        });

        static::saved(function (CampaignActivity $activity) {
            Campaign::find($activity->campaign_id)?->recalculateCounts();
        });

        static::deleted(function (CampaignActivity $activity) {
            Campaign::find($activity->campaign_id)?->recalculateCounts();
        });
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function participants(): HasMany
    {
        return $this->hasMany(CampaignParticipant::class, 'activity_id');
    }

    public function evidence(): HasMany
    {
        return $this->hasMany(CampaignEvidence::class, 'activity_id');
    }
}
