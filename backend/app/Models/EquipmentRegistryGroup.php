<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EquipmentRegistryGroup extends Model
{
    use SoftDeletes;

    protected $table = 'equipment_registry_groups';

    protected $fillable = [
        'name', 'description', 'icon', 'color', 'light_color', 'text_color',
        'sort_order', 'created_by', 'updated_by', 'deleted_by',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    // ── Relationships ─────────────────────────────

    public function categories()
    {
        return $this->hasMany(EquipmentGroup::class, 'registry_group_id');
    }

    public function fields()
    {
        return $this->hasMany(EquipmentGroupField::class, 'registry_group_id')
            ->whereNull('group_id')
            ->orderBy('sort_order');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ── Computed ───────────────────────────────────

    public function getCategoryCountAttribute(): int
    {
        return $this->categories()->whereNull('deleted_at')->count();
    }

    public function getTotalItemCountAttribute(): int
    {
        $categoryIds = $this->categories()->whereNull('deleted_at')->pluck('id');
        return EquipmentItem::whereIn('group_id', $categoryIds)->whereNull('deleted_at')->count();
    }

    public function getItemStatsAttribute(): array
    {
        $categoryIds = $this->categories()->whereNull('deleted_at')->pluck('id');
        $items = EquipmentItem::whereIn('group_id', $categoryIds)
            ->whereNull('deleted_at')
            ->get();

        $total = $items->count();
        $active = $items->where('status', 'Active')->count();
        $expired = 0;
        $expiringSoon = 0;

        // Check expiry fields in item values
        $itemIds = $items->pluck('id');
        if ($itemIds->isNotEmpty()) {
            $expiryValues = EquipmentItemValue::whereIn('item_id', $itemIds)
                ->whereIn('field_key', ['tuv_expiry_date', 'next_inspection_date', 'certificate_expiry'])
                ->get()
                ->groupBy('item_id');

            $now = now();
            $soonThreshold = now()->addDays(30);

            foreach ($expiryValues as $itemId => $values) {
                foreach ($values as $val) {
                    if (empty($val->field_value)) continue;
                    try {
                        $date = \Carbon\Carbon::parse($val->field_value);
                        if ($date->isPast()) {
                            $expired++;
                            break; // Count item once
                        } elseif ($date->lte($soonThreshold)) {
                            $expiringSoon++;
                            break;
                        }
                    } catch (\Exception $e) {
                        continue;
                    }
                }
            }
        }

        return [
            'total'         => $total,
            'active'        => $active,
            'expired'       => $expired,
            'expiring_soon' => $expiringSoon,
        ];
    }
}
