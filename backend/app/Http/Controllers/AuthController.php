<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\PermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function __construct(
        private PermissionService $permissionService,
    ) {}

    /**
     * POST /api/auth/login
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'identifier' => 'required|string',
            'password' => 'required|string',
        ]);

        $identifier = $request->input('identifier');
        $password = $request->input('password');

        // Find by email or username
        $user = User::where('email', $identifier)
            ->orWhere('username', $identifier)
            ->first();

        if (!$user || !$user->password_hash) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        if (!$user->is_active) {
            return response()->json(['message' => 'Account is deactivated'], 401);
        }

        if (!Hash::check($password, $user->password_hash)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        // Update last login
        $user->update(['last_login_at' => now()]);

        // Create Sanctum token (expires in 7 days)
        $token = $user->createToken('auth-token', ['*'], now()->addDays(7));

        return response()->json([
            'token' => $token->plainTextToken,
            'user' => $this->formatUser($user),
        ]);
    }

    /**
     * GET /api/auth/me
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => $this->formatUser($user),
        ]);
    }

    /**
     * GET /api/auth/verify-setup-token/{token}
     */
    public function verifySetupToken(string $token): JsonResponse
    {
        $user = User::where('setup_token', $token)->first();

        if (!$user) {
            return response()->json(['message' => 'Invalid setup token'], 404);
        }

        if ($user->setup_token_expires_at && $user->setup_token_expires_at->isPast()) {
            return response()->json(['message' => 'Setup token has expired'], 410);
        }

        return response()->json([
            'valid' => true,
            'email' => $user->email,
            'fullName' => $user->full_name,
        ]);
    }

    /**
     * POST /api/auth/setup-password
     */
    public function setupPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required|string',
            'password' => [
                'required',
                'string',
                'min:8',
                'regex:/[A-Z]/',
                'regex:/[a-z]/',
                'regex:/[0-9]/',
                'regex:/[^A-Za-z0-9]/',
            ],
        ]);

        $user = User::where('setup_token', $request->input('token'))->first();

        if (!$user) {
            return response()->json(['message' => 'Invalid setup token'], 404);
        }

        if ($user->setup_token_expires_at && $user->setup_token_expires_at->isPast()) {
            return response()->json(['message' => 'Setup token has expired'], 410);
        }

        // Set password and clear token
        $user->update([
            'password_hash' => Hash::make($request->input('password')),
            'setup_token' => null,
            'setup_token_expires_at' => null,
        ]);

        // Issue token
        $token = $user->createToken('auth-token', ['*'], now()->addDays(7));

        return response()->json([
            'message' => 'Password set successfully',
            'token' => $token->plainTextToken,
            'user' => $this->formatUser($user),
        ]);
    }

    /**
     * POST /api/auth/change-password
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => [
                'required',
                'string',
                'min:8',
                'regex:/[A-Z]/',
                'regex:/[a-z]/',
                'regex:/[0-9]/',
                'regex:/[^A-Za-z0-9]/',
                'different:current_password',
            ],
            'new_password_confirmation' => 'required|same:new_password',
        ], [
            'new_password.regex' => 'Password must contain uppercase, lowercase, number, and special character.',
            'new_password.different' => 'New password must be different from current password.',
        ]);

        $user = $request->user();

        if (!Hash::check($request->input('current_password'), $user->password_hash)) {
            return response()->json(['message' => 'Current password is incorrect.'], 422);
        }

        $user->update([
            'password_hash' => Hash::make($request->input('new_password')),
        ]);

        // Revoke all other tokens so other sessions are logged out
        $currentTokenId = $user->currentAccessToken()->id;
        $user->tokens()->where('id', '!=', $currentTokenId)->delete();

        return response()->json(['message' => 'Password changed successfully.']);
    }

    /**
     * POST /api/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        // Revoke current token
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    /**
     * GET /api/auth/dev/generate-setup-link (dev only)
     */
    public function devGenerateSetupLink(Request $request): JsonResponse
    {
        if (app()->environment('production')) {
            return response()->json(['message' => 'Not available in production'], 403);
        }

        $email = $request->query('email');
        if (!$email) {
            return response()->json(['message' => 'Email query param required'], 400);
        }

        $user = User::where('email', $email)->first();
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $token = Str::random(64);
        $user->update([
            'setup_token' => $token,
            'setup_token_expires_at' => now()->addHours(72),
        ]);

        $frontendUrl = config('app.frontend_url', 'http://localhost:5173');
        $setupUrl = "{$frontendUrl}/setup-password?token={$token}";

        return response()->json([
            'setupUrl' => $setupUrl,
            'token' => $token,
            'expiresAt' => now()->addHours(72)->toISOString(),
        ]);
    }

    private function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'email' => $user->email,
            'username' => $user->username,
            'fullName' => $user->full_name,
            'role' => $user->role,
            'contractor' => $user->contractor,
            'permissions' => $user->permissions ?? [],
            'isActive' => $user->is_active,
            'avatarUrl' => $user->avatar_url,
            'lastLoginAt' => $user->last_login_at?->toISOString(),
            'createdAt' => $user->created_at?->toISOString(),
            'updatedAt' => $user->updated_at?->toISOString(),
        ];
    }
}
