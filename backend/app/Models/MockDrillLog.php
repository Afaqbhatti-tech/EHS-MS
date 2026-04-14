<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MockDrillLog extends Model
{
    public $timestamps = false;
    const UPDATED_AT = null;

    protected $fillable = [
        'mock_drill_id', 'erp_id', 'log_type', 'action',
        'from_status', 'to_status', 'description',
        'performed_by', 'performed_by_name', 'performed_by_role',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata'   => 'array',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($model) {
            $model->created_at = $model->created_at ?? now();
        });
    }

    public function drill(): BelongsTo
    {
        return $this->belongsTo(MockDrill::class, 'mock_drill_id');
    }

    public function erp(): BelongsTo
    {
        return $this->belongsTo(Erp::class, 'erp_id');
    }

    public function performer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}
