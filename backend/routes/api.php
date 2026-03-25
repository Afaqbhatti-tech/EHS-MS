<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\RamsDocumentController;
use App\Http\Controllers\RamsWorkLineController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| EHS-OS API Routes
|--------------------------------------------------------------------------
| All routes are prefixed with /api automatically.
*/

// ─── Public / Info ──────────────────────────────

Route::get('/', fn () => response()->json([
    'message' => 'EHS-OS API v1.0',
    'modules' => [
        'dashboard', 'observations', 'permits', 'permit-amendments',
        'mockup-register', 'weekly-mom', 'manpower', 'training-matrix',
        'checklists', 'equipment', 'incidents', 'violations',
        'mock-drills', 'document-control', 'campaigns', 'poster-generator',
        'rams-board', 'kpis-reports', 'environmental', 'users-permissions', 'ai-intelligence',
    ],
]));

// ─── Auth (public) ──────────────────────────────

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/verify-setup-token/{token}', [AuthController::class, 'verifySetupToken']);
    Route::post('/setup-password', [AuthController::class, 'setupPassword']);
    Route::get('/dev/generate-setup-link', [AuthController::class, 'devGenerateSetupLink']);
});

// ─── Auth (authenticated) ───────────────────────

Route::middleware('auth.jwt')->group(function () {

    // Auth
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // ─── Dashboard ────────────────────────────────
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // ─── Notifications ─────────────────────────────
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
        Route::patch('/read-all', [NotificationController::class, 'markAllRead']);
        Route::patch('/{id}/read', [NotificationController::class, 'markRead']);
        Route::delete('/{id}', [NotificationController::class, 'destroy']);
    });

    // ─── Users ──────────────────────────────────
    Route::middleware('role:system_admin,ehs_manager,master')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::get('/users/role-defaults/{role}', [UserController::class, 'roleDefaults']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{id}', [UserController::class, 'update']);
        Route::post('/users/{id}/resend-setup', [UserController::class, 'resendSetup']);
    });

    // ─── Roles ──────────────────────────────────
    Route::prefix('roles')->group(function () {
        // Requires can_manage_roles permission
        Route::middleware('permission:can_manage_roles')->group(function () {
            Route::get('/', [RoleController::class, 'index']);
            Route::get('/permissions/all', [RoleController::class, 'allPermissions']);
            Route::get('/{role}/permissions', [RoleController::class, 'getPermissions']);
            Route::put('/{role}/permissions', [RoleController::class, 'updatePermissions']);
            Route::get('/{role}/users', [RoleController::class, 'getUsers']);
            Route::get('/user-overrides/{userId}', [RoleController::class, 'getUserOverrides']);
            Route::put('/user-overrides/{userId}', [RoleController::class, 'updateUserOverrides']);
        });

        // Dropdown (less restrictive - just needs auth)
        Route::get('/dropdown', [RoleController::class, 'dropdown']);

        // Master-only operations
        Route::middleware('role:master')->group(function () {
            Route::post('/', [RoleController::class, 'store']);
            Route::put('/{role}', [RoleController::class, 'update']);
            Route::delete('/{role}', [RoleController::class, 'destroy']);
        });
    });

    // ─── RAMs Board ──────────────────────────────
    Route::prefix('rams')->group(function () {
        Route::middleware('permission:can_access_rams')->group(function () {
            Route::get('/work-lines', [RamsWorkLineController::class, 'index']);
            Route::get('/work-lines/{slug}', [RamsWorkLineController::class, 'show']);
            Route::get('/documents', [RamsDocumentController::class, 'index']);
            Route::get('/documents/{id}', [RamsDocumentController::class, 'show']);
            Route::get('/stats', [RamsDocumentController::class, 'stats']);
            Route::get('/versions/{versionId}/download', [RamsDocumentController::class, 'download']);
        });

        Route::middleware('permission:can_upload_rams')->group(function () {
            Route::post('/documents', [RamsDocumentController::class, 'store']);
            Route::put('/documents/{id}', [RamsDocumentController::class, 'update']);
            Route::post('/documents/{id}/versions', [RamsDocumentController::class, 'uploadVersion']);
            Route::patch('/documents/{id}/status', [RamsDocumentController::class, 'updateStatus']);
        });

        Route::middleware('role:master')->group(function () {
            Route::post('/work-lines', [RamsWorkLineController::class, 'store']);
            Route::put('/work-lines/{slug}', [RamsWorkLineController::class, 'update']);
            Route::delete('/documents/{id}', [RamsDocumentController::class, 'destroy']);
        });
    });

    // ─── Reports ────────────────────────────────
    Route::prefix('reports')->group(function () {
        Route::middleware('permission:can_access_kpis_reports')->group(function () {
            Route::get('/data', [ReportController::class, 'data']);
        });
        Route::get('/contractors', [ReportController::class, 'contractors']);
    });
});
