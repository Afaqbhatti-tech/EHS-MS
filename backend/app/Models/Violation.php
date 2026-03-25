<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Violation extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'ref_number', 'violation_date', 'severity', 'action_type',
        'description', 'contractor', 'zone', 'golden_rules', 'penalty_amount',
        'status', 'issued_by', 'attachments',
    ];

    protected function casts(): array
    {
        return [
            'golden_rules' => 'array',
            'attachments' => 'array',
            'violation_date' => 'date',
            'penalty_amount' => 'decimal:2',
        ];
    }
}
