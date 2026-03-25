<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Mom extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'ref_number', 'meeting_date', 'meeting_type', 'location',
        'attendees', 'action_items', 'previous_closeouts', 'notes',
        'status', 'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'attendees' => 'array',
            'action_items' => 'array',
            'previous_closeouts' => 'array',
            'meeting_date' => 'date',
        ];
    }
}
