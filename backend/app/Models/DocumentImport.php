<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class DocumentImport extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'file_name',
        'original_name',
        'file_type',
        'mime_type',
        'file_path',
        'file_size',
        'status',
        'document_type',
        'classification',
        'extracted_data',
        'import_summary',
        'total_sections',
        'total_records_created',
        'total_records_updated',
        'total_warnings',
        'warnings',
        'errors',
        'imported_by',
        'imported_by_name',
        'confirmed_at',
        'processing_time_ms',
    ];

    protected $casts = [
        'classification' => 'array',
        'extracted_data' => 'array',
        'import_summary' => 'array',
        'warnings' => 'array',
        'errors' => 'array',
        'confirmed_at' => 'datetime',
        'file_size' => 'integer',
        'total_sections' => 'integer',
        'total_records_created' => 'integer',
        'total_records_updated' => 'integer',
        'total_warnings' => 'integer',
        'processing_time_ms' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (!$model->id) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    // Relationships

    public function items()
    {
        return $this->hasMany(DocumentImportItem::class);
    }

    public function importedBy()
    {
        return $this->belongsTo(User::class, 'imported_by');
    }

    // Scopes

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopeAnalyzed($query)
    {
        return $query->where('status', 'analyzed');
    }

    public function scopeConfirmed($query)
    {
        return $query->where('status', 'confirmed');
    }

    // Helpers

    public function isAnalyzed(): bool
    {
        return $this->status === 'analyzed';
    }

    public function isConfirmed(): bool
    {
        return $this->status === 'confirmed';
    }

    public function canConfirm(): bool
    {
        return in_array($this->status, ['analyzed', 'partial']);
    }

    public function getFileUrl(): ?string
    {
        if (!$this->file_path) return null;
        return url('storage/' . $this->file_path);
    }
}
