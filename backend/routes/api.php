<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ObservationController;
use App\Http\Controllers\PermitController;
use App\Http\Controllers\RamsDocumentController;
use App\Http\Controllers\RamsWorkLineController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ChecklistController;
use App\Http\Controllers\MockupController;
use App\Http\Controllers\TrainingController;
use App\Http\Controllers\TrackerController;
use App\Http\Controllers\MomController;
use App\Http\Controllers\WorkerController;
use App\Http\Controllers\WorkerHoursController;
use App\Http\Controllers\RecycleBinController;
use App\Http\Controllers\DocumentImportController;
use App\Http\Controllers\ImportReconciliationController;
use App\Http\Controllers\EquipmentRegisterController;
use App\Http\Controllers\EquipmentGroupController;
use App\Http\Controllers\ViolationController;
use App\Http\Controllers\IncidentController;
use App\Http\Controllers\ErpController;
use App\Http\Controllers\MockDrillController;
use App\Http\Controllers\PermitAmendmentController;
use App\Http\Controllers\CampaignController;
use App\Http\Controllers\PosterController;
use App\Http\Controllers\AiController;
use App\Http\Controllers\ContractorController;
use App\Http\Controllers\DocumentControlController;
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
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
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
        Route::put('/users/{id}/reset-password', [UserController::class, 'resetPassword']);
    });

    // ─── Roles ──────────────────────────────────
    Route::prefix('roles')->group(function () {
        // Requires can_manage_roles permission
        Route::middleware('permission:can_manage_roles')->group(function () {
            Route::get('/', [RoleController::class, 'index']);
            Route::get('/permissions/all', [RoleController::class, 'allPermissions']);
            Route::get('/permissions/registry', [RoleController::class, 'permissionRegistry']);
            Route::get('/audit-logs', [RoleController::class, 'auditLogs']);
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
            Route::get('/work-lines/phases', [RamsWorkLineController::class, 'phases']);
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
            Route::delete('/work-lines/{slug}', [RamsWorkLineController::class, 'destroy']);
            Route::post('/work-lines/reorder', [RamsWorkLineController::class, 'reorder']);
            Route::delete('/documents/{id}', [RamsDocumentController::class, 'destroy']);
        });
    });

    // ─── Permits ─────────────────────────────────────
    Route::prefix('permits')->group(function () {
        Route::get('/types', [PermitController::class, 'types']);
        Route::get('/stats', [PermitController::class, 'stats']);
        Route::get('/calendar', [PermitController::class, 'calendar']);
        Route::get('/export', [PermitController::class, 'export']);
        Route::get('/filters/options', [PermitController::class, 'filterOptions']);
        Route::post('/upload', [PermitController::class, 'upload']);
        Route::get('/', [PermitController::class, 'index']);
        Route::get('/{id}', [PermitController::class, 'show']);
        Route::post('/', [PermitController::class, 'store']);
        Route::put('/{id}', [PermitController::class, 'update']);
        Route::patch('/{id}/status', [PermitController::class, 'updateStatus']);
        Route::delete('/{id}', [PermitController::class, 'destroy']);
    });

    // ─── Permit Amendments ─────────────────────────
    Route::prefix('permit-amendments')->group(function () {
        Route::get('/stats', [PermitAmendmentController::class, 'stats']);
        Route::get('/export', [PermitAmendmentController::class, 'export']);
        Route::get('/permit/{permit}/history', [PermitAmendmentController::class, 'permitHistory']);
        Route::get('/', [PermitAmendmentController::class, 'index']);
        Route::post('/', [PermitAmendmentController::class, 'store']);
        Route::get('/{id}', [PermitAmendmentController::class, 'show']);
        Route::put('/{id}', [PermitAmendmentController::class, 'update']);
        Route::delete('/{id}', [PermitAmendmentController::class, 'destroy']);

        // Workflow actions
        Route::post('/{id}/submit', [PermitAmendmentController::class, 'submitForReview']);
        Route::post('/{id}/approve', [PermitAmendmentController::class, 'approve']);
        Route::post('/{id}/reject', [PermitAmendmentController::class, 'reject']);
        Route::post('/{id}/approve-with-comments', [PermitAmendmentController::class, 'approveWithComments']);
        Route::post('/{id}/mark-under-review', [PermitAmendmentController::class, 'markUnderReview']);
        Route::post('/{id}/cancel', [PermitAmendmentController::class, 'cancel']);

        // Change rows
        Route::post('/{id}/changes', [PermitAmendmentController::class, 'addChange']);
        Route::put('/{id}/changes/{changeId}', [PermitAmendmentController::class, 'updateChange']);
        Route::delete('/{id}/changes/{changeId}', [PermitAmendmentController::class, 'deleteChange']);

        // Attachments
        Route::post('/{id}/attachments', [PermitAmendmentController::class, 'uploadAttachment']);
        Route::delete('/{id}/attachments/{attachmentId}', [PermitAmendmentController::class, 'removeAttachment']);
    });

    // ─── Observations ──────────────────────────────
    Route::prefix('observations')->group(function () {
        Route::get('/stats', [ObservationController::class, 'stats']);
        Route::get('/export', [ObservationController::class, 'export']);
        Route::get('/filters/options', [ObservationController::class, 'filterOptions']);
        Route::post('/upload', [ObservationController::class, 'upload']);
        Route::get('/', [ObservationController::class, 'index']);
        Route::get('/{id}', [ObservationController::class, 'show']);
        Route::post('/', [ObservationController::class, 'store']);
        Route::put('/{id}', [ObservationController::class, 'update']);
        Route::patch('/{id}/status', [ObservationController::class, 'updateStatus']);
        Route::delete('/{id}', [ObservationController::class, 'destroy']);
    });

    // ─── Workers / Manpower ────────────────────────────
    Route::prefix('workers')->group(function () {
        Route::get('/stats', [WorkerController::class, 'stats']);
        Route::get('/export', [WorkerController::class, 'export']);
        Route::get('/filters/options', [WorkerController::class, 'filterOptions']);
        Route::get('/legacy-review', [WorkerController::class, 'legacyReviewCandidates']);
        Route::post('/{id}/migrate-iqama', [WorkerController::class, 'migrateIqama']);
        Route::get('/', [WorkerController::class, 'index']);
        Route::get('/{id}', [WorkerController::class, 'show']);
        Route::post('/', [WorkerController::class, 'store']);
        Route::put('/{id}', [WorkerController::class, 'update']);
        Route::delete('/{id}', [WorkerController::class, 'destroy']);

        // Worker Hours (nested)
        Route::get('/{workerId}/hours', [WorkerHoursController::class, 'index']);
        Route::post('/{workerId}/hours', [WorkerHoursController::class, 'store']);
        Route::put('/{workerId}/hours/{recordId}', [WorkerHoursController::class, 'update']);
        Route::delete('/{workerId}/hours/{recordId}', [WorkerHoursController::class, 'destroy']);
    });

    // Bulk hours entry & summary
    Route::post('/worker-hours/bulk', [WorkerHoursController::class, 'bulkStore']);
    Route::get('/worker-hours/summary', [WorkerHoursController::class, 'summary']);

    // ─── Checklists ────────────────────────────────
    Route::prefix('checklists')->group(function () {
        Route::get('/categories', [ChecklistController::class, 'categories']);

        // Category management (master/admin only)
        Route::middleware('role:master,system_admin,ehs_manager')->group(function () {
            Route::post('/categories', [ChecklistController::class, 'storeCategory']);
            Route::put('/categories/{id}', [ChecklistController::class, 'updateCategory']);
            Route::delete('/categories/{id}', [ChecklistController::class, 'deleteCategory']);
        });
        Route::get('/stats', [ChecklistController::class, 'stats']);
        Route::get('/alerts', [ChecklistController::class, 'alerts']);
        Route::get('/export', [ChecklistController::class, 'export']);
        Route::get('/filters/options', [ChecklistController::class, 'filterOptions']);
        Route::get('/equipment-template', [ChecklistController::class, 'equipmentChecklistTemplate']);
        Route::get('/safety-equipment/stats', [ChecklistController::class, 'safetyEquipmentStats']);
        Route::post('/upload', [ChecklistController::class, 'upload']);

        // MEWP specific
        Route::get('/mewp/types', [ChecklistController::class, 'mewpTypes']);
        Route::get('/mewp/stats', [ChecklistController::class, 'mewpStats']);
        Route::get('/mewp/checklist-template', [ChecklistController::class, 'mewpChecklistTemplate']);

        Route::get('/items', [ChecklistController::class, 'index']);
        Route::get('/items/{id}', [ChecklistController::class, 'show']);
        Route::post('/items', [ChecklistController::class, 'store']);
        Route::put('/items/{id}', [ChecklistController::class, 'update']);
        Route::patch('/items/{id}/status', [ChecklistController::class, 'updateStatus']);
        Route::patch('/items/{id}/close-defect', [ChecklistController::class, 'closeDefect']);
        Route::delete('/items/{id}', [ChecklistController::class, 'destroy']);
        Route::get('/items/{id}/inspections', [ChecklistController::class, 'inspections']);
        Route::post('/items/{id}/inspections', [ChecklistController::class, 'recordInspection']);
        Route::post('/items/{id}/structured-inspection', [ChecklistController::class, 'recordStructuredInspection']);
        Route::post('/items/{id}/mewp-preuse', [ChecklistController::class, 'recordMewpPreUse']);
    });

    // ─── Training Matrix ─────────────────────────
    Route::prefix('training')->group(function () {
        // Module-level access gate
        Route::middleware('permission:can_access_training')->group(function () {
            // Read endpoints — accessible with module access
            Route::get('/topics', [TrainingController::class, 'topics']);
            Route::get('/search-workers', [TrainingController::class, 'searchWorkers']);
            Route::get('/stats', [TrainingController::class, 'stats']);
            Route::get('/filters/options', [TrainingController::class, 'filterOptions']);
            Route::get('/records', [TrainingController::class, 'index']);
            Route::get('/records/{id}', [TrainingController::class, 'show']);
            Route::get('/requirements', [TrainingController::class, 'requirements']);
            Route::post('/check-duplicate', [TrainingController::class, 'checkDuplicate']);
            Route::post('/refresh-statuses', [TrainingController::class, 'refreshStatuses']);

            // Worker detail — gated by data visibility permission
            Route::middleware('permission:data_training_worker_details')->group(function () {
                Route::get('/worker/{workerId}/summary', [TrainingController::class, 'workerSummary']);
            });

            // Compliance matrix — gated by section permission
            Route::middleware('permission:section_training_compliance')->group(function () {
                Route::get('/compliance-matrix', [TrainingController::class, 'complianceMatrix']);
            });

            // Audit logs — gated by section permission
            Route::middleware('permission:section_training_audit_logs')->group(function () {
                Route::get('/audit-logs', [TrainingController::class, 'auditLogs']);
            });

            // Export — requires export permission
            Route::middleware('permission:can_export_training')->group(function () {
                Route::get('/export', [TrainingController::class, 'export']);
            });

            // Create training records
            Route::middleware('permission:can_create_training')->group(function () {
                Route::post('/records', [TrainingController::class, 'store']);
            });

            // Edit training records + certificate management
            Route::middleware('permission:can_edit_training')->group(function () {
                Route::put('/records/{id}', [TrainingController::class, 'update']);
                Route::post('/records/{id}/certificate', [TrainingController::class, 'uploadCertificate']);
                Route::delete('/records/{id}/certificate', [TrainingController::class, 'removeCertificate']);
            });

            // Delete training records
            Route::middleware('permission:can_delete_training')->group(function () {
                Route::delete('/records/{id}', [TrainingController::class, 'destroy']);
            });

            // Bulk assign
            Route::middleware('permission:can_bulk_assign_training')->group(function () {
                Route::post('/bulk-assign', [TrainingController::class, 'bulkAssign']);
                Route::post('/bulk-preview', [TrainingController::class, 'bulkPreview']);
            });

            // Trade requirements management
            Route::middleware('permission:can_manage_training_requirements')->group(function () {
                Route::post('/requirements', [TrainingController::class, 'storeRequirement']);
                Route::delete('/requirements/{id}', [TrainingController::class, 'destroyRequirement']);
            });
        });
    });

    // ─── Equipment Tracker ──────────────────────────
    // All routes require can_access_equipment (module access gate)
    Route::prefix('tracker')->middleware('permission:can_access_equipment')->group(function () {
        // Categories (read)
        Route::get('categories', [TrackerController::class, 'categories']);
        Route::get('categories/groups', [TrackerController::class, 'groups']);

        // Category management
        Route::middleware('permission:can_manage_equipment_categories')->group(function () {
            Route::post('categories', [TrackerController::class, 'storeCategory']);
            Route::put('categories/rename-group', [TrackerController::class, 'renameGroup']);
            Route::put('categories/{id}', [TrackerController::class, 'updateCategory']);
            Route::delete('categories/{id}', [TrackerController::class, 'deleteCategory']);
        });

        // Stats & Alerts (read)
        Route::get('stats', [TrackerController::class, 'stats']);
        Route::get('alerts', [TrackerController::class, 'alerts']);

        // Export
        Route::middleware('permission:can_export_equipment')->group(function () {
            Route::get('export', [TrackerController::class, 'export']);
        });

        // Import
        Route::middleware('permission:can_import_equipment')->group(function () {
            Route::get('import-template', [TrackerController::class, 'importTemplate']);
            Route::post('import', [TrackerController::class, 'bulkImport']);
            Route::get('import-logs', [TrackerController::class, 'importLogs']);
        });

        // Global Inspection Routes (read)
        Route::get('inspections/stats', [TrackerController::class, 'inspectionStats']);
        // Inspection export (must be defined before inspections/{log})
        Route::middleware('permission:can_export_equipment')->group(function () {
            Route::get('inspections/export', [TrackerController::class, 'exportInspections']);
        });
        Route::get('inspections', [TrackerController::class, 'allInspections']);
        Route::get('inspection/search-items', [TrackerController::class, 'searchItems']);
        Route::get('inspections/{log}', [TrackerController::class, 'showInspection']);

        // Inspection write operations
        Route::middleware('permission:can_inspect_equipment')->group(function () {
            Route::put('inspections/{log}', [TrackerController::class, 'updateInspection']);
            Route::delete('inspections/{log}', [TrackerController::class, 'destroyInspection']);
        });

        // Records (read)
        Route::get('records', [TrackerController::class, 'index']);
        Route::get('records/{record}', [TrackerController::class, 'show']);

        // Records (write — create, update, delete)
        Route::middleware('permission:can_manage_equipment_items')->group(function () {
            Route::post('records', [TrackerController::class, 'store']);
            Route::post('records/{record}', [TrackerController::class, 'update']);
            Route::delete('records/{record}', [TrackerController::class, 'destroy']);
        });

        // Inspection Logs per-record (read)
        Route::get('records/{record}/inspections', [TrackerController::class, 'inspectionLogs']);

        // Inspection Logs per-record (write)
        Route::middleware('permission:can_inspect_equipment')->group(function () {
            Route::post('records/{record}/inspections', [TrackerController::class, 'recordInspectionEnhanced']);
        });

        // Checklist integration (read)
        Route::get('records/{record}/checklist-matches', [TrackerController::class, 'findChecklistMatches']);

        // Checklist integration (write)
        Route::middleware('permission:can_inspect_equipment')->group(function () {
            Route::post('records/{record}/link-checklist', [TrackerController::class, 'linkChecklist']);
            Route::post('records/{record}/save-checklist', [TrackerController::class, 'saveChecklist']);
        });

        // Refresh due status (system maintenance)
        Route::post('refresh-due-status', [TrackerController::class, 'refreshDueStatus']);

        // ── Equipment Groups (Dynamic System) ─────────
        Route::prefix('equipment-groups')->group(function () {
            // All items (Total Item Register — read-only)
            Route::get('all-items', [EquipmentGroupController::class, 'allItems']);

            // Registry Groups (read)
            Route::get('registry', [EquipmentGroupController::class, 'registryIndex']);
            Route::get('registry/stats', [EquipmentGroupController::class, 'registryStats']);
            Route::get('registry/{id}', [EquipmentGroupController::class, 'registryShow']);
            Route::get('registry/{id}/categories', [EquipmentGroupController::class, 'categoryIndex']);

            // Registry Groups (management)
            Route::middleware('permission:can_manage_equipment_categories')->group(function () {
                Route::post('registry', [EquipmentGroupController::class, 'registryStore']);
                Route::put('registry/{id}', [EquipmentGroupController::class, 'registryUpdate']);
                Route::delete('registry/{id}', [EquipmentGroupController::class, 'registryDestroy']);
                Route::put('registry/{id}/fields', [EquipmentGroupController::class, 'registrySyncFields']);

                // Categories under a registry group
                Route::post('registry/{id}/categories', [EquipmentGroupController::class, 'categoryStore']);
                Route::put('categories/{id}', [EquipmentGroupController::class, 'categoryUpdate']);
                Route::delete('categories/{id}', [EquipmentGroupController::class, 'categoryDestroy']);
            });

            // Import (equipment groups)
            Route::middleware('permission:can_import_equipment')->group(function () {
                Route::post('import/preview', [EquipmentGroupController::class, 'importPreview']);
                Route::post('import/confirm', [EquipmentGroupController::class, 'importConfirm']);
            });

            // Export (equipment groups)
            Route::middleware('permission:can_export_equipment')->group(function () {
                Route::get('export', [EquipmentGroupController::class, 'exportItems']);
            });

            // Legacy category-level routes (read)
            Route::get('/', [EquipmentGroupController::class, 'index']);
            Route::get('master-fields', [EquipmentGroupController::class, 'masterFieldList']);
            Route::get('{id}', [EquipmentGroupController::class, 'show']);

            // Legacy management
            Route::middleware('permission:can_manage_equipment_categories')->group(function () {
                Route::post('/', [EquipmentGroupController::class, 'store']);
                Route::put('{id}', [EquipmentGroupController::class, 'update']);
                Route::delete('{id}', [EquipmentGroupController::class, 'destroy']);

                // Fields management
                Route::post('{id}/fields', [EquipmentGroupController::class, 'addFields']);
                Route::put('{id}/fields', [EquipmentGroupController::class, 'syncFields']);
                Route::delete('{groupId}/fields/{fieldId}', [EquipmentGroupController::class, 'removeField']);
            });

            // Items (read)
            Route::get('{id}/items', [EquipmentGroupController::class, 'items']);
            Route::get('{groupId}/items/{itemId}', [EquipmentGroupController::class, 'showItem']);

            // Items (write — create, update, delete, upload)
            Route::middleware('permission:can_manage_equipment_items')->group(function () {
                Route::post('{id}/items', [EquipmentGroupController::class, 'storeItem']);
                Route::put('{groupId}/items/{itemId}', [EquipmentGroupController::class, 'updateItem']);
                Route::delete('{groupId}/items/{itemId}', [EquipmentGroupController::class, 'destroyItem']);
                Route::post('{groupId}/items/{itemId}/upload', [EquipmentGroupController::class, 'uploadItemFile']);
            });
        });
    });

    // ─── Mock-Up Register ────────────────────────
    Route::prefix('mockups')->group(function () {
        Route::get('/stats', [MockupController::class, 'stats']);
        Route::get('/export', [MockupController::class, 'export']);
        Route::get('/filters/options', [MockupController::class, 'filterOptions']);
        Route::post('/upload', [MockupController::class, 'upload']);

        // Import
        Route::post('/import', [MockupController::class, 'importMockups']);
        Route::get('/import/template', [MockupController::class, 'importTemplate']);
        Route::get('/import/history', [MockupController::class, 'importHistory']);
        Route::get('/', [MockupController::class, 'index']);
        Route::get('/{id}', [MockupController::class, 'show']);
        Route::post('/', [MockupController::class, 'store']);
        Route::put('/{id}', [MockupController::class, 'update']);
        Route::delete('/{id}', [MockupController::class, 'destroy']);

        // Workflow actions
        Route::post('/{id}/submit', [MockupController::class, 'submitForReview']);
        Route::post('/{id}/approve', [MockupController::class, 'approve']);
        Route::post('/{id}/reject', [MockupController::class, 'reject']);
        Route::post('/{id}/approve-with-comments', [MockupController::class, 'approveWithComments']);
        Route::post('/{id}/resubmit', [MockupController::class, 'reSubmit']);
        Route::post('/{id}/revision', [MockupController::class, 'createRevision']);
        Route::get('/{id}/revisions', [MockupController::class, 'revisionHistory']);

        // Comments
        Route::post('/{id}/comments', [MockupController::class, 'addComment']);
        Route::post('/{id}/comments/{commentId}/resolve', [MockupController::class, 'resolveComment']);

        // Photos (legacy)
        Route::post('/{id}/photos', [MockupController::class, 'uploadPhotos']);
        Route::delete('/{id}/photos', [MockupController::class, 'deletePhoto']);

        // Typed attachments
        Route::post('/{id}/attachments', [MockupController::class, 'uploadAttachments']);
        Route::delete('/{id}/attachments/{attachmentId}', [MockupController::class, 'deleteAttachment']);
    });

    // ─── Weekly MOM ─────────────────────────────
    Route::prefix('mom')->group(function () {
        Route::get('/stats', [MomController::class, 'stats']);
        Route::get('/export', [MomController::class, 'export']);
        Route::get('/points/search', [MomController::class, 'searchPoints']);
        Route::post('/upload', [MomController::class, 'upload']);
        Route::post('/analyze-document', [MomController::class, 'analyzeDocument']);
        Route::post('/parse-document', [MomController::class, 'parseDocument']);
        Route::post('/import', [MomController::class, 'importDocument']);
        Route::post('/import/confirm', [MomController::class, 'confirmImport']);
        Route::get('/', [MomController::class, 'index']);
        Route::post('/', [MomController::class, 'store']);
        Route::get('/{id}', [MomController::class, 'show']);
        Route::put('/{id}', [MomController::class, 'update']);
        Route::delete('/{id}', [MomController::class, 'destroy']);
        Route::post('/{id}/carry-forward', [MomController::class, 'carryForward']);
        Route::post('/{id}/points', [MomController::class, 'addPoint']);
        Route::put('/{id}/points/{pointId}', [MomController::class, 'updatePoint']);
        Route::delete('/{id}/points/{pointId}', [MomController::class, 'deletePoint']);
        Route::get('/{id}/points/{pointId}/photos', [MomController::class, 'getPointPhotos']);
        Route::post('/{id}/points/{pointId}/photos', [MomController::class, 'uploadPointPhoto']);
        Route::delete('/{id}/points/{pointId}/photos/{photoId}', [MomController::class, 'deletePointPhoto']);
    });

    // ─── Violations ────────────────────────────────
    Route::prefix('violations')->group(function () {
        Route::get('/stats', [ViolationController::class, 'stats']);
        Route::get('/export', [ViolationController::class, 'export']);
        Route::get('/filters/options', [ViolationController::class, 'filterOptions']);
        Route::post('/upload', [ViolationController::class, 'upload']);
        Route::get('/', [ViolationController::class, 'index']);
        Route::get('/{id}', [ViolationController::class, 'show']);
        Route::post('/', [ViolationController::class, 'store']);
        Route::put('/{id}', [ViolationController::class, 'update']);
        Route::patch('/{id}/status', [ViolationController::class, 'updateStatus']);
        Route::post('/{id}/assign', [ViolationController::class, 'assign']);
        Route::post('/{id}/investigation', [ViolationController::class, 'addInvestigation']);
        Route::post('/{id}/actions', [ViolationController::class, 'addAction']);
        Route::put('/{id}/actions/{actionId}', [ViolationController::class, 'updateAction']);
        Route::delete('/{id}/actions/{actionId}', [ViolationController::class, 'deleteAction']);
        Route::post('/{id}/evidence', [ViolationController::class, 'uploadEvidence']);
        Route::delete('/{id}/evidence/{evidenceId}', [ViolationController::class, 'deleteEvidence']);
        Route::delete('/{id}', [ViolationController::class, 'destroy']);
    });

    // ─── Incidents ─────────────────────────────────
    Route::prefix('incidents')->group(function () {
        Route::get('/stats', [IncidentController::class, 'stats']);
        Route::get('/export', [IncidentController::class, 'export']);
        Route::get('/filters/options', [IncidentController::class, 'filterOptions']);
        Route::post('/upload', [IncidentController::class, 'upload']);
        Route::get('/', [IncidentController::class, 'index']);
        Route::get('/{id}', [IncidentController::class, 'show']);
        Route::post('/', [IncidentController::class, 'store']);
        Route::put('/{id}', [IncidentController::class, 'update']);
        Route::patch('/{id}/status', [IncidentController::class, 'updateStatus']);
        Route::post('/{id}/assign', [IncidentController::class, 'assign']);
        Route::post('/{id}/investigation', [IncidentController::class, 'addInvestigation']);
        Route::post('/{id}/actions', [IncidentController::class, 'addAction']);
        Route::put('/{id}/actions/{actionId}', [IncidentController::class, 'updateAction']);
        Route::delete('/{id}/actions/{actionId}', [IncidentController::class, 'deleteAction']);
        Route::post('/{id}/evidence', [IncidentController::class, 'uploadEvidence']);
        Route::delete('/{id}/evidence/{evidenceId}', [IncidentController::class, 'deleteEvidence']);
        Route::delete('/{id}', [IncidentController::class, 'destroy']);
    });

    // ─── Equipment Register ─────────────────────
    Route::prefix('equipment-register')->middleware('permission:can_access_equipment')->group(function () {
        // Read
        Route::get('/stats', [EquipmentRegisterController::class, 'stats']);
        Route::get('/filter-options', [EquipmentRegisterController::class, 'filterOptions']);

        // Export (must be before /{equipment} to avoid parameter match)
        Route::middleware('permission:can_export_equipment')->group(function () {
            Route::get('/export', [EquipmentRegisterController::class, 'export']);
        });

        Route::get('/', [EquipmentRegisterController::class, 'index']);
        Route::get('/{equipment}', [EquipmentRegisterController::class, 'show']);

        // Write — create, update, delete
        Route::middleware('permission:can_manage_equipment_items')->group(function () {
            Route::post('/', [EquipmentRegisterController::class, 'store']);
            Route::post('/{equipment}', [EquipmentRegisterController::class, 'update']);
            Route::delete('/{equipment}', [EquipmentRegisterController::class, 'destroy']);
        });
    });

    // ─── Document Import ───────────────────────
    Route::prefix('imports')->middleware('permission:can_import_documents')->group(function () {
        Route::get('/supported-types', [DocumentImportController::class, 'supportedTypes']);
        Route::post('/upload', [DocumentImportController::class, 'upload']);
        Route::get('/', [DocumentImportController::class, 'index']);
        Route::get('/{id}', [DocumentImportController::class, 'show']);
        Route::get('/{id}/preview', [DocumentImportController::class, 'preview']);
        Route::post('/{id}/confirm', [DocumentImportController::class, 'confirm']);
        Route::delete('/{id}', [DocumentImportController::class, 'destroy']);
    });

    // ─── Import Reconciliation ──────────────────
    Route::prefix('reconcile-import')->group(function () {
        Route::get('/modules', [ImportReconciliationController::class, 'modules']);
        Route::get('/history', [ImportReconciliationController::class, 'history']);
        Route::post('/{module}', [ImportReconciliationController::class, 'upload']);
        Route::get('/{batch}/preview', [ImportReconciliationController::class, 'preview']);
        Route::post('/{batch}/confirm', [ImportReconciliationController::class, 'confirm']);
        Route::post('/{batch}/cancel', [ImportReconciliationController::class, 'cancel']);
    });

    // ─── Recycle Bin ────────────────────────────
    Route::prefix('recycle-bin')->middleware('role:master,system_admin,ehs_manager')->group(function () {
        Route::get('/', [RecycleBinController::class, 'index']);
        Route::get('/count', [RecycleBinController::class, 'count']);
        Route::get('/types', [RecycleBinController::class, 'types']);
        Route::get('/modules', [RecycleBinController::class, 'modules']);
        Route::get('/logs', [RecycleBinController::class, 'logs']);
        Route::post('/restore', [RecycleBinController::class, 'restore']);
        Route::post('/force-delete', [RecycleBinController::class, 'forceDelete']);
    });

    // ─── Reports ────────────────────────────────
    Route::prefix('reports')->group(function () {
        Route::middleware('permission:can_access_kpis_reports')->group(function () {
            Route::get('/data', [ReportController::class, 'data']);
        });
        Route::get('/contractors', [ReportController::class, 'contractors']);
    });

    // ─── ERP Routes ───────────────────────────────
    Route::get('erps/stats', [ErpController::class, 'stats']);
    Route::get('erps/export', [ErpController::class, 'export']);
    Route::get('erps', [ErpController::class, 'index']);
    Route::post('erps', [ErpController::class, 'store']);
    Route::get('erps/{erp}', [ErpController::class, 'show']);
    Route::put('erps/{erp}', [ErpController::class, 'update']);
    Route::delete('erps/{erp}', [ErpController::class, 'destroy']);
    Route::post('erps/{erp}/approve', [ErpController::class, 'approve']);

    // ─── Mock Drill Routes ────────────────────────
    Route::get('drills/stats', [MockDrillController::class, 'stats']);
    Route::get('drills/planner', [MockDrillController::class, 'planner']);
    Route::get('drills/export', [MockDrillController::class, 'export']);
    Route::get('drills', [MockDrillController::class, 'index']);
    Route::post('drills', [MockDrillController::class, 'store']);
    Route::get('drills/{drill}', [MockDrillController::class, 'show']);
    Route::put('drills/{drill}', [MockDrillController::class, 'update']);
    Route::delete('drills/{drill}', [MockDrillController::class, 'destroy']);

    // Drill Workflow
    Route::post('drills/{drill}/conduct', [MockDrillController::class, 'conductDrill']);
    Route::post('drills/{drill}/close', [MockDrillController::class, 'closeDrill']);
    Route::post('drills/{drill}/cancel', [MockDrillController::class, 'cancelDrill']);

    // Drill Participants
    Route::post('drills/{drill}/participants', [MockDrillController::class, 'addParticipant']);
    Route::post('drills/{drill}/participants/bulk', [MockDrillController::class, 'bulkAddParticipants']);
    Route::put('drills/{drill}/participants/{participant}', [MockDrillController::class, 'updateParticipant']);
    Route::delete('drills/{drill}/participants/{participant}', [MockDrillController::class, 'removeParticipant']);

    // Drill Resources
    Route::post('drills/{drill}/resources', [MockDrillController::class, 'addResource']);
    Route::put('drills/{drill}/resources/{resource}', [MockDrillController::class, 'updateResource']);
    Route::delete('drills/{drill}/resources/{resource}', [MockDrillController::class, 'removeResource']);

    // Drill Observations
    Route::post('drills/{drill}/observations', [MockDrillController::class, 'addObservation']);
    Route::put('drills/{drill}/observations/{obs}', [MockDrillController::class, 'updateObservation']);
    Route::delete('drills/{drill}/observations/{obs}', [MockDrillController::class, 'deleteObservation']);

    // Drill Actions
    Route::post('drills/{drill}/actions', [MockDrillController::class, 'addAction']);
    Route::put('drills/{drill}/actions/{action}', [MockDrillController::class, 'updateAction']);

    // Drill Evaluation
    Route::post('drills/{drill}/evaluation', [MockDrillController::class, 'saveEvaluation']);

    // Drill Evidence
    Route::post('drills/{drill}/evidence', [MockDrillController::class, 'uploadEvidence']);

    // ─── Campaign Routes ─────────────────────────────
    Route::get('campaigns/stats', [CampaignController::class, 'stats']);
    Route::get('campaigns/export', [CampaignController::class, 'export']);
    Route::get('campaigns', [CampaignController::class, 'index']);
    Route::post('campaigns', [CampaignController::class, 'store']);
    Route::get('campaigns/{campaign}', [CampaignController::class, 'show']);
    Route::put('campaigns/{campaign}', [CampaignController::class, 'update']);
    Route::delete('campaigns/{campaign}', [CampaignController::class, 'destroy']);

    // Campaign Status
    Route::post('campaigns/{campaign}/status', [CampaignController::class, 'changeStatus']);

    // Campaign Activities
    Route::post('campaigns/{campaign}/activities', [CampaignController::class, 'addActivity']);
    Route::put('campaigns/{campaign}/activities/{activity}', [CampaignController::class, 'updateActivity']);
    Route::delete('campaigns/{campaign}/activities/{activity}', [CampaignController::class, 'deleteActivity']);

    // Campaign Participants
    Route::post('campaigns/{campaign}/participants', [CampaignController::class, 'addParticipant']);
    Route::post('campaigns/{campaign}/participants/bulk', [CampaignController::class, 'bulkAddParticipants']);
    Route::delete('campaigns/{campaign}/participants/{participant}', [CampaignController::class, 'removeParticipant']);

    // Campaign Evidence
    Route::post('campaigns/{campaign}/evidence', [CampaignController::class, 'uploadEvidence']);
    Route::delete('campaigns/{campaign}/evidence/{evidence}', [CampaignController::class, 'removeEvidence']);

    // Campaign Actions
    Route::post('campaigns/{campaign}/actions', [CampaignController::class, 'addAction']);
    Route::put('campaigns/{campaign}/actions/{action}', [CampaignController::class, 'updateAction']);

    // Campaign Results
    Route::post('campaigns/{campaign}/result', [CampaignController::class, 'saveResult']);

    // ─── Poster Generator Routes ────────────────────
    Route::get('posters/stats', [PosterController::class, 'stats']);
    Route::get('posters/export', [PosterController::class, 'export']);
    Route::get('posters/templates', [PosterController::class, 'templates']);
    Route::delete('posters/templates/{template}', [PosterController::class, 'destroyTemplate']);
    Route::get('posters', [PosterController::class, 'index']);
    Route::post('posters', [PosterController::class, 'store']);
    Route::get('posters/{poster}', [PosterController::class, 'show']);
    Route::put('posters/{poster}', [PosterController::class, 'update']);
    Route::delete('posters/{poster}', [PosterController::class, 'destroy']);
    Route::post('posters/{poster}/status', [PosterController::class, 'changeStatus']);
    Route::post('posters/{poster}/media', [PosterController::class, 'uploadMedia']);
    Route::delete('posters/{poster}/media/{media}', [PosterController::class, 'removeMedia']);
    Route::post('posters/{poster}/link', [PosterController::class, 'saveLink']);
    Route::post('posters/{poster}/track-download', [PosterController::class, 'trackDownload']);
    Route::post('posters/{poster}/track-print', [PosterController::class, 'trackPrint']);
    Route::post('posters/{poster}/save-pdf', [PosterController::class, 'savePdfPath']);

    // ─── Waste Manifests Module Routes ───────────────
    Route::get('waste-manifests/stats', [\App\Http\Controllers\WasteManifestController::class, 'stats']);
    Route::get('waste-manifests/export', [\App\Http\Controllers\WasteManifestController::class, 'export']);
    Route::get('waste-manifests', [\App\Http\Controllers\WasteManifestController::class, 'index']);
    Route::post('waste-manifests', [\App\Http\Controllers\WasteManifestController::class, 'store']);
    Route::get('waste-manifests/{manifest}', [\App\Http\Controllers\WasteManifestController::class, 'show']);
    Route::put('waste-manifests/{manifest}', [\App\Http\Controllers\WasteManifestController::class, 'update']);
    Route::delete('waste-manifests/{manifest}', [\App\Http\Controllers\WasteManifestController::class, 'destroy']);
    Route::post('waste-manifests/{manifest}/status', [\App\Http\Controllers\WasteManifestController::class, 'changeStatus']);
    Route::post('waste-manifests/{manifest}/confirm-dispatch', [\App\Http\Controllers\WasteManifestController::class, 'confirmDispatch']);
    Route::post('waste-manifests/{manifest}/confirm-receiving', [\App\Http\Controllers\WasteManifestController::class, 'confirmReceiving']);
    Route::post('waste-manifests/{manifest}/confirm-disposal', [\App\Http\Controllers\WasteManifestController::class, 'confirmDisposal']);
    Route::post('waste-manifests/{manifest}/attachments', [\App\Http\Controllers\WasteManifestController::class, 'uploadAttachment']);
    Route::delete('waste-manifests/{manifest}/attachments/{attachment}', [\App\Http\Controllers\WasteManifestController::class, 'removeAttachment']);

    // ─── Contractor Records Routes ──────────────────
    Route::get('contractors/stats', [ContractorController::class, 'stats']);
    Route::get('contractors/export', [ContractorController::class, 'export']);
    Route::get('contractors/list-active', [ContractorController::class, 'listActive']);
    Route::get('contractors', [ContractorController::class, 'index']);
    Route::post('contractors', [ContractorController::class, 'store']);
    Route::get('contractors/{contractor}', [ContractorController::class, 'show']);
    Route::put('contractors/{contractor}', [ContractorController::class, 'update']);
    Route::delete('contractors/{contractor}', [ContractorController::class, 'destroy']);

    // Contractor Workflow
    Route::post('contractors/{contractor}/status', [ContractorController::class, 'changeStatus']);

    // Contractor Contacts
    Route::post('contractors/{contractor}/contacts', [ContractorController::class, 'addContact']);
    Route::put('contractors/{contractor}/contacts/{contact}', [ContractorController::class, 'updateContact']);
    Route::delete('contractors/{contractor}/contacts/{contact}', [ContractorController::class, 'removeContact']);

    // Contractor Documents
    Route::post('contractors/{contractor}/documents', [ContractorController::class, 'uploadDocument']);
    Route::put('contractors/{contractor}/documents/{document}', [ContractorController::class, 'updateDocument']);
    Route::delete('contractors/{contractor}/documents/{document}', [ContractorController::class, 'removeDocument']);
    Route::post('contractors/{contractor}/documents/{document}/verify', [ContractorController::class, 'verifyDocument']);

    // Contractor Links & Performance
    Route::get('contractors/{contractor}/linked-records', [ContractorController::class, 'linkedRecords']);
    Route::post('contractors/{contractor}/link', [ContractorController::class, 'addLink']);
    Route::get('contractors/{contractor}/performance', [ContractorController::class, 'performance']);

    // ─── Environmental Module Routes ───────────────
    Route::prefix('environmental')->group(function () {
        Route::get('stats', [\App\Http\Controllers\EnvironmentalController::class, 'stats']);

        // Aspects
        Route::get('aspects/export', [\App\Http\Controllers\EnvironmentalController::class, 'exportAspects']);
        Route::get('aspects', [\App\Http\Controllers\EnvironmentalController::class, 'indexAspects']);
        Route::post('aspects', [\App\Http\Controllers\EnvironmentalController::class, 'storeAspect']);
        Route::get('aspects/{aspect}', [\App\Http\Controllers\EnvironmentalController::class, 'showAspect']);
        Route::put('aspects/{aspect}', [\App\Http\Controllers\EnvironmentalController::class, 'updateAspect']);
        Route::delete('aspects/{aspect}', [\App\Http\Controllers\EnvironmentalController::class, 'destroyAspect']);

        // Risks
        Route::get('risks/export', [\App\Http\Controllers\EnvironmentalController::class, 'exportRisks']);
        Route::get('risks', [\App\Http\Controllers\EnvironmentalController::class, 'indexRisks']);
        Route::post('risks', [\App\Http\Controllers\EnvironmentalController::class, 'storeRisk']);
        Route::get('risks/{risk}', [\App\Http\Controllers\EnvironmentalController::class, 'showRisk']);
        Route::put('risks/{risk}', [\App\Http\Controllers\EnvironmentalController::class, 'updateRisk']);
        Route::delete('risks/{risk}', [\App\Http\Controllers\EnvironmentalController::class, 'destroyRisk']);

        // Waste
        Route::get('waste/export', [\App\Http\Controllers\EnvironmentalController::class, 'exportWaste']);
        Route::get('waste', [\App\Http\Controllers\EnvironmentalController::class, 'indexWaste']);
        Route::post('waste', [\App\Http\Controllers\EnvironmentalController::class, 'storeWaste']);
        Route::get('waste/{waste}', [\App\Http\Controllers\EnvironmentalController::class, 'showWaste']);
        Route::put('waste/{waste}', [\App\Http\Controllers\EnvironmentalController::class, 'updateWaste']);
        Route::delete('waste/{waste}', [\App\Http\Controllers\EnvironmentalController::class, 'destroyWaste']);

        // Monitoring
        Route::get('monitoring/export', [\App\Http\Controllers\EnvironmentalController::class, 'exportMonitoring']);
        Route::get('monitoring', [\App\Http\Controllers\EnvironmentalController::class, 'indexMonitoring']);
        Route::post('monitoring', [\App\Http\Controllers\EnvironmentalController::class, 'storeMonitoring']);
        Route::get('monitoring/{mon}', [\App\Http\Controllers\EnvironmentalController::class, 'showMonitoring']);
        Route::put('monitoring/{mon}', [\App\Http\Controllers\EnvironmentalController::class, 'updateMonitoring']);
        Route::delete('monitoring/{mon}', [\App\Http\Controllers\EnvironmentalController::class, 'destroyMonitoring']);

        // Resources
        Route::get('resources/export', [\App\Http\Controllers\EnvironmentalController::class, 'exportResources']);
        Route::get('resources', [\App\Http\Controllers\EnvironmentalController::class, 'indexResources']);
        Route::post('resources', [\App\Http\Controllers\EnvironmentalController::class, 'storeResource']);
        Route::get('resources/{res}', [\App\Http\Controllers\EnvironmentalController::class, 'showResource']);
        Route::put('resources/{res}', [\App\Http\Controllers\EnvironmentalController::class, 'updateResource']);
        Route::delete('resources/{res}', [\App\Http\Controllers\EnvironmentalController::class, 'destroyResource']);

        // Incidents
        Route::get('incidents/export', [\App\Http\Controllers\EnvironmentalController::class, 'exportIncidents']);
        Route::get('incidents', [\App\Http\Controllers\EnvironmentalController::class, 'indexIncidents']);
        Route::post('incidents', [\App\Http\Controllers\EnvironmentalController::class, 'storeIncident']);
        Route::get('incidents/{inc}', [\App\Http\Controllers\EnvironmentalController::class, 'showIncident']);
        Route::put('incidents/{inc}', [\App\Http\Controllers\EnvironmentalController::class, 'updateIncident']);
        Route::delete('incidents/{inc}', [\App\Http\Controllers\EnvironmentalController::class, 'destroyIncident']);
        Route::post('incidents/{inc}/close', [\App\Http\Controllers\EnvironmentalController::class, 'closeIncident']);

        // Inspections
        Route::get('inspections/export', [\App\Http\Controllers\EnvironmentalController::class, 'exportInspections']);
        Route::get('inspections', [\App\Http\Controllers\EnvironmentalController::class, 'indexInspections']);
        Route::post('inspections', [\App\Http\Controllers\EnvironmentalController::class, 'storeInspection']);
        Route::get('inspections/{ins}', [\App\Http\Controllers\EnvironmentalController::class, 'showInspection']);
        Route::put('inspections/{ins}', [\App\Http\Controllers\EnvironmentalController::class, 'updateInspection']);
        Route::delete('inspections/{ins}', [\App\Http\Controllers\EnvironmentalController::class, 'destroyInspection']);

        // Compliance
        Route::get('compliance/export', [\App\Http\Controllers\EnvironmentalController::class, 'exportCompliance']);
        Route::get('compliance', [\App\Http\Controllers\EnvironmentalController::class, 'indexCompliance']);
        Route::post('compliance', [\App\Http\Controllers\EnvironmentalController::class, 'storeCompliance']);
        Route::get('compliance/{comp}', [\App\Http\Controllers\EnvironmentalController::class, 'showCompliance']);
        Route::put('compliance/{comp}', [\App\Http\Controllers\EnvironmentalController::class, 'updateCompliance']);
        Route::delete('compliance/{comp}', [\App\Http\Controllers\EnvironmentalController::class, 'destroyCompliance']);

        // Objectives
        Route::get('objectives/export', [\App\Http\Controllers\EnvironmentalController::class, 'exportObjectives']);
        Route::get('objectives', [\App\Http\Controllers\EnvironmentalController::class, 'indexObjectives']);
        Route::post('objectives', [\App\Http\Controllers\EnvironmentalController::class, 'storeObjective']);
        Route::get('objectives/{obj}', [\App\Http\Controllers\EnvironmentalController::class, 'showObjective']);
        Route::put('objectives/{obj}', [\App\Http\Controllers\EnvironmentalController::class, 'updateObjective']);
        Route::delete('objectives/{obj}', [\App\Http\Controllers\EnvironmentalController::class, 'destroyObjective']);
        Route::patch('objectives/{obj}/progress', [\App\Http\Controllers\EnvironmentalController::class, 'updateProgress']);

        // Actions
        Route::get('actions/export', [\App\Http\Controllers\EnvironmentalController::class, 'exportActions']);
        Route::get('actions', [\App\Http\Controllers\EnvironmentalController::class, 'indexActions']);
        Route::post('actions', [\App\Http\Controllers\EnvironmentalController::class, 'storeAction']);
        Route::get('actions/{action}', [\App\Http\Controllers\EnvironmentalController::class, 'showAction']);
        Route::put('actions/{action}', [\App\Http\Controllers\EnvironmentalController::class, 'updateAction']);
        Route::delete('actions/{action}', [\App\Http\Controllers\EnvironmentalController::class, 'destroyAction']);
    });

    // ─── Document Control Module Routes ──────────────
    Route::prefix('document-control')->group(function () {
        // Stats & Export (before parameterized routes)
        Route::get('stats', [DocumentControlController::class, 'stats']);
        Route::get('export', [DocumentControlController::class, 'export']);
        Route::get('list-active', [DocumentControlController::class, 'listActive']);

        // CRUD
        Route::get('/', [DocumentControlController::class, 'index']);
        Route::post('/', [DocumentControlController::class, 'store']);
        Route::get('{id}', [DocumentControlController::class, 'show']);
        Route::put('{id}', [DocumentControlController::class, 'update']);
        Route::delete('{id}', [DocumentControlController::class, 'destroy']);

        // Status
        Route::post('{id}/status', [DocumentControlController::class, 'changeStatus']);

        // Revisions
        Route::post('{id}/revisions', [DocumentControlController::class, 'createRevision']);
        Route::post('{id}/revisions/{revisionId}/upload', [DocumentControlController::class, 'uploadRevisionFile']);
        Route::post('{id}/revisions/{revisionId}/activate', [DocumentControlController::class, 'activateRevision']);

        // Review Workflow
        Route::post('{id}/revisions/{revisionId}/submit-review', [DocumentControlController::class, 'submitForReview']);
        Route::post('{id}/revisions/{revisionId}/reviews/{reviewId}', [DocumentControlController::class, 'submitReview']);

        // Approval Workflow
        Route::post('{id}/revisions/{revisionId}/submit-approval', [DocumentControlController::class, 'submitForApproval']);
        Route::post('{id}/revisions/{revisionId}/approvals/{approvalId}', [DocumentControlController::class, 'submitApproval']);

        // Links
        Route::post('{id}/links', [DocumentControlController::class, 'addLink']);
        Route::delete('{id}/links/{linkId}', [DocumentControlController::class, 'removeLink']);
    });

    // ─── AI Intelligence ─────────────────────────────
    Route::prefix('ai')->group(function () {
        Route::get('/dashboard', [AiController::class, 'dashboard']);
        Route::get('/stats', [AiController::class, 'stats']);

        Route::post('/ask', [AiController::class, 'ask']);
        Route::get('/queries', [AiController::class, 'queries']);

        Route::get('/insights', [AiController::class, 'insights']);
        Route::post('/insights/generate', [AiController::class, 'generateInsights']);
        Route::post('/insights/{insight}/dismiss', [AiController::class, 'dismissInsight']);

        Route::get('/recommendations', [AiController::class, 'recommendations']);
        Route::post('/recommendations/generate', [AiController::class, 'generateRecommendations']);
        Route::post('/recommendations/{rec}/accept', [AiController::class, 'acceptRecommendation']);
        Route::post('/recommendations/{rec}/complete', [AiController::class, 'completeRecommendation']);

        Route::get('/alerts', [AiController::class, 'alerts']);
        Route::post('/alerts/generate', [AiController::class, 'generateAlerts']);
        Route::post('/alerts/{alert}/acknowledge', [AiController::class, 'acknowledgeAlert']);
        Route::post('/alerts/{alert}/resolve', [AiController::class, 'resolveAlert']);

        Route::post('/analyze-document', [AiController::class, 'analyzeDocument']);
        Route::get('/document-analyses', [AiController::class, 'documentAnalyses']);
        Route::post('/document-analyses/{analysis}/map', [AiController::class, 'mapDocumentAnalysis']);

        Route::get('/history', [AiController::class, 'history']);
    });
});
