<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EquipmentItem extends Model
{
    use SoftDeletes;

    protected $table = 'equipment_items';

    protected $fillable = [
        'group_id', 'item_code', 'equipment_code', 'item_name',
        'status', 'created_by', 'updated_by', 'deleted_by',
    ];

    // ── Relationships ─────────────────────────────

    public function group()
    {
        return $this->belongsTo(EquipmentGroup::class, 'group_id');
    }

    public function fieldValues()
    {
        return $this->hasMany(EquipmentItemValue::class, 'item_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ── Helpers ────────────────────────────────────

    /**
     * Get a specific field value by key.
     */
    public function getFieldValue(string $key): ?string
    {
        return $this->fieldValues->firstWhere('field_key', $key)?->field_value;
    }

    /**
     * Get all field values as key => value array.
     */
    public function getFieldValuesArray(): array
    {
        return $this->fieldValues->pluck('field_value', 'field_key')->toArray();
    }

    /**
     * Get expiry status based on date fields.
     */
    public function getExpiryStatusAttribute(): array
    {
        $status = ['status' => 'valid', 'label' => 'Valid', 'days' => null, 'field' => null];
        $now = now();
        $soonThreshold = now()->addDays(30);

        $dateFields = ['tuv_expiry_date', 'next_inspection_date', 'certificate_expiry'];
        $values = $this->getFieldValuesArray();

        foreach ($dateFields as $fieldKey) {
            $val = $values[$fieldKey] ?? null;
            if (empty($val)) continue;

            try {
                $date = \Carbon\Carbon::parse($val);
                if ($date->isPast()) {
                    return [
                        'status' => 'expired',
                        'label'  => 'Expired',
                        'days'   => abs($date->diffInDays($now)),
                        'field'  => $fieldKey,
                    ];
                } elseif ($date->lte($soonThreshold)) {
                    $status = [
                        'status' => 'expiring_soon',
                        'label'  => 'Expiring in ' . $date->diffInDays($now) . ' days',
                        'days'   => $date->diffInDays($now),
                        'field'  => $fieldKey,
                    ];
                }
            } catch (\Exception $e) {
                continue;
            }
        }

        return $status;
    }

    // ── Auto-generate codes ─────────────────────

    protected static function booted(): void
    {
        static::creating(function (EquipmentItem $item) {
            // Generate item_code (legacy format) with lock to prevent duplicates
            if (!$item->item_code) {
                $groupId = $item->group_id;
                $last = self::where('group_id', $groupId)->withTrashed()->lockForUpdate()->count();
                $item->item_code = sprintf('EQG-%d-%04d', $groupId, $last + 1);
            }

            // Generate unique equipment_code with lock to prevent race conditions
            if (!$item->equipment_code) {
                $prefix = 'EQ';

                // Try to use category code_prefix
                $group = EquipmentGroup::find($item->group_id);
                if ($group && $group->code_prefix) {
                    $prefix = strtoupper($group->code_prefix);
                }

                // Find the next sequential number globally (locked to prevent duplicates)
                $lastCode = self::withTrashed()
                    ->lockForUpdate()
                    ->where('equipment_code', 'like', $prefix . '-%')
                    ->orderByRaw('CAST(SUBSTRING(equipment_code, ' . (strlen($prefix) + 2) . ') AS UNSIGNED) DESC')
                    ->value('equipment_code');

                $nextNum = 1;
                if ($lastCode) {
                    $parts = explode('-', $lastCode);
                    $nextNum = (int) end($parts) + 1;
                }

                $item->equipment_code = sprintf('%s-%06d', $prefix, $nextNum);
            }
        });

        static::created(function (EquipmentItem $item) {
            $item->group?->refreshItemCount();
        });

        static::deleted(function (EquipmentItem $item) {
            $item->group?->refreshItemCount();
        });

        static::restored(function (EquipmentItem $item) {
            $item->group?->refreshItemCount();
        });
    }
}
