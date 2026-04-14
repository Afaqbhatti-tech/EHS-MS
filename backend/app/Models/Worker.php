<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Worker extends Model
{
    use SoftDeletes;

    protected $table = 'workers';
    protected $keyType = 'string';
    public $incrementing = false;

    protected static function booted(): void
    {
        static::creating(function (Worker $worker) {
            if (empty($worker->id)) {
                $worker->id = Str::uuid()->toString();
            }
            if (empty($worker->worker_id)) {
                $year  = now()->year;
                $count = static::whereYear('created_at', $year)->withTrashed()->count() + 1;
                $worker->worker_id = 'WRK-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
            }
        });
    }

    protected $fillable = [
        'worker_id', 'name', 'employee_number',
        'profession', 'department', 'company',
        'nationality', 'joining_date', 'demobilization_date',
        'induction_status', 'induction_date', 'induction_by',
        'status', 'id_number', 'iqama_number', 'contact_number',
        'emergency_contact', 'remarks',
        'training_profile_id', 'created_by', 'updated_by',
        'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'joining_date' => 'date',
            'demobilization_date' => 'date',
            'induction_date' => 'date',
        ];
    }

    public function dailyHours()
    {
        return $this->hasMany(WorkerDailyHours::class);
    }

    public function trainingRecords()
    {
        return $this->hasMany(TrainingRecord::class);
    }

    public function scopeActive($q)
    {
        return $q->where('status', 'Active');
    }

    public function scopeInducted($q)
    {
        return $q->where('induction_status', 'Done');
    }
}
