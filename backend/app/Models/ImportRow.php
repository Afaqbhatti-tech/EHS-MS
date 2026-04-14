<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImportRow extends Model
{
    public $timestamps = false;

    protected $table = 'import_rows';

    protected $fillable = [
        'batch_id', 'row_number', 'raw_data',
        'classification', 'match_type', 'match_confidence',
        'matched_record_id', 'matched_record_uuid', 'matched_record_code',
        'fields_to_fill', 'fields_conflicting', 'fields_identical',
        'conflict_reason', 'review_notes',
        'sync_action', 'sync_error', 'synced_record_id',
        'synced_record_uuid', 'synced_at',
    ];

    protected function casts(): array
    {
        return [
            'raw_data'          => 'array',
            'fields_to_fill'    => 'array',
            'fields_conflicting'=> 'array',
            'fields_identical'  => 'array',
            'synced_at'         => 'datetime',
            'created_at'        => 'datetime',
        ];
    }

    // ── Relationships ──────────────────────────────────

    public function batch(): BelongsTo
    {
        return $this->belongsTo(ImportBatch::class, 'batch_id');
    }

    // ── Helpers ────────────────────────────────────────

    public function getDisplayNameAttribute(): string
    {
        $raw = $this->raw_data ?? [];
        return $raw['name'] ?? $raw['full_name'] ?? $raw['employee_name']
            ?? $raw['equipment_name'] ?? $raw['contractor_name']
            ?? "Row #{$this->row_number}";
    }

    public function getDisplayIdAttribute(): ?string
    {
        $raw = $this->raw_data ?? [];
        return $raw['iqama_number'] ?? $raw['employee_number']
            ?? $raw['serial_number'] ?? $raw['registration_number']
            ?? $this->matched_record_code;
    }
}
