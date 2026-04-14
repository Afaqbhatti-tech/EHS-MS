<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MockDrillParticipant extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'mock_drill_id', 'user_id', 'name', 'employee_id', 'designation',
        'department', 'company', 'emergency_role', 'attendance_status',
        'participation_status', 'responsibility', 'remarks',
    ];

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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
