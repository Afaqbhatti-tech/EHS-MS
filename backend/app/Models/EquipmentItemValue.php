<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EquipmentItemValue extends Model
{
    protected $table = 'equipment_item_values';

    protected $fillable = [
        'item_id', 'field_key', 'field_value',
    ];

    public function item()
    {
        return $this->belongsTo(EquipmentItem::class, 'item_id');
    }
}
