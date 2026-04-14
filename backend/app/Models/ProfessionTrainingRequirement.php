<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ProfessionTrainingRequirement extends Model
{
    protected $table = 'profession_training_requirements';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'profession', 'training_topic_key', 'training_topic_id',
        'is_mandatory', 'notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_mandatory' => 'boolean',
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

    public function topic()
    {
        return $this->belongsTo(TrainingTopic::class, 'training_topic_id');
    }

    public function scopeForProfession($q, string $profession)
    {
        return $q->where('profession', $profession);
    }
}
