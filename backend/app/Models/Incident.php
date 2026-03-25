<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Incident extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'ref_number', 'incident_date', 'incident_time', 'classification',
        'severity', 'zone', 'contractor', 'description', 'immediate_actions',
        'witnesses', 'root_cause', 'corrective_actions', 'status',
        'reported_by', 'investigated_by', 'attachments',
    ];

    protected function casts(): array
    {
        return [
            'witnesses' => 'array',
            'corrective_actions' => 'array',
            'attachments' => 'array',
            'incident_date' => 'date',
        ];
    }
}
