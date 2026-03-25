<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'employee_id', 'full_name', 'designation', 'department',
        'contractor', 'worker_category', 'nationality', 'id_number',
        'medical_fitness_expiry', 'is_active', 'certifications',
    ];

    protected function casts(): array
    {
        return [
            'certifications' => 'array',
            'is_active' => 'boolean',
            'medical_fitness_expiry' => 'date',
        ];
    }

    public function trainingRecords()
    {
        return $this->hasMany(TrainingRecord::class);
    }
}
