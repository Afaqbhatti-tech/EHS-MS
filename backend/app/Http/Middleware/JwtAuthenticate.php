<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class JwtAuthenticate
{
    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('Authorization');
        $token = null;

        if ($header && str_starts_with($header, 'Bearer ')) {
            $token = substr($header, 7);
        }

        if (!$token) {
            return response()->json(['message' => 'Authentication required'], 401);
        }

        // Use Sanctum to find the token
        $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);

        if (!$accessToken) {
            return response()->json(['message' => 'Invalid or expired token'], 401);
        }

        // Check expiry
        if ($accessToken->expires_at && $accessToken->expires_at->isPast()) {
            $accessToken->delete();
            return response()->json(['message' => 'Token expired'], 401);
        }

        $user = $accessToken->tokenable;

        if (!$user || !$user->is_active) {
            return response()->json(['message' => 'Authentication required'], 401);
        }

        // Refresh permissions from DB
        $user->permissions = is_string($user->permissions)
            ? json_decode($user->permissions, true)
            : $user->permissions;

        $request->setUserResolver(fn () => $user);
        \Illuminate\Support\Facades\Auth::setUser($user);
        $accessToken->forceFill(['last_used_at' => now()])->save();

        return $next($request);
    }
}
