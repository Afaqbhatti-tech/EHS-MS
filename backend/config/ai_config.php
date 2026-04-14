<?php

return [

    'model'       => 'claude-sonnet-4-20250514',
    'max_tokens'  => 1000,
    'api_key'     => env('ANTHROPIC_API_KEY'),
    'api_url'     => 'https://api.anthropic.com/v1/messages',
    'api_version' => '2023-06-01',

    'insight_types' => [
        'Risk Pattern',
        'Compliance Alert',
        'Performance Trend',
        'Expiry Warning',
        'Training Gap',
        'Action Overdue',
        'Incident Pattern',
        'Violation Pattern',
        'Environmental Alert',
        'Document Alert',
        'Contractor Alert',
        'Waste Compliance',
    ],

    'recommendation_types' => [
        'Launch Safety Campaign',
        'Schedule Training',
        'Review Contractor',
        'Update RAMS / Document',
        'Conduct Inspection',
        'Conduct Mock Drill',
        'Escalate to Management',
        'Issue Warning',
        'Renew Document / License',
        'Add Observation Drive',
        'Review Permit',
        'Environmental Action',
        'Other',
    ],

    'alert_types' => [
        'Document Expiry',
        'Certificate Expiry',
        'Contract Expiry',
        'Review Overdue',
        'Repeated Violation',
        'High-Risk Incident',
        'Compliance Drop',
        'Training Expiry',
        'Overdue Action',
        'Waste Manifest Delay',
        'Contractor Suspension',
        'Mass Incident Event',
    ],

    'query_scopes' => [
        'all'           => 'Entire System',
        'observations'  => 'Observations',
        'permits'       => 'Permits',
        'incidents'     => 'Incidents',
        'violations'    => 'Violations',
        'training'      => 'Training',
        'campaigns'     => 'Campaigns',
        'mom'           => 'Weekly MOM',
        'environmental' => 'Environmental',
        'waste'         => 'Waste Manifests',
        'contractors'   => 'Contractor Records',
        'documents'     => 'Document Control',
        'rams'          => 'RAMS',
        'mockups'       => 'Mockups',
        'inspections'   => 'Inspections',
        'drills'        => 'Mock Drills / ERP',
    ],

    'severities' => ['Critical', 'High', 'Medium', 'Low', 'Info'],

    'analysis_window_days' => 90,

    'thresholds' => [
        'violation_repeat_count'     => 3,
        'incident_cluster_days'      => 7,
        'expiry_warning_days'        => 30,
        'overdue_action_days'        => 7,
        'training_expiry_warning'    => 30,
        'contractor_incident_count'  => 2,
    ],
];
