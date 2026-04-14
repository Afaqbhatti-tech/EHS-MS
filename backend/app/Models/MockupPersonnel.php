<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class MockupPersonnel extends Model
{
    public $timestamps = false;
    protected $table = 'mockup_personnel';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'mockup_id', 'user_id', 'person_name',
        'designation', 'company', 'source_type',
    ];

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

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
