<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CampaignParticipant extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'campaign_id', 'activity_id', 'user_id',
        'participant_name', 'employee_id', 'designation',
        'department', 'company', 'attendance_status',
        'participation_type', 'remarks',
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

        static::saved(function (CampaignParticipant $p) {
            Campaign::find($p->campaign_id)?->recalculateCounts();
        });

        static::deleted(function (CampaignParticipant $p) {
            Campaign::find($p->campaign_id)?->recalculateCounts();
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
