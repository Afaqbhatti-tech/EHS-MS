<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ManpowerRecord extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'record_date', 'shift', 'area', 'contractor',
        'headcount', 'man_hours', 'worker_categories', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'worker_categories' => 'array',
            'record_date' => 'date',
            'man_hours' => 'decimal:2',
        ];
    }
}
