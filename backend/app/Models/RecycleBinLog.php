<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RecycleBinLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'action',
        'record_type',
        'record_id',
        'record_name',
        'record_code',
        'module',
        'performed_by',
        'performed_by_name',
        'reason',
        'metadata',
        'created_at',
    ];

    protected $casts = [
        'metadata'   => 'array',
        'created_at' => 'datetime',
    ];

    public function performer()
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}
