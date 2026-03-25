<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainingRecord extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'ref_number', 'employee_id', 'training_type', 'training_title',
        'training_date', 'expiry_date', 'result', 'contractor', 'trainer',
        'certificate_number', 'attachments',
    ];

    protected function casts(): array
    {
        return [
            'attachments' => 'array',
            'training_date' => 'date',
            'expiry_date' => 'date',
        ];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
