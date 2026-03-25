<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'ref_number', 'title', 'document_type', 'category', 'version',
        'file_path', 'status', 'is_ai_generated', 'fft_review_status',
        'lucid_review_status', 'src_review_status', 'pmcm_review_status',
        'uploaded_by', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'is_ai_generated' => 'boolean',
        ];
    }
}
