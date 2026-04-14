<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MockDrillObservation extends Model
{
    protected $fillable = [
        'obs_code', 'mock_drill_id', 'title', 'description',
        'observation_type', 'category', 'severity',
        'reported_by', 'reported_by_id',
        'photo_paths', 'file_path', 'notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'photo_paths' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (MockDrillObservation $obs) {
            if (empty($obs->obs_code)) {
                $year = now()->year;
                $count = self::whereYear('created_at', $year)->count();
                $obs->obs_code = 'DOBS-' . $year . '-' . str_pad($count + 1, 4, '0', STR_PAD_LEFT);
            }
        });

        static::saved(function (MockDrillObservation $obs) {
            MockDrill::find($obs->mock_drill_id)?->recalculateCounts();
        });

        static::deleted(function (MockDrillObservation $obs) {
            MockDrill::find($obs->mock_drill_id)?->recalculateCounts();
        });
    }

    public function drill(): BelongsTo
    {
        return $this->belongsTo(MockDrill::class, 'mock_drill_id');
    }

    public function actions(): HasMany
    {
        return $this->hasMany(MockDrillAction::class, 'observation_id');
    }

    public function evidence(): HasMany
    {
        return $this->hasMany(MockDrillEvidence::class, 'linked_id')
            ->where('linked_type', 'Observation');
    }

    public function reportedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by_id');
    }
}
