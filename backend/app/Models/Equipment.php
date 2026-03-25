<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Equipment extends Model
{
    protected $table = 'equipment';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'ref_number', 'name', 'type', 'serial_number', 'contractor',
        'location', 'status', 'last_inspection_date', 'next_inspection_date',
        'certificate_number', 'certificate_expiry', 'attachments', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'attachments' => 'array',
            'last_inspection_date' => 'date',
            'next_inspection_date' => 'date',
            'certificate_expiry' => 'date',
        ];
    }
}
