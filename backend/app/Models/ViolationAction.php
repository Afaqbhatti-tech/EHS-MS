<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ViolationAction extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'violation_id',
        'title', 'description',
        'assigned_to', 'assigned_to_name',
        'due_date', 'priority', 'status',
        'completion_notes', 'completed_at', 'completed_by', 'completed_by_name',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'completed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (ViolationAction $a) {
            if (empty($a->id)) {
                $a->id = Str::uuid()->toString();
            }
        });
    }

    public function violation()
    {
        return $this->belongsTo(Violation::class);
    }

    public function evidence()
    {
        return $this->hasMany(ViolationEvidence::class, 'related_id')
            ->where('related_type', 'action');
    }
}
