<?php

/**
 * MEWP (Mobile Elevating Work Platform) Equipment Configuration.
 * Defines equipment types, inspection frequencies, and structured pre-use checklist.
 */

return [

    // ── EQUIPMENT TYPES ─────────────────────────────────────
    'types' => [
        'forklift' => [
            'label'            => 'Forklift',
            'abbr'             => 'FLT',
            'color'            => '#D97706',
            'light_color'      => '#FEF3C7',
            'text_color'       => '#92400E',
            'icon'             => 'truck',
            'insp_freq_days'   => 1,
            'third_party_days' => 365,
            'description'      => 'Counterbalance and reach forklifts',
        ],
        'scissor_lift' => [
            'label'            => 'Scissor Lift',
            'abbr'             => 'SCL',
            'color'            => '#7C3AED',
            'light_color'      => '#EDE9FE',
            'text_color'       => '#5B21B6',
            'icon'             => 'arrow-up-down',
            'insp_freq_days'   => 7,
            'third_party_days' => 180,
            'description'      => 'Electric and diesel scissor lifts',
        ],
        'telehandler' => [
            'label'            => 'Telehandler',
            'abbr'             => 'TLH',
            'color'            => '#0369A1',
            'light_color'      => '#E0F2FE',
            'text_color'       => '#075985',
            'icon'             => 'move-up-right',
            'insp_freq_days'   => 1,
            'third_party_days' => 365,
            'description'      => 'Telescopic handlers',
        ],
        'man_lift' => [
            'label'            => 'Man Lift',
            'abbr'             => 'MNL',
            'color'            => '#059669',
            'light_color'      => '#D1FAE5',
            'text_color'       => '#065F46',
            'icon'             => 'person-standing',
            'insp_freq_days'   => 7,
            'third_party_days' => 180,
            'description'      => 'Vertical personnel lifts',
        ],
        'boom_lift' => [
            'label'            => 'Boom Lift',
            'abbr'             => 'BML',
            'color'            => '#DC2626',
            'light_color'      => '#FEE2E2',
            'text_color'       => '#991B1B',
            'icon'             => 'move-diagonal',
            'insp_freq_days'   => 7,
            'third_party_days' => 180,
            'description'      => 'Articulating and telescopic boom lifts',
        ],
    ],

    // ── DAILY PRE-USE CHECKLIST (22 items) ──────────────────
    'daily_preuse_checklist' => [
        // Documentation
        ['id' => 'mewp_doc_1', 'section' => 'Documentation', 'item' => 'Valid third-party inspection certificate on site', 'type' => 'pass_fail'],
        ['id' => 'mewp_doc_2', 'section' => 'Documentation', 'item' => 'Operator holds valid licence / competency card', 'type' => 'pass_fail'],
        ['id' => 'mewp_doc_3', 'section' => 'Documentation', 'item' => 'Logbook available and previous entry reviewed', 'type' => 'pass_fail'],

        // Structural
        ['id' => 'mewp_str_1', 'section' => 'Structural', 'item' => 'Chassis and frame free from visible cracks or damage', 'type' => 'pass_fail'],
        ['id' => 'mewp_str_2', 'section' => 'Structural', 'item' => 'Platform floor intact — no holes, excessive rust or warping', 'type' => 'pass_fail'],
        ['id' => 'mewp_str_3', 'section' => 'Structural', 'item' => 'Guardrails, mid-rails and toe-boards secure', 'type' => 'pass_fail'],
        ['id' => 'mewp_str_4', 'section' => 'Structural', 'item' => 'Platform gate / entry bar closes and latches properly', 'type' => 'pass_fail'],

        // Hydraulics
        ['id' => 'mewp_hyd_1', 'section' => 'Hydraulics', 'item' => 'Hydraulic oil level within normal range', 'type' => 'pass_fail'],
        ['id' => 'mewp_hyd_2', 'section' => 'Hydraulics', 'item' => 'No visible hydraulic leaks on hoses, cylinders or fittings', 'type' => 'pass_fail'],
        ['id' => 'mewp_hyd_3', 'section' => 'Hydraulics', 'item' => 'All boom / scissor movements smooth and controlled', 'type' => 'pass_fail'],
        ['id' => 'mewp_hyd_4', 'section' => 'Hydraulics', 'item' => 'Outriggers / stabilisers extend and retract correctly', 'type' => 'pass_fail_na'],

        // Electrical
        ['id' => 'mewp_elec_1', 'section' => 'Electrical', 'item' => 'Battery charge adequate for planned work', 'type' => 'pass_fail_na'],
        ['id' => 'mewp_elec_2', 'section' => 'Electrical', 'item' => 'All warning lights and indicators functioning', 'type' => 'pass_fail'],
        ['id' => 'mewp_elec_3', 'section' => 'Electrical', 'item' => 'Horn / audible alarm operational', 'type' => 'pass_fail'],
        ['id' => 'mewp_elec_4', 'section' => 'Electrical', 'item' => 'Wiring harness intact — no exposed or damaged cables', 'type' => 'pass_fail'],

        // Tyres / Wheels
        ['id' => 'mewp_tyre_1', 'section' => 'Tyres & Wheels', 'item' => 'Tyre pressure adequate and treads above minimum', 'type' => 'pass_fail'],
        ['id' => 'mewp_tyre_2', 'section' => 'Tyres & Wheels', 'item' => 'Wheel nuts tight — no missing studs', 'type' => 'pass_fail'],

        // Safety Devices
        ['id' => 'mewp_saf_1', 'section' => 'Safety Devices', 'item' => 'Emergency stop buttons operational (platform and ground)', 'type' => 'pass_fail'],
        ['id' => 'mewp_saf_2', 'section' => 'Safety Devices', 'item' => 'Emergency lowering / descent system functional', 'type' => 'pass_fail'],
        ['id' => 'mewp_saf_3', 'section' => 'Safety Devices', 'item' => 'SWL / capacity plate legible and correct', 'type' => 'pass_fail'],
        ['id' => 'mewp_saf_4', 'section' => 'Safety Devices', 'item' => 'Tilt alarm / overload alarm operational', 'type' => 'pass_fail_na'],

        // Cleanliness
        ['id' => 'mewp_cln_1', 'section' => 'Cleanliness', 'item' => 'Platform and controls clean — no oil, grease or debris', 'type' => 'pass_fail'],
    ],
];
