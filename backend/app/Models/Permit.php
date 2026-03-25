<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Permit extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'ref_number', 'permit_type', 'work_description', 'zone', 'phase',
        'contractor', 'applicant_name', 'valid_from', 'valid_to', 'status',
        'safety_measures', 'ppe_requirements', 'attachments',
        'approved_by', 'approved_at', 'closed_by', 'closed_at',
    ];

    protected function casts(): array
    {
        return [
            'attachments' => 'array',
            'valid_from' => 'datetime',
            'valid_to' => 'datetime',
            'approved_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function amendments()
    {
        return $this->hasMany(PermitAmendment::class);
    }
}
