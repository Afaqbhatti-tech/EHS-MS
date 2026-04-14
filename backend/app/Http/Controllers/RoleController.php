<?php

namespace App\Http\Controllers;

use App\Constants\Permissions;
use App\Constants\PermissionRegistry;
use App\Models\PermissionAuditLog;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\User;
use App\Models\UserPermissionOverride;
use App\Services\PermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RoleController extends Controller
{
    public function __construct(
        private PermissionService $permissionService,
    ) {}

    /**
     * GET /api/roles
     */
    public function index(): JsonResponse
    {
        $roles = Role::where('is_active', true)->get();
        $allKeys = PermissionRegistry::allKeys();
        $totalPerms = count($allKeys);

        $result = $roles->map(function (Role $role) use ($totalPerms) {
            $rp = RolePermission::where('role', $role->slug)->first();
            $perms = $rp ? ($rp->permissions ?? []) : [];
            $grantedCount = count(array_filter($perms));
            $userCount = User::where('role', $role->slug)->count();

            return [
                'id' => $role->id,
                'role' => $role->slug,
                'slug' => $role->slug,
                'name' => $role->name,
                'label' => $role->name,
                'description' => $role->description,
                'isSystem' => $role->is_system,
                'isActive' => $role->is_active,
                'grantedCount' => $role->slug === 'master' ? $totalPerms : $grantedCount,
                'totalPermissions' => $totalPerms,
                'userCount' => $userCount,
            ];
        });

        return response()->json(['roles' => $result]);
    }

    /**
     * GET /api/roles/dropdown
     */
    public function dropdown(): JsonResponse
    {
        $roles = Role::where('is_active', true)
            ->select('slug', 'name')
            ->orderBy('name')
            ->get()
            ->map(fn ($r) => ['value' => $r->slug, 'label' => $r->name]);

        return response()->json(['roles' => $roles]);
    }

    /**
     * POST /api/roles
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'slug' => ['required', 'string', 'max:50', 'regex:/^[a-z][a-z0-9_]*$/'],
            'description' => 'nullable|string',
        ]);

        $slug = $request->input('slug');

        if (Role::where('slug', $slug)->exists()) {
            return response()->json(['message' => 'Role slug already exists'], 409);
        }

        $role = Role::create([
            'slug' => $slug,
            'name' => $request->input('name'),
            'description' => $request->input('description'),
            'is_system' => false,
            'is_active' => true,
        ]);

        // Create empty permission set (minimal defaults)
        RolePermission::create([
            'role' => $slug,
            'permissions' => [],
        ]);

        // Audit log
        $this->logAudit($request, null, 'role_created', $slug, [
            'name' => $role->name,
            'slug' => $slug,
        ]);

        return response()->json([
            'id' => $role->id,
            'slug' => $role->slug,
            'name' => $role->name,
            'description' => $role->description,
            'isSystem' => false,
        ], 201);
    }

    /**
     * PUT /api/roles/{role}
     */
    public function update(Request $request, string $roleSlug): JsonResponse
    {
        $role = Role::where('slug', $roleSlug)->first();
        if (!$role) {
            return response()->json(['message' => 'Role not found'], 404);
        }

        $data = [];
        if ($request->has('name')) {
            $data['name'] = $request->input('name');
        }
        if ($request->has('description')) {
            $data['description'] = $request->input('description');
        }

        // Handle slug change (only for non-system roles)
        $newSlug = $request->input('slug');
        if ($newSlug && $newSlug !== $roleSlug) {
            if ($role->is_system) {
                return response()->json(['message' => 'Cannot change slug of system roles'], 400);
            }
            if (Role::where('slug', $newSlug)->exists()) {
                return response()->json(['message' => 'Slug already exists'], 409);
            }

            $data['slug'] = $newSlug;

            // Cascade slug update within transaction for data consistency
            DB::transaction(function () use ($roleSlug, $newSlug) {
                User::where('role', $roleSlug)->update(['role' => $newSlug]);
                RolePermission::where('role', $roleSlug)->update(['role' => $newSlug]);
            });
        }

        $role->update($data);

        return response()->json([
            'id' => $role->id,
            'slug' => $role->slug,
            'name' => $role->name,
            'description' => $role->description,
            'isSystem' => $role->is_system,
        ]);
    }

    /**
     * DELETE /api/roles/{role}
     */
    public function destroy(Request $request, string $roleSlug): JsonResponse
    {
        $role = Role::where('slug', $roleSlug)->first();
        if (!$role) {
            return response()->json(['message' => 'Role not found'], 404);
        }

        if ($role->is_system) {
            return response()->json(['message' => 'Cannot delete system roles'], 400);
        }

        $userCount = User::where('role', $roleSlug)->count();
        $reassignTo = $request->input('reassignTo');

        if ($userCount > 0) {
            if (!$reassignTo) {
                return response()->json([
                    'message' => 'Role has users. Provide reassignTo parameter.',
                    'userCount' => $userCount,
                ], 400);
            }

            // Validate that the target role exists and is active
            $targetRole = Role::where('slug', $reassignTo)->where('is_active', true)->first();
            if (!$targetRole) {
                return response()->json([
                    'message' => 'Target role for reassignment does not exist or is inactive.',
                ], 400);
            }

            // Reassign users
            User::where('role', $roleSlug)->update(['role' => $reassignTo]);

            // Recalculate permissions for reassigned users
            $this->permissionService->syncRole($reassignTo);
        }

        // Delete role permissions and role
        RolePermission::where('role', $roleSlug)->delete();
        $role->delete();

        // Audit log
        $this->logAudit($request, null, 'role_deleted', $roleSlug, [
            'name' => $role->name,
            'reassignedTo' => $reassignTo,
            'usersReassigned' => $userCount,
        ]);

        return response()->json(['message' => 'Role deleted successfully']);
    }

    /**
     * GET /api/roles/permissions/all
     */
    public function allPermissions(): JsonResponse
    {
        return response()->json(Permissions::all());
    }

    /**
     * GET /api/roles/permissions/registry
     * Returns the full permission registry tree for the Access Management UI.
     */
    public function permissionRegistry(): JsonResponse
    {
        return response()->json([
            'registry' => PermissionRegistry::tree(),
            'allKeys' => PermissionRegistry::allKeys(),
        ]);
    }

    /**
     * GET /api/roles/{role}/permissions
     */
    public function getPermissions(string $roleSlug): JsonResponse
    {
        $perms = $this->permissionService->getRolePermissions($roleSlug);
        return response()->json(['permissions' => $perms]);
    }

    /**
     * PUT /api/roles/{role}/permissions
     */
    public function updatePermissions(Request $request, string $roleSlug): JsonResponse
    {
        if ($roleSlug === 'master') {
            return response()->json(['message' => 'Cannot modify master permissions'], 400);
        }

        $role = Role::where('slug', $roleSlug)->first();
        if (!$role) {
            return response()->json(['message' => 'Role not found'], 404);
        }

        $permissions = $request->input('permissions', []);

        // Get old permissions for audit diff
        $oldPerms = $this->permissionService->getRolePermissions($roleSlug);

        RolePermission::updateOrCreate(
            ['role' => $roleSlug],
            ['permissions' => $permissions],
        );

        // Recalculate all users with this role
        $this->permissionService->syncRole($roleSlug);

        // Build change diff for audit
        $changes = $this->buildPermissionDiff($oldPerms, $permissions);

        // Audit log
        $this->logAudit($request, null, 'role_permissions_updated', $roleSlug, $changes);

        return response()->json(['message' => 'Permissions updated', 'permissions' => $permissions]);
    }

    /**
     * GET /api/roles/{role}/users
     */
    public function getUsers(string $roleSlug): JsonResponse
    {
        $users = User::where('role', $roleSlug)
            ->select('id', 'email', 'full_name', 'is_active', 'last_login_at')
            ->get()
            ->map(function (User $u) {
                $hasOverrides = UserPermissionOverride::where('user_id', $u->id)->exists();
                return [
                    'id' => $u->id,
                    'email' => $u->email,
                    'name' => $u->full_name,
                    'isActive' => $u->is_active,
                    'lastLoginAt' => $u->last_login_at?->toISOString(),
                    'hasOverrides' => $hasOverrides,
                ];
            });

        return response()->json(['users' => $users]);
    }

    /**
     * GET /api/roles/user-overrides/{userId}
     */
    public function getUserOverrides(string $userId): JsonResponse
    {
        $user = User::find($userId);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $roleDefaults = $this->permissionService->getRolePermissions($user->role);

        $override = UserPermissionOverride::where('user_id', $userId)->first();
        $overrides = $override ? ($override->overrides ?? []) : [];

        $effective = $this->permissionService->calculateEffective($userId);

        return response()->json([
            'roleDefaults' => $roleDefaults,
            'overrides' => $overrides,
            'effective' => $effective,
        ]);
    }

    /**
     * PUT /api/roles/user-overrides/{userId}
     */
    public function updateUserOverrides(Request $request, string $userId): JsonResponse
    {
        $user = User::find($userId);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ($user->role === 'master') {
            return response()->json(['message' => 'Cannot override master permissions'], 400);
        }

        $overrides = $request->input('overrides', []);

        // Clean overrides: remove keys that match role defaults
        $roleDefaults = $this->permissionService->getRolePermissions($user->role);
        $cleaned = [];
        foreach ($overrides as $key => $value) {
            $defaultVal = $roleDefaults[$key] ?? false;
            if ((bool) $value !== (bool) $defaultVal) {
                $cleaned[$key] = (bool) $value;
            }
        }

        // Get old overrides for audit
        $oldOverride = UserPermissionOverride::where('user_id', $userId)->first();
        $oldOverrides = $oldOverride ? ($oldOverride->overrides ?? []) : [];

        if (empty($cleaned)) {
            UserPermissionOverride::where('user_id', $userId)->delete();
        } else {
            UserPermissionOverride::updateOrCreate(
                ['user_id' => $userId],
                ['overrides' => $cleaned],
            );
        }

        // Sync user permissions
        $this->permissionService->syncUser($userId);

        $effective = $this->permissionService->calculateEffective($userId);

        // Audit log
        $changes = $this->buildPermissionDiff($oldOverrides, $cleaned);
        $this->logAudit($request, $userId, 'user_overrides_updated', $user->role, $changes);

        return response()->json([
            'overrides' => $cleaned,
            'effective' => $effective,
        ]);
    }

    /**
     * GET /api/roles/audit-logs
     */
    public function auditLogs(Request $request): JsonResponse
    {
        $query = PermissionAuditLog::orderByDesc('created_at');

        if ($request->has('role')) {
            $query->where('target_role', $request->input('role'));
        }

        $logs = $query->limit(100)->get()->map(fn ($log) => [
            'id' => $log->id,
            'actorName' => $log->actor_name,
            'targetRole' => $log->target_role,
            'targetUserId' => $log->target_user_id,
            'action' => $log->action,
            'changes' => $log->changes,
            'notes' => $log->notes,
            'createdAt' => $log->created_at?->toISOString(),
        ]);

        return response()->json(['logs' => $logs]);
    }

    // ─── Private Helpers ──────────────────────────────

    private function logAudit(Request $request, ?string $targetUserId, string $action, ?string $targetRole, array $changes): void
    {
        $actor = $request->user();
        PermissionAuditLog::create([
            'actor_id' => $actor?->id,
            'actor_name' => $actor?->full_name ?? 'System',
            'target_role' => $targetRole,
            'target_user_id' => $targetUserId,
            'action' => $action,
            'changes' => $changes,
            'created_at' => now(),
        ]);
    }

    private function buildPermissionDiff(array $old, array $new): array
    {
        $enabled = [];
        $disabled = [];

        $allKeys = array_unique(array_merge(array_keys($old), array_keys($new)));
        foreach ($allKeys as $key) {
            $wasGranted = !empty($old[$key]);
            $isGranted = !empty($new[$key]);
            if (!$wasGranted && $isGranted) {
                $enabled[] = $key;
            } elseif ($wasGranted && !$isGranted) {
                $disabled[] = $key;
            }
        }

        return [
            'enabled' => $enabled,
            'disabled' => $disabled,
            'enabledCount' => count($enabled),
            'disabledCount' => count($disabled),
        ];
    }
}
