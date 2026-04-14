<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ResourceConsumption extends Model
{
    use SoftDeletes;
    protected $table = 'resource_consumption';

    protected $fillable = [
        'consumption_code', 'resource_type', 'consumption_value', 'unit',
        'meter_reading', 'previous_reading', 'reading_date',
        'billing_period', 'location', 'area', 'department',
        'recorded_by', 'recorded_by_id', 'cost', 'currency',
        'remarks', 'document_path',
    ];

    protected function casts(): array
    {
        return [
            'reading_date'      => 'date',
            'consumption_value' => 'decimal:4',
            'meter_reading'     => 'decimal:4',
            'previous_reading'  => 'decimal:4',
            'cost'              => 'decimal:2',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (empty($model->consumption_code)) {
                $year  = now()->year;
                $count = self::whereYear('created_at', $year)->count();
                $model->consumption_code = 'RES-' . $year . '-' . str_pad($count + 1, 4, '0', STR_PAD_LEFT);
            }
        });

        static::saving(function (self $model) {
            if ($model->meter_reading !== null && $model->previous_reading !== null) {
                $model->consumption_value = $model->meter_reading - $model->previous_reading;
            }
        });
    }

    // ─── Computed ──────────────────────────────────

    public function getDocumentUrlAttribute(): ?string
    {
        return $this->document_path ? asset('storage/' . $this->document_path) : null;
    }

    // ─── Relationships ─────────────────────────────

    public function recordedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by_id');
    }

    // ─── Helpers ───────────────────────────────────

    public function logHistory(string $action, ?string $fromStatus = null, ?string $toStatus = null, ?string $description = null, ?array $metadata = null): void
    {
        $user = auth()->user();
        EnvironmentalLog::create([
            'log_type'          => 'resource',
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

    public function scopeByType($query, string $type)
    {
        return $query->where('resource_type', $type);
    }

    public function scopeByPeriod($query, int $month, int $year)
    {
        return $query->whereMonth('reading_date', $month)->whereYear('reading_date', $year);
    }
}
