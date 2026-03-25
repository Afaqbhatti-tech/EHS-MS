<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserPermissionOverride extends Model
{
    protected $fillable = [
        'user_id',
        'overrides',
    ];

    protected function casts(): array
    {
        return [
            'overrides' => 'array',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
