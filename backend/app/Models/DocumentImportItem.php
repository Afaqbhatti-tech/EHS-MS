<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class DocumentImportItem extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'document_import_id',
        'target_module',
        'target_model',
        'target_record_id',
        'action',
        'section_heading',
        'extracted_fields',
        'mapped_fields',
        'confidence',
        'status',
        'duplicate_of',
        'warnings',
        'error_message',
    ];

    protected $casts = [
        'extracted_fields' => 'array',
        'mapped_fields' => 'array',
        'warnings' => 'array',
        'confidence' => 'decimal:2',
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

    public function documentImport()
    {
        return $this->belongsTo(DocumentImport::class);
    }

    // Scopes

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeCreated($query)
    {
        return $query->where('action', 'created');
    }

    public function scopeByModule($query, string $module)
    {
        return $query->where('target_module', $module);
    }
}
