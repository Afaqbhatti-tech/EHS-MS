<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PermitAmendment extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'ref_number', 'permit_id', 'amendment_reason',
        'changes_description', 'status', 'requested_by', 'approved_by', 'approved_at',
    ];

    protected function casts(): array
    {
        return ['approved_at' => 'datetime'];
    }

    public function permit()
    {
        return $this->belongsTo(Permit::class);
    }
}
