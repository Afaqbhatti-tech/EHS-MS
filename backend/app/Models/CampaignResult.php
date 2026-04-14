<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CampaignResult extends Model
{
    protected $fillable = [
        'campaign_id',
        'total_activities_conducted', 'total_participants',
        'participation_rate', 'areas_covered', 'sessions_delivered',
        'observations_raised',
        'violations_before', 'violations_after',
        'incidents_before', 'incidents_after',
        'actions_created', 'actions_closed',
        'effectiveness_rating',
        'outcome_summary', 'lessons_learned', 'recommendations', 'next_steps',
        'evaluated_by', 'evaluated_by_id', 'evaluated_at',
    ];

    protected function casts(): array
    {
        return [
            'evaluated_at'       => 'datetime',
            'participation_rate' => 'decimal:2',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (CampaignResult $result) {
            if ($result->total_participants && !$result->participation_rate) {
                $campaign = Campaign::find($result->campaign_id);
                if ($campaign && $campaign->expected_participants > 0) {
                    $result->participation_rate = round(($result->total_participants / $campaign->expected_participants) * 100, 2);
                } elseif ($result->total_participants > 0) {
                    $result->participation_rate = 100;
                }
            }
        });
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function evaluatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluated_by_id');
    }
}
