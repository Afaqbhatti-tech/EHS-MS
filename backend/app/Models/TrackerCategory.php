<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TrackerCategory extends Model
{
    use SoftDeletes;

    protected $table = 'tracker_categories';

    protected $fillable = [
        'key', 'label', 'group_name', 'icon', 'color',
        'light_color', 'text_color', 'has_plate', 'has_swl',
        'has_tuv', 'has_cert', 'insp_freq_days', 'tuv_freq_days',
        'template_type', 'description', 'is_active', 'sort_order', 'deleted_by',
    ];

    protected $casts = [
        'has_plate' => 'boolean',
        'has_swl'   => 'boolean',
        'has_tuv'   => 'boolean',
        'has_cert'  => 'boolean',
        'is_active' => 'boolean',
    ];

    public function records()
    {
        return $this->hasMany(TrackerRecord::class, 'category_id');
    }

    public function getActiveRecordCountAttribute(): int
    {
        return $this->records()->where('status', 'Active')->whereNull('deleted_at')->count();
    }

    public function getOverdueCountAttribute(): int
    {
        return $this->records()->where('is_overdue', true)->whereNull('deleted_at')->count();
    }

    public function getTuvOverdueCountAttribute(): int
    {
        return $this->records()->where('is_tuv_overdue', true)->whereNull('deleted_at')->count();
    }

    public function getDueSoonCountAttribute(): int
    {
        return $this->records()->where('is_overdue', false)->whereBetween('days_until_due', [0, 3])->whereNull('deleted_at')->count();
    }

    public function getCertExpiredCountAttribute(): int
    {
        return $this->records()->where('is_cert_expired', true)->whereNull('deleted_at')->count();
    }
}
