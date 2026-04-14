<?php

namespace App\Constants;

class Permissions
{
    /**
     * Flat list of ALL permission keys — auto-derived from PermissionRegistry.
     * Kept as a static method so it stays in sync automatically.
     */
    public static function all(): array
    {
        return PermissionRegistry::allKeys();
    }

    /**
     * Legacy constant for backward compat — DO NOT add new keys here.
     * New permissions should be added to PermissionRegistry::REGISTRY instead.
     */
    public const ALL = [
        // Module Access
        'can_access_ai_intelligence',
        'can_access_observations', 'can_access_permits', 'can_access_manpower', 'can_access_checklists',
        'can_access_mockup_register', 'can_access_weekly_mom',
        'can_access_training', 'can_access_equipment', 'can_access_violations',
        'can_access_incidents', 'can_access_mock_drills',
        'can_access_permit_calendar', 'can_access_permit_amendments',
        'can_access_documents', 'can_access_rams', 'can_access_campaigns', 'can_access_poster_generator',
        'can_access_environmental', 'can_access_waste_manifests', 'can_access_contractor_records',
        'can_access_kpis_reports',
        'can_manage_users', 'can_manage_roles',
        // Feature Permissions
        'can_create_observation', 'can_verify_observation', 'can_close_observation',
        'can_create_violation', 'can_edit_violation', 'can_assign_violation',
        'can_investigate_violation', 'can_close_violation', 'can_export_violations', 'can_delete_violation',
        'can_create_incident', 'can_edit_incident', 'can_assign_incident',
        'can_investigate_incident', 'can_close_incident', 'can_export_incidents', 'can_delete_incident',
        'can_issue_warning',
        'can_record_permit', 'can_approve_permit',
        'can_inspect_equipment', 'can_manage_equipment_categories',
        'can_manage_equipment_items', 'can_import_equipment', 'can_export_equipment', 'can_restore_equipment',
        'can_manage_training',
        'can_create_training', 'can_edit_training', 'can_delete_training',
        'can_bulk_assign_training', 'can_export_training', 'can_manage_training_requirements',
        'section_training_certifications', 'section_training_expiring',
        'section_training_compliance', 'section_training_audit_logs',
        'data_training_worker_details',
        'can_manage_manpower', 'can_manage_drills', 'can_manage_campaigns',
        'can_upload_documents', 'can_upload_rams', 'can_approve_rams', 'can_generate_ai_ra', 'can_review_ai_drafts',
        'can_export_reports', 'can_manage_posters', 'can_view_management_dashboard',
        'can_import_documents',
        'can_access_document_control', 'can_manage_document_control', 'can_review_documents', 'can_approve_documents',
    ];

    public const CONTRACTORS = ['CCCC', 'CCC Rail', 'Artal', 'FFT Direct'];

    public const ZONES = [
        'Zone A', 'Zone B', 'Zone C',
        'Station 1', 'Station 2', 'Station 3', 'Station 4', 'Station 5',
        'Chassis Line', 'Door Line', 'Trim Line',
        'Outwork Area', 'Logistics Gate', 'Workshop',
    ];

    public const SYSTEM_ROLES = [
        ['slug' => 'master', 'name' => 'Master', 'description' => 'Full system access — cannot be modified'],
        ['slug' => 'system_admin', 'name' => 'System Administrator', 'description' => 'Manages users, roles, and system settings'],
        ['slug' => 'ehs_manager', 'name' => 'EHS Manager', 'description' => 'Full EHS operational access with reporting'],
        ['slug' => 'safety_officer', 'name' => 'Safety Officer', 'description' => 'Field safety operations and observations'],
        ['slug' => 'officer', 'name' => 'Officer', 'description' => 'General officer with standard operational access'],
        ['slug' => 'site_engineer', 'name' => 'Site Engineer', 'description' => 'Site-level access for permits and inspections'],
        ['slug' => 'contractor_hse', 'name' => 'Contractor HSE Representative', 'description' => 'Contractor-specific EHS operations'],
        ['slug' => 'client_consultant', 'name' => 'Client / Consultant', 'description' => 'Read-only access with review capabilities'],
        ['slug' => 'client', 'name' => 'Client', 'description' => 'Basic client access with limited permissions'],
        ['slug' => 'viewer_management', 'name' => 'Viewer / Management', 'description' => 'Dashboard and report viewing only'],
        ['slug' => 'lead', 'name' => 'Lead', 'description' => 'Team lead with supervisory access'],
        ['slug' => 'office', 'name' => 'Office', 'description' => 'Office-based administrative access'],
    ];
}
