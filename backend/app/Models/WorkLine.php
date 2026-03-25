<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkLine extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'name', 'slug', 'description', 'color', 'sort_order', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function ramsDocuments()
    {
        return $this->hasMany(RamsDocument::class);
    }
}
