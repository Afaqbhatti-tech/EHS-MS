<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EnvironmentalRisk extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'risk_code', 'aspect_id', 'hazard_description', 'potential_impact',
        'likelihood', 'severity', 'risk_score', 'risk_rating',
        'existing_controls', 'additional_controls',
        'residual_likelihood', 'residual_severity', 'residual_risk_score', 'residual_risk_rating',
        'responsible_person', 'responsible_id', 'review_date',
        'status', 'notes', 'created_by', 'updated_by', 'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'review_date'          => 'date',
            'severity'             => 'integer',
            'likelihood'           => 'integer',
            'risk_score'           => 'integer',
            'residual_likelihood'  => 'integer',
            'residual_severity'    => 'integer',
            'residual_risk_score'  => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (empty($model->risk_code)) {
                $year  = now()->year;
                $count = self::withTrashed()->whereYear('created_at', $year)->count();
                $model->risk_code = 'ERISK-' . $year . '-' . str_pad($count + 1, 4, '0', STR_PAD_LEFT);
            }
        });

        static::saving(function (self $model) {
            // Primary risk
            if ($model->severity && $model->likelihood) {
                $score = $model->severity * $model->likelihood;
                $model->risk_score = $score;
                $model->risk_rating = self::calculateRating($score);
            }
            // Residual risk
            if ($model->residual_severity && $model->residual_likelihood) {
                $rScore = $model->residual_severity * $model->residual_likelihood;
                $model->residual_risk_score  = $rScore;
                $model->residual_risk_rating = self::calculateRating($rScore);
            }
        });
    }

    public static function calculateRating(int $score): string
    {
        if ($score >= 15) return 'Critical';
        if ($score >= 8)  return 'High';
        if ($score >= 4)  return 'Medium';
        return 'Low';
    }

    // ─── Relationships ─────────────────────────────

    public function aspect(): BelongsTo
    {
        return $this->belongsTo(EnvironmentalAspect::class, 'aspect_id');
    }

    public function actions(): HasMany
    {
        return $this->hasMany(EnvironmentalAction::class, 'linked_id')
            ->where('linked_type', 'risk');
    }

    public function responsible(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsible_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ─── Helpers ───────────────────────────────────

    public function logHistory(string $action, ?string $fromStatus = null, ?string $toStatus = null, ?string $description = null, ?array $metadata = null): void
    {
        $user = auth()->user();
        EnvironmentalLog::create([
            'log_type'          => 'risk',
            'linked_id'         => $this->id,
            'action'            => $action,
            'from_status'       => $fromStatus,
            'to_status'         => $toStatus,
            'description'       => $description,
            'performed_by'      => $user?->id,
            'performed_by_name' => $user?->full_name ?? $user?->email ?? 'System',
            'performed_by_role' => $user?->role ?? 'unknown',
            'metadata'          => $metadata,
        ]);
    }

    // ─── Scopes ────────────────────────────────────

    public function scopeHighRisk($query)
    {
        return $query->whereIn('risk_rating', ['High', 'Critical']);
    }

    public function scopeByAspect($query, int $aspectId)
    {
        return $query->where('aspect_id', $aspectId);
    }
}
