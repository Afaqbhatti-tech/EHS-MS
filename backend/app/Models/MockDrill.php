<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MockDrill extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'ref_number', 'drill_type', 'drill_date', 'location',
        'participants_count', 'response_time_seconds', 'kpi_score',
        'status', 'findings', 'attachments', 'conducted_by',
    ];

    protected function casts(): array
    {
        return [
            'attachments' => 'array',
            'drill_date' => 'date',
            'kpi_score' => 'decimal:2',
        ];
    }
}
