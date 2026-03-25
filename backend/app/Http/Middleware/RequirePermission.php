<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequirePermission
{
    public function handle(Request $request, Closure $next, string $flag): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Authentication required'], 401);
        }

        // Master bypasses all permission checks
        if ($user->role === 'master') {
            return $next($request);
        }

        $perms = $user->permissions ?? [];
        if (empty($perms[$flag])) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        return $next($request);
    }
}
