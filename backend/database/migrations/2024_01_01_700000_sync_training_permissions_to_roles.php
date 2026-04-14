<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Safely sync new granular Training Matrix permissions to existing roles.
 *
 * Rules:
 * - Only adds permissions to roles that already have can_access_training = true
 * - Idempotent: will not duplicate or overwrite existing permission values
 * - master role is skipped (handled separately via allGranted())
 * - After updating role_permissions, syncs all affected users
 */
return new class extends Migration
{
    public function up(): void
    {
        // New granular training permissions and which role-categories get them
        $fullTrainingPerms = [
            'can_create_training' => true,
            'can_edit_training' => true,
            'can_delete_training' => true,
            'can_bulk_assign_training' => true,
            'can_export_training' => true,
            'can_manage_training_requirements' => true,
            'section_training_certifications' => true,
            'section_training_expiring' => true,
            'section_training_compliance' => true,
            'section_training_audit_logs' => true,
            'data_training_worker_details' => true,
        ];

        $limitedTrainingPerms = [
            'can_create_training' => true,
            'can_export_training' => true,
            'section_training_certifications' => true,
            'section_training_expiring' => true,
            'section_training_compliance' => true,
            'data_training_worker_details' => true,
        ];

        $viewOnlyTrainingPerms = [
            'can_export_training' => true,
            'section_training_certifications' => true,
            'section_training_expiring' => true,
            'data_training_worker_details' => true,
        ];

        // Get all non-master role_permissions rows
        $roleRows = DB::table('role_permissions')->where('role', '!=', 'master')->get();

        foreach ($roleRows as $row) {
            $perms = json_decode($row->permissions, true);
            if (!is_array($perms)) {
                continue;
            }

            // Only touch roles that already have training access
            if (empty($perms['can_access_training'])) {
                continue;
            }

            // Determine permission level based on role
            $roleSlug = $row->role;
            if (in_array($roleSlug, ['ehs_manager', 'safety_officer', 'officer', 'lead'])) {
                $newPerms = $fullTrainingPerms;
            } elseif (in_array($roleSlug, ['contractor_hse', 'office'])) {
                $newPerms = $limitedTrainingPerms;
            } elseif (in_array($roleSlug, ['system_admin'])) {
                $newPerms = $viewOnlyTrainingPerms;
            } else {
                // Any other role with can_access_training gets view-only
                $newPerms = $viewOnlyTrainingPerms;
            }

            // Merge: only add keys that don't already exist
            $changed = false;
            foreach ($newPerms as $key => $value) {
                if (!array_key_exists($key, $perms)) {
                    $perms[$key] = $value;
                    $changed = true;
                }
            }

            if ($changed) {
                DB::table('role_permissions')
                    ->where('role', $roleSlug)
                    ->update(['permissions' => json_encode($perms)]);

                Log::info("Training permissions synced for role: {$roleSlug}");
            }
        }

        // Sync all users to pick up role-level changes
        $users = DB::table('users')->where('role', '!=', 'master')->get();
        foreach ($users as $user) {
            // Get role defaults
            $roleRow = DB::table('role_permissions')->where('role', $user->role)->first();
            $rolePerms = $roleRow ? (json_decode($roleRow->permissions, true) ?? []) : [];

            // Get user overrides
            $overrideRow = DB::table('user_permission_overrides')->where('user_id', $user->id)->first();
            $overrides = $overrideRow ? (json_decode($overrideRow->overrides, true) ?? []) : [];

            // Merge
            $effective = array_merge($rolePerms, $overrides);

            DB::table('users')
                ->where('id', $user->id)
                ->update(['permissions' => json_encode($effective)]);
        }

        // Log the migration as a permission audit event
        DB::table('permission_audit_logs')->insert([
            'actor_id' => null,
            'actor_name' => 'System Migration',
            'target_role' => null,
            'target_user_id' => null,
            'action' => 'permissions_reset',
            'changes' => json_encode([
                'description' => 'Training Matrix granular permissions synced to existing roles',
                'permissions_added' => array_keys($fullTrainingPerms),
            ]),
            'notes' => 'Automated migration: 2024_01_01_700000_sync_training_permissions_to_roles',
            'created_at' => now(),
        ]);
    }

    public function down(): void
    {
        // No rollback — permission additions are safe and non-destructive
    }
};
