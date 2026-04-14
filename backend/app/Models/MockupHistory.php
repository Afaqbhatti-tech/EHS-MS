<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class MockupHistory extends Model
{
    public $timestamps = false;

    protected $table = 'mockup_history';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'mockup_id', 'action', 'from_status', 'to_status',
        'performed_by', 'performed_by_name', 'performed_by_role',
        'description', 'metadata',
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
        static::creating(function (MockupHistory $h) {
            if (empty($h->id)) {
                $h->id = (string) Str::uuid();
            }
        });
    }

    public function mockup()
    {
        return $this->belongsTo(Mockup::class);
    }

    public function performer()
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}
