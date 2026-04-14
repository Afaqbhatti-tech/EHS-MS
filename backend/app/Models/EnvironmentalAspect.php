<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EnvironmentalAspect extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'aspect_code', 'activity', 'aspect_description', 'impact_description',
        'aspect_category', 'impact_type', 'location', 'area', 'department',
        'severity', 'likelihood', 'risk_level', 'risk_score',
        'controls', 'additional_controls',
        'responsible_person', 'responsible_id', 'review_date',
        'status', 'notes', 'created_by', 'updated_by', 'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'review_date' => 'date',
            'severity'    => 'integer',
            'likelihood'  => 'integer',
            'risk_score'  => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (empty($model->aspect_code)) {
                $year  = now()->year;
                $count = self::withTrashed()->whereYear('created_at', $year)->count();
                $model->aspect_code = 'ASP-' . $year . '-' . str_pad($count + 1, 4, '0', STR_PAD_LEFT);
            }
        });

        static::saving(function (self $model) {
            if ($model->severity && $model->likelihood) {
                $score = $model->severity * $model->likelihood;
                $model->risk_score = $score;
                if ($score >= 15)     $model->risk_level = 'Critical';
                elseif ($score >= 8)  $model->risk_level = 'High';
                elseif ($score >= 4)  $model->risk_level = 'Medium';
                else                  $model->risk_level = 'Low';
            }
        });
    }

    // ─── Relationships ─────────────────────────────

    public function risks(): HasMany
    {
        return $this->hasMany(EnvironmentalRisk::class, 'aspect_id');
    }

    public function actions(): HasMany
    {
        return $this->hasMany(EnvironmentalAction::class, 'linked_id')
            ->where('linked_type', 'aspect');
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
            'log_type'          => 'aspect',
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
        return $query->whereIn('risk_level', ['High', 'Critical']);
    }

    public function scopeByCategory($query, string $cat)
    {
        return $query->where('aspect_category', $cat);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'Active');
    }
}
