<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WasteManifest extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'ref_number', 'waste_type', 'quantity', 'unit', 'contractor',
        'disposal_method', 'disposal_site', 'manifest_date', 'status',
        'signatures', 'attachments', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'signatures' => 'array',
            'attachments' => 'array',
            'manifest_date' => 'date',
            'quantity' => 'decimal:2',
        ];
    }
}
