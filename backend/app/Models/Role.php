<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'description',
        'is_system',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function rolePermission()
    {
        return $this->hasOne(RolePermission::class, 'role', 'slug');
    }

    public function users()
    {
        return $this->hasMany(User::class, 'role', 'slug');
    }
}
