<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MockDrillEvaluation extends Model
{
    protected $fillable = [
        'mock_drill_id', 'overall_result',
        'response_time_score', 'communication_score', 'team_coordination_score',
        'equipment_readiness_score', 'erp_compliance_score', 'participation_score',
        'final_score', 'final_rating', 'drill_effectiveness',
        'strengths', 'weaknesses', 'recommendations', 'overall_notes',
        'evaluated_by', 'evaluated_by_id', 'evaluated_at',
    ];

    protected function casts(): array
    {
        return [
            'final_score'  => 'decimal:2',
            'evaluated_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (MockDrillEvaluation $eval) {
            // Auto-calculate final_score
            $scores = array_filter([
                $eval->response_time_score,
                $eval->communication_score,
                $eval->team_coordination_score,
                $eval->equipment_readiness_score,
                $eval->erp_compliance_score,
                $eval->participation_score,
            ], fn ($v) => $v !== null);

            if (count($scores) > 0) {
                $eval->final_score = round(array_sum($scores) / count($scores), 2);
            }

            // Auto-set final_rating
            if ($eval->final_score !== null) {
                $eval->final_rating = match (true) {
                    $eval->final_score >= 90 => 'Excellent',
                    $eval->final_score >= 75 => 'Good',
                    $eval->final_score >= 60 => 'Satisfactory',
                    $eval->final_score >= 40 => 'Needs Work',
                    default                  => 'Poor',
                };
            }
        });
    }

    public function drill(): BelongsTo
    {
        return $this->belongsTo(MockDrill::class, 'mock_drill_id');
    }
}
