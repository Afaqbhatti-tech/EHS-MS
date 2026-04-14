<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class TrainingLog extends Model
{
    protected $table = 'training_logs';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'training_record_id', 'record_code', 'action_type',
        'description', 'old_value', 'new_value', 'metadata',
        'user_id', 'user_name',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (empty($model->id)) {
                $model->id = Str::uuid()->toString();
            }
        });
    }

    public function trainingRecord()
    {
        return $this->belongsTo(TrainingRecord::class, 'training_record_id');
    }
}
