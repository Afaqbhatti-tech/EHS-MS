<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RamsDocumentVersion extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'rams_document_id', 'version_number', 'file_path',
        'file_name', 'file_size', 'mime_type', 'uploaded_by', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'version_number' => 'integer',
            'file_size' => 'integer',
        ];
    }

    public function document()
    {
        return $this->belongsTo(RamsDocument::class, 'rams_document_id');
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
