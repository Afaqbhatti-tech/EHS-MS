<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EquipmentGroupField extends Model
{
    protected $table = 'equipment_group_fields';

    protected $fillable = [
        'registry_group_id', 'group_id', 'field_key', 'field_label', 'field_type',
        'field_options', 'is_required', 'sort_order',
    ];

    protected $casts = [
        'field_options' => 'array',
        'is_required'   => 'boolean',
        'sort_order'    => 'integer',
    ];

    public function registryGroup()
    {
        return $this->belongsTo(EquipmentRegistryGroup::class, 'registry_group_id');
    }

    public function group()
    {
        return $this->belongsTo(EquipmentGroup::class, 'group_id');
    }
}
