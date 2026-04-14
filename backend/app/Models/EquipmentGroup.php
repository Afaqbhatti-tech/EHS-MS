<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EquipmentGroup extends Model
{
    use SoftDeletes;

    protected $table = 'equipment_groups';

    protected $fillable = [
        'name', 'description', 'icon', 'color', 'light_color', 'text_color',
        'category_type', 'code_prefix', 'registry_group_id',
        'item_count', 'created_by', 'updated_by', 'deleted_by',
    ];

    protected $casts = [
        'item_count' => 'integer',
    ];

    // ── Relationships ─────────────────────────────

    public function registryGroup()
    {
        return $this->belongsTo(EquipmentRegistryGroup::class, 'registry_group_id');
    }

    /**
     * Fields directly assigned to this category (legacy).
     */
    public function fields()
    {
        return $this->hasMany(EquipmentGroupField::class, 'group_id')->orderBy('sort_order');
    }

    /**
     * Get effective fields: prefer registry-group-level fields, fallback to category-level.
     */
    public function getEffectiveFieldsAttribute()
    {
        if ($this->registry_group_id) {
            $rgFields = EquipmentGroupField::where('registry_group_id', $this->registry_group_id)
                ->whereNull('group_id')
                ->orderBy('sort_order')
                ->get();

            if ($rgFields->isNotEmpty()) {
                return $rgFields;
            }
        }

        return $this->fields;
    }

    public function items()
    {
        return $this->hasMany(EquipmentItem::class, 'group_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ── Computed ───────────────────────────────────

    public function getActiveItemCountAttribute(): int
    {
        return $this->items()->whereNull('deleted_at')->count();
    }

    public function refreshItemCount(): void
    {
        $this->update(['item_count' => $this->active_item_count]);
    }

    /**
     * Get item statistics for this category.
     */
    public function getItemStatsAttribute(): array
    {
        $items = $this->items()->whereNull('deleted_at')->get();
        $total = $items->count();
        $active = $items->where('status', 'Active')->count();
        $expired = 0;
        $expiringSoon = 0;

        $itemIds = $items->pluck('id');
        if ($itemIds->isNotEmpty()) {
            $expiryValues = EquipmentItemValue::whereIn('item_id', $itemIds)
                ->whereIn('field_key', ['tuv_expiry_date', 'next_inspection_date', 'certificate_expiry'])
                ->get()
                ->groupBy('item_id');

            $now = now();
            $soonThreshold = now()->addDays(30);

            foreach ($expiryValues as $values) {
                $itemExpired = false;
                foreach ($values as $val) {
                    if (empty($val->field_value)) continue;
                    try {
                        $date = \Carbon\Carbon::parse($val->field_value);
                        if ($date->isPast()) {
                            $expired++;
                            $itemExpired = true;
                            break;
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
