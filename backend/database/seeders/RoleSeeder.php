<?php

namespace Database\Seeders;

use App\Constants\Permissions;
use App\Models\Role;
use App\Models\RolePermission;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        // Create system roles
        foreach (Permissions::SYSTEM_ROLES as $role) {
            Role::updateOrCreate(
                ['slug' => $role['slug']],
                [
                    'name' => $role['name'],
                    'description' => $role['description'],
                    'is_system' => true,
                    'is_active' => true,
                ],
            );
        }

        // Define default permissions per role
        $rolePermissions = $this->getDefaultPermissions();

        foreach ($rolePermissions as $roleSlug => $perms) {
            RolePermission::updateOrCreate(
                ['role' => $roleSlug],
                ['permissions' => $perms],
            );
        }
    }

    private function getDefaultPermissions(): array
    {
        // All permissions granted
        $allTrue = [];
        foreach (Permissions::ALL as $p) {
            $allTrue[$p] = true;
        }

        // System admin — manage users/roles + view most modules
        $systemAdmin = [];
        foreach (Permissions::ALL as $p) {
            $systemAdmin[$p] = in_array($p, [
                'can_manage_users', 'can_manage_roles',
                'can_access_kpis_reports', 'can_export_reports',
                'can_view_management_dashboard',
                'can_access_observations', 'can_access_permits', 'can_access_incidents',
                'can_access_manpower', 'can_access_equipment', 'can_access_training',
                'can_access_violations', 'can_access_documents', 'can_access_rams',
                'can_access_environmental', 'can_access_waste_manifests',
            ]);
        }

        // EHS Manager — full operational, no user/role management
        $ehsManager = [];
        foreach (Permissions::ALL as $p) {
            $ehsManager[$p] = !in_array($p, ['can_manage_users', 'can_manage_roles']);
        }

        // Safety Officer
        $safetyOfficer = [];
        foreach (Permissions::ALL as $p) {
            $safetyOfficer[$p] = in_array($p, [
                'can_access_observations', 'can_create_observation', 'can_verify_observation', 'can_close_observation',
                'can_access_permits', 'can_record_permit',
                'can_access_incidents', 'can_create_incident',
                'can_access_violations', 'can_issue_warning',
                'can_access_equipment', 'can_inspect_equipment',
                'can_manage_equipment_items', 'can_export_equipment',
                'can_access_manpower',
                'can_access_training', 'can_create_training', 'can_edit_training', 'can_delete_training',
                'can_bulk_assign_training', 'can_export_training', 'can_manage_training_requirements',
                'section_training_certifications', 'section_training_expiring',
                'section_training_compliance', 'section_training_audit_logs',
                'data_training_worker_details',
                'can_access_checklists',
                'can_access_environmental', 'can_access_waste_manifests',
                'can_access_mock_drills',
                'can_access_kpis_reports',
                'can_upload_documents', 'can_access_documents',
                'can_access_rams', 'can_upload_rams',
            ]);
        }

        // Officer (standard operational)
        $officer = $safetyOfficer; // Same base as safety officer

        // Site Engineer
        $siteEngineer = [];
        foreach (Permissions::ALL as $p) {
            $siteEngineer[$p] = in_array($p, [
                'can_access_permits', 'can_record_permit',
                'can_access_observations',
                'can_access_equipment', 'can_inspect_equipment',
                'can_manage_equipment_items',
                'can_access_manpower',
                'can_access_checklists',
                'can_access_incidents',
                'can_access_environmental',
            ]);
        }

        // Contractor HSE
        $contractorHse = [];
        foreach (Permissions::ALL as $p) {
            $contractorHse[$p] = in_array($p, [
                'can_access_observations', 'can_create_observation',
                'can_access_permits', 'can_record_permit',
                'can_access_incidents', 'can_create_incident',
                'can_access_manpower', 'can_manage_manpower',
                'can_access_equipment',
                'can_access_training', 'can_create_training', 'can_export_training',
                'section_training_certifications', 'section_training_expiring',
                'section_training_compliance', 'data_training_worker_details',
                'can_access_violations',
                'can_access_environmental', 'can_access_waste_manifests',
            ]);
        }

        // Client / Consultant — read-only with review
        $clientConsultant = [];
        foreach (Permissions::ALL as $p) {
            $clientConsultant[$p] = in_array($p, [
                'can_access_observations', 'can_access_permits', 'can_access_incidents',
                'can_access_kpis_reports', 'can_view_management_dashboard',
                'can_access_documents', 'can_review_ai_drafts',
                'can_access_mockup_register', 'can_access_weekly_mom',
            ]);
        }

        // Client — basic
        $client = [];
        foreach (Permissions::ALL as $p) {
            $client[$p] = in_array($p, [
                'can_access_observations', 'can_access_permits', 'can_access_incidents',
                'can_access_kpis_reports', 'can_view_management_dashboard',
            ]);
        }

        // Viewer/Management — dashboard + reports only
        $viewer = [];
        foreach (Permissions::ALL as $p) {
            $viewer[$p] = in_array($p, [
                'can_access_kpis_reports', 'can_view_management_dashboard', 'can_export_reports',
            ]);
        }

        // Lead
        $lead = $safetyOfficer; // Same as safety officer

        // Office
        $office = [];
        foreach (Permissions::ALL as $p) {
            $office[$p] = in_array($p, [
                'can_access_observations', 'can_access_permits', 'can_access_incidents',
                'can_access_manpower', 'can_access_training',
                'can_create_training', 'can_export_training',
                'section_training_certifications', 'section_training_expiring',
                'data_training_worker_details',
                'can_access_documents', 'can_upload_documents',
                'can_access_kpis_reports', 'can_export_reports',
                'can_access_equipment',
            ]);
        }

        return [
            'master' => $allTrue,
            'system_admin' => $systemAdmin,
            'ehs_manager' => $ehsManager,
            'safety_officer' => $safetyOfficer,
            'officer' => $officer,
            'site_engineer' => $siteEngineer,
            'contractor_hse' => $contractorHse,
            'client_consultant' => $clientConsultant,
            'client' => $client,
            'viewer_management' => $viewer,
            'lead' => $lead,
            'office' => $office,
        ];
    }
}
