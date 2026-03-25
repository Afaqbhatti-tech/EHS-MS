<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use App\Services\PermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function __construct(
        private PermissionService $permissionService,
    ) {}

    /**
     * GET /api/users
     */
    public function index(): JsonResponse
    {
        $users = User::orderBy('created_at', 'desc')->get();

        $formatted = $users->map(fn (User $u) => [
            'id' => $u->id,
            'email' => $u->email,
            'username' => $u->username,
            'fullName' => $u->full_name,
            'role' => $u->role,
            'contractor' => $u->contractor,
            'permissions' => $u->permissions ?? [],
            'isActive' => $u->is_active,
            'hasPassword' => !empty($u->password_hash),
            'lastLoginAt' => $u->last_login_at?->toISOString(),
            'createdAt' => $u->created_at?->toISOString(),
            'updatedAt' => $u->updated_at?->toISOString(),
        ]);

        return response()->json($formatted);
    }

    /**
     * GET /api/users/role-defaults/{role}
     */
    public function roleDefaults(string $role): JsonResponse
    {
        $perms = $this->permissionService->getRolePermissions($role);
        return response()->json(['permissions' => $perms]);
    }

    /**
     * POST /api/users
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'fullName' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'role' => 'required|string',
            'contractor' => 'nullable|string|max:100',
        ]);

        // Verify role exists
        $roleExists = Role::where('slug', $request->input('role'))->where('is_active', true)->exists();
        if (!$roleExists && $request->input('role') !== 'master') {
            return response()->json(['message' => 'Invalid role'], 400);
        }

        $id = (string) Str::uuid();
        $setupToken = Str::random(64);
        $expiresAt = now()->addHours(72);

        // Calculate initial permissions from role
        $permissions = $this->permissionService->getRolePermissions($request->input('role'));

        $user = User::create([
            'id' => $id,
            'email' => $request->input('email'),
            'full_name' => $request->input('fullName'),
            'role' => $request->input('role'),
            'contractor' => $request->input('contractor'),
            'permissions' => $permissions,
            'setup_token' => $setupToken,
            'setup_token_expires_at' => $expiresAt,
        ]);

        $frontendUrl = config('app.frontend_url', 'http://localhost:5173');
        $setupUrl = "{$frontendUrl}/setup-password?token={$setupToken}";

        return response()->json([
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'fullName' => $user->full_name,
                'role' => $user->role,
            ],
            'setupUrl' => $setupUrl,
            'token' => $setupToken,
            'expiresAt' => $expiresAt->toISOString(),
        ], 201);
    }

    /**
     * PUT /api/users/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $data = [];

        if ($request->has('fullName')) {
            $data['full_name'] = $request->input('fullName');
        }
        if ($request->has('contractor')) {
            $data['contractor'] = $request->input('contractor');
        }
        if ($request->has('isActive')) {
            $data['is_active'] = (bool) $request->input('isActive');
        }

        $roleChanged = false;
        if ($request->has('role') && $request->input('role') !== $user->role) {
            $data['role'] = $request->input('role');
            $roleChanged = true;
        }

        $user->update($data);

        // If role changed or permissions provided, recalculate
        if ($roleChanged || $request->has('permissions')) {
            $this->permissionService->syncUser($user->id);
            $user->refresh();
        }

        return response()->json([
            'id' => $user->id,
            'email' => $user->email,
            'username' => $user->username,
            'fullName' => $user->full_name,
            'role' => $user->role,
            'contractor' => $user->contractor,
            'permissions' => $user->permissions ?? [],
            'isActive' => $user->is_active,
            'lastLoginAt' => $user->last_login_at?->toISOString(),
            'createdAt' => $user->created_at?->toISOString(),
            'updatedAt' => $user->updated_at?->toISOString(),
        ]);
    }

    /**
     * POST /api/users/{id}/resend-setup
     */
    public function resendSetup(string $id): JsonResponse
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ($user->password_hash) {
            return response()->json(['message' => 'User has already set their password'], 400);
        }

        $setupToken = Str::random(64);
        $expiresAt = now()->addHours(72);

        $user->update([
            'setup_token' => $setupToken,
            'setup_token_expires_at' => $expiresAt,
        ]);

        $frontendUrl = config('app.frontend_url', 'http://localhost:5173');
        $setupUrl = "{$frontendUrl}/setup-password?token={$setupToken}";

        return response()->json([
            'setupUrl' => $setupUrl,
            'token' => $setupToken,
            'expiresAt' => $expiresAt->toISOString(),
        ]);
    }
}
