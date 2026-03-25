<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'email',
        'username',
        'full_name',
        'password_hash',
        'role',
        'contractor',
        'permissions',
        'is_active',
        'avatar_url',
        'setup_token',
        'setup_token_expires_at',
        'last_login_at',
    ];

    protected $hidden = [
        'password_hash',
        'setup_token',
    ];

    protected function casts(): array
    {
        return [
            'permissions' => 'array',
            'is_active' => 'boolean',
            'setup_token_expires_at' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    public function getAuthPassword(): string
    {
        return $this->password_hash ?? '';
    }

    public function permissionOverrides()
    {
        return $this->hasOne(UserPermissionOverride::class);
    }

    public function isMaster(): bool
    {
        return $this->role === 'master';
    }

    public function hasPermission(string $flag): bool
    {
        if ($this->isMaster()) {
            return true;
        }

        $perms = $this->permissions ?? [];
        return !empty($perms[$flag]);
    }
}
