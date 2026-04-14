<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class TrainingTopic extends Model
{
    protected $table = 'training_topics';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'key', 'label', 'category', 'validity_days',
        'is_mandatory', 'description', 'color',
        'light_color', 'is_active', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_mandatory' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (TrainingTopic $topic) {
            if (empty($topic->id)) {
                $topic->id = Str::uuid()->toString();
            }
        });
    }

    public function records()
    {
        return $this->hasMany(TrainingRecord::class, 'training_topic_id');
    }

    public function professionRequirements()
    {
        return $this->hasMany(ProfessionTrainingRequirement::class, 'training_topic_id');
    }

    public function scopeActive($q)
    {
        return $q->where('is_active', true);
    }
}
