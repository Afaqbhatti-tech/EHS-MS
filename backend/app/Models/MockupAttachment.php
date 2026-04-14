<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class MockupAttachment extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'mockup_id', 'attachment_type', 'file_path',
        'original_name', 'file_type', 'file_size',
        'uploaded_by', 'uploaded_by_name',
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
}
