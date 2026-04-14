<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class AiDocumentAnalysis extends Model
{
    protected $table = 'ai_document_analyses';

    protected $fillable = [
        'user_id',
        'file_path',
        'original_name',
        'file_type',
        'file_size_kb',
        'detected_document_type',
        'confidence_score',
        'extracted_data',
        'missing_fields',
        'summary',
        'suggested_module',
        'suggested_action',
        'mapping_status',
        'linked_module',
        'linked_record_id',
        'raw_response',
        'tokens_used',
    ];

    protected function casts(): array
    {
        return [
            'extracted_data'   => 'array',
            'missing_fields'   => 'array',
            'confidence_score' => 'integer',
            'file_size_kb'     => 'integer',
            'tokens_used'      => 'integer',
            'created_at'       => 'datetime',
            'updated_at'       => 'datetime',
        ];
    }

    // ── Relationships ───────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // ── Computed ────────────────────────────────────────

    public function getFileUrlAttribute(): ?string
    {
        return $this->file_path ? Storage::disk('public')->url($this->file_path) : null;
    }

    protected $appends = ['file_url'];
}
