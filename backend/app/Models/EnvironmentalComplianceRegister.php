<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvironmentalComplianceRegister extends Model
{
    use SoftDeletes;

    protected $table = 'environmental_compliance_register';

    protected $fillable = [
        'compliance_code', 'regulation_name', 'regulatory_authority',
        'requirement_type', 'requirement_description',
        'applicable_area', 'applicable_process',
        'responsible_person', 'responsible_id',
        'compliance_status', 'last_checked_date', 'next_due_date',
        'document_path', 'remarks', 'created_by', 'updated_by', 'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'last_checked_date' => 'date',
            'next_due_date'     => 'date',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (empty($model->compliance_code)) {
                $year  = now()->year;
                $count = self::withTrashed()->whereYear('created_at', $year)->count();
                $model->compliance_code = 'COMP-' . $year . '-' . str_pad($count + 1, 4, '0', STR_PAD_LEFT);
            }
        });

        static::saving(function (self $model) {
            if ($model->next_due_date && $model->next_due_date->lt(today())
                && !in_array($model->compliance_status, ['Compliant', 'Expired'])) {
                $model->compliance_status = 'Expired';
            }
        });
    }

    // ─── Computed ──────────────────────────────────

    public function getDocumentUrlAttribute(): ?string
    {
        return $this->document_path ? asset('storage/' . $this->document_path) : null;
    }

    // ─── Relationships ─────────────────────────────

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
            'log_type'          => 'compliance',
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

    public function scopeOverdue($query)
    {
        return $query->where('next_due_date', '<', today())
            ->whereNotIn('compliance_status', ['Compliant', 'Expired']);
    }

    public function scopeDueForReview($query)
    {
        return $query->where('next_due_date', '<=', today()->addDays(30))
            ->where('next_due_date', '>=', today());
    }
}
