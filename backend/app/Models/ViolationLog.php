<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ViolationLog extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'violation_id', 'action_type', 'description',
        'old_value', 'new_value', 'metadata',
        'user_id', 'user_name',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (ViolationLog $l) {
            if (empty($l->id)) {
                $l->id = Str::uuid()->toString();
            }
        });
    }

    public function violation()
    {
        return $this->belongsTo(Violation::class);
    }
}
