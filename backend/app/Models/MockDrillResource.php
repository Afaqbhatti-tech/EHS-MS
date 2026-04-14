<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MockDrillResource extends Model
{
    protected $fillable = [
        'mock_drill_id', 'equipment_name', 'equipment_type', 'quantity',
        'condition', 'was_available', 'was_functional', 'remarks',
    ];

    protected function casts(): array
    {
        return [
            'was_available'  => 'boolean',
            'was_functional' => 'boolean',
        ];
    }

    public function drill(): BelongsTo
    {
        return $this->belongsTo(MockDrill::class, 'mock_drill_id');
    }
}
