<?php

namespace App\Services;

use App\Constants\PermissionRegistry;
use App\Models\RolePermission;
use App\Models\User;
use App\Models\UserPermissionOverride;

class PermissionService
{
    /**
     * Calculate effective permissions for a user (role defaults + overrides).
     */
    public function calculateEffective(string $userId): array
    {
        $user = User::find($userId);
        if (!$user) {
            return [];
        }

        // Master bypasses everything
        if ($user->role === 'master') {
            return $this->allGranted();
        }

        // Get role defaults
        $roleDefaults = $this->getRolePermissions($user->role);

        // Get user-specific overrides
        $override = UserPermissionOverride::where('user_id', $userId)->first();
        $overrides = $override ? ($override->overrides ?? []) : [];

        // Merge: role defaults + user overrides (overrides take precedence)
        return array_merge($roleDefaults, $overrides);
    }

    /**
     * Get permissions for a role.
     */
    public function getRolePermissions(string $role): array
    {
        if ($role === 'master') {
            return $this->allGranted();
        }

        $rp = RolePermission::where('role', $role)->first();
        return $rp ? ($rp->permissions ?? []) : [];
    }

    /**
     * Return all permissions as granted — derived from the PermissionRegistry.
     * Adding a permission to the registry automatically makes it included here.
     */
    public function allGranted(): array
    {
        return PermissionRegistry::allGranted();
    }

    /**
     * Sync a single user's effective permissions to users.permissions column.
     */
    public function syncUser(string $userId): void
    {
        $effective = $this->calculateEffective($userId);
        User::where('id', $userId)->update(['permissions' => json_encode($effective)]);
    }

    /**
     * Sync all users of a given role.
     */
    public function syncRole(string $role): void
    {
        $users = User::where('role', $role)->pluck('id');
        foreach ($users as $id) {
            $this->syncUser($id);
        }
    }

    /**
     * Sync ALL users.
     */
    public function syncAll(): void
    {
        $users = User::pluck('id');
        foreach ($users as $id) {
            $this->syncUser($id);
        }
    }
}
