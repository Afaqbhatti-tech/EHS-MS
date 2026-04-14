<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ChecklistCategory extends Model
{
    use SoftDeletes;

    protected $table = 'checklist_categories';

    protected $fillable = [
        'key', 'label', 'full_label', 'icon',
        'color', 'light_color', 'text_color',
        'has_plate', 'has_swl', 'has_cert',
        'insp_freq_days', 'description',
        'is_active', 'sort_order', 'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'has_plate' => 'boolean',
            'has_swl'   => 'boolean',
            'has_cert'  => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function items()
    {
        return $this->hasMany(ChecklistItem::class, 'category_id');
    }

    public function getItemCountAttribute(): int
    {
        return $this->items()->where('status', '!=', 'Removed from Site')->count();
    }

    public function getOverdueCountAttribute(): int
    {
        return $this->items()->where('is_overdue', true)->where('status', 'Active')->count();
    }

    public function getDueSoonCountAttribute(): int
    {
        return $this->items()
            ->where('is_overdue', false)
            ->where('status', 'Active')
            ->whereBetween('days_until_due', [0, 3])
            ->count();
    }
}
