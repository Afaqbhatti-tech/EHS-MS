<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EnvironmentalMonitoring extends Model
{
    use SoftDeletes;
    protected $table = 'environmental_monitoring';

    protected $fillable = [
        'monitoring_code', 'monitoring_type', 'source_area',
        'parameter', 'measured_value', 'permissible_limit', 'unit',
        'compliance_status', 'monitoring_date', 'monitoring_time',
        'conducted_by', 'conducted_by_id', 'equipment_used',
        'report_path', 'remarks', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'monitoring_date' => 'date',
            'measured_value'  => 'decimal:4',
            'permissible_limit' => 'decimal:4',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (empty($model->monitoring_code)) {
                $year  = now()->year;
                $count = self::whereYear('created_at', $year)->count();
                $model->monitoring_code = 'MON-' . $year . '-' . str_pad($count + 1, 4, '0', STR_PAD_LEFT);
            }
        });

        static::saving(function (self $model) {
            if ($model->permissible_limit && $model->permissible_limit > 0) {
                if ($model->measured_value > $model->permissible_limit) {
                    $model->compliance_status = 'Non-Compliant';
                } elseif ($model->measured_value > $model->permissible_limit * 0.9) {
                    $model->compliance_status = 'Warning';
                } else {
                    $model->compliance_status = 'Compliant';
                }
            }
        });
    }

    // ─── Computed ──────────────────────────────────

    public function getReportUrlAttribute(): ?string
    {
        return $this->report_path ? asset('storage/' . $this->report_path) : null;
    }

    // ─── Relationships ─────────────────────────────

    public function conductedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'conducted_by_id');
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
            'log_type'          => 'monitoring',
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

    public function scopeNonCompliant($query)
    {
        return $query->where('compliance_status', 'Non-Compliant');
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('monitoring_type', $type);
    }
}
