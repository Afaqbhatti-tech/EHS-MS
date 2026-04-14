<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class MockupImportBatch extends Model
{
    use HasUuids;

    protected $fillable = [
        'file_name', 'original_name', 'file_type', 'file_path',
        'total_parsed', 'success_count', 'failed_count', 'skipped_count',
        'errors', 'field_mapping', 'status',
        'imported_by', 'imported_by_name',
    ];

    protected function casts(): array
    {
        return [
            'errors' => 'array',
            'field_mapping' => 'array',
        ];
    }

    public function mockups()
    {
        return $this->hasMany(Mockup::class, 'import_batch_id');
    }

    public function importedByUser()
    {
        return $this->belongsTo(User::class, 'imported_by');
    }
}
