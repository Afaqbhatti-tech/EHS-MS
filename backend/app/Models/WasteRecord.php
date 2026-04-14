<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WasteRecord extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'waste_code', 'waste_type', 'waste_category',
        'source_area', 'department', 'quantity', 'unit',
        'storage_location', 'container_type',
        'responsible_person', 'responsible_id',
        'disposal_method', 'disposal_vendor', 'manifest_number',
        'disposal_date', 'collection_date', 'document_path',
        'status', 'notes', 'created_by', 'updated_by', 'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'disposal_date'   => 'date',
            'collection_date' => 'date',
            'quantity'        => 'decimal:3',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (empty($model->waste_code)) {
                $year  = now()->year;
                $count = self::withTrashed()->whereYear('created_at', $year)->count();
                $model->waste_code = 'WST-' . $year . '-' . str_pad($count + 1, 4, '0', STR_PAD_LEFT);
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
            'log_type'          => 'waste',
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

    public function scopeHazardous($query)
    {
        return $query->where('waste_category', 'Hazardous');
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('waste_type', $type);
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }
}
