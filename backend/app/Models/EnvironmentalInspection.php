<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvironmentalInspection extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'inspection_code', 'inspection_type', 'site', 'area', 'zone', 'department',
        'inspection_date', 'inspector_name', 'inspector_id',
        'findings_summary', 'compliance_status', 'non_compliance_count',
        'positive_findings', 'recommendations',
        'photo_paths', 'report_path', 'follow_up_date',
        'status', 'notes', 'created_by', 'updated_by', 'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'inspection_date' => 'date',
            'follow_up_date'  => 'date',
            'photo_paths'     => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (empty($model->inspection_code)) {
                $year  = now()->year;
                $count = self::withTrashed()->whereYear('created_at', $year)->count();
                $model->inspection_code = 'EINSP-' . $year . '-' . str_pad($count + 1, 4, '0', STR_PAD_LEFT);
            }
        });

        static::saved(function (self $model) {
            if ($model->non_compliance_count > 0 && $model->status !== 'Action Required') {
                $model->timestamps = false;
                $model->update(['status' => 'Action Required']);
                $model->timestamps = true;
            }
        });
    }

    // ─── Computed ──────────────────────────────────

    public function getPhotoUrlsAttribute(): array
    {
        if (!$this->photo_paths) return [];
        return array_map(fn($p) => asset('storage/' . $p), $this->photo_paths);
    }

    public function getReportUrlAttribute(): ?string
    {
        return $this->report_path ? asset('storage/' . $this->report_path) : null;
    }

    // ─── Relationships ─────────────────────────────

    public function inspector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inspector_id');
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
            'log_type'          => 'inspection',
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
}
