<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class MockupApprover extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'mockup_id', 'name', 'designation',
        'approver_type', 'approval_status', 'approval_date',
    ];

    protected function casts(): array
    {
        return [
            'approval_date' => 'date',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $m) {
            if (empty($m->id)) {
                $m->id = (string) Str::uuid();
            }
        });
    }

    public function mockup()
    {
        return $this->belongsTo(Mockup::class);
    }
}
