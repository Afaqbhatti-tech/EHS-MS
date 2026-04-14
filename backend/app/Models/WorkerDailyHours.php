<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class WorkerDailyHours extends Model
{
    protected $table = 'worker_daily_hours';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'worker_id', 'work_date', 'day_name',
        'shift', 'hours_worked', 'overtime_hours',
        'attendance_status', 'site_area',
        'notes', 'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'work_date' => 'date',
            'hours_worked' => 'float',
            'overtime_hours' => 'float',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($record) {
            if ($record->work_date && !$record->day_name) {
                $record->day_name = Carbon::parse($record->work_date)->format('l');
            }
        });
    }

    public function worker()
    {
        return $this->belongsTo(Worker::class);
    }
}
