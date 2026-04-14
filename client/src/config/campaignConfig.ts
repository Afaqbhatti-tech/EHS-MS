// Campaign module configuration — mirrors backend config/campaign_config.php

export const CAMPAIGN_TYPES = [
  'Awareness Campaign',
  'Compliance Campaign',
  'Behavioral Safety Campaign',
  'Training Campaign',
  'Inspection Campaign',
  'Housekeeping Campaign',
  'PPE Campaign',
  'Health Campaign',
  'Emergency Preparedness Campaign',
  'Environmental Campaign',
  'Leadership Safety Campaign',
  'Toolbox / Communication Campaign',
  'Audit Improvement Campaign',
  'Other',
];

export const CAMPAIGN_TOPICS: Record<string, string[]> = {
  'Safety Core': [
    'Work at Height', 'Fire Safety',
    'Confined Space', 'Electrical Safety',
    'Manual Handling', 'PPE Compliance',
    'Incident Prevention',
  ],
  'Operations': [
    'Lifting Operations', 'Housekeeping',
    'Traffic & Driving Safety',
    'Permit Compliance', 'RAMS Compliance',
    'Near Miss Reporting',
  ],
  'Emergency': [
    'Emergency Response',
    'Evacuation Awareness',
    'First Aid Awareness',
  ],
  'Health': [
    'Heat Stress', 'Ergonomics',
    'Mental Health / Wellbeing',
    'Noise & Vibration',
  ],
  'Environmental': [
    'Waste Management',
    'Spill Prevention',
    'Environmental Awareness',
  ],
  'Other': ['Other'],
};

export const ACTIVITY_TYPES = [
  'Toolbox Talk (TBT)',
  'Training Session',
  'Safety Walk / Inspection',
  'Poster / Signage Display',
  'Awareness Talk',
  'Quiz / Engagement Session',
  'Mock Drill',
  'Observation Drive',
  'Compliance Check',
  'Site Briefing',
  'Management Walkthrough',
  'Video Screening',
  'Other',
];

export const EVIDENCE_CATEGORIES = [
  'Photo Evidence',
  'Poster / Banner',
  'Presentation Slides',
  'Attendance Sheet',
  'Toolbox Talk Sheet',
  'Certificate',
  'Signed Form',
  'Video',
  'Campaign Report',
  'Other',
];

export const CAMPAIGN_STATUSES = ['Draft', 'Planned', 'Active', 'Completed', 'Closed', 'Cancelled'] as const;
export const ACTIVITY_STATUSES = ['Planned', 'Conducted', 'Cancelled', 'Rescheduled'] as const;
export const ACTION_STATUSES = ['Open', 'In Progress', 'Completed', 'Overdue'] as const;
export const ACTION_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export const FREQUENCY_OPTIONS = ['One-Time', 'Weekly', 'Monthly', 'Quarterly', 'Annual'] as const;
export const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Excused'] as const;
export const PARTICIPATION_TYPES = ['Attendee', 'Speaker', 'Organizer', 'Supervisor', 'Observer'] as const;
export const EFFECTIVENESS_RATINGS = ['Successful', 'Partially Successful', 'Needs Improvement', 'Not Effective'] as const;

/** Grouped options for topic dropdown */
export function getTopicOptions(): Array<{ group: string; options: string[] }> {
  return Object.entries(CAMPAIGN_TOPICS).map(([group, options]) => ({ group, options }));
}

/** Flat array of all topics */
export function getTopicList(): string[] {
  return Object.values(CAMPAIGN_TOPICS).flat();
}
