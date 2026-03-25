<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Campaign extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'ref_number', 'title', 'campaign_type', 'start_date',
        'end_date', 'status', 'description', 'materials', 'kpi_targets', 'kpi_actuals',
    ];

    protected function casts(): array
    {
        return [
            'materials' => 'array',
            'kpi_targets' => 'array',
            'kpi_actuals' => 'array',
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }
}
