<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PermitAmendmentLog extends Model
{
    public $timestamps = false;
    const UPDATED_AT = null;
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'amendment_id', 'permit_id', 'action',
        'from_status', 'to_status', 'performed_by',
        'performed_by_name', 'performed_by_role',
        'description', 'metadata', 'created_at',
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
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->created_at)) {
                $model->created_at = now();
            }
        });
    }

    public function amendment()
    {
        return $this->belongsTo(PermitAmendment::class, 'amendment_id');
    }

    public function permit()
    {
        return $this->belongsTo(Permit::class, 'permit_id');
    }

    public function performer()
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}
