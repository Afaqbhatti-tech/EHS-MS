<?php

namespace App\Constants;

/**
 * Central Permission Registry — single source of truth for ALL permissions.
 *
 * Adding a module/permission here automatically makes it appear in the
 * Access Management UI.  Removing it automatically hides it.
 *
 * Structure: array of modules, each containing typed permission entries.
 * Types: module (access gate), section, data (visibility), action.
 */
class PermissionRegistry
{
    /**
     * Full permission tree used by the Access Management UI.
     */
    public const REGISTRY = [
        // ── Dashboard ──────────────────────────────────────
        [
            'key' => 'dashboard',
            'label' => 'Dashboard',
            'icon' => 'LayoutDashboard',
            'description' => 'Main dashboard overview with KPIs and metrics',
            'permissions' => [
                ['key' => 'data_dashboard_incident_free_days', 'label' => 'Incident-Free Days Card', 'type' => 'data'],
                ['key' => 'data_dashboard_man_hours', 'label' => 'Man-Hours MTD Card', 'type' => 'data'],
                ['key' => 'data_dashboard_active_permits', 'label' => 'Active Permits Card', 'type' => 'data'],
                ['key' => 'data_dashboard_open_observations', 'label' => 'Open Observations Card', 'type' => 'data'],
                ['key' => 'data_dashboard_pending_amendments', 'label' => 'Pending Amendments Card', 'type' => 'data'],
                ['key' => 'data_dashboard_mom_open_actions', 'label' => 'MOM Open Actions Card', 'type' => 'data'],
                ['key' => 'data_dashboard_mockup_pending', 'label' => 'Mock-Up Pending Card', 'type' => 'data'],
                ['key' => 'data_dashboard_open_violations', 'label' => 'Open Violations Card', 'type' => 'data'],
                ['key' => 'data_dashboard_env_manifests', 'label' => 'Environmental Manifests Card', 'type' => 'data'],
                ['key' => 'data_dashboard_safety_chart', 'label' => 'Safety Performance Chart', 'type' => 'data'],
                ['key' => 'data_dashboard_quick_operations', 'label' => 'Quick Operations Panel', 'type' => 'data'],
                ['key' => 'data_dashboard_recent_activity', 'label' => 'Recent Activity Feed', 'type' => 'data'],
                ['key' => 'data_dashboard_ai_insights', 'label' => 'AI Intelligence Panel', 'type' => 'data'],
                ['key' => 'data_dashboard_compliance_scorecard', 'label' => 'Compliance Scorecard', 'type' => 'data'],
            ],
        ],

        // ── AI Intelligence ────────────────────────────────
        [
            'key' => 'ai_intelligence',
            'label' => 'AI Intelligence',
            'icon' => 'Brain',
            'description' => 'AI-powered safety analytics and insights',
            'permissions' => [
                ['key' => 'can_access_ai_intelligence', 'label' => 'Access Module', 'type' => 'module'],
                ['key' => 'can_generate_ai_ra', 'label' => 'Generate AI Risk Assessment', 'type' => 'action'],
                ['key' => 'can_review_ai_drafts', 'label' => 'Review AI Drafts', 'type' => 'action'],
            ],
        ],

        // ── Observations ───────────────────────────────────
        [
            'key' => 'observations',
            'label' => 'Observations',
            'icon' => 'Eye',
            'description' => 'Safety observation tracking and analytics',
            'permissions' => [
                ['key' => 'can_access_observations', 'label' => 'Access Module', 'type' => 'module'],
                ['key' => 'section_observations_analytics', 'label' => 'Analytics Tab', 'type' => 'section'],
                ['key' => 'section_observations_stats', 'label' => 'Stats Panel', 'type' => 'section'],
                ['key' => 'can_create_observation', 'label' => 'Create Observation', 'type' => 'action'],
                ['key' => 'can_verify_observation', 'label' => 'Verify Observation', 'type' => 'action'],
                ['key' => 'can_close_observation', 'label' => 'Close Observation', 'type' => 'action'],
                ['key' => 'data_observations_contractor', 'label' => 'Contractor Column', 'type' => 'data'],
                ['key' => 'data_observations_zone', 'label' => 'Zone Information', 'type' => 'data'],
            ],
        ],

        // ── Permits to Work ────────────────────────────────
        [
            'key' => 'permits',
            'label' => 'Permits to Work',
            'icon' => 'ClipboardCheck',
            'description' => 'Permit-to-work management',
            'permissions' => [
                ['key' => 'can_access_permits', 'label' => 'Access Module', 'type' => 'module'],
                ['key' => 'section_permits_calendar', 'label' => 'Calendar View', 'type' => 'section'],
                ['key' => 'can_record_permit', 'label' => 'Record Permit', 'type' => 'action'],
                ['key' => 'can_approve_permit', 'label' => 'Approve Permit', 'type' => 'action'],
                ['key' => 'data_permits_status_history', 'label' => 'Status History', 'type' => 'data'],
            ],
        ],

        // ── Manpower & Hours ───────────────────────────────
        [
            'key' => 'manpower',
            'label' => 'Manpower & Hours',
            'icon' => 'Users',
            'description' => 'Workforce and man-hour tracking',
            'permissions' => [
                ['key' => 'can_access_manpower', 'label' => 'Access Module', 'type' => 'module'],
                ['key' => 'can_manage_manpower', 'label' => 'Manage Records', 'type' => 'action'],
                ['key' => 'data_manpower_hours_breakdown', 'label' => 'Hours Breakdown', 'type' => 'data'],
                ['key' => 'data_manpower_contractor_split', 'label' => 'Contractor Split', 'type' => 'data'],
            ],
        ],

        // ── Checklists ─────────────────────────────────────
        [
            'key' => 'checklists',
            'label' => 'Checklists',
            'icon' => 'CheckSquare',
            'description' => 'Equipment and safety checklists',
            'permissions' => [
                ['key' => 'can_access_checklists', 'label' => 'Access Module', 'type' => 'module'],
                ['key' => 'can_inspect_equipment', 'label' => 'Perform Inspections', 'type' => 'action'],
                ['key' => 'section_checklists_history', 'label' => 'Inspection History', 'type' => 'section'],
            ],
        ],

        // ── Equipment Tracker ──────────────────────────────
        [
            'key' => 'equipment_tracker',
            'label' => 'Equipment Tracker',
            'icon' => 'Package',
            'description' => 'Track equipment inspections and status',
            'permissions' => [
                ['key' => 'can_access_equipment', 'label' => 'Access Module', 'type' => 'module'],
                ['key' => 'section_tracker_categories', 'label' => 'Categories', 'type' => 'section'],
                ['key' => 'section_tracker_items', 'label' => 'Item Register', 'type' => 'section'],
                ['key' => 'section_tracker_groups', 'label' => 'Equipment Groups', 'type' => 'section'],
                ['key' => 'can_manage_equipment_categories', 'label' => 'Manage Groups & Categories', 'type' => 'action'],
                ['key' => 'can_manage_equipment_items', 'label' => 'Manage Equipment Items', 'type' => 'action'],
                ['key' => 'can_inspect_equipment', 'label' => 'Perform Inspections', 'type' => 'action'],
                ['key' => 'can_import_equipment', 'label' => 'Import Equipment', 'type' => 'action'],
                ['key' => 'can_export_equipment', 'label' => 'Export Equipment', 'type' => 'action'],
                ['key' => 'can_restore_equipment', 'label' => 'Restore Deleted Equipment', 'type' => 'action'],
                ['key' => 'data_tracker_overdue_items', 'label' => 'Overdue Items', 'type' => 'data'],
                ['key' => 'data_tracker_tuv_status', 'label' => 'TUV Certification Status', 'type' => 'data'],
                ['key' => 'data_tracker_expiry_badges', 'label' => 'Expiry Badges & Warnings', 'type' => 'data'],
            ],
        ],

        // ── RAMs Board ─────────────────────────────────────
        [
            'key' => 'rams_board',
            'label' => 'RAMs Board',
            'icon' => 'FolderKanban',
            'description' => 'Risk Assessment and Method Statements',
            'permissions' => [
                ['key' => 'can_access_rams', 'label' => 'Access Module', 'type' => 'module'],
                ['key' => 'can_upload_rams', 'label' => 'Upload RAMS Document', 'type' => 'action'],
                ['key' => 'can_approve_rams', 'label' => 'Approve RAMS', 'type' => 'action'],
                ['key' => 'section_rams_work_lines', 'label' => 'Work Lines', 'type' => 'section'],
                ['key' => 'section_rams_documents', 'label' => 'Documents', 'type' => 'section'],
            ],
        ],

        // ── Mock-Up Register ───────────────────────────────
        [
            'key' => 'mockup_register',
            'label' => 'Mock-Up Register',
            'icon' => 'ClipboardList',
            'description' => 'Pre-execution validation and approval workflow',
            'permissions' => [
                ['key' => 'can_access_mockup_register', 'label' => 'Access Module', 'type' => 'module'],
                ['key' => 'can_approve_mockup', 'label' => 'Approve / Reject Mock-Ups', 'type' => 'action'],
                ['key' => 'can_create_mockup_revision', 'label' => 'Create Revisions', 'type' => 'action'],
                ['key' => 'section_mockup_photos', 'label' => 'Photos & Attachments Tab', 'type' => 'section'],
                ['key' => 'section_mockup_comments', 'label' => 'Comments Tab', 'type' => 'section'],
                ['key' => 'section_mockup_history', 'label' => 'History Tab', 'type' => 'section'],
                ['key' => 'section_mockup_personnel', 'label' => 'Personnel / Attendance', 'type' => 'section'],
                ['key' => 'section_mockup_approvers', 'label' => 'Approvers / Signatories', 'type' => 'section'],
                ['key' => 'data_mockup_approved_by', 'label' => 'Approved By Field', 'type' => 'data'],
                ['key' => 'data_mockup_involved_candidates', 'label' => 'Involved Candidates', 'type' => 'data'],
                ['key' => 'data_mockup_linked_rams', 'label' => 'Linked RAMS Document', 'type' => 'data'],
            ],
        ],

        // ── Weekly MOM ─────────────────────────────────────
        [
            'key' => 'weekly_mom',
            'label' => 'Weekly MOM',
            'icon' => 'FileText',
            'description' => 'Minutes of meeting tracking',
            'permissions' => [
                ['key' => 'can_access_weekly_mom', 'label' => 'Access Module', 'type' => 'module'],
                ['key' => 'section_mom_register', 'label' => 'MOM Register', 'type' => 'section'],
                ['key' => 'section_mom_open_items', 'label' => 'Open Items', 'type' => 'section'],
                ['key' => 'section_mom_analytics', 'label' => 'Analytics', 'type' => 'section'],
                ['key' => 'data_mom_priority', 'label' => 'Priority Column', 'type' => 'data'],
                ['key' => 'data_mom_overdue_count', 'label' => 'Overdue Count', 'type' => 'data'],
            ],
        ],

        // ── Training Matrix ────────────────────────────────
        [
            'key' => 'training_matrix',
            'label' => 'Training Matrix',
            'icon' => 'GraduationCap',
            'description' => 'Worker training records, certification, and compliance tracking',
            'permissions' => [
                ['key' => 'can_access_training', 'label' => 'Access Module', 'type' => 'module'],
                ['key' => 'can_create_training', 'label' => 'Create Training Record', 'type' => 'action'],
                ['key' => 'can_edit_training', 'label' => 'Edit Training Record', 'type' => 'action'],
                ['key' => 'can_delete_training', 'label' => 'Delete Training Record', 'type' => 'action'],
                ['key' => 'can_bulk_assign_training', 'label' => 'Bulk Assign Training', 'type' => 'action'],
                ['key' => 'can_export_training', 'label' => 'Export Training Data', 'type' => 'action'],
                ['key' => 'can_manage_training_requirements', 'label' => 'Manage Trade Requirements', 'type' => 'action'],
                ['key' => 'section_training_certifications', 'label' => 'Certifications', 'type' => 'section'],
                ['key' => 'section_training_expiring', 'label' => 'Expiring Soon', 'type' => 'section'],
                ['key' => 'section_training_compliance', 'label' => 'Compliance Matrix', 'type' => 'section'],
                ['key' => 'section_training_audit_logs', 'label' => 'Audit Logs', 'type' => 'section'],
                ['key' => 'data_training_worker_details', 'label' => 'Worker Details', 'type' => 'data'],
            ],
        ],

        // ── Equipment Register ─────────────────────────────
        [
            'key' => 'equipment_register',
            'label' => 'Equipment Register',
            'icon' => 'Wrench',
            'description' => 'Equipment inventory and registration',
            'permissions' => [
                ['key' => 'can_access_equipment', 'label' => 'Access Module', 'type' => 'module'],
                ['key' => 'section_equipment_inventory', 'label' => 'Inventory', 'type' => 'section'],
                ['key' => 'data_equipment_ownership', 'label' => 'Ownership Details', 'type' => 'data'],
                ['key' => 'data_equipment_certification', 'label' => 'Certification Info', 'type' => 'data'],
            ],
        ],

        // ── Violations ─────────────────────────────────────
        [
            'key' => 'violations',
            'label' => 'Violations',
            'icon' => 'Ban',
            'description' => 'Safety violation tracking and enforcement',
            'permissions' => [
                ['key' => 'can_access_violations', 'label' => 'Access Module', 'type' => 'module'],
                ['key' => 'section_violations_analytics', 'label' => 'Analytics', 'type' => 'section'],
                ['key' => 'can_create_violation', 'label' => 'Create Violation', 'type' => 'action'],
                ['key' => 'can_edit_violation', 'label' => 'Edit Violation', 'type' => 'action'],
                ['key' => 'can_assign_violation', 'label' => 'Assign Violation', 'type' => 'action'],
                ['key' => 'can_investigate_violation', 'label' => 'Investigate Violation', 'type' => 'action'],
                ['key' => 'can_close_violation', 'label' => 'Close Violation', 'type' => 'action'],
                ['key' => 'can_export_violations', 'label' => 'Export Violations', 'type' => 'action'],
                ['key' => 'can_delete_violation', 'label' => 'Delete Violation', 'type' => 'action'],
                ['key' => 'data_violation_evidence', 'label' => 'Evidence Attachments', 'type' => 'data'],
                ['key' => 'data_violation_penalty', 'label' => 'Penalty Details', 'type' => 'data'],
                ['key' => 'data_violation_contractor', 'label' => 'Contractor Information', 'type' => 'data'],
            ],
        ],

        // ── Incidents ──────────────────────────────────────
        [
            'key' => 'incidents',
            'label' => 'Incidents',
            'icon' => 'AlertTriangle',
            'description' => 'Incident reporting and investigation',
            'permissions' => [
                ['key' => 'can_access_incidents', 'label' => 'Access Module', 'type' => 'module'],
                ['key' => 'section_incidents_analytics', 'label' => 'Analytics', 'type' => 'section'],
                ['key' => 'section_incidents_investigation', 'label' => 'Investigation Details', 'type' => 'section'],
                ['key' => 'can_create_incident', 'label' => 'Create Incident', 'type' => 'action'],
                ['key' => 'can_edit_incident', 'label' => 'Edit Incident', 'type' => 'action'],
                ['key' => 'can_assign_incident', 'label' => 'Assign Incident', 'type' => 'action'],
                ['key' => 'can_investigate_incident', 'label' => 'Investigate Incident', 'type' => 'action'],
                ['key' => 'can_close_incident', 'label' => 'Close Incident', 'type' => 'action'],
                ['key' => 'can_export_incidents', 'label' => 'Export Incidents', 'type' => 'action'],
                ['key' => 'can_delete_incident', 'label' => 'Delete Incident', 'type' => 'action'],
                ['key' => 'can_issue_warning', 'label' => 'Issue Warning Letter', 'type' => 'action'],
                ['key' => 'data_incident_evidence', 'label' => 'Evidence Attachments', 'type' => 'data'],
                ['key' => 'data_incident_root_cause', 'label' => 'Root Cause Analysis', 'type' => 'data'],
            ],
        ],

        // ── Mock Drills / ERP ──────────────────────────────
        [
            'key' => 'mock_drills',
            'label' => 'Mock Drills / ERP',
            'icon' => 'Siren',
            'description' => 'Emergency drills and response plans',
            'permissions' => [
                ['key' => 'can_access_mock_drills', 'label' => 'Access Module', 'type' => 'module'],
                ['key' => 'can_manage_drills', 'label' => 'Manage Drills', 'type' => 'action'],
                ['key' => 'section_drills_participants', 'label' => 'Participants', 'type' => 'section'],
                ['key' => 'section_drills_evaluation', 'label' => 'Evaluation', 'type' => 'section'],
                ['key' => 'data_drills_resources', 'label' => 'Resources Used', 'type' => 'data'],
            ],
        ],

        // ── PTW Calendar ───────────────────────────────────
        [
            'key' => 'permit_calendar',
            'label' => 'PTW Calendar',
            'icon' => 'CalendarDays',
            'description' => 'Permit-to-work calendar view',
            'permissions' => [
                ['key' => 'can_access_permit_calendar', 'label' => 'Access Module', 'type' => 'module'],
            ],
        ],

        // ── Permit Amendments ──────────────────────────────
        [
            'key' => 'permit_amendments',
            'label' => 'Permit Amendments',
            'icon' => 'FileEdit',
            'description' => 'Permit amendment workflow',
            'permissions' => [
                ['key' => 'can_access_permit_amendments', 'label' => 'Access Module', 'type' => 'module'],
                ['key' => 'section_amendments_history', 'label' => 'Amendment History', 'type' => 'section'],
                ['key' => 'data_amendments_changes', 'label' => 'Change Details', 'type' => 'data'],
                ['key' => 'data_amendments_attachments', 'label' => 'Attachments', 'type' => 'data'],
            ],
        ],

        // ── Document Import ────────────────────────────────
        [
            'key' => 'document_import',
            'label' => 'Document Import',
            'icon' => 'Upload',
            'description' => 'Bulk document import',
            'permissions' => [
                ['key' => 'can_import_documents', 'label' => 'Import Documents', 'type' => 'action'],
            ],
        ],

        // ── Document Control ───────────────────────────────
        [
            'key' => 'document_control',
            'label' => 'Document Control',
            'icon' => 'FolderOpen',
            'description' => 'Document lifecycle management',
            'permissions' => [
                ['key' => 'can_access_document_control', 'label' => 'Access Module', 'type' => 'module'],
                ['key' => 'can_manage_document_control', 'label' => 'Manage Documents', 'type' => 'action'],
                ['key' => 'can_review_documents', 'label' => 'Review Documents', 'type' => 'action'],
                ['key' => 'can_approve_documents', 'label' => 'Approve Documents', 'type' => 'action'],
                ['key' => 'can_upload_documents', 'label' => 'Upload Documents', 'type' => 'action'],
                ['key' => 'section_dc_revisions', 'label' => 'Revision History', 'type' => 'section'],
                ['key' => 'section_dc_approvals', 'label' => 'Approval Chain', 'type' => 'section'],
            ],
        ],

        // ── Campaigns ──────────────────────────────────────
        [
            'key' => 'campaigns',
            'label' => 'Campaigns',
            'icon' => 'Megaphone',
            'description' => 'Safety awareness campaigns',
            'permissions' => [
                ['key' => 'can_access_campaigns', 'label' => 'Access Module', 'type' => 'module'],
                ['key' => 'can_manage_campaigns', 'label' => 'Manage Campaigns', 'type' => 'action'],
                ['key' => 'section_campaigns_activities', 'label' => 'Activities', 'type' => 'section'],
                ['key' => 'section_campaigns_evidence', 'label' => 'Evidence', 'type' => 'section'],
                ['key' => 'data_campaigns_participants', 'label' => 'Participant List', 'type' => 'data'],
            ],
        ],

        // ── Poster Generator ───────────────────────────────
        [
            'key' => 'poster_generator',
            'label' => 'Poster Generator',
            'icon' => 'Image',
            'description' => 'Safety poster creation tool',
            'permissions' => [
                ['key' => 'can_access_poster_generator', 'label' => 'Access Module', 'type' => 'module'],
                ['key' => 'can_manage_posters', 'label' => 'Create & Edit Posters', 'type' => 'action'],
            ],
        ],

        // ── Environmental Management ───────────────────────
        [
            'key' => 'environmental',
            'label' => 'Environmental Mgmt',
            'icon' => 'Leaf',
            'description' => 'Environmental monitoring and compliance',
            'permissions' => [
                ['key' => 'can_access_environmental', 'label' => 'Access Module', 'type' => 'module'],
                ['key' => 'section_environmental_aspects', 'label' => 'Environmental Aspects', 'type' => 'section'],
                ['key' => 'section_environmental_monitoring', 'label' => 'Monitoring', 'type' => 'section'],
                ['key' => 'section_environmental_compliance', 'label' => 'Compliance Register', 'type' => 'section'],
                ['key' => 'section_environmental_incidents', 'label' => 'Environmental Incidents', 'type' => 'section'],
                ['key' => 'section_environmental_waste', 'label' => 'Waste Records', 'type' => 'section'],
                ['key' => 'data_environmental_risk_scores', 'label' => 'Risk Scores', 'type' => 'data'],
            ],
        ],

        // ── Waste Manifests ────────────────────────────────
        [
            'key' => 'waste_manifests',
            'label' => 'Waste Manifests',
            'icon' => 'Truck',
            'description' => 'Waste manifest tracking',
            'permissions' => [
                ['key' => 'can_access_waste_manifests', 'label' => 'Access Module', 'type' => 'module'],
                ['key' => 'section_waste_attachments', 'label' => 'Manifest Attachments', 'type' => 'section'],
                ['key' => 'data_waste_hazard_class', 'label' => 'Hazard Classification', 'type' => 'data'],
                ['key' => 'data_waste_disposal_method', 'label' => 'Disposal Method', 'type' => 'data'],
            ],
        ],

        // ── Contractor Records ─────────────────────────────
        [
            'key' => 'contractor_records',
            'label' => 'Contractor Records',
            'icon' => 'HardHat',
            'description' => 'Contractor management and compliance',
            'permissions' => [
                ['key' => 'can_access_contractor_records', 'label' => 'Access Module', 'type' => 'module'],
                ['key' => 'section_contractor_documents', 'label' => 'Documents', 'type' => 'section'],
                ['key' => 'section_contractor_contacts', 'label' => 'Contacts', 'type' => 'section'],
                ['key' => 'section_contractor_compliance', 'label' => 'Compliance Status', 'type' => 'section'],
                ['key' => 'data_contractor_insurance', 'label' => 'Insurance Details', 'type' => 'data'],
                ['key' => 'data_contractor_tax_info', 'label' => 'Tax Information', 'type' => 'data'],
                ['key' => 'data_contractor_compliance_score', 'label' => 'Compliance Score', 'type' => 'data'],
                ['key' => 'data_contractor_incident_count', 'label' => 'Incident Count', 'type' => 'data'],
            ],
        ],

        // ── KPIs & Reports ─────────────────────────────────
        [
            'key' => 'kpis_reports',
            'label' => 'KPIs & Reports',
            'icon' => 'BarChart3',
            'description' => 'Reporting and key performance indicators',
            'permissions' => [
                ['key' => 'can_access_kpis_reports', 'label' => 'Access Module', 'type' => 'module'],
                ['key' => 'can_export_reports', 'label' => 'Export Reports', 'type' => 'action'],
                ['key' => 'can_view_management_dashboard', 'label' => 'View Management Dashboard', 'type' => 'action'],
                ['key' => 'section_reports_trends', 'label' => 'Trend Charts', 'type' => 'section'],
                ['key' => 'section_reports_contractor_breakdown', 'label' => 'Contractor Breakdown', 'type' => 'section'],
                ['key' => 'data_reports_detailed_records', 'label' => 'Detailed Records', 'type' => 'data'],
            ],
        ],

        // ── Administration ─────────────────────────────────
        [
            'key' => 'administration',
            'label' => 'Administration',
            'icon' => 'Shield',
            'description' => 'System administration and user management',
            'permissions' => [
                ['key' => 'can_manage_users', 'label' => 'Manage Users', 'type' => 'action'],
                ['key' => 'can_manage_roles', 'label' => 'Manage Roles & Access', 'type' => 'action'],
                ['key' => 'section_admin_recycle_bin', 'label' => 'Recycle Bin', 'type' => 'section'],
                ['key' => 'section_admin_audit_logs', 'label' => 'Audit Logs', 'type' => 'section'],
            ],
        ],
    ];

    /**
     * Flat list of every permission key (auto-derived from REGISTRY).
     */
    public static function allKeys(): array
    {
        $keys = [];
        foreach (self::REGISTRY as $module) {
            foreach ($module['permissions'] as $perm) {
                $keys[] = $perm['key'];
            }
        }
        return array_values(array_unique($keys));
    }

    /**
     * Return a map of all permission keys set to true.
     */
    public static function allGranted(): array
    {
        $map = [];
        foreach (self::allKeys() as $key) {
            $map[$key] = true;
        }
        return $map;
    }

    /**
     * Return the full registry tree (for API serialization).
     */
    public static function tree(): array
    {
        return self::REGISTRY;
    }
}
