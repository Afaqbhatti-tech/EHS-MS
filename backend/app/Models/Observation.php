<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Observation extends Model
{
    use SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'ref_number', 'observation_date', 'reporting_officer', 'category',
        'type', 'zone', 'phase', 'contractor', 'priority', 'status',
        'description', 'corrective_action', 'photos', 'assigned_to',
        'target_date', 'closed_date', 'closed_by', 'close_notes',
        'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'photos' => 'array',
            'observation_date' => 'date',
            'target_date' => 'date',
            'closed_date' => 'date',
        ];
    }
}
