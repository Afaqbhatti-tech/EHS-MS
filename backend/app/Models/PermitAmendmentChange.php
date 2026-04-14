<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PermitAmendmentChange extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'amendment_id', 'change_order', 'change_category',
        'field_name', 'old_value', 'new_value', 'change_reason',
        'is_major_trigger',
    ];

    protected function casts(): array
    {
        return [
            'is_major_trigger' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function amendment()
    {
        return $this->belongsTo(PermitAmendment::class, 'amendment_id');
    }
}
